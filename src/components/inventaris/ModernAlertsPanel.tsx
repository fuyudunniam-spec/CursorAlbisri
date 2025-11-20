import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertTriangle, 
  Clock, 
  Package, 
  TrendingDown,
  Calendar,
  RefreshCw
} from "lucide-react";
import { formatDate } from "@/utils/inventaris.utils";

type LowStockItem = {
  id: string;
  nama_barang: string;
  jumlah: number | null;
  min_stock: number | null;
};

type NearExpiryItem = {
  id: string;
  nama_barang: string;
  tanggal_kedaluwarsa: string | null;
  has_expiry: boolean | null;
};

type Props = {
  lowStockItems: LowStockItem[];
  nearExpiryItems: NearExpiryItem[];
  loading?: boolean;
  onRefresh?: () => void;
};

const ModernAlertsPanel = memo(({ 
  lowStockItems, 
  nearExpiryItems, 
  loading = false,
  onRefresh 
}: Props) => {
  const getDaysUntilExpiry = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryStatus = (days: number | null) => {
    if (days === null) return { status: "Tidak diketahui", color: "secondary" };
    if (days <= 0) return { status: "Kedaluwarsa", color: "destructive" };
    if (days <= 7) return { status: "Kritis", color: "destructive" };
    if (days <= 30) return { status: "Perhatian", color: "secondary" };
    return { status: "Normal", color: "default" };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex items-center space-x-3">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const hasAlerts = lowStockItems.length > 0 || nearExpiryItems.length > 0;

  if (!hasAlerts) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Package className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Semua dalam kondisi normal</h3>
        <p className="text-gray-500 mb-4">Tidak ada peringatan stok atau kedaluwarsa</p>
        {onRefresh && (
          <Button variant="outline" onClick={onRefresh} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Peringatan Inventaris</h2>
          <p className="text-sm text-gray-500">
            {lowStockItems.length + nearExpiryItems.length} item memerlukan perhatian
          </p>
        </div>
        {onRefresh && (
          <Button variant="outline" onClick={onRefresh} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <AlertTriangle className="h-5 w-5" />
                Stok Rendah
                <Badge variant="secondary" className="ml-auto">
                  {lowStockItems.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lowStockItems.map((item) => {
                const shortage = Math.max(0, (item.min_stock || 0) - (item.jumlah || 0));
                return (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">{item.nama_barang}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Stok: {item.jumlah || 0} | Min: {item.min_stock || 0}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="text-xs">
                        {shortage > 0 ? `Kurang ${shortage}` : 'Perlu perhatian'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Near Expiry Alert */}
        {nearExpiryItems.length > 0 && (
          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-yellow-800">
                <Clock className="h-5 w-5" />
                Mendekati Kedaluwarsa
                <Badge variant="secondary" className="ml-auto">
                  {nearExpiryItems.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {nearExpiryItems.map((item) => {
                const daysUntilExpiry = getDaysUntilExpiry(item.tanggal_kedaluwarsa);
                const expiryStatus = getExpiryStatus(daysUntilExpiry);
                
                return (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-yellow-200">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">{item.nama_barang}</div>
                      <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Kedaluwarsa: {formatDate(item.tanggal_kedaluwarsa)}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={expiryStatus.color as any} className="text-xs">
                        {daysUntilExpiry !== null ? 
                          (daysUntilExpiry <= 0 ? 'Kedaluwarsa' : 
                           daysUntilExpiry === 1 ? 'Besok' : 
                           `${daysUntilExpiry} hari`) : 
                          'Tidak diketahui'
                        }
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Summary Actions */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-600">
          <span className="font-medium">Total peringatan:</span> {lowStockItems.length + nearExpiryItems.length}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            Lihat Semua
          </Button>
          <Button size="sm">
            Tindak Lanjuti
          </Button>
        </div>
      </div>
    </div>
  );
});

ModernAlertsPanel.displayName = "ModernAlertsPanel";

export default ModernAlertsPanel;
