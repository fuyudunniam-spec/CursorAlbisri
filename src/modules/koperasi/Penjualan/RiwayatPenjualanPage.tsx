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
import { ShoppingCart, Eye, Plus, Edit, Trash2, TrendingUp, TrendingDown, Building2, Store, Wallet, BarChart3, Printer } from 'lucide-react';
import { Root as VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { koperasiService, setoranCashKasirService } from '@/services/koperasi.service';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, subMonths, startOfYear, endOfYear } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SalesAnalytics from './components/SalesAnalytics';
import SetorCashDialog from './components/SetorCashDialog';
import ReceiptNota from '../Kasir/components/ReceiptNota';
import { supabase } from '@/integrations/supabase/client';
import { formatRupiah } from '@/utils/formatCurrency';
import { QUERY_STALE_TIME, TOAST_DURATION } from '../constants';

interface UnifiedSale {
  sale_id: string;
  tanggal: string;
  customer_name: string;
  total_amount: number;
  source_type: 'penjualan_header' | 'transaksi_inventaris' | 'kop_penjualan';
  created_at: string;
  created_by?: string;
  items_summary?: string | null; // NEW: Daftar item terjual
  nomor_struk?: string | null; // NEW: Nomor struk untuk kop_penjualan
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
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    penjualan: {
      id: string;
      nomor_struk?: string;
      tanggal: string;
      kasir_name: string;
      metode_pembayaran?: string;
      total_transaksi: number;
      jumlah_bayar?: number;
      kembalian?: number;
    };
    items: Array<{
      id: string;
      nama_barang: string;
      jumlah: number;
      satuan: string;
      harga_satuan_jual: number;
      subtotal: number;
    }>;
  } | null>(null);

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
    staleTime: QUERY_STALE_TIME.SHORT,
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
    staleTime: QUERY_STALE_TIME.SHORT,
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
    staleTime: QUERY_STALE_TIME.SHORT,
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
      const errorMessage = error instanceof Error ? error.message : 'Gagal memuat detail penjualan';
      toast.error(errorMessage);
    }
  };

  const handlePrintNota = async (sale: UnifiedSale) => {
    try {
      if (sale.source_type !== 'kop_penjualan') {
        toast.error('Cetak nota hanya tersedia untuk penjualan koperasi');
        return;
      }

      const detail = await koperasiService.getSalesDetailWithProfitSharing(
        sale.sale_id,
        'kop_penjualan'
      );
      
      const penjualanHeader = await koperasiService.getPenjualanById(sale.sale_id);
      
      if (detail && penjualanHeader) {
        setReceiptData({
          penjualan: {
            id: sale.sale_id,
            nomor_struk: penjualanHeader.nomor_struk || penjualanHeader.no_penjualan,
            tanggal: penjualanHeader.tanggal,
            kasir_name: penjualanHeader.nama_kasir || 'Admin',
            metode_pembayaran: penjualanHeader.metode_pembayaran,
            total_transaksi: penjualanHeader.total_transaksi || penjualanHeader.total,
            jumlah_bayar: penjualanHeader.jumlah_bayar,
            kembalian: penjualanHeader.kembalian,
          },
          items: detail.items.map(item => ({
            id: item.id,
            nama_barang: item.nama_barang,
            jumlah: item.jumlah,
            satuan: item.satuan,
            harga_satuan_jual: item.harga_satuan_jual || item.harga_satuan || 0,
            subtotal: item.subtotal || item.harga_total || 0,
          })),
        });
        setShowReceipt(true);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal memuat data nota';
      toast.error(errorMessage);
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
      
      try {
        if (sale.source_type === 'kop_penjualan') {
          // Use service function for proper deletion with stock restoration
          // sale_id is already UUID from kop_penjualan.id
          await koperasiService.deletePenjualan(sale.sale_id);
        } else if (sale.source_type === 'penjualan_header') {
          // Delete penjualan_header (cascade will delete items and transaksi_inventaris)
          const { error } = await supabase
            .from('penjualan_header')
            .delete()
            .eq('id', sale.sale_id);
          if (error) {
            throw new Error(`Gagal menghapus penjualan: ${error.message}`);
          }
        } else if (sale.source_type === 'transaksi_inventaris') {
          // Delete transaksi_inventaris (trigger will restore stock)
          const { error } = await supabase
            .from('transaksi_inventaris')
            .delete()
            .eq('id', sale.sale_id);
          if (error) {
            throw new Error(`Gagal menghapus transaksi: ${error.message}`);
          }
        } else {
          throw new Error(`Tipe sumber tidak dikenal: ${sale.source_type}`);
        }
      } catch (error) {
        // Provide more detailed error message
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('Gagal menghapus penjualan. Silakan coba lagi.');
      }
    },
    onSuccess: () => {
      toast.success('Penjualan berhasil dihapus');
      // Invalidate sales queries
      queryClient.invalidateQueries({ queryKey: ['unified-sales-history'] });
      queryClient.invalidateQueries({ queryKey: ['sales-summary-liabilities'] });
      queryClient.invalidateQueries({ queryKey: ['sales-analytics'] });
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
    onError: (error: Error) => {
      const errorMessage = error?.message || 'Gagal menghapus penjualan';
      toast.error(errorMessage, {
        duration: TOAST_DURATION.MEDIUM,
      });
    },
  });

  const confirmDelete = () => {
    if (saleToDelete) {
      deleteMutation.mutate(saleToDelete);
    }
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
                  <TableHead>Item Terjual</TableHead>
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
                    <TableCell className="max-w-xs">
                      <div className="text-sm text-gray-700 truncate" title={sale.items_summary || '-'}>
                        {sale.items_summary || '-'}
                      </div>
                    </TableCell>
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
                        {sale.source_type === 'kop_penjualan' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePrintNota(sale)}
                            title="Cetak Nota"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetail(sale)}
                          title="Lihat Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(sale)}
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(sale)}
                          disabled={deleteMutation.isPending}
                          className="text-red-600 hover:text-red-700 disabled:opacity-50"
                          title="Hapus penjualan"
                        >
                          {deleteMutation.isPending && saleToDelete?.sale_id === sale.sale_id ? (
                            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
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

      {/* Detail Dialog - Tampilan Struk/Kwitansi */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <VisuallyHidden asChild>
            <DialogTitle>Detail Penjualan - Struk</DialogTitle>
          </VisuallyHidden>
          {selectedSale && saleDetail && (
            <div className="bg-white">
              {/* Header Struk */}
              <div className="text-center border-b-2 border-dashed border-gray-300 pb-4 mb-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">SANTRA MART</h2>
                <p className="text-sm text-gray-600">Koperasi Pesantren Anak Yatim Al-Bisri</p>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedSale.source_type === 'kop_penjualan' 
                    ? (selectedSale.nomor_struk ? `No. ${selectedSale.nomor_struk}` : `No. ${selectedSale.sale_id.slice(0, 8).toUpperCase()}`)
                    : (selectedSale.customer_name?.includes('PJ-') 
                      ? selectedSale.customer_name 
                      : `No. ${selectedSale.sale_id.slice(0, 8).toUpperCase()}`)}
                </p>
              </div>

              {/* Info Transaksi */}
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tanggal:</span>
                  <span className="font-medium">
                    {format(new Date(selectedSale.tanggal), 'dd MMMM yyyy, HH:mm', { locale: id })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Metode Pembayaran:</span>
                  <span className="font-medium capitalize">{selectedSale.customer_name || 'Cash'}</span>
                </div>
              </div>

              {/* Daftar Item */}
              <div className="border-t border-b border-gray-200 py-3 mb-4">
                <div className="space-y-2">
                  {saleDetail.items.map((item, index) => (
                    <div key={item.id || index} className="flex justify-between items-start text-sm">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.nama_barang}</p>
                        <p className="text-xs text-gray-500">
                          {item.jumlah} {item.satuan || 'pcs'} × {formatRupiah(Number(item.harga_satuan_jual || item.harga_satuan || 0))}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-medium text-gray-900">
                          {formatRupiah(Number(item.subtotal || item.harga_total || 0))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rincian Total */}
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">
                    {formatRupiah(saleDetail.summary.total_revenue)}
                  </span>
                </div>
                {saleDetail.summary.total_hpp > 0 && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>HPP:</span>
                    <span>{formatRupiah(saleDetail.summary.total_hpp)}</span>
                  </div>
                )}
                {saleDetail.summary.total_profit > 0 && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Profit:</span>
                    <span>{formatRupiah(saleDetail.summary.total_profit)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">TOTAL:</span>
                    <span className="text-lg font-bold text-emerald-600">
                      {formatRupiah(Number(selectedSale.total_amount || saleDetail.summary.total_revenue))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Struk */}
              <div className="border-t-2 border-dashed border-gray-300 pt-4 mt-4 text-center">
                <p className="text-xs text-gray-500">Terima kasih atas kunjungan Anda</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Button
                  variant="default"
                  onClick={() => setShowDetail(false)}
                  className="flex-1"
                >
                  Tutup
                </Button>
              </div>
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
            <AlertDialogDescription asChild>
              <div>
                <p>Apakah Anda yakin ingin menghapus penjualan ini? Tindakan ini tidak dapat dibatalkan.</p>
                {saleToDelete && (
                  <div className="mt-2 p-2 bg-gray-50 rounded">
                    <p className="text-sm font-medium">{saleToDelete.customer_name}</p>
                    <p className="text-xs text-gray-600">
                      {format(new Date(saleToDelete.tanggal), 'dd MMMM yyyy', { locale: id })} - {formatRupiah(Number(saleToDelete.total_amount || 0))}
                    </p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              {deleteMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Menghapus...
                </>
              ) : (
                'Hapus'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Receipt Print Dialog */}
      {showReceipt && receiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold">Nota Penjualan</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowReceipt(false);
                  setReceiptData(null);
                }}
              >
                Tutup
              </Button>
            </div>
            <div className="p-4">
              <ReceiptNota
                penjualan={receiptData.penjualan}
                items={receiptData.items}
                autoPrint={false}
                showActions={true}
                onClose={() => {
                  setShowReceipt(false);
                  setReceiptData(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiwayatPenjualanPage;
