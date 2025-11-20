import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Award, TrendingUp, TrendingDown, Heart, Package, Store, Wallet, DollarSign, BarChart3, Activity, AlertTriangle, CheckCircle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface DashboardStats {
  totalSantri: number;
  totalDonasi: number;
  donasiBulanIni: number;
  totalInventaris: number;
  inventarisBaik: number;
  inventarisRusak: number;
  totalKeuangan: number;
  pemasukanBulanIni: number;
  pengeluaranBulanIni: number;
  saldoKas: number;
  transaksiBulanIni: number;
  donaturUnik: number;
  itemDonasi: number;
  expiredItems: number;
}

const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalSantri: 0,
    totalDonasi: 0,
    donasiBulanIni: 0,
    totalInventaris: 0,
    inventarisBaik: 0,
    inventarisRusak: 0,
    totalKeuangan: 0,
    pemasukanBulanIni: 0,
    pengeluaranBulanIni: 0,
    saldoKas: 0,
    transaksiBulanIni: 0,
    donaturUnik: 0,
    itemDonasi: 0,
    expiredItems: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [deletedActivities, setDeletedActivities] = useState<Set<number>>(new Set());

  // Redirect santri to their profile page
  useEffect(() => {
    if (user && user.role === 'santri' && user.santriId) {
      console.log('🔐 [Dashboard] Santri detected, redirecting to profile...', {
        santriId: user.santriId,
        idSantri: user.idSantri,
        name: user.name
      });
      navigate(`/santri/profile?santriId=${user.santriId}&santriName=${encodeURIComponent(user.name || 'Santri')}`, { replace: true });
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleDeleteActivity = (index: number) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus aktivitas ini?')) {
      setDeletedActivities(prev => new Set([...prev, index]));
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      // Fetch transaksi with error handling (table might not exist)
      const transaksiResult = await supabase
        .from('transaksi_inventaris')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      // Handle error if table doesn't exist
      if (transaksiResult.error) {
        console.warn('Transaksi table not available:', transaksiResult.error);
        transaksiResult.data = [];
        transaksiResult.error = null;
      }

      const [
        santriResult,
        donasiResult,
        inventarisResult,
        keuanganResult
      ] = await Promise.all([
        supabase.from('santri').select('id').eq('status', 'Aktif'),
        supabase.from('donasi').select('*'),
        supabase.from('inventaris').select('*'),
        supabase.from('keuangan').select('*')
      ]);

      // Calculate stats
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      // Donasi stats
      const totalDonasi = donasiResult.data?.reduce((sum, item) => sum + (item.jumlah || 0), 0) || 0;
      const donasiBulanIni = donasiResult.data?.filter(item => {
        const itemDate = new Date(item.tanggal_donasi);
        return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
      }).reduce((sum, item) => sum + (item.jumlah || 0), 0) || 0;
      
      const donaturUnik = new Set(donasiResult.data?.map(item => item.nama_donatur)).size || 0;
      const itemDonasi = donasiResult.data?.filter(item => item.jenis_donasi === 'Barang').length || 0;

      // Inventaris stats
      const totalInventaris = inventarisResult.data?.length || 0;
      const inventarisBaik = inventarisResult.data?.filter(item => item.kondisi === 'Baik').length || 0;
      const inventarisRusak = inventarisResult.data?.filter(item => 
        item.kondisi === 'Rusak Ringan' || item.kondisi === 'Rusak Berat' || item.kondisi === 'Perlu Perbaikan'
      ).length || 0;
      
      // TODO: Add back when perishable/expiry fields are added
      const expiredItems = 0;
      // const expiredItems = inventarisResult.data?.filter(item => {
      //   if (!item.perishable || !item.tanggal_kedaluwarsa) return false;
      //   return new Date(item.tanggal_kedaluwarsa) < new Date();
      // }).length || 0;

      // Keuangan stats
      const pemasukanBulanIni = keuanganResult.data?.filter(item => {
        const itemDate = new Date(item.tanggal);
        return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear && item.jenis_transaksi === 'Pemasukan';
      }).reduce((sum, item) => sum + item.jumlah, 0) || 0;
      
      const pengeluaranBulanIni = keuanganResult.data?.filter(item => {
        const itemDate = new Date(item.tanggal);
        return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear && item.jenis_transaksi === 'Pengeluaran';
      }).reduce((sum, item) => sum + item.jumlah, 0) || 0;

      // Calculate transaction count for current month
      const transaksiBulanIni = keuanganResult.data?.filter(item => {
        const itemDate = new Date(item.tanggal);
        return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
      }).length || 0;

      // Calculate actual total saldo from akun kas (not just monthly difference)
      const { data: akunKasData } = await supabase
        .from('akun_kas')
        .select('saldo_saat_ini')
        .eq('status', 'aktif');
      
      const saldoKas = akunKasData?.reduce((sum, akun) => sum + (akun.saldo_saat_ini || 0), 0) || 0;

      // Recent activities
      const activities = [
        ...(transaksiResult.data?.map(t => ({
          type: 'transaksi',
          message: `Transaksi ${t.tipe.toLowerCase()} ${t.jumlah} unit`,
          time: t.created_at,
          icon: Activity
        })) || []),
        ...(donasiResult.data?.slice(0, 3).map(d => ({
          type: 'donasi',
          message: `Donasi ${d.jenis_donasi.toLowerCase()} dari ${d.nama_donatur}`,
          time: d.created_at,
          icon: Heart
        })) || [])
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);

      setStats({
        totalSantri: santriResult.data?.length || 0,
        totalDonasi,
        donasiBulanIni,
        totalInventaris,
        inventarisBaik,
        inventarisRusak,
        totalKeuangan: totalDonasi,
        pemasukanBulanIni,
        pengeluaranBulanIni,
        saldoKas,
        transaksiBulanIni,
        donaturUnik,
        itemDonasi,
        expiredItems,
      });

      setRecentActivities(activities);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    {
      title: "Total Santri",
      value: stats.totalSantri.toString(),
      icon: Users,
      trend: "Aktif",
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      title: "Donasi Terkumpul",
      value: formatRupiah(stats.totalDonasi),
      icon: Heart,
      trend: `${formatRupiah(stats.donasiBulanIni)} bulan ini`,
      color: "text-red-500",
      bgColor: "bg-red-500/10"
    },
    {
      title: "Total Inventaris",
      value: stats.totalInventaris.toString(),
      icon: Package,
      trend: `${stats.itemDonasi} dari donasi`,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      title: "Kondisi Inventaris",
      value: `${stats.inventarisBaik}/${stats.totalInventaris}`,
      icon: CheckCircle,
      trend: `${stats.inventarisRusak} perlu perbaikan`,
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
    {
      title: "Donatur Unik",
      value: stats.donaturUnik.toString(),
      icon: Users,
      trend: "Total donatur",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    },
    {
      title: "Pemasukan Bulan Ini",
      value: formatRupiah(stats.pemasukanBulanIni),
      icon: TrendingUp,
      trend: "Dari semua akun kas",
      color: "text-green-600",
      bgColor: "bg-green-600/10"
    },
    {
      title: "Pengeluaran Bulan Ini", 
      value: formatRupiah(stats.pengeluaranBulanIni),
      icon: TrendingDown,
      trend: `Selisih: ${formatRupiah(stats.pemasukanBulanIni - stats.pengeluaranBulanIni)}`,
      color: "text-red-600",
      bgColor: "bg-red-600/10"
    },
    {
      title: "Total Saldo Kas",
      value: formatRupiah(stats.saldoKas),
      icon: Wallet,
      trend: "Semua akun kas aktif",
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10"
    },
    {
      title: "Transaksi Bulan Ini",
      value: stats.transaksiBulanIni.toString(),
      icon: BarChart3,
      trend: `${stats.pemasukanBulanIni > 0 || stats.pengeluaranBulanIni > 0 ? 'Aktif bertransaksi' : 'Tidak ada transaksi'}`,
      color: "text-blue-600",
      bgColor: "bg-blue-600/10"
    },
    {
      title: "Item Kedaluwarsa",
      value: stats.expiredItems.toString(),
      icon: AlertTriangle,
      trend: "Perlu diperhatikan",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10"
    },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Selamat datang di Sistem Manajemen Pesantren Al-Bisri
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          Array.from({ length: 8 }).map((_, index) => (
            <Card 
              key={index} 
              className="relative overflow-hidden border-border bg-gradient-card animate-pulse"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div className="h-4 bg-muted rounded w-24"></div>
                <div className="w-8 h-8 bg-muted rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-20 mb-2"></div>
                <div className="h-3 bg-muted rounded w-16"></div>
              </CardContent>
            </Card>
          ))
        ) : (
          statsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card 
                key={index} 
                className="relative overflow-hidden border-border hover:shadow-medium transition-all duration-300 bg-gradient-card animate-slide-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground mb-1">
                    {stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stat.trend}
                  </p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Cross-Module Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-border bg-gradient-card hover:shadow-medium transition-all">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Analisis Donasi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Donasi Uang</span>
              <span className="font-semibold">{formatRupiah(stats.totalDonasi)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Donasi Barang</span>
              <span className="font-semibold">{stats.itemDonasi} item</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Rata-rata per Donatur</span>
              <span className="font-semibold">
                {stats.donaturUnik > 0 ? formatRupiah(stats.totalDonasi / stats.donaturUnik) : 'Rp 0'}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mt-4">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (stats.donasiBulanIni / Math.max(stats.totalDonasi, 1)) * 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Progress bulan ini: {((stats.donasiBulanIni / Math.max(stats.totalDonasi, 1)) * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-gradient-card hover:shadow-medium transition-all">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Package className="w-5 h-5" />
              Status Inventaris
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Kondisi Baik</span>
              <span className="font-semibold text-green-600">{stats.inventarisBaik}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Perlu Perbaikan</span>
              <span className="font-semibold text-orange-600">{stats.inventarisRusak}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Kedaluwarsa</span>
              <span className="font-semibold text-red-600">{stats.expiredItems}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mt-4">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${stats.totalInventaris > 0 ? (stats.inventarisBaik / stats.totalInventaris) * 100 : 0}%` }}
              ></div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Kondisi baik: {stats.totalInventaris > 0 ? ((stats.inventarisBaik / stats.totalInventaris) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-gradient-card hover:shadow-medium transition-all">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Ringkasan Keuangan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pemasukan Bulan Ini</span>
              <span className="font-semibold text-green-600">{formatRupiah(stats.pemasukanBulanIni)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pengeluaran Bulan Ini</span>
              <span className="font-semibold text-red-600">{formatRupiah(stats.pengeluaranBulanIni)}</span>
            </div>
            <div className="flex justify-between items-center border-t pt-2">
              <span className="text-sm font-medium">Saldo Kas</span>
              <span className={`font-bold ${stats.saldoKas >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatRupiah(stats.saldoKas)}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 mt-4">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${stats.saldoKas >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(100, Math.abs(stats.saldoKas / Math.max(stats.pemasukanBulanIni, 1)) * 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {stats.saldoKas >= 0 ? 'Surplus' : 'Defisit'} bulan ini
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border bg-gradient-card hover:shadow-medium transition-all">
          <CardHeader>
            <CardTitle className="text-foreground">Aktivitas Terbaru</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-start gap-3 pb-3 border-b border-border animate-pulse">
                  <div className="w-8 h-8 bg-muted rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              ))
            ) : recentActivities.length > 0 ? (
              recentActivities.map((activity, index) => {
                if (deletedActivities.has(index)) return null;
                
                const Icon = activity.icon;
                return (
                  <div key={index} className="flex items-start gap-3 pb-3 border-b border-border last:border-b-0 group">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.time).toLocaleString('id-ID')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteActivity(index)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded-md"
                      title="Hapus aktivitas"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Belum ada aktivitas terbaru</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-gradient-card hover:shadow-medium transition-all">
          <CardHeader>
            <CardTitle className="text-foreground">Jadwal Hari Ini</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 pb-3 border-b border-border">
              <div className="text-sm font-bold text-primary">08:00</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Kajian Pagi</p>
                <p className="text-xs text-muted-foreground">Aula Utama</p>
              </div>
            </div>
            <div className="flex items-start gap-3 pb-3 border-b border-border">
              <div className="text-sm font-bold text-primary">13:00</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Tahfidz Al-Quran</p>
                <p className="text-xs text-muted-foreground">Ruang Tahfidz</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-sm font-bold text-primary">19:00</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Kajian Malam</p>
                <p className="text-xs text-muted-foreground">Masjid</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
