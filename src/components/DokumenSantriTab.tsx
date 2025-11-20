import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  FileText, 
  Upload, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertCircle,
  Download,
  Plus,
  X,
  Image,
  Trash2
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DocumentService, DocumentRequirement, DocumentFile } from '@/services/document.service';
import { DokumenHelper } from '@/utils/dokumen.helper';
import { ProfileHelper } from '@/utils/profile.helper';

interface DokumenSantriTabProps {
  santriId: string;
  santriData: {
    status_sosial?: 'Yatim' | 'Piatu' | 'Yatim Piatu' | 'Dhuafa';
    nama_lengkap: string;
    kategori?: string;
  };
  isBantuanRecipient: boolean;
  mode?: 'view' | 'edit' | 'add';
}

interface DokumenItem {
  id?: string;
  jenis_dokumen: string;
  label: string;
  required: boolean;
  uploaded: boolean;
  status_verifikasi?: string;
  path_file?: string;
  nama_file?: string;
  created_at?: string;
  tipe_file?: string;
  ukuran_file?: number;
}

const DokumenSantriTab: React.FC<DokumenSantriTabProps> = ({
  santriId,
  santriData,
  isBantuanRecipient,
  mode = 'view'
}) => {
  const [dokumenList, setDokumenList] = useState<DokumenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingFiles, setUploadingFiles] = useState<{[key: string]: boolean}>({});
  const [previewFile, setPreviewFile] = useState<DokumenItem | null>(null);
  const [verificationDialog, setVerificationDialog] = useState<DokumenItem | null>(null);
  const [verificationNote, setVerificationNote] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<'Diverifikasi' | 'Belum Diverifikasi' | 'Ditolak'>('Diverifikasi');

  useEffect(() => {
    loadDokumen();
  }, [santriId]);

  // Normalize incoming document names to align with DB enum dokumen_santri_jenis_dokumen_check
  const normalizeJenisDokumen = (raw: string): string => {
    const lower = (raw || '').toLowerCase().trim();
    // Block legacy we don't use anymore
    if (lower.includes('surat') && lower.includes('permohonan') && lower.includes('bantuan')) {
      return 'Surat Permohonan Bantuan';
    }
    // Keep two distinct KTP Wali types
    if (lower.includes('ktp') && lower.includes('wali') && lower.includes('utama')) {
      return 'KTP Wali Utama';
    }
    if (lower.includes('ktp') && lower.includes('wali') && (lower.includes('pendamping') || lower.includes('pendmpg'))) {
      return 'KTP Wali Pendamping';
    }
    // SKTM variants
    if (lower.startsWith('sktm')) {
      return 'SKTM';
    }
    // Kartu Keluarga variants
    if (lower.includes('kartu keluarga') || lower === 'kk' || lower.includes('ktp/kk')) {
      return 'Kartu Keluarga';
    }
    // Akta kematian specific
    if (lower.includes('akta kematian') && lower.includes('ayah')) {
      return 'Akta Kematian Ayah';
    }
    if (lower.includes('akta kematian') && lower.includes('ibu')) {
      return 'Akta Kematian Ibu';
    }
    // Default: keep original tidy label
    return raw?.trim() || 'Dokumen';
  };

  const getDokumenRequirements = (statusSosial: string, kategori: string, isBantuan: boolean) => {
    try {
      // Gunakan ProfileHelper untuk mendapatkan dokumen yang diperlukan
      const requiredDocuments = ProfileHelper.getRequiredDocuments(kategori, statusSosial);
      
      console.log('📋 ProfileHelper.getRequiredDocuments result:', {
        kategori,
        statusSosial,
        requiredDocuments,
        isBantuan
      });
      
      // Jika tidak ada dokumen yang diperlukan, berikan default minimal
      if (!requiredDocuments || requiredDocuments.length === 0) {
        console.log('⚠️ No required documents found, using default');
        return {
          minimal: [
            { jenis_dokumen: 'KTP/KK', label: 'KTP/KK', required: true },
            { jenis_dokumen: 'Foto', label: 'Foto Santri', required: true }
          ],
          khusus: [],
          pelengkap: []
        };
      }
      
      // Konversi ke format yang diharapkan oleh komponen (filter legacy/blocked, normalize names)
      const dokumenList = requiredDocuments
        .map(doc => {
          const mappedJenis = normalizeJenisDokumen(doc.jenis_dokumen);
          // drop legacy 'Surat Permohonan Bantuan' from UI
          if (mappedJenis === 'Surat Permohonan Bantuan') return null;
          return {
            jenis_dokumen: mappedJenis,
            label: mappedJenis,
            required: doc.required,
            description: doc.description
          };
        })
        .filter(Boolean) as Array<{ jenis_dokumen: string; label: string; required: boolean; description?: string }>;

    // Pisahkan dokumen berdasarkan required dan optional
    const minimal = dokumenList.filter(d => d.required);
    const pelengkap = dokumenList.filter(d => !d.required);

      return {
        minimal,
        khusus: [], // Tidak ada dokumen khusus yang terpisah
        pelengkap
      };
    } catch (error) {
      console.error('❌ Error in getDokumenRequirements:', error);
      // Return default minimal requirements
      return {
        minimal: [
          { jenis_dokumen: 'KTP/KK', label: 'KTP/KK', required: true },
          { jenis_dokumen: 'Foto', label: 'Foto Santri', required: true }
        ],
        khusus: [],
        pelengkap: []
      };
    }
  };

  const loadDokumen = async () => {
    try {
      setLoading(true);
      
      // Use DocumentService to load documents
      const data = await DocumentService.getSantriDocuments(santriId);

      // Cleanup legacy/blocked records that violate enum/check constraints
      await supabase
        .from('dokumen_santri')
        .delete()
        .eq('santri_id', santriId)
        .in('jenis_dokumen', ['Surat Permohonan Bantuan', 'SKTM (Dhuafa)', 'KTP/KK']);

      const requirements = getDokumenRequirements(
        santriData?.status_sosial || 'Dhuafa',
        santriData?.kategori || 'Reguler',
        isBantuanRecipient
      );

      // Check if requirements is valid
      if (!requirements) {
        console.warn('Requirements is null/undefined, skipping dokumen merge');
        setDokumenList([]);
        return;
      }

      // Merge requirements dengan uploaded documents
      const allDocs = [
        ...(requirements.minimal || []),
        ...(requirements.khusus || []),
        ...(requirements.pelengkap || [])
      ];

      const mergedDocs = allDocs.map(req => {
        const uploaded = data?.find(d => d.jenis_dokumen === req.jenis_dokumen);
        console.log('🔍 Matching dokumen:', {
          required: req.jenis_dokumen,
          uploaded: uploaded?.jenis_dokumen,
          found: !!uploaded
        });
        return {
          ...req,
          id: uploaded?.id,
          uploaded: !!uploaded,
          status_verifikasi: uploaded?.status_verifikasi,
          path_file: uploaded?.path_file,
          nama_file: uploaded?.nama_file,
          created_at: uploaded?.created_at,
          tipe_file: uploaded?.tipe_file,
          ukuran_file: uploaded?.ukuran_file
        };
      });

      setDokumenList(mergedDocs);
    } catch (error) {
      console.error('Error loading dokumen:', error);
      toast.error('Gagal memuat dokumen');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'Diverifikasi':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'Ditolak':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'Belum Diverifikasi':
      case 'Menunggu Verifikasi':
        return <Clock className="w-4 h-4 text-amber-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'Diverifikasi':
        return <Badge className="bg-green-600">✓ Diverifikasi</Badge>;
      case 'Ditolak':
        return <Badge variant="destructive">✗ Ditolak</Badge>;
      case 'Belum Diverifikasi':
      case 'Menunggu Verifikasi':
        return <Badge variant="secondary">⏳ Menunggu</Badge>;
      default:
        return null;
    }
  };

  const handleFileUpload = async (jenisDokumen: string, file: File) => {
    try {
      // Normalize jenis dokumen to match DB enum values
      const normalizedJenis = normalizeJenisDokumen(jenisDokumen);
      if (normalizedJenis === 'Surat Permohonan Bantuan') {
        toast.warning('Jenis dokumen ini tidak lagi digunakan. Silakan abaikan.');
        return;
      }
      console.log('🚀 Starting upload:', {
        jenisDokumen: normalizedJenis,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        santriId
      });
      
      setUploadingFiles(prev => ({ ...prev, [jenisDokumen]: true }));
      
      // Validate file
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error('File terlalu besar. Maksimal 10MB.');
      }
      
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Tipe file tidak didukung. Gunakan PDF, JPG, PNG, atau DOC.');
      }
      
      // ✅ Use consistent path structure: santri/{santriId}/{jenisDokumen}/{timestamp}.{ext}
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `santri/${santriId}/${normalizedJenis}/${fileName}`;
      
      console.log('📁 Upload path:', filePath);
      
      // Upload file ke storage with correct bucket name
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('santri-documents')  // ✅ Fixed: was 'dokumen-santri'
        .upload(filePath, file);

      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        throw uploadError;
      }

      console.log('✅ Upload successful:', uploadData);

      // Insert record ke database
      const insertData = {
        santri_id: santriId,
        jenis_dokumen: normalizedJenis,
        nama_dokumen: normalizedJenis,
        nama_file: file.name,
        ukuran_file: file.size,
        tipe_file: file.type,
        path_file: filePath,  // ✅ Use full path
        status_verifikasi: 'Belum Diverifikasi',
        is_editable_by_santri: true  // ✅ Required for RLS policy
      };
      
      console.log('💾 Inserting to database:', insertData);
      
      const { error: insertError } = await supabase
        .from('dokumen_santri')
        .insert(insertData);

      if (insertError) {
        console.error('❌ Database insert error:', insertError);
        throw insertError;
      }

      console.log('✅ Database insert successful');
      toast.success('Dokumen berhasil diupload!');
      loadDokumen(); // Reload data
    } catch (error: any) {
      console.error('❌ Upload failed:', error);
      toast.error(`Gagal mengupload dokumen: ${error.message || 'Unknown error'}`);
    } finally {
      setUploadingFiles(prev => ({ ...prev, [jenisDokumen]: false }));
    }
  };

  const handleFileDelete = async (dokumenId: string, pathFile: string) => {
    try {
      setLoading(true);
      
      // Delete dari storage with correct bucket name
      const { error: storageError } = await supabase.storage
        .from('santri-documents')  // ✅ Fixed: was 'dokumen-santri'
        .remove([pathFile]);

      if (storageError) {
        console.warn('Storage delete error:', storageError);
      }

      // Delete dari database
      const { error: dbError } = await supabase
        .from('dokumen_santri')
        .delete()
        .eq('id', dokumenId);

      if (dbError) {
        throw dbError;
      }

      toast.success('Dokumen berhasil dihapus!');
      loadDokumen(); // Reload data
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Gagal menghapus dokumen');
    } finally {
      setLoading(false);
    }
  };

  const handleFileView = async (pathFile: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('santri-documents')  // ✅ Fixed: was 'dokumen-santri'
        .createSignedUrl(pathFile, 3600); // 1 hour expiry

      if (error) {
        throw error;
      }

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error viewing file:', error);
      toast.error('Gagal membuka dokumen');
    }
  };
  
  // ✅ Add download function
  const handleFileDownload = async (pathFile: string, namaFile: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('santri-documents')
        .download(pathFile);
      
      if (error) throw error;
      
      // Create blob and download
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = namaFile;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('File berhasil didownload');
    } catch (error: any) {
      console.error('Error downloading:', error);
      toast.error('Gagal download file');
    }
  };

  // ✅ Add verification function
  const handleVerifyDocument = async (docId: string) => {
    try {
      const user = await supabase.auth.getUser();
      const updateData = {
        status_verifikasi: verificationStatus,
        verifikasi_oleh: user.data.user?.id,
        catatan_verifikasi: verificationNote,
        updated_at: new Date().toISOString()
      };
      
      console.log('🔍 Verifying document:', {
        docId,
        updateData,
        verificationStatus
      });

      const { error } = await supabase
        .from('dokumen_santri')
        .update(updateData)
        .eq('id', docId);

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }

      toast.success('Dokumen berhasil diverifikasi');
      loadDokumen();
      setVerificationDialog(null);
      setVerificationNote('');
      setVerificationStatus('Diverifikasi');

    } catch (error) {
      console.error('Error verifying document:', error);
      toast.error('Gagal memverifikasi dokumen');
    }
  };

  // ✅ Add preview function
  const handlePreviewDocument = (doc: DokumenItem) => {
    setPreviewFile(doc);
  };

  const requirements = getDokumenRequirements(
    santriData?.status_sosial || 'Dhuafa',
    santriData?.kategori || 'Reguler',
    isBantuanRecipient
  );

  // Debug logging
  console.log('🔍 DokumenSantriTab Debug:', {
    santriId,
    santriData,
    mode,
    isBantuanRecipient,
    requirements,
    minimalCount: requirements.minimal?.length || 0,
    khususCount: requirements.khusus?.length || 0,
    pelengkapCount: requirements.pelengkap?.length || 0
  });

  // Add null check for requirements
  if (!requirements) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-gray-500">Loading dokumen requirements...</div>
        </div>
      </div>
    );
  }

  const minimalUploaded = dokumenList
    .filter(d => requirements.minimal?.some(m => m.jenis_dokumen === d.jenis_dokumen))
    .filter(d => d.uploaded && d.status_verifikasi !== 'Ditolak').length;
  
  const khususUploaded = dokumenList
    .filter(d => requirements.khusus?.some(k => k.jenis_dokumen === d.jenis_dokumen))
    .filter(d => d.uploaded && d.status_verifikasi !== 'Ditolak').length;

  const pelengkapUploaded = dokumenList
    .filter(d => requirements.pelengkap?.some(p => p.jenis_dokumen === d.jenis_dokumen))
    .filter(d => d.uploaded && d.status_verifikasi !== 'Ditolak').length;

  const minimalProgress = requirements.minimal?.length > 0 
    ? (minimalUploaded / requirements.minimal.length) * 100 
    : 100;
  const khususProgress = requirements.khusus?.length > 0 
    ? (khususUploaded / requirements.khusus.length) * 100 
    : 100;
  const pelengkapProgress = requirements.pelengkap?.length > 0 
    ? (pelengkapUploaded / requirements.pelengkap.length) * 100 
    : 100;

  const isMinimalComplete = minimalProgress === 100;
  const isKhususComplete = khususProgress === 100;

  return (
    <div className="space-y-4">
      {/* Header untuk Penerima Bantuan Yayasan */}
      {isBantuanRecipient && (
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium text-blue-900">
                  Dokumen Santri Binaan (Penerima Bantuan Yayasan)
                </div>
                <div className="text-sm text-blue-700 mt-1">
                  Status: <strong>{santriData.status_sosial || 'Lengkap'}</strong>
                </div>
              </div>
              {isMinimalComplete && isKhususComplete && (
                <Badge className="bg-green-600">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Lengkap
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 1: Dokumen Minimal */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {isBantuanRecipient ? '📋 Dokumen Wajib & Opsional' : '📄 Dokumen Santri'}
            </CardTitle>
            {isBantuanRecipient && (
              <Badge variant={isMinimalComplete ? 'default' : 'secondary'}>
                {minimalUploaded + pelengkapUploaded}/{requirements.minimal.length + requirements.pelengkap.length}
              </Badge>
            )}
          </div>
          {isBantuanRecipient && (
            <div className="space-y-2 mt-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress Total</span>
                <span className="font-medium">{Math.round(((minimalUploaded + pelengkapUploaded) / (requirements.minimal.length + requirements.pelengkap.length)) * 100)}%</span>
              </div>
              <Progress value={((minimalUploaded + pelengkapUploaded) / (requirements.minimal.length + requirements.pelengkap.length)) * 100} className="h-2" />
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Gabungkan dokumen wajib dan opsional */}
            {[...(requirements.minimal || []), ...(requirements.pelengkap || [])].map((dok, idx) => {
              const uploaded = dokumenList.find(d => d.jenis_dokumen === dok.jenis_dokumen);
              const isUploading = uploadingFiles[dok.jenis_dokumen];

              return (
                <Card key={idx} className="relative">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>{dok.label}</span>
                      <Badge 
                        variant={dok.required ? 'destructive' : 'outline'}
                        className="text-xs"
                      >
                        {dok.required ? 'wajib' : 'opsional'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Status Dokumen */}
                    {uploaded?.uploaded ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(uploaded.status_verifikasi)}
                          {uploaded.status_verifikasi && getStatusBadge(uploaded.status_verifikasi)}
                        </div>
                        <p className="text-xs text-gray-600 truncate">{uploaded.nama_file}</p>
                        <div className="flex gap-1 flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePreviewDocument(uploaded)}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            Preview
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setVerificationDialog(uploaded)}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Verifikasi
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleFileDelete(uploaded.id!, uploaded.path_file!)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <FileText className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500 mb-3">Belum diupload</p>
                        <Input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          onChange={(e) => {
                            console.log('📂 File input changed:', e.target.files);
                            const file = e.target.files?.[0];
                            if (file) {
                              console.log('📄 Selected file:', file);
                              handleFileUpload(dok.jenis_dokumen, file);
                            } else {
                              console.log('❌ No file selected');
                            }
                            // Reset input value to allow selecting the same file again
                            e.target.value = '';
                          }}
                          disabled={isUploading}
                          className="text-xs"
                        />
                      </div>
                    )}

                    {/* Format Info */}
                    <p className="text-xs text-gray-500 text-center">
                      Format: PDF/JPG/PNG/DOC (Max 10MB)
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Dokumen Khusus (hanya untuk bantuan yayasan) */}
      {isBantuanRecipient && requirements.khusus.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                📋 Dokumen Khusus ({santriData.status_sosial})
              </CardTitle>
              <Badge variant={isKhususComplete ? 'default' : 'secondary'}>
                {khususUploaded}/{requirements.khusus.length}
              </Badge>
            </div>
            <div className="space-y-2 mt-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Math.round(khususProgress)}%</span>
              </div>
              <Progress value={khususProgress} className="h-2" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {requirements.khusus?.map((dok, idx) => {
              const uploaded = dokumenList.find(d => d.jenis_dokumen === dok.jenis_dokumen);
              
              return (
                <div key={idx} className="flex items-center justify-between p-3 border-2 border-amber-200 rounded-lg hover:bg-amber-50">
                  <div className="flex items-center gap-3 flex-1">
                    {getStatusIcon(uploaded?.status_verifikasi)}
                    <div className="flex-1">
                      <div className="font-medium text-sm">{dok.label}</div>
                      {uploaded?.uploaded && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          📎 {uploaded.nama_file}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {uploaded?.status_verifikasi && getStatusBadge(uploaded.status_verifikasi)}
                    {uploaded?.uploaded ? (
                      <div className="flex gap-1">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleFileView(uploaded.path_file!)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Lihat
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleFileDelete(uploaded.id!, uploaded.path_file!)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          className="hidden"
                          id={`upload-khusus-${dok.jenis_dokumen}`}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileUpload(dok.jenis_dokumen, file);
                            }
                          }}
                        />
                        <label htmlFor={`upload-khusus-${dok.jenis_dokumen}`}>
                          <Button variant="outline" size="sm" className="border-amber-400 text-amber-700" type="button">
                            <Upload className="w-4 h-4 mr-1" />
                            Upload
                          </Button>
                        </label>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}


      {/* Status Summary */}
      {isBantuanRecipient && (
        <Alert className={isMinimalComplete ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}>
          {isMinimalComplete ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <div className="font-medium text-green-900">✅ Dokumen Wajib Sudah Lengkap!</div>
                <div className="text-sm text-green-700 mt-1">
                  Santri sudah memenuhi persyaratan minimal penerima bantuan yayasan. 
                  Dokumen pelengkap dapat dilengkapi bertahap.
                </div>
              </AlertDescription>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription>
                <div className="font-medium text-amber-900">
                  ⚠️ Mohon Lengkapi Dokumen Wajib
                </div>
                <div className="text-sm text-amber-700 mt-1">
                  Masih kurang {requirements.minimal.length - minimalUploaded} dokumen wajib.
                  Silakan upload untuk melanjutkan proses bantuan yayasan.
                </div>
              </AlertDescription>
            </>
          )}
        </Alert>
      )}


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
                {previewFile.status_verifikasi && (
                  <Badge className={
                    previewFile.status_verifikasi === 'Diverifikasi' ? 'bg-green-100 text-green-800' :
                    previewFile.status_verifikasi === 'Ditolak' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }>
                    {previewFile.status_verifikasi}
                  </Badge>
                )}
              </div>
              
              {/* Simple Preview */}
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
                  </div>
                  
                  <div className="space-y-2">
                    <Button 
                      onClick={() => handleFileView(previewFile.path_file!)}
                      className="w-full"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Buka di Tab Baru
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => handleFileDownload(previewFile.path_file!, previewFile.nama_file!)}
                      className="w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download File
                    </Button>
                  </div>
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
                <Button onClick={() => handleVerifyDocument(verificationDialog.id!)}>
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

export default DokumenSantriTab;

