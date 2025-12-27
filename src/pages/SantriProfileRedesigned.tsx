import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Clock,
  Save,
  X,
  ChevronRight,
  Wallet,
  ArrowDownCircle,
  Home,
  Settings,
  Key,
  Camera,
  UserCircle,
  FolderOpen,
  Lock,
  LogOut
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatRupiah } from "@/utils/inventaris.utils";
import { getSafeAvatarUrl } from '@/utils/url.utils';
import { calculateAge } from '@/lib/utils';
import { toast } from 'sonner';
import { TagihanService, TagihanSantri, PembayaranSantri } from '@/services/tagihan.service';
import { SetoranHarianService } from '@/services/setoranHarian.service';
import { TabunganSantriService } from '@/services/tabunganSantri.service';
import { AkademikSemesterService } from '@/services/akademikSemester.service';
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import PersonalStep from "@/components/forms/PersonalStep";
import WaliStep from "@/components/forms/WaliStep";
import DokumenSantriTab from "@/components/DokumenSantriTab";
import { SantriData, WaliData } from "@/types/santri.types";

type SumberPenjamin = 'Yayasan' | 'Program Orang Tua Asuh' | 'Campuran';

interface SantriDataLocal {
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
  nik?: string;
  status_sosial?: string;
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

interface AlokasiDetail {
  id: string;
  jenis_bantuan: string;
  nominal_alokasi: number;
  periode: string;
  alokasi_ke?: 'formal' | 'pesantren' | 'asrama_konsumsi' | 'bantuan_langsung';
  keterangan?: string;
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
  // For Binaan Mukim
  total_biaya_per_bulan?: number;
  total_biaya_per_tahun?: number;
  breakdown_per_bulan?: Array<{
    periode: string;
    bulan: string;
    total_formal: number;
    total_pesantren: number;
    total_asrama_konsumsi: number;
    total_bantuan_yayasan: number;
    total: number;
    sumber_penjamin: string;
  }>;
  sumber_penjamin?: 'Yayasan' | 'Program Orang Tua Asuh' | 'Campuran';
  donatur_list?: Array<{ id: string; nama: string }>;
  // Detail alokasi untuk rincian item
  detail_alokasi?: AlokasiDetail[];
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
  const { user, logout } = useAuth();
  
  const santriId = searchParams.get("santriId") || undefined;
  const santriName = searchParams.get("santriName") || undefined;
  
  // Check if current user is santri viewing their own profile
  const isCurrentUserSantri = user?.role === 'santri';
  const isViewingOwnProfile = isCurrentUserSantri && user?.santriId === santriId;

  const [activeTab, setActiveTab] = useState("ringkasan");
  const [loading, setLoading] = useState(true);
  const [santri, setSantri] = useState<SantriDataLocal | null>(null);
  const [waliData, setWaliData] = useState<any[]>([]);
  const [programAktif, setProgramAktif] = useState<ProgramAktif[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>({});
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [tagihanList, setTagihanList] = useState<TagihanSantri[]>([]);
  const [showRincianDialog, setShowRincianDialog] = useState(false);
  const [selectedPeriodeRincian, setSelectedPeriodeRincian] = useState<string | null>(null);
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

  // Form state for editing
  const [isSaving, setIsSaving] = useState(false);
  const [formSantriData, setFormSantriData] = useState<Partial<SantriData>>({});
  const [formWaliData, setFormWaliData] = useState<WaliData[]>([]);

  // Tabungan state
  const [saldoTabungan, setSaldoTabungan] = useState<number>(0);
  const [loadingTabungan, setLoadingTabungan] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawDescription, setWithdrawDescription] = useState<string>('');
  const [withdrawNote, setWithdrawNote] = useState<string>('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Settings panel state (mobile app style)
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  
  // Photo upload state
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  // Active semester state
  const [activeSemester, setActiveSemester] = useState<any>(null);

  // Check profile completion and redirect to onboarding if needed
  useEffect(() => {
    if (!santriId) return;

    const checkOnboarding = async () => {
      try {
        const { SantriOnboardingService } = await import('@/services/santriOnboarding.service');
        const completion = await SantriOnboardingService.checkProfileCompletion(santriId);
        
        // Only redirect if profile is incomplete and user can't skip
        // This allows users who already have basic info to access profile
        if (!completion.isComplete && !completion.canSkipOnboarding) {
          const skipOnboarding = localStorage.getItem(`skip_onboarding_${santriId}`);
          if (!skipOnboarding) {
            console.log('📋 [SantriProfile] Profile incomplete, redirecting to onboarding');
            navigate(`/santri/onboarding?santriId=${santriId}`, { replace: true });
            return;
          }
        }
      } catch (error) {
        console.warn('⚠️ [SantriProfile] Error checking profile completion:', error);
        // Continue loading profile even if check fails
      }
    };

    checkOnboarding();
  }, [santriId, navigate]);

  // Load all data
  useEffect(() => {
    if (!santriId) {
      setLoading(false);
      return;
    }
    
    const loadData = async () => {
      // Double check santriId is valid
      if (!santriId) {
        console.warn('⚠️ [SantriProfileRedesigned] No santriId provided in loadData');
        setLoading(false);
        return;
      }
      
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
        
        // Initialize form data with santri data (ensure all required fields have defaults)
        setFormSantriData({
          ...santriData,
          jenis_kelamin: santriData?.jenis_kelamin || 'Laki-laki',
          agama: santriData?.agama || 'Islam',
          status_santri: santriData?.status_santri || 'Aktif',
          status_sosial: (santriData?.status_sosial as any) || 'Lengkap',
        } as Partial<SantriData>);

        // Load wali data
        const { data: wali, error: waliError } = await supabase
          .from('santri_wali')
          .select('*')
          .eq('santri_id', santriId)
          .order('is_utama', { ascending: false });

        if (!waliError) {
          const waliList = wali || [];
          setWaliData(waliList);
          // Initialize form wali data - ensure at least one wali utama exists
          if (waliList.length === 0) {
            setFormWaliData([{
              nama_lengkap: '',
              hubungan_keluarga: 'Ayah',
              no_whatsapp: '',
              alamat: '',
              is_utama: true
            }]);
          } else {
            setFormWaliData(waliList);
          }
        }

        // Load active semester first
        const semester = await AkademikSemesterService.getSemesterAktif();
        setActiveSemester(semester);

        // Load program aktif (kelas_anggota) - filter by active semester
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
              semester,
              semester_id
            )
          `)
          .eq('santri_id', santriId)
          .eq('status', 'Aktif');

        if (!kelasError && kelasAnggota) {
          // Filter by active semester if available
          const filteredKelas = semester 
            ? kelasAnggota.filter((ka: any) => ka.kelas?.semester_id === semester.id)
            : kelasAnggota;
          
          const programs = filteredKelas.map((ka: any) => ({
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

        // Load tabungan saldo
        await loadTabunganSaldo(santriId);

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
      // Load active semester first
      const semester = await AkademikSemesterService.getSemesterAktif();
      if (!semester) {
        console.warn('No active semester found');
        setKehadiranProgress({ persentase: 0, hadir: 0, total: 0 });
        return;
      }

      // Get kehadiran dari presensi kelas berdasarkan semester aktif
      // First, get kelas where santri is enrolled in active semester
      const { data: kelasAnggota } = await supabase
        .from('kelas_anggota')
        .select(`
          kelas_id,
          kelas:kelas_id(id, semester_id)
        `)
        .eq('santri_id', id)
        .eq('status', 'Aktif');

      if (!kelasAnggota || kelasAnggota.length === 0) {
        setKehadiranProgress({ persentase: 0, hadir: 0, total: 0 });
        return;
      }

      // Filter kelas yang sesuai dengan semester aktif
      const kelasIds = kelasAnggota
        .filter(ka => ka.kelas?.semester_id === semester.id)
        .map(ka => ka.kelas_id);

      if (kelasIds.length === 0) {
        setKehadiranProgress({ persentase: 0, hadir: 0, total: 0 });
        return;
      }

      // Get pertemuan dari semester aktif
      const { data: pertemuanData } = await supabase
        .from('kelas_pertemuan')
        .select('id, tanggal')
        .in('kelas_id', kelasIds)
        .eq('status', 'Selesai')
        .gte('tanggal', semester.tanggal_mulai)
        .lte('tanggal', semester.tanggal_selesai);

      // Get absensi untuk pertemuan tersebut
      if (pertemuanData && pertemuanData.length > 0) {
        const pertemuanIds = pertemuanData.map(p => p.id);
        const { data: absensiData } = await supabase
          .from('absensi_madin')
          .select('status')
          .eq('santri_id', id)
          .in('pertemuan_id', pertemuanIds);

        const hadir = absensiData?.filter(a => a.status === 'Hadir').length || 0;
        const total = pertemuanData.length;
        const persentase = total > 0 ? (hadir / total) * 100 : 0;

        setKehadiranProgress({
          persentase: Math.round(persentase),
          hadir,
          total
        });
      } else {
        setKehadiranProgress({ persentase: 0, hadir: 0, total: 0 });
      }
    } catch (error) {
      console.error('Error loading kehadiran data:', error);
      setKehadiranProgress({ persentase: 0, hadir: 0, total: 0 });
    }
  };

  const loadTabunganSaldo = async (id: string) => {
    try {
      setLoadingTabungan(true);
      const saldo = await TabunganSantriService.getSaldoTabungan(id);
      setSaldoTabungan(saldo || 0);
    } catch (error) {
      console.error('Error loading tabungan saldo:', error);
      setSaldoTabungan(0);
    } finally {
      setLoadingTabungan(false);
    }
  };

  const handleWithdraw = async () => {
    if (!santriId) {
      toast.error('ID Santri tidak ditemukan');
      return;
    }

    const nominal = parseFloat(withdrawAmount);
    if (!nominal || nominal <= 0) {
      toast.error('Nominal harus lebih dari 0');
      return;
    }

    if (nominal > saldoTabungan) {
      toast.error('Saldo tidak mencukupi');
      return;
    }

    setIsWithdrawing(true);
    try {
      await TabunganSantriService.tarikTabungan({
        santri_id: santriId,
        nominal: nominal,
        deskripsi: withdrawDescription || 'Penarikan tabungan',
        catatan: withdrawNote || null
      });

      toast.success('Penarikan tabungan berhasil');
      setShowWithdrawDialog(false);
      setWithdrawAmount('');
      setWithdrawDescription('');
      setWithdrawNote('');
      
      // Reload saldo
      await loadTabunganSaldo(santriId);
    } catch (error: any) {
      console.error('Error withdrawing tabungan:', error);
      toast.error('Gagal melakukan penarikan: ' + (error.message || 'Terjadi kesalahan'));
    } finally {
      setIsWithdrawing(false);
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
        // Binaan Mukim: Load dari alokasi_pengeluaran_santri (tidak ada tagihan yang harus dibayar wali)
        let totalPesantren = 0;
        let totalFormal = 0;
        let totalBantuan = 0;
        const breakdownPerBulan: { [key: string]: { periode: string; bulan: string; total_formal: number; total_pesantren: number; total_asrama_konsumsi: number; total_bantuan_yayasan: number; total: number; sumber_penjamin: string } } = {};
        const sumberPenjaminSet = new Set<string>();
        const donaturSet = new Set<{ id: string; nama: string }>();
        let totalAsramaKonsumsi = 0;
        let totalBantuanYayasan = 0;
        const detailAlokasi: AlokasiDetail[] = [];

        // Load alokasi dari alokasi_pengeluaran_santri
        try {
          const { data: alokasiLangsung, error: alokasiError } = await supabase
            .from('alokasi_pengeluaran_santri')
            .select(`
              *,
              keuangan:keuangan_id(tanggal, kategori, sub_kategori, jenis_alokasi, akun_kas_id)
            `)
            .eq('santri_id', id)
            .order('created_at', { ascending: false });
          
          console.log('[DEBUG] Loaded alokasi_pengeluaran_santri:', {
            count: alokasiLangsung?.length || 0,
            santri_id: id,
            sample: alokasiLangsung?.[0]
          });
          
          if (alokasiError) {
            console.error('Error loading alokasi:', alokasiError);
            throw alokasiError;
          }
          
          if (alokasiLangsung) {
            // Process alokasi items and collect donatur IDs
            const donaturIds: string[] = [];
            
            for (const item of alokasiLangsung) {
              // Untuk kategori "Operasional dan Konsumsi Santri", gunakan sub_kategori dari keuangan jika tersedia
              // Jika tidak ada, gunakan jenis_bantuan yang sudah ada
              const keuanganData = (item as any).keuangan;
              let jenisBantuan = item.jenis_bantuan || 'Bantuan';
              
              // Jika kategori keuangan adalah "Operasional dan Konsumsi Santri" dan ada sub_kategori,
              // gunakan sub_kategori sebagai jenis_bantuan untuk konsistensi
              if (keuanganData?.kategori === 'Operasional dan Konsumsi Santri' && keuanganData?.sub_kategori) {
                jenisBantuan = keuanganData.sub_kategori; // "Konsumsi" atau "Operasional"
              }
              
              // Store detail alokasi untuk rincian item
              detailAlokasi.push({
                id: item.id,
                jenis_bantuan: jenisBantuan,
                nominal_alokasi: Number(item.nominal_alokasi || 0),
                periode: item.periode || '',
                alokasi_ke: item.alokasi_ke,
                keterangan: item.keterangan,
              });
              const nominal = Number(item.nominal_alokasi || 0);
              totalBantuan += nominal;
              
              // Get tanggal transaksi dari keuangan untuk parsing periode
              // Cek apakah ada join ke keuangan atau ambil dari field langsung
              const tanggalTransaksi = (item as any).keuangan?.tanggal || null;

              // Get sumber penjamin from database field or fallback to keterangan
              let sumberPenjamin: SumberPenjamin = (item.sumber_penjamin as SumberPenjamin) || 'Yayasan';
              if (!sumberPenjamin && item.keterangan) {
                // Fallback: Extract from keterangan for legacy data
                if (item.keterangan.includes('Program Orang Tua Asuh')) {
                  sumberPenjamin = 'Program Orang Tua Asuh';
                } else if (item.keterangan.includes('Yayasan')) {
                  sumberPenjamin = 'Yayasan';
                } else {
                  sumberPenjamin = 'Yayasan';
                }
              }
              sumberPenjaminSet.add(sumberPenjamin);

              // Get donatur_id from database field or extract from keterangan
              if (item.donatur_id && !donaturIds.includes(item.donatur_id)) {
                donaturIds.push(item.donatur_id);
              } else {
                // Fallback: Extract from keterangan for legacy data
                const donaturMatch = item.keterangan?.match(/Donatur ID: ([a-f0-9-]+)/i);
                if (donaturMatch && !donaturIds.includes(donaturMatch[1])) {
                  donaturIds.push(donaturMatch[1]);
                }
              }

              // Group by periode - parse dari format "Bulan Tahun" ke "YYYY-MM" untuk sorting
              let periodeDisplay = item.periode || 'Unknown';
              let periodeSort = periodeDisplay;
              
              // Parse periode dari format "Desember 2024" ke "2024-12"
              // Juga handle format "April" tanpa tahun (gunakan tahun dari tanggal transaksi)
              try {
                const bulanMap: { [key: string]: string } = {
                  'januari': '01', 'februari': '02', 'maret': '03', 'april': '04',
                  'mei': '05', 'juni': '06', 'juli': '07', 'agustus': '08',
                  'september': '09', 'oktober': '10', 'november': '11', 'desember': '12'
                };
                
                // Coba parse format "Bulan Tahun" (e.g., "Desember 2024")
                const match = periodeDisplay.match(/(\w+)\s+(\d{4})/i);
                if (match) {
                  const bulanNama = match[1].toLowerCase();
                  const tahun = match[2];
                  const bulan = bulanMap[bulanNama] || '01';
                  periodeSort = `${tahun}-${bulan}`;
                } else {
                  // Jika tidak ada tahun, coba parse hanya nama bulan (e.g., "April")
                  // Gunakan tahun dari tanggal transaksi
                  const bulanNama = periodeDisplay.trim().toLowerCase();
                  if (bulanMap[bulanNama]) {
                    // Ambil tahun dari tanggal transaksi
                    const transaksiTahun = tanggalTransaksi 
                      ? new Date(tanggalTransaksi).getFullYear()
                      : new Date().getFullYear();
                    const bulan = bulanMap[bulanNama];
                    periodeSort = `${transaksiTahun}-${bulan}`;
                    // Update periodeDisplay untuk konsistensi
                    periodeDisplay = `${periodeDisplay.charAt(0).toUpperCase() + periodeDisplay.slice(1)} ${transaksiTahun}`;
                  } else {
                    // Fallback: gunakan tanggal transaksi jika ada
                    if (tanggalTransaksi) {
                      const date = new Date(tanggalTransaksi);
                      const tahun = date.getFullYear();
                      const bulan = String(date.getMonth() + 1).padStart(2, '0');
                      periodeSort = `${tahun}-${bulan}`;
                    } else {
                      // Final fallback: gunakan tahun dan bulan saat ini
                      const now = new Date();
                      periodeSort = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                    }
                  }
                }
              } catch (e) {
                console.warn('Error parsing periode:', e, 'periodeDisplay:', periodeDisplay);
                // Fallback: gunakan tanggal transaksi jika ada
                if (tanggalTransaksi) {
                  const date = new Date(tanggalTransaksi);
                  const tahun = date.getFullYear();
                  const bulan = String(date.getMonth() + 1).padStart(2, '0');
                  periodeSort = `${tahun}-${bulan}`;
                }
              }
              
              const periode = periodeSort; // Gunakan format sort untuk grouping
              if (!breakdownPerBulan[periode]) {
                // Parse bulan dari format YYYY-MM ke nama bulan
                let bulanDisplay = periodeDisplay;
                try {
                  const [tahun, bulan] = periode.split('-');
                  if (tahun && bulan) {
                    const bulanIndex = parseInt(bulan) - 1;
                    const dateObj = new Date(parseInt(tahun), bulanIndex, 1);
                    bulanDisplay = dateObj.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                  }
                } catch (e) {
                  // Fallback ke display original
                  bulanDisplay = periodeDisplay;
                }
                
                breakdownPerBulan[periode] = {
                  periode,
                  bulan: bulanDisplay, // Nama bulan untuk display
                  total_formal: 0,
                  total_pesantren: 0,
                  total_asrama_konsumsi: 0,
                  total_bantuan_yayasan: 0,
                  total: 0,
                  sumber_penjamin: sumberPenjamin,
                };
              }

              // Categorize by alokasi_ke field (lebih akurat daripada jenis_bantuan)
              if (item.alokasi_ke === 'formal') {
                breakdownPerBulan[periode].total_formal += nominal;
                totalFormal += nominal;
              } else if (item.alokasi_ke === 'pesantren') {
                breakdownPerBulan[periode].total_pesantren += nominal;
                totalPesantren += nominal;
              } else if (item.alokasi_ke === 'asrama_konsumsi') {
                // Asrama & konsumsi - kolom terpisah
                breakdownPerBulan[periode].total_asrama_konsumsi += nominal;
                totalAsramaKonsumsi += nominal;
              } else if (item.alokasi_ke === 'bantuan_langsung') {
                // Bantuan langsung yayasan - kolom terpisah
                breakdownPerBulan[periode].total_bantuan_yayasan += nominal;
                totalBantuanYayasan += nominal;
              } else {
                // Fallback: cek jenis_bantuan jika alokasi_ke tidak ada (legacy data)
                if (item.jenis_bantuan?.toLowerCase().includes('formal')) {
                  breakdownPerBulan[periode].total_formal += nominal;
                  totalFormal += nominal;
                } else if (item.jenis_bantuan?.toLowerCase().includes('pesantren') || 
                           item.jenis_bantuan?.toLowerCase().includes('spp')) {
                  breakdownPerBulan[periode].total_pesantren += nominal;
                  totalPesantren += nominal;
                } else {
                  // Default: masuk ke bantuan yayasan (untuk legacy data tanpa alokasi_ke)
                  breakdownPerBulan[periode].total_bantuan_yayasan += nominal;
                  totalBantuanYayasan += nominal;
                }
              }
              breakdownPerBulan[periode].total += nominal;
            }

            // Fetch all donatur data in parallel
            if (donaturIds.length > 0) {
              try {
                const { data: donaturDataList } = await supabase
                  .from('donations')
                  .select('id, donor_name')
                  .in('id', donaturIds);
                
                if (donaturDataList) {
                  donaturDataList.forEach((donatur) => {
                    donaturSet.add({ id: donatur.id, nama: donatur.donor_name });
                  });
                }
              } catch (e) {
                console.error('Error loading donatur data:', e);
              }
            }
          }
        } catch (err) {
          console.error('Error loading alokasi langsung:', err);
        }

        // Add bantuan overhead dari alokasi_overhead_per_santri
        // HANYA jika periode sudah ada di breakdownPerBulan (artinya ada transaksi keuangan yang sesuai)
        // Ini mencegah data orphan (data tanpa transaksi keuangan pendukung)
        try {
          const { data: alokasiOverhead } = await supabase
            .from('alokasi_overhead_per_santri')
            .select('spp_pendidikan, asrama_kebutuhan, bulan, tahun')
            .eq('santri_id', id);
          
          if (alokasiOverhead) {
            alokasiOverhead.forEach((item) => {
              const periode = `${item.tahun}-${String(item.bulan || 1).padStart(2, '0')}`;
              
              // HANYA tampilkan jika periode sudah ada di breakdownPerBulan
              // Artinya sudah ada transaksi keuangan (alokasi langsung) untuk periode tersebut
              if (breakdownPerBulan[periode]) {
                const sppPendidikan = Number(item.spp_pendidikan || 0);
                const asramaKebutuhan = Number(item.asrama_kebutuhan || 0);
                const totalOverhead = sppPendidikan + asramaKebutuhan;
                totalBantuan += totalOverhead;
                // Overhead masuk ke asrama_konsumsi, bukan pesantren
                totalAsramaKonsumsi += totalOverhead;

                // Overhead dari alokasi_overhead_per_santri masuk ke asrama_konsumsi
                breakdownPerBulan[periode].total_asrama_konsumsi += totalOverhead;
                breakdownPerBulan[periode].total += totalOverhead;
              } else {
                // Skip data orphan (tidak ada transaksi keuangan yang sesuai)
                console.warn(`[AUDIT] Skipping orphan alokasi_overhead_per_santri: periode ${periode} (${item.bulan}/${item.tahun}) tidak memiliki transaksi keuangan`);
              }
            });
          }
        } catch (err) {
          console.error('Error loading alokasi overhead:', err);
        }

        // Calculate monthly and yearly totals
        // Sort dari terbaru ke terlama (descending) berdasarkan format YYYY-MM
        // Pastikan format periode adalah YYYY-MM untuk sorting yang benar
        const breakdownArray = Object.values(breakdownPerBulan).sort((a, b) => {
          // Validasi format YYYY-MM
          const aPeriod = a.periode.match(/^\d{4}-\d{2}$/) ? a.periode : '0000-00';
          const bPeriod = b.periode.match(/^\d{4}-\d{2}$/) ? b.periode : '0000-00';
          // Sort descending (terbaru dulu): 2025-12 > 2025-11 > 2025-10 > ... > 2025-01
          return bPeriod.localeCompare(aPeriod);
        });
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        const totalBulanIni = breakdownArray
          .filter(b => b.periode.startsWith(`${currentYear}-${String(currentMonth).padStart(2, '0')}`))
          .reduce((sum, b) => sum + b.total, 0);
        const totalTahunIni = breakdownArray
          .filter(b => b.periode.startsWith(String(currentYear)))
          .reduce((sum, b) => sum + b.total, 0);

        // Determine sumber penjamin
        let sumberPenjaminFinal: 'Yayasan' | 'Program Orang Tua Asuh' | 'Campuran' = 'Yayasan';
        if (sumberPenjaminSet.size > 1) {
          sumberPenjaminFinal = 'Campuran';
        } else if (sumberPenjaminSet.has('Program Orang Tua Asuh')) {
          sumberPenjaminFinal = 'Program Orang Tua Asuh';
        }

        setFinancialSummary({
          total_spp_pesantren: totalPesantren,
          total_dibayar_pesantren: 0, // Binaan mukim tidak ada pembayaran dari wali
          sisa_spp_pesantren: 0, // Tidak ada sisa karena semua ditanggung yayasan
          total_spp_formal: totalFormal,
          total_dibayar_formal: 0,
          sisa_spp_formal: 0,
          total_bantuan_yayasan: totalBantuan,
          total_biaya_per_bulan: totalBulanIni,
          total_biaya_per_tahun: totalTahunIni,
          breakdown_per_bulan: breakdownArray,
          sumber_penjamin: sumberPenjaminFinal,
          donatur_list: Array.from(donaturSet),
          detail_alokasi: detailAlokasi,
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
            // Determine jenis pembayaran based on tagihan type and alokasi
            let jenis = 'SPP';
            if (isBinaanMukim) {
              // For Binaan Mukim, check alokasi_ke
              if (p.alokasi_ke === 'pesantren') {
                jenis = 'SPP Pesantren';
              } else if (p.alokasi_ke === 'formal') {
                jenis = 'Pendidikan Formal';
              } else if (p.sumber_pembayaran === 'yayasan') {
                jenis = 'Bantuan Yayasan';
              } else {
                // Fallback to komponen tagihan
                jenis = Array.isArray(t.komponen_tagihan) && t.komponen_tagihan.length > 0
                  ? t.komponen_tagihan[0].nama 
                  : 'SPP';
              }
            } else {
              // For other categories, use komponen tagihan or default
              if (p.sumber_pembayaran === 'yayasan') {
                jenis = 'Bantuan Yayasan';
              } else {
                jenis = Array.isArray(t.komponen_tagihan) && t.komponen_tagihan.length > 0
                  ? t.komponen_tagihan[0].nama 
                  : 'SPP';
              }
            }
            
            const sumberLabel = 
              p.sumber_pembayaran === 'orang_tua' ? 'Orang Tua' :
              p.sumber_pembayaran === 'donatur' ? 'Orang Tua Asuh Santri' :
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

  // Handle photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !santriId) return;

    // Validate file
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('File terlalu besar. Maksimal 5MB.');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipe file tidak didukung. Gunakan JPG atau PNG.');
      return;
    }

    try {
      setUploadingPhoto(true);

      // Preview foto
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload ke storage
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `${timestamp}.${fileExt}`;
      const filePath = `${santriId}/${fileName}`;

      // Delete old photo if exists
      if (santri?.foto_profil && !santri.foto_profil.startsWith('http')) {
        try {
          const oldPath = santri.foto_profil.includes('/') 
            ? santri.foto_profil 
            : `${santriId}/${santri.foto_profil}`;
          await supabase.storage
            .from('santri-photos')
            .remove([oldPath]);
        } catch (err) {
          console.warn('Gagal menghapus foto lama:', err);
        }
      }

      // Upload new photo
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('santri-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('santri-photos')
        .getPublicUrl(filePath);

      // Update database
      const { error: updateError } = await supabase
        .from('santri')
        .update({ foto_profil: filePath })
        .eq('id', santriId);

      if (updateError) throw updateError;

      // Update local state
      setSantri({ ...santri, foto_profil: filePath });
      toast.success('Foto profil berhasil diupdate');
      setPhotoPreview(null);
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast.error('Gagal mengupload foto: ' + (error.message || 'Terjadi kesalahan'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Group detail alokasi by kategori (alokasi_ke) and jenis_bantuan
  const getRincianItemByPeriode = (periode: string) => {
    if (!financialSummary.detail_alokasi || financialSummary.detail_alokasi.length === 0) return null;

    // Normalize periode untuk matching (handle berbagai format)
    const normalizePeriode = (p: string): string => {
      if (!p) return '';
      // Convert "Januari 2025" to "2025-01" untuk matching
      const bulanMap: { [key: string]: string } = {
        'januari': '01', 'februari': '02', 'maret': '03', 'april': '04',
        'mei': '05', 'juni': '06', 'juli': '07', 'agustus': '08',
        'september': '09', 'oktober': '10', 'november': '11', 'desember': '12'
      };
      
      // Try to match "Bulan Tahun" format
      const match = p.match(/(\w+)\s+(\d{4})/i);
      if (match) {
        const bulanNama = match[1].toLowerCase();
        const tahun = match[2];
        const bulan = bulanMap[bulanNama] || '01';
        return `${tahun}-${bulan}`;
      }
      
      // If already in YYYY-MM format, return as is
      if (p.match(/^\d{4}-\d{2}$/)) {
        return p;
      }
      
      return p.toLowerCase();
    };

    const normalizedTarget = normalizePeriode(periode);

    // Filter by periode (match bulan dan tahun)
    const alokasiPerPeriode = financialSummary.detail_alokasi.filter(alloc => {
      const allocPeriode = normalizePeriode(alloc.periode || '');
      // Match exact atau partial match
      return allocPeriode === normalizedTarget || 
             allocPeriode.includes(normalizedTarget) || 
             normalizedTarget.includes(allocPeriode) ||
             (alloc.periode || '').toLowerCase().includes(periode.toLowerCase()) ||
             periode.toLowerCase().includes((alloc.periode || '').toLowerCase());
    });

    if (alokasiPerPeriode.length === 0) return null;

    // Group by alokasi_ke
    const grouped: {
      formal: Array<{ jenis: string; nominal: number }>;
      pesantren: Array<{ jenis: string; nominal: number }>;
      asrama_konsumsi: Array<{ jenis: string; nominal: number }>;
      bantuan_langsung: Array<{ jenis: string; nominal: number }>;
    } = {
      formal: [],
      pesantren: [],
      asrama_konsumsi: [],
      bantuan_langsung: [],
    };

    // Aggregate by jenis_bantuan within each alokasi_ke
    const aggregator: {
      [key: string]: { [jenis: string]: number };
    } = {
      formal: {},
      pesantren: {},
      asrama_konsumsi: {},
      bantuan_langsung: {},
    };

    alokasiPerPeriode.forEach(alloc => {
      const kategori = alloc.alokasi_ke || 'bantuan_langsung';
      const jenis = alloc.jenis_bantuan || 'Bantuan';
      if (!aggregator[kategori]) aggregator[kategori] = {};
      aggregator[kategori][jenis] = (aggregator[kategori][jenis] || 0) + alloc.nominal_alokasi;
    });

    // Convert to array format
    Object.entries(aggregator).forEach(([kategori, items]) => {
      Object.entries(items).forEach(([jenis, nominal]) => {
        if (kategori === 'formal') {
          grouped.formal.push({ jenis, nominal });
        } else if (kategori === 'pesantren') {
          grouped.pesantren.push({ jenis, nominal });
        } else if (kategori === 'asrama_konsumsi') {
          grouped.asrama_konsumsi.push({ jenis, nominal });
        } else {
          grouped.bantuan_langsung.push({ jenis, nominal });
        }
      });
    });

    return grouped;
  };

  // Form validation
  const isFormValid = () => {
    const basicValid = (
      formSantriData.kategori &&
      formSantriData.nama_lengkap?.trim() &&
      formSantriData.tanggal_masuk &&
      formSantriData.tempat_lahir?.trim() &&
      formSantriData.tanggal_lahir &&
      formSantriData.no_whatsapp?.trim() &&
      formSantriData.alamat?.trim() &&
      formSantriData.nik?.trim() &&
      formWaliData.some(w => w.is_utama && w.nama_lengkap.trim())
    );

    // Binaan validation
    if (formSantriData.kategori?.includes('Binaan')) {
      const binaanValid = formSantriData.status_sosial !== 'Lengkap';
      const waliValid = formWaliData.every(w => w.pekerjaan && w.penghasilan_bulanan !== undefined);
      
      if (formSantriData.kategori === 'Binaan Mukim') {
        const mukimValid = 
          formSantriData.anak_ke !== undefined &&
          formSantriData.jumlah_saudara !== undefined &&
          formSantriData.hobi?.trim() &&
          formSantriData.cita_cita?.trim() &&
          formWaliData.length >= 2;
        
        return basicValid && binaanValid && waliValid && mukimValid;
      }
      
      return basicValid && binaanValid && waliValid;
    }

    return basicValid;
  };

  // Handle save form
  const handleSaveForm = async () => {
    if (!isFormValid()) {
      toast.error('Lengkapi semua data yang wajib diisi');
      return;
    }

    if (!santriId) {
      toast.error('ID Santri tidak ditemukan');
      return;
    }

    setIsSaving(true);
    try {
      // Prepare santri payload
      const santriPayload = {
        ...formSantriData,
        agama: formSantriData.agama || 'Islam',
      };

      // Update santri
      const { error: santriError } = await supabase
        .from('santri')
        .update(santriPayload)
        .eq('id', santriId);

      if (santriError) throw santriError;

      // Update wali - delete existing and insert new
      await supabase.from('santri_wali').delete().eq('santri_id', santriId);
      
      const waliPayload = formWaliData.map(wali => {
        const { id, ...waliWithoutId } = wali;
        return { ...waliWithoutId, santri_id: santriId };
      });
      
      const { error: waliError } = await supabase
        .from('santri_wali')
        .insert(waliPayload);
      
      if (waliError) throw waliError;

      // Update local state
      setSantri({ ...santri, ...santriPayload } as SantriDataLocal);
      setWaliData(formWaliData);

      toast.success('Data santri berhasil diperbarui');
      
      // Reload data to ensure consistency
      const { data: updatedSantri } = await supabase
        .from('santri')
        .select('*')
        .eq('id', santriId)
        .single();
      
      if (updatedSantri) {
        setSantri(updatedSantri);
        setFormSantriData(updatedSantri);
      }

      const { data: updatedWali } = await supabase
        .from('santri_wali')
        .select('*')
        .eq('santri_id', santriId)
        .order('is_utama', { ascending: false });
      
      if (updatedWali) {
        setWaliData(updatedWali);
        setFormWaliData(updatedWali);
      }

    } catch (error: any) {
      console.error('Error saving form:', error);
      toast.error('Gagal menyimpan data: ' + (error.message || 'Terjadi kesalahan'));
    } finally {
      setIsSaving(false);
    }
  };

  // Menu items for SUPERAPP-style grid - MUST be defined before early returns
  // Using consistent green color scheme for elegance and professionalism
  const menuItems = [
    {
      id: 'ringkasan',
      label: 'Ringkasan',
      icon: Activity,
      description: 'Overview & Progress',
      color: 'bg-primary',
      hoverColor: 'hover:bg-primary/90'
    },
    {
      id: 'informasi',
      label: 'Informasi Pribadi',
      icon: User,
      description: 'Data Santri & Wali',
      color: 'bg-primary',
      hoverColor: 'hover:bg-primary/90'
    },
    {
      id: 'akademik',
      label: 'Akademik',
      icon: GraduationCap,
      description: 'Program & Kelas',
      color: 'bg-primary',
      hoverColor: 'hover:bg-primary/90'
    },
    {
      id: 'keuangan',
      label: 'Keuangan',
      icon: DollarSign,
      description: 'Tagihan & Pembayaran',
      color: 'bg-primary',
      hoverColor: 'hover:bg-primary/90'
    },
    {
      id: 'monitoring',
      label: 'Monitoring',
      icon: Shield,
      description: 'Pengasuhan & Tracking',
      color: 'bg-primary',
      hoverColor: 'hover:bg-primary/90'
    }
  ];

  // Slider items for hero section - MUST be defined before early returns
  // Using consistent green color scheme
  const sliderItems = useMemo(() => {
    const items = [
      {
        title: 'Progres Hafalan',
        value: hafalanProgress.juz > 0 ? `${hafalanProgress.juz}` : '0',
        subtitle: '/ 30 Juz',
        progress: hafalanProgress.progress,
        icon: BookOpen,
        color: 'from-primary/80 to-primary',
        bgColor: 'bg-primary/5',
        change: hafalanProgress.changeThisMonth
      },
      {
        title: 'Kehadiran',
        value: `${kehadiranProgress.persentase}%`,
        subtitle: `${kehadiranProgress.hadir}/${kehadiranProgress.total} pertemuan`,
        progress: kehadiranProgress.persentase,
        icon: CheckCircle,
        color: 'from-primary/80 to-primary',
        bgColor: 'bg-primary/5',
        change: null
      },
      {
        title: santri?.kategori?.includes('Binaan') ? 'Bantuan Yayasan' : 'Sisa Tagihan',
        value: santri?.kategori?.includes('Binaan') 
          ? formatRupiah(financialSummary.total_bantuan_yayasan || 0)
          : formatRupiah(financialSummary.sisa_spp || 0),
        subtitle: santri?.kategori?.includes('Binaan') 
          ? 'Total bantuan diterima'
          : (financialSummary.sisa_spp || 0) === 0 ? 'Semua tagihan lunas' : 'Perlu dibayar',
        progress: santri?.kategori?.includes('Binaan') ? 100 : 
          financialSummary.total_spp ? ((financialSummary.total_dibayar || 0) / financialSummary.total_spp) * 100 : 0,
        icon: DollarSign,
        color: 'from-primary/80 to-primary',
        bgColor: 'bg-primary/5',
        change: null
      },
      {
        title: 'Tabungan Santri',
        value: formatRupiah(saldoTabungan),
        subtitle: 'Saldo tabungan saat ini',
        progress: saldoTabungan > 0 ? 100 : 0,
        icon: Wallet,
        color: 'from-primary/80 to-primary',
        bgColor: 'bg-primary/5',
        change: null
      },
      {
        title: 'Program Aktif',
        value: `${programAktif.length}`,
        subtitle: 'Program pendidikan',
        progress: programAktif.length > 0 ? 100 : 0,
        icon: GraduationCap,
        color: 'from-primary/80 to-primary',
        bgColor: 'bg-primary/5',
        change: null
      }
    ];
    return items;
  }, [hafalanProgress, kehadiranProgress, financialSummary, programAktif, santri, saldoTabungan]);

  // Redirect santri if trying to access other santri's profile
  useEffect(() => {
    if (isCurrentUserSantri && santriId && user?.santriId && user.santriId !== santriId) {
      console.warn('⚠️ [SantriProfile] Santri trying to access other profile, redirecting to own profile');
      navigate(`/santri/profile?santriId=${user.santriId}&santriName=${encodeURIComponent(user.name || 'Santri')}`, { replace: true });
    } else if (isCurrentUserSantri && !user?.santriId) {
      // If user is santri but doesn't have santriId linked, redirect to auth
      console.warn('⚠️ [SantriProfile] Santri account not linked to santri data, redirecting to auth');
      navigate('/auth', { replace: true });
    }
  }, [isCurrentUserSantri, santriId, user?.santriId, user?.name, navigate]);

  if (!santriId) {
    return (
      <div className="p-4 lg:p-6">
        <Card className="border-red-500">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="text-xl font-bold text-red-600">ID Santri Tidak Ditemukan</div>
              {!isViewingOwnProfile && (
                <Button onClick={() => navigate('/santri')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Kembali ke Data Santri
                </Button>
              )}
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
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-white to-background overflow-x-hidden max-w-full">
      {/* Sticky Header - Minimal & Elegant with Editable Photo */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-primary/10 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative group">
                <Avatar className="w-12 h-12 lg:w-16 lg:h-16 border-2 border-primary/20 shadow-sm">
                  <AvatarImage 
                    src={photoPreview || getSafeAvatarUrl(santri?.foto_profil)} 
                    alt={santri?.nama_lengkap || santriName || "Santri"} 
                  />
                  <AvatarFallback className="text-base lg:text-lg font-semibold">
                    {(santri?.nama_lengkap || santriName || 'S').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0,2)}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="default"
                  className="absolute -bottom-1 -right-1 w-6 h-6 lg:w-7 lg:h-7 rounded-full bg-primary hover:bg-primary/90 border-2 border-white shadow-md p-0"
                  onClick={() => document.getElementById('photo-upload-input')?.click()}
                  disabled={uploadingPhoto}
                >
                  {uploadingPhoto ? (
                    <Loader2 className="w-3 h-3 lg:w-4 lg:h-4 text-white animate-spin" />
                  ) : (
                    <Camera className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
                  )}
                </Button>
                <input
                  id="photo-upload-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-lg lg:text-xl font-bold truncate">
                  {santri?.nama_lengkap || santriName || 'Memuat...'}
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  {santri?.tanggal_lahir && (
                    <span className="text-xs text-muted-foreground">
                      {calculateAge(santri.tanggal_lahir)} tahun
                    </span>
                  )}
                  <Badge className={cn("text-[10px] px-1.5 py-0", getStatusColor(santri?.status_santri))}>
                    {santri?.status_santri || 'Tidak Diketahui'}
                  </Badge>
                  {activeSemester && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {activeSemester.nama} {activeSemester.tahun_ajaran?.nama}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Hide back button for santri viewing own profile */}
              {!isViewingOwnProfile && (
                <>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/santri')} className="hidden sm:flex">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Kembali
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => navigate('/santri')} className="sm:hidden">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </>
              )}
              {/* Logout button - only show for santri viewing own profile */}
              {isViewingOwnProfile && (
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={async () => {
                    try {
                      await logout();
                      // Use window.location.replace to force full page reload and clear all state
                      // replace() prevents back button from going back to logged-in state
                      setTimeout(() => {
                        window.location.replace('/auth');
                      }, 100); // Small delay to ensure logout completes
                    } catch (error) {
                      console.error('Error during logout:', error);
                      // Still redirect even if logout fails
                      window.location.replace('/auth');
                    }
                  }}
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              )}
              <Button 
                variant="default" 
                size="icon" 
                onClick={() => setShowSettingsPanel(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Slider Section */}
      <div className="container mx-auto px-4 pt-6 pb-4">
        <Carousel 
          opts={{ 
            align: "start",
            loop: true,
          }} 
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {sliderItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <CarouselItem key={index} className="pl-2 md:pl-4 basis-full md:basis-1/2 lg:basis-1/4">
                  <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                    <div className={`bg-gradient-to-br ${item.color} p-6 text-white relative overflow-hidden`}>
                      <div className="absolute inset-0 bg-white/5"></div>
                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-4">
                          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <Icon className="w-6 h-6" />
                          </div>
                          {item.change !== null && item.change !== 0 && (
                            <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                              {item.change > 0 ? '+' : ''}{item.change} ayat
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-white/90">{item.title}</p>
                          <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-bold">{item.value}</h3>
                            {item.subtitle && (
                              <span className="text-sm text-white/80">{item.subtitle}</span>
                            )}
                          </div>
                        </div>
                        {item.progress > 0 && (
                          <div className="mt-4">
                            <Progress value={item.progress} className="h-2 bg-white/20" />
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious className="left-2 md:left-4 bg-background/80 backdrop-blur-sm border-2 border-primary/20 hover:bg-background hover:border-primary/40" />
          <CarouselNext className="right-2 md:right-4 bg-background/80 backdrop-blur-sm border-2 border-primary/20 hover:bg-background hover:border-primary/40" />
        </Carousel>
      </div>


      {/* Main Content */}
      <div className="container mx-auto px-4 pb-20 md:pb-8 max-w-full overflow-x-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Desktop Tabs Navigation - Hidden on mobile (mobile uses bottom nav) */}
          <TabsList className="hidden md:grid md:grid-cols-5 w-full mb-6 bg-white border border-primary/10 rounded-lg p-1 h-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <TabsTrigger
                  key={item.id}
                  value={item.id}
                  className={cn(
                    "flex items-center justify-center gap-2 text-sm py-2.5 transition-all",
                    isActive && "bg-primary text-white"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Tab Content */}
          <TabsContent value="ringkasan" className="space-y-6 mt-6">
            {/* 4 Kartu Progres Utama - Desain Minimalis & Elegan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {/* 1. Progres Hafalan Qur'an */}
              <Card className="border border-primary/10 bg-white shadow-sm hover:shadow-md transition-all duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <div className="p-1.5 bg-primary rounded-lg text-white">
                      <BookOpen className="w-4 h-4" />
                    </div>
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
                              : "bg-slate-100 text-slate-600"
                          )}>
                            {hafalanProgress.changeThisMonth > 0 ? '+' : ''}
                            {hafalanProgress.changeThisMonth} ayat bulan ini
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <BookOpen className="w-8 h-8 mx-auto mb-2 text-primary/30" />
                      <p className="text-sm text-muted-foreground">
                        Belum ada data hafalan
                      </p>
                    </div>
                  )}
                  </CardContent>
              </Card>

              {/* 2. Kehadiran */}
              <Card className="border border-primary/10 bg-white shadow-sm hover:shadow-md transition-all duration-300">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <div className="p-1.5 bg-primary rounded-lg text-white">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                      Kehadiran
                    </CardTitle>
                    {activeSemester && (
                      <Badge variant="outline" className="text-[10px]">
                        {activeSemester.nama}
                      </Badge>
                    )}
                  </div>
                  {activeSemester && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Data dari semester aktif: {activeSemester.nama} {activeSemester.tahun_ajaran?.nama}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                    {!activeSemester ? (
                      <div className="text-center py-6">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-primary/30" />
                        <p className="text-sm text-muted-foreground">
                          Belum ada semester aktif
                        </p>
                      </div>
                    ) : kehadiranProgress.total > 0 ? (
                      <>
                        <div className="flex items-baseline gap-2">
                          <div className="text-4xl font-bold text-foreground">
                            {kehadiranProgress.persentase}%
                          </div>
                          <div className="text-sm text-muted-foreground">semester ini</div>
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
                                ? "bg-primary/5 text-primary/80"
                                : "bg-slate-100 text-slate-600"
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
                        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-primary/30" />
                        <p className="text-sm text-muted-foreground">
                          Belum ada data kehadiran untuk semester ini
                        </p>
                        {activeSemester && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Semester: {activeSemester.nama} {activeSemester.tahun_ajaran?.nama}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
              </Card>

              {/* 3. Ringkasan Keuangan Pendidikan */}
              <Card className="border border-primary/10 bg-white shadow-sm hover:shadow-md transition-all duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <div className="p-1.5 bg-primary rounded-lg text-white">
                      <DollarSign className="w-4 h-4" />
                    </div>
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
                          className={cn(
                            "text-xs",
                            (financialSummary.sisa_spp || 0) === 0 
                              ? "bg-primary/10 text-primary" 
                              : "bg-slate-100 text-slate-600"
                          )}
                        >
                          {(financialSummary.sisa_spp || 0) === 0 ? 'Lunas' : 'Ada Tagihan'}
                        </Badge>
                      </>
                    )}
                  </CardContent>
              </Card>

              {/* 4. Tabungan Santri */}
              <Card className="border border-primary/10 bg-white shadow-sm hover:shadow-md transition-all duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <div className="p-1.5 bg-primary rounded-lg text-white">
                      <Wallet className="w-4 h-4" />
                    </div>
                    Tabungan Santri
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingTabungan ? (
                    <div className="text-center py-6">
                      <Loader2 className="w-8 h-8 mx-auto mb-2 text-primary/30 animate-spin" />
                      <p className="text-sm text-muted-foreground">Memuat saldo...</p>
                    </div>
                  ) : (
                    <>
                      <div className="text-3xl font-bold text-foreground">
                        {formatRupiah(saldoTabungan)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Saldo tabungan saat ini
                      </p>
                      <Button
                        onClick={() => setShowWithdrawDialog(true)}
                        disabled={saldoTabungan <= 0}
                        className="w-full bg-primary hover:bg-primary/90 text-white"
                        size="sm"
                      >
                        <ArrowDownCircle className="w-4 h-4 mr-2" />
                        Tarik Tabungan
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* 5. Status Perilaku/Pengasuhan */}
              <Card className="border border-primary/10 bg-white shadow-sm hover:shadow-md transition-all duration-300">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <div className="p-1.5 bg-primary rounded-lg text-white">
                      <Shield className="w-4 h-4" />
                    </div>
                    Status Perilaku & Pengasuhan
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-center py-6">
                      <Activity className="w-10 h-10 mx-auto mb-3 text-primary/30" />
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mt-6">
              {/* Status Akademik */}
              <Card className="border border-primary/10 bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-primary/10 rounded-lg">
                      <GraduationCap className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">Program Aktif</p>
                  </div>
                  <div className="text-2xl font-bold text-foreground">{programAktif.length}</div>
                </CardContent>
              </Card>

              {/* Status Dokumen */}
              <Card className="border border-primary/10 bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-primary/10 rounded-lg">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">Dokumen</p>
                  </div>
                  <div className="text-2xl font-bold text-foreground">-</div>
                </CardContent>
              </Card>

              {/* Kontak Wali */}
              <Card className="border border-primary/10 bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-primary/10 rounded-lg">
                      <Users className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">Kontak Wali</p>
                  </div>
                  <div className="text-lg font-semibold truncate text-foreground">
                    {waliUtama ? waliUtama.nama_lengkap?.split(' ')[0] || '-' : '-'}
                  </div>
                </CardContent>
              </Card>

              {/* Kategori */}
              <Card className="border border-primary/10 bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-primary/10 rounded-lg">
                      <Award className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">Kategori</p>
                  </div>
                  <div className="text-sm font-semibold truncate text-foreground">
                    {santri?.kategori || '-'}
                  </div>
                </CardContent>
              </Card>

              {/* Angkatan */}
              <Card className="border border-primary/10 bg-white shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-primary/10 rounded-lg">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">Angkatan</p>
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {santri?.angkatan || '-'}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab Informasi Pribadi */}
          <TabsContent value="informasi" className="space-y-6 mt-6" data-value="informasi">
            <div className="space-y-6">
              {/* Personal Information Form */}
              <PersonalStep
                santriData={formSantriData as SantriData}
                onChange={(data) => setFormSantriData(prev => ({ ...prev, ...data }))}
                isBinaan={santri?.kategori?.includes('Binaan') || false}
                isMukim={santri?.kategori?.includes('Mukim') || false}
              />

              {/* Wali Data Form */}
              <WaliStep
                waliData={formWaliData}
                onChange={setFormWaliData}
                isBinaan={santri?.kategori?.includes('Binaan') || false}
                isMukim={santri?.kategori?.includes('Mukim') || false}
              />

              {/* Save Button */}
              <Card className="bg-slate-50 border-slate-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Pastikan semua data telah diisi dengan benar sebelum menyimpan
                    </div>
                    <Button 
                      onClick={handleSaveForm}
                      disabled={isSaving}
                      size="lg"
                      className="min-w-[150px]"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Simpan Perubahan
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Dokumen Upload & Verifikasi Section */}
              {santriId && santri && (
                <Card className="mt-8" data-dokumen-section>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FolderOpen className="w-5 h-5" />
                      Dokumen & Verifikasi
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DokumenSantriTab
                      santriId={santriId}
                      santriData={{
                        status_sosial: (santri?.status_sosial as any) || 'Lengkap',
                        nama_lengkap: santri.nama_lengkap,
                        kategori: santri.kategori
                      }}
                      isBantuanRecipient={santri.kategori?.includes('Binaan') || santri.tipe_pembayaran === 'Bantuan Yayasan'}
                      mode="edit"
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Tab Akademik */}
          <TabsContent value="akademik" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5" />
                    Program Pendidikan Aktif
                  </CardTitle>
                  {activeSemester && (
                    <Badge variant="outline" className="text-xs">
                      Semester: {activeSemester.nama} {activeSemester.tahun_ajaran?.nama}
                    </Badge>
                  )}
                </div>
                {activeSemester && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Menampilkan program dari semester aktif: {activeSemester.nama} {activeSemester.tahun_ajaran?.nama}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {!activeSemester ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Belum ada semester aktif</p>
                    <p className="text-xs mt-2">Silakan hubungi administrator untuk mengatur semester aktif</p>
                  </div>
                ) : programAktif.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Belum ada program aktif untuk semester ini</p>
                    <p className="text-xs mt-2">Semester: {activeSemester.nama} {activeSemester.tahun_ajaran?.nama}</p>
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
                        <div key={program.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold">{program.nama_kelas}</h4>
                            <Badge variant="outline">{program.program}</Badge>
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {program.rombel && (
                              <div className="flex items-center gap-2">
                                <Users className="w-3 h-3" />
                                Rombel: {program.rombel}
                              </div>
                            )}
                            {program.tahun_ajaran && (
                              <div className="flex items-center gap-2">
                                <Calendar className="w-3 h-3" />
                                Tahun Ajaran: {program.tahun_ajaran}
                              </div>
                            )}
                            {program.semester && (
                              <div className="flex items-center gap-2">
                                <BookOpen className="w-3 h-3" />
                                Semester: {program.semester}
                              </div>
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
          <TabsContent value="keuangan" className="space-y-6 mt-6">
            {santri?.kategori?.includes('Binaan Mukim') ? (
              // Binaan Mukim: Display financial summary
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Biaya per Bulan</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatRupiah(financialSummary.total_biaya_per_bulan || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">Bulan ini</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Biaya per Tahun</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatRupiah(financialSummary.total_biaya_per_tahun || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">Tahun ini</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Bantuan Yayasan</CardTitle>
                      <HeartHandshake className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatRupiah(financialSummary.total_bantuan_yayasan || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">Total bantuan</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Sumber Penjamin</CardTitle>
                      <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-bold">
                        {financialSummary.sumber_penjamin || 'Yayasan'}
                      </div>
                      {financialSummary.donatur_list && financialSummary.donatur_list.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {financialSummary.donatur_list.length} donatur
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Monthly Breakdown */}
                {financialSummary.breakdown_per_bulan && financialSummary.breakdown_per_bulan.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Breakdown Bulanan</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Periode</TableHead>
                              <TableHead>Pendidikan Formal</TableHead>
                              <TableHead>Pendidikan Pesantren</TableHead>
                              <TableHead>Asrama & Konsumsi Santri</TableHead>
                              <TableHead>Bantuan Yayasan</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {financialSummary.breakdown_per_bulan.map((item, idx) => {
                              const rincian = getRincianItemByPeriode(item.bulan || item.periode);
                              return (
                                <TableRow key={idx}>
                                  <TableCell className="font-medium">{item.bulan || item.periode}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {formatRupiah(item.total_formal || 0)}
                                      {rincian && rincian.formal.length > 0 && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-2 text-xs"
                                          onClick={() => {
                                            setSelectedPeriodeRincian(item.bulan || item.periode);
                                            setShowRincianDialog(true);
                                          }}
                                        >
                                          <Eye className="h-3 w-3 mr-1" />
                                          Rincian
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {formatRupiah(item.total_pesantren || 0)}
                                      {rincian && rincian.pesantren.length > 0 && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-2 text-xs"
                                          onClick={() => {
                                            setSelectedPeriodeRincian(item.bulan || item.periode);
                                            setShowRincianDialog(true);
                                          }}
                                        >
                                          <Eye className="h-3 w-3 mr-1" />
                                          Rincian
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {formatRupiah(item.total_asrama_konsumsi || 0)}
                                      {rincian && rincian.asrama_konsumsi.length > 0 && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-2 text-xs"
                                          onClick={() => {
                                            setSelectedPeriodeRincian(item.bulan || item.periode);
                                            setShowRincianDialog(true);
                                          }}
                                        >
                                          <Eye className="h-3 w-3 mr-1" />
                                          Rincian
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {formatRupiah(item.total_bantuan_yayasan || 0)}
                                      {rincian && rincian.bantuan_langsung.length > 0 && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 px-2 text-xs"
                                          onClick={() => {
                                            setSelectedPeriodeRincian(item.bulan || item.periode);
                                            setShowRincianDialog(true);
                                          }}
                                        >
                                          <Eye className="h-3 w-3 mr-1" />
                                          Rincian
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-semibold">
                                    <div className="flex items-center justify-end gap-2">
                                      {formatRupiah(item.total || 0)}
                                      {rincian && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-6 px-2 text-xs"
                                          onClick={() => {
                                            setSelectedPeriodeRincian(item.bulan || item.periode);
                                            setShowRincianDialog(true);
                                          }}
                                        >
                                          <Eye className="h-3 w-3 mr-1" />
                                          Lihat Semua
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              // Non-Mukim/Reguler: Standard summary cards
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
              </div>
            )}

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
                  <div className="overflow-x-auto max-w-full">
                    {/* Desktop Table */}
                    <Table className="hidden md:table w-full">
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
                            className={
                              payment.sumber === 'Orang Tua Asuh Santri' 
                                ? 'bg-green-50/50 hover:bg-green-50' 
                                : payment.sumber === 'Yayasan'
                                ? 'bg-blue-50/50 hover:bg-blue-50'
                                : 'hover:bg-muted/50'
                            }
                          >
                            <TableCell className="font-medium">{formatDate(payment.tanggal)}</TableCell>
                            <TableCell className="text-sm">{payment.periode || '-'}</TableCell>
                            <TableCell className="font-medium">{payment.jenis}</TableCell>
                            <TableCell className="font-semibold">{formatRupiah(payment.nominal)}</TableCell>
                            <TableCell>
                              <Badge 
                                className={
                                  payment.sumber === 'Orang Tua Asuh Santri' 
                                    ? 'bg-green-100 text-green-800 border-green-200' 
                                    : payment.sumber === 'Yayasan'
                                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                                    : 'bg-gray-100 text-gray-800 border-gray-200'
                                }
                              >
                                {payment.sumber}
                                {payment.donatur_name && (
                                  <span className="ml-1 text-xs font-normal">({payment.donatur_name})</span>
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
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
                          className={
                            payment.sumber === 'Orang Tua Asuh Pendidikan' 
                              ? 'border-green-200 bg-green-50/50' 
                              : payment.sumber === 'Yayasan'
                              ? 'border-blue-200 bg-blue-50/50'
                              : 'border-gray-200'
                          }
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{payment.jenis}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{payment.periode}</p>
                              </div>
                              <Badge 
                                className={
                                  payment.sumber === 'Orang Tua Asuh Santri' 
                                    ? 'bg-green-100 text-green-800 border-green-200 text-xs' 
                                    : payment.sumber === 'Yayasan'
                                    ? 'bg-blue-100 text-blue-800 border-blue-200 text-xs'
                                    : 'bg-gray-100 text-gray-800 border-gray-200 text-xs'
                                }
                              >
                                {payment.sumber}
                              </Badge>
                            </div>
                            <div className="text-lg font-bold mb-2">{formatRupiah(payment.nominal)}</div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{formatDate(payment.tanggal)}</span>
                              {payment.donatur_name && (
                                <span className="text-green-700 font-medium">{payment.donatur_name}</span>
                              )}
                            </div>
                            {payment.keterangan && (
                              <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">{payment.keterangan}</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dialog Rincian Item */}
            <Dialog open={showRincianDialog} onOpenChange={setShowRincianDialog}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Rincian Item - {selectedPeriodeRincian || 'Periode'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {selectedPeriodeRincian && (() => {
                    const rincian = getRincianItemByPeriode(selectedPeriodeRincian);
                    if (!rincian) {
                      return (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>Tidak ada rincian item untuk periode ini</p>
                        </div>
                      );
                    }

                    const totalFormal = rincian.formal.reduce((sum, item) => sum + item.nominal, 0);
                    const totalPesantren = rincian.pesantren.reduce((sum, item) => sum + item.nominal, 0);
                    const totalAsrama = rincian.asrama_konsumsi.reduce((sum, item) => sum + item.nominal, 0);
                    const totalBantuan = rincian.bantuan_langsung.reduce((sum, item) => sum + item.nominal, 0);

                    return (
                      <div className="space-y-4">
                        {/* Pendidikan Formal */}
                        {rincian.formal.length > 0 && (
                          <Card className="border-primary/20">
                            <CardHeader className="pb-3 bg-primary/5">
                              <CardTitle className="text-base font-semibold text-primary">
                                Pendidikan Formal
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                              <div className="space-y-2">
                                {rincian.formal.map((item, idx) => (
                                  <div key={idx} className="flex items-center justify-between py-2 border-b border-primary/10 last:border-0">
                                    <span className="text-sm text-foreground">{item.jenis}</span>
                                    <span className="text-sm font-semibold text-foreground">
                                      {formatRupiah(item.nominal)}
                                    </span>
                                  </div>
                                ))}
                                <div className="flex items-center justify-between pt-2 mt-2 border-t-2 border-primary/20">
                                  <span className="font-semibold text-primary">Subtotal</span>
                                  <span className="font-bold text-primary">{formatRupiah(totalFormal)}</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Pendidikan Pesantren */}
                        {rincian.pesantren.length > 0 && (
                          <Card className="border-green-200">
                            <CardHeader className="pb-3 bg-green-50">
                              <CardTitle className="text-base font-semibold text-green-900">
                                Pendidikan Pesantren
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                              <div className="space-y-2">
                                {rincian.pesantren.map((item, idx) => (
                                  <div key={idx} className="flex items-center justify-between py-2 border-b border-green-100 last:border-0">
                                    <span className="text-sm text-foreground">{item.jenis}</span>
                                    <span className="text-sm font-semibold text-foreground">
                                      {formatRupiah(item.nominal)}
                                    </span>
                                  </div>
                                ))}
                                <div className="flex items-center justify-between pt-2 mt-2 border-t-2 border-green-200">
                                  <span className="font-semibold text-green-900">Subtotal</span>
                                  <span className="font-bold text-green-900">{formatRupiah(totalPesantren)}</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Asrama & Konsumsi Santri */}
                        {rincian.asrama_konsumsi.length > 0 && (
                          <Card className="border-amber-200">
                            <CardHeader className="pb-3 bg-amber-50">
                              <CardTitle className="text-base font-semibold text-amber-900">
                                Asrama & Konsumsi Santri
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                              <div className="space-y-2">
                                {rincian.asrama_konsumsi.map((item, idx) => (
                                  <div key={idx} className="flex items-center justify-between py-2 border-b border-amber-100 last:border-0">
                                    <span className="text-sm text-foreground">{item.jenis}</span>
                                    <span className="text-sm font-semibold text-foreground">
                                      {formatRupiah(item.nominal)}
                                    </span>
                                  </div>
                                ))}
                                <div className="flex items-center justify-between pt-2 mt-2 border-t-2 border-amber-200">
                                  <span className="font-semibold text-amber-900">Subtotal</span>
                                  <span className="font-bold text-amber-900">{formatRupiah(totalAsrama)}</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Bantuan Yayasan */}
                        {rincian.bantuan_langsung.length > 0 && (
                          <Card className="border-purple-200">
                            <CardHeader className="pb-3 bg-purple-50">
                              <CardTitle className="text-base font-semibold text-purple-900">
                                Bantuan Yayasan
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                              <div className="space-y-2">
                                {rincian.bantuan_langsung.map((item, idx) => (
                                  <div key={idx} className="flex items-center justify-between py-2 border-b border-purple-100 last:border-0">
                                    <span className="text-sm text-foreground">{item.jenis}</span>
                                    <span className="text-sm font-semibold text-foreground">
                                      {formatRupiah(item.nominal)}
                                    </span>
                                  </div>
                                ))}
                                <div className="flex items-center justify-between pt-2 mt-2 border-t-2 border-purple-200">
                                  <span className="font-semibold text-purple-900">Subtotal</span>
                                  <span className="font-bold text-purple-900">{formatRupiah(totalBantuan)}</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Total Keseluruhan */}
                        <Card className="border-2 border-primary/30 bg-primary/5">
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <span className="text-lg font-bold text-primary">Total Keseluruhan</span>
                              <span className="text-xl font-bold text-primary">
                                {formatRupiah(totalFormal + totalPesantren + totalAsrama + totalBantuan)}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })()}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowRincianDialog(false)}>
                    Tutup
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Tab Monitoring */}
          <TabsContent value="monitoring" className="space-y-6 mt-6">
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

      {/* Mobile Bottom Navigation - Simplified */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-primary/10 shadow-lg md:hidden">
        <div className="grid grid-cols-5 h-16">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  // Scroll to top on mobile
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 transition-all duration-200 relative",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground active:text-primary"
                )}
              >
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-b-full" />
                )}
                <Icon className={cn(
                  "w-5 h-5 transition-all",
                  isActive && "scale-110"
                )} />
                <span className={cn(
                  "text-[10px] font-medium leading-tight",
                  isActive && "font-semibold"
                )}>
                  {item.label.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Settings Panel - Superapp Style */}
      <Dialog open={showSettingsPanel} onOpenChange={setShowSettingsPanel}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-0">
          <div className="sticky top-0 bg-white border-b border-primary/10 px-6 py-4 z-10">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Menu
              </DialogTitle>
            </DialogHeader>
          </div>
          
          <div className="px-6 py-4 space-y-4">
            {/* Profile Photo Section */}
            <div className="flex flex-col items-center py-4 border-b border-primary/10">
              <div className="relative mb-3">
                <Avatar className="w-20 h-20 border-2 border-primary/20 shadow-md">
                  <AvatarImage 
                    src={photoPreview || getSafeAvatarUrl(santri?.foto_profil)} 
                    alt={santri?.nama_lengkap || "Santri"} 
                  />
                  <AvatarFallback className="text-lg font-semibold">
                    {(santri?.nama_lengkap || 'S').split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0,2)}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="default"
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary hover:bg-primary/90 border-2 border-white shadow-md p-0"
                  onClick={() => document.getElementById('photo-upload-settings')?.click()}
                  disabled={uploadingPhoto}
                >
                  {uploadingPhoto ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 text-white" />
                  )}
                </Button>
                <input
                  id="photo-upload-settings"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>
              <h3 className="font-semibold text-lg">{santri?.nama_lengkap || 'Santri'}</h3>
              <p className="text-sm text-muted-foreground">{santri?.kategori || 'Kategori'}</p>
            </div>

            {/* Main Menu Items - Superapp Style */}
            <div className="space-y-2">
              {/* Atur Profil Santri */}
              <Button
                variant="ghost"
                className="w-full justify-start h-auto py-4 px-4 hover:bg-primary/5"
                onClick={() => {
                  setActiveTab('informasi');
                  setShowSettingsPanel(false);
                  setTimeout(() => {
                    const tabContent = document.querySelector('[data-value="informasi"]');
                    if (tabContent) {
                      tabContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }, 100);
                }}
              >
                <div className="p-2 bg-primary/10 rounded-lg mr-3">
                  <UserCircle className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold">Atur Profil Santri</div>
                  <div className="text-xs text-muted-foreground">Kelola data pribadi dan informasi santri</div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Button>

              {/* Dokumen */}
              <Button
                variant="ghost"
                className="w-full justify-start h-auto py-4 px-4 hover:bg-primary/5"
                onClick={() => {
                  setActiveTab('informasi');
                  setShowSettingsPanel(false);
                  setTimeout(() => {
                    // Scroll to dokumen section
                    const dokumenSection = document.querySelector('[data-dokumen-section]');
                    if (dokumenSection) {
                      dokumenSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }, 100);
                }}
              >
                <div className="p-2 bg-primary/10 rounded-lg mr-3">
                  <FolderOpen className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold">Dokumen</div>
                  <div className="text-xs text-muted-foreground">Kelola dokumen dan verifikasi</div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Button>

              {/* Kelola Akun */}
              <Button
                variant="ghost"
                className="w-full justify-start h-auto py-4 px-4 hover:bg-primary/5"
                onClick={() => {
                  navigate('/change-password');
                  setShowSettingsPanel(false);
                }}
              >
                <div className="p-2 bg-primary/10 rounded-lg mr-3">
                  <Lock className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold">Kelola Akun</div>
                  <div className="text-xs text-muted-foreground">Ubah password dan pengaturan akun</div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Button>

              {/* Logout - only show for santri viewing own profile */}
              {isViewingOwnProfile && (
                <>
                  <div className="border-t border-primary/10 my-2"></div>
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-auto py-4 px-4 hover:bg-red-50 text-red-600 hover:text-red-700"
                    onClick={async () => {
                      setShowSettingsPanel(false);
                      try {
                        await logout();
                        // Use window.location.replace to force full page reload and clear all state
                        // replace() prevents back button from going back to logged-in state
                        setTimeout(() => {
                          window.location.replace('/auth');
                        }, 100); // Small delay to ensure logout completes
                      } catch (error) {
                        console.error('Error during logout:', error);
                        // Still redirect even if logout fails
                        window.location.replace('/auth');
                      }
                    }}
                  >
                    <div className="p-2 bg-red-100 rounded-lg mr-3">
                      <LogOut className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold">Logout</div>
                      <div className="text-xs text-muted-foreground">Keluar dari akun</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </Button>
                </>
              )}
            </div>

            {/* Quick Navigation */}
            <div className="pt-4 border-t border-primary/10">
              <div className="text-xs font-semibold text-muted-foreground uppercase mb-3">Navigasi Cepat</div>
              <div className="grid grid-cols-2 gap-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <Button
                      key={item.id}
                      variant="ghost"
                      className={cn(
                        "flex flex-col items-center justify-center h-auto py-3 px-2",
                        isActive && "bg-primary/5"
                      )}
                      onClick={() => {
                        setActiveTab(item.id);
                        setShowSettingsPanel(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      <Icon className={cn(
                        "w-5 h-5 mb-1",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )} />
                      <span className={cn(
                        "text-xs font-medium",
                        isActive && "text-primary"
                      )}>
                        {item.label}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Account Info */}
            <div className="pt-4 border-t border-primary/10">
              <div className="px-4 py-3 bg-primary/5 rounded-lg">
                <div className="text-xs font-semibold text-muted-foreground mb-2">Informasi Akun</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kategori:</span>
                    <span className="font-medium">{santri?.kategori || 'Belum dipilih'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge className={cn("text-xs", getStatusColor(santri?.status_santri))}>
                      {santri?.status_santri || 'Tidak Diketahui'}
                    </Badge>
                  </div>
                  {santri?.id_santri && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ID Santri:</span>
                      <span className="font-medium font-mono text-xs">{santri.id_santri}</span>
                    </div>
                  )}
                  {activeSemester && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Semester Aktif:</span>
                      <span className="font-medium text-xs">{activeSemester.nama} {activeSemester.tahun_ajaran?.nama}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdrawal Dialog */}
      <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownCircle className="w-5 h-5 text-primary" />
              Tarik Tabungan Santri
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Santri Info */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm mb-2">
                  <User className="h-4 w-4 text-primary" />
                  <span className="font-medium">{santri?.nama_lengkap || santriName || 'Santri'}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Saldo saat ini: <span className="font-semibold text-primary">{formatRupiah(saldoTabungan)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="nominal">Nominal Penarikan *</Label>
                <Input
                  id="nominal"
                  type="number"
                  placeholder="Masukkan nominal penarikan"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  min="1"
                  step="1"
                  className="mt-1"
                />
                {withdrawAmount && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatRupiah(parseFloat(withdrawAmount) || 0)}
                  </p>
                )}
                {withdrawAmount && parseFloat(withdrawAmount) > saldoTabungan && (
                  <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Saldo tidak mencukupi
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="deskripsi">Deskripsi</Label>
                <Textarea
                  id="deskripsi"
                  placeholder="Contoh: Penarikan untuk kebutuhan pribadi"
                  value={withdrawDescription}
                  onChange={(e) => setWithdrawDescription(e.target.value)}
                  rows={2}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="catatan">Catatan Tambahan (Opsional)</Label>
                <Textarea
                  id="catatan"
                  placeholder="Catatan tambahan jika diperlukan"
                  value={withdrawNote}
                  onChange={(e) => setWithdrawNote(e.target.value)}
                  rows={2}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowWithdrawDialog(false);
                setWithdrawAmount('');
                setWithdrawDescription('');
                setWithdrawNote('');
              }}
              disabled={isWithdrawing}
            >
              Batal
            </Button>
            <Button 
              onClick={handleWithdraw}
              disabled={isWithdrawing || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > saldoTabungan}
              className="bg-primary hover:bg-primary/90"
            >
              {isWithdrawing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <ArrowDownCircle className="w-4 h-4 mr-2" />
                  Tarik Tabungan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add bottom padding for mobile navigation */}
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default SantriProfileRedesigned;

