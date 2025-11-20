import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { InventoryTransaction, TransactionFilters } from '@/types/inventaris.types';

interface StockMovementChartProps {
  data: InventoryTransaction[];
  filters: TransactionFilters;
}

const StockMovementChart: React.FC<StockMovementChartProps> = ({ data, filters }) => {
  // Calculate movement data
  const movementData = data.reduce((acc, transaction) => {
    const date = new Date(transaction.tanggal).toISOString().split('T')[0];
    
    if (!acc[date]) {
      acc[date] = { masuk: 0, keluar: 0, stocktake: 0 };
    }
    
    if (transaction.tipe === 'Masuk') {
      acc[date].masuk += transaction.jumlah || 0;
    } else if (transaction.tipe === 'Keluar') {
      acc[date].keluar += transaction.jumlah || 0;
    } else if (transaction.tipe === 'Stocktake') {
      acc[date].stocktake += Math.abs((transaction.after_qty || 0) - (transaction.before_qty || 0));
    }
    
    return acc;
  }, {} as Record<string, { masuk: number; keluar: number; stocktake: number }>);

  // Calculate category distribution
  const categoryData = data.reduce((acc, transaction) => {
    const kategori = transaction.kategori_barang || transaction.kategori || 'Lainnya';
    if (!acc[kategori]) {
      acc[kategori] = { masuk: 0, keluar: 0, stocktake: 0 };
    }
    
    if (transaction.tipe === 'Masuk') {
      acc[kategori].masuk += transaction.jumlah || 0;
    } else if (transaction.tipe === 'Keluar') {
      acc[kategori].keluar += transaction.jumlah || 0;
    } else if (transaction.tipe === 'Stocktake') {
      acc[kategori].stocktake += Math.abs((transaction.after_qty || 0) - (transaction.before_qty || 0));
    }
    
    return acc;
  }, {} as Record<string, { masuk: number; keluar: number; stocktake: number }>);

  // Calculate keluar mode distribution
  const keluarModeData = data
    .filter(t => t.tipe === 'Keluar')
    .reduce((acc, transaction) => {
      const mode = transaction.keluar_mode || 'Lainnya';
      if (!acc[mode]) {
        acc[mode] = 0;
      }
      acc[mode] += transaction.jumlah || 0;
      return acc;
    }, {} as Record<string, number>);

  // Get top 10 dates for chart
  const sortedDates = Object.keys(movementData)
    .sort()
    .slice(-10);

  const chartData = sortedDates.map(date => ({
    date,
    ...movementData[date]
  }));

  // Get top 5 categories
  const topCategories = Object.entries(categoryData)
    .sort(([,a], [,b]) => (b.masuk + b.keluar + b.stocktake) - (a.masuk + a.keluar + a.stocktake))
    .slice(0, 5);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short'
    });
  };

  const getTotalMovement = () => {
    return Object.values(movementData).reduce((acc, day) => 
      acc + day.masuk + day.keluar + day.stocktake, 0
    );
  };

  const getNetMovement = () => {
    const totals = Object.values(movementData).reduce((acc, day) => ({
      masuk: acc.masuk + day.masuk,
      keluar: acc.keluar + day.keluar,
      stocktake: acc.stocktake + day.stocktake
    }), { masuk: 0, keluar: 0, stocktake: 0 });
    
    return totals.masuk - totals.keluar;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Movement</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTotalMovement()}</div>
            <p className="text-xs text-muted-foreground">
              Total transaksi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Movement</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getNetMovement() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {getNetMovement() >= 0 ? '+' : ''}{getNetMovement()}
            </div>
            <p className="text-xs text-muted-foreground">
              {getNetMovement() >= 0 ? 'Stok bertambah' : 'Stok berkurang'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Masuk</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {Object.values(movementData).reduce((sum, day) => sum + day.masuk, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total masuk
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Keluar</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {Object.values(movementData).reduce((sum, day) => sum + day.keluar, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total keluar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Movement Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Trend Pergerakan Stok
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {chartData.map((day, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{formatDate(day.date)}</span>
                    <div className="flex gap-2">
                      <Badge variant="default" className="text-green-600">
                        +{day.masuk}
                      </Badge>
                      <Badge variant="destructive">
                        -{day.keluar}
                      </Badge>
                      {day.stocktake > 0 && (
                        <Badge variant="secondary">
                          ±{day.stocktake}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="flex h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-l-full" 
                        style={{ width: `${(day.masuk / Math.max(day.masuk + day.keluar, 1)) * 100}%` }}
                      />
                      <div 
                        className="bg-red-500 h-2 rounded-r-full" 
                        style={{ width: `${(day.keluar / Math.max(day.masuk + day.keluar, 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Distribusi per Kategori
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topCategories.map(([kategori, data], index) => {
                const total = data.masuk + data.keluar + data.stocktake;
                const maxTotal = Math.max(...topCategories.map(([,d]) => d.masuk + d.keluar + d.stocktake));
                const percentage = (total / maxTotal) * 100;
                
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{kategori}</span>
                      <span className="text-sm text-muted-foreground">{total}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>Masuk: {data.masuk}</span>
                      <span>Keluar: {data.keluar}</span>
                      {data.stocktake > 0 && <span>Stocktake: {data.stocktake}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Keluar Mode Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Distribusi Mode Keluar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(keluarModeData).map(([mode, count], index) => {
              const totalKeluar = Object.values(keluarModeData).reduce((sum, c) => sum + c, 0);
              const percentage = totalKeluar > 0 ? (count / totalKeluar) * 100 : 0;
              
              return (
                <div key={index} className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{count}</div>
                  <div className="text-sm text-muted-foreground">{mode}</div>
                  <div className="text-xs text-muted-foreground">
                    {percentage.toFixed(1)}% dari total keluar
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StockMovementChart;
