import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  Package,
  DollarSign,
  PieChart,
  Activity
} from 'lucide-react';
import { SalesStats as SalesStatsType } from '@/types/sales.types';

interface SalesStatsProps {
  stats: SalesStatsType | undefined;
  isLoading: boolean;
}

const SalesStats: React.FC<SalesStatsProps> = ({ stats, isLoading }) => {
  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-32 bg-gray-200 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Tidak ada data penjualan</p>
        </CardContent>
      </Card>
    );
  }

  // Get top 5 categories
  const topCategories = Object.entries(stats.kategoriSummary)
    .sort(([,a], [,b]) => b.total - a.total)
    .slice(0, 5);

  // Get top 5 items
  const topItems = stats.itemSummary
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Penjualan</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatRupiah(stats.totalPenjualan)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalTransaksi} transaksi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rata-rata</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatRupiah(stats.rataRataPenjualan)}</div>
            <p className="text-xs text-muted-foreground">
              Per transaksi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Item</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalJumlah}</div>
            <p className="text-xs text-muted-foreground">
              Item terjual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kategori</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(stats.kategoriSummary).length}</div>
            <p className="text-xs text-muted-foreground">
              Kategori terjual
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Penjualan per Kategori
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topCategories.map(([kategori, data], index) => {
                const percentage = (data.total / stats.totalPenjualan) * 100;
                const maxTotal = Math.max(...topCategories.map(([,d]) => d.total));
                const barWidth = (data.total / maxTotal) * 100;
                
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{kategori}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{formatRupiah(data.total)}</span>
                        <Badge variant="outline">{percentage.toFixed(1)}%</Badge>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{data.transaksi} transaksi</span>
                      <span>{data.jumlah} item</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Top Items Terjual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topItems.map((item, index) => {
                const maxTotal = Math.max(...topItems.map(i => i.total));
                const barWidth = (item.total / maxTotal) * 100;
                
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium truncate">{item.nama}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{formatRupiah(item.total)}</span>
                        <Badge variant="secondary">#{index + 1}</Badge>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{item.transaksi} transaksi</span>
                      <span>{item.jumlah} item</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Category Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Detail per Kategori
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Kategori</th>
                  <th className="text-right py-2">Total Penjualan</th>
                  <th className="text-right py-2">Transaksi</th>
                  <th className="text-right py-2">Item</th>
                  <th className="text-right py-2">Rata-rata</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.kategoriSummary)
                  .sort(([,a], [,b]) => b.total - a.total)
                  .map(([kategori, data], index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 font-medium">{kategori}</td>
                      <td className="py-2 text-right font-bold text-green-600">
                        {formatRupiah(data.total)}
                      </td>
                      <td className="py-2 text-right">{data.transaksi}</td>
                      <td className="py-2 text-right">{data.jumlah}</td>
                      <td className="py-2 text-right">
                        {formatRupiah(data.total / data.transaksi)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesStats;
