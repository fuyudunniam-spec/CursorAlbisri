import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  ArrowLeft, 
  Award, 
  BookOpen, 
  HandCoins, 
  User, 
  Users, 
  GraduationCap, 
  FileText, 
  Calendar, 
  Phone, 
  MapPin, 
  Mail,
  Edit, 
  AlertCircle,
  AlertTriangle,
  CreditCard,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Settings,
  Plus,
  Eye,
  Download,
  Upload,
  UserCheck,
  MoreVertical,
  MoreHorizontal,
  Shield,
  Activity,
  BarChart3,
  PieChart,
  Target,
  Zap,
  Star,
  Heart,
  Globe,
  Lock,
  Unlock,
  ChevronRight,
  Info,
  ExternalLink
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatRupiah } from "@/utils/inventaris.utils";
import { getSafeAvatarUrl } from '@/utils/url.utils';
import { calculateAge } from '@/lib/utils';
import { toast } from 'sonner';
import DokumenSantriTab from "@/components/DokumenSantriTab";
import BantuanYayasanTab from "@/components/BantuanYayasanTab";
import SantriFormWizard from "@/components/SantriFormWizard";
import SantriSettingsPanel from "@/components/SantriSettingsPanel";
import SantriDataAggregator from "@/components/SantriDataAggregator";
import SantriDataValidationPanel from "@/components/SantriDataValidationPanel";
import { ProfileHelper } from "@/utils/profile.helper";

interface SantriData {
  id: string;
  nis?: string;
  nama_lengkap: string;
  tempat_lahir?: string;
  tanggal_lahir?: string;
  jenis_kelamin: string;
  kategori: string;
  tipe_pembayaran: string;
  status_santri: string;
  status_approval: string;
  status_sosial?: string;
  alamat?: string;
  no_whatsapp?: string;
  foto_profil?: string;
  created_at?: string;
  updated_at?: string;
  // Extended fields
  nama_sekolah?: string;
  kelas?: string;
  kelas_sekolah?: string;
  nomor_wali_kelas?: string;
  // Formal education fields
  jenjang_formal?: string;
  kelas_formal?: string;
  // Additional fields
  id_santri?: string;
  nik?: string;
  nisn?: string;
  status_baru?: string;
  golongan_darah?: string;
  tinggi_badan?: number;
  berat_badan?: number;
  riwayat_penyakit?: string;
  alergi?: string;
  kondisi_khusus?: string;
  pernah_rawat_inap?: boolean;
  disabilitas_khusus?: string;
  obat_khusus?: string;
  keterangan_rawat_inap?: string;
  // Binaan fields
  anak_ke?: number;
  jumlah_saudara?: number;
  hobi?: string;
  cita_cita?: string;
  // Related data
  wali_data?: any[];
  program_data?: any[];
  financial_summary?: {
    total_bantuan: number;
    total_tagihan: number;
    total_pembayaran: number;
    saldo_tabungan: number;
  };
}

// Modern Info Card Component
const ModernInfoCard = ({ 
  icon: Icon, 
  iconColor, 
  iconBg, 
  label, 
  value, 
  badge,
  trend,
  subtitle,
  action
}: {
  icon: any;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string | React.ReactNode;
  badge?: React.ReactNode;
  trend?: { value: string; positive: boolean };
  subtitle?: string;
  action?: React.ReactNode;
}) => (
  <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/50 backdrop-blur-sm">
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <div className={`p-3 ${iconBg} rounded-xl group-hover:scale-110 transition-transform duration-300`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">{label}</p>
            <div className="flex items-center gap-3 mt-1">
              {typeof value === 'string' ? (
                <p className="font-bold text-slate-900 text-lg">{value}</p>
              ) : (
                <div className="font-bold text-slate-900 text-lg">{value}</div>
              )}
              {badge}
            </div>
            {subtitle && (
              <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
            )}
            {trend && (
              <div className={`flex items-center gap-1 mt-2 text-xs ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp className="w-3 h-3" />
                <span>{trend.value}</span>
              </div>
            )}
          </div>
        </div>
        {action && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {action}
          </div>
        )}
      </div>
    </CardContent>
  </Card>
);

// Status Badge Component
const StatusBadge = ({ status, type }: { status: string; type: 'primary' | 'success' | 'warning' | 'danger' | 'info' }) => {
  const variants = {
    primary: 'bg-blue-100 text-blue-800 border-blue-200',
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    danger: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-slate-100 text-slate-800 border-slate-200'
  };

  return (
    <Badge className={`${variants[type]} text-xs px-3 py-1 font-medium`}>
      {status}
    </Badge>
  );
};

// Quick Stats Component
const QuickStats = ({ santri, financialSummary }: { santri: SantriData; financialSummary: any }) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
    <ModernInfoCard
      icon={User}
      iconColor="text-blue-600"
      iconBg="bg-blue-100"
      label="Status Santri"
      value={santri.status_santri || (santri as any).status_baru}
      badge={<StatusBadge status={santri.status_santri || (santri as any).status_baru} type="success" />}
      subtitle={`Bergabung ${formatDate(santri.created_at || '')}`}
    />
    
    <ModernInfoCard
      icon={BookOpen}
      iconColor="text-emerald-600"
      iconBg="bg-emerald-100"
      label="Program Aktif"
      value={santri.program_data?.length || 0}
      subtitle={santri.program_data?.length === 0 ? 'Belum ditempatkan' : 'Sudah ditempatkan'}
      action={
        <Button variant="ghost" size="sm">
          <ChevronRight className="w-4 h-4" />
        </Button>
      }
    />
    
    {/* Finance-related fields */}
    {santri.jenjang_formal && (
      <ModernInfoCard
        icon={BookOpen}
        iconColor="text-green-600"
        iconBg="bg-green-100"
        label="Jenjang Formal"
        value={santri.jenjang_formal}
        subtitle={santri.kelas_formal ? `Kelas ${santri.kelas_formal}` : 'Kelas tidak ditentukan'}
      />
    )}
    
    <ModernInfoCard
      icon={DollarSign}
      iconColor="text-purple-600"
      iconBg="bg-purple-100"
      label="Saldo Tabungan"
      value={formatRupiah(financialSummary?.saldo_tabungan || 0)}
      subtitle="Total tabungan"
      trend={financialSummary?.saldo_tabungan > 0 ? { value: '+5%', positive: true } : undefined}
    />
  </div>
);

// Profile Header Component
const ProfileHeader = ({ santri, onEditProfile }: { santri: SantriData; onEditProfile: () => void }) => {
  const generateInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isBantuanRecipient = useMemo(() => 
    santri?.tipe_pembayaran === 'Bantuan Yayasan', 
    [santri?.tipe_pembayaran]
  );

  return (
    <Card className="border-0 shadow-xl bg-gradient-to-br from-slate-50 via-white to-slate-50 overflow-hidden">
      <CardContent className="p-0">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-emerald-500/5" />
        
        <div className="relative p-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
            {/* Avatar Section */}
            <div className="relative">
              <Avatar className="w-32 h-32 ring-8 ring-white shadow-2xl">
                <AvatarImage src={getSafeAvatarUrl(santri.foto_profil)} />
              <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-slate-600 to-slate-800 text-white">
                  {generateInitials(santri.nama_lengkap)}
                </AvatarFallback>
              </Avatar>
              {isBantuanRecipient && (
                <div className="absolute -top-2 -right-2 w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
            
            {/* Profile Info */}
            <div className="flex-1 space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <h1 className="text-4xl font-bold text-slate-900 mb-2">{santri.nama_lengkap}</h1>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status={santri.status_santri || (santri as any).status_baru} type="success" />
                      <StatusBadge status={santri.kategori} type="primary" />
                      {isBantuanRecipient && (
                        <StatusBadge status={santri.tipe_pembayaran} type="info" />
                      )}
                    </div>
                  </div>
                  
                </div>

                {/* Key Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-center gap-4 p-4 bg-white/70 rounded-xl backdrop-blur-sm">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">ID Santri</p>
                      <p className="font-semibold text-slate-900">{santri.id_santri || 'Belum ada'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 p-4 bg-white/70 rounded-xl backdrop-blur-sm">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <Calendar className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Umur</p>
                      <p className="font-semibold text-slate-900">
                        {santri.tanggal_lahir ? `${calculateAge(santri.tanggal_lahir)} tahun` : '-'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 p-4 bg-white/70 rounded-xl backdrop-blur-sm">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Phone className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">WhatsApp</p>
                      <p className="font-semibold text-slate-900">{santri.no_whatsapp || 'Belum ada'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const SantriProfileMaster = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const santriId = searchParams.get("santriId") || undefined;
  const santriName = searchParams.get("santriName") || undefined;

  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [santri, setSantri] = useState<SantriData | null>(null);
  const [programData, setProgramData] = useState<any[]>([]);
  const [waliData, setWaliData] = useState<any[]>([]);
  const [financialSummary, setFinancialSummary] = useState<any>(null);
  const [comprehensiveSummary, setComprehensiveSummary] = useState<any>(null);
  const [editingSantri, setEditingSantri] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editTab, setEditTab] = useState<string>('personal');

  // Load comprehensive santri data
  const loadSantriData = async () => {
    if (!santriId) return;

    try {
      setLoading(true);

      // Load main santri data
      const { data: santriData, error: santriError } = await supabase
        .from('santri')
        .select('*')
        .eq('id', santriId)
        .single();

      if (santriError) throw santriError;

      // Load related data in parallel
      const [programsResult, waliResult] = await Promise.all([
        // Kelas data (new)
        supabase
          .from('kelas_anggota')
          .select(`
            id,
            tanggal_mulai,
            tanggal_selesai,
            status,
            kelas:kelas_id(id, nama_kelas, program, rombel, tingkat, tahun_ajaran, semester)
          `)
          .eq('santri_id', santriId)
          .eq('status', 'Aktif'),
        
        // Wali data
        supabase
          .from('santri_wali')
          .select('*')
          .eq('santri_id', santriId)
          .order('is_utama', { ascending: false })
      ]);

      if (programsResult.error) throw programsResult.error;
      if (waliResult.error) throw waliResult.error;

      console.log('🔍 Loading santri data:', {
        id: santriData.id,
        nama: santriData.nama_lengkap,
        nik: santriData.nik,
        nisn: santriData.nisn,
        hobi: santriData.hobi,
        cita_cita: santriData.cita_cita,
        id_santri: santriData.id_santri
      });
      
      setSantri(santriData);
      const mapped = (programsResult.data || []).map((row: any) => ({
        id: row.id,
        kelas_program: row.kelas?.nama_kelas || '-',
        rombel: row.kelas?.rombel || null,
        tingkat: row.kelas?.tingkat || null,
        tanggal_mulai: row.tanggal_mulai || null,
        tanggal_selesai: row.tanggal_selesai || null,
        total_biaya_final: 0,
        subsidi_persen: 0,
        status_kelas: row.status || 'Aktif',
      }));
      setProgramData(mapped);
      setWaliData(waliResult.data || []);

      // Load comprehensive summary using aggregator
      try {
        const summary = await SantriDataAggregator.getComprehensiveSummary(
          santriId, 
          santriData.kategori, 
          santriData.status_sosial
        );
        setComprehensiveSummary(summary);
        setFinancialSummary(summary.financial);
      } catch (error) {
        console.error('Error loading comprehensive summary:', error);
        // Fallback to basic financial data
        const basicFinancial = {
          total_bantuan: 0,
          total_tagihan: 0,
          total_pembayaran: 0,
          saldo_tabungan: 0,
          hutang_bulanan: 0,
          status_pembayaran: 'belum_bayar'
        };
        setFinancialSummary(basicFinancial);
      }
    } catch (error) {
      console.error('Error loading santri data:', error);
      toast.error('Gagal memuat data santri');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSantriData();
  }, [santriId]);

  // Memoized calculations
  const isBantuanRecipient = useMemo(() => 
    santri?.tipe_pembayaran === 'Bantuan Yayasan' || santri?.kategori?.includes('Binaan'), 
    [santri?.tipe_pembayaran, santri?.kategori]
  );

  const availableTabs = useMemo(() => {
    if (!santri) return ['overview', 'academic', 'financial', 'documents'];
    return ProfileHelper.getAvailableTabs(santri.kategori, santri.tipe_pembayaran);
  }, [santri?.kategori, santri?.tipe_pembayaran]);

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground text-lg">Memuat profil santri...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!santri) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12">
          <User className="w-20 h-20 text-muted-foreground mx-auto mb-6" />
          <h3 className="text-2xl font-semibold mb-4">Santri tidak ditemukan</h3>
          <p className="text-muted-foreground mb-6">Data santri dengan ID tersebut tidak tersedia</p>
          <Button onClick={() => navigate('/santri')} size="lg">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Kembali ke Data Santri
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/santri')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Button>
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground flex items-center gap-3">
              <User className="w-8 h-8 text-primary" />
              Profil Santri
            </h1>
            <p className="text-muted-foreground">
              Data master individual santri - sumber terpusat untuk semua modul
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <MoreHorizontal className="w-4 h-4" />
              Aksi
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuItem onClick={() => setShowForm(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Profil Lengkap
            </DropdownMenuItem>
            
            {/* Only show admin actions if current user is NOT santri */}
            {!isCurrentUserSantri && (
              <>
                {programData.length === 0 && (
                  <DropdownMenuItem onClick={() => navigate(`/ploating-kelas?santriId=${santriId}`)}>
                    <BookOpen className="w-4 h-4 mr-2" />
                    Tempatkan ke Program
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuItem onClick={() => navigate('/keuangan')}>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Kelola Keuangan
                </DropdownMenuItem>
              </>
            )}
            
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={() => navigate('/santri')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali ke Daftar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Profile Header */}
      <ProfileHeader 
        santri={santri} 
        onEditProfile={() => {
          setEditTab('personal');
          setShowForm(true);
          setEditingSantri(santriId);
        }}
      />

      {/* Quick Stats */}
      <QuickStats santri={santri} financialSummary={financialSummary} />

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`grid w-full ${santri?.kategori?.includes('Binaan') ? 'grid-cols-7' : 'grid-cols-5'} bg-white/50 backdrop-blur-sm border-0 shadow-lg`}>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Ringkasan
          </TabsTrigger>
          <TabsTrigger value="academic" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Akademik
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Keuangan
          </TabsTrigger>
          {/* Bantuan Yayasan Tab - Only for Binaan */}
          {santri?.kategori?.includes('Binaan') && (
            <TabsTrigger value="bantuan" className="flex items-center gap-2">
              <HandCoins className="w-4 h-4" />
              Bantuan Yayasan
            </TabsTrigger>
          )}
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Dokumen
          </TabsTrigger>
          {/* Health Tab - Only for Binaan Mukim */}
          {santri?.kategori === 'Binaan Mukim' && (
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Kesehatan
            </TabsTrigger>
          )}
          <TabsTrigger value="validation" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Validasi
          </TabsTrigger>
        </TabsList>

        {/* Tab: Overview */}
        <TabsContent value="overview" className="space-y-6">
          {/* Cross-Module Summary */}
          {comprehensiveSummary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700">Status Akademik</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {comprehensiveSummary.academic.status_akademik === 'baik' ? 'Baik' : 
                         comprehensiveSummary.academic.status_akademik === 'cukup' ? 'Cukup' : 'Perlu Perhatian'}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        {comprehensiveSummary.academic.program_aktif}/{comprehensiveSummary.academic.total_program} program aktif
                      </p>
                    </div>
                    <div className="p-3 bg-blue-200 rounded-lg">
                      <BookOpen className="w-6 h-6 text-blue-800" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700">Status Keuangan</p>
                      <p className="text-2xl font-bold text-green-900">
                        {comprehensiveSummary.financial.status_pembayaran === 'lunas' ? 'Lunas' :
                         comprehensiveSummary.financial.status_pembayaran === 'sebagian' ? 'Sebagian' : 'Belum Bayar'}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        {formatRupiah(comprehensiveSummary.financial.hutang_bulanan)} hutang
                      </p>
                    </div>
                    <div className="p-3 bg-green-200 rounded-lg">
                      <DollarSign className="w-6 h-6 text-green-800" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700">Dokumen</p>
                      <p className="text-2xl font-bold text-purple-900">
                        {comprehensiveSummary.documents.status_verifikasi === 'lengkap' ? 'Lengkap' :
                         comprehensiveSummary.documents.status_verifikasi === 'sebagian' ? 'Sebagian' : 'Belum Lengkap'}
                      </p>
                      <p className="text-xs text-purple-600 mt-1">
                        {comprehensiveSummary.documents.dokumen_wajib_lengkap}/{comprehensiveSummary.documents.dokumen_wajib_total} dokumen wajib
                      </p>
                    </div>
                    <div className="p-3 bg-purple-200 rounded-lg">
                      <FileText className="w-6 h-6 text-purple-800" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-amber-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-amber-700">Kontak Wali</p>
                      <p className="text-2xl font-bold text-amber-900">
                        {comprehensiveSummary.wali.status_kontak === 'aktif' ? 'Aktif' : 'Tidak Aktif'}
                      </p>
                      <p className="text-xs text-amber-600 mt-1">
                        {comprehensiveSummary.wali.total_wali} wali terdaftar
                      </p>
                    </div>
                    <div className="p-3 bg-amber-200 rounded-lg">
                      <Users className="w-6 h-6 text-amber-800" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Information */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Informasi Pribadi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {/* ID Santri - Primary Identifier */}
                  <ModernInfoCard
                    icon={User}
                    iconColor="text-blue-600"
                    iconBg="bg-blue-100"
                    label="ID Santri"
                    value={santri.id_santri || 'Belum ada'}
                    subtitle="Identitas utama santri"
                  />
                  
                  <ModernInfoCard
                    icon={User}
                    iconColor="text-slate-600"
                    iconBg="bg-slate-100"
                    label="Nama Lengkap"
                    value={santri.nama_lengkap}
                  />
                  
                  <ModernInfoCard
                    icon={Calendar}
                    iconColor="text-emerald-600"
                    iconBg="bg-emerald-100"
                    label="Tanggal Lahir"
                    value={
                      <div>
                        <p className="font-semibold text-slate-800">
                          {santri.tanggal_lahir ? formatDate(santri.tanggal_lahir) : 'Belum diisi'}
                        </p>
                        {santri.tanggal_lahir && (
                          <p className="text-xs text-muted-foreground">
                            ({calculateAge(santri.tanggal_lahir)} tahun)
                          </p>
                        )}
                      </div>
                    }
                  />
                  
                  <ModernInfoCard
                    icon={MapPin}
                    iconColor="text-purple-600"
                    iconBg="bg-purple-100"
                    label="Tempat Lahir"
                    value={santri.tempat_lahir || 'Belum diisi'}
                  />
                  
                  <ModernInfoCard
                    icon={Phone}
                    iconColor="text-amber-600"
                    iconBg="bg-amber-100"
                    label="Nomor WhatsApp"
                    value={santri.no_whatsapp || 'Belum diisi'}
                  />

                  {/* NIK - Required for all */}
                  <ModernInfoCard
                    icon={Shield}
                    iconColor="text-red-600"
                    iconBg="bg-red-100"
                    label="NIK"
                    value={santri.nik || 'Belum diisi'}
                    subtitle="Nomor Induk Kependudukan (Wajib)"
                  />

                  {/* NISN - Optional for all */}
                  <ModernInfoCard
                    icon={GraduationCap}
                    iconColor="text-indigo-600"
                    iconBg="bg-indigo-100"
                    label="NISN"
                    value={santri.nisn || 'Belum diisi'}
                    subtitle="Nomor Induk Siswa Nasional (Opsional)"
                  />

                  {/* Hobi & Cita-cita - Optional for all */}
                  <ModernInfoCard
                    icon={Heart}
                    iconColor="text-pink-600"
                    iconBg="bg-pink-100"
                    label="Hobi"
                    value={santri.hobi || 'Belum diisi'}
                    subtitle="Hobi atau minat khusus"
                  />

                  <ModernInfoCard
                    icon={Target}
                    iconColor="text-orange-600"
                    iconBg="bg-orange-100"
                    label="Cita-cita"
                    value={santri.cita_cita || 'Belum diisi'}
                    subtitle="Cita-cita atau tujuan masa depan"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Status & Category Info */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-600" />
                  Status & Kategori
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <ModernInfoCard
                    icon={Activity}
                    iconColor="text-green-600"
                    iconBg="bg-green-100"
                    label="Status Santri"
                    value={santri.status_baru}
                    badge={<StatusBadge status={santri.status_baru} type="success" />}
                  />
                  
                  <ModernInfoCard
                    icon={Target}
                    iconColor="text-blue-600"
                    iconBg="bg-blue-100"
                    label="Kategori"
                    value={santri.kategori}
                    badge={<StatusBadge status={santri.kategori} type="primary" />}
                  />
                  
                  <ModernInfoCard
                    icon={DollarSign}
                    iconColor="text-purple-600"
                    iconBg="bg-purple-100"
                    label="Tipe Pembayaran"
                    value={santri.tipe_pembayaran}
                    badge={<StatusBadge status={santri.tipe_pembayaran} type="info" />}
                  />
                  
                  <ModernInfoCard
                    icon={Clock}
                    iconColor="text-slate-600"
                    iconBg="bg-slate-100"
                    label="Bergabung"
                    value={santri.created_at ? formatDate(santri.created_at) : 'Belum diisi'}
                  />

                  {/* Status Sosial - Only for Binaan */}
                  {santri.kategori?.includes('Binaan') && santri.status_sosial && (
                    <ModernInfoCard
                      icon={Heart}
                      iconColor="text-pink-600"
                      iconBg="bg-pink-100"
                      label="Status Sosial"
                      value={santri.status_sosial}
                      subtitle="Kondisi sosial ekonomi keluarga"
                    />
                  )}

                  {/* Anak Ke & Jumlah Saudara - Only for Binaan Mukim */}
                  {santri.kategori === 'Binaan Mukim' && (
                    <>
                      {santri.anak_ke && (
                        <ModernInfoCard
                          icon={Users}
                          iconColor="text-cyan-600"
                          iconBg="bg-cyan-100"
                          label="Anak Ke-"
                          value={santri.anak_ke.toString()}
                        />
                      )}
                      
                      {santri.jumlah_saudara && (
                        <ModernInfoCard
                          icon={Users}
                          iconColor="text-teal-600"
                          iconBg="bg-teal-100"
                          label="Jumlah Saudara"
                          value={santri.jumlah_saudara.toString()}
                        />
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Academic */}
        <TabsContent value="academic" className="space-y-6">
          {/* Riwayat Pendidikan - Only for Binaan Mukim */}
          {santri?.kategori === 'Binaan Mukim' && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-blue-600" />
                  Riwayat Pendidikan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <GraduationCap className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Riwayat Pendidikan</h3>
                  <p className="text-muted-foreground mb-4">
                    Data riwayat pendidikan akan ditampilkan di sini
                  </p>
                  <Button 
                    onClick={() => {
                      setEditTab('pendidikan');
                      setShowForm(true);
                      setEditingSantri(santriId);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit Riwayat Pendidikan
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-600" />
                Program & Kelas Santri
              </CardTitle>
            </CardHeader>
            <CardContent>
              {programData.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <BookOpen className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Belum ditempatkan ke program</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Santri belum ditempatkan ke program atau kelas tertentu.
                  </p>
                  {!isCurrentUserSantri && (
                    <Button 
                      onClick={() => navigate(`/akademik/kelas?santriId=${santriId}`)}
                      className="flex items-center gap-2"
                    >
                      <BookOpen className="w-4 h-4" />
                      Tempatkan ke Program
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {programData.map((program) => (
                    <Card key={program.id} className="border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold text-lg">{program.kelas_program || 'Kelas Belum Ditentukan'}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {program.tingkat || 'Tingkat Belum Ditentukan'}
                                </p>
                              </div>
                              <StatusBadge status="Aktif" type="success" />
                            </div>
                            
                            <div className="flex gap-2">
                              <Badge variant="outline" className="text-xs">
                                {program.kelas_program}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {program.rombel}
                              </Badge>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="bg-emerald-50 p-4 rounded-lg">
                              <h5 className="font-medium text-emerald-900 mb-2">Informasi Biaya</h5>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-emerald-700">Rombel:</span>
                                  <span className="font-medium text-emerald-900">
                                    {program.rombel || 'Belum Ditentukan'}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-emerald-700">Subsidi:</span>
                                  <span className="font-medium text-emerald-900">
                                    {program.subsidi_persen || 0}%
                                  </span>
                                </div>
                                <hr className="border-emerald-200" />
                                <div className="flex justify-between font-semibold">
                                  <span className="text-emerald-900">Biaya Final:</span>
                                  <span className="text-emerald-900">
                                    {formatRupiah(program.total_biaya_final || 0)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 justify-center">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate(`/santri/program-management/${santriId}?programId=${program.id}`)}
                              className="w-full"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Program
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate(`/keuangan?tab=tagihan&santriId=${santriId}`)}
                              className="w-full"
                            >
                              <CreditCard className="w-4 h-4 mr-2" />
                              Lihat Tagihan
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Financial */}
        <TabsContent value="financial" className="space-y-6">
          
          {/* Financial summary for Reguler/Mahasantri */}
          {!isBantuanRecipient && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  Tagihan & Pembayaran
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Ringkasan tagihan dan pembayaran untuk santri mandiri
                </p>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Tagihan & Pembayaran</h3>
                  <p className="text-muted-foreground mb-4">
                    Fitur tagihan otomatis akan segera tersedia
                  </p>
                  <Button variant="outline" disabled>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Lihat Tagihan
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Bantuan Yayasan - Only for Binaan */}
        {santri?.kategori?.includes('Binaan') && (
          <TabsContent value="bantuan" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HandCoins className="w-5 h-5 text-green-600" />
                  Bantuan Yayasan
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Transparansi bantuan dan distribusi yang diterima santri {santri?.kategori === 'Binaan Mukim' ? 'Mukim' : 'Non-Mukim'}
                </p>
              </CardHeader>
              <CardContent>
                <BantuanYayasanTab
                  key={`bantuan-${activeTab}-${Date.now()}`}
                  santriId={santriId || ''}
                  santriName={santri?.nama_lengkap}
                  santriNisn={santri?.nisn}
                  santriIdSantri={santri?.id_santri}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Tab: Documents */}
        <TabsContent value="documents" className="space-y-6">
          <DokumenSantriTab 
            santriId={santriId} 
            santriData={{
              status_sosial: santri?.status_sosial as 'Yatim' | 'Piatu' | 'Yatim Piatu' | 'Dhuafa',
              nama_lengkap: santri?.nama_lengkap || '',
              kategori: santri?.kategori || 'Reguler'
            }}
            isBantuanRecipient={isBantuanRecipient}
          />
        </TabsContent>

        {/* Tab: Health - Only for Binaan Mukim */}
        {santri?.kategori === 'Binaan Mukim' && (
          <TabsContent value="health" className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  Kondisi Kesehatan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Basic Health Info */}
                  <div className="space-y-4">
                    <ModernInfoCard
                      icon={Activity}
                      iconColor="text-red-600"
                      iconBg="bg-red-100"
                      label="Golongan Darah"
                      value={santri.golongan_darah || 'Belum diisi'}
                    />
                    
                    <ModernInfoCard
                      icon={Activity}
                      iconColor="text-blue-600"
                      iconBg="bg-blue-100"
                      label="Tinggi Badan"
                      value={santri.tinggi_badan ? `${santri.tinggi_badan} cm` : 'Belum diisi'}
                    />
                    
                    <ModernInfoCard
                      icon={Activity}
                      iconColor="text-green-600"
                      iconBg="bg-green-100"
                      label="Berat Badan"
                      value={santri.berat_badan ? `${santri.berat_badan} kg` : 'Belum diisi'}
                    />
                  </div>

                  {/* Medical History */}
                  <div className="space-y-4">
                    <ModernInfoCard
                      icon={AlertCircle}
                      iconColor="text-orange-600"
                      iconBg="bg-orange-100"
                      label="Riwayat Penyakit"
                      value={santri.riwayat_penyakit || 'Tidak ada'}
                    />
                    
                    <ModernInfoCard
                      icon={AlertTriangle}
                      iconColor="text-yellow-600"
                      iconBg="bg-yellow-100"
                      label="Alergi"
                      value={santri.alergi || 'Tidak ada'}
                    />
                    
                    <ModernInfoCard
                      icon={Heart}
                      iconColor="text-pink-600"
                      iconBg="bg-pink-100"
                      label="Kondisi Khusus"
                      value={santri.kondisi_khusus || 'Tidak ada'}
                    />
                  </div>
                </div>

                {/* Additional Health Info */}
                {(santri.pernah_rawat_inap || santri.disabilitas_khusus || santri.obat_khusus) && (
                  <div className="pt-4 border-t border-slate-200">
                    <h4 className="font-semibold text-slate-800 mb-3">Informasi Tambahan</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {santri.pernah_rawat_inap && (
                        <ModernInfoCard
                          icon={Activity}
                          iconColor="text-red-600"
                          iconBg="bg-red-100"
                          label="Pernah Rawat Inap"
                          value={santri.keterangan_rawat_inap || 'Ya'}
                        />
                      )}
                      
                      {santri.disabilitas_khusus && (
                        <ModernInfoCard
                          icon={Heart}
                          iconColor="text-purple-600"
                          iconBg="bg-purple-100"
                          label="Disabilitas Khusus"
                          value={santri.disabilitas_khusus}
                        />
                      )}
                      
                      {santri.obat_khusus && (
                        <ModernInfoCard
                          icon={Activity}
                          iconColor="text-blue-600"
                          iconBg="bg-blue-100"
                          label="Obat Khusus"
                          value={santri.obat_khusus}
                        />
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Tab: Validation */}
        <TabsContent value="validation" className="space-y-6">
          <SantriDataValidationPanel 
            santriId={santriId || ''}
            santriName={santri?.nama_lengkap || ''}
            onRefresh={loadSantriData}
          />
        </TabsContent>
      </Tabs>

      {/* Santri Form Modal */}
      {showForm && (
        <SantriFormWizard
          santriId={editingSantri || undefined}
          initialTab={editTab}
          onClose={() => {
            setShowForm(false);
            setEditingSantri(null);
          }}
          onSave={() => {
            setShowForm(false);
            setEditingSantri(null);
            loadSantriData();
          }}
        />
      )}

      {/* Settings Panel */}
      {showSettings && santri && (
        <SantriSettingsPanel
          santriId={santriId || ''}
          santriName={santri.nama_lengkap}
          santriCategory={santri.kategori}
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};

export default SantriProfileMaster;
