import { memo } from "react";
import { AlertTriangle, Clock, Package } from "lucide-react";
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
};

const AlertsPanel = memo(({ lowStockItems, nearExpiryItems, loading }: Props) => {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="p-4 border rounded-lg">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  const hasAlerts = lowStockItems.length > 0 || nearExpiryItems.length > 0;

  if (!hasAlerts) {
    return (
      <div className="p-6 text-center text-gray-500">
        <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p>Tidak ada peringatan saat ini</p>
        <p className="text-sm">Semua stok dalam kondisi normal</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {lowStockItems.length > 0 && (
        <div className="p-4 border border-orange-200 bg-orange-50 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <h3 className="font-semibold text-orange-800">Stok Rendah</h3>
            <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
              {lowStockItems.length} item
            </span>
          </div>
          <div className="space-y-2">
            {lowStockItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2 bg-white rounded border">
                <div>
                  <p className="font-medium text-sm">{item.nama_barang}</p>
                  <p className="text-xs text-gray-600">
                    Stok: {item.jumlah || 0} | Min: {item.min_stock || 0}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-orange-600 font-medium">
                    {item.jumlah && item.min_stock ? 
                      `${Math.max(0, item.min_stock - item.jumlah)} kurang` : 
                      'Perlu perhatian'
                    }
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {nearExpiryItems.length > 0 && (
        <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-5 w-5 text-yellow-600" />
            <h3 className="font-semibold text-yellow-800">Mendekati Kedaluwarsa</h3>
            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
              {nearExpiryItems.length} item
            </span>
          </div>
          <div className="space-y-2">
            {nearExpiryItems.map((item) => {
              const expiryDate = item.tanggal_kedaluwarsa ? new Date(item.tanggal_kedaluwarsa) : null;
              const today = new Date();
              const daysUntilExpiry = expiryDate ? Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
              
              return (
                <div key={item.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div>
                    <p className="font-medium text-sm">{item.nama_barang}</p>
                    <p className="text-xs text-gray-600">
                      Kedaluwarsa: {formatDate(item.tanggal_kedaluwarsa)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-medium ${
                      daysUntilExpiry && daysUntilExpiry <= 7 ? 'text-red-600' : 
                      daysUntilExpiry && daysUntilExpiry <= 30 ? 'text-yellow-600' : 
                      'text-gray-600'
                    }`}>
                      {daysUntilExpiry !== null ? 
                        (daysUntilExpiry <= 0 ? 'Kedaluwarsa' : 
                         daysUntilExpiry === 1 ? 'Besok' : 
                         `${daysUntilExpiry} hari lagi`) : 
                        'Tidak diketahui'
                      }
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

AlertsPanel.displayName = "AlertsPanel";

export default AlertsPanel;
