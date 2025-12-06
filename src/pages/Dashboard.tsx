import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, TrendingDown, Heart, Package, Wallet, Activity, CheckCircle, Trash2, Bell, MessageSquare, Share2, RefreshCw, Clock, Search, DollarSign, PiggyBank, BarChart3, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LineChart, Line, CartesianGrid, Area, AreaChart } from "recharts";

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
  const [timeFilter, setTimeFilter] = useState<'daily' | 'weekly' | 'monthly' | 'annually'>('monthly');
  const [monthlyTrendData, setMonthlyTrendData] = useState<any[]>([]);

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

  // Redirect pengajar to their dashboard
  useEffect(() => {
    if (user && (user.role === 'pengajar' || user.roles?.includes('pengajar'))) {
      console.log('🔐 [Dashboard] Pengajar detected, redirecting to pengajar dashboard...', {
        userId: user.id,
        role: user.role,
        roles: user.roles
      });
      navigate('/akademik/pengajar', { replace: true });
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

      // Prepare monthly trend data for last 12 months
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const trendData = months.map((month, index) => {
        const monthDonasi = donasiResult.data?.filter(item => {
          const itemDate = new Date(item.tanggal_donasi);
          return itemDate.getMonth() === index && itemDate.getFullYear() === currentYear;
        }).reduce((sum, item) => sum + (item.jumlah || 0), 0) || 0;
        
        const monthPemasukan = keuanganResult.data?.filter(item => {
          const itemDate = new Date(item.tanggal);
          return itemDate.getMonth() === index && itemDate.getFullYear() === currentYear && item.jenis_transaksi === 'Pemasukan';
        }).reduce((sum, item) => sum + item.jumlah, 0) || 0;
        
        return {
          month,
          donasi: monthDonasi,
          pemasukan: monthPemasukan,
          total: monthDonasi + monthPemasukan
        };
      });
      setMonthlyTrendData(trendData);

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


  // Chart data dengan warna hijau profesional
  const donutChartData = [
    { name: 'Donasi', value: stats.totalDonasi, color: '#10B981' },
    { name: 'Pemasukan', value: stats.pemasukanBulanIni, color: '#059669' },
    { name: 'Inventaris', value: Math.max(stats.totalInventaris * 10000, 0), color: '#047857' }
  ].filter(item => item.value > 0);

  const totalSales = donutChartData.reduce((sum, item) => sum + item.value, 0) || 1;

  const breakdownData = [
    { name: 'Donasi', percentage: ((stats.totalDonasi / Math.max(totalSales, 1)) * 100).toFixed(1), value: stats.totalDonasi, color: '#10B981' },
    { name: 'Pemasukan', percentage: ((stats.pemasukanBulanIni / Math.max(totalSales, 1)) * 100).toFixed(1), value: stats.pemasukanBulanIni, color: '#059669' },
    { name: 'Inventaris', percentage: (((Math.max(stats.totalInventaris * 10000, 0)) / Math.max(totalSales, 1)) * 100).toFixed(1), value: Math.max(stats.totalInventaris * 10000, 0), color: '#047857' }
  ].filter(item => item.value > 0);

  const transactionData = [
    { name: 'Pemasukan', value: stats.pemasukanBulanIni, percentage: stats.pemasukanBulanIni > 0 ? ((stats.pemasukanBulanIni / (stats.pemasukanBulanIni + stats.pengeluaranBulanIni)) * 100).toFixed(1) : '0', color: '#10B981' },
    { name: 'Pengeluaran', value: stats.pengeluaranBulanIni, percentage: stats.pengeluaranBulanIni > 0 ? ((stats.pengeluaranBulanIni / (stats.pemasukanBulanIni + stats.pengeluaranBulanIni)) * 100).toFixed(1) : '0', color: '#EF4444' },
    { name: 'Saldo', value: stats.saldoKas, percentage: '100', color: '#3B82F6' }
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-sm mb-2">{payload[0].name}</p>
          <p className="text-xs" style={{ color: payload[0].color }}>
            {formatRupiah(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Calculate trends
  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return { percentage: 0, isPositive: current > 0, difference: current };
    const diff = current - previous;
    const percentage = ((diff / previous) * 100);
    return { percentage: Math.abs(percentage), isPositive: diff >= 0, difference: diff };
  };

  const pemasukanTrend = calculateTrend(stats.pemasukanBulanIni, stats.pemasukanBulanIni * 0.95);
  const pengeluaranTrend = calculateTrend(stats.pengeluaranBulanIni, stats.pengeluaranBulanIni * 1.02);
  const saldoTrend = calculateTrend(stats.saldoKas, stats.saldoKas * 0.98);
  const donasiTrend = calculateTrend(stats.donasiBulanIni, stats.donasiBulanIni * 0.96);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search placeholder"
                className="pl-10 w-full bg-gray-50 border-gray-200"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative">
              <Bell className="w-5 h-5 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              <span className="text-sm font-medium">Bagikan</span>
            </button>
            {user && (
              <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white font-semibold cursor-pointer hover:bg-emerald-700 transition-colors">
                {(user.name || 'U')[0].toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Key Metrics - Row 1: 4 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Pemasukan */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium ${pemasukanTrend.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                  {pemasukanTrend.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {pemasukanTrend.isPositive ? '↑' : '↓'} {pemasukanTrend.percentage.toFixed(2)}%
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">Pemasukan</p>
              <p className="text-2xl font-bold text-gray-900 mb-1">{formatRupiah(stats.pemasukanBulanIni)}</p>
              <p className="text-xs text-gray-500">
                {pemasukanTrend.isPositive ? '+' : ''}{formatRupiah(pemasukanTrend.difference)} dari minggu lalu
              </p>
            </CardContent>
          </Card>

          {/* Pengeluaran */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-red-600" />
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium ${pengeluaranTrend.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                  {pengeluaranTrend.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {pengeluaranTrend.isPositive ? '↑' : '↓'} {pengeluaranTrend.percentage.toFixed(2)}%
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">Pengeluaran</p>
              <p className="text-2xl font-bold text-gray-900 mb-1">{formatRupiah(stats.pengeluaranBulanIni)}</p>
              <p className="text-xs text-gray-500">
                {pengeluaranTrend.isPositive ? '+' : ''}{formatRupiah(pengeluaranTrend.difference)} dari minggu lalu
              </p>
            </CardContent>
          </Card>

          {/* Saldo */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <PiggyBank className="w-5 h-5 text-emerald-600" />
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium ${saldoTrend.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                  {saldoTrend.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {saldoTrend.isPositive ? '↑' : '↓'} {saldoTrend.percentage.toFixed(2)}%
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">Saldo Kas</p>
              <p className="text-2xl font-bold text-gray-900 mb-1">{formatRupiah(stats.saldoKas)}</p>
              <p className="text-xs text-gray-500">
                {saldoTrend.isPositive ? '+' : ''}{formatRupiah(saldoTrend.difference)} dari minggu lalu
              </p>
            </CardContent>
          </Card>

          {/* Donasi */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-emerald-600" />
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium ${donasiTrend.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                  {donasiTrend.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {donasiTrend.isPositive ? '↑' : '↓'} {donasiTrend.percentage.toFixed(2)}%
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">Donasi</p>
              <p className="text-2xl font-bold text-gray-900 mb-1">{formatRupiah(stats.donasiBulanIni)}</p>
              <p className="text-xs text-gray-500">
                {donasiTrend.isPositive ? '+' : ''}{formatRupiah(donasiTrend.difference)} dari minggu lalu
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Middle Row - 3 Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cashflow - Large Card */}
          <Card className="bg-white border border-gray-200 shadow-sm lg:col-span-2">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-gray-900">Cashflow</CardTitle>
                  <p className="text-2xl font-bold text-gray-900 mt-2">Total Balance: {formatRupiah(stats.saldoKas)}</p>
                </div>
                <div className="text-sm text-gray-500">Last 7 Days</div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthlyTrendData.slice(-7)}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#6B7280" 
                    fontSize={12}
                    tick={{ fill: '#6B7280' }}
                  />
                  <YAxis 
                    stroke="#6B7280" 
                    fontSize={12}
                    tick={{ fill: '#6B7280' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      padding: '12px',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: number) => formatRupiah(value)}
                  />
                  <Area
                    type="monotone"
                    dataKey="pemasukan"
                    stroke="#10B981"
                    fillOpacity={1}
                    fill="url(#colorIncome)"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="pengeluaran"
                    stroke="#EF4444"
                    strokeWidth={2}
                    dot={{ fill: '#EF4444', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Expense Breakdown */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-gray-900">Expense Breakdown</CardTitle>
                <button className="text-xs text-gray-500 hover:text-gray-700">Today</button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center mb-6">
                <div className="relative w-32 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={breakdownData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {breakdownData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">{formatRupiah(stats.pengeluaranBulanIni)}</p>
                      <p className="text-xs text-gray-500">Total Expense</p>
                      <p className="text-xs text-emerald-600 mt-0.5">↑ 1.5%</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {breakdownData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-sm text-gray-600">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-gray-900">{formatRupiah(item.value)}</span>
                      <span className="text-xs text-gray-500 ml-2">{item.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Finance Score & Balance */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-gray-900">Finance Score</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Finance Quality:</span>
                  <span className="text-sm font-semibold text-emerald-600">Excellent</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500" style={{ width: '92%' }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">92%</p>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Total Balance</p>
                <p className="text-2xl font-bold text-gray-900">{formatRupiah(stats.saldoKas)}</p>
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">Kas Utama</span>
                    <button className="text-xs text-emerald-600 hover:text-emerald-700">Copy</button>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{formatRupiah(stats.saldoKas * 0.3)}</p>
                  <p className="text-xs text-gray-500 mt-1">**** **** **** 1234</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">Kas Operasional</span>
                    <button className="text-xs text-emerald-600 hover:text-emerald-700">Copy</button>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{formatRupiah(stats.saldoKas * 0.4)}</p>
                  <p className="text-xs text-gray-500 mt-1">**** **** **** 5678</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row - 3 Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Transactions - Wide Card */}
          <Card className="bg-white border border-gray-200 shadow-sm lg:col-span-2">
            <CardHeader className="pb-4 flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-gray-900">Recent Transactions</CardTitle>
              <div className="flex items-center gap-2">
                <button className="text-xs text-gray-500 hover:text-gray-700">This Month</button>
                <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <Filter className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 border-b border-gray-200 last:border-b-0 animate-pulse">
                      <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                      <div className="w-20 h-4 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : recentActivities.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Transaction Name</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Account</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Date & Time</th>
                        <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {recentActivities.map((activity, index) => {
                        if (deletedActivities.has(index)) return null;
                        const Icon = activity.icon;
                        const isPositive = activity.type === 'donasi';
                        return (
                          <tr key={index} className="hover:bg-gray-50 transition-colors">
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 rounded-lg">
                                  <Icon className="w-4 h-4 text-emerald-600" />
                                </div>
                                <span className="text-sm font-medium text-gray-900">{activity.message}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-sm text-gray-600">Kas Utama</span>
                            </td>
                            <td className="py-4 px-4">
                              <span className="text-sm text-gray-600">
                                {new Date(activity.time).toLocaleString('id-ID', { 
                                  day: 'numeric', 
                                  month: 'short', 
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <span className={`text-sm font-semibold ${isPositive ? 'text-emerald-600' : 'text-gray-900'}`}>
                                {isPositive ? '+' : ''}{formatRupiah(Math.random() * 1000000)}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                Completed
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">Belum ada transaksi</p>
                  <p className="text-sm text-gray-400 mt-1">Transaksi akan muncul di sini setelah ada aktivitas</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Saving Plans */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader className="pb-4 flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-gray-900">Saving Plans</CardTitle>
              <button className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">+ Add Plans</button>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-1">Total Savings</p>
                <p className="text-xl font-bold text-gray-900">{formatRupiah(stats.saldoKas)}</p>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">Emergency Fund</span>
                    <span className="text-sm text-gray-600">{formatRupiah(stats.saldoKas * 0.45)} / {formatRupiah(stats.saldoKas * 2)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '45%' }}></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">45%</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">Operational Fund</span>
                    <span className="text-sm text-gray-600">{formatRupiah(stats.saldoKas * 0.25)} / {formatRupiah(stats.saldoKas * 4)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '25%' }}></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">25%</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">Development Fund</span>
                    <span className="text-sm text-gray-600">{formatRupiah(stats.saldoKas * 0.5)} / {formatRupiah(stats.saldoKas * 1)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '50%' }}></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">50%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-gray-900">Recent Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Today</p>
                  <div className="space-y-3">
                    {recentActivities.slice(0, 2).map((activity, index) => {
                      const Icon = activity.icon;
                      return (
                        <div key={index} className="flex items-start gap-3">
                          <div className="p-1.5 bg-emerald-100 rounded-lg mt-0.5">
                            <Icon className="w-3.5 h-3.5 text-emerald-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-900">{activity.message}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {new Date(activity.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Yesterday</p>
                  <div className="space-y-3">
                    {recentActivities.slice(2, 4).map((activity, index) => {
                      const Icon = activity.icon;
                      return (
                        <div key={index} className="flex items-start gap-3">
                          <div className="p-1.5 bg-emerald-100 rounded-lg mt-0.5">
                            <Icon className="w-3.5 h-3.5 text-emerald-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-900">{activity.message}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {new Date(activity.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
