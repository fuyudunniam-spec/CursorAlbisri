import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ShoppingCart, Eye, Plus, Edit, Trash2, TrendingUp, TrendingDown, Building2, Store, Wallet, BarChart3 } from 'lucide-react';
import { koperasiService, setoranCashKasirService } from '@/services/koperasi.service';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, subMonths, startOfYear, endOfYear } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SalesAnalytics from './components/SalesAnalytics';
import SetorCashDialog from './components/SetorCashDialog';
import { supabase } from '@/integrations/supabase/client';

interface UnifiedSale {
  sale_id: string;
  tanggal: string;
  customer_name: string;
  total_amount: number;
  source_type: 'penjualan_header' | 'transaksi_inventaris' | 'kop_penjualan';
  created_at: string;
  created_by?: string;
}

interface SaleDetail {
  sale_id: string;
  source_type: string;
  items: Array<{
    id: string;
    item_id: string;
    nama_barang: string;
    jumlah: number;
    satuan: string;
    harga_dasar?: number;
    harga_satuan?: number;
    harga_satuan_jual?: number;
    harga_total?: number;
    subtotal?: number;
    hpp: number;
    profit: number;
    bagian_yayasan?: number;
    bagian_koperasi?: number;
  }>;
  summary: {
    total_revenue: number;
    total_hpp: number;
    total_profit: number;
    bagian_yayasan: number;
    bagian_koperasi: number;
    profit_sharing_ratio: string;
  };
}

interface SalesSummary {
  total_revenue: number;
  total_hpp: number;
  total_profit: number;
  kewajiban_yayasan: number;
  margin_koperasi: number;
}

const RiwayatPenjualanPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedSale, setSelectedSale] = useState<UnifiedSale | null>(null);
  const [saleDetail, setSaleDetail] = useState<SaleDetail | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<UnifiedSale | null>(null);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'lastMonth'>('month');
  const [ownerTypeFilter, setOwnerTypeFilter] = useState<'all' | 'koperasi' | 'yayasan'>('all');
  const [showSetorCashDialog, setShowSetorCashDialog] = useState(false);
  const [kasirId, setKasirId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'analytics' | 'history'>('analytics');

  const getDateRange = () => {
    const now = new Date();
    let startDate: string | undefined;
    let endDate: string | undefined;

    switch (dateFilter) {
      case 'today':
        startDate = format(now, 'yyyy-MM-dd');
        endDate = format(now, 'yyyy-MM-dd');
        break;
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        startDate = format(weekStart, 'yyyy-MM-dd');
        endDate = format(now, 'yyyy-MM-dd');
        break;
      case 'month':
        startDate = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
        endDate = format(now, 'yyyy-MM-dd');
        break;
      case 'lastMonth':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        startDate = format(lastMonthStart, 'yyyy-MM-dd');
        endDate = format(lastMonthEnd, 'yyyy-MM-dd');
        break;
      default:
        startDate = undefined;
        endDate = undefined;
    }

    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();


  const { data: salesHistory, isLoading } = useQuery({
    queryKey: ['unified-sales-history', dateFilter, startDate, endDate, ownerTypeFilter],
    queryFn: () => koperasiService.getUnifiedSalesHistory({ 
      startDate, 
      endDate,
      filterOwnerType: ownerTypeFilter 
    }),
    staleTime: 30000,
  });

  // Get current user for setor cash
  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setKasirId(data.user.id);
      }
    });
  }, []);

  const { data: salesSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['sales-summary-liabilities', dateFilter, startDate, endDate],
    queryFn: () => koperasiService.getSalesSummaryWithLiabilities({ startDate, endDate }),
    staleTime: 30000,
  });

  // Get sales analytics - hourly data uses filter, but monthly trend always shows all data
  const { data: salesAnalytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['sales-analytics', dateFilter, startDate, endDate],
    queryFn: () => koperasiService.getSalesAnalytics({ 
      startDate, 
      endDate,
      // Monthly trend always uses all data (no filter)
      monthlyTrendAllTime: true 
    }),
    staleTime: 30000,
  });

  const handleViewDetail = async (sale: UnifiedSale) => {
    setSelectedSale(sale);
    setShowDetail(true);
    
    try {
      const detail = await koperasiService.getSalesDetailWithProfitSharing(
        sale.sale_id,
        sale.source_type
      );
      setSaleDetail(detail as SaleDetail);
    } catch (error) {
      console.error('Error fetching sale detail:', error);
      toast.error('Gagal memuat detail penjualan');
    }
  };

  const handleEdit = (sale: UnifiedSale) => {
    // Redirect to appropriate edit page based on source type
    if (sale.source_type === 'kop_penjualan') {
      // Edit koperasi penjualan - redirect to kasir with edit parameter
      navigate(`/koperasi/kasir?edit=${sale.sale_id}`);
    } else if (sale.source_type === 'penjualan_header') {
      // Edit multi-item sale
      navigate(`/inventaris/sales?edit=${sale.sale_id}`);
    } else {
      // Edit single-item sale
      navigate(`/inventaris/sales?edit=${sale.sale_id}`);
    }
  };

  const handleDelete = (sale: UnifiedSale) => {
    setSaleToDelete(sale);
    setShowDeleteConfirm(true);
  };

  const deleteMutation = useMutation({
    mutationFn: async (sale: UnifiedSale) => {
      // Delete based on source type
      const { supabase } = await import('@/integrations/supabase/client');
      
      if (sale.source_type === 'kop_penjualan') {
        // Use service function for proper deletion with stock restoration
        await koperasiService.deletePenjualan(sale.sale_id);
      } else if (sale.source_type === 'penjualan_header') {
        // Delete penjualan_header (cascade will delete items and transaksi_inventaris)
        const { error } = await supabase
          .from('penjualan_header')
          .delete()
          .eq('id', sale.sale_id);
        if (error) throw error;
      } else {
        // Delete transaksi_inventaris (trigger will restore stock)
        const { error } = await supabase
          .from('transaksi_inventaris')
          .delete()
          .eq('id', sale.sale_id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Penjualan berhasil dihapus');
      // Invalidate sales queries
      queryClient.invalidateQueries({ queryKey: ['unified-sales-history'] });
      queryClient.invalidateQueries({ queryKey: ['sales-summary-liabilities'] });
      // Invalidate keuangan koperasi queries (karena cascade delete sudah menghapus entri keuangan)
      // Invalidate semua query yang mungkin terkait dengan keuangan koperasi
      queryClient.invalidateQueries({ queryKey: ['keuangan-koperasi'] });
      queryClient.invalidateQueries({ queryKey: ['keuangan-koperasi-transactions'] });
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey.some((key) => 
          typeof key === 'string' && 
          (key.includes('keuangan') || key.includes('koperasi'))
        )
      });
      setShowDeleteConfirm(false);
      setSaleToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Gagal menghapus penjualan');
    },
  });

  const confirmDelete = () => {
    if (saleToDelete) {
      deleteMutation.mutate(saleToDelete);
    }
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getSourceTypeLabel = (type: string) => {
    switch (type) {
      case 'penjualan_header':
        return 'Multi-Item';
      case 'transaksi_inventaris':
        return 'Single-Item';
      case 'kop_penjualan':
        return 'Koperasi';
      default:
        return type;
    }
  };

  const getSourceTypeColor = (type: string) => {
    switch (type) {
      case 'penjualan_header':
        return 'bg-blue-100 text-blue-800';
      case 'transaksi_inventaris':
        return 'bg-green-100 text-green-800';
      case 'kop_penjualan':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const summary = salesSummary as SalesSummary | null;
  // Calculate total revenue from salesHistory for consistency
  const totalRevenue = salesHistory?.reduce((sum, sale) => sum + Number(sale.total_amount || 0), 0) || 0;
  const totalSales = salesHistory?.length || 0;

  return (
    <div className="space-y-6 bg-white min-h-screen p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard Penjualan
          </h1>
          <p className="text-gray-500 mt-1">Analitik dan riwayat transaksi penjualan</p>
        </div>
        <div className="flex items-center gap-3">
          {kasirId && (
            <Button
              onClick={() => setShowSetorCashDialog(true)}
              variant="outline"
              className="gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
              size="sm"
            >
              <Wallet className="w-4 h-4" />
              Setor Cash
            </Button>
          )}
          <Button
            onClick={() => navigate('/koperasi/kasir')}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            size="sm"
          >
            <Plus className="w-4 h-4" />
            Penjualan Baru
          </Button>
          
          {/* Compact Filter Dropdowns */}
          <div className="flex items-center gap-2">
            <Select value={dateFilter} onValueChange={(value: 'all' | 'today' | 'week' | 'month' | 'lastMonth') => setDateFilter(value)}>
              <SelectTrigger className="w-[140px] h-9 text-sm border-gray-300">
                <SelectValue placeholder="Periode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hari Ini</SelectItem>
                <SelectItem value="week">Minggu Ini</SelectItem>
                <SelectItem value="month">Bulan Ini</SelectItem>
                <SelectItem value="lastMonth">Bulan Lalu</SelectItem>
                <SelectItem value="all">Semua</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={ownerTypeFilter} onValueChange={(value: 'all' | 'koperasi' | 'yayasan') => setOwnerTypeFilter(value)}>
              <SelectTrigger className="w-[140px] h-9 text-sm border-gray-300">
                <SelectValue placeholder="Tipe Item" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="koperasi">Koperasi</SelectItem>
                <SelectItem value="yayasan">Inventaris</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'analytics' | 'history')} className="space-y-4">
        <TabsList className="bg-white border border-gray-200">
          <TabsTrigger value="analytics" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analitik
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Riwayat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-4">
          {analyticsLoading || isLoading ? (
            <Card className="bg-white/60 backdrop-blur-sm border-2 border-green-200/50">
              <CardContent className="py-12 text-center text-gray-500">
                Memuat data analitik...
              </CardContent>
            </Card>
          ) : salesAnalytics && salesHistory !== undefined ? (
            <SalesAnalytics
              hourlyData={salesAnalytics.hourlyData}
              dailyData={salesAnalytics.dailyData}
              popularItems={salesAnalytics.popularItems}
              totalSales={totalSales}
              totalRevenue={totalRevenue}
            />
          ) : (
            <Card className="bg-white/60 backdrop-blur-sm border-2 border-green-200/50">
              <CardContent className="py-12 text-center text-gray-500">
                Tidak ada data untuk ditampilkan
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {/* Summary Card - Only Total Revenue for Kasir */}
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">Total Penjualan</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {summaryLoading ? '...' : formatRupiah(summary?.total_revenue || 0)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {totalSales} transaksi
              </p>
            </CardContent>
          </Card>

          {/* Sales Table */}
          <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Daftar Transaksi
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Memuat data...</div>
          ) : !salesHistory || salesHistory.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Belum ada transaksi penjualan</p>
              <Button
                className="mt-4"
                onClick={() => navigate('/koperasi/kasir')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Buat Penjualan Baru
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesHistory.map((sale, index) => (
                  <TableRow key={`${sale.source_type}-${sale.sale_id}-${index}`}>
                    <TableCell>
                      {format(new Date(sale.tanggal), 'dd MMM yyyy', { locale: id })}
                    </TableCell>
                    <TableCell>{sale.customer_name || '-'}</TableCell>
                    <TableCell>
                      <Badge className={getSourceTypeColor(sale.source_type)}>
                        {getSourceTypeLabel(sale.source_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatRupiah(Number(sale.total_amount || 0))}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetail(sale)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(sale)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(sale)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Penjualan</DialogTitle>
          </DialogHeader>
          
          {selectedSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Tanggal</p>
                  <p className="font-medium">
                    {format(new Date(selectedSale.tanggal), 'dd MMMM yyyy', { locale: id })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Customer</p>
                  <p className="font-medium">{selectedSale.customer_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tipe</p>
                  <Badge className={getSourceTypeColor(selectedSale.source_type)}>
                    {getSourceTypeLabel(selectedSale.source_type)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="font-medium text-lg">
                    {formatRupiah(Number(selectedSale.total_amount || 0))}
                  </p>
                </div>
              </div>

              {saleDetail && (
                <>
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">Item Penjualan</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Barang</TableHead>
                          <TableHead className="text-right">Jumlah</TableHead>
                          <TableHead className="text-right">Harga</TableHead>
                          <TableHead className="text-right">HPP</TableHead>
                          <TableHead className="text-right">Profit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {saleDetail.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.nama_barang}</TableCell>
                            <TableCell className="text-right">
                              {item.jumlah} {item.satuan}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatRupiah(
                                Number(item.subtotal || item.harga_total || item.harga_satuan_jual || 0)
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatRupiah(Number(item.hpp || 0) * item.jumlah)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatRupiah(Number(item.profit || 0))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">Rincian Penjualan</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Total Revenue</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold">
                            {formatRupiah(saleDetail.summary.total_revenue)}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Total HPP</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold text-red-600">
                            {formatRupiah(saleDetail.summary.total_hpp)}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-green-50/80 to-green-100/50 border-2 border-green-200/50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2 text-green-800">
                            <Store className="w-4 h-4" />
                            Total Penjualan
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold text-green-900">
                            {formatRupiah(saleDetail.summary.total_revenue)}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Setor Cash Dialog */}
      {kasirId && (
        <SetorCashDialog
          open={showSetorCashDialog}
          onOpenChange={setShowSetorCashDialog}
          kasirId={kasirId}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Penjualan?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus penjualan ini? Tindakan ini tidak dapat dibatalkan.
              {saleToDelete && (
                <div className="mt-2 p-2 bg-gray-50 rounded">
                  <p className="text-sm font-medium">{saleToDelete.customer_name}</p>
                  <p className="text-xs text-gray-600">
                    {format(new Date(saleToDelete.tanggal), 'dd MMMM yyyy', { locale: id })} - {formatRupiah(Number(saleToDelete.total_amount || 0))}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RiwayatPenjualanPage;
