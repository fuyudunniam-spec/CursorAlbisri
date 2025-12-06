import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Package, AlertTriangle, ShoppingCart, TruckIcon, ArrowRight, Building2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { koperasiService } from "@/services/koperasi.service";
import { getTransfersByStatus } from "@/services/inventaris-transfer.service";
import { useNavigate } from "react-router-dom";

export default function DashboardKoperasi() {
  const navigate = useNavigate();
  
  const { data: stats, isLoading } = useQuery({
    queryKey: ['koperasi-dashboard-stats'],
    queryFn: koperasiService.getDashboardStats,
    refetchInterval: 30000, // Refresh every 30s
  });

  const { data: stockAlerts = [] } = useQuery({
    queryKey: ['koperasi-stock-alerts'],
    queryFn: koperasiService.getStockAlerts,
  });

  // Get pending transfers
  const { data: pendingTransfersData } = useQuery({
    queryKey: ['pending-transfers-dashboard'],
    queryFn: () => getTransfersByStatus('pending', 1, 10),
    refetchInterval: 30000,
  });

  const pendingTransfers = pendingTransfersData?.data || [];
  const pendingCount = pendingTransfersData?.total || 0;

  // Get kewajiban koperasi ke yayasan
  const { data: kewajibanData, isLoading: kewajibanLoading } = useQuery({
    queryKey: ['kewajiban-koperasi-yayasan'],
    queryFn: () => koperasiService.getKewajibanKoperasiYayasan(),
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard Koperasi</h1>
        <p className="text-muted-foreground">Ringkasan operasional koperasi</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Penjualan Hari Ini</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {(stats?.penjualan_hari_ini || 0).toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.total_transaksi_hari_ini || 0} transaksi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Kas Koperasi</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {(stats?.kas_koperasi || 0).toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Saldo saat ini
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Produk Aktif</CardTitle>
            <Package className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.produk_aktif || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total produk
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Stock Alert</CardTitle>
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.stock_alert || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Produk menipis/habis
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Transfers */}
      {pendingCount > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TruckIcon className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-base font-semibold text-orange-900">
                  Transfer Pending
                </CardTitle>
                <Badge className="bg-orange-200 text-orange-800">{pendingCount}</Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/koperasi/transfer-penerimaan')}
                className="text-xs h-7 border-gray-300"
              >
                Lihat Semua
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingTransfers.slice(0, 5).map((transfer) => (
                <div
                  key={transfer.id}
                  className="flex justify-between items-center p-3 border border-orange-200 rounded bg-white"
                >
                  <div>
                    <div className="font-medium">{transfer.item_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {transfer.jumlah} {transfer.item_satuan || 'unit'}
                    </div>
                  </div>
                  <div className="text-right">
                    {transfer.hpp_yayasan && (
                      <div className="text-sm font-medium">
                        HPP: Rp {transfer.hpp_yayasan.toLocaleString('id-ID')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {pendingCount > 5 && (
                <div className="text-center text-sm text-muted-foreground pt-2">
                  +{pendingCount - 5} transfer lainnya
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stock Alerts */}
      {stockAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Peringatan Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stockAlerts.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center p-3 border rounded"
                >
                  <div>
                    <div className="font-medium">{item.nama_produk}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.kode_produk}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${
                      item.status_stock === 'habis' ? 'text-red-600' : 'text-orange-600'
                    }`}>
                      {item.stock} {item.satuan}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Min: {item.stock_minimum}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Aksi Cepat</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a
              href="/koperasi/kasir"
              className="flex flex-col items-center justify-center p-6 border rounded hover:bg-muted transition-colors"
            >
              <ShoppingCart className="w-8 h-8 mb-2" />
              <span className="font-medium">Kasir</span>
            </a>
            <a
              href="/koperasi/master"
              className="flex flex-col items-center justify-center p-6 border rounded hover:bg-muted transition-colors"
            >
              <Package className="w-8 h-8 mb-2" />
              <span className="font-medium">Master Produk</span>
            </a>
            <a
              href="/koperasi/transfer-penerimaan"
              className="flex flex-col items-center justify-center p-6 border rounded hover:bg-muted transition-colors"
            >
              <TruckIcon className="w-8 h-8 mb-2" />
              <span className="font-medium">Transfer</span>
              {pendingCount > 0 && (
                <Badge variant="destructive" className="mt-1">
                  {pendingCount}
                </Badge>
              )}
            </a>
            <a
              href="/koperasi/penjualan"
              className="flex flex-col items-center justify-center p-6 border rounded hover:bg-muted transition-colors"
            >
              <DollarSign className="w-8 h-8 mb-2" />
              <span className="font-medium">Penjualan</span>
            </a>
            <a
              href="/koperasi/keuangan/dashboard"
              className="flex flex-col items-center justify-center p-6 border rounded hover:bg-muted transition-colors bg-gradient-to-br from-green-50 to-blue-50 border-green-200"
            >
              <DollarSign className="w-8 h-8 mb-2 text-green-600" />
              <span className="font-medium">Dashboard Keuangan</span>
              <span className="text-xs text-muted-foreground mt-1">Baru</span>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
