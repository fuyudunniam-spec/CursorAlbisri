import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Root as VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { 
  User, 
  Users, 
  GraduationCap, 
  Heart, 
  FileText, 
  Camera, 
  Save, 
  X, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Shield,
  Upload
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import UploadDokumenSantri from './UploadDokumenSantri';
import { useAriaFix } from '@/hooks/useAriaFix';
import { getSafeAvatarUrl } from '@/utils/url.utils';

// Types untuk kategori santri sesuai skema terbaru
type SantriKategori =
  | 'Santri Binaan Mukim'
  | 'Santri Binaan Non-Mukim'
  | 'Mahasiswa'
  | 'Santri Reguler'
  | 'Santri TPO';
type SantriProgram = 'TPQ' | 'Madin';
type SantriStatus = 'Aktif' | 'Non-Aktif' | 'Alumni';
type DokumenStatus = 'Ada' | 'Tidak Ada' | 'Dalam Proses';

interface SantriData {
  id?: string;
  nis?: string;
  // Administrasi
  kategori: string;
  angkatan: string;
  tanggal_masuk: string;
  status_santri: SantriStatus;
  tipe_pembayaran: string;
  
  // Personal
  nama_lengkap: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  jenis_kelamin: 'Laki-laki' | 'Perempuan';
  agama: string;
  status_sosial: 'Yatim' | 'Piatu' | 'Yatim Piatu' | 'Lengkap';
  no_whatsapp: string;
  alamat: string;
  foto_profil?: string;
}

interface WaliData {
  id?: string;
  nama_lengkap: string;
  hubungan_keluarga: string;
  no_whatsapp: string;
  alamat: string;
  pekerjaan?: string;
  penghasilan_bulanan?: number;
  is_utama: boolean;
}

interface ProgramData {
  id?: string;
  program_id?: string;
  nama_program: string;
  kelas_program: string;
  rombel?: string;
}

interface DokumenData {
  id?: string;
  jenis_dokumen: string;
  status: DokumenStatus;
  nama_file?: string;
  path_file?: string;
  keterangan?: string;
  tanggal_upload?: string;
  file?: File;
  uploaded?: boolean;
}

interface SantriFormProps {
  santriId?: string;
  onClose: () => void;
  onSave: () => void;
}

const SantriFormFixed: React.FC<SantriFormProps> = ({ santriId, onClose, onSave }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [santriData, setSantriData] = useState<SantriData>({
    kategori: '',
    angkatan: '',
    tanggal_masuk: '',
    status_santri: 'Aktif',
    tipe_pembayaran: 'Mandiri', // Valid values: Mandiri, Bantuan Yayasan
    status_approval: 'pending', // New santri starts as pending
    nama_lengkap: '',
    tempat_lahir: '',
    tanggal_lahir: '',
    jenis_kelamin: 'Laki-laki',
    agama: 'Islam',
    status_sosial: 'Lengkap',
    no_whatsapp: '',
    alamat: '',
  });

  const [waliData, setWaliData] = useState<WaliData[]>([
    {
      nama_lengkap: '',
      hubungan_keluarga: 'Ayah',
      no_whatsapp: '',
      alamat: '',
      is_utama: true
    }
  ]);

  const [programData, setProgramData] = useState<ProgramData[]>([
    {
      nama_program: '',
      kelas_program: ''
    }
  ]);

  // Dokumen minimal untuk pendaftaran santri reguler
  // IMPORTANT: Nama dokumen HARUS sesuai dengan database constraint
  const [dokumenData, setDokumenData] = useState<DokumenData[]>([
    { jenis_dokumen: 'Pas Foto', status: 'Tidak Ada' },
    { jenis_dokumen: 'Kartu Keluarga', status: 'Tidak Ada' },
    { jenis_dokumen: 'Akta Kelahiran', status: 'Tidak Ada' },
    { jenis_dokumen: 'Ijazah Terakhir', status: 'Tidak Ada' },
    { jenis_dokumen: 'Transkrip Nilai', status: 'Tidak Ada' }
  ]);

  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<{ [key: string]: File | null }>({});
  const [availablePrograms, setAvailablePrograms] = useState<Array<{id: string, nama_program: string, kode_program: string}>>([]);
  const [activeTab, setActiveTab] = useState<string>('personal');

  // Load available programs from master
  useEffect(() => {
    loadAvailablePrograms();
  }, []);

  const loadAvailablePrograms = async () => {
    try {
      // Simplified to use existing kelas options
      const { data, error } = await supabase
        .from('santri_kelas')
        .select('DISTINCT kelas_program, tingkat')
        .not('kelas_program', 'is', null)
        .order('kelas_program');

      if (error) throw error;

      setAvailablePrograms(data || []);
    } catch (error) {
      console.error('Error loading programs:', error);
    }
  };

  const dialogRef = useRef<HTMLDivElement>(null);
  const fullPage = false;

  // Keep dokumen minimal - no dynamic requirements for registration
  // Full dokumen requirements will be handled in bantuan application later

  // Load existing santri data when editing
  useEffect(() => {
    if (santriId) {
      loadSantriData();
    }
  }, [santriId]);

  const loadSantriData = async () => {
    if (!santriId) return;

    setIsLoading(true);
    try {
      // Load santri data
      const { data: santri, error: santriError } = await supabase
        .from('santri')
        .select('*')
        .eq('id', santriId)
        .single();

      if (santriError) throw santriError;

      if (santri) {
        setSantriData({
          id: santri.id,
          nisn: santri.nisn,
          kategori: santri.kategori,
          angkatan: santri.angkatan,
          tanggal_masuk: santri.tanggal_masuk,
          status_santri: santri.status_santri,
          tipe_pembayaran: santri.tipe_pembayaran,
          nama_lengkap: santri.nama_lengkap,
          tempat_lahir: santri.tempat_lahir,
          tanggal_lahir: santri.tanggal_lahir,
          jenis_kelamin: santri.jenis_kelamin,
          agama: santri.agama || 'Islam',
          status_sosial: santri.status_sosial || 'Lengkap',
          no_whatsapp: santri.no_whatsapp,
          alamat: santri.alamat,
          foto_profil: santri.foto_profil,
        });

        if (santri.foto_profil) {
          setProfilePhotoUrl(santri.foto_profil);
        }
      }

      // Load wali data
      const { data: waliList, error: waliError } = await supabase
        .from('santri_wali')
        .select('*')
        .eq('santri_id', santriId);

      console.log('Wali data loaded:', { waliList, waliError });
      if (!waliError && waliList && waliList.length > 0) {
        const mappedWali = waliList.map(w => ({
          id: w.id,
          nama_lengkap: w.nama_lengkap,
          hubungan_keluarga: w.hubungan_keluarga,
          no_whatsapp: w.no_whatsapp || '',
          alamat: w.alamat || '',
          pekerjaan: w.pekerjaan,
          penghasilan_bulanan: w.penghasilan_bulanan,
          is_utama: w.is_utama,
        }));
        console.log('Mapped wali data:', mappedWali);
        setWaliData(mappedWali);
      } else {
        console.log('No wali data found or error:', waliError);
      }

      // Load program data (handle schema cache issue)
      try {
        const { data: programList, error: programError } = await supabase
          .from('santri_kelas')
          .select('*')
          .eq('santri_id', santriId);

        if (!programError && programList && programList.length > 0) {
          const programsWithNames = await Promise.all(
            programList.map(async (p) => {
              // Try to get program name from master table if program_id exists
              let programName = '';
              if (p.program_id) {
                try {
                  // Simplified - no need to fetch program master
                  const programMaster = { nama_program: p.kelas_program || 'Kelas Belum Ditentukan' };
                  programName = programMaster?.nama_program || '';
                } catch (e) {
                  console.log('Could not load program master:', e);
                }
              }
              
              return {
                id: p.id,
                program_id: p.program_id || null,
                nama_program: programName || p.nama_program || '',
                kelas_program: p.kelas_program || '',
                rombel: p.rombel || '',
              };
            })
          );
          setProgramData(programsWithNames);
        }
      } catch (error) {
        console.log('Program loading failed (schema cache issue):', error);
        // Don't throw error, just skip program loading
      }

      // Load dokumen data
      const { data: dokumenList, error: dokumenError } = await supabase
        .from('dokumen_santri')
        .select('*')
        .eq('santri_id', santriId);

      console.log('Dokumen data loaded:', { dokumenList, dokumenError });
      if (!dokumenError && dokumenList && dokumenList.length > 0) {
        const mappedDokumen = dokumenList.map(d => ({
          id: d.id,
          jenis_dokumen: d.jenis_dokumen,
          status: d.status_verifikasi,
          nama_file: d.nama_file,
          path_file: d.path_file,
          keterangan: d.catatan_verifikasi,
          tanggal_upload: d.created_at,
        }));
        console.log('Mapped dokumen data:', mappedDokumen);
        setDokumenData(mappedDokumen);
      } else {
        console.log('No dokumen data found or error:', dokumenError);
      }

    } catch (error) {
      console.error('Error loading santri data:', error);
      toast.error('Gagal memuat data santri');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-generate angkatan from tanggal_masuk
  useEffect(() => {
    if (santriData.tanggal_masuk) {
      const year = new Date(santriData.tanggal_masuk).getFullYear();
      setSantriData(prev => ({ ...prev, angkatan: year.toString() }));
    }
  }, [santriData.tanggal_masuk]);

  // Auto-set tipe_pembayaran based on kategori
  useEffect(() => {
    if (santriData.kategori && !santriId) {
      const autoTipePembayaran = (() => {
        switch(santriData.kategori) {
          case 'Santri Binaan Mukim':
          case 'Santri Binaan Non-Mukim':
            return 'Bantuan Yayasan';
          case 'Mahasiswa':
          case 'Santri TPO':
            return 'Mandiri';
          case 'Santri Reguler':
          default:
            return 'Mandiri';
        }
      })();
      
      setSantriData(prev => ({ ...prev, tipe_pembayaran: autoTipePembayaran }));
    }
  }, [santriData.kategori, santriId]);

  // Validation - Program is optional for now (can be added later)
  const isFormValid = santriData.nama_lengkap.trim() && 
                     santriData.kategori && 
                     santriData.tanggal_masuk &&
                     santriData.tempat_lahir?.trim() &&
                     santriData.tanggal_lahir &&
                     santriData.jenis_kelamin &&
                     santriData.no_whatsapp?.trim() &&
                     santriData.alamat?.trim() &&
                     waliData.some(w => w.is_utama && w.nama_lengkap.trim());
                     
  // Optional: Check if required documents are uploaded (not blocking save)
  const hasRequiredDocuments = ['Pas Foto', 'Kartu Keluarga', 'Akta Kelahiran'].every(reqDoc => 
    dokumenData.find(d => d.jenis_dokumen === reqDoc)?.file
  );

  const getMissingFields = () => {
    const missing = [];
    if (!santriData.nama_lengkap?.trim()) missing.push('Nama Lengkap');
    if (!santriData.kategori) missing.push('Kategori');
    if (!santriData.tanggal_masuk) missing.push('Tanggal Masuk');
    if (!santriData.tempat_lahir?.trim()) missing.push('Tempat Lahir');
    if (!santriData.tanggal_lahir) missing.push('Tanggal Lahir');
    if (!santriData.jenis_kelamin) missing.push('Jenis Kelamin');
    if (!santriData.no_whatsapp?.trim()) missing.push('Nomor WhatsApp');
    if (!santriData.alamat?.trim()) missing.push('Alamat');
    // Program is optional - can be added later via ploating kelas
    if (!waliData.some(w => w.is_utama && w.nama_lengkap.trim())) missing.push('Data Wali');
    return missing;
  };

  const generateInitials = (name: string) => {
    if (!name || name.trim() === '') return 'SA';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Generate NIS (Nomor Induk Santri)
  const generateNIS = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `NIS${year}${month}${random}`;
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (file) {
        // Create a safe preview URL for display only
        const reader = new FileReader();
        reader.onload = (event) => {
          const url = event.target?.result as string;
          setProfilePhotoUrl(url);
          setSantriData(prev => ({ ...prev, foto_profil: url }));
        };
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Gagal mengupload foto');
    }
  };

  // Handle file upload for dokumen
  const handleFileUpload = (index: number, file: File) => {
    const updatedDokumen = [...dokumenData];
    updatedDokumen[index] = {
      ...updatedDokumen[index],
      file: file,
      nama_file: file.name,
      uploaded: false
    };
    setDokumenData(updatedDokumen);
  };

  // Upload dokumen files to storage
  const uploadDokumenFiles = async (santriId: string) => {
    const uploadPromises = dokumenData
      .filter(d => d.file && !d.uploaded)
      .map(async (dokumen, index) => {
        if (!dokumen.file) return null;

        try {
          const fileExt = dokumen.file.name.split('.').pop();
          const fileName = `${Date.now()}-${index}.${fileExt}`;
          const filePath = `santri/${santriId}/${dokumen.jenis_dokumen}/${fileName}`;

          // Upload to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from('santri-documents')
            .upload(filePath, dokumen.file);

          if (uploadError) {
            console.error('Upload error:', uploadError);
            return null;
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('santri-documents')
            .getPublicUrl(filePath);

          // Use jenis_dokumen directly (no mapping needed since CHECK constraint allows these values)
          const jenisDokumen = dokumen.jenis_dokumen;

          // Save to database
          const { error: dbError } = await supabase
            .from('dokumen_santri')
            .insert({
              santri_id: santriId,
              jenis_dokumen: jenisDokumen,
              nama_dokumen: dokumen.jenis_dokumen,
              nama_file: dokumen.file.name,
              path_file: filePath,
              ukuran_file: dokumen.file.size,
              tipe_file: dokumen.file.type,
              status_verifikasi: 'Belum Diverifikasi'
            });

          if (dbError) {
            console.error('Database error:', dbError);
            return null;
          }

          return { index, uploaded: true };
        } catch (error) {
          console.error('Upload failed:', error);
          return null;
        }
      });

    const results = await Promise.all(uploadPromises);
    return results.filter(Boolean);
  };

  const handleSubmit = async () => {
    if (!isFormValid) {
      toast.error('Lengkapi semua data yang wajib diisi');
      return;
    }

    setIsLoading(true);
    try {
      // Generate NIS if not exists
      const nisn = santriData.nisn || '';
      
      // Prepare data for saving
      const santriPayload = {
        ...santriData,
        nisn: nisn,
        agama: 'Islam', // Ensure agama is always Islam
      };

      let savedSantriId = santriId;

      // UPSERT: Update if editing, Insert if new
      if (santriId) {
        // UPDATE existing santri
        const { data, error } = await supabase
          .from('santri')
          .update(santriPayload)
          .eq('id', santriId)
          .select();

        if (error) {
          console.error('Supabase error:', error);
          toast.error(`Gagal mengupdate data santri: ${error.message}`);
          return;
        }
      } else {
        // INSERT new santri
        const { data, error } = await supabase
          .from('santri')
          .insert([santriPayload])
          .select();

        if (error) {
          console.error('Supabase error:', error);
          toast.error(`Gagal menyimpan data santri: ${error.message}`);
          return;
        }

        savedSantriId = data[0].id;
      }

      // Save wali data (UPSERT)
      if (waliData.length > 0 && savedSantriId) {
        // Delete existing wali if editing
        if (santriId) {
          await supabase
            .from('santri_wali')
            .delete()
            .eq('santri_id', santriId);
        }

        // Insert new/updated wali
        const waliPayload = waliData.map(wali => ({
          nama_lengkap: wali.nama_lengkap,
          hubungan_keluarga: wali.hubungan_keluarga,
          no_whatsapp: wali.no_whatsapp,
          alamat: wali.alamat,
          pekerjaan: wali.pekerjaan,
          penghasilan_bulanan: wali.penghasilan_bulanan,
          is_utama: wali.is_utama,
          santri_id: savedSantriId,
        }));

        const { error: waliError } = await supabase
          .from('santri_wali')
          .insert(waliPayload);

        if (waliError) {
          console.error('Wali error:', waliError);
          toast.error(`Gagal menyimpan data wali: ${waliError.message}`);
          return;
        }
      }

      // Save program data (UPSERT)
      if (programData.length > 0 && savedSantriId && programData[0].program_id) {
        try {
          // Delete existing programs if editing
          if (santriId) {
            await supabase
              .from('santri_kelas')
              .delete()
              .eq('santri_id', santriId);
          }

          // Insert new/updated programs
          const programPayload = programData
            .filter(p => p.program_id) // Only programs with valid program_id
            .map(program => ({
              program_id: program.program_id,
              kelas_program: program.kelas_program,
              rombel: program.rombel,
              santri_id: savedSantriId,
            }));

          if (programPayload.length > 0) {
            const { error: programError } = await supabase
              .from('santri_kelas')
              .insert(programPayload);

            if (programError) {
              console.error('Program error:', programError);
              console.warn('Skipping program save due to schema issue. Please check migration.');
              // Don't block save if program fails
            }
          }
        } catch (error) {
          console.error('Program save error:', error);
          // Don't block santri save if program fails
        }
      }

      // Upload dokumen files if any
      if (dokumenData.some(d => d.file)) {
        const uploadResults = await uploadDokumenFiles(savedSantriId);
        console.log('Dokumen upload results:', uploadResults);
      }
      
      toast.success(santriId ? 'Data santri berhasil diperbarui' : 'Data santri berhasil disimpan');
      onSave(); // Refresh the list
      onClose();
    } catch (error) {
      console.error('Error saving santri:', error);
      toast.error('Gagal menyimpan data santri');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => {
      if (!open && !isLoading) {
        try {
          onClose();
        } catch (error) {
          console.error('Error closing dialog:', error);
        }
      }
    }}>
      <DialogContent 
        className="max-w-7xl max-h-[95vh] overflow-hidden p-0"
      >
        <VisuallyHidden asChild>
          <DialogTitle>Form Data Santri</DialogTitle>
        </VisuallyHidden>
        
        <div className="bg-gradient-to-br from-slate-50 to-blue-50/30">
          <div className="flex h-[90vh]">
            {/* Sidebar */}
            <aside className="w-80 bg-white/95 backdrop-blur-sm shadow-xl border-r border-slate-200/60 flex-shrink-0 overflow-y-auto">
              <div className="p-6">
                {/* Profile Section */}
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="relative">
                    <Avatar className="w-20 h-20 ring-2 ring-blue-100">
                      <AvatarImage 
                        src={getSafeAvatarUrl(profilePhotoUrl)} 
                        alt={santriData.nama_lengkap} 
                      />
                      <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-slate-600 to-slate-800 text-white">
                        {generateInitials(santriData.nama_lengkap)}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      size="sm"
                      className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-500 hover:bg-blue-600 border-2 border-white p-0"
                      onClick={() => document.getElementById('photo-upload')?.click()}
                    >
                      <Camera className="w-3 h-3 text-white" />
                    </Button>
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </div>
                  <div className="mt-3">
                    <h3 className="text-base font-semibold text-slate-800 truncate max-w-[200px]">
                      {santriData.nama_lengkap || 'Nama Santri'}
                    </h3>
                    <p className="text-xs text-slate-500 truncate max-w-[200px]">
                      {santriData.kategori || 'Kategori Santri'}
                    </p>
                  </div>
                </div>

                {/* Navigation */}
                <div className="space-y-1">
                  <button 
                    onClick={() => setActiveTab('personal')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === 'personal' 
                        ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                        : 'hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <User className="w-4 h-4" /> 
                    <span className="text-sm font-medium">Personal Information</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('wali')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === 'wali' 
                        ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                        : 'hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Users className="w-4 h-4" /> 
                    <span className="text-sm">Wali</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('program')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === 'program' 
                        ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                        : 'hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" /> 
                    <span className="text-sm">Program</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('dokumen')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === 'dokumen' 
                        ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                        : 'hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <FileText className="w-4 h-4" /> 
                    <span className="text-sm">Dokumen</span>
                  </button>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* Tab Content */}
                  {activeTab === 'personal' && (
                    <Card className="rounded-xl shadow-sm border border-slate-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <User className="w-5 h-5 text-blue-600" />
                          Personal Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Gender Selection */}
                        <div>
                          <Label className="text-sm font-medium text-slate-700">Jenis Kelamin *</Label>
                          <RadioGroup
                            className="flex gap-6 mt-2"
                            value={santriData.jenis_kelamin}
                            onValueChange={(v) => setSantriData({ ...santriData, jenis_kelamin: v as 'Laki-laki' | 'Perempuan' })}
                          >
                            <label className="flex items-center gap-2 cursor-pointer">
                              <RadioGroupItem value="Laki-laki" /> 
                              <span className="text-sm">Laki-laki</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <RadioGroupItem value="Perempuan" /> 
                              <span className="text-sm">Perempuan</span>
                            </label>
                          </RadioGroup>
                        </div>

                        {/* Name Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-sm font-medium text-slate-700">Nama Lengkap *</Label>
                            <Input 
                              value={santriData.nama_lengkap}
                              onChange={(e) => setSantriData({ ...santriData, nama_lengkap: e.target.value })}
                              placeholder="Masukkan nama lengkap"
                              className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-sm font-medium text-slate-700">Tempat Lahir *</Label>
                            <Input 
                              value={santriData.tempat_lahir}
                              onChange={(e) => setSantriData({ ...santriData, tempat_lahir: e.target.value })}
                              placeholder="Masukkan tempat lahir"
                              className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        {/* Birth Date and WhatsApp */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-sm font-medium text-slate-700">Tanggal Lahir *</Label>
                            <Input 
                              type="date"
                              value={santriData.tanggal_lahir}
                              onChange={(e) => setSantriData({ ...santriData, tanggal_lahir: e.target.value })}
                              className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-sm font-medium text-slate-700">Nomor WhatsApp *</Label>
                            <Input 
                              value={santriData.no_whatsapp}
                              onChange={(e) => setSantriData({ ...santriData, no_whatsapp: e.target.value })}
                              placeholder="+62..."
                              className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        {/* Address */}
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium text-slate-700">Alamat *</Label>
                          <Textarea 
                            value={santriData.alamat}
                            onChange={(e) => setSantriData({ ...santriData, alamat: e.target.value })}
                            placeholder="Masukkan alamat lengkap"
                            className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                            rows={3}
                          />
                        </div>

                        {/* NIS (Auto-generated) */}
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium text-slate-700">NISN (Nomor Induk Siswa Nasional)</Label>
                          <Input 
                            value={santriData.nisn || 'Opsional'}
                            readOnly
                            className="border-slate-300 bg-slate-50 text-slate-500"
                            placeholder="Opsional"
                          />
                          <p className="text-xs text-slate-500">NIS akan dibuat otomatis saat menyimpan data</p>
                        </div>

                        {/* Administrative Data */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-sm font-medium text-slate-700">Kategori Santri *</Label>
                            <Select 
                              value={santriData.kategori}
                              onValueChange={(value) => setSantriData({ ...santriData, kategori: value })}
                            >
                              <SelectTrigger className="border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                                <SelectValue placeholder="Pilih kategori" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Santri Binaan Mukim">
                                  Santri Binaan Mukim
                                  <span className="text-xs text-muted-foreground ml-2">
                                    (Otomatis mendapat bantuan yayasan penuh)
                                  </span>
                                </SelectItem>
                                <SelectItem value="Santri Binaan Non-Mukim">
                                  Santri Binaan Non-Mukim
                                  <span className="text-xs text-muted-foreground ml-2">
                                    (Otomatis mendapat bantuan yayasan penuh)
                                  </span>
                                </SelectItem>
                                <SelectItem value="Mahasiswa">
                                  Mahasiswa
                                  <span className="text-xs text-muted-foreground ml-2">
                                    (Bayar mandiri sesuai program)
                                  </span>
                                </SelectItem>
                                <SelectItem value="Santri Reguler">
                                  Santri Reguler
                                  <span className="text-xs text-muted-foreground ml-2">
                                    (Dapat mengajukan bantuan setelah pendaftaran)
                                  </span>
                                </SelectItem>
                                <SelectItem value="Santri TPO">
                                  Santri TPO
                                  <span className="text-xs text-muted-foreground ml-2">
                                    (Bayar mandiri)
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-sm font-medium text-slate-700">Angkatan</Label>
                            <Input 
                              value={santriData.angkatan}
                              readOnly
                              className="border-slate-300 bg-slate-50 text-slate-700"
                              placeholder="Auto dari tanggal masuk"
                            />
                            <p className="text-xs text-slate-500">Otomatis dari tahun tanggal masuk</p>
                          </div>
                        </div>

                        {/* Entry Date & Religion */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-sm font-medium text-slate-700">Tanggal Masuk *</Label>
                            <Input 
                              type="date"
                              value={santriData.tanggal_masuk}
                              onChange={(e) => setSantriData({ ...santriData, tanggal_masuk: e.target.value })}
                              className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-sm font-medium text-slate-700">Agama</Label>
                            <Input 
                              value="Islam"
                              readOnly
                              className="border-slate-300 bg-slate-50 text-slate-700"
                              placeholder="Islam (Default)"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Wali Tab */}
                  {activeTab === 'wali' && (
                    <Card className="rounded-xl shadow-sm border border-slate-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Users className="w-5 h-5 text-blue-600" />
                          Data Wali
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {waliData.map((wali, index) => (
                          <div key={index} className="p-4 border border-slate-200 rounded-lg space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-slate-700">
                                {wali.is_utama ? 'Wali Utama' : `Wali ${index + 1}`}
                              </h4>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={wali.is_utama}
                                  onCheckedChange={(checked) => {
                                    const newWaliData = waliData.map((w, i) => ({
                                      ...w,
                                      is_utama: i === index ? (checked === true) : false
                                    }));
                                    setWaliData(newWaliData);
                                  }}
                                />
                                <Label className="text-sm">Wali Utama</Label>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-slate-700">Nama Lengkap *</Label>
                                <Input 
                                  value={wali.nama_lengkap}
                                  onChange={(e) => {
                                    const newWaliData = [...waliData];
                                    newWaliData[index].nama_lengkap = e.target.value;
                                    setWaliData(newWaliData);
                                  }}
                                  placeholder="Masukkan nama wali"
                                  className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-slate-700">Hubungan Keluarga *</Label>
                                <Select 
                                  value={wali.hubungan_keluarga}
                                  onValueChange={(value) => {
                                    const newWaliData = [...waliData];
                                    newWaliData[index].hubungan_keluarga = value;
                                    setWaliData(newWaliData);
                                  }}
                                >
                                  <SelectTrigger className="border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                                    <SelectValue placeholder="Pilih hubungan" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Ayah">Ayah</SelectItem>
                                    <SelectItem value="Ibu">Ibu</SelectItem>
                                    <SelectItem value="Kakek">Kakek</SelectItem>
                                    <SelectItem value="Nenek">Nenek</SelectItem>
                                    <SelectItem value="Paman">Paman</SelectItem>
                                    <SelectItem value="Bibi">Bibi</SelectItem>
                                    <SelectItem value="Saudara">Saudara</SelectItem>
                                    <SelectItem value="Lainnya">Lainnya</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-slate-700">Nomor WhatsApp *</Label>
                                <Input 
                                  value={wali.no_whatsapp}
                                  onChange={(e) => {
                                    const newWaliData = [...waliData];
                                    newWaliData[index].no_whatsapp = e.target.value;
                                    setWaliData(newWaliData);
                                  }}
                                  placeholder="+62..."
                                  className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-slate-700">Alamat</Label>
                                <Input 
                                  value={wali.alamat}
                                  onChange={(e) => {
                                    const newWaliData = [...waliData];
                                    newWaliData[index].alamat = e.target.value;
                                    setWaliData(newWaliData);
                                  }}
                                  placeholder="Masukkan alamat wali"
                                  className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                                />
                              </div>
                            </div>

                            {/* Data Ekonomi */}
                            <div className="pt-4 border-t border-slate-200">
                              <h5 className="text-sm font-medium text-slate-700 mb-3">Data Ekonomi</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <Label className="text-sm font-medium text-slate-700">Pekerjaan</Label>
                                  <Input 
                                    value={wali.pekerjaan || ''}
                                    onChange={(e) => {
                                      const newWaliData = [...waliData];
                                      newWaliData[index].pekerjaan = e.target.value;
                                      setWaliData(newWaliData);
                                    }}
                                    placeholder="Contoh: Karyawan Swasta, Wiraswasta, PNS"
                                    className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-sm font-medium text-slate-700">Penghasilan Bulanan</Label>
                                  <Select 
                                    value={wali.penghasilan_bulanan?.toString() || ''}
                                    onValueChange={(value) => {
                                      const newWaliData = [...waliData];
                                      newWaliData[index].penghasilan_bulanan = parseFloat(value) || 0;
                                      setWaliData(newWaliData);
                                    }}
                                  >
                                    <SelectTrigger className="border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                                      <SelectValue placeholder="Pilih range penghasilan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="0">Tidak Ada Penghasilan</SelectItem>
                                      <SelectItem value="500000">&lt; Rp 500.000</SelectItem>
                                      <SelectItem value="1000000">Rp 500.000 - Rp 1.000.000</SelectItem>
                                      <SelectItem value="1500000">Rp 1.000.000 - Rp 1.500.000</SelectItem>
                                      <SelectItem value="2000000">Rp 1.500.000 - Rp 2.000.000</SelectItem>
                                      <SelectItem value="3000000">Rp 2.000.000 - Rp 3.000.000</SelectItem>
                                      <SelectItem value="5000000">Rp 3.000.000 - Rp 5.000.000</SelectItem>
                                      <SelectItem value="10000000">Rp 5.000.000 - Rp 10.000.000</SelectItem>
                                      <SelectItem value="20000000">&gt; Rp 10.000.000</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        <Button 
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setWaliData([...waliData, {
                              nama_lengkap: '',
                              hubungan_keluarga: 'Ayah',
                              no_whatsapp: '',
                              alamat: '',
                              is_utama: false
                            }]);
                          }}
                          className="w-full"
                        >
                          <Users className="w-4 h-4 mr-2" />
                          Tambah Wali
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Program Tab */}
                  {activeTab === 'program' && (
                    <Card className="rounded-xl shadow-sm border border-slate-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <GraduationCap className="w-5 h-5 text-blue-600" />
                          Data Program
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {programData.map((program, index) => (
                          <div key={index} className="p-4 border border-slate-200 rounded-lg space-y-4">
                            <h4 className="font-medium text-slate-700">Program Santri</h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-slate-700">Nama Program *</Label>
                                <Select 
                                  value={program.program_id || program.nama_program}
                                  onValueChange={(value) => {
                                    const selectedProgram = availablePrograms.find(p => p.id === value);
                                    const newProgramData = [...programData];
                                    newProgramData[index].program_id = value;
                                    newProgramData[index].nama_program = selectedProgram?.nama_program || '';
                                    setProgramData(newProgramData);
                                  }}
                                >
                                  <SelectTrigger className="border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                                    <SelectValue placeholder="Pilih program" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availablePrograms.map((prog) => (
                                      <SelectItem key={prog.id} value={prog.id}>
                                        {prog.nama_program} ({prog.kode_program})
                                      </SelectItem>
                                    ))}
                                    {availablePrograms.length === 0 && (
                                      <SelectItem value="none" disabled>
                                        Tidak ada program tersedia
                                      </SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-slate-700">Kelas Program *</Label>
                                <Input 
                                  value={program.kelas_program}
                                  onChange={(e) => {
                                    const newProgramData = [...programData];
                                    newProgramData[index].kelas_program = e.target.value;
                                    setProgramData(newProgramData);
                                  }}
                                  placeholder="Contoh: Kelas 1, Kelas 2, dll"
                                  className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-sm font-medium text-slate-700">Rombel</Label>
                              <Input 
                                value={program.rombel || ''}
                                onChange={(e) => {
                                  const newProgramData = [...programData];
                                  newProgramData[index].rombel = e.target.value;
                                  setProgramData(newProgramData);
                                }}
                                placeholder="Contoh: A, B, C"
                                className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}


                  {/* Dokumen Tab */}
                  {activeTab === 'dokumen' && (
                    <Card className="rounded-xl shadow-sm border border-slate-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileText className="w-5 h-5 text-blue-600" />
                          Dokumen Santri
                        </CardTitle>
                         <p className="text-sm text-slate-500 mt-1">
                           {santriId 
                             ? 'Kelola dokumen santri. Upload file via form di bawah.' 
                             : 'Checklist dokumen yang perlu disiapkan. Upload akan tersedia setelah data santri disimpan.'}
                         </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {santriId ? (
                          <UploadDokumenSantri 
                            santriId={santriId}
                            kategori={santriData.kategori}
                            statusAnak={santriData.status_sosial}
                            onUploadComplete={() => {
                              console.log('File uploaded successfully');
                              toast.success('Dokumen berhasil diupload');
                            }}
                          />
                        ) : (
                            <div className="space-y-4">
                              <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="text-sm">
                                  💡 <strong>Upload Dokumen Dasar:</strong> Pilih file untuk dokumen yang wajib diisi.
                                </AlertDescription>
                              </Alert>
                              
                              {dokumenData.map((dokumen, index) => (
                                <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                      <div className={`w-2 h-2 rounded-full ${['Pas Foto', 'Kartu Keluarga', 'Akta Kelahiran'].includes(dokumen.jenis_dokumen) ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                                      <span className="font-medium text-sm">{dokumen.jenis_dokumen}</span>
                                      {!['Pas Foto', 'Kartu Keluarga', 'Akta Kelahiran'].includes(dokumen.jenis_dokumen) && (
                                        <Badge variant="secondary" className="text-xs">Opsional</Badge>
                                      )}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Status: {dokumen.file ? (
                                        <span className="text-green-600 font-medium">✓ File dipilih: {dokumen.file.name}</span>
                                      ) : (
                                        <span className="text-gray-500">Belum ada file</span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="file"
                                      id={`file-${index}`}
                                      accept="image/*,.pdf,.doc,.docx"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          handleFileUpload(index, file);
                                        }
                                      }}
                                      className="hidden"
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => document.getElementById(`file-${index}`)?.click()}
                                    >
                                      <Upload className="w-4 h-4 mr-1" />
                                      Pilih
                                    </Button>
                                    
                                    {dokumen.file && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          const updatedDokumen = [...dokumenData];
                                          updatedDokumen[index] = {
                                            ...updatedDokumen[index],
                                            file: undefined,
                                            nama_file: undefined
                                          };
                                          setDokumenData(updatedDokumen);
                                        }}
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                              
                              <Alert>
                                <FileText className="h-4 w-4" />
                                <AlertDescription className="text-xs">
                                  <strong>Dokumen Tambahan:</strong> Akta Kematian, SKTM, KTP Wali, dll. akan diminta saat pengajuan bantuan berdasarkan status anak.
                                </AlertDescription>
                              </Alert>
                            </div>
                          )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
              
              {/* Fixed Footer */}
              <div className="border-t border-slate-200/60 bg-white/95 backdrop-blur-sm px-6 py-4">
                <div className="flex items-center justify-between">
                  {/* Validation Status */}
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${isFormValid ? 'bg-green-500' : 'bg-amber-500'}`} />
                    <div className="text-sm">
                      {isFormValid ? (
                        <span className="text-green-700 font-medium">✓ Form siap disimpan</span>
                      ) : (
                        <span className="text-amber-700 font-medium">
                          ⚠ Lengkapi data wajib: {getMissingFields().join(', ')}
                        </span>
                      )}
                      {!santriId && (
                        <div className="text-xs mt-1">
                          Dokumen: {hasRequiredDocuments ? (
                            <span className="text-green-600">✓ Semua dokumen wajib sudah dipilih</span>
                          ) : (
                            <span className="text-amber-600">⚠ Dokumen wajib belum lengkap (opsional)</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={onClose} 
                      disabled={isLoading}
                      className="border-slate-300 text-slate-600 hover:bg-slate-50"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Batal
                    </Button>
                    <Button 
                      onClick={handleSubmit}
                      disabled={isLoading || !isFormValid}
                      className={`${isFormValid 
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800' 
                        : 'bg-slate-300 cursor-not-allowed'
                      } text-white shadow-lg`}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isLoading ? 'Menyimpan...' : (santriId ? 'Perbarui Data' : 'Simpan Data')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SantriFormFixed;
