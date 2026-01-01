import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, Users, Target, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  RancanganPelayananService,
  type RancanganStatistik
} from '@/services/rancanganPelayanan.service';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const RancanganDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statistik, setStatistik] = useState<RancanganStatistik | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [stats, summary] = await Promise.all([
        RancanganPelayananService.getStatistik(),
        RancanganPelayananService.getRancanganSummary({ status: 'aktif' })
      ]);

      setStatistik(stats);

      // Prepare chart data
      const chartDataMap = new Map<string, { target: number; dukungan: number; eksekusi: number }>();
      
      summary.forEach((item: any) => {
        const key = item.tahun?.toString() || 'Unknown';
        if (!chartDataMap.has(key)) {
          chartDataMap.set(key, { target: 0, dukungan: 0, eksekusi: 0 });
        }
        const data = chartDataMap.get(key)!;
        data.target += parseFloat(item.total_target || 0);
        data.dukungan += parseFloat(item.total_dukungan || 0);
        // Eksekusi = dukungan (karena realisasi kas dikelola di modul keuangan)
        data.eksekusi = data.dukungan;
      });

      const chartDataArray = Array.from(chartDataMap.entries())
        .map(([tahun, data]) => ({
          tahun,
          target: data.target,
          dukungan: data.dukungan,
          eksekusi: data.eksekusi
        }))
        .sort((a, b) => a.tahun.localeCompare(b.tahun));

      setChartData(chartDataArray);
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      toast.error('Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    toast.success('Data berhasil diperbarui');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-lg shadow-sm animate-pulse"></div>
          ))}
        </div>
        <div className="h-96 bg-white rounded-lg shadow-sm animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <span>Donasi</span>
            <span>/</span>
            <span className="text-gray-900 font-medium">Dashboard Rancangan Pelayanan</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-1">
            Dashboard Rancangan Pelayanan
          </h1>
          <p className="text-sm text-gray-500">
            Analisis target, dukungan, dan eksekusi pelayanan santri
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="border-gray-300 text-gray-700 hover:bg-gray-50 h-9"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Rancangan */}
        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Rancangan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-gray-900">
                {statistik?.total_rancangan || 0}
              </div>
              <div className="p-2 bg-slate-100 rounded-lg">
                <Target className="h-5 w-5 text-slate-600" />
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {statistik?.rancangan_aktif || 0} aktif
            </div>
          </CardContent>
        </Card>

        {/* Kekurangan Dukungan */}
        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Kekurangan Dukungan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(statistik?.total_kekurangan_dukungan || 0)}
              </div>
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Gap antara target dan dukungan
            </div>
          </CardContent>
        </Card>

        {/* Santri Terlayani */}
        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Santri Terlayani
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-blue-600">
                {statistik?.santri_terlayani || 0}
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {statistik?.santri_tercukupi || 0} tercukupi
            </div>
          </CardContent>
        </Card>

        {/* Persentase Pemenuhan */}
        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Persentase Pemenuhan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-green-600">
                {(statistik?.persentase_pemenuhan_keseluruhan || 0).toFixed(1)}%
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Dari total target keseluruhan
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart: Target vs Dukungan vs Eksekusi */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Perbandingan Target, Dukungan, dan Eksekusi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="tahun" 
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) => {
                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                    return value.toString();
                  }}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="target" 
                  fill="#64748b" 
                  name="Total Rancangan (Target)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="dukungan" 
                  fill="#3b82f6" 
                  name="Dukungan Masuk (Donasi)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="eksekusi" 
                  fill="#10b981" 
                  name="Eksekusi Lapangan (Keuangan)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Line Chart: Trend Pemenuhan */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Trend Pemenuhan Rancangan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="tahun" 
                  stroke="#6b7280"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) => {
                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                    return value.toString();
                  }}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="target" 
                  stroke="#64748b" 
                  strokeWidth={2}
                  name="Total Rancangan (Target)"
                  dot={{ fill: '#64748b', r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="dukungan" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Dukungan Masuk (Donasi)"
                  dot={{ fill: '#3b82f6', r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="eksekusi" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Eksekusi Lapangan (Keuangan)"
                  dot={{ fill: '#10b981', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Target Keseluruhan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(statistik?.total_target_keseluruhan || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Dukungan Keseluruhan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(statistik?.total_dukungan_keseluruhan || 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Status Santri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Tercukupi:</span>
                <span className="font-semibold text-green-600">
                  {statistik?.santri_tercukupi || 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Terlayani:</span>
                <span className="font-semibold text-blue-600">
                  {statistik?.santri_terlayani || 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Belum Terpenuhi:</span>
                <span className="font-semibold text-gray-600">
                  {statistik?.santri_belum_terpenuhi || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RancanganDashboard;

