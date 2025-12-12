import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format, getMonth, getYear } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

interface BagiHasilLog {
  id: string;
  bulan: number;
  tahun: number;
  total_penjualan: number;
  bagian_yayasan: number;
  bagian_koperasi: number;
  status: 'paid' | 'unpaid';
  tanggal_bayar?: string;
  created_at: string;
}

interface MonthlyData {
  month: string;
  monthYear: string;
  total_penjualan: number;
  bagian_yayasan: number;
  bagian_koperasi: number;
  status: 'paid' | 'unpaid';
}

interface ProfitSharingBreakdownProps {
  startDate: Date;
  endDate: Date;
}

const ProfitSharingBreakdown = ({ startDate, endDate }: ProfitSharingBreakdownProps) => {
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [totalData, setTotalData] = useState({
    totalPenjualan: 0,
    bagianYayasan: 0,
    bagianKoperasi: 0,
  });

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get the start and end month/year from date range
      const startMonth = getMonth(startDate) + 1; // getMonth is 0-indexed
      const startYear = getYear(startDate);
      const endMonth = getMonth(endDate) + 1;
      const endYear = getYear(endDate);

      // Fetch data from koperasi_bagi_hasil_log
      // Note: Supabase doesn't support multiple .order() calls, so we fetch and sort client-side
      const { data: bagiHasilData, error } = await supabase
        .from('koperasi_bagi_hasil_log')
        .select('*')
        .gte('tahun', startYear)
        .lte('tahun', endYear);

      if (error) {
        throw new Error(`Gagal memuat data bagi hasil: ${error.message}`);
      }

      // Sort data by tahun and bulan (client-side since Supabase doesn't support multiple order)
      const sortedData = (bagiHasilData || []).sort((a: BagiHasilLog, b: BagiHasilLog) => {
        if (a.tahun !== b.tahun) {
          return a.tahun - b.tahun;
        }
        return a.bulan - b.bulan;
      });

      // Filter data within the date range
      const filteredData = sortedData.filter((item: BagiHasilLog) => {
        const itemDate = new Date(item.tahun, item.bulan - 1);
        const start = new Date(startYear, startMonth - 1);
        const end = new Date(endYear, endMonth);
        return itemDate >= start && itemDate <= end;
      });

      // Transform data for charts
      const monthlyChartData: MonthlyData[] = filteredData.map((item: BagiHasilLog) => {
        const date = new Date(item.tahun, item.bulan - 1);
        return {
          month: format(date, 'MMM', { locale: localeId }),
          monthYear: format(date, 'MMM yyyy', { locale: localeId }),
          total_penjualan: item.total_penjualan,
          bagian_yayasan: item.bagian_yayasan,
          bagian_koperasi: item.bagian_koperasi,
          status: item.status,
        };
      });

      setMonthlyData(monthlyChartData);

      // Calculate totals
      const totals = filteredData.reduce(
        (acc, item: BagiHasilLog) => ({
          totalPenjualan: acc.totalPenjualan + item.total_penjualan,
          bagianYayasan: acc.bagianYayasan + item.bagian_yayasan,
          bagianKoperasi: acc.bagianKoperasi + item.bagian_koperasi,
        }),
        { totalPenjualan: 0, bagianYayasan: 0, bagianKoperasi: 0 }
      );

      setTotalData(totals);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal memuat data bagi hasil';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-gray-500">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p>Memuat data bagi hasil...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate profit sharing ratio dynamically from data
  const totalBagiHasil = totalData.bagianYayasan + totalData.bagianKoperasi;
  const yayasanPercentage = totalBagiHasil > 0 
    ? Math.round((totalData.bagianYayasan / totalBagiHasil) * 100) 
    : 0;
  const koperasiPercentage = totalBagiHasil > 0 
    ? Math.round((totalData.bagianKoperasi / totalBagiHasil) * 100) 
    : 0;

  const pieData = [
    { name: `Yayasan (${yayasanPercentage}%)`, value: totalData.bagianYayasan, color: '#3b82f6' },
    { name: `Koperasi (${koperasiPercentage}%)`, value: totalData.bagianKoperasi, color: '#10b981' },
  ];

  return (
    <div className="space-y-6">

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Penjualan */}
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Total Penjualan</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {formatCurrency(totalData.totalPenjualan)}
            </div>
            <p className="text-xs text-gray-600">
              Penjualan produk yayasan
            </p>
          </CardContent>
        </Card>

        {/* Bagian Yayasan */}
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Bagian Yayasan</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {formatCurrency(totalData.bagianYayasan)}
            </div>
            <p className="text-xs text-blue-600">
              {yayasanPercentage > 0 ? `${yayasanPercentage}% dari total penjualan` : 'Belum ada data'}
            </p>
          </CardContent>
        </Card>

        {/* Bagian Koperasi */}
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Bagian Koperasi</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {formatCurrency(totalData.bagianKoperasi)}
            </div>
            <p className="text-xs text-green-600">
              {koperasiPercentage > 0 ? `${koperasiPercentage}% dari total penjualan` : 'Belum ada data'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sales Trend Chart */}
        <Card className="bg-white border border-gray-200">
          <CardHeader className="p-5 pb-3 border-b border-gray-100">
            <CardTitle className="text-sm font-semibold text-gray-900">
              Tren Penjualan Produk Yayasan
            </CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">Perkembangan penjualan per bulan</p>
          </CardHeader>
          <CardContent className="p-5">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ 
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  labelStyle={{ color: '#374151', fontWeight: 600 }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '11px', paddingTop: '16px' }}
                  iconType="line"
                />
                <Line 
                  type="monotone" 
                  dataKey="total_penjualan" 
                  stroke="#3b82f6" 
                  strokeWidth={2.5}
                  name="Total Penjualan"
                  dot={{ fill: '#3b82f6', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Profit Sharing Bar Chart */}
        <Card className="bg-white border border-gray-200">
          <CardHeader className="p-5 pb-3 border-b border-gray-100">
            <CardTitle className="text-sm font-semibold text-gray-900">
              Pembagian Bagi Hasil per Bulan
            </CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">
              {yayasanPercentage > 0 && koperasiPercentage > 0 
                ? `Yayasan ${yayasanPercentage}% vs Koperasi ${koperasiPercentage}%`
                : 'Belum ada data bagi hasil'}
            </p>
          </CardHeader>
          <CardContent className="p-5">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ 
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  labelStyle={{ color: '#374151', fontWeight: 600 }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '11px', paddingTop: '16px' }}
                />
                <Bar 
                  dataKey="bagian_yayasan" 
                  fill="#3b82f6"
                  radius={[6, 6, 0, 0]}
                  name={`Bagian Yayasan (${yayasanPercentage}%)`}
                />
                <Bar 
                  dataKey="bagian_koperasi" 
                  fill="#10b981"
                  radius={[6, 6, 0, 0]}
                  name={`Bagian Koperasi (${koperasiPercentage}%)`}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Pembagian Bagi Hasil */}
      <Card className="bg-white border border-gray-200">
        <CardHeader className="p-5 pb-3 border-b border-gray-100">
          <CardTitle className="text-sm font-semibold text-gray-900">
            Pembagian Bagi Hasil {yayasanPercentage > 0 && koperasiPercentage > 0 ? `(${yayasanPercentage}% : ${koperasiPercentage}%)` : ''}
          </CardTitle>
          <p className="text-xs text-gray-500 mt-0.5">Distribusi margin bersih</p>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Pie Chart */}
            <div className="lg:col-span-1 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={200}>
                <RechartsPieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>

            {/* Distribution Cards */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bagian Yayasan */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600 uppercase">Yayasan</span>
                  <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-bold">{yayasanPercentage}%</span>
                </div>
                <div className="text-xl font-bold text-gray-900 mb-1">
                  {formatCurrency(totalData.bagianYayasan)}
                </div>
                <p className="text-xs text-gray-500">Transfer ke rekening yayasan</p>
              </div>

              {/* Bagian Koperasi */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600 uppercase">Koperasi</span>
                  <span className="bg-green-600 text-white px-2 py-0.5 rounded text-xs font-bold">{koperasiPercentage}%</span>
                </div>
                <div className="text-xl font-bold text-gray-900 mb-1">
                  {formatCurrency(totalData.bagianKoperasi)}
                </div>
                <p className="text-xs text-gray-500">Masuk ke Kas Pokok Koperasi</p>
              </div>
            </div>
          </div>

          {/* Summary Info */}
          <div className="mt-5 bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Ringkasan Perhitungan</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Penjualan Produk Yayasan</span>
                <span className="font-semibold text-gray-900">{formatCurrency(totalData.totalPenjualan)}</span>
              </div>
              <div className="h-px bg-gray-300 my-1"></div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Bagian Yayasan ({yayasanPercentage}%)</span>
                <span className="font-semibold text-blue-600">{formatCurrency(totalData.bagianYayasan)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Bagian Koperasi ({koperasiPercentage}%)</span>
                <span className="font-semibold text-green-600">{formatCurrency(totalData.bagianKoperasi)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfitSharingBreakdown;
