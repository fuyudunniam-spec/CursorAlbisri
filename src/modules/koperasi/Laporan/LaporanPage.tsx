import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileBarChart,
  Package,
  TrendingUp,
  DollarSign,
  RefreshCw,
  Download,
  Calendar,
  Building2,
  Store,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { formatRupiah } from '@/utils/inventaris.utils';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, startOfDay, endOfDay } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import {
  getPersediaanReport,
  getLabaRugiReport,
  getBagiHasilReport,
  type PersediaanReportData,
  type LabaRugiReportData,
  type BagiHasilReportData,
} from '@/services/laporanKoperasi.service';
import { toast } from 'sonner';

type ReportType = 'persediaan' | 'laba-rugi' | 'bagi-hasil';

const LaporanPage = () => {
  const [activeReport, setActiveReport] = useState<ReportType>('persediaan');
  const [dateFilter, setDateFilter] = useState<string>('bulan-ini');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Get date range based on filter
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
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
        } else {
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
        }
        break;
      default:
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  };

  const dateRange = getDateRange();

  // Fetch Persediaan Report (no date filter needed)
  const { data: persediaanData, isLoading: isLoadingPersediaan, refetch: refetchPersediaan } = useQuery({
    queryKey: ['laporan-persediaan'],
    queryFn: () => getPersediaanReport(),
    enabled: activeReport === 'persediaan',
  });

  // Fetch Laba Rugi Report
  const { data: labaRugiData, isLoading: isLoadingLabaRugi, refetch: refetchLabaRugi } = useQuery({
    queryKey: ['laporan-laba-rugi', dateRange.startDate, dateRange.endDate],
    queryFn: () => getLabaRugiReport(dateRange.startDate, dateRange.endDate),
    enabled: activeReport === 'laba-rugi',
  });

  // Fetch Bagi Hasil Report
  const { data: bagiHasilData, isLoading: isLoadingBagiHasil, refetch: refetchBagiHasil } = useQuery({
    queryKey: ['laporan-bagi-hasil', dateRange.startDate, dateRange.endDate],
    queryFn: () => getBagiHasilReport(dateRange.startDate, dateRange.endDate),
    enabled: activeReport === 'bagi-hasil',
  });

  const handleRefresh = () => {
    if (activeReport === 'persediaan') {
      refetchPersediaan();
    } else if (activeReport === 'laba-rugi') {
      refetchLabaRugi();
    } else if (activeReport === 'bagi-hasil') {
      refetchBagiHasil();
    }
    toast.success('Data diperbarui');
  };

  const handleExport = () => {
    toast.info('Fitur export akan segera tersedia');
  };

  const isLoading = isLoadingPersediaan || isLoadingLabaRugi || isLoadingBagiHasil;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Laporan Koperasi</h1>
          <p className="text-gray-600 mt-1">Laporan keuangan dan persediaan koperasi</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Report Type Selection */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Jenis Laporan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-2">
              <button
                onClick={() => setActiveReport('persediaan')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  activeReport === 'persediaan'
                    ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  <span className="font-medium">Persediaan & Modal</span>
                </div>
              </button>
              <button
                onClick={() => setActiveReport('laba-rugi')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  activeReport === 'laba-rugi'
                    ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-medium">Laba Rugi</span>
                </div>
              </button>
              <button
                onClick={() => setActiveReport('bagi-hasil')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  activeReport === 'bagi-hasil'
                    ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  <span className="font-medium">Bagi Hasil</span>
                </div>
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Period Filter */}
          {activeReport !== 'persediaan' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Filter Periode
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4">
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-full md:w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hari-ini">Hari Ini</SelectItem>
                      <SelectItem value="minggu-ini">Minggu Ini</SelectItem>
                      <SelectItem value="bulan-ini">Bulan Ini</SelectItem>
                      <SelectItem value="bulan-lalu">Bulan Lalu</SelectItem>
                      <SelectItem value="tahun-ini">Tahun Ini</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  {dateFilter === 'custom' && (
                    <div className="flex gap-2 flex-1">
                      <Input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        placeholder="Dari Tanggal"
                        className="flex-1"
                      />
                      <Input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        placeholder="Sampai Tanggal"
                        className="flex-1"
                      />
                    </div>
                  )}
                  {dateFilter !== 'custom' && (
                    <div className="text-sm text-gray-600 flex items-center">
                      {format(new Date(dateRange.startDate), 'd MMM yyyy', { locale: localeId })} -{' '}
                      {format(new Date(dateRange.endDate), 'd MMM yyyy', { locale: localeId })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Report Content */}
          {isLoading ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">Memuat data...</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {activeReport === 'persediaan' && persediaanData && (
                <PersediaanReportView data={persediaanData} />
              )}
              {activeReport === 'laba-rugi' && labaRugiData && (
                <LabaRugiReportView data={labaRugiData} dateRange={dateRange} />
              )}
              {activeReport === 'bagi-hasil' && bagiHasilData && (
                <BagiHasilReportView data={bagiHasilData} dateRange={dateRange} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// =====================================================
// PERSEDIAAN REPORT VIEW
// =====================================================
const PersediaanReportView = ({ data }: { data: PersediaanReportData }) => {
  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Modal Koperasi di Stok</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatRupiah(data.summary.modalKoperasi)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Σ stok × HPP (owner_type='koperasi')</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Nilai Stok Yayasan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatRupiah(data.summary.nilaiStokYayasan)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Σ stok × HPP (owner_type='yayasan')</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Nilai Persediaan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatRupiah(data.summary.totalNilai)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Total semua persediaan</p>
          </CardContent>
        </Card>
      </div>

      {/* Detail Table - Desktop */}
      <Card>
        <CardHeader>
          <CardTitle>Detail Per Produk</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama Produk</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="text-right">Stok</TableHead>
                  <TableHead className="text-right">HPP</TableHead>
                  <TableHead className="text-right">Nilai</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.details.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      Tidak ada data
                    </TableCell>
                  </TableRow>
                ) : (
                  data.details.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">{item.kode_produk}</TableCell>
                      <TableCell className="font-medium">{item.nama_produk}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            item.owner_type === 'koperasi'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }
                        >
                          {item.owner_type === 'koperasi' ? (
                            <Store className="w-3 h-3 mr-1" />
                          ) : (
                            <Building2 className="w-3 h-3 mr-1" />
                          )}
                          {item.owner_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.stok} {item.satuan}
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatRupiah(item.hpp)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatRupiah(item.nilai)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {data.details.length === 0 ? (
              <div className="text-center text-gray-500 py-8">Tidak ada data</div>
            ) : (
              data.details.map((item) => (
                <Card key={item.id} className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-mono text-xs text-gray-500">{item.kode_produk}</div>
                        <div className="font-medium mt-1">{item.nama_produk}</div>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          item.owner_type === 'koperasi'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }
                      >
                        {item.owner_type === 'koperasi' ? (
                          <Store className="w-3 h-3 mr-1" />
                        ) : (
                          <Building2 className="w-3 h-3 mr-1" />
                        )}
                        {item.owner_type}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                      <div>
                        <div className="text-xs text-gray-500">Stok</div>
                        <div className="font-mono text-sm">
                          {item.stok} {item.satuan}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">HPP</div>
                        <div className="font-mono text-sm">{formatRupiah(item.hpp)}</div>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="text-xs text-gray-500">Nilai</div>
                      <div className="font-mono font-semibold text-lg">{formatRupiah(item.nilai)}</div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
};

// =====================================================
// LABA RUGI REPORT VIEW
// =====================================================
const LabaRugiReportView = ({
  data,
  dateRange,
}: {
  data: LabaRugiReportData;
  dateRange: { startDate: string; endDate: string };
}) => {
  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Penjualan Bersih</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-gray-900">{formatRupiah(data.penjualanBersih)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">HPP</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-red-600">{formatRupiah(data.hpp)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Laba Kotor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-emerald-600">{formatRupiah(data.labaKotor)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Beban Operasional</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-orange-600">{formatRupiah(data.bebanOperasional)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Laba Bersih</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-blue-600">{formatRupiah(data.labaBersih)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Laba Rugi Statement */}
      <Card>
        <CardHeader>
          <CardTitle>Laporan Laba Rugi</CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Periode: {format(new Date(dateRange.startDate), 'd MMM yyyy', { locale: localeId })} -{' '}
            {format(new Date(dateRange.endDate), 'd MMM yyyy', { locale: localeId })}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-b pb-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">Penjualan Bersih</span>
                <span className="font-mono font-semibold">{formatRupiah(data.penjualanBersih)}</span>
              </div>
            </div>
            <div className="border-b pb-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">Harga Pokok Penjualan (HPP)</span>
                <span className="font-mono text-red-600">({formatRupiah(data.hpp)})</span>
              </div>
            </div>
            <div className="border-b-2 border-gray-300 pb-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Laba Kotor</span>
                <span className="font-mono font-bold text-emerald-600">
                  {formatRupiah(data.labaKotor)}
                </span>
              </div>
            </div>
            <div className="border-b pb-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">Beban Operasional</span>
                <span className="font-mono text-orange-600">({formatRupiah(data.bebanOperasional)})</span>
              </div>
            </div>
            <div className="pt-2">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">Laba Bersih</span>
                <span className="font-mono text-xl font-bold text-blue-600">
                  {formatRupiah(data.labaBersih)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Beban Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Beban Operasional</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.breakdown.beban.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-gray-500 py-4">
                        Tidak ada beban operasional
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.breakdown.beban.map((beban, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-sm">
                          {format(new Date(beban.tanggal), 'd MMM yyyy', { locale: localeId })}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{beban.kategori}</div>
                            {beban.sub_kategori && (
                              <div className="text-xs text-gray-500">{beban.sub_kategori}</div>
                            )}
                            {beban.deskripsi && (
                              <div className="text-xs text-gray-400">{beban.deskripsi}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatRupiah(beban.jumlah)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Penjualan Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Penjualan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>No. Penjualan</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.breakdown.penjualan.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-gray-500 py-4">
                        Tidak ada penjualan
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.breakdown.penjualan.slice(0, 10).map((penjualan, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-sm">
                          {format(new Date(penjualan.tanggal), 'd MMM yyyy', { locale: localeId })}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{penjualan.no_penjualan}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatRupiah(penjualan.total)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

// =====================================================
// BAGI HASIL REPORT VIEW
// =====================================================
const BagiHasilReportView = ({
  data,
  dateRange,
}: {
  data: BagiHasilReportData;
  dateRange: { startDate: string; endDate: string };
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sudah':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Sudah
          </Badge>
        );
      case 'sebagian':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Sebagian
          </Badge>
        );
      case 'belum':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Belum
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
            Tidak Ada
          </Badge>
        );
    }
  };

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Penjualan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-gray-900">
              {formatRupiah(data.summary.totalPenjualan)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Produk yayasan</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Bagian Yayasan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-emerald-600">
              {formatRupiah(data.summary.totalBagianYayasan)}
            </div>
            <p className="text-xs text-gray-500 mt-1">70% dari margin</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Bagian Koperasi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-blue-600">
              {formatRupiah(data.summary.totalBagianKoperasi)}
            </div>
            <p className="text-xs text-gray-500 mt-1">30% dari margin</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Status Setoran</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mt-2">{getStatusBadge(data.summary.statusSetoran)}</div>
            <p className="text-xs text-gray-500 mt-2">Status pembayaran</p>
          </CardContent>
        </Card>
      </div>

      {/* Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detail Penjualan Produk Yayasan</CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Periode: {format(new Date(dateRange.startDate), 'd MMM yyyy', { locale: localeId })} -{' '}
            {format(new Date(dateRange.endDate), 'd MMM yyyy', { locale: localeId })}
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>No. Penjualan</TableHead>
                  <TableHead className="text-right">Total Penjualan</TableHead>
                  <TableHead className="text-right">Bagian Yayasan</TableHead>
                  <TableHead className="text-right">Bagian Koperasi</TableHead>
                  <TableHead className="text-center">Status Setoran</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.details.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      Tidak ada data penjualan produk yayasan
                    </TableCell>
                  </TableRow>
                ) : (
                  data.details.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm">
                        {format(new Date(item.tanggal), 'd MMM yyyy', { locale: localeId })}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{item.no_penjualan}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatRupiah(item.total_penjualan)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-emerald-600">
                        {formatRupiah(item.bagian_yayasan)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-blue-600">
                        {formatRupiah(item.bagian_koperasi)}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(item.status_setoran)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Setoran History */}
      {data.setoranHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Setoran</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead>Keterangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.setoranHistory.map((setoran) => (
                    <TableRow key={setoran.id}>
                      <TableCell className="text-sm">
                        {format(new Date(setoran.tanggal), 'd MMM yyyy', { locale: localeId })}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-emerald-600">
                        {formatRupiah(setoran.jumlah)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {setoran.keterangan || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default LaporanPage;
