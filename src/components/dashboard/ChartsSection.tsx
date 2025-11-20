import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileX, TrendingDown, AlertCircle } from 'lucide-react';

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

// Empty State Component
const EmptyStateCard: React.FC<{ 
  title: string; 
  message: string; 
  icon: React.ReactNode; 
  selectedAccountName?: string;
}> = ({ title, message, icon, selectedAccountName }) => (
  <Card className="rounded-2xl shadow-md border-0 h-fit">
    <CardHeader className="pb-4">
      <div className="flex items-center justify-between">
        <div>
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        {selectedAccountName ? (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
            Filter: {selectedAccountName}
          </Badge>
        ) : (
          <Badge className="bg-gray-100 text-gray-800 border-gray-200 text-xs">
            Semua Akun
          </Badge>
        )}
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
            {selectedAccountName 
              ? `Belum ada transaksi untuk akun ${selectedAccountName}` 
              : 'Belum ada data transaksi yang tersedia'
            }
          </p>
          <div className="pt-2">
            <p className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
              💡 Tambahkan transaksi untuk melihat analitik
            </p>
          </div>
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
  // Debug logging for received props
  console.log('📊 ChartsSection rendered with:', {
    monthlyDataLength: monthlyData.length,
    categoryDataLength: categoryData.length,
    selectedAccountId,
    selectedAccountName,
    categoryDataPreview: categoryData.slice(0, 3)
  });
  // Mock data for demonstration
  const mockMonthlyData = [
    { month: 'Apr', pemasukan: 1500000, pengeluaran: 1200000 },
    { month: 'Mei', pemasukan: 1800000, pengeluaran: 1400000 },
    { month: 'Jun', pemasukan: 2200000, pengeluaran: 1600000 },
    { month: 'Jul', pemasukan: 1900000, pengeluaran: 1300000 },
    { month: 'Agu', pemasukan: 2400000, pengeluaran: 1800000 },
    { month: 'Sep', pemasukan: 2100000, pengeluaran: 1500000 },
    { month: 'Okt', pemasukan: 1900000, pengeluaran: 833000 },
  ];

  const mockCategoryData = [
    { name: 'Operasional', value: 45, color: '#3b82f6' },
    { name: 'Utilitas', value: 30, color: '#f59e0b' },
    { name: 'Santri', value: 15, color: '#10b981' },
    { name: 'Lainnya', value: 10, color: '#6b7280' },
  ];

  // Detect if we have meaningful data
  const hasMonthlyData = monthlyData.length > 0 && 
    monthlyData.some(d => (d.pemasukan > 0 || d.pengeluaran > 0));
  const hasCategoryData = categoryData.length > 0 && 
    categoryData.some(c => c.value > 0);
  
  console.log('📊 Data availability check:', {
    hasMonthlyData,
    hasCategoryData,
    monthlyDataLength: monthlyData.length,
    categoryDataLength: categoryData.length,
    selectedAccountName
  });

  // Use real data if available, fallback to mock only when no account is selected
  const shouldShowMockData = !selectedAccountId && !hasMonthlyData && !hasCategoryData;
  const data = hasMonthlyData ? monthlyData : (shouldShowMockData ? mockMonthlyData : []);
  const categories = hasCategoryData ? categoryData : (shouldShowMockData ? mockCategoryData : []);

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
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Income vs Expense Chart */}
      {!hasMonthlyData && selectedAccountId ? (
        <EmptyStateCard 
          title="Transaction Overview" 
          message="Perbandingan pemasukan dan pengeluaran per bulan"
          icon={<TrendingDown className="w-8 h-8 text-gray-400" />}
          selectedAccountName={selectedAccountName}
        />
      ) : (
        <Card className="rounded-2xl shadow-md border-0 h-fit">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">Transaction Overview</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Perbandingan pemasukan dan pengeluaran per bulan
                </p>
              </div>
              {selectedAccountId && selectedAccountName ? (
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                  Filter: {selectedAccountName}
                </Badge>
              ) : (
                <Badge className="bg-gray-100 text-gray-800 border-gray-200 text-xs">
                  Semua Akun
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `${value / 1000000}jt`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="pemasukan" fill="#3b82f6" name="Pemasukan" />
                  <Bar dataKey="pengeluaran" fill="#f59e0b" name="Pengeluaran" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Breakdown Chart */}
      {!hasCategoryData && selectedAccountId ? (
        <EmptyStateCard 
          title="Statistics" 
          message="Distribusi pengeluaran berdasarkan kategori"
          icon={<FileX className="w-8 h-8 text-gray-400" />}
          selectedAccountName={selectedAccountName}
        />
      ) : (
        <Card className="rounded-2xl shadow-md border-0 h-fit">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">Statistics</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Distribusi pengeluaran berdasarkan kategori
                </p>
              </div>
              {selectedAccountId && selectedAccountName ? (
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                  Filter: {selectedAccountName}
                </Badge>
              ) : (
                <Badge className="bg-gray-100 text-gray-800 border-gray-200 text-xs">
                  Semua Akun
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categories}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => `${value}%`}
                    labelFormatter={(label: string) => label}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {categories.map((category, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-sm text-muted-foreground truncate">
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
