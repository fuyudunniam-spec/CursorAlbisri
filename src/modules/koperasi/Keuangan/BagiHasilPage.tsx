import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PieChart, RefreshCw, Calendar, DollarSign, AlertCircle, CheckCircle2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ProfitSharingBreakdown from './components/ProfitSharingBreakdown';
import RiwayatTransaksi from '@/components/dashboard/RiwayatTransaksi';
import TransactionDetailModal from '@/components/TransactionDetailModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, format, startOfDay, endOfDay } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { MonthlySummary } from '@/types/koperasi.types';

const BagiHasilPage = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showTransactionDetail, setShowTransactionDetail] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [dateFilter, setDateFilter] = useState<string>('bulan-ini');
  const [kasKoperasiId, setKasKoperasiId] = useState<string | null>(null);
  
  // Monthly summary state
  const [monthlySummaries, setMonthlySummaries] = useState<MonthlySummary[]>([]);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState<MonthlySummary | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (kasKoperasiId) {
      loadTransactionsWithFilter();
    }
  }, [dateFilter, kasKoperasiId]);

  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (dateFilter) {
      case 'hari-ini':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case 'minggu-ini':
        const dayOfWeek = now.getDay();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - dayOfWeek);
        startDate = startOfDay(weekStart);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        endDate = endOfDay(weekEnd);
        break;
      case 'bulan-ini':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'bulan-lalu':
        const lastMonth = subMonths(now, 1);
        startDate = startOfMonth(lastMonth);
        endDate = endOfMonth(lastMonth);
        break;
      case 'tahun-ini':
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
      default:
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
    }

    return { startDate, endDate };
  };

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: kasKoperasi, error: kasError } = await supabase
        .from('akun_kas')
        .select('id, nama, saldo_saat_ini')
        .eq('nama', 'Kas Koperasi')
        .eq('status', 'aktif')
        .single();

      if (kasError) {
        toast.error('Akun Kas Koperasi tidak ditemukan');
        return;
      }

      setKasKoperasiId(kasKoperasi.id);
      await Promise.all([
        loadTransactionsWithFilter(kasKoperasi.id),
        loadMonthlySummaries()
      ]);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal memuat data bagi hasil';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlySummaries = async () => {
    try {
      const { data, error } = await supabase
        .from('koperasi_bagi_hasil_log')
        .select('*')
        .limit(12);

      if (error) throw error;

      // Sort client-side since Supabase doesn't support multiple order calls
      const sortedData = (data || []).sort((a, b) => {
        if (a.tahun !== b.tahun) {
          return b.tahun - a.tahun; // descending by year
        }
        return b.bulan - a.bulan; // descending by month
      });

      setMonthlySummaries(sortedData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal memuat ringkasan bulanan';
      toast.error(errorMessage);
    }
  };

  const loadTransactionsWithFilter = async (accountId?: string) => {
    try {
      const akunId = accountId || kasKoperasiId;
      if (!akunId) return;

      const { startDate, endDate } = getDateRange();

      // Get bagi hasil transactions
      const { data: txData, error: txError } = await supabase
        .from('keuangan_koperasi')
        .select(`
          *,
          akun_kas:akun_kas_id(nama, saldo_saat_ini)
        `)
        .eq('akun_kas_id', akunId)
        .eq('kategori', 'Bagi Hasil')
        .gte('tanggal', startDate.toISOString())
        .lte('tanggal', endDate.toISOString())
        .order('tanggal', { ascending: false })
        .order('created_at', { ascending: false });

      if (txError) throw txError;

      const transformedTx = (txData || []).map(tx => ({
        ...tx,
        akun_kas_nama: tx.akun_kas?.nama || 'Kas Koperasi',
        display_category: tx.kategori || 'Bagi Hasil',
        source_type: tx.sub_kategori || tx.kategori || 'Manual',
        display_description: tx.deskripsi || 'Bagi Hasil'
      }));

      setTransactions(transformedTx);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal memuat data transaksi';
      toast.error(errorMessage);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadTransactionsWithFilter(),
      loadMonthlySummaries()
    ]);
    setRefreshing(false);
    toast.success('Data berhasil diperbarui');
  };

  const handlePaymentClick = (summary: MonthlySummary) => {
    setSelectedSummary(summary);
    setShowPaymentDialog(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedSummary) return;

    try {
      setProcessingPayment(true);

      // Call the database function to process payment
      const { data, error } = await supabase.rpc('process_payment_to_yayasan', {
        p_bulan: selectedSummary.bulan,
        p_tahun: selectedSummary.tahun
      });

      if (error) throw error;

      toast.success('Pembayaran berhasil diproses');
      
      // Reload data
      await Promise.all([
        loadMonthlySummaries(),
        loadTransactionsWithFilter()
      ]);

      setShowPaymentDialog(false);
      setSelectedSummary(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal memproses pembayaran';
      toast.error(errorMessage);
    } finally {
      setProcessingPayment(false);
    }
  };

  const getMonthName = (month: number) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return months[month - 1];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getFilterLabel = () => {
    const { startDate, endDate } = getDateRange();
    return `Periode: ${format(startDate, 'd MMMM yyyy', { locale: localeId })} - ${format(endDate, 'd MMMM yyyy', { locale: localeId })}`;
  };

  const handleViewTransaction = (transaction: any) => {
    setSelectedTransaction(transaction);
    setShowTransactionDetail(true);
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
        <div className="h-96 bg-white rounded-xl shadow-sm animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <span>Keuangan Koperasi</span>
            <span>/</span>
            <span className="text-gray-900 font-medium">Bagi Hasil</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-1">
            Bagi Hasil Koperasi
          </h1>
          <p className="text-sm text-gray-500">{getFilterLabel()}</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[180px] h-9">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Pilih periode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hari-ini">Hari Ini</SelectItem>
              <SelectItem value="minggu-ini">Minggu Ini</SelectItem>
              <SelectItem value="bulan-ini">Bulan Ini</SelectItem>
              <SelectItem value="bulan-lalu">Bulan Lalu</SelectItem>
              <SelectItem value="tahun-ini">Tahun Ini</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="border-gray-300 text-gray-700 hover:bg-gray-50 h-9"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Profit Sharing Breakdown */}
      <ProfitSharingBreakdown 
        startDate={getDateRange().startDate}
        endDate={getDateRange().endDate}
      />

      {/* Monthly Summary Table */}
      <Card className="rounded-xl border-0 shadow-sm bg-white overflow-hidden">
        <CardHeader className="pb-4 pt-6 px-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Ringkasan Bagi Hasil Bulanan
                </CardTitle>
                <p className="text-sm text-gray-500 mt-0.5">
                  Pembagian hasil penjualan produk yayasan (70:30)
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {monthlySummaries.length === 0 ? (
            <div className="text-center py-20 px-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <DollarSign className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-900 font-semibold text-base mb-1">Belum ada data bagi hasil</p>
              <p className="text-sm text-gray-500">Data bagi hasil bulanan akan muncul di sini</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Periode</TableHead>
                    <TableHead className="font-semibold text-right">Total Penjualan</TableHead>
                    <TableHead className="font-semibold text-right">Bagian Yayasan (70%)</TableHead>
                    <TableHead className="font-semibold text-right">Bagian Koperasi (30%)</TableHead>
                    <TableHead className="font-semibold text-center">Status</TableHead>
                    <TableHead className="font-semibold text-center">Tanggal Bayar</TableHead>
                    <TableHead className="font-semibold text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlySummaries.map((summary) => (
                    <TableRow 
                      key={summary.id}
                      className={summary.status === 'unpaid' && summary.bagian_yayasan > 0 ? 'bg-amber-50 hover:bg-amber-100' : ''}
                    >
                      <TableCell className="font-medium">
                        {getMonthName(summary.bulan)} {summary.tahun}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(summary.total_penjualan)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-emerald-600 font-semibold">
                        {formatCurrency(summary.bagian_yayasan)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-blue-600 font-semibold">
                        {formatCurrency(summary.bagian_koperasi)}
                      </TableCell>
                      <TableCell className="text-center">
                        {summary.status === 'paid' ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Lunas
                          </Badge>
                        ) : summary.bagian_yayasan > 0 ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Belum Bayar
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                            Tidak Ada
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm text-gray-600">
                        {summary.tanggal_bayar 
                          ? format(new Date(summary.tanggal_bayar), 'd MMM yyyy', { locale: localeId })
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-center">
                        {summary.status === 'unpaid' && summary.bagian_yayasan > 0 ? (
                          <Button
                            size="sm"
                            onClick={() => handlePaymentClick(summary)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <Wallet className="h-4 w-4 mr-1" />
                            Bayar
                          </Button>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card className="rounded-xl border-0 shadow-sm bg-white overflow-hidden">
        <CardHeader className="pb-4 pt-6 px-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
              <PieChart className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Riwayat Transaksi Bagi Hasil
              </CardTitle>
              <p className="text-sm text-gray-500 mt-0.5">
                {transactions.length} transaksi tercatat
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="text-center py-20 px-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <PieChart className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-900 font-semibold text-base mb-1">Belum ada transaksi bagi hasil</p>
              <p className="text-sm text-gray-500">Transaksi bagi hasil akan muncul di sini</p>
            </div>
          ) : (
            <div className="p-6">
              <RiwayatTransaksi
                transactions={transactions}
                onViewDetail={handleViewTransaction}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Confirmation Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-emerald-600" />
              Konfirmasi Pembayaran Bagi Hasil
            </DialogTitle>
            <DialogDescription>
              Pastikan data pembayaran sudah benar sebelum melanjutkan
            </DialogDescription>
          </DialogHeader>
          
          {selectedSummary && (
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Periode</span>
                  <span className="font-semibold text-gray-900">
                    {getMonthName(selectedSummary.bulan)} {selectedSummary.tahun}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Penjualan</span>
                  <span className="font-mono text-gray-900">
                    {formatCurrency(selectedSummary.total_penjualan)}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Bagian Yayasan (70%)</span>
                    <span className="font-mono text-emerald-600 font-semibold">
                      {formatCurrency(selectedSummary.bagian_yayasan)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Bagian Koperasi (30%)</span>
                  <span className="font-mono text-blue-600 font-semibold">
                    {formatCurrency(selectedSummary.bagian_koperasi)}
                  </span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-semibold mb-1">Perhatian</p>
                    <p>
                      Pembayaran akan mengurangi saldo Kas Koperasi sebesar{' '}
                      <span className="font-semibold">{formatCurrency(selectedSummary.bagian_yayasan)}</span>.
                      Pastikan saldo kas mencukupi.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPaymentDialog(false);
                setSelectedSummary(null);
              }}
              disabled={processingPayment}
            >
              Batal
            </Button>
            <Button
              onClick={handleConfirmPayment}
              disabled={processingPayment}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {processingPayment ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Konfirmasi Pembayaran
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Detail Modal */}
      {showTransactionDetail && selectedTransaction && (
        <TransactionDetailModal
          transaction={selectedTransaction}
          isOpen={showTransactionDetail}
          onClose={() => {
            setShowTransactionDetail(false);
            setSelectedTransaction(null);
          }}
        />
      )}
    </div>
  );
};

export default BagiHasilPage;
