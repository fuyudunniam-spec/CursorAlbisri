import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { 
  Upload, 
  FileText, 
  Image, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Eye,
  Download,
  Trash2,
  RefreshCw,
  Percent
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DocumentService, DocumentRequirement, DocumentFile } from '@/services/document.service';

// Use types from DocumentService
type LocalDocumentRequirement = {
  kode: string;
  nama: string;
  kategori: 'wajib' | 'kondisional' | 'opsional';
  kondisi?: string;
  format: string;
};

interface UploadDokumenSantriProps {
  santriId: string;
  kategori: string;
  statusAnak: string;
  onUploadComplete?: () => void;
}

const UploadDokumenSantri: React.FC<UploadDokumenSantriProps> = ({
  santriId,
  kategori,
  statusAnak,
  onUploadComplete
}) => {
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<{[key: string]: boolean}>({});
  const [previewFile, setPreviewFile] = useState<DocumentFile | null>(null);
  const [verificationDialog, setVerificationDialog] = useState<DocumentFile | null>(null);
  const [verificationNote, setVerificationNote] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<'Diverifikasi' | 'Belum Diverifikasi' | 'Ditolak'>('Diverifikasi');
  const [isLoading, setIsLoading] = useState(false);

  // Get document requirements from database
  const [requirements, setRequirements] = useState<DocumentRequirement[]>([]);

  useEffect(() => {
    const loadRequirements = async () => {
      try {
        const reqs = await DocumentService.getDocumentRequirements(
          kategori,
          statusAnak,
          false // Not bantuan recipient for basic form
        );
        setRequirements(reqs);
      } catch (error) {
        console.error('Error loading requirements:', error);
      }
    };

    loadRequirements();
  }, [kategori, statusAnak]);

  // Convert database requirements to local format
  const getDocumentRequirements = (): LocalDocumentRequirement[] => {
    return requirements
      .filter(req => req.kategori_dokumen === 'Reguler')
      .map(req => ({
        kode: req.jenis_dokumen,
        nama: req.jenis_dokumen,
        kategori: req.is_required ? 'wajib' : 'opsional',
        kondisi: req.kondisi_required,
        format: 'PDF/JPG'
      }));
  };

  // Load dokumen yang sudah ada
  const loadDocuments = async () => {
    // Don't load if santriId is not provided (e.g., new santri form)
    if (!santriId || santriId === 'undefined') {
      console.log('Skipping document load: no santriId provided');
      setDocuments([]);
      return;
    }

    try {
      console.log('Loading documents for santri:', santriId);
      const docs = await DocumentService.getSantriDocuments(santriId);
      
      // Fix URLs for documents with old path format
      const fixedDocuments = docs.map(doc => fixDocumentUrl(doc));
      
      setDocuments(fixedDocuments);
      console.log('Documents state updated:', fixedDocuments.length, 'documents');
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Gagal memuat dokumen');
    }
  };

  // Upload file
  const uploadFile = async (kodeDokumen: string, file: File) => {
    try {
      console.log('Starting upload for:', { kodeDokumen, fileName: file.name, fileSize: file.size, fileType: file.type });
      setUploadingFiles(prev => ({ ...prev, [kodeDokumen]: true }));

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error('File terlalu besar. Maksimal 10MB');
      }

      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Format file tidak didukung. Gunakan PDF, JPG, atau PNG');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `santri/${santriId}/${kodeDokumen}/${fileName}`;

      console.log('Uploading to path:', filePath);

      // Use DocumentService for upload
      const uploadedDoc = await DocumentService.uploadDocument(santriId, kodeDokumen, file);
      
      console.log('Document uploaded successfully:', uploadedDoc);
      toast.success('Dokumen berhasil diupload');
      loadDocuments();
      // Call callback to refresh parent component
      onUploadComplete?.();

    } catch (error) {
      console.error('Error uploading file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Gagal mengupload dokumen';
      toast.error(errorMessage);
    } finally {
      setUploadingFiles(prev => ({ ...prev, [kodeDokumen]: false }));
    }
  };

  // Verifikasi dokumen
  const verifyDocument = async (docId: string) => {
    try {
      const { error } = await supabase
        .from('dokumen_santri')
        .update({
          status_verifikasi: verificationStatus,
          verifikasi_oleh: (await supabase.auth.getUser()).data.user?.id,
          catatan_verifikasi: verificationNote,
          updated_at: new Date().toISOString()
        })
        .eq('id', docId);

      if (error) throw error;

      // Log audit (optional - table may not exist yet)
      try {
        const oldDoc = documents.find(d => d.id === docId);
        await supabase
          .from('dokumen_audit_log')
          .insert({
            dokumen_id: docId,
            action: 'verification',
            performed_by: (await supabase.auth.getUser()).data.user?.id,
            performed_at: new Date().toISOString(),
            old_values: oldDoc ? { status_verifikasi: oldDoc.status_verifikasi } : null,
            new_values: { 
              status_verifikasi: verificationStatus,
              catatan_verifikasi: verificationNote 
            }
          });
      } catch (auditError) {
        // Audit log is optional, don't fail if table doesn't exist
        console.log('Audit log skipped (table may not exist):', auditError);
      }

      toast.success('Dokumen berhasil diverifikasi');
      loadDocuments();
      setVerificationDialog(null);
      setVerificationNote('');
      setVerificationStatus('Diverifikasi');

    } catch (error) {
      console.error('Error verifying document:', error);
      toast.error('Gagal memverifikasi dokumen');
    }
  };

  // Hapus dokumen
  const deleteDocument = async (docId: string) => {
    try {
      const { error } = await supabase
        .from('dokumen_santri')
        .delete()
        .eq('id', docId);

      if (error) throw error;

      toast.success('Dokumen berhasil dihapus');
      loadDocuments();

    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Gagal menghapus dokumen');
    }
  };

  // Hitung kelengkapan dokumen
  const calculateCompleteness = () => {
    const requirements = getDocumentRequirements();
    const requiredDocs = requirements.filter(doc => doc.kategori === 'wajib' || doc.kategori === 'kondisional');
    const uploadedDocs = documents.filter(doc => doc.status_verifikasi === 'Diverifikasi');
    
    const uploadedCodes = new Set(uploadedDocs.map(doc => doc.jenis_dokumen));
    const completedCount = requiredDocs.filter(doc => uploadedCodes.has(doc.kode)).length;
    
    return {
      completed: completedCount,
      total: requiredDocs.length,
      percentage: Math.round((completedCount / requiredDocs.length) * 100)
    };
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Diverifikasi':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'Belum Diverifikasi':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'Ditolak':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Diverifikasi':
        return 'bg-green-100 text-green-800';
      case 'Belum Diverifikasi':
        return 'bg-yellow-100 text-yellow-800';
      case 'Ditolak':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Generate public URL from path_file
  const fixDocumentUrl = (doc: DocumentFile): DocumentFile => {
    if (!doc.path_file) return doc;
    
    try {
      // Generate public URL using path_file
      const { data: urlData } = supabase.storage
        .from('santri-documents')
        .getPublicUrl(doc.path_file);
      
      console.log('Generated URL:', { 
        path_file: doc.path_file,
        url: urlData.publicUrl 
      });
      
      return { ...doc, url: urlData.publicUrl };
    } catch (error) {
      console.error('Error generating URL:', error, doc.path_file);
      return doc;
    }
  };

  // Preview file
  const previewDocument = (doc: DocumentFile) => {
    console.log('Preview document:', doc);
    const fixedDoc = fixDocumentUrl(doc);
    console.log('Fixed document URL:', fixedDoc.url);
    setPreviewFile(fixedDoc);
  };

  useEffect(() => {
    console.log('UploadDokumenSantri useEffect triggered:', { santriId, kategori, statusAnak });
    if (santriId) {
      loadDocuments();
    }
  }, [santriId, kategori, statusAnak]);

  // Get local requirements format
  const localRequirements = getDocumentRequirements();
  const completeness = calculateCompleteness();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Dokumen Santri
            </div>
            <Badge variant="outline">{kategori}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{completeness.percentage}%</div>
              <div className="text-sm text-gray-600">Kelengkapan Dokumen</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{completeness.completed}</div>
              <div className="text-sm text-gray-600">Dokumen Lengkap</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{completeness.total}</div>
              <div className="text-sm text-gray-600">Total Diperlukan</div>
            </div>
          </div>
          
          <Progress value={completeness.percentage} className="w-full" />
          <div className="text-sm text-gray-600 mt-2">
            Status Sosial: <Badge variant="secondary">{statusAnak || 'Lengkap'}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Daftar Dokumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {localRequirements.map((req) => {
          const uploadedDoc = documents.find(doc => doc.jenis_dokumen === req.kode);
          const isUploading = uploadingFiles[req.kode];

          return (
            <Card key={req.kode} className="relative">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>{req.nama}</span>
                  <Badge 
                    variant={req.kategori === 'wajib' ? 'destructive' : req.kategori === 'kondisional' ? 'secondary' : 'outline'}
                    className="text-xs"
                  >
                    {req.kategori}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Status Dokumen */}
                {uploadedDoc ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(uploadedDoc.status_verifikasi)}
                      <Badge className={getStatusBadge(uploadedDoc.status_verifikasi)}>
                        {uploadedDoc.status_verifikasi}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 truncate">{uploadedDoc.nama_file}</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => previewDocument(uploadedDoc)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setVerificationDialog(uploadedDoc)}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verifikasi
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteDocument(uploadedDoc.id!)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <FileText className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500 mb-3">Belum diupload</p>
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        console.log('File input changed:', e.target.files);
                        const file = e.target.files?.[0];
                        if (file) {
                          console.log('File selected:', { name: file.name, size: file.size, type: file.type });
                          uploadFile(req.kode, file);
                        } else {
                          console.log('No file selected');
                        }
                        // Reset input value to allow selecting the same file again
                        e.target.value = '';
                      }}
                      disabled={uploadingFiles[req.kode]}
                      className="text-xs"
                    />
                  </div>
                )}

                {/* Format Info */}
                <p className="text-xs text-gray-500 text-center">
                  Format: {req.format} (Max 10MB)
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Preview Dokumen</DialogTitle>
            <DialogDescription>
              Lihat dan verifikasi dokumen yang telah diupload
            </DialogDescription>
          </DialogHeader>
          {previewFile && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{previewFile.nama_file}</h3>
                <Badge className={getStatusBadge(previewFile.status_verifikasi)}>
                  {previewFile.status_verifikasi}
                </Badge>
              </div>
              
              {/* Simple Preview - Just show file info and download link */}
              <div className="w-full border rounded-lg p-6 bg-gray-50">
                <div className="text-center space-y-4">
                  {previewFile.tipe_file?.startsWith('image/') ? (
                    <Image className="w-16 h-16 mx-auto text-blue-500" />
                  ) : previewFile.tipe_file === 'application/pdf' ? (
                    <FileText className="w-16 h-16 mx-auto text-red-500" />
                  ) : (
                    <FileText className="w-16 h-16 mx-auto text-gray-500" />
                  )}
                  
                  <div>
                    <p className="text-lg font-medium text-gray-900">{previewFile.nama_file}</p>
                    <p className="text-sm text-gray-600">
                      {previewFile.tipe_file === 'application/pdf' ? 'Dokumen PDF' : 
                       previewFile.tipe_file?.startsWith('image/') ? 'File Gambar' : 
                       'Dokumen File'}
                    </p>
                    <p className="text-sm text-gray-500">
                      Ukuran: {(previewFile.ukuran_file! / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    {previewFile.url && !previewFile.url.startsWith('blob:') ? (
                      <>
                        <a 
                          href={previewFile.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Buka di Tab Baru
                        </a>
                        <br />
                        <a 
                          href={previewFile.url} 
                          download={previewFile.nama_file}
                          className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:text-blue-700 transition-colors"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download File
                        </a>
                      </>
                    ) : (
                      <div className="text-sm text-gray-500">
                        URL tidak tersedia atau tidak valid
                      </div>
                    )}
                  </div>
                  
                  {previewFile.catatan_verifikasi && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm text-yellow-800">
                        <strong>Catatan:</strong> {previewFile.catatan_verifikasi}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="text-sm text-gray-600 space-y-2">
                <p>Ukuran: {(previewFile.ukuran_file! / 1024 / 1024).toFixed(2)} MB</p>
                <p>Format: {previewFile.tipe_file}</p>
                {previewFile.catatan_verifikasi && (
                  <p>Catatan: {previewFile.catatan_verifikasi}</p>
                )}
                <div className="pt-2">
                  {previewFile.url && !previewFile.url.startsWith('blob:') ? (
                    <a 
                      href={previewFile.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:text-blue-700 transition-colors"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Buka di Tab Baru
                    </a>
                  ) : (
                    <span className="text-sm text-gray-500">URL tidak tersedia</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Verification Dialog */}
      <Dialog open={!!verificationDialog} onOpenChange={() => setVerificationDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verifikasi Dokumen</DialogTitle>
            <DialogDescription>
              Ubah status validasi dan tambahkan catatan untuk dokumen
            </DialogDescription>
          </DialogHeader>
          {verificationDialog && (
            <div className="space-y-4">
              <div>
                <Label>Status Validasi</Label>
                <Select value={verificationStatus} onValueChange={(value: any) => setVerificationStatus(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Diverifikasi">Diverifikasi</SelectItem>
                    <SelectItem value="Belum Diverifikasi">Belum Diverifikasi</SelectItem>
                    <SelectItem value="Ditolak">Ditolak</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Catatan</Label>
                <Textarea
                  value={verificationNote}
                  onChange={(e) => setVerificationNote(e.target.value)}
                  placeholder="Tambahkan catatan verifikasi..."
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setVerificationDialog(null)}>
                  Batal
                </Button>
                <Button onClick={() => verifyDocument(verificationDialog.id!)}>
                  Simpan Verifikasi
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UploadDokumenSantri;
