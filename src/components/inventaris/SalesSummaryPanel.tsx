import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Package,
  BarChart3,
  Calendar,
  AlertCircle
} from "lucide-react";
import { formatRupiah } from "@/utils/inventaris.utils";

type SalesSummaryData = {
  totalPenjualan: number;
  totalTransaksi: number;
  totalJumlah: number;
  rataRataPenjualan: number;
  kategoriSummary: Record<string, { total: number; jumlah: number; transaksi: number }>;
  itemSummary: Array<{ nama: string; total: number; jumlah: number; transaksi: number; item_id: string }>;
};

type Props = {
  data?: SalesSummaryData;
  loading?: boolean;
  filters?: {
    startDate?: string;
    endDate?: string;
  };
  onItemClick?: (itemName: string, itemId: string) => void;
};

const SalesSummaryPanel = memo(({ data, loading, filters, onItemClick }: Props) => {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-16 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Tidak ada data penjualan</h3>
          <p className="text-gray-500">Belum ada transaksi penjualan yang tercatat</p>
        </CardContent>
      </Card>
    );
  }

  const { totalPenjualan, totalTransaksi, totalJumlah, rataRataPenjualan, kategoriSummary, itemSummary } = data;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Penjualan</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatRupiah(totalPenjualan)}
            </div>
            <p className="text-xs text-gray-500">
              {totalTransaksi} transaksi
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Rata-rata Penjualan</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatRupiah(rataRataPenjualan)}
            </div>
            <p className="text-xs text-gray-500">
              per transaksi
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Item Terjual</CardTitle>
            <Package className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {totalJumlah.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">
              unit terjual
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Jumlah Transaksi</CardTitle>
            <ShoppingCart className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {totalTransaksi}
            </div>
            <p className="text-xs text-gray-500">
              transaksi penjualan
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Kategori Summary */}
      {Object.keys(kategoriSummary).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-gray-600" />
              <span>Penjualan per Kategori</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(kategoriSummary)
                .sort(([,a], [,b]) => b.total - a.total)
                .map(([kategori, data]) => (
                  <div key={kategori} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className="text-xs">
                        {kategori}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {data.transaksi} transaksi
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {formatRupiah(data.total)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {data.jumlah} unit
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Items */}
      {itemSummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-gray-600" />
              <span>Item Terlaris</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {itemSummary.slice(0, 5).map((item, index) => (
                <div 
                  key={item.nama} 
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                    onItemClick 
                      ? 'bg-gray-50 hover:bg-blue-50 cursor-pointer hover:shadow-md' 
                      : 'bg-gray-50'
                  }`}
                  onClick={() => onItemClick?.(item.nama, item.item_id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 truncate max-w-[200px]">
                        {item.nama}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.transaksi} transaksi • {item.jumlah} unit
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {formatRupiah(item.total)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatRupiah(item.total / item.jumlah)}/unit
                    </div>
                    {onItemClick && (
                      <div className="text-xs text-blue-600 mt-1">
                        Klik untuk detail →
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Info */}
      {filters && (filters.startDate || filters.endDate) && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>
                Periode: {filters.startDate || "Awal"} - {filters.endDate || "Sekarang"}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});

SalesSummaryPanel.displayName = "SalesSummaryPanel";

export default SalesSummaryPanel;
