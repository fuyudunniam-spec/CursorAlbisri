import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Award,
  Home
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import UploadDokumenSantri from './UploadDokumenSantri';
import { getSafeAvatarUrl } from '@/utils/url.utils';
import { KategoriSantri, StatusSosial, SantriData, WaliData, ProgramData } from '@/types/santri.types';

interface SantriFormEnhancedProps {
  santriId?: string;
  onClose: () => void;
  onSave: () => void;
}

const SantriFormEnhanced: React.FC<SantriFormEnhancedProps> = ({ santriId, onClose, onSave }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('kategori');
  
  // Step 1: Kategori Selection
  const [selectedKategori, setSelectedKategori] = useState<KategoriSantri | ''>('');
  const [selectedSubKategori, setSelectedSubKategori] = useState<'Mukim' | 'Non-Mukim' | ''>('');
  
  // Santri Data
  const [santriData, setSantriData] = useState<SantriData>({
    kategori: '',
    angkatan: '',
    tanggal_masuk: '',
    status_santri: 'Aktif',
    tipe_pembayaran: 'Mandiri',
    status_approval: 'pending',
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

  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>('');
  const [availablePrograms, setAvailablePrograms] = useState<Array<{id: string, nama_program: string, kode_program: string}>>([]);

  useEffect(() => {
    loadAvailablePrograms();
    if (santriId) {
      loadSantriData();
    }
  }, [santriId]);

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

  const loadSantriData = async () => {
    if (!santriId) return;

    setIsLoading(true);
    try {
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
          status_approval: santri.status_approval || 'pending',
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

        setSelectedKategori(santri.kategori);
        if (santri.kategori?.includes('Mukim')) {
          setSelectedSubKategori('Mukim');
        } else if (santri.kategori?.includes('Non-Mukim')) {
          setSelectedSubKategori('Non-Mukim');
        }

        if (santri.foto_profil) {
          setProfilePhotoUrl(santri.foto_profil);
        }
      }

      // Load wali data
      const { data: waliList, error: waliError } = await supabase
        .from('santri_wali')
        .select('*')
        .eq('santri_id', santriId);

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
        setWaliData(mappedWali);
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

  // Auto-set kategori and tipe_pembayaran based on selection
  useEffect(() => {
    if (selectedKategori && !santriId) {
      let finalKategori = selectedKategori;
      let tipePembayaran: 'Mandiri' | 'Bantuan Yayasan' = 'Mandiri';

      // Handle Binaan with sub-kategori
      if (selectedKategori === 'Binaan Mukim' || selectedKategori === 'Binaan Non-Mukim') {
        finalKategori = selectedKategori;
        tipePembayaran = 'Bantuan Yayasan';
      } else if (selectedKategori === 'Reguler' || selectedKategori === 'Mahasiswa') {
        tipePembayaran = 'Mandiri';
      }

      setSantriData(prev => ({
        ...prev,
        kategori: finalKategori,
        tipe_pembayaran: tipePembayaran
      }));
    }
  }, [selectedKategori, selectedSubKategori, santriId]);

  const handleKategoriSelect = (kategori: KategoriSantri) => {
    setSelectedKategori(kategori);
    
    // Auto-advance to next tab for non-Binaan
    if (!kategori.includes('Binaan')) {
      setTimeout(() => setActiveTab('personal'), 300);
    }
  };

  const handleSubKategoriSelect = (subKategori: 'Mukim' | 'Non-Mukim') => {
    setSelectedSubKategori(subKategori);
    const finalKategori = `Binaan ${subKategori}` as KategoriSantri;
    setSelectedKategori(finalKategori);
    
    // Auto-advance to next tab
    setTimeout(() => setActiveTab('personal'), 300);
  };

  const generateNIS = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `NIS${year}${month}${random}`;
  };

  const generateInitials = (name: string) => {
    if (!name || name.trim() === '') return 'SA';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
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
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Gagal mengupload foto');
    }
  };

  const isFormValid = () => {
    return (
      santriData.kategori &&
      santriData.nama_lengkap.trim() &&
      santriData.tanggal_masuk &&
      santriData.tempat_lahir?.trim() &&
      santriData.tanggal_lahir &&
      santriData.jenis_kelamin &&
      santriData.no_whatsapp?.trim() &&
      santriData.alamat?.trim() &&
      waliData.some(w => w.is_utama && w.nama_lengkap.trim())
    );
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      toast.error('Lengkapi semua data yang wajib diisi');
      return;
    }

    setIsLoading(true);
    try {
      const nisn = santriData.nisn || '';
      
      const santriPayload = {
        ...santriData,
        nisn: nisn,
        agama: 'Islam',
        status_approval: santriId ? santriData.status_approval : 'pending', // New santri = pending
      };

      let savedSantriId = santriId;

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

      // Save wali data
      if (waliData.length > 0 && savedSantriId) {
        if (santriId) {
          await supabase
            .from('santri_wali')
            .delete()
            .eq('santri_id', santriId);
        }

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
      
      const message = santriId 
        ? 'Data santri berhasil diperbarui' 
        : 'Data santri berhasil disimpan. Menunggu approval admin.';
      
      toast.success(message);
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving santri:', error);
      toast.error('Gagal menyimpan data santri');
    } finally {
      setIsLoading(false);
    }
  };

  // Show different fields based on kategori
  const showBinaanFields = selectedKategori?.includes('Binaan');
  const showMukimFields = selectedKategori?.includes('Mukim');

  return (
    <Dialog open={true} onOpenChange={(open) => {
      if (!open && !isLoading) {
        onClose();
      }
    }}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden p-0">
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
                    onClick={() => setActiveTab('kategori')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === 'kategori' 
                        ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                        : 'hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Award className="w-4 h-4" /> 
                    <span className="text-sm font-medium">Kategori</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('personal')}
                    disabled={!selectedKategori}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === 'personal' 
                        ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                        : 'hover:bg-slate-50 text-slate-600'
                    } ${!selectedKategori ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <User className="w-4 h-4" /> 
                    <span className="text-sm font-medium">Personal</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('wali')}
                    disabled={!selectedKategori}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === 'wali' 
                        ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                        : 'hover:bg-slate-50 text-slate-600'
                    } ${!selectedKategori ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Users className="w-4 h-4" /> 
                    <span className="text-sm">Wali</span>
                  </button>
                  {santriId && (
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
                  )}
                </div>

                {/* Info Box */}
                {selectedKategori && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                      <div className="text-xs text-blue-800">
                        <p className="font-semibold mb-1">Kategori Terpilih:</p>
                        <p>{selectedKategori}</p>
                        <p className="mt-2">
                          {selectedKategori.includes('Binaan') 
                            ? '✓ Otomatis mendapat bantuan yayasan' 
                            : 'Bayar mandiri sesuai program'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* Kategori Tab */}
                  {activeTab === 'kategori' && (
                    <Card className="rounded-xl shadow-sm border border-slate-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Award className="w-5 h-5 text-blue-600" />
                          Pilih Kategori Santri
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Pilih kategori santri terlebih dahulu. Kategori akan menentukan skema biaya dan dokumen yang diperlukan.
                          </AlertDescription>
                        </Alert>

                        {/* Kategori Selection */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Binaan */}
                          <Card 
                            className={`cursor-pointer transition-all hover:shadow-lg ${
                              selectedKategori?.includes('Binaan') 
                                ? 'ring-2 ring-green-500 bg-green-50' 
                                : 'hover:border-green-300'
                            }`}
                            onClick={() => handleKategoriSelect('Binaan Mukim')}
                          >
                            <CardContent className="p-6">
                              <div className="flex items-start gap-4">
                                <div className="p-3 bg-green-100 rounded-lg">
                                  <Heart className="w-6 h-6 text-green-600" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-semibold text-lg mb-1">Binaan</h3>
                                  <p className="text-sm text-muted-foreground mb-3">
                                    Santri yang mendapat bantuan yayasan penuh
                                  </p>
                                  <Badge className="bg-green-100 text-green-800">Bantuan Yayasan</Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Reguler */}
                          <Card 
                            className={`cursor-pointer transition-all hover:shadow-lg ${
                              selectedKategori === 'Reguler' 
                                ? 'ring-2 ring-blue-500 bg-blue-50' 
                                : 'hover:border-blue-300'
                            }`}
                            onClick={() => handleKategoriSelect('Reguler')}
                          >
                            <CardContent className="p-6">
                              <div className="flex items-start gap-4">
                                <div className="p-3 bg-blue-100 rounded-lg">
                                  <User className="w-6 h-6 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-semibold text-lg mb-1">Reguler</h3>
                                  <p className="text-sm text-muted-foreground mb-3">
                                    Santri dengan pembayaran mandiri
                                  </p>
                                  <Badge className="bg-blue-100 text-blue-800">Bayar Mandiri</Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Mahasiswa */}
                          <Card 
                            className={`cursor-pointer transition-all hover:shadow-lg ${
                              selectedKategori === 'Mahasiswa' 
                                ? 'ring-2 ring-purple-500 bg-purple-50' 
                                : 'hover:border-purple-300'
                            }`}
                            onClick={() => handleKategoriSelect('Mahasiswa')}
                          >
                            <CardContent className="p-6">
                              <div className="flex items-start gap-4">
                                <div className="p-3 bg-purple-100 rounded-lg">
                                  <GraduationCap className="w-6 h-6 text-purple-600" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-semibold text-lg mb-1">Mahasiswa</h3>
                                  <p className="text-sm text-muted-foreground mb-3">
                                    Mahasiswa dengan program khusus
                                  </p>
                                  <Badge className="bg-purple-100 text-purple-800">Bayar Mandiri</Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Sub-Kategori for Binaan */}
                        {selectedKategori?.includes('Binaan') && (
                          <div className="pt-4 border-t">
                            <Label className="text-base font-semibold mb-3 block">Pilih Jenis Binaan:</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Card 
                                className={`cursor-pointer transition-all hover:shadow-lg ${
                                  selectedSubKategori === 'Mukim' 
                                    ? 'ring-2 ring-emerald-500 bg-emerald-50' 
                                    : 'hover:border-emerald-300'
                                }`}
                                onClick={() => handleSubKategoriSelect('Mukim')}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-center gap-3">
                                    <Home className="w-5 h-5 text-emerald-600" />
                                    <div>
                                      <h4 className="font-semibold">Mukim (Asrama)</h4>
                                      <p className="text-xs text-muted-foreground">Tinggal di pondok</p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>

                              <Card 
                                className={`cursor-pointer transition-all hover:shadow-lg ${
                                  selectedSubKategori === 'Non-Mukim' 
                                    ? 'ring-2 ring-teal-500 bg-teal-50' 
                                    : 'hover:border-teal-300'
                                }`}
                                onClick={() => handleSubKategoriSelect('Non-Mukim')}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-center gap-3">
                                    <Users className="w-5 h-5 text-teal-600" />
                                    <div>
                                      <h4 className="font-semibold">Non-Mukim (Pulang)</h4>
                                      <p className="text-xs text-muted-foreground">Pulang ke rumah</p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Personal Tab - Same as before but with conditional fields */}
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

                        {/* Status Sosial - Only for Binaan */}
                        {showBinaanFields && (
                          <div className="pt-4 border-t">
                            <Label className="text-sm font-medium text-slate-700 mb-2 block">Status Sosial *</Label>
                            <Select 
                              value={santriData.status_sosial}
                              onValueChange={(value: StatusSosial) => setSantriData({ ...santriData, status_sosial: value })}
                            >
                              <SelectTrigger className="border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                                <SelectValue placeholder="Pilih status sosial" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Yatim">Yatim (Ayah Meninggal)</SelectItem>
                                <SelectItem value="Piatu">Piatu (Ibu Meninggal)</SelectItem>
                                <SelectItem value="Yatim Piatu">Yatim Piatu (Kedua Orang Tua Meninggal)</SelectItem>
                                <SelectItem value="Dhuafa">Dhuafa (Kurang Mampu)</SelectItem>
                                <SelectItem value="Lengkap">Lengkap</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Administrative Data */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
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
                            <Label className="text-sm font-medium text-slate-700">Angkatan</Label>
                            <Input 
                              value={santriData.angkatan}
                              readOnly
                              className="border-slate-300 bg-slate-50 text-slate-700"
                              placeholder="Auto dari tanggal masuk"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Wali Tab - Same as before */}
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
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Dokumen Tab - Only for editing */}
                  {activeTab === 'dokumen' && santriId && (
                    <Card className="rounded-xl shadow-sm border border-slate-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileText className="w-5 h-5 text-blue-600" />
                          Dokumen Santri
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <UploadDokumenSantri 
                          santriId={santriId}
                          kategori={santriData.kategori}
                          statusSosial={santriData.status_sosial}
                          onUploadComplete={() => {
                            toast.success('Dokumen berhasil diupload');
                          }}
                        />
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
                    <div className={`w-3 h-3 rounded-full ${isFormValid() ? 'bg-green-500' : 'bg-amber-500'}`} />
                    <div className="text-sm">
                      {isFormValid() ? (
                        <span className="text-green-700 font-medium">✓ Form siap disimpan</span>
                      ) : (
                        <span className="text-amber-700 font-medium">
                          ⚠ Lengkapi data wajib
                        </span>
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
                      disabled={isLoading || !isFormValid()}
                      className={`${isFormValid() 
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

export default SantriFormEnhanced;

