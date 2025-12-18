import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { FileX, TrendingDown } from 'lucide-react';
import { InventoryMonthlyData, InventoryConditionData } from '@/services/inventarisDashboard.service';

interface InventoryChartsSectionProps {
  monthlyData?: InventoryMonthlyData[];
  categoryData?: InventoryConditionData[]; // Now using condition data
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
            Belum ada data transaksi inventaris yang tersedia
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const InventoryChartsSection: React.FC<InventoryChartsSectionProps> = ({ 
  monthlyData = [], 
  categoryData = []
}) => {
  // Check if we have data for transaction chart (masuk, koperasi, dapur, distribusi_bantuan)
  const hasMonthlyData = monthlyData.length > 0 && 
    monthlyData.some(d => (d.masuk > 0 || d.koperasi > 0 || d.dapur > 0 || d.distribusi_bantuan > 0));
  
  // Check if we have condition data
  const hasConditionData = categoryData.length > 0 && 
    categoryData.some(c => c.value > 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold mb-2 text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm mb-1" style={{ color: entry.color }}>
              <span className="font-medium">{entry.name}:</span>{' '}
              <span className="text-gray-700">{entry.value.toLocaleString('id-ID')} unit</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const ConditionTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold mb-1 text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-700">{data.value.toLocaleString('id-ID')} item</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Monthly Transaction Chart - Tujuan Pengeluaran */}
      {!hasMonthlyData ? (
        <EmptyStateCard 
          title="Ringkasan Transaksi" 
          message="Tujuan pengeluaran inventaris per bulan"
          icon={<TrendingDown className="w-8 h-8 text-gray-400" />}
        />
      ) : (
        <Card className="rounded-lg border border-gray-200 shadow-sm bg-white">
          <CardHeader className="pb-4 pt-4 px-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-gray-900">Ringkasan Transaksi</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Tujuan pengeluaran inventaris per bulan
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorMasuk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                    </linearGradient>
                    <linearGradient id="colorKoperasi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                    </linearGradient>
                    <linearGradient id="colorDapur" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05}/>
                    </linearGradient>
                    <linearGradient id="colorDistribusi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
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
                    tickFormatter={(value) => value.toLocaleString('id-ID')}
                  />
                  <Tooltip 
                    content={<CustomTooltip />}
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
                  <Area 
                    type="monotone" 
                    dataKey="masuk" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    fill="url(#colorMasuk)"
                    name="Masuk"
                    dot={{ fill: '#10b981', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone"
                    dataKey="koperasi"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Koperasi"
                  />
                  <Line 
                    type="monotone"
                    dataKey="dapur"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ fill: '#f59e0b', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Dapur"
                  />
                  <Line 
                    type="monotone"
                    dataKey="distribusi_bantuan"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ fill: '#8b5cf6', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Distribusi Bantuan"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Condition Distribution Chart */}
      {!hasConditionData ? (
        <EmptyStateCard 
          title="Distribusi Kondisi" 
          message="Distribusi inventaris berdasarkan kondisi barang"
          icon={<FileX className="w-8 h-8 text-gray-400" />}
        />
      ) : (
        <Card className="rounded-lg border border-gray-200 shadow-sm bg-white">
          <CardHeader className="pb-4 pt-4 px-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-gray-900">Distribusi Kondisi</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Berdasarkan kondisi barang inventaris
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData.map(cond => ({
                      ...cond,
                      payload: cond
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
                    content={<ConditionTooltip />}
                    contentStyle={{ 
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {categoryData.map((condition, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: condition.color }}
                  />
                  <span className="text-sm text-gray-600 truncate">
                    {condition.name}: <span className="font-medium">{condition.value.toLocaleString('id-ID')}</span> item
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

export default InventoryChartsSection;
