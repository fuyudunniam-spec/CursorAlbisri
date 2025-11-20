import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Root as VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Camera, Save, X, Award, User, Users, GraduationCap, Activity, FileText, AlertCircle } from "lucide-react";
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getSafeAvatarUrl } from '@/utils/url.utils';
import { KategoriSantri, StatusSosial, SantriData, WaliData, RiwayatPendidikan, KondisiKesehatan, DokumenData } from '@/types/santri.types';
import { ProfileHelper } from '@/utils/profile.helper';
import { DokumenHelper } from '@/utils/dokumen.helper';

// Import Steps
import KategoriStep from './forms/KategoriStep';
import PersonalStep from './forms/PersonalStep';
import WaliStep from './forms/WaliStep';
import PendidikanStep from './forms/PendidikanStep';
import KesehatanStep from './forms/KesehatanStep';
import DokumenStep from './forms/DokumenStep';

interface SantriFormWizardProps {
  santriId?: string;
  onClose: () => void;
  onSave: () => void;
  initialTab?: string;
}

const SantriFormWizard: React.FC<SantriFormWizardProps> = ({ santriId, onClose, onSave, initialTab }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(initialTab || 'kategori');
  
  // Kategori Selection
  const [selectedKategori, setSelectedKategori] = useState<KategoriSantri | ''>('');
  const [selectedSubKategori, setSelectedSubKategori] = useState<'Mukim' | 'Non-Mukim' | ''>('');
  
  // Santri Data
  const [santriData, setSantriData] = useState<SantriData>({
    kategori: 'Reguler',
    angkatan: '',
    tanggal_masuk: '',
    status_santri: 'Aktif',
    tipe_pembayaran: 'Mandiri',
    status_approval: 'disetujui', // Auto-approval - no longer using complex approval workflow
    nama_lengkap: '',
    tempat_lahir: '',
    tanggal_lahir: '',
    jenis_kelamin: 'Laki-laki',
    agama: 'Islam',
    status_sosial: 'Lengkap',
    no_whatsapp: '',
    alamat: '',
    // Additional personal info
    nik: '', // Made required
    nisn: '', // Renamed from nis
    id_santri: '', // Auto-generated
    nomor_kk: '',
    dusun: '',
    desa_kelurahan: '',
    kecamatan: '',
    kabupaten_kota: '',
    provinsi: '',
    // Health info
    golongan_darah: '',
    riwayat_penyakit: '',
    pernah_rawat_inap: false,
    keterangan_rawat_inap: '',
    disabilitas_khusus: '',
    obat_khusus: '',
    // Additional fields
    kewarganegaraan: 'Indonesia',
    nama_panggilan: '',
    ukuran_seragam: '',
    // warna_seragam removed
    kelas_internal: '',
    program_spp: false,
    program_bantuan: false,
    kelas_tpq: '',
    rombel_tpq: '',
    kelas_madin: '',
    rombel_madin: '',
    aktivitas_akademik: '',
    prestasi: '',
    anak_ke: undefined,
    jumlah_saudara: undefined,
    hobi: '', // Optional for all categories
    cita_cita: '', // Optional for all categories
  });

  const [waliData, setWaliData] = useState<WaliData[]>([
    { nama_lengkap: '', hubungan_keluarga: 'Ayah', no_whatsapp: '', alamat: '', is_utama: true }
  ]);

  const [riwayatPendidikan, setRiwayatPendidikan] = useState<RiwayatPendidikan[]>([
    { jenjang: '', nama_sekolah: '', tahun_masuk: '', tahun_lulus: '' }
  ]);

  const [kondisiKesehatan, setKondisiKesehatan] = useState<KondisiKesehatan>({
    golongan_darah: '',
    tinggi_badan: undefined,
    berat_badan: undefined,
    riwayat_penyakit: '',
    alergi: '',
    kondisi_khusus: '',
    // kontak_darurat fields removed - redundant with wali data
  });

  const [dokumenData, setDokumenData] = useState<DokumenData[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<{ [key: string]: boolean }>({});
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>('');

  // Load existing data for edit mode
  useEffect(() => {
    if (santriId) {
      loadExistingData();
    }
  }, [santriId]);

  const loadExistingData = async () => {
    if (!santriId) return;
    
    try {
      setLoadingData(true);
      
      // Load santri data
      const { data: santri, error: santriError } = await supabase
        .from('santri')
        .select('*')
        .eq('id', santriId)
        .single();

      if (santriError) throw santriError;

      // Set santri data with proper mapping
      setSantriData({
        ...santriData,
        id: santri.id,
        nisn: santri.nisn, // Renamed from nis
        id_santri: santri.id_santri, // Auto-generated ID
        nama_lengkap: santri.nama_lengkap || '',
        tempat_lahir: santri.tempat_lahir || '',
        tanggal_lahir: santri.tanggal_lahir ? santri.tanggal_lahir.split('T')[0] : '',
        jenis_kelamin: santri.jenis_kelamin || 'Laki-laki',
        agama: santri.agama || 'Islam',
        status_sosial: santri.status_sosial || 'Lengkap',
        no_whatsapp: santri.no_whatsapp || '',
        alamat: santri.alamat || '',
        foto_profil: santri.foto_profil || '',
        // Additional personal info
        nik: santri.nik || '',
        nomor_kk: santri.nomor_kk || '',
        dusun: santri.dusun || '',
        desa_kelurahan: santri.desa_kelurahan || '',
        kecamatan: santri.kecamatan || '',
        kabupaten_kota: santri.kabupaten_kota || '',
        provinsi: santri.provinsi || '',
        // Health info
        golongan_darah: santri.golongan_darah || '',
        riwayat_penyakit: santri.riwayat_penyakit || '',
        pernah_rawat_inap: santri.pernah_rawat_inap || false,
        keterangan_rawat_inap: santri.keterangan_rawat_inap || '',
        disabilitas_khusus: santri.disabilitas_khusus || '',
        obat_khusus: santri.obat_khusus || '',
        // Additional fields
        kewarganegaraan: santri.kewarganegaraan || 'Indonesia',
        nama_panggilan: santri.nama_panggilan || '',
        ukuran_seragam: santri.ukuran_seragam || '',
        kelas_internal: santri.kelas_internal || '',
        program_spp: santri.program_spp || false,
        program_bantuan: santri.program_bantuan || false,
        kelas_tpq: santri.kelas_tpq || '',
        rombel_tpq: santri.rombel_tpq || '',
        kelas_madin: santri.kelas_madin || '',
        rombel_madin: santri.rombel_madin || '',
        aktivitas_akademik: santri.aktivitas_akademik || '',
        prestasi: santri.prestasi || '',
        kategori: santri.kategori || '',
        angkatan: santri.angkatan || '',
        tanggal_masuk: santri.tanggal_masuk ? santri.tanggal_masuk.split('T')[0] : '',
        status_santri: santri.status_santri || santri.status_baru || 'Aktif',
        tipe_pembayaran: santri.tipe_pembayaran || 'Mandiri',
        status_approval: santri.status_approval || 'disetujui', // Auto-approval
        approved_at: santri.approved_at,
        approved_by: santri.approved_by,
        catatan_approval: santri.catatan_approval,
        rejected_at: santri.rejected_at,
        rejected_by: santri.rejected_by,
        catatan_penolakan: santri.catatan_penolakan,
        // Additional fields for Binaan
        anak_ke: santri.anak_ke || undefined,
        jumlah_saudara: santri.jumlah_saudara || undefined,
        hobi: santri.hobi || '',
        cita_cita: santri.cita_cita || '',
        // School info
        nama_sekolah: santri.nama_sekolah || '',
        kelas_sekolah: santri.kelas_sekolah || '',
        nomor_wali_kelas: santri.nomor_wali_kelas || '',
        // Timestamps
        created_at: santri.created_at,
        updated_at: santri.updated_at
      });

      // Set profile photo URL if exists
      if (santri.foto_profil) {
        setProfilePhotoUrl(santri.foto_profil);
      }

      // Set kategori and sub kategori
      if (santri.kategori === 'Binaan Mukim') {
        setSelectedKategori('Binaan Mukim');
        setSelectedSubKategori('Mukim');
      } else if (santri.kategori === 'Binaan Non-Mukim') {
        setSelectedKategori('Binaan Non-Mukim');
        setSelectedSubKategori('Non-Mukim');
      } else {
        setSelectedKategori(santri.kategori as KategoriSantri);
      }

      // Set active tab based on initialTab or default to personal for edit mode
      if (initialTab && initialTab !== 'kategori') {
        setActiveTab(initialTab);
      } else {
        setActiveTab('personal');
      }

      // Load wali data
      const { data: wali, error: waliError } = await supabase
        .from('santri_wali')
        .select('*')
        .eq('santri_id', santriId)
        .order('is_utama', { ascending: false });

      if (!waliError && wali) {
        setWaliData(wali);
      }

      // Load riwayat pendidikan
      const { data: pendidikan, error: pendidikanError } = await supabase
        .from('riwayat_pendidikan')
        .select('*')
        .eq('santri_id', santriId)
        .order('tahun_lulus', { ascending: false });

      if (!pendidikanError && pendidikan) {
        setRiwayatPendidikan(pendidikan);
      }

      // Load kondisi kesehatan
      const { data: kesehatan, error: kesehatanError } = await supabase
        .from('kondisi_kesehatan')
        .select('*')
        .eq('santri_id', santriId)
        .maybeSingle();

      if (!kesehatanError && kesehatan) {
        console.log('🏥 Loading kesehatan data:', kesehatan);
        setKondisiKesehatan(kesehatan);
      } else if (kesehatanError) {
        console.error('❌ Error loading kesehatan:', kesehatanError);
      } else {
        // Initialize empty kesehatan data for new santri or those without health data
        console.log('🏥 Initializing empty kesehatan data for santri:', santriId);
        setKondisiKesehatan({
          golongan_darah: '',
          tinggi_badan: null,
          berat_badan: null,
          riwayat_penyakit: '',
          alergi: '',
          kondisi_khusus: ''
        });
      }

      // Load enrollment data (simplified)
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('santri_kelas')
        .select('id, kelas_program, rombel')
        .eq('santri_id', santriId)
        .limit(1)
        .maybeSingle();

      if (!enrollmentError && enrollment) {
        setSantriData(prev => ({
          ...prev,
          // Simplified - no more rumpun_kelas and nama_kelas
        }));
      }

      // Load dokumen data
      const { data: dokumen, error: dokumenError } = await supabase
        .from('dokumen_santri')
        .select('*')
        .eq('santri_id', santriId);

      if (!dokumenError) {
        // Build template from ProfileHelper to ensure required/optional matches view tab
        const template = ProfileHelper.getRequiredDocuments(
          santri.kategori || 'Reguler',
          santri.status_sosial || undefined
        );

        const merged: DokumenData[] = template.map(t => {
          const found = dokumen?.find((d: any) => d.jenis_dokumen === t.jenis_dokumen);
          return {
            jenis_dokumen: t.jenis_dokumen,
            label: t.jenis_dokumen,
            required: t.required,
            // Do not preload File object from DB; allow user to choose file. Preserve display name if any
            file: undefined,
            uploaded: !!found,
            nama_file: found?.nama_file,
            path_file: found?.path_file,
          } as DokumenData;
        });

        setDokumenData(merged);
      }

    } catch (error) {
      console.error('Error loading existing data:', error);
      toast.error('Gagal memuat data santri');
    } finally {
      setLoadingData(false);
    }
  };

  // Auto-set dokumen berdasarkan kategori dan status sosial (selalu rebuild dari template)
  useEffect(() => {
    if (selectedKategori && santriData.status_sosial) {
      let docs: DokumenData[] = [];

      if (selectedKategori === 'Reguler' || selectedKategori === 'Mahasiswa') {
        docs = DokumenHelper.getDokumenReguler();
      } else if (selectedKategori === 'Binaan Mukim') {
        docs = DokumenHelper.getDokumenBinaanMukim(santriData.status_sosial);
      } else if (selectedKategori === 'Binaan Non-Mukim') {
        docs = DokumenHelper.getDokumenBinaanNonMukim(santriData.status_sosial);
      }

      // Selalu rebuild dari template sambil melestarikan file yang sudah dipilih di sesi ini
      const updated = docs.map(doc => {
        const existing = dokumenData.find(d => d.jenis_dokumen === doc.jenis_dokumen);
        return {
          ...doc,
          file: existing?.file,
          nama_file: existing?.nama_file,
        } as DokumenData;
      });

      setDokumenData(updated);
    }
  }, [selectedKategori, santriData.status_sosial]);

  // Auto-generate angkatan
  useEffect(() => {
    if (santriData.tanggal_masuk) {
      const year = new Date(santriData.tanggal_masuk).getFullYear();
      setSantriData(prev => ({ ...prev, angkatan: year.toString() }));
    }
  }, [santriData.tanggal_masuk]);

  // Auto-generate ID santri when kategori or angkatan changes
  useEffect(() => {
    if (santriData.kategori && santriData.angkatan) {
      const idSantri = generateIdSantri(santriData.kategori, santriData.angkatan);
      setSantriData(prev => ({ ...prev, id_santri: idSantri }));
    }
  }, [santriData.kategori, santriData.angkatan]);

  // Auto-set kategori and tipe_pembayaran
  useEffect(() => {
    if (selectedKategori && !santriId) {
      let tipePembayaran: 'Mandiri' | 'Bantuan Yayasan' = 'Mandiri';
      if (selectedKategori.includes('Binaan')) {
        tipePembayaran = 'Bantuan Yayasan';
      }
      setSantriData(prev => ({
        ...prev,
        kategori: selectedKategori,
        tipe_pembayaran: tipePembayaran
      }));
    }
  }, [selectedKategori, santriId]);

  const handleKategoriSelect = (kategori: KategoriSantri) => {
    setSelectedKategori(kategori);
    setSantriData(prev => ({ ...prev, kategori }));
    if (!kategori.includes('Binaan')) {
      setTimeout(() => setActiveTab('personal'), 300);
    }
  };

  const handleSubKategoriSelect = (subKategori: 'Mukim' | 'Non-Mukim') => {
    setSelectedSubKategori(subKategori);
    const finalKategori = `Binaan ${subKategori}` as KategoriSantri;
    setSelectedKategori(finalKategori);
    setSantriData(prev => ({ ...prev, kategori: finalKategori }));
    setTimeout(() => setActiveTab('personal'), 300);
  };

  const generateIdSantri = (kategori: string, angkatan: string) => {
    // Format sederhana: [KATEGORI]-[ANGKATAN]-[NOMOR]
    // Contoh: BIN-2024-001, REG-2024-001, MAH-2024-001
    
    if (!kategori || !angkatan) return '';
    
    // Kode kategori
    let kategoriCode = '';
    if (kategori.includes('Binaan')) {
      kategoriCode = 'BIN';
    } else if (kategori.includes('Reguler')) {
      kategoriCode = 'REG';
    } else if (kategori.includes('Mahasantri')) {
      kategoriCode = 'MAH';
    } else {
      kategoriCode = 'SAN';
    }
    
    // Generate nomor urut sederhana
    const nomorUrut = Math.floor(Math.random() * 999) + 1;
    const nomorUrutStr = nomorUrut.toString().padStart(3, '0');
    
    return `${kategoriCode}-${angkatan}-${nomorUrutStr}`;
  };

  const generateInitials = (name: string) => {
    if (!name || name.trim() === '') return 'SA';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        setProfilePhotoUrl(url);
        setSantriData(prev => ({ ...prev, foto_profil: url }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileSelect = (index: number, file: File) => {
    const validation = DokumenHelper.validateFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    const updated = [...dokumenData];
    updated[index] = {
      ...updated[index],
      file: file,
      nama_file: file.name,
    };
    setDokumenData(updated);
  };

  const handleFileRemove = (index: number) => {
    const updated = [...dokumenData];
    updated[index] = {
      ...updated[index],
      file: undefined,
      nama_file: undefined,
    };
    setDokumenData(updated);
  };

  const uploadAllDokumen = async (santriId: string) => {
    const docsToUpload = dokumenData.filter(d => d.file);
    
    for (const dokumen of docsToUpload) {
      if (!dokumen.file) continue;
      
      setUploadingFiles(prev => ({ ...prev, [dokumen.jenis_dokumen]: true }));
      
      const result = await DokumenHelper.uploadDokumen(
        dokumen.file,
        santriId,
        dokumen.jenis_dokumen,
        supabase
      );
      
      setUploadingFiles(prev => ({ ...prev, [dokumen.jenis_dokumen]: false }));
      
      if (!result.success) {
        toast.error(`Gagal upload ${dokumen.jenis_dokumen}: ${result.error}`);
      }
    }
  };

  const isFormValid = () => {
    const basicValid = (
      santriData.kategori &&
      santriData.nama_lengkap.trim() &&
      santriData.tanggal_masuk &&
      santriData.tempat_lahir?.trim() &&
      santriData.tanggal_lahir &&
      santriData.no_whatsapp?.trim() &&
      santriData.alamat?.trim() &&
      waliData.some(w => w.is_utama && w.nama_lengkap.trim())
    );

    // Binaan validation
    if (selectedKategori?.includes('Binaan')) {
      const binaanValid = santriData.status_sosial !== 'Lengkap';
      const waliValid = waliData.every(w => w.pekerjaan && w.penghasilan_bulanan !== undefined);
      
      if (selectedKategori === 'Binaan Mukim') {
        const mukimValid = 
          santriData.anak_ke !== undefined &&
          santriData.jumlah_saudara !== undefined &&
          santriData.hobi?.trim() &&
          santriData.cita_cita?.trim() &&
          waliData.length >= 2 && // Minimal 2 wali
          kondisiKesehatan.golongan_darah &&
          riwayatPendidikan.some(r => r.jenjang && r.nama_sekolah);
        
        return basicValid && binaanValid && waliValid && mukimValid;
      }
      
      return basicValid && binaanValid && waliValid;
    }

    return basicValid;
  };

  const handleSubmit = async () => {
    const isValid = isFormValid();
    console.log('🔍 Form validation result:', {
      isValid,
      selectedKategori,
      kondisiKesehatan,
      golonganDarah: kondisiKesehatan.golongan_darah
    });
    
    if (!isValid) {
      toast.error('Lengkapi semua data yang wajib diisi');
      return;
    }

    // Check required documents
    const requiredDocs = dokumenData.filter(d => d.required);
    const uploadedDocs = dokumenData.filter(d => d.required && d.file);
    
    if (!santriId && uploadedDocs.length < requiredDocs.length) {
      toast.error(`Upload semua dokumen wajib (${uploadedDocs.length}/${requiredDocs.length})`);
      return;
    }

    setIsLoading(true);
    try {
      const nisn = santriData.nisn || ''; // NISN is optional
      const idSantri = santriData.id_santri || generateIdSantri(santriData.kategori, santriData.angkatan);
      
      const santriPayload = {
        ...santriData,
        nisn,
        id_santri: idSantri,
        agama: 'Islam',
        status_approval: santriId ? santriData.status_approval : 'disetujui', // Auto-approval
      };

      let savedSantriId = santriId;

      if (santriId) {
        const { error } = await supabase
          .from('santri')
          .update(santriPayload)
          .eq('id', santriId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('santri')
          .insert([santriPayload])
          .select();
        if (error) throw error;
        savedSantriId = data[0].id;
      }

      // Save wali
      if (santriId) {
        await supabase.from('santri_wali').delete().eq('santri_id', santriId);
      }
      const waliPayload = waliData.map(wali => {
        const { id, ...waliWithoutId } = wali;
        return { ...waliWithoutId, santri_id: savedSantriId };
      });
      const { error: waliError } = await supabase.from('santri_wali').insert(waliPayload);
      if (waliError) throw waliError;

      // Save riwayat pendidikan (if Binaan Mukim)
      if (selectedKategori === 'Binaan Mukim' && riwayatPendidikan.some(r => r.jenjang && r.nama_sekolah)) {
        if (santriId) {
          await supabase.from('riwayat_pendidikan').delete().eq('santri_id', santriId);
        }
        const pendidikanPayload = riwayatPendidikan
          .filter(r => r.jenjang && r.nama_sekolah)
          .map(r => {
            const { id, ...pendidikanWithoutId } = r;
            return { ...pendidikanWithoutId, santri_id: savedSantriId };
          });
        await supabase.from('riwayat_pendidikan').insert(pendidikanPayload);
      }

      // Save kondisi kesehatan (if Binaan Mukim)
      if (selectedKategori === 'Binaan Mukim') {
        console.log('🏥 Saving kesehatan data:', kondisiKesehatan);
        if (santriId) {
          await supabase.from('kondisi_kesehatan').delete().eq('santri_id', santriId);
        }
        const { id, ...kondisiWithoutId } = kondisiKesehatan;
        const { error: kesehatanError } = await supabase.from('kondisi_kesehatan').insert({
          ...kondisiWithoutId,
          santri_id: savedSantriId,
        });
        if (kesehatanError) {
          console.error('❌ Error saving kesehatan:', kesehatanError);
          throw kesehatanError;
        } else {
          console.log('✅ Kesehatan data saved successfully');
        }
      }

      // Upsert enrollment data (simplified)
      try {
        const { data: existingEnroll } = await supabase
          .from('santri_kelas')
          .select('id')
          .eq('santri_id', savedSantriId)
          .limit(1)
          .maybeSingle();

        if (existingEnroll?.id) {
          await supabase
            .from('santri_kelas')
            .update({
              // Simplified - no more rumpun_kelas and nama_kelas updates
            })
            .eq('id', existingEnroll.id);
        } else {
          await supabase
            .from('santri_kelas')
            .insert({
              santri_id: savedSantriId,
              kelas_program: null,
              rombel: null,
              tingkat: 'Dasar',
              tahun_ajaran: '2024/2025',
              semester: 'Ganjil',
              status_kelas: 'Aktif'
            });
        }
      } catch (e) {
        console.warn('⚠️ Enrollment upsert warning:', e);
      }

      // Upload dokumen
      if (dokumenData.some(d => d.file)) {
        await uploadAllDokumen(savedSantriId!);
      }
      
      toast.success(santriId ? 'Data santri berhasil diperbarui' : 'Data santri berhasil disimpan. Menunggu approval admin.');
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving santri:', error);
      toast.error('Gagal menyimpan data: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSantriData = (data: Partial<SantriData>) => {
    setSantriData(prev => ({ ...prev, ...data }));
  };

  const updateKondisiKesehatan = (data: Partial<KondisiKesehatan>) => {
    console.log('🏥 Updating kondisi kesehatan:', data);
    setKondisiKesehatan(prev => {
      const updated = { ...prev, ...data };
      console.log('🏥 Updated kondisi kesehatan:', updated);
      return updated;
    });
  };

  const isBinaan = selectedKategori?.includes('Binaan') || santriData.kategori?.includes('Binaan') || false;
  const isMukim = selectedKategori === 'Binaan Mukim' || santriData.kategori === 'Binaan Mukim';
  const isNonMukim = selectedKategori === 'Binaan Non-Mukim' || santriData.kategori === 'Binaan Non-Mukim';

  const getTabs = () => {
    const tabs = [];
    
    // For edit mode, skip kategori tab and show only relevant tabs
    if (santriId) {
      tabs.push({ id: 'personal', label: 'Personal', icon: User });
      tabs.push({ id: 'wali', label: 'Wali', icon: Users });
      
      if (isMukim) {
        tabs.push(
          { id: 'pendidikan', label: 'Pendidikan', icon: GraduationCap },
          { id: 'kesehatan', label: 'Kesehatan', icon: Activity }
        );
      }
      
      tabs.push({ id: 'dokumen', label: 'Dokumen', icon: FileText });
    } else {
      // For new registration, show kategori first
      tabs.push({ id: 'kategori', label: 'Kategori', icon: Award });
      tabs.push({ id: 'personal', label: 'Personal', icon: User });
      tabs.push({ id: 'wali', label: 'Wali', icon: Users });

      if (isMukim) {
        tabs.push(
          { id: 'pendidikan', label: 'Pendidikan', icon: GraduationCap },
          { id: 'kesehatan', label: 'Kesehatan', icon: Activity }
        );
      }

      tabs.push({ id: 'dokumen', label: 'Dokumen', icon: FileText });
    }
    
    return tabs;
  };

  const canNavigateToTab = (tabId: string) => {
    // For edit mode, all tabs are accessible
    if (santriId) return true;
    
    // For new registration
    if (tabId === 'kategori') return true;
    if (!selectedKategori) return false;
    return true;
  };

  const getProgress = () => {
    const tabs = getTabs();
    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    return ((currentIndex + 1) / tabs.length) * 100;
  };

  const requiredDocs = dokumenData.filter(d => d.required);
  const uploadedRequiredDocs = dokumenData.filter(d => d.required && d.file);

  const tabs = getTabs();

  return (
    <Dialog open={true} onOpenChange={(open) => {
      if (!open && !isLoading) onClose();
    }}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden p-0">
        <VisuallyHidden asChild>
          <DialogTitle>{santriId ? 'Edit Data Santri' : 'Form Pendaftaran Santri'}</DialogTitle>
        </VisuallyHidden>
        
        {loadingData ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Memuat data santri...</p>
            </div>
          </div>
        ) : (
        <div className="bg-gradient-to-br from-slate-50 to-blue-50/30">
          <div className="flex h-[90vh]">
            {/* Sidebar */}
            <aside className="w-80 bg-white/95 backdrop-blur-sm shadow-xl border-r border-slate-200/60 flex-shrink-0 overflow-y-auto">
              <div className="p-6">
                {/* Profile */}
                <div className="flex flex-col items-center text-center mb-6">
                  <Avatar className="w-20 h-20 ring-2 ring-blue-100">
                    <AvatarImage src={getSafeAvatarUrl(profilePhotoUrl)} alt={santriData.nama_lengkap} />
                    <AvatarFallback className="text-lg font-bold bg-gradient-to-br from-slate-600 to-slate-800 text-white">
                      {generateInitials(santriData.nama_lengkap)}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="sm"
                    className="mt-2 h-7 text-xs"
                    variant="outline"
                    onClick={() => document.getElementById('photo-upload')?.click()}
                  >
                    <Camera className="w-3 h-3 mr-1" />
                    Upload Foto
                  </Button>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  <div className="mt-3">
                    <h3 className="text-base font-semibold text-slate-800 truncate max-w-[200px]">
                      {santriData.nama_lengkap || 'Nama Santri'}
                    </h3>
                    <p className="text-xs text-slate-500 truncate max-w-[200px]">
                      {santriData.kategori || 'Pilih Kategori'}
                    </p>
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Progress</span>
                    <span>{Math.round(getProgress())}%</span>
                  </div>
                  <Progress value={getProgress()} className="h-2" />
                </div>

                {/* Navigation - toned down, text-only */}
                <div className="space-y-1">
                  {tabs.map((tab) => (
                    <button 
                      key={tab.id}
                      onClick={() => canNavigateToTab(tab.id) && setActiveTab(tab.id)}
                      disabled={!canNavigateToTab(tab.id)}
                      className={`w-full px-3 py-2 rounded-md text-left transition-colors border ${
                        activeTab === tab.id 
                          ? 'bg-white text-slate-900 border-slate-300 shadow-sm' 
                          : canNavigateToTab(tab.id)
                          ? 'bg-transparent hover:bg-slate-50 text-slate-700 border-transparent'
                          : 'opacity-50 cursor-not-allowed text-slate-400 border-transparent'
                      }`}
                    >
                      <span className="text-sm font-medium">{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Minimal sidebar: remove loud info boxes for cleaner UI */}
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {activeTab === 'kategori' && (
                    <KategoriStep
                      selectedKategori={selectedKategori}
                      selectedSubKategori={selectedSubKategori}
                      onKategoriSelect={handleKategoriSelect}
                      onSubKategoriSelect={handleSubKategoriSelect}
                    />
                  )}

                  {activeTab === 'personal' && (
                    <PersonalStep
                      santriData={santriData}
                      onChange={updateSantriData}
                      isBinaan={isBinaan}
                      isMukim={isMukim}
                    />
                  )}

                  {activeTab === 'wali' && (
                    <WaliStep
                      waliData={waliData}
                      onChange={setWaliData}
                      isBinaan={isBinaan}
                      isMukim={isMukim}
                    />
                  )}

                  {activeTab === 'pendidikan' && isMukim && (
                    <PendidikanStep
                      riwayatPendidikan={riwayatPendidikan}
                      onChange={setRiwayatPendidikan}
                    />
                  )}

                  {activeTab === 'kesehatan' && isMukim && (
                    <KesehatanStep
                      kondisiKesehatan={kondisiKesehatan}
                      onChange={updateKondisiKesehatan}
                    />
                  )}

                  {activeTab === 'dokumen' && (
                    <DokumenStep
                      dokumenData={dokumenData}
                      uploadingFiles={uploadingFiles}
                      onFileSelect={handleFileSelect}
                      onFileRemove={handleFileRemove}
                    />
                  )}
                </div>
              </div>
              
              {/* Footer */}
              <div className="border-t border-slate-200/60 bg-white/95 backdrop-blur-sm px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${isFormValid() ? 'bg-green-500' : 'bg-amber-500'}`} />
                    <div className="text-sm">
                      {isFormValid() ? (
                        <span className="text-green-700 font-medium">✓ Form siap disimpan</span>
                      ) : (
                        <span className="text-amber-700 font-medium">⚠ Lengkapi data wajib</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                      <X className="w-4 h-4 mr-2" />
                      Batal
                    </Button>
                    <Button 
                      onClick={handleSubmit} 
                      disabled={isLoading || !isFormValid()} 
                      className="bg-gradient-to-r from-blue-600 to-blue-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isLoading ? 'Menyimpan...' : 'Simpan Data'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SantriFormWizard;

