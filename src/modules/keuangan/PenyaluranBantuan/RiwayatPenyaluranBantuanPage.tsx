import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RefreshCw, Download } from 'lucide-react';
import { toast } from 'sonner';
import { PenyaluranBantuanService, PenyaluranFilters } from '@/services/penyaluranBantuan.service';
import SummaryCards from '@/components/dashboard/SummaryCards';
import ChartsSection from '@/components/dashboard/ChartsSection';
import { loadChartData } from '@/services/keuanganChart.service';
import TopRecipientsChart from './components/TopRecipientsChart';
import RiwayatTransaksi from '@/components/dashboard/RiwayatTransaksi';
import FilterBar from './components/FilterBar';
import RealisasiLayananSantriTab from './components/RealisasiLayananSantriTab';
import { getFinancialStatsByDateRange } from '@/services/keuangan.service';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format, subMonths, startOfYear, endOfYear } from 'date-fns';
import { 
  excludeTabunganTransactions, 
  applyTabunganExclusionFilter,
  excludeKoperasiTransactions,
  applyKoperasiExclusionFilter
} from '@/utils/keuanganFilters';

const RiwayatPenyaluranBantuanPage: React.FC = () => {
  const [filters, setFilters] = useState<PenyaluranFilters>(() => {
    const now = new Date();
    // Default: 1 tahun terakhir
    return {
      startDate: format(startOfYear(now), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
    };
  });

  const [santriOptions, setSantriOptions] = useState<Array<{ id: string; nama_lengkap: string }>>(
    []
  );
  const [kategoriOptions, setKategoriOptions] = useState<string[]>([]);

  // Load santri options
  useEffect(() => {
    const loadSantriOptions = async () => {
      try {
        const { data, error } = await supabase
          .from('santri')
          .select('id, nama_lengkap')
          .eq('status', 'Aktif')
          .order('nama_lengkap', { ascending: true })
          .limit(100);

        if (error) throw error;
        setSantriOptions(data || []);
      } catch (error) {
        console.error('Error loading santri options:', error);
      }
    };

    loadSantriOptions();
  }, []);

  // Load kategori options from unified history
  useEffect(() => {
    const loadKategoriOptions = async () => {
      try {
        const history = await PenyaluranBantuanService.getUnifiedHistory({});
        const uniqueKategori = Array.from(
          new Set(history.map((h) => h.kategori).filter(Boolean))
        ).sort();
        setKategoriOptions(uniqueKategori);
      } catch (error) {
        console.error('Error loading kategori options:', error);
      }
    };

    loadKategoriOptions();
  }, []);

  // Fetch financial statistics using new function (KPI 4 cards)
  const {
    data: financialStats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['financial-stats-laporan', filters],
    queryFn: async () => {
      if (!filters.startDate || !filters.endDate) {
        const now = new Date();
        const start = format(startOfMonth(subMonths(now, 2)), 'yyyy-MM-dd');
        const end = format(endOfMonth(now), 'yyyy-MM-dd');
        return getFinancialStatsByDateRange(start, end);
      }
      return getFinancialStatsByDateRange(filters.startDate, filters.endDate);
    },
  });

  // Fetch monthly and category data using the same service as modul keuangan umum
  // This ensures consistency and uses the same filters (ledger='UMUM', excludes koperasi/tabungan)
  // REVISI: Include filters in queryKey to make it responsive to filter changes
  // REVISI: Pass date filters to loadChartData to filter by date range
  const {
    data: chartData,
    isLoading: chartLoading,
    refetch: refetchChart,
  } = useQuery({
    queryKey: ['laporan-keuangan-charts', filters.startDate, filters.endDate],
    queryFn: () => loadChartData(undefined, filters.startDate, filters.endDate), // Pass date filters
  });

  const monthlyCashflow = chartData?.monthlyData || [];
  const categoryData = chartData?.categoryData || [];

  // Fetch top recipients
  const {
    data: topRecipients,
    isLoading: recipientsLoading,
    refetch: refetchRecipients,
  } = useQuery({
    queryKey: ['penyaluran-recipients', filters],
    queryFn: () => PenyaluranBantuanService.getTopRecipients(filters, 10),
  });

  // REVISI: Fetch transaksi keuangan langsung (sama seperti dashboard keuangan)
  // Bukan dari alokasi_pengeluaran_santri, tapi langsung dari tabel keuangan
  const {
    data: transactions,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['laporan-keuangan-transactions', filters],
    queryFn: async () => {
      // Query transaksi keuangan langsung dari tabel keuangan
      let query = supabase
        .from('keuangan')
        .select(`
          id,
          tanggal,
          jenis_transaksi,
          kategori,
          sub_kategori,
          jumlah,
          deskripsi,
          referensi,
          status,
          akun_kas_id,
          source_module,
          source_id,
          auto_posted,
          created_at,
          updated_at,
          created_by,
          updated_by,
          penerima_pembayar,
          santri_id,
          bukti_file,
          jenis_alokasi,
          is_pengeluaran_riil,
          akun_kas:akun_kas_id(nama, managed_by)
        `)
        .eq('jenis_transaksi', 'Pengeluaran')
        .eq('status', 'posted')
        .eq('ledger', 'UMUM')
        .order('tanggal', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(500);

      // Apply filters
      if (filters.startDate) {
        query = query.gte('tanggal', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('tanggal', filters.endDate);
      }
      if (filters.kategori) {
        query = query.eq('kategori', filters.kategori);
      }

      // Exclude tabungan and koperasi
      query = applyTabunganExclusionFilter(query);
      query = applyKoperasiExclusionFilter(query);

      const { data, error } = await query;
      if (error) throw error;

      // Filter client-side (backup)
      let filtered = excludeKoperasiTransactions(excludeTabunganTransactions(data || []));

      // Transform to Transaction format
      return filtered.map((tx: any) => ({
        id: tx.id,
        tanggal: tx.tanggal,
        jenis_transaksi: tx.jenis_transaksi,
        kategori: tx.kategori,
        deskripsi: tx.deskripsi || '',
        jumlah: tx.jumlah,
        akun_kas_id: tx.akun_kas_id,
        akun_kas_nama: tx.akun_kas?.nama || 'Kas Utama',
        status: tx.status,
        created_at: tx.created_at,
        sub_kategori: tx.sub_kategori,
        penerima_pembayar: tx.penerima_pembayar,
        display_category: tx.kategori,
        source_type: tx.sub_kategori || tx.kategori || 'Manual',
        display_description: tx.deskripsi || '',
        auto_posted: tx.auto_posted,
        source_module: tx.source_module,
        source_id: tx.source_id,
        referensi: tx.referensi,
        is_pengeluaran_riil: tx.is_pengeluaran_riil,
      }));
    },
  });

  // Get current periode for RealisasiLayananSantriTab (from filters or current month)
  const getCurrentPeriode = (): string => {
    if (filters.startDate) {
      return filters.startDate.substring(0, 7); // "YYYY-MM"
    }
    const now = new Date();
    return format(now, 'yyyy-MM');
  };

  const [currentPeriode, setCurrentPeriode] = useState(getCurrentPeriode());

  useEffect(() => {
    setCurrentPeriode(getCurrentPeriode());
  }, [filters.startDate]);

  const handleRefresh = () => {
    refetchStats();
    refetchChart();
    refetchRecipients();
    refetchHistory();
    toast.success('Data diperbarui');
  };

  const handleFilterChange = (newFilters: PenyaluranFilters) => {
    setFilters(newFilters);
  };

  const handleReset = () => {
    const now = new Date();
    // Reset to 3 bulan terakhir
    setFilters({
      startDate: format(startOfMonth(subMonths(now, 2)), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
    });
  };

  const handleExport = () => {
    toast.info('Fitur export akan segera tersedia');
  };

  const handleViewDetail = (item: any) => {
    // TODO: Implement detail view
    toast.info(`Detail: ${item.santri_nama} - ${item.kategori}`);
  };

  const isLoading =
    statsLoading || chartLoading || recipientsLoading || historyLoading;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Keuangan Yayasan</h1>
          <p className="text-sm text-gray-500 mt-1">
            Laporan lengkap pengeluaran yayasan: bantuan untuk santri dan operasional yayasan
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="h-9"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="h-9">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="laporan" className="space-y-6">
        <TabsList>
          <TabsTrigger value="laporan">Laporan Keuangan</TabsTrigger>
          <TabsTrigger value="realisasi">Realisasi Layanan Santri Binaan</TabsTrigger>
        </TabsList>

        {/* Tab 1: Laporan Keuangan */}
        <TabsContent value="laporan" className="space-y-6">
          {/* Filter Bar - Pindahkan ke atas */}
          <FilterBar
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={handleReset}
            santriOptions={santriOptions}
            kategoriOptions={kategoriOptions}
            loading={isLoading}
          />

          {/* Summary Cards - 4 KPI Cards seperti modul keuangan umum */}
          {statsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-32"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : financialStats ? (
            <SummaryCards
              stats={{
                totalSaldo: financialStats.totalSaldo,
                pemasukanBulanIni: financialStats.pemasukan,
                pengeluaranBulanIni: financialStats.pengeluaran,
                totalTransaksi: financialStats.totalPemasukanTransaksi + financialStats.totalPengeluaranTransaksi,
                pemasukanTrend: financialStats.pemasukanTrend,
                pengeluaranTrend: financialStats.pengeluaranTrend,
                jumlahTransaksiPemasukan: financialStats.totalPemasukanTransaksi,
                jumlahTransaksiPengeluaran: financialStats.totalPengeluaranTransaksi,
                danaTerikat: financialStats.danaTerikat,
                danaTidakTerikat: financialStats.danaTidakTerikat,
                penyesuaianSaldoInfo: financialStats.penyesuaianSaldoInfo,
              }}
              periodLabel={
                filters.startDate && filters.endDate
                  ? `${format(new Date(filters.startDate), 'dd MMM yyyy')} - ${format(new Date(filters.endDate), 'dd MMM yyyy')}`
                  : 'Periode Terpilih'
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="text-sm text-gray-500 mb-2">Total Saldo</div>
                  <div className="text-2xl font-bold text-gray-400">Error loading data</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Charts Section - Using the same component as modul keuangan umum */}
          <ChartsSection 
            monthlyData={monthlyCashflow}
            categoryData={categoryData}
            startDateFilter={filters.startDate}
            endDateFilter={filters.endDate}
          />

          {/* Top Recipients Chart */}
          <TopRecipientsChart data={topRecipients || []} loading={recipientsLoading} />

          {/* Table Section */}
          <div className="space-y-4">
            {/* REVISI: Gunakan komponen RiwayatTransaksi yang sama seperti dashboard keuangan */}
            <RiwayatTransaksi
              transactions={transactions || []}
              loading={historyLoading}
              onViewDetail={handleViewDetail}
            />
          </div>
        </TabsContent>

        {/* Tab 2: Realisasi Layanan Santri Binaan */}
        <TabsContent value="realisasi" className="space-y-6">
          <RealisasiLayananSantriTab
            periode={currentPeriode}
            onPeriodeChange={(newPeriode) => {
              setCurrentPeriode(newPeriode);
              // Update filters to match periode
              const [year, month] = newPeriode.split('-').map(Number);
              const start = format(new Date(year, month - 1, 1), 'yyyy-MM-dd');
              const end = format(new Date(year, month, 0), 'yyyy-MM-dd');
              setFilters({
                ...filters,
                startDate: start,
                endDate: end,
              });
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RiwayatPenyaluranBantuanPage;

