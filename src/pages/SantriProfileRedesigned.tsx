import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ArrowLeft, 
  User, 
  Users, 
  GraduationCap, 
  FileText, 
  Calendar, 
  Phone, 
  MapPin,
  Edit, 
  DollarSign,
  CheckCircle,
  AlertTriangle,
  XCircle,
  BookOpen,
  Activity,
  Shield,
  Loader2,
  Plus,
  Eye,
  TrendingUp,
  Award,
  HeartHandshake,
  Building2,
  Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatRupiah } from "@/utils/inventaris.utils";
import { getSafeAvatarUrl } from '@/utils/url.utils';
import { calculateAge } from '@/lib/utils';
import { toast } from 'sonner';
import { TagihanService, TagihanSantri, PembayaranSantri } from '@/services/tagihan.service';
import { SetoranHarianService } from '@/services/setoranHarian.service';
import { cn } from "@/lib/utils";
import DokumenSantriTab from "@/components/DokumenSantriTab";
import { Progress } from "@/components/ui/progress";

interface SantriData {
  id: string;
  id_santri?: string;
  nama_lengkap: string;
  tempat_lahir?: string;
  tanggal_lahir?: string;
  jenis_kelamin?: string;
  kategori?: string;
  status_santri?: string;
  tipe_pembayaran?: string;
  angkatan?: string;
  tanggal_masuk?: string;
  foto_profil?: string;
  no_whatsapp?: string;
  alamat?: string;
  nisn?: string;
}

interface ProgramAktif {
  id: string;
  nama_kelas: string;
  program: string;
  rombel?: string;
  tingkat?: string;
  tahun_ajaran?: string;
  semester?: string;
  ustadz?: string;
}

interface FinancialSummary {
  total_spp?: number;
  total_dibayar?: number;
  sisa_spp?: number;
  total_spp_pesantren?: number;
  total_dibayar_pesantren?: number;
  sisa_spp_pesantren?: number;
  total_spp_formal?: number;
  total_dibayar_formal?: number;
  sisa_spp_formal?: number;
  total_bantuan_yayasan?: number;
}

interface PaymentHistory {
  tanggal: string;
  periode: string;
  jenis: string;
  nominal: number;
  sumber: string;
  keterangan?: string;
  donatur_name?: string;
}

const SantriProfileRedesigned = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const santriId = searchParams.get("santriId") || undefined;
  const santriName = searchParams.get("santriName") || undefined;

  const [activeTab, setActiveTab] = useState("ringkasan");
  const [loading, setLoading] = useState(true);
  const [santri, setSantri] = useState<SantriData | null>(null);
  const [waliData, setWaliData] = useState<any[]>([]);
  const [programAktif, setProgramAktif] = useState<ProgramAktif[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>({});
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [tagihanList, setTagihanList] = useState<TagihanSantri[]>([]);
  const [hafalanProgress, setHafalanProgress] = useState<{
    juz: number;
    progress: number;
    changeThisMonth: number;
  }>({ juz: 0, progress: 0, changeThisMonth: 0 });
  const [kehadiranProgress, setKehadiranProgress] = useState<{
    persentase: number;
    hadir: number;
    total: number;
  }>({ persentase: 0, hadir: 0, total: 0 });

  // Load all data
  useEffect(() => {
    if (!santriId) return;
    
    const loadData = async () => {
      setLoading(true);
      try {
        // Load santri data
        const { data: santriData, error: santriError } = await supabase
          .from('santri')
          .select('*')
          .eq('id', santriId)
          .single();

        if (santriError) throw santriError;
        setSantri(santriData);

        // Load wali data
        const { data: wali, error: waliError } = await supabase
          .from('santri_wali')
          .select('*')
          .eq('santri_id', santriId)
          .order('is_utama', { ascending: false });

        if (!waliError) setWaliData(wali || []);

        // Load program aktif (kelas_anggota)
        const { data: kelasAnggota, error: kelasError } = await supabase
          .from('kelas_anggota')
          .select(`
            id,
            status,
            kelas:kelas_id(
              id,
              nama_kelas,
              program,
              rombel,
              tingkat,
              tahun_ajaran,
              semester
            )
          `)
          .eq('santri_id', santriId)
          .eq('status', 'Aktif');

        if (!kelasError && kelasAnggota) {
          const programs = kelasAnggota.map((ka: any) => ({
            id: ka.id,
            nama_kelas: ka.kelas?.nama_kelas || '-',
            program: ka.kelas?.program || '-',
            rombel: ka.kelas?.rombel,
            tingkat: ka.kelas?.tingkat,
            tahun_ajaran: ka.kelas?.tahun_ajaran,
            semester: ka.kelas?.semester,
          }));
          setProgramAktif(programs);
        }

        // Load financial data
        await loadFinancialData(santriId, santriData);

        // Load hafalan and kehadiran data
        await loadHafalanData(santriId);
        await loadKehadiranData(santriId);

      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Gagal memuat data santri');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [santriId]);

  const loadHafalanData = async (id: string) => {
    try {
      const now = new Date();
      const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      // Get setoran hafalan bulan ini
      const { data: setoranThisMonth } = await supabase
        .from('setoran_harian')
        .select('juz, ayat_awal, ayat_akhir')
        .eq('santri_id', id)
        .eq('status', 'Sudah Setor')
        .eq('jenis_setoran', 'Menambah')
        .gte('tanggal_setor', firstDayThisMonth.toISOString().split('T')[0])
        .lte('tanggal_setor', now.toISOString().split('T')[0]);

      // Get setoran hafalan bulan lalu
      const { data: setoranLastMonth } = await supabase
        .from('setoran_harian')
        .select('juz, ayat_awal, ayat_akhir')
        .eq('santri_id', id)
        .eq('status', 'Sudah Setor')
        .eq('jenis_setoran', 'Menambah')
        .gte('tanggal_setor', firstDayLastMonth.toISOString().split('T')[0])
        .lte('tanggal_setor', lastDayLastMonth.toISOString().split('T')[0]);

      // Calculate progress
      let maxJuz = 0;
      let totalAyatThisMonth = 0;
      let totalAyatLastMonth = 0;

      setoranThisMonth?.forEach(s => {
        if (s.juz && s.juz > maxJuz) maxJuz = s.juz;
        if (s.ayat_awal && s.ayat_akhir) {
          totalAyatThisMonth += (s.ayat_akhir - s.ayat_awal + 1);
        }
      });

      setoranLastMonth?.forEach(s => {
        if (s.ayat_awal && s.ayat_akhir) {
          totalAyatLastMonth += (s.ayat_akhir - s.ayat_awal + 1);
        }
      });

      // Progress per juz (30 juz total, ~286 ayat per juz rata-rata)
      const progress = maxJuz > 0 ? (maxJuz / 30) * 100 : 0;
      const changeThisMonth = totalAyatThisMonth - totalAyatLastMonth;

      setHafalanProgress({
        juz: maxJuz,
        progress: Math.min(progress, 100),
        changeThisMonth: changeThisMonth
      });
    } catch (error) {
      console.error('Error loading hafalan data:', error);
    }
  };

  const loadKehadiranData = async (id: string) => {
    try {
      const now = new Date();
      const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get kehadiran dari setoran_harian (status Hadir atau Sudah Setor)
      const { data: setoranData } = await supabase
        .from('setoran_harian')
        .select('status, tanggal_setor')
        .eq('santri_id', id)
        .gte('tanggal_setor', firstDayThisMonth.toISOString().split('T')[0])
        .lte('tanggal_setor', now.toISOString().split('T')[0]);

      const hadir = setoranData?.filter(s => 
        s.status === 'Hadir' || s.status === 'Sudah Setor'
      ).length || 0;
      const total = setoranData?.length || 0;
      const persentase = total > 0 ? (hadir / total) * 100 : 0;

      setKehadiranProgress({
        persentase: Math.round(persentase),
        hadir,
        total
      });
    } catch (error) {
      console.error('Error loading kehadiran data:', error);
    }
  };

  const loadFinancialData = async (id: string, santri: any) => {
    try {
      // Load tagihan
      const tagihan = await TagihanService.getTagihan({ santri_id: id });
      setTagihanList(tagihan);

      // Calculate summary based on kategori
      const isBinaanMukim = santri?.kategori?.includes('Binaan Mukim') || 
                           santri?.kategori === 'Santri Binaan Mukim';
      const isReguler = santri?.kategori === 'Reguler' || 
                       santri?.kategori === 'Mahasantri Reguler' ||
                       santri?.kategori === 'Mahasiswa';

      if (isBinaanMukim) {
        // Binaan Mukim: SPP Pesantren + Pendidikan Formal
        let totalPesantren = 0;
        let dibayarPesantren = 0;
        let totalFormal = 0;
        let dibayarFormal = 0;
        let totalBantuan = 0;

        for (const t of tagihan) {
          if (t.total_tagihan_pesantren) {
            totalPesantren += Number(t.total_tagihan_pesantren);
            dibayarPesantren += Number(t.total_bayar_pesantren || 0);
          }
          if (t.total_tagihan_formal) {
            totalFormal += Number(t.total_tagihan_formal);
            dibayarFormal += Number(t.total_bayar_formal || 0);
          }
          // Check for yayasan payments
          try {
            const payments = await TagihanService.getPaymentHistory(t.id);
            payments.forEach((p: PembayaranSantri) => {
              if (p.sumber_pembayaran === 'yayasan') {
                totalBantuan += Number(p.jumlah_bayar || 0);
              }
            });
          } catch (err) {
            console.error('Error loading payment history for tagihan:', t.id, err);
          }
        }

        setFinancialSummary({
          total_spp_pesantren: totalPesantren,
          total_dibayar_pesantren: dibayarPesantren,
          sisa_spp_pesantren: totalPesantren - dibayarPesantren,
          total_spp_formal: totalFormal,
          total_dibayar_formal: dibayarFormal,
          sisa_spp_formal: totalFormal - dibayarFormal,
          total_bantuan_yayasan: totalBantuan,
        });
      } else if (isReguler || tagihan.length > 0) {
        // Reguler/Mahasiswa: Total SPP atau semua kategori lainnya
        let total = 0;
        let dibayar = 0;

        for (const t of tagihan) {
          total += Number(t.total_tagihan || 0);
          dibayar += Number(t.total_bayar || 0);
        }

        setFinancialSummary({
          total_spp: total,
          total_dibayar: dibayar,
          sisa_spp: total - dibayar,
        });
      }

      // Load payment history
      const allPayments: PaymentHistory[] = [];
      for (const t of tagihan) {
        try {
          const payments = await TagihanService.getPaymentHistory(t.id);
          payments.forEach((p: PembayaranSantri) => {
            const jenis = Array.isArray(t.komponen_tagihan) && t.komponen_tagihan.length > 0
              ? t.komponen_tagihan[0].nama 
              : 'SPP';
            const sumberLabel = 
              p.sumber_pembayaran === 'orang_tua' ? 'Orang Tua' :
              p.sumber_pembayaran === 'donatur' ? 'Donatur' :
              p.sumber_pembayaran === 'yayasan' ? 'Yayasan' : 'Lainnya';

            allPayments.push({
              tanggal: p.tanggal_bayar,
              periode: `${t.bulan || ''} ${t.periode ? t.periode.split('-')[0] : ''}`.trim(),
              jenis: jenis,
              nominal: Number(p.jumlah_bayar || 0),
              sumber: sumberLabel,
              keterangan: p.catatan,
              donatur_name: p.donatur?.donor_name,
            });
          });
        } catch (err) {
          console.error('Error loading payment history for tagihan:', t.id, err);
        }
      }

      setPaymentHistory(allPayments.sort((a, b) => 
        new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
      ));

    } catch (error) {
      console.error('Error loading financial data:', error);
      toast.error('Gagal memuat data keuangan');
    }
  };

  // Get status badge color
  const getStatusColor = (status?: string) => {
    if (status === 'Aktif') return 'bg-green-100 text-green-800 border-green-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getKategoriColor = (kategori?: string) => {
    if (kategori?.includes('Binaan Mukim')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (kategori?.includes('Binaan Non-Mukim')) return 'bg-green-100 text-green-800 border-green-200';
    if (kategori?.includes('Reguler')) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (kategori?.includes('Mahasiswa')) return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Get wali utama
  const waliUtama = waliData.find(w => w.is_utama) || waliData[0];

  if (!santriId) {
    return (
      <div className="p-4 lg:p-6">
        <Card className="border-red-500">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="text-xl font-bold text-red-600">ID Santri Tidak Ditemukan</div>
              <Button onClick={() => navigate('/santri')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Kembali ke Data Santri
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Memuat data santri...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-background border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Avatar */}
            <Avatar className="w-16 h-16 lg:w-20 lg:h-20 border-2 border-primary/20">
              <AvatarImage 
                src={getSafeAvatarUrl(santri?.foto_profil)} 
                alt={santri?.nama_lengkap || santriName || "Santri"} 
              />
              <AvatarFallback className="text-lg lg:text-xl">
                {(santri?.nama_lengkap || santriName || 'S').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0,2)}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h1 className="text-xl lg:text-2xl font-bold truncate">
                  {santri?.nama_lengkap || santriName || 'Memuat...'}
                </h1>
                {santri?.tanggal_lahir && (
                  <span className="text-sm text-muted-foreground">
                    ({calculateAge(santri.tanggal_lahir)} tahun)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={cn("text-xs", getStatusColor(santri?.status_santri))}>
                  {santri?.status_santri || 'Tidak Diketahui'}
                </Badge>
                {santri?.kategori && (
                  <Badge className={cn("text-xs", getKategoriColor(santri.kategori))}>
                    {santri.kategori}
                  </Badge>
                )}
              </div>
            </div>

            {/* Quick Info */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              {santri?.id_santri && (
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>ID: {santri.id_santri}</span>
                </div>
              )}
              {santri?.tanggal_masuk && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Bergabung: {new Date(santri.tanggal_masuk).getFullYear()}</span>
                </div>
              )}
              {waliUtama?.no_whatsapp && (
                <div className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  <span>{waliUtama.no_whatsapp}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/santri')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Kembali</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.location.href = `/santri?edit=${santriId}`}>
                <Edit className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Tab Navigation - Responsive dengan horizontal scroll di mobile */}
          <div className="overflow-x-auto mb-6">
            <TabsList className="inline-flex w-full lg:w-auto min-w-full lg:min-w-0">
              <TabsTrigger value="ringkasan" className="flex-shrink-0">
                <Activity className="w-4 h-4 mr-2" />
                Ringkasan
              </TabsTrigger>
              <TabsTrigger value="informasi" className="flex-shrink-0">
                <User className="w-4 h-4 mr-2" />
                Informasi Pribadi
              </TabsTrigger>
              <TabsTrigger value="akademik" className="flex-shrink-0">
                <GraduationCap className="w-4 h-4 mr-2" />
                Akademik
              </TabsTrigger>
              <TabsTrigger value="keuangan" className="flex-shrink-0">
                <DollarSign className="w-4 h-4 mr-2" />
                Laporan Keuangan
              </TabsTrigger>
              <TabsTrigger value="monitoring" className="flex-shrink-0">
                <Shield className="w-4 h-4 mr-2" />
                Monitoring
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Content */}
          <TabsContent value="ringkasan" className="space-y-6">
            {/* 4 Kartu Progres Utama - Desain Minimalis & Elegan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Progres Hafalan Qur'an */}
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Progres Hafalan Qur'an
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {hafalanProgress.juz > 0 ? (
                    <>
                      <div className="flex items-baseline gap-2">
                        <div className="text-4xl font-bold text-foreground">
                          {hafalanProgress.juz}
                        </div>
                        <div className="text-sm text-muted-foreground">/ 30 Juz</div>
                      </div>
                      <Progress value={hafalanProgress.progress} className="h-2" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {hafalanProgress.progress.toFixed(0)}% selesai
                        </span>
                        {hafalanProgress.changeThisMonth !== 0 && (
                          <span className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded",
                            hafalanProgress.changeThisMonth > 0 
                              ? "bg-primary/10 text-primary" 
                              : "bg-muted text-muted-foreground"
                          )}>
                            {hafalanProgress.changeThisMonth > 0 ? '+' : ''}
                            {hafalanProgress.changeThisMonth} ayat bulan ini
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <BookOpen className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                      <p className="text-sm text-muted-foreground">
                        Belum ada data hafalan
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 2. Kehadiran */}
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Kehadiran
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {kehadiranProgress.total > 0 ? (
                    <>
                      <div className="flex items-baseline gap-2">
                        <div className="text-4xl font-bold text-foreground">
                          {kehadiranProgress.persentase}%
                        </div>
                        <div className="text-sm text-muted-foreground">bulan ini</div>
                      </div>
                      <Progress 
                        value={kehadiranProgress.persentase} 
                        className="h-2"
                      />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {kehadiranProgress.hadir} dari {kehadiranProgress.total} pertemuan
                        </span>
                        <Badge 
                          variant="secondary"
                          className={cn(
                            "text-xs",
                            kehadiranProgress.persentase >= 80 
                              ? "bg-primary/10 text-primary" 
                              : kehadiranProgress.persentase >= 60
                              ? "bg-secondary/20 text-secondary-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {kehadiranProgress.persentase >= 80 
                            ? "Sangat Baik" 
                            : kehadiranProgress.persentase >= 60
                            ? "Baik"
                            : "Perlu Perhatian"}
                        </Badge>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                      <p className="text-sm text-muted-foreground">
                        Belum ada data kehadiran bulan ini
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 3. Ringkasan Keuangan Pendidikan */}
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Ringkasan Keuangan Pendidikan
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {santri?.kategori?.includes('Binaan') ? (
                    <>
                      <div className="text-3xl font-bold text-foreground">
                        {financialSummary.total_bantuan_yayasan 
                          ? formatRupiah(financialSummary.total_bantuan_yayasan) 
                          : 'Rp 0'}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Total bantuan yang diterima untuk pendidikan
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        Ditanggung Yayasan
                      </Badge>
                    </>
                  ) : (
                    <>
                      <div className="text-3xl font-bold text-foreground">
                        {financialSummary.sisa_spp 
                          ? formatRupiah(financialSummary.sisa_spp) 
                          : 'Rp 0'}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {(financialSummary.sisa_spp || 0) === 0 
                          ? "Semua tagihan sudah lunas" 
                          : "Sisa tagihan yang perlu dibayar"}
                      </p>
                      <Badge 
                        variant={(financialSummary.sisa_spp || 0) === 0 ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {(financialSummary.sisa_spp || 0) === 0 ? 'Lunas' : 'Ada Tagihan'}
                      </Badge>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* 4. Status Perilaku/Pengasuhan */}
              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Status Perilaku & Pengasuhan
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-6">
                    <Activity className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                    <p className="text-sm text-muted-foreground">
                      Fitur ini sedang dalam pengembangan
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 opacity-70">
                      Akan menampilkan tracking poin kedisiplinan dan catatan pengasuhan
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Kartu Status Tambahan - Desain Minimalis */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
              {/* Status Akademik */}
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <GraduationCap className="w-4 h-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Program Aktif</p>
                  </div>
                  <div className="text-2xl font-bold">{programAktif.length}</div>
                </CardContent>
              </Card>

              {/* Status Dokumen */}
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Dokumen</p>
                  </div>
                  <div className="text-2xl font-bold">-</div>
                </CardContent>
              </Card>

              {/* Kontak Wali */}
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Kontak Wali</p>
                  </div>
                  <div className="text-lg font-semibold truncate">
                    {waliUtama ? waliUtama.nama_lengkap?.split(' ')[0] || '-' : '-'}
                  </div>
                </CardContent>
              </Card>

              {/* Kategori */}
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-4 h-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Kategori</p>
                  </div>
                  <div className="text-sm font-semibold truncate">
                    {santri?.kategori || '-'}
                  </div>
                </CardContent>
              </Card>

              {/* Angkatan */}
              <Card className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Angkatan</p>
                  </div>
                  <div className="text-2xl font-bold">
                    {santri?.angkatan || '-'}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab Informasi Pribadi */}
          <TabsContent value="informasi" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Informasi Pribadi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Nama Lengkap</label>
                      <p className="text-sm font-medium">{santri?.nama_lengkap || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">ID Santri</label>
                      <p className="text-sm">{santri?.id_santri || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Tempat, Tanggal Lahir</label>
                      <p className="text-sm">
                        {santri?.tempat_lahir || '-'}, {santri?.tanggal_lahir ? formatDate(santri.tanggal_lahir) : '-'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Jenis Kelamin</label>
                      <p className="text-sm">{santri?.jenis_kelamin || '-'}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Alamat</label>
                    <p className="text-sm">{santri?.alamat || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Nomor WhatsApp</label>
                    <p className="text-sm flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {santri?.no_whatsapp || '-'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Administrative Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Data Administrasi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Kategori Santri</label>
                      <p className="text-sm">{santri?.kategori || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Angkatan</label>
                      <p className="text-sm">{santri?.angkatan || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Tanggal Masuk</label>
                      <p className="text-sm">{santri?.tanggal_masuk ? formatDate(santri.tanggal_masuk) : '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status Santri</label>
                      <Badge className={getStatusColor(santri?.status_santri)}>
                        {santri?.status_santri || '-'}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Tipe Pembayaran</label>
                      <p className="text-sm">{santri?.tipe_pembayaran || '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Wali Information */}
              {waliData.length > 0 && (
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Data Wali
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {waliData.map((wali, index) => (
                        <div key={index} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium">
                              {wali.is_utama ? 'Wali Utama' : `Wali ${index + 1}`}
                            </h4>
                            {wali.is_utama && (
                              <Badge variant="default" className="text-xs">Utama</Badge>
                            )}
                          </div>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="font-medium">Nama:</span> {wali.nama_lengkap}
                            </div>
                            <div>
                              <span className="font-medium">Hubungan:</span> {wali.hubungan_keluarga}
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="w-3 h-3" />
                              <span>{wali.no_whatsapp}</span>
                            </div>
                            {wali.alamat && (
                              <div className="flex items-start gap-2">
                                <MapPin className="w-3 h-3 mt-0.5" />
                                <span className="text-xs">{wali.alamat}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Tab Akademik */}
          <TabsContent value="akademik" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Program Pendidikan Aktif
                </CardTitle>
              </CardHeader>
              <CardContent>
                {programAktif.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Belum ada program aktif</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-2xl font-bold">{programAktif.length}</div>
                        <p className="text-sm text-muted-foreground">Program Aktif</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {programAktif.map((program) => (
                        <div key={program.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold">{program.nama_kelas}</h4>
                            <Badge variant="outline">{program.program}</Badge>
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {program.rombel && (
                              <div>Rombel: {program.rombel}</div>
                            )}
                            {program.tahun_ajaran && (
                              <div>Tahun Ajaran: {program.tahun_ajaran}</div>
                            )}
                            {program.semester && (
                              <div>Semester: {program.semester}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Laporan Keuangan */}
          <TabsContent value="keuangan" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {santri?.kategori?.includes('Binaan Mukim') ? (
                <>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">SPP Pesantren</CardTitle>
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatRupiah(financialSummary.total_spp_pesantren || 0)}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Dibayar: {formatRupiah(financialSummary.total_dibayar_pesantren || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Sisa: {formatRupiah(financialSummary.sisa_spp_pesantren || 0)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Pendidikan Formal</CardTitle>
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatRupiah(financialSummary.total_spp_formal || 0)}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Dibayar: {formatRupiah(financialSummary.total_dibayar_formal || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Sisa: {formatRupiah(financialSummary.sisa_spp_formal || 0)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Bantuan Yayasan</CardTitle>
                      <HeartHandshake className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {formatRupiah(financialSummary.total_bantuan_yayasan || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">Bantuan yang diterima</p>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total SPP</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatRupiah(financialSummary.total_spp || 0)}</div>
                      <p className="text-xs text-muted-foreground">Total tagihan</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Dibayar</CardTitle>
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {formatRupiah(financialSummary.total_dibayar || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">Pembayaran diterima</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Sisa SPP</CardTitle>
                      <Clock className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">
                        {formatRupiah(financialSummary.sisa_spp || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">Belum dibayar</p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Payment History Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Riwayat Keuangan
                </CardTitle>
                <Button size="sm" onClick={() => toast.info('Fitur tambah pembayaran akan segera tersedia')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Pembayaran
                </Button>
              </CardHeader>
              <CardContent>
                {paymentHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Belum ada riwayat pembayaran</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    {/* Desktop Table */}
                    <Table className="hidden md:table">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tanggal</TableHead>
                          <TableHead>Periode</TableHead>
                          <TableHead>Jenis</TableHead>
                          <TableHead>Nominal</TableHead>
                          <TableHead>Sumber</TableHead>
                          <TableHead>Keterangan</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paymentHistory.map((payment, index) => (
                          <TableRow 
                            key={index}
                            className={payment.sumber === 'Donatur' ? 'bg-green-50' : ''}
                          >
                            <TableCell>{formatDate(payment.tanggal)}</TableCell>
                            <TableCell>{payment.periode}</TableCell>
                            <TableCell>{payment.jenis}</TableCell>
                            <TableCell className="font-medium">{formatRupiah(payment.nominal)}</TableCell>
                            <TableCell>
                              <Badge 
                                className={
                                  payment.sumber === 'Donatur' 
                                    ? 'bg-green-100 text-green-800 border-green-200' 
                                    : payment.sumber === 'Orang Tua'
                                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                                    : 'bg-gray-100 text-gray-800'
                                }
                              >
                                {payment.sumber}
                                {payment.donatur_name && ` (${payment.donatur_name})`}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {payment.keterangan || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Mobile Card List */}
                    <div className="md:hidden space-y-3">
                      {paymentHistory.map((payment, index) => (
                        <Card 
                          key={index}
                          className={payment.sumber === 'Donatur' ? 'border-green-200 bg-green-50' : ''}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-medium">{payment.jenis}</p>
                                <p className="text-xs text-muted-foreground">{payment.periode}</p>
                              </div>
                              <Badge 
                                className={
                                  payment.sumber === 'Donatur' 
                                    ? 'bg-green-100 text-green-800' 
                                    : payment.sumber === 'Orang Tua'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                                }
                              >
                                {payment.sumber}
                              </Badge>
                            </div>
                            <div className="text-lg font-bold mb-2">{formatRupiah(payment.nominal)}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(payment.tanggal)}
                              {payment.donatur_name && ` • ${payment.donatur_name}`}
                            </div>
                            {payment.keterangan && (
                              <p className="text-xs text-muted-foreground mt-2">{payment.keterangan}</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Monitoring */}
          <TabsContent value="monitoring" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Monitoring & Pengasuhan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Activity className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Dalam Pengembangan</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Fitur monitoring dan pengasuhan sedang dalam tahap pengembangan. 
                    Fitur ini akan mencakup tracking poin kedisiplinan, riwayat perilaku, 
                    dan catatan pengasuhan santri.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SantriProfileRedesigned;

