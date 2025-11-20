import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  AlertTriangle, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  History,
  TrendingUp,
  TrendingDown,
  Clock,
  Plus,
  BarChart3,
  ArrowRight,
  CheckCircle
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { listInventory, getLowStock, getNearExpiry } from '@/services/inventaris.service';
import { getSalesStats } from '@/services/sales.service';
import { getDistributionStats } from '@/services/distribution.service';
import ModuleHeader from '@/components/ModuleHeader';
import { Link } from 'react-router-dom';

const DashboardInventaris = () => {
  const tabs = [
    { label: 'Dashboard', path: '/inventaris' },
    { label: 'Master Data', path: '/inventaris/master' },
    { label: 'Penjualan', path: '/inventaris/sales' },
    { label: 'Distribusi', path: '/inventaris/distribution' },
    { label: 'Riwayat', path: '/inventaris/transactions' }
  ];

  // Fetch dashboard data with error handling
  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory-dashboard'],
    queryFn: () => listInventory({ page: 1, pageSize: 100 }, {}),
    retry: 1,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  const { data: lowStockItems, isLoading: lowStockLoading } = useQuery({
    queryKey: ['low-stock-alerts'],
    queryFn: () => getLowStock(10),
    retry: 1,
    staleTime: 5 * 60 * 1000
  });

  const { data: nearExpiryItems, isLoading: expiryLoading } = useQuery({
    queryKey: ['near-expiry-alerts'],
    queryFn: () => getNearExpiry(30),
    retry: 1,
    staleTime: 5 * 60 * 1000
  });

  const { data: salesStats, isLoading: salesLoading } = useQuery({
    queryKey: ['sales-dashboard-stats'],
    queryFn: () => getSalesStats(),
    retry: 1,
    staleTime: 5 * 60 * 1000
  });

  const { data: distributionStats, isLoading: distributionLoading } = useQuery({
    queryKey: ['distribution-dashboard-stats'],
    queryFn: () => getDistributionStats(),
    retry: 1,
    staleTime: 5 * 60 * 1000
  });

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calculate stats with fallback data
  const isLoading = inventoryLoading || lowStockLoading || expiryLoading || salesLoading || distributionLoading;
  
  const stats = {
    totalItems: inventoryData?.total || 0,
    asetCount: inventoryData?.data?.filter(item => item.tipe_item === 'Aset').length || 0,
    komoditasCount: inventoryData?.data?.filter(item => item.tipe_item === 'Komoditas').length || 0,
    lowStockCount: lowStockItems?.length || 0,
    nearExpiryCount: nearExpiryItems?.length || 0,
    totalValue: inventoryData?.data?.reduce((sum, item) => 
      sum + ((item.jumlah || 0) * (item.harga_perolehan || 0)), 0) || 0,
    salesTotal: salesStats?.totalPenjualan || 0,
    salesCount: salesStats?.totalTransaksi || 0,
    distributionCount: distributionStats?.totalDistribusi || 0,
    distributionItems: distributionStats?.totalJumlah || 0
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <ModuleHeader title="Dashboard Inventaris" tabs={tabs} />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ModuleHeader title="Dashboard Inventaris" tabs={tabs} />
      
      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
            <p className="text-xs text-muted-foreground">
              {stats.asetCount} Aset, {stats.komoditasCount} Komoditas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nilai</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatRupiah(stats.totalValue)}</div>
            <p className="text-xs text-muted-foreground">
              Nilai total inventaris
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stok Rendah</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.lowStockCount}</div>
            <p className="text-xs text-muted-foreground">
              Item perlu restock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mendekati Expiry</CardTitle>
            <Clock className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.nearExpiryCount}</div>
            <p className="text-xs text-muted-foreground">
              Item akan kadaluarsa
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Penjualan Bulan Ini</CardTitle>
            <ShoppingCart className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatRupiah(stats.salesTotal)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.salesCount} transaksi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Distribusi Bulan Ini</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.distributionCount}</div>
            <p className="text-xs text-muted-foreground">
              {stats.distributionItems} item didistribusikan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aset</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.asetCount}</div>
            <p className="text-xs text-muted-foreground">
              Item aset tetap
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Komoditas</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.komoditasCount}</div>
            <p className="text-xs text-muted-foreground">
              Item komoditas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/inventaris/sales">
              <Button className="w-full h-20 flex flex-col items-center gap-2" variant="outline">
                <ShoppingCart className="h-6 w-6" />
                <span>Penjualan Cepat</span>
              </Button>
            </Link>
            
            <Link to="/inventaris/distribution">
              <Button className="w-full h-20 flex flex-col items-center gap-2" variant="outline">
                <Users className="h-6 w-6" />
                <span>Distribusi Cepat</span>
              </Button>
            </Link>
            
            <Link to="/inventaris/master">
              <Button className="w-full h-20 flex flex-col items-center gap-2" variant="outline">
                <Package className="h-6 w-6" />
                <span>Kelola Items</span>
              </Button>
            </Link>
            
            <Link to="/inventaris/transactions">
              <Button className="w-full h-20 flex flex-col items-center gap-2" variant="outline">
                <History className="h-6 w-6" />
                <span>Riwayat Transaksi</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.lowStockCount > 0 ? (
              <div className="space-y-2">
                <div className="text-sm text-orange-600 font-medium">
                  {stats.lowStockCount} item dengan stok rendah
                </div>
                <div className="text-xs text-muted-foreground">
                  Perlu segera di-restock
                </div>
                <Link to="/inventaris/master">
                  <Button size="sm" variant="outline" className="mt-2">
                    Lihat Detail
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Semua stok dalam kondisi baik</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expiry Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-red-600" />
              Expiry Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.nearExpiryCount > 0 ? (
              <div className="space-y-2">
                <div className="text-sm text-red-600 font-medium">
                  {stats.nearExpiryCount} item mendekati expiry
                </div>
                <div className="text-xs text-muted-foreground">
                  Perlu perhatian khusus
                </div>
                <Link to="/inventaris/master">
                  <Button size="sm" variant="outline" className="mt-2">
                    Lihat Detail
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Tidak ada item mendekati expiry</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Module Navigation */}
      <Card>
        <CardHeader>
          <CardTitle>Modul Inventaris</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/inventaris/master">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Package className="h-8 w-8 text-blue-600" />
                    <div>
                      <div className="font-medium">Master Data</div>
                      <div className="text-sm text-muted-foreground">
                        Kelola aset & komoditas
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/inventaris/sales">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <ShoppingCart className="h-8 w-8 text-green-600" />
                    <div>
                      <div className="font-medium">Penjualan</div>
                      <div className="text-sm text-muted-foreground">
                        Transaksi penjualan
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/inventaris/distribution">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-purple-600" />
                    <div>
                      <div className="font-medium">Distribusi</div>
                      <div className="text-sm text-muted-foreground">
                        Distribusi ke santri
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/inventaris/transactions">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <History className="h-8 w-8 text-orange-600" />
                    <div>
                      <div className="font-medium">Riwayat</div>
                      <div className="text-sm text-muted-foreground">
                        Semua transaksi
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardInventaris;
