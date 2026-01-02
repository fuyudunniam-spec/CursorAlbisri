import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  FileText, 
  Upload, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertCircle,
  Download,
  Trash2,
  Loader2
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DocumentService } from '@/services/document.service';

// Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const UPLOAD_TIMEOUT = 120000; // 2 minutes
const SIGNED_URL_EXPIRY = 3600; // 1 hour
const STORAGE_BUCKET = 'santri-documents';
const RELOAD_DELAY = 500; // ms

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
] as const;

const EXCLUDED_DOCUMENTS = [
  'Surat Permohonan Bantuan',
  'Surat Keterangan Sehat',
  'KTP Orang Tua',
  'Akta Kematian Orang Tua',
  'Surat Permohonan',
  'Surat Keterangan Penghasilan',
  'Surat Keterangan Tidak Mampu',
  'Sertifikat Prestasi',
  'Raport',
  'Slip Gaji Orang Tua',
  'Surat Keterangan',
  'Dokumen Lainnya'
] as const;

const DEFAULT_DOCUMENTS = [
  { jenis_dokumen: 'Pas Foto', label: 'Pas Foto', required: true },
  { jenis_dokumen: 'Kartu Keluarga', label: 'Kartu Keluarga', required: true }
] as const;

type VerificationStatus = 'Diverifikasi' | 'Belum Diverifikasi' | 'Ditolak';

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
  status_verifikasi?: VerificationStatus;
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
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('Diverifikasi');
  
  // Hide verification features for santri (mode=view)
  const isAdminMode = mode !== 'view';
  const isMobile = useIsMobile();

  useEffect(() => {
    loadDokumen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [santriId, santriData?.status_sosial, santriData?.kategori, isBantuanRecipient]);

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

  const getDokumenRequirements = async (statusSosial: string, kategori: string, isBantuan: boolean) => {
    try {
      // Gunakan DocumentService untuk mengambil dari database dengan filter status sosial
      const requiredDocuments = await DocumentService.getDocumentRequirements(
        kategori,
        statusSosial,
        isBantuan
      );
      
      // Jika tidak ada dokumen yang diperlukan, berikan default minimal
      if (!requiredDocuments || requiredDocuments.length === 0) {
        return {
          minimal: DEFAULT_DOCUMENTS.map(doc => ({ ...doc })),
          khusus: [],
          pelengkap: []
        };
      }

      // Konversi ke format yang diharapkan oleh komponen (filter legacy/blocked, normalize names)
      // Deduplicate berdasarkan jenis_dokumen (keep first occurrence)
      const seenJenis = new Set<string>();
      const dokumenList = requiredDocuments
        .map(doc => {
          const mappedJenis = normalizeJenisDokumen(doc.jenis_dokumen);
          
          // Exclude blocked/redundant documents
          if (EXCLUDED_DOCUMENTS.includes(mappedJenis as typeof EXCLUDED_DOCUMENTS[number])) {
            return null;
          }
          
          // Skip if already seen (deduplicate)
          if (seenJenis.has(mappedJenis)) {
            return null;
          }
          
          seenJenis.add(mappedJenis);
          return {
            jenis_dokumen: mappedJenis,
            label: mappedJenis,
            required: doc.is_required || false,
            description: doc.deskripsi
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
      // Return default minimal requirements on error
      return {
        minimal: DEFAULT_DOCUMENTS.map(doc => ({ ...doc })),
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

      // Get requirements from database with status sosial filter
      const requirements = await getDokumenRequirements(
        santriData?.status_sosial || 'Lengkap',
        santriData?.kategori || 'Reguler',
        isBantuanRecipient
      );

      // Check if requirements is valid
      if (!requirements) {
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
        const uploaded = data?.find(d => {
          const uploadedJenis = normalizeJenisDokumen(d.jenis_dokumen);
          return uploadedJenis === req.jenis_dokumen;
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
      const errorMessage = error instanceof Error ? error.message : 'Gagal memuat dokumen';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = useCallback((status?: VerificationStatus) => {
    switch (status) {
      case 'Diverifikasi':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'Ditolak':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'Belum Diverifikasi':
        return <Clock className="w-4 h-4 text-amber-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  }, []);

  const getStatusBadge = useCallback((status?: VerificationStatus) => {
    switch (status) {
      case 'Diverifikasi':
        return <Badge className="bg-green-600">✓ Diverifikasi</Badge>;
      case 'Ditolak':
        return <Badge variant="destructive">✗ Ditolak</Badge>;
      case 'Belum Diverifikasi':
        return <Badge variant="secondary">⏳ Menunggu</Badge>;
      default:
        return null;
    }
  }, []);

  const handleFileUpload = async (jenisDokumen: string, file: File) => {
    // Prevent multiple simultaneous uploads
    if (uploadingFiles[jenisDokumen]) {
      toast.warning('Upload sedang berlangsung, harap tunggu...');
      return;
    }

    let uploadedFilePath: string | null = null;

    try {
      // Normalize jenis dokumen to match DB enum values
      const normalizedJenis = normalizeJenisDokumen(jenisDokumen);
      if (normalizedJenis === 'Surat Permohonan Bantuan') {
        toast.warning('Jenis dokumen ini tidak lagi digunakan. Silakan abaikan.');
        return;
      }
      
      setUploadingFiles(prev => ({ ...prev, [jenisDokumen]: true }));
      
      // Validate file size early
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('File terlalu besar. Maksimal 10MB.');
      }

      // Validate file size is not 0
      if (file.size === 0) {
        throw new Error('File kosong. Silakan pilih file yang valid.');
      }
      
      if (!ALLOWED_FILE_TYPES.includes(file.type as typeof ALLOWED_FILE_TYPES[number])) {
        throw new Error('Tipe file tidak didukung. Gunakan PDF, JPG, PNG, atau DOC.');
      }
      
      // Use consistent path structure: santri/{santriId}/{jenisDokumen}/{timestamp}.{ext}
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `santri/${santriId}/${normalizedJenis}/${fileName}`;
      uploadedFilePath = filePath;
      
      // Upload file ke storage with error handling and timeout
      const uploadPromise = supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Upload timeout. File terlalu besar atau koneksi lambat.')), UPLOAD_TIMEOUT)
      );

      const { data: uploadData, error: uploadError } = await Promise.race([
        uploadPromise,
        timeoutPromise
      ]);

      if (uploadError) {
        // Clean up if file was partially uploaded
        if (uploadedFilePath) {
          try {
            await supabase.storage.from(STORAGE_BUCKET).remove([uploadedFilePath]);
          } catch {
            // Silent cleanup failure
          }
        }
        throw uploadError;
      }

      // Insert record ke database
      const insertData = {
        santri_id: santriId,
        jenis_dokumen: normalizedJenis,
        nama_dokumen: normalizedJenis,
        nama_file: file.name,
        ukuran_file: file.size,
        tipe_file: file.type,
        path_file: filePath,
        status_verifikasi: 'Belum Diverifikasi' as VerificationStatus,
        is_editable_by_santri: true
      };
      
      const { error: insertError } = await supabase
        .from('dokumen_santri')
        .insert(insertData);

      if (insertError) {
        // Clean up uploaded file if database insert fails
        if (uploadedFilePath) {
          try {
            await supabase.storage.from(STORAGE_BUCKET).remove([uploadedFilePath]);
          } catch {
            // Silent cleanup failure
          }
        }
        throw insertError;
      }

      toast.success('Dokumen berhasil diupload!');
      
      // Reload data after a short delay to ensure consistency
      setTimeout(() => {
        loadDokumen();
      }, RELOAD_DELAY);
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : (error as { error_description?: string })?.error_description || 'Gagal mengupload dokumen';
      toast.error(`Gagal mengupload dokumen: ${errorMessage}`);
      
      // Clean up on error
      if (uploadedFilePath) {
        try {
          await supabase.storage.from(STORAGE_BUCKET).remove([uploadedFilePath]);
        } catch {
          // Silent cleanup failure
        }
      }
    } finally {
      setUploadingFiles(prev => ({ ...prev, [jenisDokumen]: false }));
    }
  };

  const handleFileDelete = useCallback(async (dokumenId: string, pathFile: string) => {
    if (!dokumenId || !pathFile) {
      toast.error('Data dokumen tidak valid');
      return;
    }

    try {
      setLoading(true);
      
      // Delete dari storage
      await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([pathFile]);

      // Delete dari database
      const { error: dbError } = await supabase
        .from('dokumen_santri')
        .delete()
        .eq('id', dokumenId);

      if (dbError) {
        throw dbError;
      }

      toast.success('Dokumen berhasil dihapus!');
      loadDokumen();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal menghapus dokumen';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [loadDokumen]);

  const handleFileView = useCallback(async (pathFile: string) => {
    if (!pathFile) {
      toast.error('Path file tidak valid');
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(pathFile, SIGNED_URL_EXPIRY);

      if (error) {
        throw error;
      }

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal membuka dokumen';
      toast.error(errorMessage);
    }
  }, []);
  
  const handleFileDownload = useCallback(async (pathFile: string, namaFile: string) => {
    if (!pathFile || !namaFile) {
      toast.error('Data file tidak valid');
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(pathFile);
      
      if (error) throw error;
      if (!data) throw new Error('File tidak ditemukan');
      
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal download file';
      toast.error(errorMessage);
    }
  }, []);

  const handleVerifyDocument = useCallback(async (docId: string) => {
    if (!docId) {
      toast.error('ID dokumen tidak valid');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const updateData = {
        status_verifikasi: verificationStatus,
        verifikasi_oleh: user?.id,
        catatan_verifikasi: verificationNote,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('dokumen_santri')
        .update(updateData)
        .eq('id', docId);

      if (error) {
        throw error;
      }

      toast.success('Dokumen berhasil diverifikasi');
      loadDokumen();
      setVerificationDialog(null);
      setVerificationNote('');
      setVerificationStatus('Diverifikasi');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal memverifikasi dokumen';
      toast.error(errorMessage);
    }
  }, [verificationStatus, verificationNote, loadDokumen]);

  const handlePreviewDocument = useCallback((doc: DokumenItem) => {
    setPreviewFile(doc);
  }, []);

  // Memoized calculations for performance
  const { minimalDocs, khususDocs, pelengkapDocs } = useMemo(() => {
    const minimal = dokumenList.filter(d => d.required);
    const khusus = dokumenList.filter(d => d.jenis_dokumen?.includes('Khusus') || false);
    const pelengkap = dokumenList.filter(d => !d.required);
    return { minimalDocs: minimal, khususDocs: khusus, pelengkapDocs: pelengkap };
  }, [dokumenList]);

  const stats = useMemo(() => {
    const minimalUploaded = minimalDocs.filter(d => d.uploaded && d.status_verifikasi !== 'Ditolak').length;
    const khususUploaded = khususDocs.filter(d => d.uploaded && d.status_verifikasi !== 'Ditolak').length;
    const pelengkapUploaded = pelengkapDocs.filter(d => d.uploaded && d.status_verifikasi !== 'Ditolak').length;
    
    const minimalProgress = minimalDocs.length > 0 
      ? (minimalUploaded / minimalDocs.length) * 100 
      : 100;
    const khususProgress = khususDocs.length > 0 
      ? (khususUploaded / khususDocs.length) * 100 
      : 100;
    const pelengkapProgress = pelengkapDocs.length > 0 
      ? (pelengkapUploaded / pelengkapDocs.length) * 100 
      : 100;

    const totalUploaded = dokumenList.filter(d => d.uploaded).length;
    const totalVerified = dokumenList.filter(d => d.uploaded && d.status_verifikasi === 'Diverifikasi').length;
    const totalPending = dokumenList.filter(d => d.uploaded && d.status_verifikasi === 'Belum Diverifikasi').length;
    const totalRequired = minimalDocs.length;
    const totalUploadedRequired = minimalDocs.filter(d => d.uploaded && d.status_verifikasi !== 'Ditolak').length;

    return {
      minimalUploaded,
      khususUploaded,
      pelengkapUploaded,
      minimalProgress,
      khususProgress,
      pelengkapProgress,
      totalUploaded,
      totalVerified,
      totalPending,
      totalRequired,
      totalUploadedRequired,
      isMinimalComplete: minimalProgress === 100,
      isKhususComplete: khususProgress === 100
    };
  }, [dokumenList, minimalDocs, khususDocs, pelengkapDocs]);

  return (
    <div className="space-y-4">
      {/* Progress Summary - At the Top */}
      <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
        <CardContent className="p-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-600 rounded-lg">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-emerald-900">Progress Upload Dokumen</div>
                  <div className="text-sm text-emerald-700">
                    {isBantuanRecipient ? 'Dokumen Wajib & Opsional' : 'Dokumen Santri'}
                </div>
              </div>
              </div>
              {stats.isMinimalComplete && (
                <Badge className="bg-emerald-600">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Lengkap
                </Badge>
              )}
            </div>

            {/* Progress Stats - Simplified for santri */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white/60 rounded-lg p-3">
                <div className="text-xs text-emerald-700 font-medium mb-1">Terupload</div>
                <div className="text-lg font-bold text-emerald-900">{stats.totalUploaded}</div>
                <div className="text-xs text-emerald-600">dari {minimalDocs.length + pelengkapDocs.length} dokumen</div>
              </div>
              <div className="bg-white/60 rounded-lg p-3">
                <div className="text-xs text-emerald-700 font-medium mb-1">Wajib Lengkap</div>
                <div className="text-lg font-bold text-emerald-900">{stats.totalUploadedRequired}/{stats.totalRequired}</div>
                <div className="text-xs text-emerald-600">dokumen wajib</div>
              </div>
              {isAdminMode && (
                <>
                  <div className="bg-white/60 rounded-lg p-3">
                    <div className="text-xs text-emerald-700 font-medium mb-1">Diverifikasi</div>
                    <div className="text-lg font-bold text-green-600">{stats.totalVerified}</div>
                    <div className="text-xs text-emerald-600">dokumen</div>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3">
                    <div className="text-xs text-emerald-700 font-medium mb-1">Belum Diverifikasi</div>
                    <div className="text-lg font-bold text-amber-600">{stats.totalPending}</div>
                    <div className="text-xs text-emerald-600">menunggu</div>
                  </div>
                </>
              )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-emerald-700 font-medium">Progress Total</span>
                <span className="font-semibold text-emerald-900">
                  {Math.round(((stats.minimalUploaded + stats.pelengkapUploaded) / (minimalDocs.length + pelengkapDocs.length)) * 100)}%
                </span>
              </div>
              <Progress 
                value={((stats.minimalUploaded + stats.pelengkapUploaded) / (minimalDocs.length + pelengkapDocs.length)) * 100} 
                className="h-3 bg-emerald-200" 
              />
            </div>
            </div>
          </CardContent>
        </Card>

      {/* Dokumen List - Mobile-Friendly Card Layout */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {isBantuanRecipient ? 'Dokumen Wajib & Opsional' : 'Daftar Dokumen'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile: Card Layout */}
          {isMobile ? (
            <div className="space-y-3">
              {[...minimalDocs, ...pelengkapDocs].map((dok, idx) => {
                const uploaded = dokumenList.find(d => d.jenis_dokumen === dok.jenis_dokumen);
                const isUploading = uploadingFiles[dok.jenis_dokumen];

                return (
                  <div
                    key={idx}
                    className="border rounded-lg p-4 bg-white hover:bg-slate-50/50 transition-colors"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{dok.label}</span>
                          <Badge 
                            variant={dok.required ? 'destructive' : 'outline'}
                            className="text-xs"
                          >
                            {dok.required ? 'Wajib' : 'Opsional'}
                          </Badge>
                        </div>
                        {uploaded?.uploaded && isAdminMode && (
                          <div className="flex items-center gap-2 mt-1">
                            {getStatusIcon(uploaded.status_verifikasi)}
                            {uploaded.status_verifikasi && (
                              <span className="text-xs text-muted-foreground">
                                {uploaded.status_verifikasi === 'Diverifikasi' ? 'Diverifikasi' :
                                 uploaded.status_verifikasi === 'Ditolak' ? 'Ditolak' :
                                 'Menunggu Verifikasi'}
                              </span>
                            )}
                          </div>
                        )}
                        {uploaded?.uploaded && !isAdminMode && (
                          <div className="flex items-center gap-2 mt-1">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span className="text-xs text-emerald-600">Telah diupload</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    {uploaded?.uploaded ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 mb-1">{uploaded.nama_file}</p>
                          <p className="text-xs text-gray-500">
                            {uploaded.tipe_file} • {uploaded.ukuran_file ? `${(uploaded.ukuran_file / 1024).toFixed(2)} KB` : ''}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePreviewDocument(uploaded)}
                            className="flex-1 min-w-[100px]"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Lihat
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleFileDownload(uploaded.path_file!, uploaded.nama_file!)}
                            className="flex-1 min-w-[100px]"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                          {isAdminMode && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setVerificationDialog(uploaded)}
                              className="flex-1 min-w-[100px]"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Verifikasi
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleFileDelete(uploaded.id!, uploaded.path_file!)}
                            className="flex-1 min-w-[100px]"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Hapus
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50/50">
                        <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 font-medium mb-1 truncate">Upload {dok.label}</p>
                          <Input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleFileUpload(dok.jenis_dokumen, file);
                              }
                              e.target.value = '';
                            }}
                            disabled={isUploading}
                            className="text-xs h-8"
                          />
                        </div>
                        {isUploading && (
                          <Loader2 className="w-4 h-4 animate-spin text-blue-600 flex-shrink-0" />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Desktop: Table Layout */
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Nama Dokumen</TableHead>
                    <TableHead className="w-24">Wajib</TableHead>
                    <TableHead className="w-32">Status</TableHead>
                    <TableHead className="w-40">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...minimalDocs, ...pelengkapDocs].map((dok, idx) => {
                    const uploaded = dokumenList.find(d => d.jenis_dokumen === dok.jenis_dokumen);
                    const isUploading = uploadingFiles[dok.jenis_dokumen];

                    return (
                      <TableRow key={idx} className="hover:bg-slate-50/50">
                          <TableCell className="font-medium">{dok.label}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={dok.required ? 'destructive' : 'outline'}
                              className="text-xs"
                            >
                              {dok.required ? 'Wajib' : 'Opsional'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {uploaded?.uploaded ? (
                              isAdminMode ? (
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(uploaded.status_verifikasi)}
                                  {uploaded.status_verifikasi && (
                                    <span className="text-xs">
                                      {uploaded.status_verifikasi === 'Diverifikasi' ? 'Diverifikasi' :
                                       uploaded.status_verifikasi === 'Ditolak' ? 'Ditolak' :
                                       'Menunggu'}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Terupload
                                </Badge>
                              )
                            ) : (
                              <span className="text-xs text-muted-foreground">Belum diupload</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {uploaded?.uploaded ? (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePreviewDocument(uploaded)}
                                  className="h-7 text-xs px-2"
                                  title="Lihat dokumen"
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleFileDownload(uploaded.path_file!, uploaded.nama_file!)}
                                  className="h-7 text-xs px-2"
                                  title="Download dokumen"
                                >
                                  <Download className="w-3 h-3" />
                                </Button>
                                {isAdminMode && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setVerificationDialog(uploaded)}
                                    className="h-7 text-xs px-2"
                                    title="Verifikasi dokumen"
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleFileDelete(uploaded.id!, uploaded.path_file!)}
                                  className="h-7 text-xs px-2 text-red-600 hover:text-red-700"
                                  title="Hapus dokumen"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleFileUpload(dok.jenis_dokumen, file);
                                    }
                                    e.target.value = '';
                                  }}
                                  disabled={isUploading}
                                  className="h-7 text-xs w-32"
                                />
                                {isUploading && (
                                  <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Dokumen Khusus (hanya untuk bantuan yayasan) */}
      {isBantuanRecipient && khususDocs.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                Dokumen Khusus ({santriData.status_sosial})
              </CardTitle>
              <Badge variant={stats.isKhususComplete ? 'default' : 'secondary'}>
                {stats.khususUploaded}/{khususDocs.length}
              </Badge>
            </div>
            <div className="space-y-2 mt-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Math.round(stats.khususProgress)}%</span>
              </div>
              <Progress value={stats.khususProgress} className="h-2" />
            </div>
          </CardHeader>
          <CardContent>
            {/* Mobile: Card Layout */}
            {isMobile ? (
              <div className="space-y-3">
                {khususDocs.map((dok, idx) => {
                  const uploaded = dokumenList.find(d => d.jenis_dokumen === dok.jenis_dokumen);
                  const isUploading = uploadingFiles[dok.jenis_dokumen];

                  return (
                    <div
                      key={idx}
                      className="border-2 border-amber-200 rounded-lg p-4 bg-amber-50/30 hover:bg-amber-50/50 transition-colors"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="font-medium text-sm mb-1">{dok.label}</div>
                          {uploaded?.uploaded && isAdminMode && (
                            <div className="flex items-center gap-2 mt-1">
                              {getStatusIcon(uploaded.status_verifikasi)}
                              {uploaded.status_verifikasi && (
                                <span className="text-xs text-muted-foreground">
                                  {uploaded.status_verifikasi === 'Diverifikasi' ? 'Diverifikasi' :
                                   uploaded.status_verifikasi === 'Ditolak' ? 'Ditolak' :
                                   'Menunggu Verifikasi'}
                                </span>
                              )}
                            </div>
                          )}
                          {uploaded?.uploaded && !isAdminMode && (
                            <div className="flex items-center gap-2 mt-1">
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              <span className="text-xs text-emerald-600">Telah diupload</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      {uploaded?.uploaded ? (
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900 mb-1">{uploaded.nama_file}</p>
                            <p className="text-xs text-gray-500">
                              {uploaded.tipe_file} • {uploaded.ukuran_file ? `${(uploaded.ukuran_file / 1024).toFixed(2)} KB` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleFileView(uploaded.path_file!)}
                              className="h-8 text-xs"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Lihat
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleFileDownload(uploaded.path_file!, uploaded.nama_file!)}
                              className="h-8 text-xs"
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleFileDelete(uploaded.id!, uploaded.path_file!)}
                              className="h-8 text-xs"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Hapus
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-3 border-2 border-dashed border-amber-300 rounded-lg bg-white/50">
                          <FileText className="w-5 h-5 text-amber-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700 font-medium mb-1 truncate">Upload {dok.label}</p>
                            <Input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleFileUpload(dok.jenis_dokumen, file);
                                }
                                e.target.value = '';
                              }}
                              disabled={isUploading}
                              className="text-xs h-8"
                            />
                          </div>
                          {isUploading && (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600 flex-shrink-0" />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Desktop: Table Layout */
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Nama Dokumen</TableHead>
                      <TableHead className="w-32">Status</TableHead>
                      <TableHead className="w-48">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {khususDocs.map((dok, idx) => {
                      const uploaded = dokumenList.find(d => d.jenis_dokumen === dok.jenis_dokumen);
                      const isUploading = uploadingFiles[dok.jenis_dokumen];
                
                      return (
                        <TableRow key={idx} className="hover:bg-amber-50/50">
                            <TableCell className="font-medium">{dok.label}</TableCell>
                            <TableCell>
                              {uploaded?.uploaded ? (
                                isAdminMode ? (
                                  <div className="flex items-center gap-2">
                                    {getStatusIcon(uploaded.status_verifikasi)}
                                    {uploaded.status_verifikasi && (
                                      <span className="text-xs">
                                        {uploaded.status_verifikasi === 'Diverifikasi' ? 'Diverifikasi' :
                                         uploaded.status_verifikasi === 'Ditolak' ? 'Ditolak' :
                                         'Menunggu'}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Terupload
                                  </Badge>
                                )
                              ) : (
                                <span className="text-xs text-muted-foreground">Belum diupload</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {uploaded?.uploaded ? (
                                <div className="flex gap-1">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleFileView(uploaded.path_file!)}
                                    className="h-7 text-xs px-2"
                                    title="Lihat dokumen"
                                  >
                                    <Eye className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleFileDownload(uploaded.path_file!, uploaded.nama_file!)}
                                    className="h-7 text-xs px-2"
                                    title="Download dokumen"
                                  >
                                    <Download className="w-3 h-3" />
                                  </Button>
                                  {isAdminMode && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => setVerificationDialog(uploaded)}
                                      className="h-7 text-xs px-2"
                                      title="Verifikasi dokumen"
                                    >
                                      <CheckCircle className="w-3 h-3" />
                                    </Button>
                                  )}
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleFileDelete(uploaded.id!, uploaded.path_file!)}
                                    className="h-7 text-xs px-2 text-red-600 hover:text-red-700"
                                    title="Hapus dokumen"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleFileUpload(dok.jenis_dokumen, file);
                                      }
                                      e.target.value = '';
                                    }}
                                    disabled={isUploading}
                                    className="h-7 text-xs w-32"
                                  />
                                  {isUploading && (
                                    <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                                  )}
                                </div>
                              )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}


      {/* Status Summary */}
      {isBantuanRecipient && (
        <Alert className={stats.isMinimalComplete ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}>
          {stats.isMinimalComplete ? (
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
                  Masih kurang {minimalDocs.length - stats.minimalUploaded} dokumen wajib.
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
              {isAdminMode ? 'Lihat dan verifikasi dokumen yang telah diupload' : 'Lihat dokumen yang telah diupload'}
            </DialogDescription>
          </DialogHeader>
          {previewFile && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{previewFile.nama_file}</h3>
                {isAdminMode && previewFile.status_verifikasi && (
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
                    <FileText className="w-16 h-16 mx-auto text-blue-500" />
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

      {/* Verification Dialog - Only for Admin */}
      {isAdminMode && (
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
                <Select value={verificationStatus} onValueChange={(value: VerificationStatus) => setVerificationStatus(value)}>
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
      )}
    </div>
  );
};

export default DokumenSantriTab;


