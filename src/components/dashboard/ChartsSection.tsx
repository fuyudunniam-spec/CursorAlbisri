import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { FileX, TrendingDown } from 'lucide-react';

interface ChartsSectionProps {
  monthlyData?: Array<{
    month: string;
    pemasukan: number;
    pengeluaran: number;
  }>;
  categoryData?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  selectedAccountId?: string;
  selectedAccountName?: string;
}

const EmptyStateCard: React.FC<{ 
  title: string; 
  message: string; 
  icon: React.ReactNode; 
  selectedAccountName?: string;
}> = ({ title, message, icon, selectedAccountName }) => (
  <Card className="rounded-lg border border-gray-200 shadow-sm bg-white">
    <CardHeader className="pb-4 pt-4 px-4">
      <div className="flex items-center justify-between">
        <div>
          <CardTitle className="text-sm font-medium text-gray-900">{title}</CardTitle>
          <p className="text-xs text-gray-500 mt-0.5">{message}</p>
        </div>
        {selectedAccountName && (
          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 text-xs px-2 py-0.5">
            {selectedAccountName}
          </Badge>
        )}
      </div>
    </CardHeader>
    <CardContent>
      <div className="h-[300px] flex flex-col items-center justify-center text-center space-y-4">
        <div className="p-4 bg-gray-50 rounded-full">
          {icon}
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-800">Tidak Ada Data</h3>
          <p className="text-xs text-gray-500">
            {selectedAccountName 
              ? `Belum ada transaksi untuk akun ${selectedAccountName}` 
              : 'Belum ada data transaksi yang tersedia'
            }
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const ChartsSection: React.FC<ChartsSectionProps> = ({ 
  monthlyData = [], 
  categoryData = [],
  selectedAccountId,
  selectedAccountName
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
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
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
      {!hasMonthlyData && selectedAccountId ? (
        <EmptyStateCard 
          title="Ringkasan Transaksi" 
          message="Pemasukan vs pengeluaran bulanan"
          icon={<TrendingDown className="w-6 h-6 text-gray-400" />}
          selectedAccountName={selectedAccountName}
        />
      ) : (
        <Card className="rounded-lg border border-gray-200 shadow-sm bg-white">
          <CardHeader className="pb-4 pt-4 px-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-gray-900">Ringkasan Transaksi</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Pemasukan vs pengeluaran bulanan
                </p>
              </div>
              <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 text-xs px-2 py-0.5">
                {selectedAccountName || 'Kas Koperasi'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPemasukan" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                    </linearGradient>
                    <linearGradient id="colorPengeluaran" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tickFormatter={(value) => `${(value / 1000000).toFixed(1)}jt`}
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    content={<CustomTooltip />}
                    cursor={{ stroke: '#e5e7eb', strokeWidth: 1, strokeDasharray: '5 5' }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                    iconType="circle"
                    formatter={(value) => <span style={{ color: '#6b7280' }}>{value}</span>}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="pemasukan" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fill="url(#colorPemasukan)"
                    name="Pemasukan"
                    dot={false}
                    activeDot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="pengeluaran" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    fill="url(#colorPengeluaran)"
                    name="Pengeluaran"
                    dot={false}
                    activeDot={{ r: 5, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {!hasCategoryData && selectedAccountId ? (
        <EmptyStateCard 
          title="Distribusi Kategori" 
          message="Pengeluaran berdasarkan kategori"
          icon={<FileX className="w-6 h-6 text-gray-400" />}
          selectedAccountName={selectedAccountName}
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
              <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 text-xs px-2 py-0.5">
                {selectedAccountName || 'Kas Koperasi'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
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
                    formatter={(value: number) => `${value}%`}
                    labelFormatter={(label: string) => label}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
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
                  <span className="text-sm text-gray-600 truncate">
                    {category.name}: {category.value}%
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

export default ChartsSection;
