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
  Boxes, 
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
  BookOpen,
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
  Shield
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatRupiah } from "@/utils/inventaris.utils";
import { getSafeAvatarUrl } from '@/utils/url.utils';
import { calculateAge } from '@/lib/utils';
import { toast } from 'sonner';
import DokumenSantriTab from "@/components/DokumenSantriTab";
import SantriFormWizard from "@/components/SantriFormWizard";
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
  status_baru: string;
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
  // Binaan fields
  anak_ke?: number;
  jumlah_saudara?: number;
  hobi?: string;
  cita_cita?: string;
  // Wali data
  wali_data?: any[];
  // Program data
  program_data?: any[];
  // Bantuan data
  bantuan_data?: any[];
}

// Helper component for info cards
const InfoCard = ({ 
  icon: Icon, 
  iconColor, 
  iconBg, 
  label, 
  value, 
  badge 
}: {
  icon: any;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string | React.ReactNode;
  badge?: React.ReactNode;
}) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardContent className="p-4">
      <div className="flex items-center space-x-3">
        <div className={`p-2 ${iconBg} rounded-lg`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <div className="flex items-center gap-2">
            {typeof value === 'string' ? (
              <p className="font-semibold text-slate-800 truncate">{value}</p>
            ) : (
              value
            )}
            {badge}
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

const SantriProfileEnhanced = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Check if current user is santri (viewing own profile)
  const isCurrentUserSantri = user?.role === 'santri';
  
  const santriId = searchParams.get("santriId") || undefined;
  const santriName = searchParams.get("santriName") || undefined;

  const [activeTab, setActiveTab] = useState("info");
  const [loading, setLoading] = useState(true);
  const [santri, setSantri] = useState<SantriData | null>(null);
  const [bantuanData, setBantuanData] = useState<any[]>([]);
  const [programData, setProgramData] = useState<any[]>([]);
  const [waliData, setWaliData] = useState<any[]>([]);
  const [editingSantri, setEditingSantri] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editTab, setEditTab] = useState<string>('personal');

  // Load santri data with all related information
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


      // Load program/kelas data (new structure from kelas_anggota + kelas_master)
      const { data: programs, error: programsError } = await supabase
        .from('kelas_anggota')
        .select(`
          id,
          tanggal_mulai,
          tanggal_selesai,
          status,
          kelas:kelas_id(id, nama_kelas, program, rombel, tingkat, tahun_ajaran, semester)
        `)
        .eq('santri_id', santriId)
        .eq('status', 'Aktif');

      if (programsError) throw programsError;

      // Load wali data
      const { data: wali, error: waliError } = await supabase
        .from('santri_wali')
        .select('*')
        .eq('santri_id', santriId)
        .order('is_utama', { ascending: false }); // Wali utama dulu

      if (waliError) throw waliError;

      setSantri(santriData);
      setBantuanData([]);
      const mapped = (programs || []).map((row: any) => ({
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
      setWaliData(wali || []);
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

  // Reload data when category changes
  useEffect(() => {
    if (santri?.kategori) {
      // Reload data to reflect new category requirements
      loadSantriData();
    }
  }, [santri?.kategori]);

  // Memoized calculations
  const totalBantuan = useMemo(() => 
    bantuanData.reduce((sum, item) => sum + (item.nominal_per_bulan || 0), 0), 
    [bantuanData]
  );

  const isBantuanRecipient = useMemo(() => 
    santri?.kategori === 'Binaan Mukim' || santri?.kategori === 'Binaan Non-Mukim' || 
    santri?.tipe_pembayaran === 'Bantuan Yayasan', 
    [santri?.kategori, santri?.tipe_pembayaran]
  );

  // Get available tabs based on category
  const availableTabs = useMemo(() => {
    if (!santri) return ['info', 'program', 'wali', 'dokumen'];
    return ProfileHelper.getAvailableTabs(santri.kategori, santri.tipe_pembayaran);
  }, [santri?.kategori, santri?.tipe_pembayaran]);

  const isPendingApproval = useMemo(() => 
    santri?.status_approval === 'pending', 
    [santri?.status_approval]
  );

  const isUnplaced = useMemo(() => 
    santri?.status_approval === 'disetujui' && programData.length === 0, 
    [santri?.status_approval, programData.length]
  );

  // Generate initials
  const generateInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Aktif':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Non-Aktif':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Alumni':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get category badge color
  const getCategoryBadgeColor = (kategori: string) => {
    switch (kategori) {
      case 'Reguler':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'Binaan Mukim':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Binaan Non-Mukim':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Mahasiswa':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };


  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Memuat data santri...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!santri) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12">
          <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Santri tidak ditemukan</h3>
          <p className="text-muted-foreground mb-4">Data santri dengan ID tersebut tidak tersedia</p>
          <Button onClick={() => navigate('/santri')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Data Santri
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
       {/* Header */}
       <div className="flex items-center justify-between mb-6">
         <div className="flex items-center gap-4">
           <Button 
             variant="outline" 
             size="sm" 
             onClick={() => navigate('/santri')}
           >
             <ArrowLeft className="w-4 h-4 mr-2" />
             Kembali
           </Button>
           <div>
             <h1 className="text-3xl lg:text-4xl font-bold text-foreground flex items-center gap-3">
               <User className="w-8 h-8 text-primary" />
               Profil Santri
             </h1>
             <p className="text-muted-foreground">
               Detail lengkap data santri dan manajemen terkait
             </p>
           </div>
         </div>

         {/* Quick Actions Dropdown */}
         <DropdownMenu>
           <DropdownMenuTrigger asChild>
             <Button variant="outline" size="sm">
               <MoreHorizontal className="w-4 h-4" />
             </Button>
           </DropdownMenuTrigger>
           <DropdownMenuContent align="end" className="w-56">
             <DropdownMenuItem 
               onClick={() => {
                 setShowForm(true);
                 setEditingSantri(santriId);
               }}
             >
               <Edit className="w-4 h-4 mr-2" />
               Edit Profil
             </DropdownMenuItem>
             
             {/* Only show admin actions if current user is NOT santri */}
             {!isCurrentUserSantri && (
               <>
                 {programData.length === 0 && (
                   <DropdownMenuItem 
                     onClick={() => navigate(`/ploating-kelas?santriId=${santriId}`)}
                   >
                     <BookOpen className="w-4 h-4 mr-2" />
                     Tempatkan Kelas
                   </DropdownMenuItem>
                 )}
                 
                 <DropdownMenuItem onClick={() => navigate('/keuangan')}>
                   <DollarSign className="w-4 h-4 mr-2" />
                   Kelola Keuangan
                 </DropdownMenuItem>
                 
                 {isBantuanRecipient && (
                     <DropdownMenuItem onClick={() => navigate('/keuangan?tab=bantuan')}>
                     <HandCoins className="w-4 h-4 mr-2" />
                     Kelola Bantuan
                   </DropdownMenuItem>
                 )}
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

      <div className="space-y-6">
          {/* Profile Header */}
          <Card className="border-0 shadow-soft bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="relative">
                  <Avatar className="w-24 h-24 ring-4 ring-white shadow-lg">
                    <AvatarImage src={getSafeAvatarUrl(santri.foto_profil)} />
                    <AvatarFallback className="text-xl font-bold">
                      {generateInitials(santri.nama_lengkap)}
                    </AvatarFallback>
                  </Avatar>
                  {isBantuanRecipient && (
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <GraduationCap className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 space-y-4">
                  <div>
                    <h2 className="text-3xl font-bold text-foreground mb-2">{santri.nama_lengkap}</h2>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={`${getStatusBadgeColor(santri.status_baru)} text-sm px-3 py-1`}>
                        {santri.status_baru}
                      </Badge>
                      <Badge className={`${getCategoryBadgeColor(santri.kategori)} text-sm px-3 py-1`}>
                        {santri.kategori}
                      </Badge>
                      <Badge variant="outline" className="text-sm px-3 py-1">
                        {santri.tipe_pembayaran}
                      </Badge>
                      {isBantuanRecipient && (
                        <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white text-sm px-3 py-1">
                          🎁 Penerima Bantuan Yayasan
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">NIS</p>
                        <p className="font-semibold">{santri.nis || 'Belum ada'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Calendar className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Umur</p>
                        <p className="font-semibold">{santri.tanggal_lahir ? `${calculateAge(santri.tanggal_lahir)} tahun` : '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Phone className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">WhatsApp</p>
                        <p className="font-semibold">{santri.no_whatsapp || 'Belum ada'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-0 shadow-soft hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <p className="text-2xl font-bold text-foreground">{santri.status_baru}</p>
                    <p className="text-xs text-muted-foreground mt-1">Aktif sejak {formatDate(santri.created_at || '')}</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-soft hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Program Aktif</p>
                    <p className="text-2xl font-bold text-blue-600">{programData.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {programData.length === 0 ? 'Belum ditempatkan' : 'Sudah ditempatkan'}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <BookOpen className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-soft hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Bantuan/Bulan</p>
                    <p className="text-2xl font-bold text-green-600">{formatRupiah(totalBantuan)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isBantuanRecipient ? 'Aktif' : 'Tidak ada'}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <HandCoins className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className={`grid w-full grid-cols-${availableTabs.length}`}>
              {availableTabs.includes('info') && (
                <TabsTrigger value="info">📋 Informasi</TabsTrigger>
              )}
              {availableTabs.includes('bantuan') && (
                <TabsTrigger value="bantuan">🎁 Bantuan</TabsTrigger>
              )}
              {availableTabs.includes('program') && (
                <TabsTrigger value="program">📚 Program</TabsTrigger>
              )}
              {availableTabs.includes('wali') && (
                <TabsTrigger value="wali">👥 Wali</TabsTrigger>
              )}
              {availableTabs.includes('tagihan') && (
                <TabsTrigger value="tagihan">💳 Tagihan</TabsTrigger>
              )}
              {availableTabs.includes('dokumen') && (
                <TabsTrigger value="dokumen">📄 Dokumen</TabsTrigger>
              )}
            </TabsList>

            {/* Tab: Informasi Pribadi */}
            <TabsContent value="info" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Informasi Pribadi</h3>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    setEditTab('personal');
                    setShowForm(true);
                    setEditingSantri(santriId);
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Informasi
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* Basic Info Cards */}
                <InfoCard
                  icon={User}
                  iconColor="text-blue-600"
                  iconBg="bg-blue-100"
                  label="Nama Lengkap"
                  value={santri?.nama_lengkap || 'Belum diisi'}
                />

                <InfoCard
                  icon={Calendar}
                  iconColor="text-green-600"
                  iconBg="bg-green-100"
                  label="Tanggal Lahir"
                  value={
                    <div>
                      <p className="font-semibold text-slate-800">
                        {santri?.tanggal_lahir ? formatDate(santri.tanggal_lahir) : 'Belum diisi'}
                      </p>
                      {santri?.tanggal_lahir && (
                        <p className="text-xs text-muted-foreground">
                          ({calculateAge(santri.tanggal_lahir)} tahun)
                        </p>
                      )}
                    </div>
                  }
                />

                <InfoCard
                  icon={MapPin}
                  iconColor="text-purple-600"
                  iconBg="bg-purple-100"
                  label="Tempat Lahir"
                  value={santri?.tempat_lahir || 'Belum diisi'}
                />

                <InfoCard
                  icon={Phone}
                  iconColor="text-orange-600"
                  iconBg="bg-orange-100"
                  label="Nomor WhatsApp"
                  value={santri?.no_whatsapp || 'Belum diisi'}
                />

                <InfoCard
                  icon={Shield}
                  iconColor="text-red-600"
                  iconBg="bg-red-100"
                  label="Kategori"
                  value={santri?.kategori || 'Belum diisi'}
                  badge={<Badge variant="secondary" className="ml-2">{santri?.kategori}</Badge>}
                />

                <InfoCard
                  icon={Clock}
                  iconColor="text-indigo-600"
                  iconBg="bg-indigo-100"
                  label="Bergabung"
                  value={santri?.created_at ? formatDate(santri.created_at) : 'Belum diisi'}
                />

                {/* Dynamic fields for Binaan */}
                {(santri?.kategori === 'Binaan Mukim' || santri?.kategori === 'Binaan Non-Mukim') && (
                  <>
                    <InfoCard
                      icon={Users}
                      iconColor="text-pink-600"
                      iconBg="bg-pink-100"
                      label="Status Sosial"
                      value={santri?.status_sosial || 'Belum diisi'}
                      badge={<Badge variant="outline" className="ml-2">{santri?.status_sosial}</Badge>}
                    />

                    <InfoCard
                      icon={User}
                      iconColor="text-teal-600"
                      iconBg="bg-teal-100"
                      label="Anak Ke-"
                      value={santri?.anak_ke ? `Ke-${santri.anak_ke}` : 'Belum diisi'}
                    />

                    <InfoCard
                      icon={Users}
                      iconColor="text-cyan-600"
                      iconBg="bg-cyan-100"
                      label="Jumlah Saudara"
                      value={
                        santri?.jumlah_saudara !== undefined && santri?.jumlah_saudara !== null 
                          ? `${santri.jumlah_saudara} orang` 
                          : 'Belum diisi'
                      }
                    />
                  </>
                )}

                {/* Dynamic fields for Binaan Mukim */}
                {santri?.kategori === 'Binaan Mukim' && (
                  <>
                    <InfoCard
                      icon={BookOpen}
                      iconColor="text-yellow-600"
                      iconBg="bg-yellow-100"
                      label="Nama Sekolah"
                      value={santri?.nama_sekolah || 'Belum diisi'}
                    />

                    <InfoCard
                      icon={GraduationCap}
                      iconColor="text-emerald-600"
                      iconBg="bg-emerald-100"
                      label="Kelas"
                      value={santri?.kelas_sekolah || 'Belum diisi'}
                    />

                    <InfoCard
                      icon={UserCheck}
                      iconColor="text-rose-600"
                      iconBg="bg-rose-100"
                      label="Nomor Wali Kelas"
                      value={santri?.nomor_wali_kelas || 'Belum diisi'}
                    />

                    <InfoCard
                      icon={Award}
                      iconColor="text-violet-600"
                      iconBg="bg-violet-100"
                      label="Hobi"
                      value={santri?.hobi || 'Belum diisi'}
                    />

                    <InfoCard
                      icon={TrendingUp}
                      iconColor="text-amber-600"
                      iconBg="bg-amber-100"
                      label="Cita-cita"
                      value={santri?.cita_cita || 'Belum diisi'}
                    />
                  </>
                )}

                {/* Dynamic fields for Mahasiswa */}
                {santri?.kategori === 'Mahasiswa' && (
                  <>
                    <InfoCard
                      icon={BookOpen}
                      iconColor="text-yellow-600"
                      iconBg="bg-yellow-100"
                      label="Nama Universitas"
                      value={santri?.nama_sekolah || 'Belum diisi'}
                    />

                    <InfoCard
                      icon={GraduationCap}
                      iconColor="text-emerald-600"
                      iconBg="bg-emerald-100"
                      label="Program Studi"
                      value={santri?.kelas_sekolah || 'Belum diisi'}
                    />
                  </>
                )}
              </div>
            </TabsContent>

            {/* Tab: Bantuan Yayasan (conditional) */}
            {isBantuanRecipient && (
              <TabsContent value="bantuan" className="space-y-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <HandCoins className="w-12 h-12 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">Bantuan Yayasan</h3>
                      <p className="text-gray-600">Santri menerima bantuan yayasan untuk pendidikan</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Tab: Program */}
            <TabsContent value="program" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Program Santri</h3>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => navigate(`/ploating-kelas?santriId=${santriId}`)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Program
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => navigate(`/santri/program-management/${santriId}`)}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Kelola Program
                  </Button>
                </div>
              </div>
              <Card className="border-0 shadow-soft">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <BookOpen className="w-6 h-6 text-primary" />
                        Program & Kelas Santri
                      </CardTitle>
                      <p className="text-muted-foreground mt-1">
                        Kelola program dan kelas yang diikuti santri
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/ploating-kelas?santriId=${santriId}`)}
                        className="flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Tambah Program
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => navigate(`/santri/program-management/${santriId}`)}
                        className="flex items-center gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        Kelola Program
                      </Button>
                    </div>
                  </div>
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
                        Silakan lakukan penempatan untuk mengaktifkan sistem tagihan.
                      </p>
                      <div className="flex gap-3 justify-center">
                        <Button 
                          onClick={() => navigate(`/akademik/kelas?santriId=${santriId}`)}
                          className="flex items-center gap-2"
                        >
                          <BookOpen className="w-4 h-4" />
                          Tempatkan ke Kelas
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => navigate(`/santri/program-management/${santriId}`)}
                          className="flex items-center gap-2"
                        >
                          <Settings className="w-4 h-4" />
                          Kelola Program
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Program Cards */}
                      {programData.map((program) => (
                        <Card key={program.id} className="border-l-4 border-l-primary hover:shadow-md transition-shadow">
                          <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {/* Program Info */}
                              <div className="space-y-3">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="font-semibold text-lg">{program.kelas_program || 'Kelas Belum Ditentukan'}</h4>
                                    <p className="text-sm text-muted-foreground">
                                      {program.tingkat || 'Tingkat Belum Ditentukan'}
                                    </p>
                                  </div>
                                  <Badge className="bg-green-100 text-green-800 border-green-200">
                                    Aktif
                                  </Badge>
                                </div>
                                
                                <div className="flex gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {program.kelas_program}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {program.rombel}
                                  </Badge>
                                </div>
                                
                                <div className="text-sm text-muted-foreground">
                                  <p>Mulai: {formatDate(program.tanggal_mulai)}</p>
                                  <p>Berakhir: {formatDate(program.tanggal_selesai)}</p>
                                </div>
                              </div>

                              {/* Biaya Info */}
                              <div className="space-y-3">
                                <div className="bg-blue-50 p-4 rounded-lg">
                                  <h5 className="font-medium text-blue-900 mb-2">Informasi Biaya</h5>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-blue-700">Rombel:</span>
                                      <span className="font-medium text-blue-900">
                                        {program.rombel || 'Belum Ditentukan'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-blue-700">Subsidi:</span>
                                      <span className="font-medium text-blue-900">
                                        {program.subsidi_persen || 0}%
                                      </span>
                                    </div>
                                    <hr className="border-blue-200" />
                                    <div className="flex justify-between font-semibold">
                                      <span className="text-blue-900">Biaya Final:</span>
                                      <span className="text-blue-900">
                                        {formatRupiah(program.total_biaya_final || 0)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Actions */}
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

                      {/* Summary Card */}
                      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                        <CardContent className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-primary">
                                {programData.length}
                              </div>
                              <p className="text-sm text-muted-foreground">Program Aktif</p>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-600">
                                {formatRupiah(programData.reduce((sum, p) => sum + (p.total_biaya_final || 0), 0))}
                              </div>
                              <p className="text-sm text-muted-foreground">Total Biaya/Bulan</p>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600">
                                {programData.reduce((sum, p) => sum + (p.subsidi_persen || 0), 0) / programData.length}%
                              </div>
                              <p className="text-sm text-muted-foreground">Rata-rata Subsidi</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Wali */}
            <TabsContent value="wali" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Data Wali</h3>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    setEditTab('wali');
                    setShowForm(true);
                    setEditingSantri(santriId);
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Data Wali
                </Button>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Data Wali</CardTitle>
                </CardHeader>
                <CardContent>
                  {waliData.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">Belum ada data wali</h3>
                      <p className="text-muted-foreground">
                        Data wali santri belum tersedia
                      </p>
                    </div>
                  ) : (
                     <div className="space-y-4">
                       {waliData.map((wali, index) => (
                         <Card key={wali.id} className="border-l-4 border-l-blue-500">
                           <CardContent className="p-6">
                             <div className="flex justify-between items-start mb-4">
                               <div>
                                 <h4 className="font-semibold text-lg">{wali.nama_lengkap}</h4>
                                 <Badge variant="outline" className="mt-1">
                                   {wali.is_utama ? 'Wali Utama' : 'Wali Pendamping'}
                                 </Badge>
                               </div>
                               <Badge className="bg-blue-100 text-blue-800">
                                 {wali.hubungan_keluarga}
                               </Badge>
                             </div>
                             
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <div className="space-y-3">
                                 <div>
                                   <label className="text-sm font-medium text-muted-foreground">No. WhatsApp</label>
                                   <p className="font-medium flex items-center gap-2">
                                     <Phone className="w-4 h-4" />
                                     {wali.no_whatsapp || 'Belum ada'}
                                   </p>
                                 </div>
                                 
                                 <div>
                                   <label className="text-sm font-medium text-muted-foreground">Email</label>
                                   <p className="font-medium flex items-center gap-2">
                                     <Mail className="w-4 h-4" />
                                     {wali.email || 'Belum ada'}
                                   </p>
                                 </div>
                                 
                                 <div>
                                   <label className="text-sm font-medium text-muted-foreground">Pekerjaan</label>
                                   <p className="font-medium">{wali.pekerjaan || 'Belum ada'}</p>
                                 </div>
                               </div>
                               
                               <div className="space-y-3">
                                 <div>
                                   <label className="text-sm font-medium text-muted-foreground">Penghasilan Bulanan</label>
                                   <p className="font-medium">
                                     {wali.penghasilan_bulanan ? formatRupiah(wali.penghasilan_bulanan) : 'Belum ada'}
                                   </p>
                                 </div>
                                 
                                 <div>
                                   <label className="text-sm font-medium text-muted-foreground">Alamat</label>
                                   <p className="font-medium flex items-start gap-2">
                                     <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                     {wali.alamat || 'Belum ada'}
                                   </p>
                                 </div>
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

            {/* Tab: Tagihan (for non-bantuan) */}
            {!isBantuanRecipient && (
              <TabsContent value="tagihan" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Tagihan & Pembayaran</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <CreditCard className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">Manajemen Tagihan</h3>
                      <p className="text-muted-foreground mb-4">
                        Kelola tagihan dan pembayaran santri
                      </p>
                      <Button onClick={() => navigate('/keuangan?tab=tagihan')}>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Kelola Tagihan
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Tab: Dokumen */}
            <TabsContent value="dokumen" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Dokumen Santri</h3>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    setEditTab('dokumen');
                    setShowForm(true);
                    setEditingSantri(santriId);
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Dokumen
                </Button>
              </div>
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
      </div>

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

export default SantriProfileEnhanced;
