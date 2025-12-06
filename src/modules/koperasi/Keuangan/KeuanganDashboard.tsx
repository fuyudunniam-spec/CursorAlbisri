import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Wallet,
  CreditCard,
  FileText,
  BarChart3,
  PieChart
} from "lucide-react";
import { koperasiService } from "@/services/koperasi.service";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, format, subMonths } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from "recharts";

export default function KeuanganDashboard() {
  const currentDate = new Date();
  const startOfMonthDate = startOfMonth(currentDate);
  const endOfMonthDate = endOfMonth(currentDate);

  const { data: keuanganStats, isLoading: statsLoading } = useQuery({
    queryKey: ['koperasi-keuangan-dashboard-stats', startOfMonthDate, endOfMonthDate],
    queryFn: () => koperasiService.getKeuanganDashboardStats({
      startDate: format(startOfMonthDate, 'yyyy-MM-dd'),
      endDate: format(endOfMonthDate, 'yyyy-MM-dd'),
    }),
    refetchInterval: 30000,
  });

  // Get last month for comparison
  const lastMonthStart = startOfMonth(subMonths(currentDate, 1));
  const lastMonthEnd = endOfMonth(subMonths(currentDate, 1));

  const { data: lastMonthStats } = useQuery({
    queryKey: ['koperasi-keuangan-dashboard-stats-last', lastMonthStart, lastMonthEnd],
    queryFn: () => koperasiService.getKeuanganDashboardStats({
      startDate: format(lastMonthStart, 'yyyy-MM-dd'),
      endDate: format(lastMonthEnd, 'yyyy-MM-dd'),
    }),
  });

  // Get daily data for cashflow chart (last 7 days)
  const { data: dailyData, isLoading: dailyLoading } = useQuery({
    queryKey: ['koperasi-keuangan-daily', endOfMonthDate],
    queryFn: async () => {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = format(date, 'yyyy-MM-dd');
        
        const stats = await koperasiService.getKeuanganDashboardStats({
          startDate: dateStr,
          endDate: dateStr,
        });
        
        days.push({
          date: format(date, 'EEE', { locale: localeId }),
          dateFull: format(date, 'dd MMM', { locale: localeId }),
          pemasukan: stats.totalPenjualan,
          pengeluaran: stats.totalPengeluaran,
        });
      }
      return days;
    },
  });

  // Get expense breakdown
  const { data: expenseBreakdown } = useQuery({
    queryKey: ['koperasi-expense-breakdown', startOfMonthDate, endOfMonthDate],
    queryFn: async () => {
      const { data } = await supabase
        .from('keuangan_koperasi')
        .select('kategori, jumlah')
        .eq('jenis_transaksi', 'Pengeluaran')
        .eq('status', 'posted')
        .gte('tanggal', format(startOfMonthDate, 'yyyy-MM-dd'))
        .lte('tanggal', format(endOfMonthDate, 'yyyy-MM-dd'));

      if (!data) return [];

      const grouped = data.reduce((acc: Record<string, number>, item: any) => {
        const kategori = item.kategori || 'Lainnya';
        acc[kategori] = (acc[kategori] || 0) + parseFloat(item.jumlah || 0);
        return acc;
      }, {});

      return Object.entries(grouped)
        .map(([kategori, jumlah]) => ({ kategori, jumlah: jumlah as number }))
        .sort((a, b) => b.jumlah - a.jumlah)
        .slice(0, 5);
    },
  });

  // Get recent transactions
  const { data: recentTransactions } = useQuery({
    queryKey: ['koperasi-recent-transactions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('keuangan_koperasi')
        .select('id, tanggal, jenis_transaksi, kategori, jumlah, deskripsi, metode_pembayaran')
        .eq('status', 'posted')
        .order('tanggal', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10);
      
      return data || [];
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const renderPercentageChange = (current: number, previous: number, isPositive = true) => {
    const change = getPercentageChange(current, previous);
    const isIncrease = change >= 0;
    const Icon = isIncrease ? ArrowUpRight : ArrowDownRight;
    const colorClass = isIncrease 
      ? (isPositive ? 'text-green-600' : 'text-red-600')
      : (isPositive ? 'text-red-600' : 'text-green-600');

    return (
      <div className={`flex items-center gap-1 text-xs mt-1 ${colorClass}`}>
        <Icon className="w-3 h-3" />
        <span>{Math.abs(change).toFixed(1)}%</span>
        <span className="text-muted-foreground">dari bulan lalu</span>
      </div>
    );
  };

  const pieColors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Memuat data keuangan...</p>
        </div>
      </div>
    );
  }

  const totalBalance = keuanganStats?.saldoKasKoperasi || 0;

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-green-50/30 via-white to-blue-50/30 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-gray-900">Dashboard Keuangan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(startOfMonthDate, 'dd MMMM yyyy', { locale: localeId })} - {format(endOfMonthDate, 'dd MMMM yyyy', { locale: localeId })}
          </p>
        </div>
      </div>

      {/* Summary Cards - Top Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Income Card */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Pemasukan</CardTitle>
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-gray-900">
              {formatCurrency(keuanganStats?.totalPenjualan || 0)}
            </div>
            {lastMonthStats && renderPercentageChange(
              keuanganStats?.totalPenjualan || 0,
              lastMonthStats?.totalPenjualan || 0,
              true
            )}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="text-xs text-muted-foreground">
                Hari ini: {formatCurrency(keuanganStats?.penjualanHariIni || 0)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expense Card */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Pengeluaran</CardTitle>
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-gray-900">
              {formatCurrency(keuanganStats?.totalPengeluaran || 0)}
            </div>
            {lastMonthStats && renderPercentageChange(
              keuanganStats?.totalPengeluaran || 0,
              lastMonthStats?.totalPengeluaran || 0,
              false
            )}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="text-xs text-muted-foreground">
                Beban ke Yayasan: {formatCurrency(keuanganStats?.bebanKeYayasan || 0)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Savings/Laba Card */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Laba Bersih</CardTitle>
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-semibold ${(keuanganStats?.labaBersih || 0) >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
              {formatCurrency(keuanganStats?.labaBersih || 0)}
            </div>
            {lastMonthStats && renderPercentageChange(
              keuanganStats?.labaBersih || 0,
              lastMonthStats?.labaBersih || 0,
              true
            )}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="text-xs text-muted-foreground">
                Laba Kotor: {formatCurrency(keuanganStats?.labaKotor || 0)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Investment/Beban Yayasan Card */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">Beban ke Yayasan</CardTitle>
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-gray-900">
              {formatCurrency(keuanganStats?.bebanKeYayasan || 0)}
            </div>
            {lastMonthStats && renderPercentageChange(
              keuanganStats?.bebanKeYayasan || 0,
              lastMonthStats?.bebanKeYayasan || 0,
              false
            )}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="text-xs text-muted-foreground">
                Dari laba kotor: {keuanganStats?.labaKotor > 0 
                  ? ((keuanganStats.bebanKeYayasan / keuanganStats.labaKotor) * 100).toFixed(1) 
                  : '0'}%
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cashflow Chart - Left */}
        <Card className="lg:col-span-2 bg-white/80 backdrop-blur-sm border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-gray-900">Cashflow</CardTitle>
              <div className="text-sm font-medium text-gray-700">
                Total Balance: <span className="text-gray-900">{formatCurrency(totalBalance)}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {dailyLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : dailyData && dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="colorPemasukan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPengeluaran" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px 12px'
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => dailyData.find(d => d.date === label)?.dateFull}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="pemasukan" 
                    stroke="#10b981" 
                    fillOpacity={1}
                    fill="url(#colorPemasukan)"
                    strokeWidth={2}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="pengeluaran" 
                    stroke="#ef4444" 
                    fillOpacity={1}
                    fill="url(#colorPengeluaran)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                Tidak ada data untuk periode ini
              </div>
            )}
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-xs text-gray-600">Pemasukan</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-xs text-gray-600">Pengeluaran</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expense Breakdown - Right */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-gray-900">Breakdown Pengeluaran</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Total Pengeluaran: {formatCurrency(keuanganStats?.totalPengeluaran || 0)}
            </p>
          </CardHeader>
          <CardContent>
            {expenseBreakdown && expenseBreakdown.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <RechartsPieChart>
                    <Pie
                      data={expenseBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="jumlah"
                      label={({ kategori, percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {expenseBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-4">
                  {expenseBreakdown.map((item, index) => {
                    const percentage = ((item.jumlah / (keuanganStats?.totalPengeluaran || 1)) * 100).toFixed(0);
                    return (
                      <div key={item.kategori} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: pieColors[index % pieColors.length] }}
                          ></div>
                          <span className="text-gray-700 truncate">{item.kategori}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-600">{percentage}%</span>
                          <span className="font-medium text-gray-900 min-w-[80px] text-right">
                            {formatCurrency(item.jumlah)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                Tidak ada data pengeluaran
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row - Finance Score, Balance, Cash Management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Finance Score Card */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-600" />
              Finance Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const labaBersih = keuanganStats?.labaBersih || 0;
              const totalPenjualan = keuanganStats?.totalPenjualan || 0;
              // Score based on profit margin (0-100)
              const profitMargin = totalPenjualan > 0 ? (labaBersih / totalPenjualan) * 100 : 0;
              const score = Math.min(100, Math.max(0, 50 + (profitMargin * 2))); // Scale to 0-100
              const rating = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor';
              const colorClass = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-blue-600' : score >= 40 ? 'text-yellow-600' : 'text-red-600';
              
              return (
                <>
                  <div className="text-3xl font-bold text-gray-900 mb-2">{Math.round(score)}%</div>
                  <div className={`text-sm font-medium ${colorClass} mb-4`}>{rating}</div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        score >= 80 ? 'bg-green-500' : 
                        score >= 60 ? 'bg-blue-500' : 
                        score >= 40 ? 'bg-yellow-500' : 
                        'bg-red-500'
                      }`}
                      style={{ width: `${score}%` }}
                    ></div>
                  </div>
                  <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Margin Laba:</span>
                      <span className="font-medium text-gray-900">{profitMargin.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Laba Bersih:</span>
                      <span className="font-medium text-gray-900">{formatCurrency(labaBersih)}</span>
                    </div>
                  </div>
                </>
              );
            })()}
          </CardContent>
        </Card>

        {/* Balance Card */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-blue-600" />
              Saldo Kas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 mb-4">
              {formatCurrency(keuanganStats?.saldoKasKoperasi || 0)}
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">Cash di Kasir</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(keuanganStats?.saldoCashDiKasir || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-700">Total Setoran</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(keuanganStats?.totalSetoranCash || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cash Management Card */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              Manajemen Kas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Penjualan Cash</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatCurrency(keuanganStats?.totalPenjualanCash || 0)}
                </div>
              </div>
              <div className="pt-3 border-t border-gray-100">
                <div className="text-xs text-muted-foreground mb-1">Setoran Cash</div>
                <div className="text-lg font-semibold text-green-600">
                  {formatCurrency(keuanganStats?.totalSetoranCash || 0)}
                </div>
              </div>
              <div className="pt-3 border-t border-gray-100">
                <div className="text-xs text-muted-foreground mb-1">Saldo di Kasir</div>
                <div className={`text-lg font-semibold ${
                  (keuanganStats?.saldoCashDiKasir || 0) > 0 ? 'text-blue-600' : 'text-gray-900'
                }`}>
                  {formatCurrency(keuanganStats?.saldoCashDiKasir || 0)}
                </div>
                {(keuanganStats?.saldoCashDiKasir || 0) > 100000 && (
                  <div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" />
                    Perlu disetor
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-gray-900">Transaksi Terkini</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTransactions && recentTransactions.length > 0 ? (
            <div className="space-y-2">
              {recentTransactions.slice(0, 5).map((tx: any) => {
                const isPemasukan = tx.jenis_transaksi === 'Pemasukan';
                return (
                  <div 
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">
                        {tx.deskripsi || tx.kategori || 'Transaksi'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(tx.tanggal), 'dd MMM yyyy', { locale: localeId })} • {tx.kategori}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`text-sm font-semibold ${
                        isPemasukan ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {isPemasukan ? '+' : '-'}{formatCurrency(parseFloat(tx.jumlah || 0))}
                      </div>
                      <div className={`w-2 h-2 rounded-full ${
                        tx.status === 'posted' ? 'bg-green-500' : 'bg-yellow-500'
                      }`}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Tidak ada transaksi terbaru
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
