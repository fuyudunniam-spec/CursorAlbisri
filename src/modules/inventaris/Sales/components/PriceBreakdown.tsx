import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Heart, 
  Calculator,
  TrendingUp,
  BarChart3,
  PieChart
} from 'lucide-react';
import { SalesTransaction } from '@/types/sales.types';

interface PriceBreakdownProps {
  data: SalesTransaction[];
}

const PriceBreakdown: React.FC<PriceBreakdownProps> = ({ data }) => {
  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calculate breakdown statistics
  const stats = data.reduce((acc, sale) => {
    acc.totalHargaDasar += sale.harga_dasar * sale.jumlah;
    acc.totalSumbangan += sale.sumbangan;
    acc.totalNilai += sale.total_nilai;
    acc.transaksiCount += 1;
    acc.itemCount += sale.jumlah;
    
    // Track contribution percentage
    if (sale.total_nilai > 0) {
      const hargaDasarContribution = (sale.harga_dasar * sale.jumlah) / sale.total_nilai;
      const sumbanganContribution = sale.sumbangan / sale.total_nilai;
      
      acc.avgHargaDasarContribution += hargaDasarContribution;
      acc.avgSumbanganContribution += sumbanganContribution;
    }
    
    return acc;
  }, {
    totalHargaDasar: 0,
    totalSumbangan: 0,
    totalNilai: 0,
    transaksiCount: 0,
    itemCount: 0,
    avgHargaDasarContribution: 0,
    avgSumbanganContribution: 0
  });

  // Calculate averages
  const avgHargaDasarContribution = stats.transaksiCount > 0 ? stats.avgHargaDasarContribution / stats.transaksiCount : 0;
  const avgSumbanganContribution = stats.transaksiCount > 0 ? stats.avgSumbanganContribution / stats.transaksiCount : 0;
  const avgPerTransaksi = stats.transaksiCount > 0 ? stats.totalNilai / stats.transaksiCount : 0;
  const avgPerItem = stats.itemCount > 0 ? stats.totalNilai / stats.itemCount : 0;

  // Get transactions with highest sumbangan
  const topSumbangan = data
    .filter(sale => sale.sumbangan > 0)
    .sort((a, b) => b.sumbangan - a.sumbangan)
    .slice(0, 5);

  // Get transactions with highest harga dasar contribution
  const topHargaDasar = data
    .sort((a, b) => (b.harga_dasar * b.jumlah) - (a.harga_dasar * a.jumlah))
    .slice(0, 5);

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">Tidak ada data penjualan untuk dianalisis</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Harga Dasar</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatRupiah(stats.totalHargaDasar)}
            </div>
            <p className="text-xs text-muted-foreground">
              {((stats.totalHargaDasar / stats.totalNilai) * 100).toFixed(1)}% dari total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sumbangan</CardTitle>
            <Heart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatRupiah(stats.totalSumbangan)}
            </div>
            <p className="text-xs text-muted-foreground">
              {((stats.totalSumbangan / stats.totalNilai) * 100).toFixed(1)}% dari total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rata-rata per Transaksi</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatRupiah(avgPerTransaksi)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.transaksiCount} transaksi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rata-rata per Item</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatRupiah(avgPerItem)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.itemCount} item
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Contribution Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Kontribusi Harga vs Sumbangan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Harga Dasar</span>
                  <span className="text-sm font-bold text-green-600">
                    {formatRupiah(stats.totalHargaDasar)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-green-500 h-3 rounded-full" 
                    style={{ width: `${(stats.totalHargaDasar / stats.totalNilai) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground text-center">
                  {((stats.totalHargaDasar / stats.totalNilai) * 100).toFixed(1)}% dari total nilai
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Sumbangan</span>
                  <span className="text-sm font-bold text-blue-600">
                    {formatRupiah(stats.totalSumbangan)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-500 h-3 rounded-full" 
                    style={{ width: `${(stats.totalSumbangan / stats.totalNilai) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground text-center">
                  {((stats.totalSumbangan / stats.totalNilai) * 100).toFixed(1)}% dari total nilai
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Contribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Rata-rata Kontribusi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {(avgHargaDasarContribution * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Harga Dasar</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {(avgSumbanganContribution * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Sumbangan</div>
              </div>

              <div className="border-t pt-4">
                <div className="text-sm text-muted-foreground text-center">
                  Rata-rata kontribusi per transaksi
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Sumbangan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-blue-600" />
              Top Sumbangan Tertinggi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topSumbangan.map((sale, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{sale.nama_barang}</div>
                      <div className="text-sm text-muted-foreground">
                        {sale.pembeli} • {sale.jumlah} unit
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-600">
                        {formatRupiah(sale.sumbangan)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {((sale.sumbangan / sale.total_nilai) * 100).toFixed(1)}% dari total
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Harga Dasar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Top Harga Dasar Tertinggi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topHargaDasar.map((sale, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{sale.nama_barang}</div>
                      <div className="text-sm text-muted-foreground">
                        {sale.pembeli} • {sale.jumlah} unit
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">
                        {formatRupiah(sale.harga_dasar * sale.jumlah)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatRupiah(sale.harga_dasar)}/unit
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PriceBreakdown;
