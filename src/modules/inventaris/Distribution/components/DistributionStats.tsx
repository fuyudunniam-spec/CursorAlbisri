import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  Package,
  Users,
  PieChart,
  Activity
} from 'lucide-react';
import { DistributionStats as DistributionStatsType } from '@/types/distribution.types';

interface DistributionStatsProps {
  stats: DistributionStatsType | undefined;
  isLoading: boolean;
}

const DistributionStats: React.FC<DistributionStatsProps> = ({ stats, isLoading }) => {
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
          <p className="text-muted-foreground">Tidak ada data distribusi</p>
        </CardContent>
      </Card>
    );
  }

  // Get top 5 recipients
  const topRecipients = Object.entries(stats.penerimaSummary)
    .sort(([,a], [,b]) => b.total - a.total)
    .slice(0, 5);

  // Get top 5 items
  const topItems = Object.entries(stats.itemSummary)
    .sort(([,a], [,b]) => b.total - a.total)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Distribusi</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDistribusi}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalTransaksi} transaksi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Item</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalJumlah}</div>
            <p className="text-xs text-muted-foreground">
              Item didistribusikan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Penerima Unik</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(stats.penerimaSummary).length}</div>
            <p className="text-xs text-muted-foreground">
              Penerima berbeda
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Item Berbeda</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(stats.itemSummary).length}</div>
            <p className="text-xs text-muted-foreground">
              Jenis item
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Recipients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Penerima
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topRecipients.map(([penerima, data], index) => {
                const maxTotal = Math.max(...topRecipients.map(([,d]) => d.total));
                const barWidth = (data.total / maxTotal) * 100;
                
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium truncate">{penerima}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{data.total}</span>
                        <Badge variant="outline">#{index + 1}</Badge>
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
                      <span>Rata-rata: {(data.total / data.transaksi).toFixed(1)} item</span>
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
              Top Items Didistribusikan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topItems.map(([itemName, data], index) => {
                const maxTotal = Math.max(...topItems.map(([,d]) => d.total));
                const barWidth = (data.total / maxTotal) * 100;
                
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium truncate">{itemName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{data.total}</span>
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
                      <span>{data.transaksi} transaksi</span>
                      <span>Rata-rata: {(data.total / data.transaksi).toFixed(1)} item</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Recipients Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Detail per Penerima
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Penerima</th>
                  <th className="text-right py-2">Total Item</th>
                  <th className="text-right py-2">Transaksi</th>
                  <th className="text-right py-2">Rata-rata</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.penerimaSummary)
                  .sort(([,a], [,b]) => b.total - a.total)
                  .map(([penerima, data], index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 font-medium">{penerima}</td>
                      <td className="py-2 text-right font-bold text-blue-600">
                        {data.total}
                      </td>
                      <td className="py-2 text-right">{data.transaksi}</td>
                      <td className="py-2 text-right">
                        {(data.total / data.transaksi).toFixed(1)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Items Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Detail per Item
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Item</th>
                  <th className="text-right py-2">Total Didistribusikan</th>
                  <th className="text-right py-2">Transaksi</th>
                  <th className="text-right py-2">Rata-rata</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.itemSummary)
                  .sort(([,a], [,b]) => b.total - a.total)
                  .map(([itemName, data], index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 font-medium">{itemName}</td>
                      <td className="py-2 text-right font-bold text-green-600">
                        {data.total}
                      </td>
                      <td className="py-2 text-right">{data.transaksi}</td>
                      <td className="py-2 text-right">
                        {(data.total / data.transaksi).toFixed(1)}
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

export default DistributionStats;
