import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  AlertTriangle, 
  Clock, 
  Package,
  ExternalLink,
  TrendingDown
} from 'lucide-react';
import { InventoryItem } from '@/services/inventaris.service';
import { useNavigate } from 'react-router-dom';

interface StockExpiryTableProps {
  lowStockItems: Array<{
    id: string;
    nama_barang: string;
    jumlah?: number | null;
    min_stock?: number | null;
    kategori?: string | null;
  }>;
  expiredItems: Array<{
    id: string;
    nama_barang: string;
    tanggal_kedaluwarsa?: string | null;
    kategori?: string | null;
  }>;
  isLoading?: boolean;
  onNavigateToMaster?: (filterType: 'low_stock' | 'expired', category?: string) => void;
}

const StockExpiryTable: React.FC<StockExpiryTableProps> = ({
  lowStockItems,
  expiredItems,
  isLoading = false,
  onNavigateToMaster
}) => {
  const navigate = useNavigate();

  const calculateDaysUntilExpiry = (expiryDate: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryStatus = (daysUntilExpiry: number): 'expired' | 'critical' | 'warning' => {
    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 7) return 'critical';
    if (daysUntilExpiry <= 30) return 'warning';
    return 'warning';
  };

  const getExpiryBadge = (daysUntilExpiry: number) => {
    const status = getExpiryStatus(daysUntilExpiry);
    if (status === 'expired') {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Kadaluarsa ({Math.abs(daysUntilExpiry)} hari lalu)
        </Badge>
      );
    }
    if (status === 'critical') {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Kritis ({daysUntilExpiry} hari)
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <Clock className="h-3 w-3" />
        Peringatan ({daysUntilExpiry} hari)
      </Badge>
    );
  };

  const formatQuantity = (qty: number): string => {
    if (qty === 0) return '0';
    if (qty < 10) return qty.toString();
    return qty.toString();
  };

  const getStockStatus = (jumlah: number, minStock: number) => {
    if (jumlah === 0) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Habis
        </Badge>
      );
    }
    if (jumlah <= minStock) {
      return (
        <Badge variant="secondary" className="gap-1">
          <TrendingDown className="h-3 w-3" />
          Rendah ({formatQuantity(jumlah)}/{formatQuantity(minStock)})
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="gap-1">
        <Package className="h-3 w-3" />
        Normal
      </Badge>
    );
  };

  const handleNavigateToMaster = (filterType: 'low_stock' | 'expired', category?: string) => {
    if (onNavigateToMaster) {
      onNavigateToMaster(filterType, category);
    } else {
      // Default navigation
      const params = new URLSearchParams();
      if (filterType === 'low_stock') {
        params.set('filter', 'low_stock');
      } else if (filterType === 'expired') {
        params.set('filter', 'expired');
      }
      if (category) {
        params.set('kategori', category);
      }
      navigate(`/inventaris/master?${params.toString()}`);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-orange-600" />
              Stock Menipis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-red-600" />
              Item Kadaluwarsa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Stock Menipis Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-orange-600" />
              Stock Menipis
            </CardTitle>
            {lowStockItems.length > 0 && (
              <Badge variant="outline" className="text-orange-600">
                {lowStockItems.length} item
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {lowStockItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Tidak ada item dengan stock menipis</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Barang</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.nama_barang}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.kategori || '-'}</Badge>
                        </TableCell>
                        <TableCell>
                          {getStockStatus(item.jumlah || 0, item.min_stock || 10)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleNavigateToMaster('low_stock', item.kategori || undefined)}
                            className="gap-1"
                          >
                            Lihat
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {lowStockItems.length > 5 && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleNavigateToMaster('low_stock')}
                >
                  Lihat Semua di Master Data
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Item Kadaluwarsa Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-red-600" />
              Item Kadaluwarsa
            </CardTitle>
            {expiredItems.length > 0 && (
              <Badge variant="destructive">
                {expiredItems.length} item
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {expiredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Tidak ada item kadaluwarsa</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Barang</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiredItems.map((item) => {
                      if (!item.tanggal_kedaluwarsa) return null;
                      const daysUntilExpiry = calculateDaysUntilExpiry(item.tanggal_kedaluwarsa);
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.nama_barang}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.kategori || '-'}</Badge>
                          </TableCell>
                          <TableCell>
                            {getExpiryBadge(daysUntilExpiry)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleNavigateToMaster('expired', item.kategori || undefined)}
                              className="gap-1"
                            >
                              Lihat
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {expiredItems.length > 5 && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleNavigateToMaster('expired')}
                >
                  Lihat Semua di Master Data
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StockExpiryTable;




