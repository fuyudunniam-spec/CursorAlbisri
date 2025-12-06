import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { FileX, TrendingDown } from 'lucide-react';
import { KeuanganKoperasiMonthlyData, KeuanganKoperasiCategoryData } from '@/services/keuanganKoperasi.service';

interface KeuanganChartsSectionProps {
  monthlyData?: KeuanganKoperasiMonthlyData[];
  categoryData?: KeuanganKoperasiCategoryData[];
}

const EmptyStateCard: React.FC<{ 
  title: string; 
  message: string; 
  icon: React.ReactNode; 
}> = ({ title, message, icon }) => (
  <Card className="rounded-lg border border-gray-200 shadow-sm bg-white">
    <CardHeader className="pb-4 pt-4 px-4">
      <div className="flex items-center justify-between">
        <div>
          <CardTitle className="text-sm font-medium text-gray-900">{title}</CardTitle>
          <p className="text-xs text-gray-500 mt-0.5">{message}</p>
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <div className="h-[300px] flex flex-col items-center justify-center text-center space-y-6">
        <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full shadow-inner">
          {icon}
        </div>
        <div className="space-y-3 max-w-sm">
          <h3 className="text-xl font-semibold text-gray-800">Tidak Ada Data</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Belum ada data transaksi keuangan yang tersedia
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const KeuanganChartsSection: React.FC<KeuanganChartsSectionProps> = ({ 
  monthlyData = [], 
  categoryData = []
}) => {
  const hasMonthlyData = monthlyData.length > 0 && 
    monthlyData.some(d => (d.pemasukan > 0 || d.pengeluaran > 0));
  const hasCategoryData = categoryData.length > 0 && 
    categoryData.some(c => c.value > 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="mb-1">
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Monthly Transaction Chart */}
      {!hasMonthlyData ? (
        <EmptyStateCard 
          title="Ringkasan Transaksi" 
          message="Pergerakan pemasukan dan pengeluaran per bulan"
          icon={<TrendingDown className="w-8 h-8 text-gray-400" />}
        />
      ) : (
        <Card className="rounded-lg border border-gray-200 shadow-sm bg-white">
          <CardHeader className="pb-4 pt-4 px-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-gray-900">Ringkasan Transaksi</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Pergerakan pemasukan dan pengeluaran bulanan
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorPemasukan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorPengeluaran" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    tickFormatter={(value) => `${value / 1000000}jt`}
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip 
                    content={<CustomTooltip />}
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                    iconType="circle"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="pemasukan" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    fill="url(#colorPemasukan)"
                    name="Pemasukan"
                    dot={{ fill: 'white', stroke: '#10b981', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="pengeluaran" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    fill="url(#colorPengeluaran)"
                    name="Pengeluaran"
                    dot={{ fill: 'white', stroke: '#ef4444', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Distribution Chart */}
      {!hasCategoryData ? (
        <EmptyStateCard 
          title="Distribusi Kategori" 
          message="Distribusi pengeluaran berdasarkan kategori"
          icon={<FileX className="w-8 h-8 text-gray-400" />}
        />
      ) : (
        <Card className="rounded-lg border border-gray-200 shadow-sm bg-white">
          <CardHeader className="pb-4 pt-4 px-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-gray-900">Distribusi Kategori</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Pengeluaran berdasarkan kategori
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData.map(cat => ({
                      ...cat,
                      payload: cat
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0];
                        return (
                          <div className="bg-white p-3 border rounded-lg shadow-lg">
                            <p className="font-medium mb-1">{data.name}</p>
                            <p className="text-sm">{formatCurrency(data.value as number)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {categoryData.map((category, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-sm text-muted-foreground truncate">
                    {category.name}: {formatCurrency(category.value)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default KeuanganChartsSection;




