import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  ArrowLeft, 
  BookOpen, 
  HandCoins, 
  User, 
  Users, 
  FileText, 
  Calendar, 
  Phone, 
  MapPin,
  Edit, 
  CreditCard,
  DollarSign,
  Clock,
  Settings,
  Plus,
  ChevronRight,
  Activity,
  BarChart3,
  Shield,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatRupiah } from "@/utils/inventaris.utils";
import { cn } from "@/lib/utils";
import { getSafeAvatarUrl } from '@/utils/url.utils';
import { calculateAge } from '@/lib/utils';
import { toast } from 'sonner';
import DokumenSantriTab from "@/components/DokumenSantriTab";
import BantuanYayasanTab from "@/components/BantuanYayasanTab";
import SantriFormWizard from "@/components/SantriFormWizard";
import SantriDataAggregator from "@/components/SantriDataAggregator";
import SantriProfileSettings from "@/components/SantriProfileSettings";
import { ProfileHelper } from "@/utils/profile.helper";
import { TabunganSantriCard } from '@/components/TabunganSantri/TabunganSantriCard';

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
  nama_sekolah?: string;
  kelas?: string;
  kelas_sekolah?: string;
  nomor_wali_kelas?: string;
  anak_ke?: number;
  jumlah_saudara?: number;
  hobi?: string;
  cita_cita?: string;
  wali_data?: any[];
  program_data?: any[];
}

// Minimal Info Card
const MinimalInfoCard = ({ 
  icon: Icon, 
  label, 
  value, 
  subtitle 
}: {
  icon: any;
  label: string;
  value: string | React.ReactNode;
  subtitle?: string;
}) => (
  <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
    <Icon className="w-5 h-5 text-gray-500" />
    <div className="flex-1 min-w-0">
      <p className="text-sm text-gray-600">{label}</p>
      <div className="font-medium text-gray-900 truncate">
        {typeof value === 'string' ? value : value}
      </div>
      {subtitle && (
        <p className="text-xs text-gray-500">{subtitle}</p>
      )}
    </div>
  </div>
);

// Status Badge
const StatusBadge = ({ status, type }: { status: string; type: 'success' | 'warning' | 'danger' | 'info' }) => {
  const variants = {
    success: 'bg-green-50 text-green-700 border-green-200',
    warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200'
  };

  return (
    <Badge className={`${variants[type]} text-xs px-2 py-1 border`}>
      {status}
    </Badge>
  );
};

// Minimal Stats Grid
const MinimalStatsGrid = ({ santri, financialSummary }: { santri: SantriData; financialSummary: any }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <div className="p-4 bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">Status</p>
          <p className="text-lg font-semibold text-gray-900">{santri.status_santri || (santri as any).status_baru}</p>
        </div>
        <User className="w-8 h-8 text-blue-500" />
      </div>
    </div>
    
    <div className="p-4 bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">Program</p>
          <p className="text-lg font-semibold text-gray-900">{santri.program_data?.length || 0}</p>
        </div>
        <BookOpen className="w-8 h-8 text-green-500" />
      </div>
    </div>
    
    {/* Hide Bantuan card for Binaan Mukim - redundant with Bantuan Yayasan tab */}
    {santri?.kategori !== 'Binaan Mukim' && (
      <div className="p-4 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Bantuan Yayasan</p>
            <p className="text-lg font-semibold text-gray-900">{formatRupiah(financialSummary?.total_bantuan || 0)}</p>
          </div>
          <HandCoins className="w-8 h-8 text-yellow-500" />
        </div>
      </div>
    )}
    
    <div className="p-4 bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">Tabungan</p>
          <p className="text-lg font-semibold text-gray-900">{formatRupiah(financialSummary?.saldo_tabungan || 0)}</p>
        </div>
        <DollarSign className="w-8 h-8 text-purple-500" />
      </div>
    </div>
  </div>
);

// Minimal Profile Header
const MinimalProfileHeader = ({ santri, onEditProfile }: { santri: SantriData; onEditProfile: () => void }) => {
  const generateInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isBantuanRecipient = useMemo(() =>
    (santri?.kategori === 'Binaan Mukim' || santri?.kategori === 'Binaan Non-Mukim') ||
    (santri?.tipe_pembayaran === 'Bantuan Yayasan'),
    [santri?.kategori, santri?.tipe_pembayaran]
  );

  return (
    <Card className="border border-gray-200">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
          <div className="relative">
            <Avatar className="w-20 h-20 border-2 border-gray-200">
              <AvatarImage src={getSafeAvatarUrl(santri.foto_profil)} />
              <AvatarFallback className="text-lg font-medium bg-gray-100 text-gray-700">
                {generateInitials(santri.nama_lengkap)}
              </AvatarFallback>
            </Avatar>
            {isBantuanRecipient && (
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <HandCoins className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          
          <div className="flex-1 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{santri.nama_lengkap}</h1>
                <div className="flex flex-wrap gap-2 mt-2">
                  <StatusBadge status={santri.status_santri || (santri as any).status_baru} type="success" />
                  <StatusBadge status={santri.kategori} type="info" />
                </div>
              </div>
              
              {/* Controls removed to avoid duplication; use header "Pengaturan" */}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <MinimalInfoCard
                icon={User}
                label="ID Santri"
                value={santri.id_santri || 'Belum ada'}
              />
              <MinimalInfoCard
                icon={Calendar}
                label="Umur"
                value={santri.tanggal_lahir ? `${calculateAge(santri.tanggal_lahir)} tahun` : '-'}
                subtitle={santri.tanggal_lahir ? formatDate(santri.tanggal_lahir) : ''}
              />
              <MinimalInfoCard
                icon={Phone}
                label="WhatsApp"
                value={santri.no_whatsapp || 'Belum ada'}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const SantriProfileMinimal = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Check if current user is santri (viewing own profile)
  const isCurrentUserSantri = user?.role === 'santri';
  
  const santriId = searchParams.get("santriId") || undefined;
  const santriName = searchParams.get("santriName") || undefined;
  const tabFromUrl = searchParams.get("tab") || "overview";

  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [loading, setLoading] = useState(true);
  const [santri, setSantri] = useState<SantriData | null>(null);
  const [programData, setProgramData] = useState<any[]>([]);
  const [waliData, setWaliData] = useState<any[]>([]);
  const [financialSummary, setFinancialSummary] = useState<any>(null);
  const [editingSantri, setEditingSantri] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editTab, setEditTab] = useState<string>('personal');

  // Load santri data
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
        supabase
          .from('santri_wali')
          .select('*')
          .eq('santri_id', santriId)
          .order('is_utama', { ascending: false })
      ]);

      if (programsResult.error) throw programsResult.error;
      if (waliResult.error) throw waliResult.error;

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

      // Load financial summary using aggregator
      try {
        const summary = await SantriDataAggregator.getComprehensiveSummary(
          santriId, 
          santriData.kategori, 
          santriData.status_sosial
        );
        setFinancialSummary(summary.financial);
      } catch (error) {
        console.error('Error loading comprehensive summary:', error);
        // Fallback to basic financial data
        setFinancialSummary({
          total_bantuan: 0,
          total_tagihan: 0,
          total_pembayaran: 0,
          saldo_tabungan: 0,
          hutang_bulanan: 0,
          status_pembayaran: 'belum_bayar'
        });
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
    (santri?.kategori === 'Binaan Mukim' || santri?.kategori === 'Binaan Non-Mukim') ||
    (santri?.tipe_pembayaran === 'Bantuan Yayasan'),
    [santri?.kategori, santri?.tipe_pembayaran]
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Memuat data santri...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!santri) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Santri tidak ditemukan</h3>
          <p className="text-gray-600 mb-4">Data santri dengan ID tersebut tidak tersedia</p>
          <Button onClick={() => navigate('/santri')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Data Santri
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
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
        </div>

        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Pengaturan
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => {
                setEditTab('personal');
                setShowForm(true);
                setEditingSantri(santriId);
              }}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Profil
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => {
                // TODO: Implement print PDF
                toast.info('Fitur print PDF akan segera tersedia');
              }}>
                <FileText className="w-4 h-4 mr-2" />
                Print PDF
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
      </div>

      {/* Profile Header */}
      <MinimalProfileHeader 
        santri={santri} 
        onEditProfile={() => {
          setEditTab('personal');
          setShowForm(true);
          setEditingSantri(santriId);
        }}
      />

      {/* Stats Grid */}
      <MinimalStatsGrid santri={santri} financialSummary={financialSummary} />

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`grid w-full ${santri?.kategori?.includes('Binaan') ? 'grid-cols-5' : 'grid-cols-3'} bg-white border border-gray-200`}>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Ringkasan
          </TabsTrigger>
          <TabsTrigger value="academic" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Akademik
          </TabsTrigger>
          {/* Bantuan Yayasan Tab - Only for Binaan */}
          {santri?.kategori?.includes('Binaan') && (
            <TabsTrigger value="bantuan" className="flex items-center gap-2">
              <HandCoins className="w-4 h-4" />
              Bantuan Yayasan
            </TabsTrigger>
          )}
          {/* Tabungan Tab - Only for Binaan */}
          {santri?.kategori?.includes('Binaan') && (
            <TabsTrigger value="tabungan" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Tabungan
            </TabsTrigger>
          )}
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Dokumen
          </TabsTrigger>
        </TabsList>

        {/* Tab: Overview */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Personal Information */}
            <Card className="border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="w-5 h-5 text-blue-600" />
                  Informasi Pribadi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <MinimalInfoCard
                  icon={User}
                  label="Nama Lengkap"
                  value={santri.nama_lengkap}
                />
                <MinimalInfoCard
                  icon={Calendar}
                  label="Tanggal Lahir"
                  value={santri.tanggal_lahir ? formatDate(santri.tanggal_lahir) : 'Belum diisi'}
                  subtitle={santri.tanggal_lahir ? `${calculateAge(santri.tanggal_lahir)} tahun` : ''}
                />
                <MinimalInfoCard
                  icon={MapPin}
                  label="Tempat Lahir"
                  value={santri.tempat_lahir || 'Belum diisi'}
                />
                <MinimalInfoCard
                  icon={Phone}
                  label="Nomor WhatsApp"
                  value={santri.no_whatsapp || 'Belum diisi'}
                />
              </CardContent>
            </Card>

            {/* Status & Category */}
            <Card className="border border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="w-5 h-5 text-green-600" />
                  Status & Kategori
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                  <MinimalInfoCard
                  icon={Activity}
                  label="Status Santri"
                    value={santri.status_santri || (santri as any).status_baru}
                />
                <MinimalInfoCard
                  icon={User}
                  label="Kategori"
                  value={santri.kategori}
                />
                <MinimalInfoCard
                  icon={DollarSign}
                  label="Tipe Pembayaran"
                  value={santri.tipe_pembayaran}
                />
                <MinimalInfoCard
                  icon={Clock}
                  label="Bergabung"
                  value={santri.created_at ? formatDate(santri.created_at) : 'Belum diisi'}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Academic */}
        <TabsContent value="academic" className="space-y-4">
          <Card className="border border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="w-5 h-5 text-green-600" />
                Program & Kelas Santri
              </CardTitle>
            </CardHeader>
            <CardContent>
              {programData.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Belum ditempatkan ke program</h3>
                  <p className="text-gray-600 mb-4">
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
                <div className="space-y-3">
                  {programData.map((program) => (
                    <div key={program.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{program.kelas_program || 'Kelas Belum Ditentukan'}</h4>
                          <p className="text-sm text-gray-600">{program.tingkat || 'Tingkat Belum Ditentukan'}</p>
                        </div>
                        <StatusBadge status="Aktif" type="success" />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Badge variant="outline" className="text-xs">
                              {program.kelas_program}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {program.rombel}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600">
                            <p>Mulai: {formatDate(program.tanggal_mulai)}</p>
                            <p>Berakhir: {formatDate(program.tanggal_selesai)}</p>
                          </div>
                        </div>

                        <div className="bg-gray-50 p-3 rounded-lg">
                          <h5 className="font-medium text-gray-900 mb-2">Informasi Biaya</h5>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Rombel:</span>
                              <span className="font-medium">
                                {program.rombel || 'Belum Ditentukan'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Subsidi:</span>
                              <span className="font-medium">
                                {program.subsidi_persen || 0}%
                              </span>
                            </div>
                            <div className="flex justify-between font-semibold border-t pt-1">
                              <span>Final:</span>
                              <span>
                                {formatRupiah(program.total_biaya_final || 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Bantuan Yayasan - Only for Binaan */}
        {santri?.kategori?.includes('Binaan') && (
          <TabsContent value="bantuan" className="space-y-4">
            <Card className="border border-gray-200">
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
                  santriId={santriId || ''}
                  santriName={santri?.nama_lengkap}
                  santriNisn={santri?.nisn}
                  santriIdSantri={santri?.id_santri}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Tab: Tabungan - Only for Binaan */}
        {santri?.kategori?.includes('Binaan') && (
          <TabsContent value="tabungan" className="space-y-4">
            <Card className="border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  Tabungan Santri
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Kelola tabungan dan riwayat transaksi santri {santri?.kategori === 'Binaan Mukim' ? 'Mukim' : 'Non-Mukim'}
                </p>
              </CardHeader>
              <CardContent>
                {santriId && santri?.nama_lengkap ? (
                  <TabunganSantriCard
                    santriId={santriId}
                    santriName={santri.nama_lengkap}
                    isAdmin={true}
                    onRefresh={() => {
                      // Refresh data if needed
                      console.log('Tabungan refreshed');
                    }}
                  />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Data santri tidak tersedia
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Tab: Documents */}
        <TabsContent value="documents" className="space-y-4">
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
      </Tabs>

      {/* Settings Modal */}
      {showSettings && (
        <SantriProfileSettings
          santriId={santriId || ''}
          santriName={santri?.nama_lengkap || ''}
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

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
    </div>
  );
};

export default SantriProfileMinimal;
