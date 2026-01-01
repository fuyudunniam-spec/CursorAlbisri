import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar } from 'recharts';
import { FileX, TrendingDown, X, Eye } from 'lucide-react';
import { getSubCategoryDataByCategory, CategoryChartData } from '@/services/keuanganChart.service';

interface ChartsSectionProps {
  monthlyData?: Array<{
    month: string;
    pemasukan: number;
    pengeluaran: number;
  }>;
  categoryData?: Array<{
    name: string;
    value: number; // percentage (still used for chart calculation)
    amount?: number; // nominal in rupiah (for display)
    color: string;
  }>;
  selectedAccountId?: string;
  selectedAccountName?: string;
  startDateFilter?: string; // Optional start date filter (YYYY-MM-DD format) for sub category drill-down
  endDateFilter?: string; // Optional end date filter (YYYY-MM-DD format) for sub category drill-down
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
  selectedAccountName,
  startDateFilter,
  endDateFilter
}) => {
  // State untuk inline drill-down (bukan modal)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [subCategoryData, setSubCategoryData] = useState<CategoryChartData[]>([]);
  const [loadingSubCategory, setLoadingSubCategory] = useState(false);

  const hasMonthlyData = monthlyData.length > 0 && 
    monthlyData.some(d => (d.pemasukan > 0 || d.pengeluaran > 0));
  const hasCategoryData = categoryData.length > 0 && 
    categoryData.some(c => c.value > 0);

  // Handle click on pie chart slice - inline drill-down
  const handleCategoryClick = async (categoryName: string) => {
    if (selectedCategory === categoryName) {
      // Jika klik kategori yang sama, kembali ke level 1
      setSelectedCategory(null);
      setSubCategoryData([]);
      return;
    }
    
    setSelectedCategory(categoryName);
    setLoadingSubCategory(true);
    
    try {
      // Pass date range to getSubCategoryDataByCategory to ensure it uses the same period as the main chart
      const subData = await getSubCategoryDataByCategory(
        categoryName, 
        selectedAccountId,
        startDateFilter,
        endDateFilter
      );
      // Group sub kategori kosong sebagai "(Tanpa Sub Kategori)"
      const processedData = subData.map(item => ({
        ...item,
        name: item.name || '(Tanpa Sub Kategori)'
      }));
      setSubCategoryData(processedData);
    } catch (error) {
      console.error('Error loading sub category data:', error);
      setSubCategoryData([]);
    } finally {
      setLoadingSubCategory(false);
    }
  };

  // Handle back button
  const handleBack = () => {
    setSelectedCategory(null);
    setSubCategoryData([]);
  };

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
              <div className="flex-1 min-w-0">
                {selectedCategory ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBack}
                      className="h-7 w-7 p-0 flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-medium text-gray-900 truncate">
                        Kategori: {selectedCategory}
                      </CardTitle>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Rincian sub kategori
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <CardTitle className="text-sm font-medium text-gray-900">Distribusi Kategori</CardTitle>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Pengeluaran berdasarkan kategori
                    </p>
                  </div>
                )}
              </div>
              <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 text-xs px-2 py-0.5 flex-shrink-0 ml-2">
                {selectedAccountName || 'Semua Akun'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {selectedCategory ? (
              // Level 2: Sub Kategori View (Inline)
              <div className="space-y-4">
                {loadingSubCategory ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-sm text-gray-500">Memuat data sub kategori...</p>
                    </div>
                  </div>
                ) : subCategoryData.length === 0 ? (
                  <div className="h-[300px] flex flex-col items-center justify-center text-center">
                    <FileX className="h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      Tidak Ada Sub Kategori
                    </p>
                    <p className="text-xs text-gray-500 max-w-sm">
                      Kategori ini tidak memiliki sub kategori atau belum ada transaksi dengan sub kategori
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Bar Chart untuk Sub Kategori */}
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={subCategoryData}
                          layout="vertical"
                          margin={{ top: 10, right: 20, left: 120, bottom: 10 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={true} vertical={false} />
                          <XAxis
                            type="number"
                            tickFormatter={(value) => `${(value / 1000000).toFixed(1)}jt`}
                            stroke="#9ca3af"
                            style={{ fontSize: '11px' }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            stroke="#9ca3af"
                            style={{ fontSize: '11px' }}
                            width={110}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0];
                                const subCategoryData = data.payload as any;
                                return (
                                  <div className="bg-white p-2.5 border border-gray-200 rounded-lg shadow-lg">
                                    <p className="font-medium text-xs mb-1.5">{data.name}</p>
                                    <p className="text-xs font-semibold" style={{ color: data.color }}>
                                      {formatCurrency(subCategoryData?.amount || 0)}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {subCategoryData?.value || 0}% dari total kategori
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar
                            dataKey="amount"
                            radius={[0, 4, 4, 0]}
                          >
                            {subCategoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Top 5 Sub Kategori List */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">
                        Daftar Sub Kategori
                      </h4>
                      <div className="space-y-2">
                        {subCategoryData.slice(0, 5).map((subCategory, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: subCategory.color }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {subCategory.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {subCategory.value}% dari total kategori
                                </p>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-4">
                              <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                                {formatCurrency(subCategory.amount)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Total Summary */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-900">
                            Total {selectedCategory}
                          </span>
                          <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
                            {formatCurrency(
                              subCategoryData.reduce((sum, item) => sum + (item.amount || 0), 0)
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              // Level 1: Main Categories View
              <>
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
                        isAnimationActive={true}
                        onClick={(data: any, index: number, e: any) => {
                          // Handle click on pie slice
                          // Data structure: data contains { name, value, payload, ... }
                          const categoryName = data?.name || data?.payload?.name || (categoryData[index]?.name);
                          if (categoryName) {
                            handleCategoryClick(categoryName);
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color}
                            style={{ cursor: 'pointer' }}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0];
                            const categoryData = data.payload as any;
                            const displayValue = categoryData?.amount !== undefined
                              ? formatCurrency(categoryData.amount)
                              : `${data.value}%`;
                            
                            return (
                              <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                                <p className="font-medium text-sm mb-2">{data.name}</p>
                                <p className="text-xs" style={{ color: data.color }}>
                                  {displayValue}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categoryData.map((category, index) => (
                    <button
                      key={index}
                      onClick={() => handleCategoryClick(category.name)}
                      className="flex items-start gap-2 min-w-0 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                      title="Klik untuk melihat rincian sub kategori"
                    >
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0 mt-1" 
                        style={{ backgroundColor: category.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-900 font-medium break-words group-hover:text-blue-600 transition-colors">
                          {category.name}
                        </div>
                        <div className="text-sm text-gray-600 font-semibold break-words">
                          {category.amount !== undefined 
                            ? formatCurrency(category.amount)
                            : `${category.value}%`
                          }
                        </div>
                      </div>
                      <Eye className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  );
};

export default ChartsSection;
