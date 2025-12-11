import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Search, 
  DollarSign,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle,
  Calendar,
  CreditCard,
  FileText,
  TrendingUp,
  Users,
  Clock,
  Filter,
  X,
  Download,
  Eye
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { TagihanService, type TagihanSantri, type PembayaranSantri } from '@/services/tagihan.service';
import { supabase } from '@/integrations/supabase/client';
import RiwayatPembayaran from '@/components/tagihan/RiwayatPembayaran';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DonaturOption {
  id: string;
  donor_name: string;
  kategori_donasi?: string;
  status_setoran?: string;
}

const TagihanSantri: React.FC = () => {
  const [tagihanList, setTagihanList] = useState<TagihanSantri[]>([]);
  const [santriList, setSantriList] = useState<any[]>([]);
  const [donaturList, setDonaturList] = useState<DonaturOption[]>([]);
  const [selectedTagihan, setSelectedTagihan] = useState<TagihanSantri | null>(null);
  const [selectedSantriIds, setSelectedSantriIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPeriode, setFilterPeriode] = useState<string>('all');
  const [filterKategori, setFilterKategori] = useState<string>('all');
  const [filterTahunAjaran, setFilterTahunAjaran] = useState<string>('all');
  
  // Dialog states
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('tagihan');
  const [filterTagihanId, setFilterTagihanId] = useState<string | undefined>(undefined);
  
  // Tahun ajaran list
  const [tahunAjaranList, setTahunAjaranList] = useState<string[]>([]);
  
  // Filter untuk dialog generate tagihan
  const [searchSantriDialog, setSearchSantriDialog] = useState<string>('');
  const [filterKategoriDialog, setFilterKategoriDialog] = useState<string>('all');
  
  // Form states
  const [generateForm, setGenerateForm] = useState({
    periode: '',
    bulan: '',
    tahun_ajaran: '',
    tipe_penagihan: 'bulanan' as 'bulanan' | 'semester',
    semester: '',
  });

  interface KomponenTagihanForm {
    id: string;
    nama: string;
    jenis_pendidikan: 'formal' | 'pesantren';
    nominal: number;
  }

  const [komponenList, setKomponenList] = useState<KomponenTagihanForm[]>([]);
  
  const [paymentForm, setPaymentForm] = useState<Partial<PembayaranSantri> & { alokasi_ke?: 'otomatis' | 'formal' | 'pesantren' }>({
    jumlah_bayar: 0,
    tanggal_bayar: new Date().toISOString().split('T')[0],
    metode_pembayaran: 'Tunai',
    catatan: '',
    sumber_pembayaran: 'orang_tua',
    donatur_id: '',
    alokasi_ke: 'otomatis',
  });
  
  // Stats
  const [stats, setStats] = useState({
    total_tagihan: 0,
    total_dibayar: 0,
    total_sisa: 0,
    belum_bayar: 0,
    dibayar_sebagian: 0,
    lunas: 0,
    terlambat: 0,
  });

  useEffect(() => {
    loadData();
    loadDonaturOptions();
    loadTahunAjaran();
  }, []);

  const loadTahunAjaran = async () => {
    try {
      // Ambil dari master tahun ajaran di modul akademik
      const { data, error } = await supabase
        .from('akademik_tahun_ajaran')
        .select('nama, status, is_aktif, tanggal_mulai, tanggal_selesai')
        .eq('status', 'Aktif')
        .order('tanggal_mulai', { ascending: false }); // Urutkan dari yang terbaru

      if (error) throw error;

      // Extract nama tahun ajaran (sudah diurutkan dari query berdasarkan tanggal_mulai descending)
      const uniqueTahunAjaran = (data || [])
        .map(item => item.nama)
        .filter((nama): nama is string => !!nama);

      setTahunAjaranList(uniqueTahunAjaran);

      // Set default tahun ajaran ke yang aktif (yang pertama dalam list, karena sudah diurutkan dari terbaru)
      if (uniqueTahunAjaran.length > 0) {
        setGenerateForm(prev => {
          // Hanya update jika belum ada atau kosong
          if (!prev.tahun_ajaran) {
            return { ...prev, tahun_ajaran: uniqueTahunAjaran[0] };
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('Error loading tahun ajaran:', error);
      // Fallback to default
      const fallback = ['2024/2025', '2023/2024'];
      setTahunAjaranList(fallback);
      setGenerateForm(prev => {
        if (!prev.tahun_ajaran) {
          return { ...prev, tahun_ajaran: fallback[0] };
        }
        return prev;
      });
    }
  };

  useEffect(() => {
    // Reset donatur_id when sumber_pembayaran changes
    if (paymentForm.sumber_pembayaran !== 'donatur') {
      setPaymentForm(prev => ({ ...prev, donatur_id: '' }));
    }
  }, [paymentForm.sumber_pembayaran]);

  // Prefill komponen dan set tipe penagihan saat dialog dibuka atau santri dipilih
  useEffect(() => {
    if (showGenerateDialog && selectedSantriIds.length > 0) {
      // Auto-detect kategori dan set tipe penagihan
      const firstSantri = santriList.find(s => selectedSantriIds.includes(s.id));
      if (firstSantri?.kategori === 'Mahasiswa' || firstSantri?.kategori === 'Mahasantri') {
        setGenerateForm(prev => ({ ...prev, tipe_penagihan: 'semester' }));
      } else {
        setGenerateForm(prev => ({ ...prev, tipe_penagihan: 'bulanan' }));
      }
      
      if (komponenList.length === 0) {
        prefillKomponenByKategori();
      }
    } else if (!showGenerateDialog) {
      // Reset komponen saat dialog ditutup
      setKomponenList([]);
      setSearchSantriDialog('');
      setFilterKategoriDialog('all');
    }
  }, [showGenerateDialog, selectedSantriIds]);

  const prefillKomponenByKategori = async () => {
    if (selectedSantriIds.length === 0) {
      setKomponenList([]);
      return;
    }

    // Ambil kategori santri yang dipilih (ambil kategori pertama sebagai referensi)
    const firstSantri = santriList.find(s => selectedSantriIds.includes(s.id));
    if (!firstSantri) return;

    const kategori = firstSantri.kategori;
    const newKomponen: KomponenTagihanForm[] = [];

    // Prefill berdasarkan kategori
    if (kategori === 'Reguler') {
      // Reguler biasanya hanya pesantren
      newKomponen.push(
        { id: `komponen-${Date.now()}-1`, nama: 'SPP Pesantren', jenis_pendidikan: 'pesantren', nominal: 300000 },
        { id: `komponen-${Date.now()}-2`, nama: 'Buku', jenis_pendidikan: 'pesantren', nominal: 100000 }
      );
    } else if (kategori === 'Binaan Mukim') {
      // Binaan Mukim: formal + pesantren
      newKomponen.push(
        { id: `komponen-${Date.now()}-1`, nama: 'SPP Sekolah Formal', jenis_pendidikan: 'formal', nominal: 0 },
        { id: `komponen-${Date.now()}-2`, nama: 'Buku Sekolah', jenis_pendidikan: 'formal', nominal: 0 },
        { id: `komponen-${Date.now()}-3`, nama: 'SPP Pesantren', jenis_pendidikan: 'pesantren', nominal: 0 },
        { id: `komponen-${Date.now()}-4`, nama: 'Buku Pesantren', jenis_pendidikan: 'pesantren', nominal: 0 }
      );
    } else if (kategori === 'Binaan Non-Mukim') {
      // Binaan Non-Mukim: biasanya hanya pesantren
      newKomponen.push(
        { id: `komponen-${Date.now()}-1`, nama: 'SPP Pesantren', jenis_pendidikan: 'pesantren', nominal: 0 },
        { id: `komponen-${Date.now()}-2`, nama: 'Buku', jenis_pendidikan: 'pesantren', nominal: 0 }
      );
    } else if (kategori === 'Mahasiswa' || kategori === 'Mahasantri') {
      // Mahasiswa/Mahasantri: bisa formal atau pesantren tergantung program
      newKomponen.push(
        { id: `komponen-${Date.now()}-1`, nama: 'SPP', jenis_pendidikan: 'pesantren', nominal: 0 }
      );
    } else {
      // Default: pesantren
      newKomponen.push(
        { id: `komponen-${Date.now()}-1`, nama: 'SPP Pesantren', jenis_pendidikan: 'pesantren', nominal: 0 }
      );
    }

    setKomponenList(newKomponen);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [tagihanData, santriData, statsData] = await Promise.all([
        TagihanService.getTagihan(),
        TagihanService.getSantriForTagihan(),
        TagihanService.getTagihanStats(),
      ]);
      
      setTagihanList(tagihanData);
      setSantriList(santriData);
      setStats(statsData);
    } catch (error: any) {
      toast.error('Gagal memuat data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDonaturOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('donations')
        .select('id, donor_name, kategori_donasi, status_setoran')
        .eq('kategori_donasi', 'Orang Tua Asuh Pendidikan')
        .eq('status_setoran', 'Sudah disetor')
        .order('donor_name');

      if (error) throw error;
      setDonaturList(data || []);
    } catch (error) {
      console.error('Error loading donatur options:', error);
      // Don't show error toast, just log it
    }
  };

  const handleGenerateTagihan = async () => {
    if (selectedSantriIds.length === 0) {
      toast.error('Pilih minimal 1 santri');
      return;
    }

    if (!generateForm.tahun_ajaran) {
      toast.error('Tahun ajaran harus diisi');
      return;
    }

    if (generateForm.tipe_penagihan === 'bulanan') {
    if (!generateForm.periode || !generateForm.bulan) {
        toast.error('Periode dan bulan harus diisi untuk penagihan bulanan');
        return;
      }
    } else {
      if (!generateForm.semester) {
        toast.error('Semester harus diisi untuk penagihan per semester');
        return;
      }
    }

    if (komponenList.length === 0) {
      toast.error('Tambahkan minimal 1 komponen tagihan');
      return;
    }

    // Validasi komponen
    const invalidKomponen = komponenList.find(k => !k.nama || k.nominal <= 0);
    if (invalidKomponen) {
      toast.error('Semua komponen harus memiliki nama dan nominal > 0');
      return;
    }

    try {
      // Hitung total per jenis pendidikan
      const totalTagihanFormal = komponenList
        .filter(k => k.jenis_pendidikan === 'formal')
        .reduce((sum, k) => sum + (k.nominal || 0), 0);
      
      const totalTagihanPesantren = komponenList
        .filter(k => k.jenis_pendidikan === 'pesantren')
        .reduce((sum, k) => sum + (k.nominal || 0), 0);

      const totalTagihan = totalTagihanFormal + totalTagihanPesantren;

      // Tentukan periode berdasarkan tipe penagihan
      let periodeValue = '';
      if (generateForm.tipe_penagihan === 'bulanan') {
        // Format YYYY-MM
        periodeValue = generateForm.periode;
      } else {
        // Format kode semester: 2024S1 atau 2024S2
        const tahun = generateForm.tahun_ajaran.split('/')[0]; // Ambil tahun awal
        const semesterCode = generateForm.semester === 'Ganjil' ? 'S1' : 'S2';
        periodeValue = `${tahun}${semesterCode}`;
      }

      const generateData: any = {
        santri_ids: selectedSantriIds,
        periode: periodeValue,
        bulan: generateForm.tipe_penagihan === 'bulanan' ? generateForm.bulan : generateForm.semester,
        tahun_ajaran: generateForm.tahun_ajaran,
        komponen_tagihan: komponenList.map(k => ({
          nama: k.nama,
          jenis_pendidikan: k.jenis_pendidikan,
          nominal: k.nominal
        })),
        total_tagihan: totalTagihan,
        total_tagihan_formal: totalTagihanFormal,
        total_tagihan_pesantren: totalTagihanPesantren,
      };

      await TagihanService.generateTagihan(generateData);

      toast.success(`Tagihan berhasil dibuat untuk ${selectedSantriIds.length} santri`);
      setShowGenerateDialog(false);
      setSelectedSantriIds([]);
      setKomponenList([]);
      setSearchSantriDialog('');
      setFilterKategoriDialog('all');
      setGenerateForm({
        periode: '',
        bulan: '',
        tahun_ajaran: tahunAjaranList[0] || '',
        tipe_penagihan: 'bulanan',
        semester: '',
      });
      loadData();
    } catch (error: any) {
      toast.error('Gagal generate tagihan: ' + error.message);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedTagihan || !paymentForm.jumlah_bayar) {
      toast.error('Jumlah bayar harus diisi');
      return;
    }

    if (!paymentForm.sumber_pembayaran) {
      toast.error('Sumber pembayaran wajib dipilih');
      return;
    }

    if (paymentForm.sumber_pembayaran === 'donatur' && !paymentForm.donatur_id) {
      toast.error('Pilih donatur/kampanye jika sumber pembayaran adalah donatur');
      return;
    }

    try {
      await TagihanService.recordPayment({
        tagihan_id: selectedTagihan.id,
        santri_id: selectedTagihan.santri_id,
        jumlah_bayar: paymentForm.jumlah_bayar,
        tanggal_bayar: paymentForm.tanggal_bayar!,
        metode_pembayaran: paymentForm.metode_pembayaran!,
        // nomor_referensi akan di-generate otomatis oleh trigger
        catatan: paymentForm.catatan,
        sumber_pembayaran: paymentForm.sumber_pembayaran,
        donatur_id: paymentForm.sumber_pembayaran === 'donatur' ? paymentForm.donatur_id : undefined,
        alokasi_ke: paymentForm.alokasi_ke || 'otomatis',
      });

      toast.success('Pembayaran berhasil dicatat');
      setShowPaymentDialog(false);
      setPaymentForm({
        jumlah_bayar: 0,
        tanggal_bayar: new Date().toISOString().split('T')[0],
        metode_pembayaran: 'Tunai',
        catatan: '',
        sumber_pembayaran: 'orang_tua',
        donatur_id: '',
        alokasi_ke: 'otomatis',
      });
      loadData();
    } catch (error: any) {
      toast.error('Gagal catat pembayaran: ' + error.message);
    }
  };

  const handleDeleteTagihan = async (id: string) => {
    if (!confirm('Hapus tagihan ini?')) return;

    try {
      await TagihanService.deleteTagihan(id);
      toast.success('Tagihan berhasil dihapus');
      loadData();
    } catch (error: any) {
      toast.error('Gagal hapus tagihan: ' + error.message);
    }
  };

  const toggleSelectSantri = (santriId: string) => {
    setSelectedSantriIds(prev => 
      prev.includes(santriId)
        ? prev.filter(id => id !== santriId)
        : [...prev, santriId]
    );
  };

  const filteredTagihan = tagihanList.filter(tagihan => {
    const matchSearch = tagihan.santri?.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       tagihan.santri?.id_santri?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       tagihan.santri?.nisn?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'all' || tagihan.status === filterStatus;
    const matchPeriode = filterPeriode === 'all' || tagihan.periode === filterPeriode;
    const matchKategori = filterKategori === 'all' || tagihan.santri?.kategori === filterKategori;
    const matchTahunAjaran = filterTahunAjaran === 'all' || tagihan.tahun_ajaran === filterTahunAjaran;
    
    return matchSearch && matchStatus && matchPeriode && matchKategori && matchTahunAjaran;
  });

  const uniquePeriodes = Array.from(new Set(tagihanList.map(t => t.periode))).sort().reverse();

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'belum_bayar': 'bg-gray-100 text-gray-800 border-gray-200',
      'dibayar_sebagian': 'bg-blue-100 text-blue-800 border-blue-200',
      'lunas': 'bg-green-100 text-green-800 border-green-200',
      'terlambat': 'bg-red-100 text-red-800 border-red-200',
    };
    const labels: Record<string, string> = {
      'belum_bayar': 'Belum Bayar',
      'dibayar_sebagian': 'Dibayar Sebagian',
      'lunas': 'Lunas',
      'terlambat': 'Terlambat',
    };
    return (
      <Badge className={colors[status] || 'bg-gray-100 text-gray-800 border-gray-200'}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header Section with Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manajemen Tagihan & Pembayaran</h2>
          <p className="text-sm text-gray-500 mt-1">Kelola tagihan dan pembayaran santri dengan mudah</p>
        </div>
        <Button 
          onClick={() => setShowGenerateDialog(true)}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/25"
          size="lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          Generate Tagihan
        </Button>
      </div>

      {/* Tabs for Tagihan and Riwayat Pembayaran */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="tagihan">Tagihan</TabsTrigger>
          <TabsTrigger value="riwayat">Riwayat Pembayaran</TabsTrigger>
        </TabsList>

        <TabsContent value="tagihan" className="space-y-6">

      {/* Modern Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tagihan */}
        <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 group bg-gradient-to-br from-blue-50 to-blue-100/50">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/20 rounded-full -mr-16 -mt-16 group-hover:bg-blue-200/30 transition-colors" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-xs font-medium text-gray-600 uppercase tracking-wide">Total Tagihan</CardTitle>
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-gray-900 mb-1">{formatRupiah(stats.total_tagihan)}</div>
            <p className="text-xs text-gray-500">Semua periode</p>
          </CardContent>
        </Card>

        {/* Total Dibayar */}
        <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 group bg-gradient-to-br from-emerald-50 to-emerald-100/50">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-200/20 rounded-full -mr-16 -mt-16 group-hover:bg-emerald-200/30 transition-colors" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-xs font-medium text-gray-600 uppercase tracking-wide">Total Dibayar</CardTitle>
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-emerald-700 mb-1">{formatRupiah(stats.total_dibayar)}</div>
            <p className="text-xs text-gray-500">Sudah dibayar</p>
          </CardContent>
        </Card>

        {/* Sisa Tagihan */}
        <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 group bg-gradient-to-br from-amber-50 to-amber-100/50">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200/20 rounded-full -mr-16 -mt-16 group-hover:bg-amber-200/30 transition-colors" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-xs font-medium text-gray-600 uppercase tracking-wide">Sisa Tagihan</CardTitle>
            <div className="p-2 bg-amber-500/10 rounded-lg">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-amber-700 mb-1">{formatRupiah(stats.total_sisa)}</div>
            <p className="text-xs text-gray-500">Belum lunas</p>
          </CardContent>
        </Card>

        {/* Status Lunas */}
        <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 group bg-gradient-to-br from-green-50 to-green-100/50">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-200/20 rounded-full -mr-16 -mt-16 group-hover:bg-green-200/30 transition-colors" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-xs font-medium text-gray-600 uppercase tracking-wide">Tagihan Lunas</CardTitle>
            <div className="p-2 bg-green-500/10 rounded-lg">
            <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold text-green-700 mb-1">{stats.lunas}</div>
            <p className="text-xs text-gray-500">Tagihan lunas</p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Filters */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <CardTitle className="text-sm font-semibold text-gray-700">Filter & Pencarian</CardTitle>
            </div>
            {(searchTerm || filterStatus !== 'all' || filterPeriode !== 'all' || filterKategori !== 'all' || filterTahunAjaran !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                  setFilterPeriode('all');
                  setFilterKategori('all');
                  setFilterTahunAjaran('all');
                }}
                className="h-7 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Reset
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Cari nama santri atau NISN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            <Select value={filterPeriode} onValueChange={setFilterPeriode}>
              <SelectTrigger className="w-full sm:w-[200px] border-gray-200">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <SelectValue placeholder="Semua Periode" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Periode</SelectItem>
                {uniquePeriodes.map(periode => (
                  <SelectItem key={periode} value={periode}>{periode}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[200px] border-gray-200">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="belum_bayar">Belum Bayar</SelectItem>
                <SelectItem value="dibayar_sebagian">Dibayar Sebagian</SelectItem>
                <SelectItem value="lunas">Lunas</SelectItem>
                <SelectItem value="terlambat">Terlambat</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterKategori} onValueChange={setFilterKategori}>
              <SelectTrigger className="w-full sm:w-[200px] border-gray-200">
                <SelectValue placeholder="Semua Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                <SelectItem value="Reguler">Reguler</SelectItem>
                <SelectItem value="Binaan Mukim">Binaan Mukim</SelectItem>
                <SelectItem value="Binaan Non-Mukim">Binaan Non-Mukim</SelectItem>
                <SelectItem value="Mahasiswa">Mahasiswa</SelectItem>
                <SelectItem value="Mahasantri">Mahasantri</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterTahunAjaran} onValueChange={setFilterTahunAjaran}>
              <SelectTrigger className="w-full sm:w-[200px] border-gray-200">
                <SelectValue placeholder="Semua Tahun Ajaran" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tahun Ajaran</SelectItem>
                {tahunAjaranList.map(tahun => (
                  <SelectItem key={tahun} value={tahun}>{tahun}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Tagihan List */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">Daftar Tagihan</CardTitle>
              <CardDescription className="mt-1.5 text-sm">
                Menampilkan <span className="font-semibold text-gray-700">{filteredTagihan.length}</span> dari <span className="font-semibold text-gray-700">{tagihanList.length}</span> tagihan
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-3 border-blue-600 border-t-transparent"></div>
              <p className="mt-4 text-sm text-gray-500">Memuat data tagihan...</p>
            </div>
          ) : filteredTagihan.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Tidak ada tagihan</h3>
              <p className="text-sm text-gray-500 mb-6">
                {searchTerm || filterStatus !== 'all' || filterPeriode !== 'all' || filterKategori !== 'all'
                  ? 'Coba ubah filter untuk melihat hasil lain' 
                  : 'Mulai dengan membuat tagihan baru untuk santri'}
              </p>
              {(!searchTerm && filterStatus === 'all' && filterPeriode === 'all' && filterKategori === 'all') && (
                <Button onClick={() => setShowGenerateDialog(true)} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Generate Tagihan Pertama
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                    <TableHead className="font-semibold text-gray-700">Santri</TableHead>
                    <TableHead className="font-semibold text-gray-700">Kategori</TableHead>
                    <TableHead className="font-semibold text-gray-700">Periode</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-right">Total Tagihan</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-right">Dibayar</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-right">Sisa</TableHead>
                    <TableHead className="font-semibold text-gray-700">Status</TableHead>
                    <TableHead className="font-semibold text-gray-700 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTagihan.map((tagihan) => (
                    <TableRow key={tagihan.id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell>
                        <div>
                          <div className="font-semibold text-gray-900">{tagihan.santri?.nama_lengkap || '-'}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{tagihan.santri?.id_santri || tagihan.santri?.nisn || '-'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className={
                            tagihan.santri?.kategori === 'Reguler' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                            tagihan.santri?.kategori === 'Binaan Mukim' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                            tagihan.santri?.kategori === 'Binaan Non-Mukim' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                            tagihan.santri?.kategori === 'Mahasiswa' ? 'bg-green-100 text-green-700 border-green-200' :
                            'bg-gray-100 text-gray-700 border-gray-200'
                          }
                        >
                          {tagihan.santri?.kategori || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900">{tagihan.bulan}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{tagihan.periode}</div>
                          </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-semibold text-gray-900">{formatRupiah(tagihan.total_tagihan)}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium text-emerald-600">{formatRupiah(tagihan.total_bayar || 0)}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium text-amber-600">{formatRupiah(tagihan.sisa_tagihan)}</div>
                      </TableCell>
                      <TableCell>{getStatusBadge(tagihan.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setFilterTagihanId(tagihan.id);
                              setActiveTab('riwayat');
                            }}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Lihat riwayat pembayaran"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {tagihan.status !== 'lunas' && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                setSelectedTagihan(tagihan);
                                setPaymentForm({
                                  jumlah_bayar: tagihan.sisa_tagihan,
                                  tanggal_bayar: new Date().toISOString().split('T')[0],
                                  metode_pembayaran: 'Tunai',
                                  catatan: '',
                                  sumber_pembayaran: 'orang_tua',
                                  donatur_id: '',
                                  alokasi_ke: 'otomatis',
                                });
                                setShowPaymentDialog(true);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                              Bayar
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTagihan(tagihan.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Generate Tagihan Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b border-gray-100">
            <DialogTitle className="text-xl font-semibold text-gray-900">Generate Tagihan Bulanan</DialogTitle>
            <DialogDescription className="text-sm text-gray-500 mt-2">
              Pilih santri dan isi detail tagihan untuk periode tertentu
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-6">
            {/* Santri Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-gray-700">Pilih Santri</Label>
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                  {selectedSantriIds.length} dipilih
                </Badge>
              </div>
              
              {/* Search & Filter Santri */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Cari nama santri atau NIS..."
                    value={searchSantriDialog}
                    onChange={(e) => setSearchSantriDialog(e.target.value)}
                    className="pl-10 border-gray-200 focus:border-blue-500"
                  />
                </div>
                <Select value={filterKategoriDialog} onValueChange={setFilterKategoriDialog}>
                  <SelectTrigger className="w-full sm:w-[180px] border-gray-200">
                    <SelectValue placeholder="Semua Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kategori</SelectItem>
                    <SelectItem value="Reguler">Reguler</SelectItem>
                    <SelectItem value="Binaan Mukim">Binaan Mukim</SelectItem>
                    <SelectItem value="Binaan Non-Mukim">Binaan Non-Mukim</SelectItem>
                    <SelectItem value="Mahasiswa">Mahasiswa</SelectItem>
                    <SelectItem value="Mahasantri">Mahasantri</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto bg-gray-50/50">
                {santriList.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    Tidak ada santri tersedia
                  </div>
                ) : (
                  <div className="space-y-2">
                    {santriList
                      .filter(santri => {
                        // Filter by search
                        const matchSearch = !searchSantriDialog || 
                          santri.nama_lengkap?.toLowerCase().includes(searchSantriDialog.toLowerCase()) ||
                          santri.id_santri?.toLowerCase().includes(searchSantriDialog.toLowerCase()) ||
                          santri.nisn?.toLowerCase().includes(searchSantriDialog.toLowerCase()) ||
                          santri.id_santri?.toLowerCase().includes(searchSantriDialog.toLowerCase()) ||
                          santri.nisn?.toLowerCase().includes(searchSantriDialog.toLowerCase());
                        
                        // Filter by kategori
                        const matchKategori = filterKategoriDialog === 'all' || 
                          santri.kategori === filterKategoriDialog;
                        
                        return matchSearch && matchKategori;
                      })
                      .map((santri) => {
                        const isNonMandiri = santri.tipe_pembayaran && 
                          (santri.tipe_pembayaran === 'Subsidi Penuh' || 
                           santri.tipe_pembayaran === 'Bantuan Yayasan' ||
                           santri.tipe_pembayaran === 'Subsidi Sebagian');
                        
                        return (
                        <div 
                          key={santri.id} 
                          className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                            selectedSantriIds.includes(santri.id) 
                              ? 'bg-blue-50 border border-blue-200' 
                              : 'hover:bg-gray-100'
                          } ${isNonMandiri ? 'opacity-90' : ''}`}
                        >
                    <Checkbox
                      checked={selectedSantriIds.includes(santri.id)}
                      onCheckedChange={() => toggleSelectSantri(santri.id)}
                    />
                    <div className="flex-1">
                            <div className="font-medium text-gray-900">{santri.nama_lengkap}</div>
                            <div className="text-xs text-gray-500">
                              {santri.id_santri || santri.nisn || '-'} - {santri.kategori}
                              {santri.tipe_pembayaran && (
                                <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                                  santri.tipe_pembayaran === 'Mandiri' || santri.tipe_pembayaran === 'Bayar Sendiri'
                                    ? 'bg-blue-100 text-blue-700'
                                    : santri.tipe_pembayaran === 'Subsidi Penuh' || santri.tipe_pembayaran === 'Bantuan Yayasan'
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {santri.tipe_pembayaran === 'Mandiri' || santri.tipe_pembayaran === 'Bayar Sendiri' 
                                    ? 'Mandiri' 
                                    : santri.tipe_pembayaran === 'Subsidi Penuh' || santri.tipe_pembayaran === 'Bantuan Yayasan'
                                    ? 'Ditanggung Yayasan'
                                    : santri.tipe_pembayaran}
                                </span>
                              )}
                    </div>
                            {isNonMandiri && (
                              <div className="text-xs text-amber-600 mt-0.5 italic">
                                Tagihan manual/bantuan - tidak auto-generate
                  </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Tahun Ajaran & Tipe Penagihan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Tahun Ajaran *</Label>
                <Select
                  value={generateForm.tahun_ajaran}
                  onValueChange={(value) => setGenerateForm({ ...generateForm, tahun_ajaran: value })}
                >
                  <SelectTrigger className="border-gray-200 focus:border-blue-500">
                    <SelectValue placeholder="Pilih tahun ajaran" />
                  </SelectTrigger>
                  <SelectContent>
                    {tahunAjaranList.length === 0 ? (
                      <SelectItem value="" disabled>Memuat tahun ajaran...</SelectItem>
                    ) : (
                      tahunAjaranList.map(tahun => (
                        <SelectItem key={tahun} value={tahun}>{tahun}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Tipe Penagihan *</Label>
                <Select
                  value={generateForm.tipe_penagihan}
                  onValueChange={(value) => {
                    const isMahasiswa = selectedSantriIds.length > 0 && 
                      santriList.find(s => selectedSantriIds.includes(s.id))?.kategori === 'Mahasiswa';
                    setGenerateForm({ 
                      ...generateForm, 
                      tipe_penagihan: value as 'bulanan' | 'semester',
                      periode: '',
                      bulan: '',
                      semester: ''
                    });
                  }}
                  disabled={selectedSantriIds.length > 0 && 
                    (santriList.find(s => selectedSantriIds.includes(s.id))?.kategori === 'Mahasiswa' ||
                     santriList.find(s => selectedSantriIds.includes(s.id))?.kategori === 'Mahasantri')}
                >
                  <SelectTrigger className="border-gray-200 focus:border-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bulanan">Bulanan</SelectItem>
                    <SelectItem value="semester">Per Semester</SelectItem>
                  </SelectContent>
                </Select>
                {selectedSantriIds.length > 0 && 
                  (santriList.find(s => selectedSantriIds.includes(s.id))?.kategori === 'Mahasiswa' ||
                   santriList.find(s => selectedSantriIds.includes(s.id))?.kategori === 'Mahasantri') && (
                  <p className="text-xs text-gray-500 mt-1">
                    Kategori Mahasiswa/Mahasantri menggunakan penagihan per semester
                  </p>
                )}
              </div>
            </div>

            {/* Periode & Tanggal - Conditional based on tipe_penagihan */}
            {generateForm.tipe_penagihan === 'bulanan' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Periode (YYYY-MM) *</Label>
                <Input
                  type="month"
                  value={generateForm.periode}
                    onChange={(e) => {
                      const monthValue = e.target.value;
                      const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                      const monthIndex = parseInt(monthValue.split('-')[1]) - 1;
                      setGenerateForm({ 
                        ...generateForm, 
                        periode: monthValue,
                        bulan: monthNames[monthIndex]
                      });
                    }}
                    className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Bulan *</Label>
                <Select
                  value={generateForm.bulan}
                  onValueChange={(value) => setGenerateForm({ ...generateForm, bulan: value })}
                >
                    <SelectTrigger className="border-gray-200 focus:border-blue-500">
                    <SelectValue placeholder="Pilih bulan" />
                  </SelectTrigger>
                  <SelectContent>
                    {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map(bulan => (
                      <SelectItem key={bulan} value={bulan}>{bulan}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Semester *</Label>
                  <Select
                    value={generateForm.semester}
                    onValueChange={(value) => setGenerateForm({ ...generateForm, semester: value })}
                  >
                    <SelectTrigger className="border-gray-200 focus:border-blue-500">
                      <SelectValue placeholder="Pilih semester" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ganjil">Ganjil</SelectItem>
                      <SelectItem value="Genap">Genap</SelectItem>
                    </SelectContent>
                  </Select>
              </div>
              </div>
            )}

            {/* Komponen Tagihan Dinamis */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-gray-700">Komponen Tagihan</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newId = `komponen-${Date.now()}`;
                    setKomponenList([...komponenList, { id: newId, nama: '', jenis_pendidikan: 'pesantren', nominal: 0 }]);
                  }}
                  className="border-gray-200"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Tambah Komponen
                </Button>
            </div>

              {komponenList.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg">
                  Belum ada komponen. Klik "Tambah Komponen" untuk menambah.
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50">
                        <TableHead className="w-[35%]">Nama Komponen</TableHead>
                        <TableHead className="w-[30%]">Jenis Pendidikan</TableHead>
                        <TableHead className="w-[25%]">Nominal</TableHead>
                        <TableHead className="w-[10%] text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {komponenList.map((komponen, index) => (
                        <TableRow key={komponen.id}>
                          <TableCell>
                  <Input
                              type="text"
                              value={komponen.nama}
                              onChange={(e) => {
                                const updated = [...komponenList];
                                updated[index].nama = e.target.value;
                                setKomponenList(updated);
                              }}
                              placeholder="Nama komponen"
                              className="border-gray-200 focus:border-blue-500"
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={komponen.jenis_pendidikan}
                              onValueChange={(value) => {
                                const updated = [...komponenList];
                                updated[index].jenis_pendidikan = value as 'formal' | 'pesantren';
                                setKomponenList(updated);
                              }}
                            >
                              <SelectTrigger className="border-gray-200 focus:border-blue-500">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="formal">Formal</SelectItem>
                                <SelectItem value="pesantren">Pesantren</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                  <Input
                    type="number"
                              value={komponen.nominal || ''}
                              onChange={(e) => {
                                const updated = [...komponenList];
                                updated[index].nominal = parseFloat(e.target.value) || 0;
                                setKomponenList(updated);
                              }}
                              placeholder="0"
                              className="border-gray-200 focus:border-blue-500"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setKomponenList(komponenList.filter((_, i) => i !== index));
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Summary */}
              <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">Total Formal:</span>
                    <span className="font-semibold text-blue-700">
                      {formatRupiah(
                        komponenList
                          .filter(k => k.jenis_pendidikan === 'formal')
                          .reduce((sum, k) => sum + (k.nominal || 0), 0)
                      )}
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">Total Pesantren:</span>
                    <span className="font-semibold text-indigo-700">
                    {formatRupiah(
                        komponenList
                          .filter(k => k.jenis_pendidikan === 'pesantren')
                          .reduce((sum, k) => sum + (k.nominal || 0), 0)
                    )}
                  </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                    <span className="font-semibold text-gray-700">Total Tagihan:</span>
                    <span className="text-xl font-bold text-blue-700">
                      {formatRupiah(
                        komponenList.reduce((sum, k) => sum + (k.nominal || 0), 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-gray-100 pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowGenerateDialog(false);
                setKomponenList([]);
                setSearchSantriDialog('');
                setFilterKategoriDialog('all');
                setGenerateForm({
                  periode: '',
                  bulan: '',
                  tahun_ajaran: tahunAjaranList[0] || '',
                  tipe_penagihan: 'bulanan',
                  semester: '',
                });
              }}
              className="border-gray-200"
            >
              Batal
            </Button>
            <Button 
              onClick={handleGenerateTagihan}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Generate Tagihan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enhanced Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="pb-4 border-b border-gray-100 flex-shrink-0">
            <DialogTitle className="text-xl font-semibold text-gray-900">Catat Pembayaran</DialogTitle>
            <DialogDescription className="text-sm text-gray-500 mt-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="font-medium text-gray-700">{selectedTagihan?.santri?.nama_lengkap}</span>
                <span className="text-gray-400">•</span>
                <span>{selectedTagihan?.bulan} {selectedTagihan?.periode}</span>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-6 overflow-y-auto flex-1">
            {/* Summary Alert - Sisa Tagihan */}
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Sisa Tagihan Total:</span>
                    <span className="font-bold text-lg">{formatRupiah(selectedTagihan?.sisa_tagihan || 0)}</span>
                  </div>
                  {(selectedTagihan?.sisa_tagihan_formal !== undefined || selectedTagihan?.sisa_tagihan_pesantren !== undefined) && (
                    <div className="pt-2 border-t border-blue-200 space-y-1">
                      {selectedTagihan?.sisa_tagihan_formal !== undefined && selectedTagihan.sisa_tagihan_formal > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-blue-700">Sisa Formal:</span>
                          <span className="font-semibold">{formatRupiah(selectedTagihan.sisa_tagihan_formal)}</span>
                        </div>
                      )}
                      {selectedTagihan?.sisa_tagihan_pesantren !== undefined && selectedTagihan.sisa_tagihan_pesantren > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-blue-700">Sisa Pesantren:</span>
                          <span className="font-semibold">{formatRupiah(selectedTagihan.sisa_tagihan_pesantren)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>

            {/* Form Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Jumlah Bayar *</Label>
              <Input
                type="number"
                value={paymentForm.jumlah_bayar}
                onChange={(e) => setPaymentForm({ ...paymentForm, jumlah_bayar: parseFloat(e.target.value) })}
                  className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="0"
              />
            </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Tanggal Bayar *</Label>
              <Input
                type="date"
                value={paymentForm.tanggal_bayar}
                onChange={(e) => setPaymentForm({ ...paymentForm, tanggal_bayar: e.target.value })}
                  className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Metode Pembayaran *</Label>
              <Select
                value={paymentForm.metode_pembayaran}
                onValueChange={(value) => setPaymentForm({ ...paymentForm, metode_pembayaran: value })}
              >
                  <SelectTrigger className="border-gray-200 focus:border-blue-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tunai">Tunai</SelectItem>
                  <SelectItem value="Transfer Bank">Transfer Bank</SelectItem>
                  <SelectItem value="E-Wallet">E-Wallet</SelectItem>
                  <SelectItem value="Lainnya">Lainnya</SelectItem>
                </SelectContent>
              </Select>
              </div>
            </div>

            {/* Alokasi Pembayaran Section */}
            <div className="space-y-4 pt-2 border-t border-gray-100">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Dialokasikan ke *</Label>
                <Select
                  value={paymentForm.alokasi_ke || 'otomatis'}
                  onValueChange={(value) => setPaymentForm({ ...paymentForm, alokasi_ke: value as 'otomatis' | 'formal' | 'pesantren' })}
                  disabled={
                    (selectedTagihan?.sisa_tagihan_formal === 0 || selectedTagihan?.sisa_tagihan_formal === undefined) && 
                    (selectedTagihan?.sisa_tagihan_pesantren === 0 || selectedTagihan?.sisa_tagihan_pesantren === undefined)
                  }
                >
                  <SelectTrigger className="border-gray-200 focus:border-blue-500">
                    <SelectValue placeholder="Pilih alokasi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="otomatis">Otomatis</SelectItem>
                    {selectedTagihan?.sisa_tagihan_formal !== undefined && selectedTagihan.sisa_tagihan_formal > 0 && (
                      <SelectItem value="formal">Tagihan Pendidikan Formal</SelectItem>
                    )}
                    {selectedTagihan?.sisa_tagihan_pesantren !== undefined && selectedTagihan.sisa_tagihan_pesantren > 0 && (
                      <SelectItem value="pesantren">Tagihan Pendidikan Pesantren</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {(!selectedTagihan?.sisa_tagihan_formal || selectedTagihan.sisa_tagihan_formal === 0) && 
                   (!selectedTagihan?.sisa_tagihan_pesantren || selectedTagihan.sisa_tagihan_pesantren === 0)
                    ? 'Tagihan sudah lunas'
                    : (!selectedTagihan?.sisa_tagihan_formal || selectedTagihan.sisa_tagihan_formal === 0)
                    ? 'Hanya tersedia alokasi ke Pesantren'
                    : (!selectedTagihan?.sisa_tagihan_pesantren || selectedTagihan.sisa_tagihan_pesantren === 0)
                    ? 'Hanya tersedia alokasi ke Formal'
                    : 'Pilih alokasi pembayaran atau gunakan Otomatis'}
                </p>
              </div>
            </div>

            {/* Sumber Pembayaran Section */}
            <div className="space-y-4 pt-2 border-t border-gray-100">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Sumber Pembayaran *</Label>
                <Select
                  value={paymentForm.sumber_pembayaran}
                  onValueChange={(value) => setPaymentForm({ ...paymentForm, sumber_pembayaran: value as 'orang_tua' | 'donatur' | 'yayasan' })}
                >
                  <SelectTrigger className="border-gray-200 focus:border-blue-500">
                    <SelectValue placeholder="Pilih sumber pembayaran" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="orang_tua">Orang Tua / Wali</SelectItem>
                    <SelectItem value="donatur">Orang Tua Asuh Pendidikan</SelectItem>
                    <SelectItem value="yayasan">Yayasan / Subsidi Internal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentForm.sumber_pembayaran === 'donatur' && (
                <div className="space-y-2 animate-in slide-in-from-top-2">
                  <Label className="text-sm font-medium text-gray-700">Pilih Orang Tua Asuh Pendidikan / Kampanye *</Label>
                  <Select
                    value={paymentForm.donatur_id}
                    onValueChange={(value) => setPaymentForm({ ...paymentForm, donatur_id: value })}
                  >
                    <SelectTrigger className="border-gray-200 focus:border-blue-500">
                      <SelectValue placeholder="Pilih orang tua asuh pendidikan/kampanye" />
                    </SelectTrigger>
                    <SelectContent>
                      {donaturList.length === 0 ? (
                        <SelectItem value="" disabled>Tidak ada orang tua asuh pendidikan tersedia</SelectItem>
                      ) : (
                        donaturList.map(donatur => (
                          <SelectItem key={donatur.id} value={donatur.id}>
                            {donatur.donor_name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Catatan</Label>
              <Textarea
                value={paymentForm.catatan}
                onChange={(e) => setPaymentForm({ ...paymentForm, catatan: e.target.value })}
                  placeholder="Catatan tambahan untuk pembayaran ini..."
                rows={3}
                  className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              />
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-gray-100 pt-4">
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)} className="border-gray-200">
              Batal
            </Button>
            <Button 
              onClick={handleRecordPayment}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Catat Pembayaran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </TabsContent>

        <TabsContent value="riwayat" className="space-y-6">
          <RiwayatPembayaran 
            tagihanId={filterTagihanId} 
            santriIds={selectedSantriIds.length > 0 ? selectedSantriIds : undefined}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TagihanSantri;

