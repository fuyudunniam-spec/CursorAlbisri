import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Store, 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  DollarSign,
  BarChart3,
  Plus,
  TrendingDown,
  Receipt
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { koperasiService } from '@/services/koperasi.service';
import ModuleHeader from '@/components/ModuleHeader';

const DashboardKoperasi = () => {
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['koperasi-dashboard-stats'],
    queryFn: () => koperasiService.getDashboardStats(),
    staleTime: 60000
  });

  const { data: produkData, isLoading: produkLoading } = useQuery({
    queryKey: ['koperasi-produk'],
    queryFn: () => koperasiService.getProduk(),
    staleTime: 30000
  });

  const tabs = [
    { label: 'Dashboard', path: '/koperasi' },
    { label: 'Master Produk', path: '/koperasi/master' },
    { label: 'Pembelian', path: '/koperasi/pembelian' },
    { label: 'Penjualan', path: '/koperasi/penjualan' },
    { label: 'Laporan SHU', path: '/koperasi/shu' },
    { label: 'Riwayat', path: '/koperasi/transactions' }
  ];

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <ModuleHeader title="Dashboard Koperasi" tabs={tabs} />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Omzet Bulan Ini</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statsLoading ? '...' : formatRupiah(stats?.penjualan_hari_ini || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Penjualan hari ini</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kas Koperasi</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {statsLoading ? '...' : formatRupiah(stats?.kas_koperasi || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Saldo saat ini</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transaksi</CardTitle>
            <ShoppingCart className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {statsLoading ? '...' : stats?.total_transaksi_hari_ini || 0}
            </div>
            <p className="text-xs text-muted-foreground">Transaksi hari ini</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produk Aktif</CardTitle>
            <Package className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {statsLoading ? '...' : stats?.produk_aktif || 0}
            </div>
            <p className="text-xs text-muted-foreground">Produk tersedia</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2"
              onClick={() => navigate('/koperasi/master')}
            >
              <Package className="h-6 w-6" />
              <span>Master Produk</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2"
              onClick={() => navigate('/koperasi/pembelian')}
            >
              <TrendingDown className="h-6 w-6" />
              <span>Pembelian</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2"
              onClick={() => navigate('/koperasi/penjualan')}
            >
              <ShoppingCart className="h-6 w-6" />
              <span>Penjualan</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2"
              onClick={() => navigate('/koperasi/shu')}
            >
              <BarChart3 className="h-6 w-6" />
              <span>Laporan SHU</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2"
              onClick={() => navigate('/koperasi/transactions')}
            >
              <Receipt className="h-6 w-6" />
              <span>Riwayat Transaksi</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2"
              onClick={() => navigate('/inventaris')}
            >
              <Store className="h-6 w-6" />
              <span>Transfer dari Inventaris</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2"
              onClick={() => navigate('/koperasi/keuangan')}
            >
              <DollarSign className="h-6 w-6" />
              <span>Keuangan Koperasi</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Produk dengan Stok Rendah */}
      {produkData && produkData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Produk dengan Stok Rendah</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {produkData
                .filter((p: any) => (p.stok || 0) <= (p.stok_minimum || 0))
                .slice(0, 5)
                .map((produk: any) => (
                  <div
                    key={produk.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-yellow-200 bg-yellow-50"
                  >
                    <div>
                      <p className="font-medium">{produk.nama_produk}</p>
                      <p className="text-sm text-muted-foreground">
                        Stok: {produk.stok || 0} {produk.satuan || 'pcs'} | Min: {produk.stok_minimum || 0}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate('/koperasi/pembelian')}
                    >
                      Beli Lagi
                    </Button>
                  </div>
                ))}
              {produkData.filter((p: any) => (p.stok || 0) <= (p.stok_minimum || 0)).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Semua produk memiliki stok cukup
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DashboardKoperasi;



