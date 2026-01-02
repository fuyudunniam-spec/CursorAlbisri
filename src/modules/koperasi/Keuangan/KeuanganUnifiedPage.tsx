import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RefreshCw, Plus, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Import services
import { AkunKasService } from '@/services/akunKas.service';
import { loadChartData as loadChartDataService } from '@/services/keuanganChart.service';
import { koperasiService } from '@/services/koperasi.service';

// Import koperasi-specific forms
import FormPengeluaranKoperasi from './components/FormPengeluaranKoperasi';
import FormPemasukanKoperasi from './components/FormPemasukanKoperasi';
import FormPenyesuaianSaldo from '@/components/FormPenyesuaianSaldo';
import TransferAkunKasDialog from './components/TransferAkunKasDialog';
import StackedAccountCards from '@/components/dashboard/StackedAccountCards';
import TotalBalanceDisplay from '@/components/dashboard/TotalBalanceDisplay';
import SummaryCards from '@/components/dashboard/SummaryCards';
import SimpleKoperasiSummaryCards from './components/SimpleKoperasiSummaryCards';
import ChartsSection from '@/components/dashboard/ChartsSection';
import RiwayatTransaksi from '@/components/dashboard/RiwayatTransaksi';
import TransactionDetailModal from '@/components/TransactionDetailModal';
import TransactionEditModal from '@/components/TransactionEditModal';
import EditTanggalTransferDonasiDialog from '@/components/EditTanggalTransferDonasiDialog';
import { startOfMonth, endOfMonth, startOfDay, endOfDay, subMonths, format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, AlertCircle, ExternalLink, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MonthYearFilter } from '@/components/filters/MonthYearFilter';

const KeuanganUnifiedPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [statistics, setStatistics] = useState<any>(null);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [akunKas, setAkunKas] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [categoryDataPemasukan, setCategoryDataPemasukan] = useState<any[]>([]);
  const [categoryDataPengeluaran, setCategoryDataPengeluaran] = useState<any[]>([]);
  
  // Period summary states (simplified)
  const [periodSummary, setPeriodSummary] = useState({
    pemasukan: 0,
    pengeluaran: 0,
    labaRugi: 0
  });
  
  
  // Real cash balance state (exclude closed months)
  const [realCashBalance, setRealCashBalance] = useState<number>(0);
  const [realCashBalanceDetails, setRealCashBalanceDetails] = useState<{
    lastIncomeMonth: string | null;
    totalPemasukanBulanTerakhir: number;
    totalPengeluaran: number;
  }>({
    lastIncomeMonth: null,
    totalPemasukanBulanTerakhir: 0,
    totalPengeluaran: 0
  });
  
  // UI states
  const [showForm, setShowForm] = useState(false);
  const [showFormPemasukan, setShowFormPemasukan] = useState(false);
  const [showFormPenyesuaianSaldo, setShowFormPenyesuaianSaldo] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showTransactionDetail, setShowTransactionDetail] = useState(false);
  const [showTransactionEdit, setShowTransactionEdit] = useState(false);
  const [showEditTanggalDonasi, setShowEditTanggalDonasi] = useState(false);
  const [selectedTransactionForEditTanggal, setSelectedTransactionForEditTanggal] = useState<any>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string | undefined>(undefined);
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(undefined);
  
  // Date filter state - untuk statistik dan riwayat transaksi
  // Simplified: hanya 'all' atau 'bulan' dengan pilihan bulan/tahun
  // Default: 'all' untuk menampilkan saldo akumulatif
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Get date range based on filter (simplified: all atau bulan tertentu)
  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (dateFilter === 'all') {
      // Untuk 'all', ambil semua data (tidak ada filter tanggal)
      startDate = new Date(0); // Very old date
      endDate = new Date(); // Today
    } else {
      // Filter berdasarkan bulan yang dipilih
      startDate = startOfMonth(new Date(selectedYear, selectedMonth - 1, 1));
      endDate = endOfMonth(new Date(selectedYear, selectedMonth - 1, 1));
    }

    return { startDate, endDate };
  };

  // Get period label based on filter (simplified)
  const getPeriodLabel = () => {
    if (dateFilter === 'all') {
      return 'Keseluruhan';
    }
    // Format bulan yang dipilih
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                       'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${monthNames[selectedMonth - 1]} ${selectedYear}`;
  };

  // Get previous period label for trend comparison
  const getPreviousPeriodLabel = () => {
    switch (dateFilter) {
      case 'bulan-ini':
        return 'bulan lalu';
      case 'bulan-lalu':
        return '2 bulan lalu';
      case '3-bulan':
        return '3 bulan sebelumnya';
      case 'custom':
        return 'periode sebelumnya';
      case 'all':
      default:
        return 'periode sebelumnya';
    }
  };

  // Calculate real cash balance (exclude closed months)
  // LOGIKA: 
  // - Jika filter "all": Saldo kumulatif = Total semua pemasukan - Total semua pengeluaran
  // - Jika filter periode: Saldo = Pemasukan bulan terakhir (setor cash) - Pengeluaran (dari bulan terakhir hingga saat ini)
  const calculateRealCashBalance = async () => {
    try {
      // Get akun kas koperasi untuk filter
      const koperasiAccountIds = akunKas
        .filter(akun => akun.managed_by === 'koperasi' || akun.nama?.toLowerCase().includes('koperasi'))
        .map(akun => akun.id);
      
      if (koperasiAccountIds.length === 0) {
        setRealCashBalance(0);
        setRealCashBalanceDetails({
          lastIncomeMonth: null,
          totalPemasukanBulanTerakhir: 0,
          totalPengeluaran: 0
        });
        return;
      }
      
      // Apply account filter if selected
      const accountIdsToUse = selectedAccountFilter 
        ? [selectedAccountFilter]
        : koperasiAccountIds;
      
      // Jika filter "all", hitung saldo kumulatif dari semua data
      if (dateFilter === 'all') {
        
        // Get total pemasukan kumulatif (SEMUA pemasukan koperasi, termasuk manual input)
        const { data: pemasukanData } = await supabase
          .from('keuangan')
          .select('jumlah')
          .eq('jenis_transaksi', 'Pemasukan')
          .eq('status', 'posted')
          .eq('source_module', 'koperasi')
          .in('akun_kas_id', accountIdsToUse);
        
        const totalPemasukan = (pemasukanData || []).reduce(
          (sum, item) => sum + parseFloat(item.jumlah || 0), 0
        );
        
        // Get total pengeluaran kumulatif (semua pengeluaran, exclude kewajiban/hutang)
        const [pengeluaranKeuangan, pengeluaranKoperasi] = await Promise.all([
          supabase
            .from('keuangan')
            .select('jumlah, kategori, sub_kategori, deskripsi')
            .eq('jenis_transaksi', 'Pengeluaran')
            .eq('status', 'posted')
            .eq('source_module', 'koperasi')
            .in('akun_kas_id', accountIdsToUse),
          supabase
            .from('keuangan_koperasi')
            .select('jumlah, kategori, sub_kategori, deskripsi')
            .eq('jenis_transaksi', 'Pengeluaran')
            .eq('status', 'posted')
            .in('akun_kas_id', accountIdsToUse)
        ]);
        
        // Combine dan filter biaya operasional
        const allPengeluaranData = [
          ...(pengeluaranKeuangan.data || []),
          ...(pengeluaranKoperasi.data || [])
        ];
        
        // Filter biaya operasional (exclude kewajiban/hutang, TAPI INCLUDE transfer ke yayasan)
        const biayaOperasional = allPengeluaranData.filter(item => {
          const kategori = (item.kategori || '').toLowerCase();
          const subKategori = (item.sub_kategori || '').toLowerCase();
          const deskripsi = (item.deskripsi || '').toLowerCase();
          
          // INCLUDE transfer ke yayasan sebagai pengeluaran
          if (kategori === 'transfer ke yayasan' || 
              subKategori === 'transfer ke yayasan' ||
              deskripsi.includes('transfer ke yayasan') ||
              deskripsi.includes('transfer laba/rugi')) {
            return true;
          }
          
          // Exclude hanya kewajiban/hutang
          const isKewajiban = 
            kategori === 'kewajiban' ||
            kategori === 'hutang ke yayasan' ||
            kategori.includes('kewajiban') ||
            kategori.includes('hutang') ||
            subKategori === 'kewajiban penjualan inventaris yayasan' ||
            subKategori.includes('kewajiban') ||
            subKategori.includes('hutang') ||
            deskripsi.includes('kewajiban penjualan') ||
            deskripsi.includes('hutang ke yayasan');
          
          return !isKewajiban;
        });
        
        const totalPengeluaran = biayaOperasional.reduce(
          (sum, item) => sum + parseFloat(item.jumlah || 0), 0
        );
        
        const cumulativeBalance = totalPemasukan - totalPengeluaran;
        
        setRealCashBalance(cumulativeBalance);
        setRealCashBalanceDetails({
          lastIncomeMonth: null,
          totalPemasukanBulanTerakhir: totalPemasukan,
          totalPengeluaran: totalPengeluaran
        });
      } else {
        // Filter periode: hitung saldo dari pemasukan bulan terakhir - pengeluaran
        // Get bulan terakhir dengan pemasukan (SEMUA pemasukan koperasi, termasuk manual input)
        const { data: lastIncomeData } = await supabase
          .from('keuangan')
          .select('tanggal, jumlah')
          .eq('jenis_transaksi', 'Pemasukan')
          .eq('status', 'posted')
          .eq('source_module', 'koperasi')
          .in('akun_kas_id', accountIdsToUse)
          .order('tanggal', { ascending: false })
          .limit(1);
        
        if (lastIncomeData && lastIncomeData.length > 0) {
          const lastIncomeDate = new Date(lastIncomeData[0].tanggal);
          const lastIncomeMonth = `${lastIncomeDate.getFullYear()}-${String(lastIncomeDate.getMonth() + 1).padStart(2, '0')}`;
          
          // Get total pemasukan bulan terakhir (SEMUA pemasukan koperasi, termasuk manual input)
          const { data: pemasukanBulanTerakhir } = await supabase
            .from('keuangan')
            .select('jumlah')
            .eq('jenis_transaksi', 'Pemasukan')
            .eq('status', 'posted')
            .eq('source_module', 'koperasi')
            .in('akun_kas_id', accountIdsToUse)
            .gte('tanggal', `${lastIncomeMonth}-01`)
            .lte('tanggal', `${lastIncomeMonth}-31`);
          
          const totalPemasukanBulanTerakhir = (pemasukanBulanTerakhir || []).reduce(
            (sum, item) => sum + parseFloat(item.jumlah || 0), 0
          );
          
          // Get total pengeluaran dari bulan terakhir hingga saat ini
          const { data: pengeluaranData } = await supabase
            .from('keuangan')
            .select('jumlah, kategori, sub_kategori, deskripsi')
            .eq('jenis_transaksi', 'Pengeluaran')
            .eq('status', 'posted')
            .eq('source_module', 'koperasi')
            .in('akun_kas_id', accountIdsToUse)
            .gte('tanggal', `${lastIncomeMonth}-01`);
          
          const biayaOperasional = (pengeluaranData || []).filter(item => {
            const kategori = (item.kategori || '').toLowerCase();
            const subKategori = (item.sub_kategori || '').toLowerCase();
            const deskripsi = (item.deskripsi || '').toLowerCase();
            
            if (kategori === 'transfer ke yayasan' || 
                subKategori === 'transfer ke yayasan' ||
                deskripsi.includes('transfer ke yayasan') ||
                deskripsi.includes('transfer laba/rugi')) {
              return true;
            }
            
            const isKewajiban = 
              kategori.includes('kewajiban') ||
              kategori.includes('hutang') ||
              subKategori.includes('kewajiban') ||
              subKategori.includes('hutang') ||
              deskripsi.includes('kewajiban') ||
              deskripsi.includes('hutang');
            
            return !isKewajiban;
          });
          
          const totalPengeluaran = biayaOperasional.reduce(
            (sum, item) => sum + parseFloat(item.jumlah || 0), 0
          );
          
          const realBalance = totalPemasukanBulanTerakhir - totalPengeluaran;
          
          setRealCashBalance(realBalance);
          setRealCashBalanceDetails({
            lastIncomeMonth: lastIncomeMonth,
            totalPemasukanBulanTerakhir: totalPemasukanBulanTerakhir,
            totalPengeluaran: totalPengeluaran
          });
        } else {
          setRealCashBalance(0);
          setRealCashBalanceDetails({
            lastIncomeMonth: null,
            totalPemasukanBulanTerakhir: 0,
            totalPengeluaran: 0
          });
        }
      }
    } catch (error) {
      console.error('Error calculating real cash balance:', error);
      // Fallback to saldo_saat_ini if calculation fails
      const fallbackBalance = selectedAccountId 
        ? akunKas.find(akun => akun.id === selectedAccountId)?.saldo_saat_ini || 0
        : akunKas.filter(akun => akun.status === 'aktif').reduce((sum, akun) => sum + (akun.saldo_saat_ini || 0), 0);
      setRealCashBalance(fallbackBalance);
      setRealCashBalanceDetails({
        lastIncomeMonth: null,
        totalPemasukanBulanTerakhir: 0,
        totalPengeluaran: 0
      });
    }
  };

  // Calculate period summary (pemasukan, pengeluaran, laba/rugi)
  // IMPORTANT: Mengambil data dari riwayat transaksi (keuangan) untuk representasi yang akurat
  // PASTIKAN: Filter berdasarkan akun kas koperasi untuk konsistensi dengan riwayat transaksi
  const calculatePeriodSummary = async () => {
    try {
      const { startDate, endDate } = getDateRange();
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');
      
      // Get akun kas koperasi untuk filter
      const koperasiAccountIds = akunKas
        .filter(akun => akun.managed_by === 'koperasi' || akun.nama?.toLowerCase().includes('koperasi'))
        .map(akun => akun.id);
      
      if (koperasiAccountIds.length === 0) {
        console.log('[calculatePeriodSummary] No koperasi accounts found');
        setPeriodSummary({ pemasukan: 0, pengeluaran: 0, labaRugi: 0 });
        return;
      }
      
      // Apply account filter if selected
      const accountIdsToUse = selectedAccountFilter 
        ? [selectedAccountFilter]
        : koperasiAccountIds;
      
      console.log('[calculatePeriodSummary] Filter:', {
        dateFilter,
        accountIds: accountIdsToUse,
        dateRange: dateFilter === 'all' ? 'ALL DATA' : `${startDateStr} - ${endDateStr}`
      });
      
      // 1. Get total pemasukan dari riwayat transaksi (SEMUA pemasukan koperasi, termasuk manual input)
      // Ini memastikan data yang ditampilkan sinkron dengan riwayat transaksi yang sebenarnya
      let pemasukanQuery = supabase
        .from('keuangan')
        .select('jumlah, kategori, tanggal, akun_kas_id')
        .eq('jenis_transaksi', 'Pemasukan')
        .eq('status', 'posted')
        .eq('source_module', 'koperasi')
        .in('akun_kas_id', accountIdsToUse);
      
      // Hanya filter tanggal jika bukan 'all'
      if (dateFilter !== 'all') {
        pemasukanQuery = pemasukanQuery
          .gte('tanggal', startDateStr)
          .lte('tanggal', endDateStr);
      }
      
      const { data: pemasukanData, error: pemasukanError } = await pemasukanQuery;
      
      if (pemasukanError) {
        console.error('[calculatePeriodSummary] Error fetching pemasukan:', pemasukanError);
      }
      
      const totalPemasukan = (pemasukanData || []).reduce(
        (sum, item) => sum + parseFloat(item.jumlah || 0), 0
      );
      
      // 2. Get total pengeluaran untuk periode (exclude kewajiban/hutang, TAPI INCLUDE transfer ke yayasan)
      // Transfer ke yayasan adalah pengeluaran yang valid dan harus dihitung
      // PASTIKAN: Filter berdasarkan akun kas koperasi yang sama dengan pemasukan
      // IMPORTANT: Ambil dari kedua tabel (keuangan dan keuangan_koperasi) untuk backward compatibility
      let pengeluaranKeuanganQuery = supabase
        .from('keuangan')
        .select('jumlah, kategori, sub_kategori, deskripsi, akun_kas_id')
        .eq('jenis_transaksi', 'Pengeluaran')
        .eq('status', 'posted')
        .eq('source_module', 'koperasi')
        .in('akun_kas_id', accountIdsToUse);
      
      let pengeluaranKoperasiQuery = supabase
        .from('keuangan_koperasi')
        .select('jumlah, kategori, sub_kategori, deskripsi, akun_kas_id')
        .eq('jenis_transaksi', 'Pengeluaran')
        .eq('status', 'posted')
        .in('akun_kas_id', accountIdsToUse);
      
      // Hanya filter tanggal jika bukan 'all'
      if (dateFilter !== 'all') {
        pengeluaranKeuanganQuery = pengeluaranKeuanganQuery
          .gte('tanggal', startDateStr)
          .lte('tanggal', endDateStr);
        pengeluaranKoperasiQuery = pengeluaranKoperasiQuery
          .gte('tanggal', startDateStr)
          .lte('tanggal', endDateStr);
      }
      
      const [pengeluaranKeuangan, pengeluaranKoperasi] = await Promise.all([
        pengeluaranKeuanganQuery,
        pengeluaranKoperasiQuery
      ]);
      
      // Gabungkan data dari kedua tabel
      const allPengeluaranData = [
        ...(pengeluaranKeuangan.data || []),
        ...(pengeluaranKoperasi.data || [])
      ];
      
      // Debug logging (hanya di development)
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Pengeluaran Data:', {
          fromKeuangan: pengeluaranKeuangan.data?.length || 0,
          fromKoperasi: pengeluaranKoperasi.data?.length || 0,
          total: allPengeluaranData.length,
          accountIds: accountIdsToUse,
          dateRange: { startDateStr, endDateStr }
        });
      }
      
      // Filter out kewajiban/hutang (TAPI INCLUDE transfer ke yayasan dan transfer antar akun sebagai pengeluaran)
      // Transfer ke yayasan dan transfer antar akun adalah pengeluaran yang valid dan harus dihitung
      const biayaOperasional = allPengeluaranData.filter(item => {
        const kategori = (item.kategori || '').toLowerCase();
        const subKategori = (item.sub_kategori || '').toLowerCase();
        const deskripsi = (item.deskripsi || '').toLowerCase();
        
        // INCLUDE transfer ke yayasan sebagai pengeluaran
        if (kategori === 'transfer ke yayasan' || 
            subKategori === 'transfer ke yayasan' ||
            deskripsi.includes('transfer ke yayasan') ||
            deskripsi.includes('transfer laba/rugi')) {
          return true; // Include transfer ke yayasan
        }
        
        // INCLUDE transfer antar akun sebagai pengeluaran (untuk transfer dari koperasi ke keuangan umum)
        if (kategori === 'transfer antar akun' || 
            subKategori === 'transfer antar akun' ||
            deskripsi.includes('transfer ke ') && !deskripsi.includes('transfer ke yayasan')) {
          return true; // Include transfer antar akun
        }
        
        // Exclude hanya kewajiban/hutang (bukan transfer)
        const isKewajiban = 
          kategori.includes('kewajiban') ||
          kategori.includes('hutang') ||
          subKategori.includes('kewajiban') ||
          subKategori.includes('hutang') ||
          deskripsi.includes('kewajiban') ||
          deskripsi.includes('hutang');
        
        return !isKewajiban;
      });
      
      const totalPengeluaran = biayaOperasional.reduce(
        (sum, item) => sum + parseFloat(item.jumlah || 0), 0
      );
      
      // 3. Calculate laba/rugi
      const labaRugi = totalPemasukan - totalPengeluaran;
      
      setPeriodSummary({
        pemasukan: totalPemasukan,
        pengeluaran: totalPengeluaran,
        labaRugi
      });
    } catch (error) {
      console.error('Error calculating period summary:', error);
      setPeriodSummary({ pemasukan: 0, pengeluaran: 0, labaRugi: 0 });
    }
  };


  // Chart data loading - uses the same transactions as displayed in riwayat transaksi
  // This ensures chart accurately represents transaction history
  // Memoize loadChartData dengan useCallback untuk mencegah re-creation setiap render
  const loadChartData = useCallback(async (accountId?: string) => {
    try {
      // Use recentTransactions which are already filtered correctly
      // This ensures chart data matches what's shown in transaction history
      const transactionsToUse = recentTransactions || [];
      
      if (transactionsToUse.length === 0) {
        setMonthlyData([]);
        setCategoryDataPemasukan([]);
        setCategoryDataPengeluaran([]);
        return;
      }

      // Process monthly data from actual transactions
      const monthlyStats: { [key: string]: { pemasukan: number; pengeluaran: number } } = {};
      
      // Get all unique months from transactions
      const monthSet = new Set<string>();
      transactionsToUse.forEach((tx: any) => {
        if (tx.tanggal) {
          const monthKey = tx.tanggal.substring(0, 7);
          monthSet.add(monthKey);
        }
      });

      // Initialize months with zero values
      Array.from(monthSet).sort().forEach(monthKey => {
        monthlyStats[monthKey] = { pemasukan: 0, pengeluaran: 0 };
      });

      // Process transactions - use the same data as shown in history
      transactionsToUse.forEach((transaction: any) => {
        if (!transaction.tanggal) return;
        
        const monthKey = transaction.tanggal.substring(0, 7);
        if (monthlyStats[monthKey]) {
          const jumlah = parseFloat(transaction.jumlah || 0);
          if (transaction.jenis_transaksi === 'Pemasukan') {
            monthlyStats[monthKey].pemasukan += jumlah;
          } else if (transaction.jenis_transaksi === 'Pengeluaran') {
            monthlyStats[monthKey].pengeluaran += jumlah;
          }
        }
      });

      // Convert to chart format - sorted chronologically
      const sortedEntries = Object.entries(monthlyStats)
        .sort(([a], [b]) => a.localeCompare(b));
      
      const monthlyData = sortedEntries.map(([monthKey, stats]) => {
        const date = new Date(monthKey + '-01');
        const monthName = date.toLocaleDateString('id-ID', { month: 'short' });
        const formattedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        
        return {
          month: formattedMonth,
          pemasukan: stats.pemasukan,
          pengeluaran: stats.pengeluaran
        };
      });

      // Process category data with breakdown: Yayasan vs Koperasi
      // Use the same transactions shown in history
      let totalPemasukanYayasan = 0;
      let totalPemasukanKoperasi = 0;
      let totalPengeluaranYayasan = 0;
      let totalPengeluaranKoperasi = 0;

      // For pengeluaran, group by actual category
      const pengeluaranByCategory: { [key: string]: number } = {};

      transactionsToUse.forEach((transaction: any) => {
        const jumlah = parseFloat(transaction.jumlah || 0);
        const kategori = (transaction.kategori || '').toLowerCase();
        const kategoriOriginal = transaction.kategori || 'Lainnya';
        const referensi = transaction.referensi || '';
        
        // Determine if transaction is from yayasan or koperasi
        const isFromYayasan = 
          kategori.includes('jasa pengelolaan') ||
          kategori.includes('bagi hasil yayasan') ||
          kategori.includes('penjualan inventaris yayasan') ||
          referensi.includes('transaksi_inventaris') ||
          referensi.includes('inventory_sale');
        
        if (transaction.jenis_transaksi === 'Pemasukan') {
          if (isFromYayasan) {
            totalPemasukanYayasan += jumlah;
          } else {
            totalPemasukanKoperasi += jumlah;
          }
        } else if (transaction.jenis_transaksi === 'Pengeluaran') {
          // Group pengeluaran by actual category
          // Normalize category names for better grouping
          let categoryKey = kategoriOriginal;
          
          // Normalize common category names
          if (kategori.includes('transfer ke yayasan') || kategori.includes('transfer laba/rugi')) {
            categoryKey = 'Transfer ke Yayasan';
          } else if (kategori.includes('operasional') || kategori.includes('beban operasional')) {
            categoryKey = 'Operasional';
          } else if (kategori.includes('beban') && !kategori.includes('transfer')) {
            categoryKey = 'Beban';
          } else if (kategori.includes('biaya')) {
            categoryKey = 'Biaya';
          } else if (kategori.includes('konsumsi')) {
            categoryKey = 'Konsumsi';
          } else if (kategori.includes('utilitas')) {
            categoryKey = 'Utilitas';
          } else {
            // Use original category name, capitalize first letter
            categoryKey = kategoriOriginal.charAt(0).toUpperCase() + kategoriOriginal.slice(1);
          }
          
          pengeluaranByCategory[categoryKey] = (pengeluaranByCategory[categoryKey] || 0) + jumlah;
          
          // Keep old logic for chart breakdown (Yayasan vs Koperasi)
          const isTransferYayasan = 
            kategori.includes('transfer ke yayasan') ||
            kategori.includes('transfer laba/rugi');
          
          if (!isTransferYayasan) {
            if (isFromYayasan) {
              totalPengeluaranYayasan += jumlah;
            } else {
              totalPengeluaranKoperasi += jumlah;
            }
          }
        }
      });

      // Create category data for Pemasukan
      const totalPemasukan = totalPemasukanYayasan + totalPemasukanKoperasi;
      const categoryDataPemasukan = [
        {
          name: 'Dari Yayasan',
          value: totalPemasukan > 0 ? Math.round((totalPemasukanYayasan / totalPemasukan) * 100) : 0,
          color: '#10b981',
          amount: totalPemasukanYayasan
        },
        {
          name: 'Dari Koperasi',
          value: totalPemasukan > 0 ? Math.round((totalPemasukanKoperasi / totalPemasukan) * 100) : 0,
          color: '#3b82f6',
          amount: totalPemasukanKoperasi
        }
      ].filter(item => item.value > 0 || item.amount > 0);

      // Create category data for Pengeluaran - use actual categories
      const totalPengeluaran = Object.values(pengeluaranByCategory).reduce((sum, val) => sum + val, 0);
      const colors = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316'];
      
      const categoryDataPengeluaran = Object.entries(pengeluaranByCategory)
        .map(([categoryName, amount], index) => ({
          name: categoryName,
          value: totalPengeluaran > 0 ? Math.round((amount / totalPengeluaran) * 100) : 0,
          color: colors[index % colors.length],
          amount: amount
        }))
        .sort((a, b) => b.amount - a.amount)
        .filter(item => item.amount > 0);

      setMonthlyData(monthlyData);
      setCategoryDataPemasukan(categoryDataPemasukan);
      setCategoryDataPengeluaran(categoryDataPengeluaran);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal memuat data chart';
      toast.error(errorMessage);
    }
  }, [recentTransactions, selectedAccountFilter]);

  // Load chart data for specific date range
  const loadChartDataForDateRange = async (
    accountId?: string,
    startDateParam?: Date,
    endDateParam?: Date
  ) => {
    try {
      const koperasiAccountIds = akunKas
        .filter(akun => akun.managed_by === 'koperasi' || akun.nama?.toLowerCase().includes('koperasi'))
        .map(akun => akun.id);

      if (koperasiAccountIds.length === 0) {
        return { monthlyData: [], categoryDataPemasukan: [], categoryDataPengeluaran: [] };
      }

      // Use provided date range or default to January of current year
      const now = new Date();
      const defaultStart = new Date(now.getFullYear(), 0, 1); // January 1st
      let startDate = startDateParam || defaultStart;
      let endDate = endDateParam || now;

      // Normalize dates to start of month for startDate and end of month for endDate
      const startYear = startDate.getFullYear();
      const startMonth = startDate.getMonth();
      const endYear = endDate.getFullYear();
      const endMonth = endDate.getMonth();
      
      // Ensure start date is first day of the month
      startDate = new Date(startYear, startMonth, 1);
      
      // Ensure end date is last day of the month
      endDate = new Date(endYear, endMonth + 1, 0);

      // Fetch transactions for the date range from both keuangan_koperasi and keuangan
      let queryKoperasi = supabase
        .from('keuangan_koperasi')
        .select('tanggal, jenis_transaksi, jumlah, kategori, akun_kas_id, status')
        .in('akun_kas_id', koperasiAccountIds)
        .gte('tanggal', startDate.toISOString().split('T')[0])
        .lte('tanggal', endDate.toISOString().split('T')[0])
        .eq('status', 'posted');

      let queryKeuangan = supabase
        .from('keuangan')
        .select('tanggal, jenis_transaksi, jumlah, kategori, akun_kas_id, status')
        .eq('source_module', 'koperasi')
        .in('akun_kas_id', koperasiAccountIds)
        .gte('tanggal', startDate.toISOString().split('T')[0])
        .lte('tanggal', endDate.toISOString().split('T')[0])
        .eq('status', 'posted');

      if (accountId) {
        queryKoperasi = queryKoperasi.eq('akun_kas_id', accountId);
        queryKeuangan = queryKeuangan.eq('akun_kas_id', accountId);
      }

      // Fetch both queries in parallel
      const [resultKoperasi, resultKeuangan] = await Promise.all([
        queryKoperasi,
        queryKeuangan
      ]);

      if (resultKoperasi.error) throw resultKoperasi.error;
      if (resultKeuangan.error) throw resultKeuangan.error;

      // Combine and deduplicate
      const transactionsKoperasi = resultKoperasi.data || [];
      const transactionsKeuangan = resultKeuangan.data || [];
      const transactionMap = new Map();
      
      transactionsKoperasi.forEach((tx: any) => {
        transactionMap.set(tx.id, tx);
      });
      
      transactionsKeuangan.forEach((tx: any) => {
        transactionMap.set(tx.id, tx);
      });
      
      const transactions = Array.from(transactionMap.values());

      // Process monthly data
      const monthlyStats: { [key: string]: { pemasukan: number; pengeluaran: number } } = {};
      
      // Get all months in the range - ensure chronological order
      const currentMonth = new Date(startDate);
      currentMonth.setDate(1); // Start from first day of month
      const endMonthDate = new Date(endDate);
      endMonthDate.setDate(1); // Set to first day to ensure proper comparison
      
      // Initialize all months in range with zero values
      const tempDate = new Date(currentMonth);
      while (tempDate <= endMonthDate) {
        const monthKey = tempDate.toISOString().substring(0, 7);
        monthlyStats[monthKey] = { pemasukan: 0, pengeluaran: 0 };
        // Move to next month
        tempDate.setMonth(tempDate.getMonth() + 1);
      }

      // Process transactions
      (transactions || []).forEach(transaction => {
        const monthKey = transaction.tanggal.substring(0, 7);
        if (monthlyStats[monthKey]) {
          if (transaction.jenis_transaksi === 'Pemasukan') {
            monthlyStats[monthKey].pemasukan += transaction.jumlah || 0;
          } else if (transaction.jenis_transaksi === 'Pengeluaran') {
            monthlyStats[monthKey].pengeluaran += transaction.jumlah || 0;
          }
        }
      });

      // Convert to chart format - sorted chronologically
      // Sort by monthKey (YYYY-MM format) to ensure chronological order
      const sortedEntries = Object.entries(monthlyStats)
        .sort(([a], [b]) => a.localeCompare(b));
      
      // Convert to chart format with proper month labels
      const monthlyData = sortedEntries.map(([monthKey, stats]) => {
        const date = new Date(monthKey + '-01');
        // Format bulan dengan locale Indonesia (Jan, Feb, Mar, dll)
        const monthName = date.toLocaleDateString('id-ID', { month: 'short' });
        const formattedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        
        return {
          month: formattedMonth,
          pemasukan: stats.pemasukan,
          pengeluaran: stats.pengeluaran
        };
      });

      // Process category data with breakdown: Yayasan vs Koperasi
      // For Pemasukan (Income)
      let totalPemasukanYayasan = 0;
      let totalPemasukanKoperasi = 0;
      
      // For Pengeluaran (Expenditure) - group by actual category
      const pengeluaranByCategory: { [key: string]: number } = {};

      (transactions || []).forEach(transaction => {
        const jumlah = transaction.jumlah || 0;
        const kategori = (transaction.kategori || '').toLowerCase();
        const kategoriOriginal = transaction.kategori || 'Lainnya';
        const referensi = transaction.referensi || '';
        
        // Determine if transaction is from yayasan or koperasi
        // Yayasan: transactions related to yayasan items, jasa pengelolaan, bagi hasil yayasan
        // Koperasi: transactions from koperasi sales, setor cash, etc.
        const isFromYayasan = 
          kategori.includes('jasa pengelolaan') ||
          kategori.includes('bagi hasil yayasan') ||
          kategori.includes('penjualan inventaris yayasan') ||
          referensi.includes('transaksi_inventaris') ||
          referensi.includes('inventory_sale');
        
        if (transaction.jenis_transaksi === 'Pemasukan') {
          if (isFromYayasan) {
            totalPemasukanYayasan += jumlah;
          } else {
            totalPemasukanKoperasi += jumlah;
          }
        } else if (transaction.jenis_transaksi === 'Pengeluaran') {
          // Group pengeluaran by actual category
          // Normalize category names for better grouping
          let categoryKey = kategoriOriginal;
          
          // Normalize common category names
          if (kategori.includes('transfer ke yayasan') || kategori.includes('transfer laba/rugi')) {
            categoryKey = 'Transfer ke Yayasan';
          } else if (kategori.includes('operasional') || kategori.includes('beban operasional')) {
            categoryKey = 'Operasional';
          } else if (kategori.includes('beban') && !kategori.includes('transfer')) {
            categoryKey = 'Beban';
          } else if (kategori.includes('biaya')) {
            categoryKey = 'Biaya';
          } else if (kategori.includes('konsumsi')) {
            categoryKey = 'Konsumsi';
          } else if (kategori.includes('utilitas')) {
            categoryKey = 'Utilitas';
          } else {
            // Use original category name, capitalize first letter
            categoryKey = kategoriOriginal.charAt(0).toUpperCase() + kategoriOriginal.slice(1);
          }
          
          pengeluaranByCategory[categoryKey] = (pengeluaranByCategory[categoryKey] || 0) + jumlah;
        }
      });

      // Create category data for Pemasukan (Income)
      const totalPemasukan = totalPemasukanYayasan + totalPemasukanKoperasi;
      const categoryDataPemasukan = [
        {
          name: 'Dari Yayasan',
          value: totalPemasukan > 0 ? Math.round((totalPemasukanYayasan / totalPemasukan) * 100) : 0,
          color: '#10b981', // Green for yayasan
          amount: totalPemasukanYayasan
        },
        {
          name: 'Dari Koperasi',
          value: totalPemasukan > 0 ? Math.round((totalPemasukanKoperasi / totalPemasukan) * 100) : 0,
          color: '#3b82f6', // Blue for koperasi
          amount: totalPemasukanKoperasi
        }
      ].filter(item => item.value > 0);

      // Create category data for Pengeluaran (Expenditure) - use actual categories
      const totalPengeluaran = Object.values(pengeluaranByCategory).reduce((sum, val) => sum + val, 0);
      const colors = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316'];
      
      const categoryDataPengeluaran = Object.entries(pengeluaranByCategory)
        .map(([categoryName, amount], index) => ({
          name: categoryName,
          value: totalPengeluaran > 0 ? Math.round((amount / totalPengeluaran) * 100) : 0,
          color: colors[index % colors.length],
          amount: amount
        }))
        .sort((a, b) => b.amount - a.amount)
        .filter(item => item.amount > 0);

      return { monthlyData, categoryDataPemasukan, categoryDataPengeluaran };
    } catch (error) {
      // Silent fail for chart data - return empty arrays
      // Log only in development
      if (process.env.NODE_ENV === 'development') {
         
        console.warn('Error loading chart data for date range:', error);
      }
      return { monthlyData: [], categoryDataPemasukan: [], categoryDataPengeluaran: [] };
    }
  };

  // Helper function untuk mendapatkan filtered transactions yang sama dengan tabel riwayat
  // Fungsi ini digunakan oleh summary cards agar konsisten dengan filter yang diterapkan
  const getFilteredTransactionsForSummary = async () => {
    try {
      const koperasiAccountIds = akunKas
        .filter(akun => akun.managed_by === 'koperasi' || akun.nama?.toLowerCase().includes('koperasi'))
        .map(akun => akun.id);

      if (koperasiAccountIds.length === 0) return [];

      const { startDate: filterStartDate, endDate: filterEndDate } = getDateRange();
      
      // Query dari kedua tabel (sama seperti di loadData)
      let queryKoperasi = supabase
        .from('keuangan_koperasi')
        .select('*')
        .in('akun_kas_id', koperasiAccountIds);
      
      let queryKeuangan = supabase
        .from('keuangan')
        .select('*')
        .eq('source_module', 'koperasi')
        .in('akun_kas_id', koperasiAccountIds);
      
      // Hanya filter tanggal jika BUKAN 'all'
      // Untuk filter 'all', ambil semua data tanpa batasan tanggal
      if (dateFilter !== 'all') {
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        queryKoperasi = queryKoperasi.gte('tanggal', twelveMonthsAgo.toISOString().split('T')[0]);
        queryKeuangan = queryKeuangan.gte('tanggal', twelveMonthsAgo.toISOString().split('T')[0]);
      }
      
      queryKoperasi = queryKoperasi
        .order('tanggal', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(dateFilter === 'all' ? 5000 : 1000); // Limit lebih tinggi untuk 'all'
      
      queryKeuangan = queryKeuangan
        .order('tanggal', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(dateFilter === 'all' ? 5000 : 1000); // Limit lebih tinggi untuk 'all'
      
      // Apply account filter if selected (sama dengan tabel riwayat)
      if (selectedAccountFilter) {
        queryKoperasi = queryKoperasi.eq('akun_kas_id', selectedAccountFilter);
        queryKeuangan = queryKeuangan.eq('akun_kas_id', selectedAccountFilter);
      }

      const [resultKoperasi, resultKeuangan] = await Promise.all([
        queryKoperasi,
        queryKeuangan
      ]);

      if (resultKoperasi.error) throw resultKoperasi.error;
      if (resultKeuangan.error) throw resultKeuangan.error;

      // Combine and deduplicate (prioritaskan keuangan_koperasi)
      const transactionsKoperasi = resultKoperasi.data || [];
      const transactionsKeuangan = resultKeuangan.data || [];
      const transactionMap = new Map();
      
      transactionsKoperasi.forEach((tx: any) => {
        transactionMap.set(tx.id, tx);
      });
      
      transactionsKeuangan.forEach((tx: any) => {
        if (!transactionMap.has(tx.id)) {
          transactionMap.set(tx.id, tx);
        }
      });

      const allTransactions = Array.from(transactionMap.values());

      // Apply date filter (sama dengan tabel riwayat)
      // IMPORTANT: Untuk filter 'all', return semua transaksi tanpa filter tanggal
      const filteredByDate = dateFilter === 'all' 
        ? allTransactions // Return all transactions for 'all' filter
        : allTransactions.filter(tx => {
            const txDate = new Date(tx.tanggal);
            return txDate >= filterStartDate && txDate <= filterEndDate;
          });

      // Get processed months for filtering (sama seperti di loadData)
      const { data: bagiHasilLogs } = await supabase
        .from('koperasi_bagi_hasil_log')
        .select('bulan, tahun, status')
        .eq('status', 'processed');
      
      const processedMonths = new Set<string>();
      (bagiHasilLogs || []).forEach((log: any) => {
        if (log.bulan && log.tahun) {
          processedMonths.add(`${log.tahun}-${String(log.bulan).padStart(2, '0')}`);
        }
      });
      
      const isDateProcessed = (date: string): boolean => {
        const txDate = new Date(date);
        const txYear = txDate.getFullYear();
        const txMonth = String(txDate.getMonth() + 1).padStart(2, '0');
        const monthKey = `${txYear}-${txMonth}`;
        return processedMonths.has(monthKey);
      };
      
      // Get yayasan penjualan IDs (sama seperti di loadData)
      const kopPenjualanIds = filteredByDate
        .filter(tx => tx.source_module === 'kop_penjualan' && tx.source_id)
        .map(tx => tx.source_id);
      
      const yayasanPenjualanIds = new Set<string>();
      if (kopPenjualanIds.length > 0) {
        const { data: kopPenjualanDetails } = await supabase
          .from('kop_penjualan_detail')
          .select(`
            penjualan_id,
            kop_barang!inner(owner_type)
          `)
          .in('penjualan_id', kopPenjualanIds)
          .eq('kop_barang.owner_type', 'yayasan');
        
        (kopPenjualanDetails || []).forEach((detail: any) => {
          yayasanPenjualanIds.add(detail.penjualan_id);
        });
      }
      
      // Apply same filters as operational transactions in loadData
      const filteredTransactions = filteredByDate.filter(tx => {
        // Filter out liabilities
        const isLiability = tx.kategori === 'Hutang ke Yayasan' ||
                           tx.kategori === 'Kewajiban' ||
                           tx.referensi?.includes(':liability') ||
                           tx.deskripsi?.toLowerCase().includes('kewajiban');
        if (isLiability) return false;
        
        // Filter out inventory sales
        const isInventorySale = tx.kategori === 'Penjualan Inventaris' ||
                              tx.kategori === 'Penjualan Inventaris Yayasan' ||
                              tx.referensi?.startsWith('transaksi_inventaris:') ||
                              tx.referensi?.startsWith('inventory_sale:');
        if (isInventorySale) return false;
        
        // Filter out unprocessed yayasan sales
        if (tx.jenis_transaksi === 'Pemasukan' && 
            tx.kategori === 'Penjualan' &&
            tx.source_module === 'kop_penjualan' &&
            tx.source_id &&
            yayasanPenjualanIds.has(tx.source_id)) {
          if (!isDateProcessed(tx.tanggal)) {
            return false;
          }
        }
        
        // Filter out unprocessed Jasa Pengelolaan
        if (tx.kategori === 'Jasa Pengelolaan' || 
            tx.kategori === 'Jasa Pengelolaan Inventaris Yayasan') {
          if (!isDateProcessed(tx.tanggal)) {
            return false;
          }
        }
        
        return true;
      });
      
      return filteredTransactions;
    } catch (error) {
      console.error('Error getting filtered transactions for summary:', error);
      return [];
    }
  };

  const recalculateStatistics = async (transactions?: any[]) => {
    try {
      // Gunakan fungsi helper untuk mendapatkan filtered transactions yang sama dengan tabel riwayat
      const filteredTransactions = await getFilteredTransactionsForSummary();
      
      if (filteredTransactions.length === 0 && !transactions) {
        setStatistics({
          pemasukan_bulan_ini: 0,
          pengeluaran_bulan_ini: 0,
          transaksi_bulan_ini: 0,
          pemasukan_trend: 0,
          pengeluaran_trend: 0,
          laba_bersih: 0,
          laba_bersih_trend: 0
        });
        return;
      }

      // Gunakan transactions yang diberikan jika ada, jika tidak gunakan filteredTransactions
      const transactionsToUse = transactions || filteredTransactions;
      
      // Pemasukan: INCLUDE semua pemasukan termasuk setor cash dari keuangan
      const pemasukan = transactionsToUse
        .filter(tx => tx.jenis_transaksi === 'Pemasukan')
        .reduce((sum, tx) => {
          const jumlah = parseFloat(tx.jumlah || 0);
          return sum + jumlah;
        }, 0);
      
      // Pengeluaran: EXCLUDE "Hutang ke Yayasan" dan liability entries
      // karena itu adalah kewajiban, bukan pengeluaran operasional
      const pengeluaranTransactions = transactionsToUse.filter(tx => 
          tx.jenis_transaksi === 'Pengeluaran' &&
          tx.kategori !== 'Hutang ke Yayasan' &&
          !tx.referensi?.includes(':liability')
      );
      
      const pengeluaran = pengeluaranTransactions
        .reduce((sum, tx) => sum + parseFloat(tx.jumlah || 0), 0);
  
      const labaBersih = pemasukan - pengeluaran;
      
      // Calculate trend (compare with previous period of same length)
      // Untuk filter 'all', tidak ada trend comparison (karena tidak ada periode sebelumnya yang jelas)
      let pemasukanTrend = 0;
      let pengeluaranTrend = 0;
      let labaBersihTrend = 0;
      
      if (dateFilter !== 'all') {
        const { startDate: filterStartDate, endDate: filterEndDate } = getDateRange();
        const periodLength = Math.ceil((filterEndDate.getTime() - filterStartDate.getTime()) / (1000 * 60 * 60 * 24));
        const prevPeriodStart = new Date(filterStartDate);
        prevPeriodStart.setDate(prevPeriodStart.getDate() - periodLength - 1);
        const prevPeriodEnd = new Date(filterStartDate);
        prevPeriodEnd.setDate(prevPeriodEnd.getDate() - 1);
        
        const koperasiAccountIds = akunKas
          .filter(akun => akun.managed_by === 'koperasi' || akun.nama?.toLowerCase().includes('koperasi'))
          .map(akun => akun.id);

        // Get previous period transactions from both keuangan_koperasi and keuangan
        let prevPeriodQueryKoperasi = supabase
          .from('keuangan_koperasi')
          .select('*')
          .in('akun_kas_id', koperasiAccountIds)
          .gte('tanggal', prevPeriodStart.toISOString().split('T')[0])
          .lte('tanggal', prevPeriodEnd.toISOString().split('T')[0])
          .eq('status', 'posted');
        
        let prevPeriodQueryKeuangan = supabase
          .from('keuangan')
          .select('*')
          .eq('source_module', 'koperasi')
          .in('akun_kas_id', koperasiAccountIds)
          .gte('tanggal', prevPeriodStart.toISOString().split('T')[0])
          .lte('tanggal', prevPeriodEnd.toISOString().split('T')[0])
          .eq('status', 'posted');
        
        if (selectedAccountFilter) {
          prevPeriodQueryKoperasi = prevPeriodQueryKoperasi.eq('akun_kas_id', selectedAccountFilter);
          prevPeriodQueryKeuangan = prevPeriodQueryKeuangan.eq('akun_kas_id', selectedAccountFilter);
        }
        
        // Fetch both queries in parallel
        const [resultPrevKoperasi, resultPrevKeuangan] = await Promise.all([
          prevPeriodQueryKoperasi,
          prevPeriodQueryKeuangan
        ]);
        
        // Combine and deduplicate (prioritaskan keuangan_koperasi)
        const prevTransactionsKoperasi = resultPrevKoperasi.data || [];
        const prevTransactionsKeuangan = resultPrevKeuangan.data || [];
        const prevTransactionMap = new Map();
        
        prevTransactionsKoperasi.forEach((tx: any) => {
          prevTransactionMap.set(tx.id, tx);
        });
        
        prevTransactionsKeuangan.forEach((tx: any) => {
          if (!prevTransactionMap.has(tx.id)) {
            prevTransactionMap.set(tx.id, tx);
          }
        });
        
        const prevPeriodTransactions = Array.from(prevTransactionMap.values());
        
        // Apply same filters as current period
        const filteredPrevTransactions = prevPeriodTransactions.filter(tx => {
          // Filter out liabilities
          const isLiability = tx.kategori === 'Hutang ke Yayasan' ||
                             tx.kategori === 'Kewajiban' ||
                             tx.referensi?.includes(':liability') ||
                             tx.deskripsi?.toLowerCase().includes('kewajiban');
          if (isLiability) return false;
          
          // Filter out inventory sales
          const isInventorySale = tx.kategori === 'Penjualan Inventaris' ||
                                tx.kategori === 'Penjualan Inventaris Yayasan' ||
                                tx.referensi?.startsWith('transaksi_inventaris:') ||
                                tx.referensi?.startsWith('inventory_sale:');
          if (isInventorySale) return false;
          
          return true;
        });
        
        const pemasukanPrevPeriod = filteredPrevTransactions
          .filter(tx => tx.jenis_transaksi === 'Pemasukan')
          .reduce((sum, tx) => sum + parseFloat(tx.jumlah || 0), 0);
        
        const pengeluaranPrevPeriod = filteredPrevTransactions
          .filter(tx => 
            tx.jenis_transaksi === 'Pengeluaran' &&
            tx.kategori !== 'Hutang ke Yayasan' &&
            !tx.referensi?.includes(':liability')
          )
          .reduce((sum, tx) => sum + parseFloat(tx.jumlah || 0), 0);
        
        pemasukanTrend = pemasukanPrevPeriod > 0 
          ? ((pemasukan - pemasukanPrevPeriod) / pemasukanPrevPeriod) * 100 
          : 0;
        
        pengeluaranTrend = pengeluaranPrevPeriod > 0 
          ? ((pengeluaran - pengeluaranPrevPeriod) / pengeluaranPrevPeriod) * 100 
          : 0;
        
        const labaBersihPrevPeriod = pemasukanPrevPeriod - pengeluaranPrevPeriod;
        labaBersihTrend = labaBersihPrevPeriod !== 0 
          ? ((labaBersih - labaBersihPrevPeriod) / Math.abs(labaBersihPrevPeriod)) * 100 
          : 0;
      }
      
      setStatistics({
        pemasukan_bulan_ini: pemasukan,
        pengeluaran_bulan_ini: pengeluaran,
        transaksi_bulan_ini: filteredTransactions.length,
        pemasukan_trend: pemasukanTrend,
        pengeluaran_trend: pengeluaranTrend,
        laba_bersih: labaBersih,
        laba_bersih_trend: labaBersihTrend
      });
    } catch (error) {
      // Silent fail for statistics recalculation
      // Log only in development
      if (process.env.NODE_ENV === 'development') {
         
        console.warn('Error recalculating statistics:', error);
      }
    }
  };

  // Calculate Koperasi Summary: Saldo Kas, Hak Yayasan, Laba Periode
  // NOTE: Function ini tidak digunakan lagi karena kita menggunakan SimpleKoperasiSummaryCards
  // Tapi tetap dipertahankan untuk kompatibilitas jika ada bagian lain yang masih menggunakannya
  const calculateKoperasiSummary = async () => {
    // Function disabled - tidak digunakan lagi
    return;
    /* DISABLED - Menggunakan calculatePeriodSummary saja
    try {
      const koperasiAccountIds = akunKas
        .filter(akun => akun.managed_by === 'koperasi' || akun.nama?.toLowerCase().includes('koperasi'))
        .map(akun => akun.id);

      if (koperasiAccountIds.length === 0) {
        return;
      }

      // 1. Saldo Kas Koperasi - berdasarkan mode yang dipilih
      let saldoKas = 0;
      
      const accountsToUse = selectedAccountFilter
        ? akunKas.filter(akun => akun.id === selectedAccountFilter && akun.status === 'aktif')
        : akunKas.filter(akun => akun.status === 'aktif');
      
      const { startDate: filterStartDate, endDate: filterEndDate } = getDateRange();
      
      if (false) { // saldoKasMode === 'total') {
        // Mode 'total': Saldo aktual dari akun_kas.saldo_saat_ini (seluruh waktu)
        saldoKas = accountsToUse.reduce((sum, akun) => sum + (akun.saldo_saat_ini || 0), 0);
        
        // Mode total: hitung setoran yang sudah diserahkan untuk informasi
        const { data: setoranList } = await supabase
          .from('kop_setoran_cash_kasir')
          .select('jumlah_setor')
          .eq('status', 'posted');
        
        const totalSetoran = setoranList?.reduce((sum: number, setoran: any) => 
          sum + parseFloat(setoran.jumlah_setor || 0), 0) || 0;
        
        setTotalSetoranDiserahkan(totalSetoran);
        setSaldoOperasionalKoperasi(saldoKas - totalSetoran);
      } else {
        // Mode 'periode': Dihitung dari saldo awal periode + (Pemasukan - Pengeluaran) dalam periode
        
        // Get saldo awal dari akun
        const saldoAwalAkun = accountsToUse.reduce((sum, akun) => sum + (akun.saldo_awal || 0), 0);
        
        // Query semua transaksi sebelum periode untuk menghitung saldo awal periode
        const accountIdsForPeriod = accountsToUse.map(akun => akun.id);
        
        let saldoAwalQueryKoperasi = supabase
          .from('keuangan_koperasi')
          .select('jenis_transaksi, jumlah')
          .in('akun_kas_id', accountIdsForPeriod)
          .lt('tanggal', filterStartDate.toISOString().split('T')[0])
          .eq('status', 'posted');
        
        let saldoAwalQueryKeuangan = supabase
          .from('keuangan')
          .select('jenis_transaksi, jumlah')
          .eq('source_module', 'koperasi')
          .in('akun_kas_id', accountIdsForPeriod)
          .lt('tanggal', filterStartDate.toISOString().split('T')[0])
          .eq('status', 'posted');
        
        const [resultSaldoAwalKoperasi, resultSaldoAwalKeuangan] = await Promise.all([
          saldoAwalQueryKoperasi,
          saldoAwalQueryKeuangan
        ]);
        
        // Combine dan deduplicate transaksi sebelum periode
        const transactionMapSebelum = new Map();
        (resultSaldoAwalKoperasi.data || []).forEach((tx: any) => {
          transactionMapSebelum.set(tx.id, tx);
        });
        (resultSaldoAwalKeuangan.data || []).forEach((tx: any) => {
          if (!transactionMapSebelum.has(tx.id)) {
            transactionMapSebelum.set(tx.id, tx);
          }
        });
        
        const semuaTransaksiSebelum = Array.from(transactionMapSebelum.values());
        
        // Hitung perubahan saldo dari transaksi sebelum periode
        const perubahanSebelum = semuaTransaksiSebelum.reduce((sum, tx) => {
          if (tx.jenis_transaksi === 'Pemasukan') {
            return sum + parseFloat(tx.jumlah || 0);
          } else {
            // Exclude "Hutang ke Yayasan" dari pengeluaran
            if (tx.kategori !== 'Hutang ke Yayasan' && !tx.referensi?.includes(':liability')) {
              return sum - parseFloat(tx.jumlah || 0);
            }
            return sum;
          }
        }, 0);
        
        // Saldo awal periode = saldo awal akun + perubahan sebelum periode
        const saldoAwalPeriode = saldoAwalAkun + perubahanSebelum;
        
        // Get filtered transactions untuk menghitung perubahan dalam periode
        const filteredTransactions = await getFilteredTransactionsForSummary();
        
        // Hitung total pemasukan dan pengeluaran dalam periode
        const totalPemasukan = filteredTransactions
          .filter(tx => tx.jenis_transaksi === 'Pemasukan')
          .reduce((sum, tx) => sum + parseFloat(tx.jumlah || 0), 0);
        
        const totalPengeluaran = filteredTransactions
          .filter(tx => 
            tx.jenis_transaksi === 'Pengeluaran' &&
            tx.kategori !== 'Hutang ke Yayasan' &&
            !tx.referensi?.includes(':liability')
          )
          .reduce((sum, tx) => sum + parseFloat(tx.jumlah || 0), 0);
        
        // Hitung total setoran yang sudah diserahkan dalam periode yang overlap dengan periode penjualan
        // Setoran dihitung jika periode_setoran overlap dengan periode filter
        const { data: setoranList } = await supabase
          .from('kop_setoran_cash_kasir')
          .select('jumlah_setor, periode_start, periode_end')
          .eq('status', 'posted')
          .not('periode_start', 'is', null)
          .not('periode_end', 'is', null);
        
        let totalSetoran = 0;
        if (setoranList && setoranList.length > 0) {
          totalSetoran = setoranList
            .filter((setoran: any) => {
              // Check if periode setoran overlap dengan periode filter
              const setoranStart = new Date(setoran.periode_start);
              const setoranEnd = new Date(setoran.periode_end);
              
              // Overlap jika: setoranStart <= filterEndDate && setoranEnd >= filterStartDate
              return setoranStart <= filterEndDate && setoranEnd >= filterStartDate;
            })
            .reduce((sum: number, setoran: any) => sum + parseFloat(setoran.jumlah_setor || 0), 0);
        }
        
        setTotalSetoranDiserahkan(totalSetoran);
        
        // Saldo operasional = saldo awal periode + pemasukan - pengeluaran - setoran yang sudah diserahkan
        const saldoOperasional = saldoAwalPeriode + totalPemasukan - totalPengeluaran - totalSetoran;
        setSaldoOperasionalKoperasi(saldoOperasional);
        
        // Saldo akhir periode = saldo awal periode + perubahan dalam periode (termasuk setoran)
        // Setoran mengurangi saldo karena sudah diserahkan ke yayasan
        saldoKas = saldoAwalPeriode + totalPemasukan - totalPengeluaran - totalSetoran;
      }
      
      setSaldoKasKoperasi(saldoKas);

      // 2. Laba Periode = Penjualan - HPP - Beban Operasional
      const { startDate, endDate } = getDateRange();
      
      let labaQueryKoperasi = supabase
        .from('keuangan_koperasi')
        .select('jenis_transaksi, jumlah, kategori, hpp')
        .in('akun_kas_id', koperasiAccountIds)
        .eq('status', 'posted');
      
      let labaQueryKeuangan = supabase
        .from('keuangan')
        .select('jenis_transaksi, jumlah, kategori')
        .eq('source_module', 'koperasi')
        .in('akun_kas_id', koperasiAccountIds)
        .eq('status', 'posted');
      
      if (dateFilter !== 'all') {
        labaQueryKoperasi = labaQueryKoperasi
          .gte('tanggal', startDate.toISOString().split('T')[0])
          .lte('tanggal', endDate.toISOString().split('T')[0]);
        labaQueryKeuangan = labaQueryKeuangan
          .gte('tanggal', startDate.toISOString().split('T')[0])
          .lte('tanggal', endDate.toISOString().split('T')[0]);
      }
      
      // Fetch both queries in parallel
      const [resultKoperasi, resultKeuangan] = await Promise.all([
        labaQueryKoperasi,
        labaQueryKeuangan
      ]);
      
      // Combine and deduplicate
      const transactionsKoperasi = resultKoperasi.data || [];
      const transactionsKeuangan = resultKeuangan.data || [];
      const transactionMap = new Map();
      
      transactionsKoperasi.forEach((tx: any) => {
        transactionMap.set(tx.id, tx);
      });
      
      transactionsKeuangan.forEach((tx: any) => {
        transactionMap.set(tx.id, tx);
      });
      
      const labaTransactions = Array.from(transactionMap.values());
      
      // Penjualan (semua pemasukan dengan kategori yang terkait penjualan)
      const penjualan = (labaTransactions || [])
        .filter(tx => 
          tx.jenis_transaksi === 'Pemasukan' && 
          (tx.kategori === 'Penjualan' || 
           tx.kategori === 'Penjualan Koperasi' || 
           tx.kategori === 'Penjualan Inventaris' ||
           tx.kategori?.toLowerCase().includes('penjualan'))
        )
        .reduce((sum, tx) => sum + parseFloat(tx.jumlah || 0), 0);
      
      // HPP: dari field hpp pada transaksi pemasukan (jika ada) atau dari pengeluaran kategori Pembelian
      // Note: hpp hanya ada di keuangan_koperasi, jadi hanya gunakan data dari keuangan_koperasi untuk HPP
      const hppFromField = (transactionsKoperasi || [])
        .filter(tx => tx.jenis_transaksi === 'Pemasukan' && tx.hpp !== undefined && tx.hpp !== null)
        .reduce((sum, tx) => sum + parseFloat(tx.hpp || 0), 0);
      
      const hppFromPembelian = (labaTransactions || [])
        .filter(tx => 
          tx.jenis_transaksi === 'Pengeluaran' && 
          (tx.kategori === 'Pembelian Barang' || tx.kategori?.toLowerCase().includes('pembelian'))
        )
        .reduce((sum, tx) => sum + parseFloat(tx.jumlah || 0), 0);
      
      const totalHPP = hppFromField + hppFromPembelian;
      
      // Beban Operasional (pengeluaran operasional, bukan bagi hasil atau pembelian)
      const bebanOperasional = (labaTransactions || [])
        .filter(tx => 
          tx.jenis_transaksi === 'Pengeluaran' &&
          tx.kategori === 'Biaya Operasional' &&
          tx.kategori !== 'Bagi Hasil Yayasan'
        )
        .reduce((sum, tx) => sum + parseFloat(tx.jumlah || 0), 0);
      
      const laba = penjualan - totalHPP - bebanOperasional;
      setLabaPeriode(laba);
    } catch (error) {
      // Silent fail for summary calculation
      // Log only in development
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.warn('Error calculating koperasi summary:', error);
      }
    }
  };

  // Load Hak Yayasan di Kas (dari koperasi_bagi_hasil_log)
  const loadHakYayasanDiKas = async () => {
    try {
      // Get all data first (same approach as KeuanganDashboard and KelolaHPPDanBagiHasilPage)
      const { data, error } = await supabase
        .from('koperasi_bagi_hasil_log')
        .select('*');

      if (error) {
        // Silent fail - set to 0
        setHakYayasanDiKas(0);
        return;
      }

      if (!data || data.length === 0) {
        setHakYayasanDiKas(0);
        return;
      }

      // Transform and sum (same logic as KelolaHPPDanBagiHasilPage line 848 and KeuanganDashboard line 165)
      const total = (data || []).reduce((sum, item: any) => {
        // Use the same field name as in KelolaHPPDanBagiHasilPage
        const bagianYayasan = Number(item.bagi_hasil_yayasan || 0);
        // Belum disetor jika: status bukan 'paid' DAN tanggal_bayar null
        const isBelumDisetor = item.status !== 'paid' && !item.tanggal_bayar;
        if (isBelumDisetor && bagianYayasan > 0) {
          return sum + bagianYayasan;
        }
        return sum;
      }, 0);

      // setHakYayasanDiKas(total); // DISABLED
    } catch (error) {
      // Silent fail - set to 0
      // setHakYayasanDiKas(0); // DISABLED
    }
    */ // END DISABLED
  };

  // Memoize loadData dengan useCallback untuk mencegah re-creation setiap render
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get accounts - FILTER UNTUK KOPERASI SAJA
      // Cari akun kas yang managed_by = 'koperasi' atau nama mengandung 'koperasi'
      const accounts = await AkunKasService.getAll();
      const koperasiAccounts = accounts.filter(akun => 
        akun.managed_by === 'koperasi' || 
        akun.nama?.toLowerCase().includes('koperasi')
      );
      
      setAkunKas(koperasiAccounts);
      
      // Calculate total saldo from ACTIVE koperasi accounts only
      const totalSaldoAllAccounts = koperasiAccounts
        .filter(akun => akun.status === 'aktif')
        .reduce((sum, akun) => sum + (akun.saldo_saat_ini || 0), 0);
      
      // Update saldo kas koperasi - DISABLED karena tidak digunakan lagi
      // setSaldoKasKoperasi(totalSaldoAllAccounts);
      
      // Get transactions from keuangan_koperasi table (NOT keuangan)
      // Filter untuk akun kas koperasi saja
      const koperasiAccountIds = koperasiAccounts.map(akun => akun.id);
      
      if (koperasiAccountIds.length === 0) {
        setRecentTransactions([]);
        setStatistics({
          pemasukan_bulan_ini: 0,
          pengeluaran_bulan_ini: 0,
          transaksi_bulan_ini: 0,
          pemasukan_trend: 0,
          pengeluaran_trend: 0,
          laba_bersih: 0,
          laba_bersih_trend: 0
        });
        setLoading(false);
        return;
      }

      // Fetch data based on filter
      // For 'all' filter, fetch all data (no date limit)
      // For other filters, fetch last 12 months to allow client-side filtering
      const now = new Date();
      let queryKoperasi = supabase
        .from('keuangan_koperasi')
        .select(`
          *,
          akun_kas:akun_kas_id(nama, managed_by)
        `)
        .in('akun_kas_id', koperasiAccountIds);
      
      let queryKeuangan = supabase
        .from('keuangan')
        .select(`
          *,
          akun_kas:akun_kas_id(nama, managed_by)
        `)
        .eq('source_module', 'koperasi')
        .in('akun_kas_id', koperasiAccountIds);
      
      // Only apply date limit if NOT 'all' filter (to improve performance)
      // For 'all', we'll fetch all data but may need to increase limit
      if (dateFilter !== 'all') {
        const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);
        queryKoperasi = queryKoperasi.gte('tanggal', twelveMonthsAgo.toISOString().split('T')[0]);
        queryKeuangan = queryKeuangan.gte('tanggal', twelveMonthsAgo.toISOString().split('T')[0]);
      }
      
      queryKoperasi = queryKoperasi
        .order('tanggal', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(dateFilter === 'all' ? 5000 : 1000); // Higher limit for 'all' filter
      
      queryKeuangan = queryKeuangan
        .order('tanggal', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(dateFilter === 'all' ? 5000 : 1000); // Higher limit for 'all' filter
      
      // Apply account filter if selected
      if (selectedAccountFilter) {
        queryKoperasi = queryKoperasi.eq('akun_kas_id', selectedAccountFilter);
        queryKeuangan = queryKeuangan.eq('akun_kas_id', selectedAccountFilter);
      }
      
      // Apply account filter if selected
      if (selectedAccountFilter) {
        queryKeuangan = queryKeuangan.eq('akun_kas_id', selectedAccountFilter);
      }

      // Fetch both queries in parallel
      const [resultKoperasi, resultKeuangan] = await Promise.all([
        queryKoperasi,
        queryKeuangan
      ]);

      if (resultKoperasi.error) throw resultKoperasi.error;
      if (resultKeuangan.error) throw resultKeuangan.error;

      // Combine and deduplicate transactions (in case there are duplicates)
      // PRIORITAS: keuangan_koperasi untuk data koperasi mandiri
      // keuangan dengan source_module='koperasi' hanya untuk transaksi baru (seperti setor cash)
      const transactionsKoperasi = resultKoperasi.data || [];
      const transactionsKeuangan = resultKeuangan.data || [];
      
      // Create a map to deduplicate by ID
      const transactionMap = new Map();
      
      // Prioritaskan keuangan_koperasi - masukkan dulu
      transactionsKoperasi.forEach((tx: any) => {
        transactionMap.set(tx.id, tx);
      });
      
      // Tambahkan dari keuangan hanya jika ID belum ada (untuk transaksi baru seperti setor cash)
      transactionsKeuangan.forEach((tx: any) => {
        if (!transactionMap.has(tx.id)) {
          transactionMap.set(tx.id, tx);
        }
      });
      
      // Convert map back to array and sort
      const transactions = Array.from(transactionMap.values()).sort((a: any, b: any) => {
        const dateA = new Date(a.tanggal).getTime();
        const dateB = new Date(b.tanggal).getTime();
        if (dateA !== dateB) return dateB - dateA;
        const createdA = new Date(a.created_at || 0).getTime();
        const createdB = new Date(b.created_at || 0).getTime();
        return createdB - createdA;
      });
      
      // Filter transactions - hanya yang dari akun koperasi
      // Note: transactions sudah difilter untuk akun koperasi di query, jadi langsung gunakan
      let allTransactions = transactions.filter(tx => {
        const akunKas = Array.isArray(tx.akun_kas) ? tx.akun_kas[0] : tx.akun_kas;
        return koperasiAccountIds.includes(tx.akun_kas_id) &&
               (akunKas?.managed_by === 'koperasi' || akunKas?.nama?.toLowerCase().includes('koperasi'));
      });

      // Apply date filter to get filtered transactions for display
      // IMPORTANT: Gunakan filter yang sama dengan summary cards untuk konsistensi
      const { startDate, endDate } = getDateRange();
      const filteredTransactions = allTransactions.filter(tx => {
        const txDate = new Date(tx.tanggal);
        // For 'all' filter, include all transactions
        if (dateFilter === 'all') {
          return true;
        }
        return txDate >= startDate && txDate <= endDate;
      });
      
      // Extract inventory transaction IDs from referensi and fetch catatan
      const inventoryTransactionIds = allTransactions
        .filter(t => t.referensi && typeof t.referensi === 'string' && t.referensi.startsWith('inventory_sale:'))
        .map(t => {
          const match = t.referensi.match(/inventory_sale:([^:]+)/);
          return match ? match[1] : null;
        })
        .filter(id => id !== null);

      if (inventoryTransactionIds.length > 0) {
        const { data: inventoryTransactions } = await supabase
          .from('transaksi_inventaris')
          .select('id, catatan')
          .in('id', inventoryTransactionIds);

        const inventoryMap = new Map(
          (inventoryTransactions || []).map(t => [t.id, t.catatan])
        );

        allTransactions = allTransactions.map(t => {
          if (t.referensi?.startsWith('inventory_sale:')) {
            const match = t.referensi.match(/inventory_sale:([^:]+)/);
            const transaksiId = match ? match[1] : null;
            if (transaksiId && inventoryMap.has(transaksiId)) {
              return { ...t, catatan: inventoryMap.get(transaksiId) };
            }
          }
          return t;
        });
      }
      
      // Filter out transactions that should not appear in operational transaction list:
      // 1. "Hutang ke Yayasan" - kewajiban/liability, bukan beban operasional
      // 2. "Penjualan Inventaris" - seharusnya diproses melalui Kalkulator HPP & Bagi Hasil
      // 3. "Pemasukan" dari penjualan item yayasan yang belum diproses di kalkulator bagi hasil
      // 4. "Jasa Pengelolaan" yang belum diproses di kalkulator bagi hasil
      
      // Get all processed sales from koperasi_bagi_hasil_log
      const { data: bagiHasilLogs } = await supabase
        .from('koperasi_bagi_hasil_log')
        .select('bulan, tahun, status')
        .eq('status', 'processed');
      
      // Create a set of processed month-year combinations
      const processedMonths = new Set<string>();
      (bagiHasilLogs || []).forEach((log: any) => {
        if (log.bulan && log.tahun) {
          processedMonths.add(`${log.tahun}-${String(log.bulan).padStart(2, '0')}`);
        }
      });
      
      // Helper function to check if a date is within any processed month
      const isDateProcessed = (date: string): boolean => {
        const txDate = new Date(date);
        const txYear = txDate.getFullYear();
        const txMonth = String(txDate.getMonth() + 1).padStart(2, '0');
        const monthKey = `${txYear}-${txMonth}`;
        return processedMonths.has(monthKey);
      };
      
      // Get all kop_penjualan IDs that contain yayasan items
      const kopPenjualanIds = allTransactions
        .filter(tx => tx.source_module === 'kop_penjualan' && tx.source_id)
        .map(tx => tx.source_id);
      
      const yayasanPenjualanIds = new Set<string>();
      if (kopPenjualanIds.length > 0) {
        const { data: kopPenjualanDetails } = await supabase
          .from('kop_penjualan_detail')
          .select(`
            penjualan_id,
            kop_barang!inner(owner_type)
          `)
          .in('penjualan_id', kopPenjualanIds)
          .eq('kop_barang.owner_type', 'yayasan');
        
        (kopPenjualanDetails || []).forEach((detail: any) => {
          yayasanPenjualanIds.add(detail.penjualan_id);
        });
      }
      
      const operationalTransactions = allTransactions.filter(tx => {
        // Filter out liabilities
        const isLiability = tx.kategori === 'Hutang ke Yayasan' ||
                           tx.kategori === 'Kewajiban' ||
                           tx.referensi?.includes(':liability') ||
                           tx.deskripsi?.toLowerCase().includes('kewajiban');
        if (isLiability) return false;
        
        // Filter out inventory sales (transaksi_inventaris)
        const isInventorySale = tx.kategori === 'Penjualan Inventaris' ||
                              tx.kategori === 'Penjualan Inventaris Yayasan' ||
                              tx.referensi?.startsWith('transaksi_inventaris:') ||
                              tx.referensi?.startsWith('inventory_sale:');
        if (isInventorySale) return false;
        
        // Filter out "Pemasukan" from kop_penjualan with yayasan items that haven't been processed
        if (tx.jenis_transaksi === 'Pemasukan' && 
            tx.kategori === 'Penjualan' &&
            tx.source_module === 'kop_penjualan' &&
            tx.source_id &&
            yayasanPenjualanIds.has(tx.source_id)) {
          // Check if this sale date is within a processed range
          if (!isDateProcessed(tx.tanggal)) {
            return false; // Hide unprocessed yayasan sales
          }
        }
        
        // Filter out "Jasa Pengelolaan" that hasn't been processed
        if (tx.kategori === 'Jasa Pengelolaan' || 
            tx.kategori === 'Jasa Pengelolaan Inventaris Yayasan') {
          // Check if this transaction date is within a processed range
          if (!isDateProcessed(tx.tanggal)) {
            return false; // Hide unprocessed Jasa Pengelolaan
          }
        }
        
        return true;
      });
      
      // Store filtered transactions for RiwayatTransaksi (it will filter based on dateFilter)
      setRecentTransactions(operationalTransactions);
      
      // Load hak yayasan di kas - DISABLED karena tidak digunakan lagi
      // await loadHakYayasanDiKas();
      
      // Calculate statistics will be done in recalculateStatistics function
      // We need to wait for state to update, so we'll call it in a separate effect
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal memuat data keuangan koperasi';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [selectedAccountFilter, dateFilter, selectedMonth, selectedYear]);

  // Load initial data
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reload chart data when transactions or filters change
  useEffect(() => {
    if (recentTransactions.length >= 0 && akunKas.length > 0) {
      loadChartData(selectedAccountFilter);
    }
  }, [recentTransactions, selectedAccountFilter, dateFilter, selectedMonth, selectedYear, akunKas.length, loadChartData]);

  // Recalculate statistics when date filter changes or when data is loaded
  useEffect(() => {
    if (akunKas.length > 0) {
      recalculateStatistics();
      calculatePeriodSummary();
      calculateRealCashBalance();
    }
  }, [dateFilter, selectedMonth, selectedYear, selectedAccountFilter, akunKas.length]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    await loadChartData(selectedAccountFilter);
    setRefreshing(false);
    toast.success('Data berhasil diperbarui');
  };


  const handleFormSuccess = async () => {
    // Reload semua data setelah operasi sukses (transfer, pemasukan, pengeluaran, dll)
    await loadData();
    await loadChartData(selectedAccountFilter);
    // Also trigger statistics recalculation
    // Note: akunKas akan ter-update setelah loadData() selesai
    // useEffect akan otomatis memanggil calculateRealCashBalance dan calculatePeriodSummary
    // ketika akunKas.length berubah, jadi kita tidak perlu memanggilnya secara eksplisit di sini
    // Tapi kita tetap memanggil recalculateStatistics untuk memastikan statistik ter-update
    if (akunKas.length > 0) {
      await recalculateStatistics();
      // Explicitly call calculatePeriodSummary to ensure it's updated after transfer
      await calculatePeriodSummary();
    }
  };

  const handleInputPengeluaran = () => {
    // Pre-select koperasi account if available
    if (akunKas.length > 0 && !selectedAccountId) {
      const defaultAccount = akunKas.find(akun => akun.status === 'aktif') || akunKas[0];
      if (defaultAccount) {
        setSelectedAccountId(defaultAccount.id);
      }
    }
    setShowForm(true);
  };

  const handleSelectAccount = (accountId: string | undefined) => {
    setSelectedAccountId(accountId);
    setSelectedAccountFilter(accountId);
    loadChartData(accountId);
  };

  const handleClearAccountFilter = () => {
    setSelectedAccountFilter(undefined);
    setSelectedAccountId(undefined);
    loadChartData(undefined);
  };

  const handleViewDetail = (transaction: any) => {
    setSelectedTransaction(transaction);
    setShowTransactionDetail(true);
  };

  const handleEditTransaction = (transaction: any) => {
    // Izinkan edit untuk auto-posted jika jenis_transaksi === 'Pemasukan'
    if (transaction.auto_posted && transaction.jenis_transaksi !== 'Pemasukan') {
      const sourceModule = transaction.source_module || 'modul lain';
      toast.error(`Transaksi ini berasal dari ${sourceModule} dan tidak dapat diedit. Edit dari modul sumber terlebih dahulu.`);
      return;
    }
    setSelectedTransaction(transaction);
    setShowTransactionEdit(true);
  };

  const handleEditTanggalDonasi = (transaction: any) => {
    // Hanya untuk transaksi donasi dengan jenis pemasukan
    if (transaction.source_module === 'donasi' && transaction.jenis_transaksi === 'Pemasukan') {
      setSelectedTransactionForEditTanggal(transaction);
      setShowEditTanggalDonasi(true);
    } else {
      toast.error('Fitur ini hanya untuk transaksi pemasukan dari donasi');
    }
  };

  const handleDeleteTransaction = async (transaction: any) => {
    // Izinkan delete untuk auto-posted jika jenis_transaksi === 'Pemasukan'
    if (transaction.auto_posted && transaction.jenis_transaksi !== 'Pemasukan') {
      const sourceModule = transaction.source_module || 'modul lain';
      toast.error(`Transaksi ini berasal dari ${sourceModule} dan tidak dapat dihapus. Hapus dari modul sumber terlebih dahulu.`);
      return;
    }

    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus transaksi "${transaction.deskripsi || transaction.kategori}" senilai ${new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(transaction.jumlah)}?`
    );
    
    if (confirmed) {
      try {
        console.log('Attempting to delete transaction:', {
          id: transaction.id,
          jenis_transaksi: transaction.jenis_transaksi,
          auto_posted: transaction.auto_posted,
          source_module: transaction.source_module
        });

        // Untuk transaksi pemasukan auto_posted, coba direct delete dulu (lebih langsung)
        // Jika direct delete gagal, baru coba RPC
        let deleteSuccess = false;
        
        if (transaction.jenis_transaksi === 'Pemasukan' && transaction.auto_posted) {
          // Coba direct delete terlebih dahulu
          const { error: directDeleteError, data: deleteData } = await supabase
            .from('keuangan')
            .delete()
            .eq('id', transaction.id)
            .select();
          
          if (!directDeleteError) {
            deleteSuccess = true;
            console.log('✅ Direct delete berhasil', { deletedId: transaction.id, akun_kas_id: transaction.akun_kas_id });
            
            // Update saldo akun kas
            if (transaction.akun_kas_id) {
              try {
                const { error: saldoError } = await supabase.rpc('ensure_akun_kas_saldo_correct_for', {
                  p_akun_id: transaction.akun_kas_id
                });
                if (saldoError) {
                  console.warn('Warning: Gagal update saldo setelah delete:', saldoError);
                } else {
                  console.log('✅ Saldo akun kas berhasil di-update');
                }
              } catch (saldoError) {
                console.warn('Warning: Gagal update saldo setelah delete:', saldoError);
              }
            }
          } else {
            console.error('❌ Direct delete gagal:', {
              error: directDeleteError,
              code: directDeleteError.code,
              message: directDeleteError.message,
              details: directDeleteError.details,
              hint: directDeleteError.hint,
              transactionId: transaction.id,
              akun_kas_id: transaction.akun_kas_id,
              source_module: transaction.source_module
            });
            
            // Fallback: Coba dengan RPC jika ada
            try {
              const { error: rpcError } = await supabase.rpc('delete_keuangan_and_recalc', { p_keuangan_id: transaction.id });
              
              if (!rpcError) {
                deleteSuccess = true;
                console.log('✅ RPC delete berhasil (fallback)');
              } else {
                console.error('❌ RPC delete juga gagal:', rpcError);
                // Jika RPC juga gagal, tampilkan error detail
                toast.error(`Gagal menghapus transaksi: ${directDeleteError.message || 'Tidak memiliki izin untuk menghapus transaksi ini'}. Error: ${directDeleteError.code || 'UNKNOWN'}`);
                return;
              }
            } catch (rpcCallError: any) {
              // Jika RPC tidak ada atau error, tampilkan error dari direct delete
              console.error('❌ RPC call error (function mungkin tidak ada):', rpcCallError);
              toast.error(`Gagal menghapus transaksi: ${directDeleteError.message || 'Tidak memiliki izin untuk menghapus transaksi ini'}. Error code: ${directDeleteError.code || 'UNKNOWN'}`);
              return;
            }
          }
        } else {
          // Untuk transaksi non-auto-posted atau pengeluaran, gunakan RPC
          const { error } = await supabase.rpc('delete_keuangan_and_recalc', { p_keuangan_id: transaction.id });
          
          if (error) {
            console.error('❌ RPC delete gagal:', error);
            toast.error(`Gagal menghapus transaksi: ${error.message}`);
            return;
          }
          deleteSuccess = true;
        }
        
        if (deleteSuccess) {
          toast.success('Transaksi berhasil dihapus');
          await loadData();
          await loadChartData(selectedAccountFilter);
        }
      } catch (error: any) {
        console.error('Error deleting transaction:', error);
        toast.error(`Gagal menghapus transaksi: ${error.message || 'Terjadi kesalahan yang tidak diketahui'}`);
        await loadData();
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Memuat data keuangan koperasi...</p>
        </div>
      </div>
    );
  }


  // Calculate totals for display - use real cash balance instead of saldo_saat_ini
  const totals = {
    totalBalance: realCashBalance,
    accountCount: akunKas.filter(akun => akun.status === 'aktif').length
  };

  const currentSelectedAccount = selectedAccountId 
    ? akunKas.find(akun => akun.id === selectedAccountId)
    : null;

  const selectedAccountName = currentSelectedAccount?.nama;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 bg-gradient-to-br from-gray-50/30 via-white to-gray-50/20 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Keuangan Koperasi</h1>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                size="sm"
                onClick={handleInputPengeluaran}
                className="bg-red-600 hover:bg-red-700 text-white shadow-sm whitespace-nowrap text-xs sm:text-sm"
              >
                <TrendingDown className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Pengeluaran</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowFormPemasukan(true)}
                className="border-green-200 hover:bg-green-50 text-green-700 whitespace-nowrap text-xs sm:text-sm"
              >
                <TrendingUp className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Pemasukan</span>
              </Button>
            </div>
            
            <div className="flex items-center gap-2 border-l border-gray-200 pl-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFormPenyesuaianSaldo(true)}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 whitespace-nowrap text-xs sm:text-sm"
              >
                <RefreshCw className="h-4 w-4 sm:mr-2" />
                <span className="hidden md:inline">Penyesuaian</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 flex-shrink-0"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Date Filter Section - Moved to top, Modern & Minimalist */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-gradient-to-r from-gray-50 to-gray-50/50 rounded-xl border border-gray-200/60 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span>Periode</span>
            </div>
            <Select 
              value={dateFilter} 
              onValueChange={(value) => {
                setDateFilter(value);
                if (value === 'bulan-ini') {
                  const now = new Date();
                  setSelectedMonth(now.getMonth() + 1);
                  setSelectedYear(now.getFullYear());
                }
              }}
            >
              <SelectTrigger className="w-[140px] h-9 bg-white border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Waktu</SelectItem>
                <SelectItem value="bulan-ini">Bulan Ini</SelectItem>
              </SelectContent>
            </Select>
            {dateFilter !== 'all' && (
              <MonthYearFilter
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                onMonthChange={setSelectedMonth}
                onYearChange={setSelectedYear}
                size="md"
              />
            )}
          </div>
          <div className="text-sm text-gray-600 font-medium px-2 py-1 bg-white/80 rounded-md border border-gray-200/60">
            {(() => {
              const { startDate, endDate } = getDateRange();
              if (dateFilter === 'all') {
                return 'Semua Data (Tidak Ada Filter Tanggal)';
              }
              return `${format(startDate, 'd MMM yyyy', { locale: localeId })} - ${format(endDate, 'd MMM yyyy', { locale: localeId })}`;
            })()}
          </div>
        </div>
      </div>

      {/* Section 1: Account & Balance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Cards */}
        <div>
          <StackedAccountCards
            accounts={akunKas.filter(akun => akun.status === 'aktif').map(akun => ({
              ...akun,
              // Override saldo_saat_ini dengan real cash balance untuk akun kas koperasi
              saldo_saat_ini: (akun.managed_by === 'koperasi' || akun.nama?.toLowerCase().includes('koperasi'))
                ? realCashBalance
                : akun.saldo_saat_ini
            }))}
            selectedAccountId={selectedAccountId}
            onSelectAccount={handleSelectAccount}
            onAddAccount={() => toast.info('Tambah akun kas melalui modul Keuangan Umum')}
            onEditAccount={() => toast.info('Edit akun kas melalui modul Keuangan Umum')}
            onDeleteAccount={() => toast.info('Hapus akun kas melalui modul Keuangan Umum')}
            onViewTransactions={handleSelectAccount}
            onSetDefaultAccount={() => {}}
          />
            </div>

        {/* Total Balance Display */}
        <div>
          <TotalBalanceDisplay
            totalBalance={totals.totalBalance}
            accountCount={totals.accountCount}
            selectedAccount={currentSelectedAccount}
            onViewAllAccounts={() => handleSelectAccount(undefined)}
            onTransfer={() => {
              setShowTransferDialog(true);
            }}
            onRequest={() => {
              toast.info('Fitur pengajuan dana akan segera tersedia');
            }}
              />
            </div>
                  </div>


      {/* Section 2: Simple Summary Cards */}
      <SimpleKoperasiSummaryCards
        pemasukan={periodSummary.pemasukan}
        pengeluaran={periodSummary.pengeluaran}
        labaRugi={periodSummary.labaRugi}
        periodLabel={getPeriodLabel()}
      />

      {/* Section 3: Charts Section */}
      <ChartsSection 
        monthlyData={monthlyData}
        categoryData={categoryDataPengeluaran}
        selectedAccountId={selectedAccountFilter}
        selectedAccountName={selectedAccountName}
      />

      {/* Section 4: Riwayat Transaksi */}
      <RiwayatTransaksi 
        transactions={recentTransactions}
        selectedAccountId={selectedAccountFilter}
        selectedAccountName={selectedAccountName}
        onClearFilter={handleClearAccountFilter}
        onViewDetail={handleViewDetail}
        onEditTransaction={handleEditTransaction}
        onDeleteTransaction={handleDeleteTransaction}
        onEditTanggalDonasi={handleEditTanggalDonasi}
        initialDateFilter={dateFilter}
        onDateFilterChange={(filter) => {
          setDateFilter(filter);
          // Jika filter berubah ke 'bulan-ini', update month/year ke bulan saat ini
          if (filter === 'bulan-ini') {
            const now = new Date();
            setSelectedMonth(now.getMonth() + 1);
            setSelectedYear(now.getFullYear());
          }
        }}
        initialCustomStartDate=""
        initialCustomEndDate=""
        onCustomDateChange={() => {
          // Simplified filter - tidak perlu custom date
        }}
      />

      {/* Modal for Input Pengeluaran Koperasi */}
      <FormPengeluaranKoperasi 
        isOpen={showForm} 
        onClose={() => setShowForm(false)} 
        onSuccess={handleFormSuccess} 
      />

      {/* Modal for Input Pemasukan Koperasi */}
      <FormPemasukanKoperasi 
        isOpen={showFormPemasukan} 
        onClose={() => setShowFormPemasukan(false)} 
        onSuccess={handleFormSuccess} 
      />

      {/* Modal for Penyesuaian Saldo */}
      <Dialog open={showFormPenyesuaianSaldo} onOpenChange={setShowFormPenyesuaianSaldo}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
            <DialogTitle>Penyesuaian Saldo Akun Kas</DialogTitle>
        </DialogHeader>
          <FormPenyesuaianSaldo onSuccess={handleFormSuccess} />
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

      {/* Transaction Edit Modal */}
      {showTransactionEdit && selectedTransaction && (
        <TransactionEditModal
          transaction={selectedTransaction}
          isOpen={showTransactionEdit}
          onClose={() => {
            setShowTransactionEdit(false);
            setSelectedTransaction(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Edit Tanggal Transfer Donasi Dialog */}
      <EditTanggalTransferDonasiDialog
        transaction={selectedTransactionForEditTanggal}
        isOpen={showEditTanggalDonasi}
        onClose={() => {
          setShowEditTanggalDonasi(false);
          setSelectedTransactionForEditTanggal(null);
        }}
        onSuccess={async () => {
          setShowEditTanggalDonasi(false);
          setSelectedTransactionForEditTanggal(null);
          await loadData();
          await loadChartData(selectedAccountFilter);
        }}
      />

      {/* Transfer Antar Akun Kas Dialog */}
      <TransferAkunKasDialog
        open={showTransferDialog}
        onClose={() => setShowTransferDialog(false)}
        defaultDariAkunId={selectedAccountId}
        onSuccess={handleFormSuccess}
      />

            </div>
  );
};

export default KeuanganUnifiedPage;
