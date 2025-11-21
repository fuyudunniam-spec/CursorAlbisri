import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Package, TrendingDown } from 'lucide-react';
import { StockAlert } from '@/types/inventaris.types';

interface StockAlertsProps {
  items: Array<{
    id: string;
    nama_barang: string;
    jumlah: number;
    min_stock: number;
  }>;
}

const StockAlerts: React.FC<StockAlertsProps> = ({ items }) => {
  const getUrgency = (jumlah: number, minStock: number): 'low' | 'medium' | 'high' => {
    if (jumlah === 0) return 'high';
    if (jumlah <= minStock * 0.5) return 'high';
    if (jumlah <= minStock) return 'medium';
    return 'low';
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getUrgencyLabel = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'Kritis';
      case 'medium': return 'Rendah';
      case 'low': return 'Perhatian';
      default: return 'Normal';
    }
  };

  const criticalItems = items.filter(item => item.jumlah === 0);
  const lowStockItems = items.filter(item => item.jumlah > 0 && item.jumlah <= item.min_stock);
  const attentionItems = items.filter(item => item.jumlah > item.min_stock && item.jumlah <= item.min_stock * 1.5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          Stock Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{criticalItems.length}</div>
            <div className="text-sm text-muted-foreground">Habis</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{lowStockItems.length}</div>
            <div className="text-sm text-muted-foreground">Rendah</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{attentionItems.length}</div>
            <div className="text-sm text-muted-foreground">Perhatian</div>
          </div>
        </div>

        {/* Critical Items (Out of Stock) */}
        {criticalItems.length > 0 && (
          <div>
            <h4 className="font-semibold text-red-600 mb-2 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              Stok Habis ({criticalItems.length})
            </h4>
            <div className="space-y-2">
              {criticalItems.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="p-3 border border-red-200 bg-red-50 rounded-lg"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-red-800">{item.nama_barang}</div>
                      <div className="text-sm text-red-600">
                        Stok: Habis (Min: {item.min_stock < 10 ? item.min_stock : item.min_stock})
                      </div>
                    </div>
                    <Badge variant="destructive">Habis</Badge>
                  </div>
                </div>
              ))}
              {criticalItems.length > 5 && (
                <div className="text-sm text-muted-foreground text-center">
                  +{criticalItems.length - 5} item lainnya
                </div>
              )}
            </div>
          </div>
        )}

        {/* Low Stock Items */}
        {lowStockItems.length > 0 && (
          <div>
            <h4 className="font-semibold text-orange-600 mb-2 flex items-center gap-1">
              <TrendingDown className="h-4 w-4" />
              Stok Rendah ({lowStockItems.length})
            </h4>
            <div className="space-y-2">
              {lowStockItems.slice(0, 5).map((item) => {
                const urgency = getUrgency(item.jumlah, item.min_stock);
                return (
                  <div
                    key={item.id}
                    className={`p-3 border rounded-lg ${getUrgencyColor(urgency)}`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{item.nama_barang}</div>
                        <div className="text-sm">
                          Stok: {item.jumlah < 10 ? item.jumlah : item.jumlah} (Min: {item.min_stock < 10 ? item.min_stock : item.min_stock})
                        </div>
                      </div>
                      <Badge variant="secondary">{getUrgencyLabel(urgency)}</Badge>
                    </div>
                  </div>
                );
              })}
              {lowStockItems.length > 5 && (
                <div className="text-sm text-muted-foreground text-center">
                  +{lowStockItems.length - 5} item lainnya
                </div>
              )}
            </div>
          </div>
        )}

        {/* Attention Items */}
        {attentionItems.length > 0 && (
          <div>
            <h4 className="font-semibold text-yellow-600 mb-2 flex items-center gap-1">
              <Package className="h-4 w-4" />
              Perhatian ({attentionItems.length})
            </h4>
            <div className="space-y-2">
              {attentionItems.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="p-3 border border-yellow-200 bg-yellow-50 rounded-lg"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-yellow-800">{item.nama_barang}</div>
                      <div className="text-sm text-yellow-600">
                        Stok: {item.jumlah < 10 ? item.jumlah : item.jumlah} (Min: {item.min_stock < 10 ? item.min_stock : item.min_stock})
                      </div>
                    </div>
                    <Badge variant="outline" className="text-yellow-600">
                      Perhatian
                    </Badge>
                  </div>
                </div>
              ))}
              {attentionItems.length > 3 && (
                <div className="text-sm text-muted-foreground text-center">
                  +{attentionItems.length - 3} item lainnya
                </div>
              )}
            </div>
          </div>
        )}

        {/* No Alerts */}
        {items.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Tidak ada alert stok</p>
            <p className="text-sm">Semua item memiliki stok yang cukup</p>
          </div>
        )}

        {/* Quick Actions */}
        {items.length > 0 && (
          <div className="pt-4 border-t">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1">
                <Package className="h-4 w-4 mr-1" />
                Restock
              </Button>
              <Button size="sm" variant="outline" className="flex-1">
                <AlertTriangle className="h-4 w-4 mr-1" />
                Export Alert
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StockAlerts;
