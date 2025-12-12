import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RefreshCw, Plus, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Import services
import { AkunKasService } from '@/services/akunKas.service';
import { loadChartData as loadChartDataService } from '@/services/keuanganChart.service';

// Import koperasi-specific forms
import FormPengeluaranKoperasi from './components/FormPengeluaranKoperasi';
import FormPemasukanKoperasi from './components/FormPemasukanKoperasi';
import FormPenyesuaianSaldo from '@/components/FormPenyesuaianSaldo';
import StackedAccountCards from '@/components/dashboard/StackedAccountCards';
import TotalBalanceDisplay from '@/components/dashboard/TotalBalanceDisplay';
import SummaryCards from '@/components/dashboard/SummaryCards';
import KoperasiSummaryCards from './components/KoperasiSummaryCards';
import ChartsSection from '@/components/dashboard/ChartsSection';
import RiwayatTransaksi from '@/components/dashboard/RiwayatTransaksi';
import TransactionDetailModal from '@/components/TransactionDetailModal';
import TransactionEditModal from '@/components/TransactionEditModal';
import { startOfMonth, endOfMonth, startOfDay, endOfDay, subMonths, format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, AlertCircle, ExternalLink, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const KeuanganUnifiedPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [statistics, setStatistics] = useState<any>(null);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [akunKas, setAkunKas] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [unprocessedSales, setUnprocessedSales] = useState<any[]>([]);
  const [unprocessedSalesSummary, setUnprocessedSalesSummary] = useState<{
    total: number;
    count: number;
  }>({ total: 0, count: 0 });
  
  // Koperasi summary states
  const [saldoKasKoperasi, setSaldoKasKoperasi] = useState<number>(0);
  const [hakYayasanDiKas, setHakYayasanDiKas] = useState<number>(0);
  const [labaPeriode, setLabaPeriode] = useState<number>(0);
  
  // UI states
  const [showForm, setShowForm] = useState(false);
  const [showFormPemasukan, setShowFormPemasukan] = useState(false);
  const [showFormPenyesuaianSaldo, setShowFormPenyesuaianSaldo] = useState(false);
  const [showTransactionDetail, setShowTransactionDetail] = useState(false);
  const [showTransactionEdit, setShowTransactionEdit] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string | undefined>(undefined);
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(undefined);
  
  // Date filter state - untuk statistik dan riwayat transaksi
  // Default to 'all' to show all transactions initially
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Get date range based on filter
  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (dateFilter) {
      case 'bulan-ini':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'bulan-lalu':
        const lastMonth = subMonths(now, 1);
        startDate = startOfMonth(lastMonth);
        endDate = endOfMonth(lastMonth);
        break;
      case '3-bulan':
        startDate = startOfMonth(subMonths(now, 2));
        endDate = endOfMonth(now);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = startOfDay(new Date(customStartDate));
          endDate = endOfDay(new Date(customEndDate));
        } else {
          // Default to all time if custom dates not set
          startDate = new Date(0); // Very old date
          endDate = new Date(); // Today
        }
        break;
      case 'all':
      default:
        // For 'all', start from January of current year to show all available data
        startDate = new Date(now.getFullYear(), 0, 1); // January 1st of current year
        endDate = new Date();
        break;
    }

    return { startDate, endDate };
  };

  // Get period label based on filter
  const getPeriodLabel = () => {
    switch (dateFilter) {
      case 'bulan-ini':
        return 'Bulan Ini';
      case 'bulan-lalu':
        return 'Bulan Lalu';
      case '3-bulan':
        return '3 Bulan Terakhir';
      case 'custom':
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          return `${format(start, 'd MMM yyyy', { locale: localeId })} - ${format(end, 'd MMM yyyy', { locale: localeId })}`;
        }
        return 'Periode Custom';
      case 'all':
      default:
        return 'Keseluruhan';
    }
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

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  // Reload chart data when account filter or date filter changes
  useEffect(() => {
    if (akunKas.length > 0) {
      loadChartData(selectedAccountFilter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountFilter, dateFilter, customStartDate, customEndDate]);

  // Recalculate statistics when date filter changes or when data is loaded
  useEffect(() => {
    if (recentTransactions.length > 0 && akunKas.length > 0) {
      recalculateStatistics();
      calculateKoperasiSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, customStartDate, customEndDate, recentTransactions.length, akunKas.length]);
  
  // Load hak yayasan when component mounts or data changes
  useEffect(() => {
    loadHakYayasanDiKas();
  }, []);

  // Chart data loading - respects date filter
  const loadChartData = async (accountId?: string) => {
    try {
      const filterAccountId = accountId !== undefined ? accountId : selectedAccountFilter;
      const { startDate, endDate } = getDateRange();
      
      // Use local loadChartDataForDateRange function
      const { monthlyData, categoryData } = await loadChartDataForDateRange(
        filterAccountId,
        startDate,
        endDate
      );
      setMonthlyData(monthlyData);
      setCategoryData(categoryData);
      } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal memuat data chart';
      toast.error(errorMessage);
    }
  };

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
        return { monthlyData: [], categoryData: [] };
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

      // Fetch transactions for the date range from keuangan_koperasi
      let query = supabase
        .from('keuangan_koperasi')
        .select('tanggal, jenis_transaksi, jumlah, kategori, akun_kas_id, status')
        .in('akun_kas_id', koperasiAccountIds)
        .gte('tanggal', startDate.toISOString().split('T')[0])
        .lte('tanggal', endDate.toISOString().split('T')[0])
        .eq('status', 'posted');

      if (accountId) {
        query = query.eq('akun_kas_id', accountId);
      }

      const { data: transactions, error } = await query;
      if (error) throw error;

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

      // Process category data (only expenditures)
      const categoryStats: { [key: string]: number } = {};
      let totalExpenditure = 0;

      (transactions || [])
        .filter(tx => tx.jenis_transaksi === 'Pengeluaran')
        .forEach(transaction => {
          const category = transaction.kategori || 'Lainnya';
          categoryStats[category] = (categoryStats[category] || 0) + (transaction.jumlah || 0);
          totalExpenditure += transaction.jumlah || 0;
        });

      // Convert to chart format with colors
      const colors = ['#3b82f6', '#f59e0b', '#10b981', '#6b7280', '#ef4444', '#8b5cf6', '#f97316'];
      const categoryData = Object.entries(categoryStats)
        .map(([name, total], index) => ({
          name,
          value: totalExpenditure > 0 ? Math.round((total / totalExpenditure) * 100) : 0,
          color: colors[index % colors.length]
        }))
        .sort((a, b) => b.value - a.value);

      return { monthlyData, categoryData };
    } catch (error) {
      // Silent fail for chart data - return empty arrays
      // Log only in development
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.warn('Error loading chart data for date range:', error);
      }
      return { monthlyData: [], categoryData: [] };
    }
  };

  const recalculateStatistics = async (transactions?: any[]) => {
    try {
      // Get koperasi account IDs
      const koperasiAccountIds = akunKas
        .filter(akun => akun.managed_by === 'koperasi' || akun.nama?.toLowerCase().includes('koperasi'))
        .map(akun => akun.id);

      if (koperasiAccountIds.length === 0) return;

      // Calculate statistics based on selected date filter
      const { startDate: filterStartDate, endDate: filterEndDate } = getDateRange();
      
      // Query langsung dari database untuk mendapatkan data lengkap sesuai filter
      // Jangan gunakan recentTransactions yang sudah dibatasi 12 bulan
      let statsQuery = supabase
        .from('keuangan_koperasi')
        .select('jenis_transaksi, jumlah, tanggal, status, kategori, referensi')
        .in('akun_kas_id', koperasiAccountIds)
        .eq('status', 'posted');
      
      // Apply date filter
      // Untuk 'all', ambil SEMUA data tanpa filter tanggal
      // Untuk filter lain, gunakan range yang sesuai
      if (dateFilter !== 'all') {
        statsQuery = statsQuery
          .gte('tanggal', filterStartDate.toISOString().split('T')[0])
          .lte('tanggal', filterEndDate.toISOString().split('T')[0]);
      }
      // Untuk 'all', tidak perlu filter tanggal - ambil semua data
      
      // Apply account filter if selected
      if (selectedAccountFilter) {
        statsQuery = statsQuery.eq('akun_kas_id', selectedAccountFilter);
      }
      
      const { data: transactionsInPeriod, error: statsError } = await statsQuery;
      
      if (statsError) throw statsError;
      
      // Get processed months from koperasi_bagi_hasil_log
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
      
      // Get all kop_penjualan IDs that contain yayasan items
      const kopPenjualanIds = (transactionsInPeriod || [])
        .filter(tx => tx.source_module === 'kop_penjualan' && tx.source_id)
        .map(tx => tx.source_id);
      
      let yayasanPenjualanIds = new Set<string>();
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
      
      // Filter transactions: exclude unprocessed yayasan sales and Jasa Pengelolaan
      const filteredTransactions = (transactionsInPeriod || []).filter(tx => {
        // Exclude "Pemasukan" from kop_penjualan with yayasan items that haven't been processed
        if (tx.jenis_transaksi === 'Pemasukan' && 
            tx.kategori === 'Penjualan' &&
            tx.source_module === 'kop_penjualan' &&
            tx.source_id &&
            yayasanPenjualanIds.has(tx.source_id)) {
          if (!isDateProcessed(tx.tanggal)) {
            return false; // Exclude unprocessed yayasan sales
          }
        }
        
        // Exclude "Jasa Pengelolaan" that hasn't been processed
        if (tx.kategori === 'Jasa Pengelolaan' || 
            tx.kategori === 'Jasa Pengelolaan Inventaris Yayasan') {
          if (!isDateProcessed(tx.tanggal)) {
            return false; // Exclude unprocessed Jasa Pengelolaan
          }
        }
        
        return true;
      });
      
      const pemasukan = filteredTransactions
        .filter(tx => tx.jenis_transaksi === 'Pemasukan')
        .reduce((sum, tx) => sum + parseFloat(tx.jumlah || 0), 0);
      
      // Pengeluaran: EXCLUDE "Hutang ke Yayasan" dan liability entries
      // karena itu adalah kewajiban, bukan pengeluaran operasional
      const pengeluaran = filteredTransactions
        .filter(tx => 
          tx.jenis_transaksi === 'Pengeluaran' &&
          tx.kategori !== 'Hutang ke Yayasan' &&
          !tx.referensi?.includes(':liability')
        )
        .reduce((sum, tx) => sum + parseFloat(tx.jumlah || 0), 0);
  
      // Calculate trend (compare with previous period of same length)
      // Untuk filter 'all', tidak ada trend comparison (karena tidak ada periode sebelumnya yang jelas)
      let pemasukanTrend = 0;
      let pengeluaranTrend = 0;
      
      if (dateFilter !== 'all') {
        const periodLength = Math.ceil((filterEndDate.getTime() - filterStartDate.getTime()) / (1000 * 60 * 60 * 24));
        const prevPeriodStart = new Date(filterStartDate);
        prevPeriodStart.setDate(prevPeriodStart.getDate() - periodLength - 1);
        const prevPeriodEnd = new Date(filterStartDate);
        prevPeriodEnd.setDate(prevPeriodEnd.getDate() - 1);
        
        // Get previous period transactions (need to fetch separately) from keuangan_koperasi
        let prevPeriodQuery = supabase
          .from('keuangan_koperasi')
          .select('*')
          .in('akun_kas_id', koperasiAccountIds)
          .gte('tanggal', prevPeriodStart.toISOString().split('T')[0])
          .lte('tanggal', prevPeriodEnd.toISOString().split('T')[0])
          .eq('status', 'posted');
        
        if (selectedAccountFilter) {
          prevPeriodQuery = prevPeriodQuery.eq('akun_kas_id', selectedAccountFilter);
        }
        
        const { data: prevPeriodTransactions } = await prevPeriodQuery;
        
        // Filter previous period transactions similarly
        const prevKopPenjualanIds = (prevPeriodTransactions || [])
          .filter(tx => tx.source_module === 'kop_penjualan' && tx.source_id)
          .map(tx => tx.source_id);
        
        let prevYayasanPenjualanIds = new Set<string>();
        if (prevKopPenjualanIds.length > 0) {
          const { data: prevKopPenjualanDetails } = await supabase
            .from('kop_penjualan_detail')
            .select(`
              penjualan_id,
              kop_barang!inner(owner_type)
            `)
            .in('penjualan_id', prevKopPenjualanIds)
            .eq('kop_barang.owner_type', 'yayasan');
          
          (prevKopPenjualanDetails || []).forEach((detail: any) => {
            prevYayasanPenjualanIds.add(detail.penjualan_id);
          });
        }
        
        const filteredPrevTransactions = (prevPeriodTransactions || []).filter(tx => {
          if (tx.jenis_transaksi === 'Pemasukan' && 
              tx.kategori === 'Penjualan' &&
              tx.source_module === 'kop_penjualan' &&
              tx.source_id &&
              prevYayasanPenjualanIds.has(tx.source_id)) {
            if (!isDateProcessed(tx.tanggal)) {
              return false;
            }
          }
          
          if (tx.kategori === 'Jasa Pengelolaan' || 
              tx.kategori === 'Jasa Pengelolaan Inventaris Yayasan') {
            if (!isDateProcessed(tx.tanggal)) {
              return false;
            }
          }
          
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
      }
      
      setStatistics({
        pemasukan_bulan_ini: pemasukan,
        pengeluaran_bulan_ini: pengeluaran,
        transaksi_bulan_ini: filteredTransactions.length,
        pemasukan_trend: pemasukanTrend,
        pengeluaran_trend: pengeluaranTrend
      });
    } catch (error) {
      // Silent fail for statistics recalculation
      // Log only in development
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.warn('Error recalculating statistics:', error);
      }
    }
  };

  // Calculate Koperasi Summary: Saldo Kas, Hak Yayasan, Laba Periode
  const calculateKoperasiSummary = async () => {
    try {
      // 1. Saldo Kas Koperasi = total saldo dari semua akun kas koperasi aktif
      const koperasiAccountIds = akunKas
        .filter(akun => akun.managed_by === 'koperasi' || akun.nama?.toLowerCase().includes('koperasi'))
        .map(akun => akun.id);

      if (koperasiAccountIds.length === 0) {
        setSaldoKasKoperasi(0);
        setLabaPeriode(0);
        return;
      }

      const totalSaldo = akunKas
        .filter(akun => akun.status === 'aktif')
        .reduce((sum, akun) => sum + (akun.saldo_saat_ini || 0), 0);
      setSaldoKasKoperasi(totalSaldo);

      // 2. Laba Periode = Penjualan - HPP - Beban Operasional
      const { startDate, endDate } = getDateRange();
      
      let labaQuery = supabase
        .from('keuangan_koperasi')
        .select('jenis_transaksi, jumlah, kategori, hpp')
        .in('akun_kas_id', koperasiAccountIds)
        .eq('status', 'posted');
      
      if (dateFilter !== 'all') {
        labaQuery = labaQuery
          .gte('tanggal', startDate.toISOString().split('T')[0])
          .lte('tanggal', endDate.toISOString().split('T')[0]);
      }
      
      const { data: labaTransactions } = await labaQuery;
      
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
      const hppFromField = (labaTransactions || [])
        .filter(tx => tx.jenis_transaksi === 'Pemasukan' && tx.hpp)
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

      setHakYayasanDiKas(total);
    } catch (error) {
      // Silent fail - set to 0
      setHakYayasanDiKas(0);
    }
  };

  const loadData = async () => {
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
      
      // Update saldo kas koperasi
      setSaldoKasKoperasi(totalSaldoAllAccounts);
      
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
          pengeluaran_trend: 0
        });
        setLoading(false);
        return;
      }

      // Fetch data for a wider range (last 12 months) to allow client-side filtering
      const now = new Date();
      const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);

      let query = supabase
        .from('keuangan_koperasi')
        .select(`
          *,
          akun_kas:akun_kas_id(nama, managed_by)
        `)
        .in('akun_kas_id', koperasiAccountIds)
        .gte('tanggal', twelveMonthsAgo.toISOString().split('T')[0])
        .order('tanggal', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1000);
      
      // Apply account filter if selected
      if (selectedAccountFilter) {
        query = query.eq('akun_kas_id', selectedAccountFilter);
      }
      
      const { data: transactions, error } = await query;
      
      if (error) throw error;
      
      // Filter transactions - hanya yang dari akun koperasi
      let allTransactions = (transactions || []).filter(tx => {
        const akunKas = Array.isArray(tx.akun_kas) ? tx.akun_kas[0] : tx.akun_kas;
        return koperasiAccountIds.includes(tx.akun_kas_id) &&
               (akunKas?.managed_by === 'koperasi' || akunKas?.nama?.toLowerCase().includes('koperasi'));
      });

      // Apply date filter to get filtered transactions for display
  const { startDate, endDate } = getDateRange();
      let filteredTransactions = allTransactions.filter(tx => {
        const txDate = new Date(tx.tanggal);
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
      
      let yayasanPenjualanIds = new Set<string>();
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
      
      // Load unprocessed sales (penjualan item yayasan yang belum diproses)
      await loadUnprocessedSales();
      
      // Load hak yayasan di kas
      await loadHakYayasanDiKas();
      
      // Calculate statistics will be done in recalculateStatistics function
      // We need to wait for state to update, so we'll call it in a separate effect
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Gagal memuat data keuangan koperasi';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Load unprocessed sales (penjualan item yayasan yang belum diproses)
  const loadUnprocessedSales = async () => {
    try {
      if (akunKas.length === 0) {
        setUnprocessedSales([]);
        setUnprocessedSalesSummary({ total: 0, count: 0 });
        return;
      }

      const koperasiAccountIds = akunKas
        .filter(akun => akun.managed_by === 'koperasi' || akun.nama?.toLowerCase().includes('koperasi'))
        .map(akun => akun.id);

      if (koperasiAccountIds.length === 0) {
        setUnprocessedSales([]);
        setUnprocessedSalesSummary({ total: 0, count: 0 });
        return;
      }

      // Get penjualan item yayasan yang belum diproses
      const { data: transactions, error } = await supabase
        .from('transaksi_inventaris')
        .select(`
          id,
          tanggal,
          harga_total,
          jumlah,
          penerima,
          channel,
          inventaris!inner(
            id,
            nama_barang,
            kode_inventaris,
            boleh_dijual_koperasi,
            is_komoditas,
            tipe_item
          )
        `)
        .eq('tipe', 'Keluar')
        .eq('keluar_mode', 'Penjualan')
        .or('channel.eq.koperasi,channel.is.null')
        .order('tanggal', { ascending: false })
        .limit(100);

      if (error) {
        // Silent fail - return empty
        return;
      }

      // Filter hanya item yayasan
      const yayasanItems = (transactions || []).filter((tx: any) => {
        const inventaris = tx.inventaris;
        if (!inventaris) return false;
        return inventaris.boleh_dijual_koperasi || 
               inventaris.is_komoditas || 
               inventaris.tipe_item === 'Komoditas';
      });

      // Check which ones are truly unprocessed (belum ada di keuangan_koperasi sebagai pemasukan)
      if (yayasanItems.length > 0) {
        // Get processed entries
        const { data: processedEntries } = await supabase
          .from('keuangan_koperasi')
          .select('referensi, kategori')
          .in('akun_kas_id', koperasiAccountIds)
          .eq('status', 'posted')
          .eq('jenis_transaksi', 'Pemasukan');

        const processedIds = new Set(
          (processedEntries || [])
            .filter((entry: any) => 
              entry.kategori !== 'Jasa Pengelolaan Inventaris Yayasan' &&
              entry.kategori !== 'Bagi Hasil Koperasi' &&
              entry.referensi
            )
            .map((entry: any) => {
              const match = entry.referensi?.match(/transaksi_inventaris:([^:]+)/);
              return match ? match[1] : null;
            })
            .filter(Boolean)
        );

        const trulyUnprocessed = yayasanItems.filter((tx: any) => !processedIds.has(tx.id));
        
        setUnprocessedSales(trulyUnprocessed);
        setUnprocessedSalesSummary({
          total: trulyUnprocessed.reduce((sum: number, tx: any) => sum + parseFloat(tx.harga_total || 0), 0),
          count: trulyUnprocessed.length
        });
      } else {
        setUnprocessedSales([]);
        setUnprocessedSalesSummary({ total: 0, count: 0 });
      }
    } catch (error) {
      // Silent fail - unprocessed sales are optional
      // Log only in development
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.warn('Error loading unprocessed sales:', error);
      }
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    await loadChartData(selectedAccountFilter);
    setRefreshing(false);
    toast.success('Data berhasil diperbarui');
  };

  const handleFormSuccess = async () => {
    await loadData();
    await loadChartData(selectedAccountFilter);
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
    if (transaction.auto_posted) {
      const sourceModule = transaction.source_module || 'modul lain';
      toast.error(`Transaksi ini berasal dari ${sourceModule} dan tidak dapat diedit. Edit dari modul sumber terlebih dahulu.`);
      return;
    }
    setSelectedTransaction(transaction);
    setShowTransactionEdit(true);
  };

  const handleDeleteTransaction = async (transaction: any) => {
    if (transaction.auto_posted) {
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
        const { error } = await supabase.rpc('delete_keuangan_and_recalc', { p_keuangan_id: transaction.id });
        
        if (error) {
          if (error.code === '42501' || error.message?.includes('permission denied') || error.message?.includes('policy')) {
            toast.error('Transaksi ini tidak dapat dihapus karena berasal dari modul lain. Hapus dari modul sumber terlebih dahulu.');
            return;
          }
          throw error;
        }
        
        toast.success('Transaksi berhasil dihapus');
        await loadData();
        await loadChartData(selectedAccountFilter);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal menghapus transaksi';
        toast.error(errorMessage);
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

  // Calculate totals for display
  const totals = {
    totalBalance: selectedAccountId 
      ? akunKas.find(akun => akun.id === selectedAccountId)?.saldo_saat_ini || 0
      : akunKas.filter(akun => akun.status === 'aktif').reduce((sum, akun) => sum + (akun.saldo_saat_ini || 0), 0),
    accountCount: akunKas.filter(akun => akun.status === 'aktif').length
  };

  const currentSelectedAccount = selectedAccountId 
    ? akunKas.find(akun => akun.id === selectedAccountId)
    : null;

  const selectedAccountName = currentSelectedAccount?.nama;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 bg-white min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
            <h1 className="text-3xl font-light tracking-tight text-gray-900">Keuangan Koperasi</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manajemen keuangan operasional koperasi - Riwayat transaksi operasional, gaji, dan auto post penjualan inventaris
            </p>
        </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap justify-end ml-auto">
            <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
                onClick={handleInputPengeluaran}
                className="bg-gray-900 hover:bg-gray-800 text-white shadow-sm whitespace-nowrap text-xs sm:text-sm"
          >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Pengeluaran</span>
          </Button>
          <Button
            size="sm"
                variant="outline"
                onClick={() => setShowFormPemasukan(true)}
                className="border-gray-200 hover:bg-gray-50 text-gray-700 whitespace-nowrap text-xs sm:text-sm"
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

      {/* Section 1: Account & Balance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Cards */}
        <div>
          <StackedAccountCards
            accounts={akunKas.filter(akun => akun.status === 'aktif')}
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
              toast.info('Fitur transfer antar akun akan segera tersedia');
            }}
            onRequest={() => {
              toast.info('Fitur pengajuan dana akan segera tersedia');
            }}
              />
            </div>
                  </div>

      {/* Date Filter Section */}
      <Card className="rounded-lg border border-gray-200 shadow-sm bg-white">
        <CardHeader className="pb-3 pt-4 px-4 border-b border-gray-100">
            <CardTitle className="text-sm font-medium text-gray-900 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Filter Periode
            </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
              <Label>Periode</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                  <SelectItem value="bulan-ini">Bulan Ini</SelectItem>
                  <SelectItem value="bulan-lalu">Bulan Lalu</SelectItem>
                  <SelectItem value="3-bulan">3 Bulan Terakhir</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            {dateFilter === 'custom' && (
              <>
              <div className="space-y-2">
                  <Label htmlFor="custom-start-date">Tanggal Mulai</Label>
                  <Input
                    id="custom-start-date"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    max={customEndDate || new Date().toISOString().split('T')[0]}
                  />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="custom-end-date">Tanggal Akhir</Label>
                  <Input
                    id="custom-end-date"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    min={customStartDate}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </>
            )}
            {dateFilter !== 'custom' && (
              <div className="md:col-span-3 flex items-end">
                <div className="text-sm text-gray-600">
                  {(() => {
                    const { startDate, endDate } = getDateRange();
                    return `Periode: ${format(startDate, 'd MMMM yyyy', { locale: localeId })} - ${format(endDate, 'd MMMM yyyy', { locale: localeId })}`;
                  })()}
              </div>
            </div>
                            )}
                          </div>
        </CardContent>
      </Card>

      {/* Section 2: Koperasi Summary Cards */}
      <KoperasiSummaryCards
        saldoKas={saldoKasKoperasi}
        hakYayasan={hakYayasanDiKas}
        labaPeriode={labaPeriode}
        periodLabel={getPeriodLabel()}
      />

      {/* Section 3: Charts Section */}
      <ChartsSection 
        monthlyData={monthlyData}
        categoryData={categoryData}
        selectedAccountId={selectedAccountFilter}
        selectedAccountName={selectedAccountName}
      />

      {/* Section 4: Alert untuk Penjualan Item Yayasan yang Belum Diproses */}
      {unprocessedSalesSummary.count > 0 && (
        <Card className="rounded-lg border border-amber-200 bg-amber-50">
          <CardHeader className="pb-3 pt-4 px-4 border-b border-amber-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <CardTitle className="text-sm font-medium text-amber-900">
                  Penjualan Item Yayasan yang Belum Diproses
                </CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/koperasi/keuangan/kelola-hpp')}
                className="border-amber-300 text-amber-700 hover:bg-amber-100"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Proses di Kalkulator HPP
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-white rounded-lg p-4 border border-amber-200">
                <p className="text-xs text-amber-600 uppercase tracking-wide mb-1">Jumlah Transaksi</p>
                <p className="text-2xl font-bold text-amber-900">{unprocessedSalesSummary.count}</p>
                <p className="text-xs text-amber-500 mt-1">Penjualan item yayasan</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-amber-200">
                <p className="text-xs text-amber-600 uppercase tracking-wide mb-1">Total Omset</p>
                <p className="text-2xl font-bold text-amber-900">
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    minimumFractionDigits: 0,
                  }).format(unprocessedSalesSummary.total)}
                </p>
                <p className="text-xs text-amber-500 mt-1">Belum masuk ke keuangan koperasi</p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-amber-200">
                <p className="text-xs text-amber-600 uppercase tracking-wide mb-1">Status</p>
                <p className="text-lg font-semibold text-amber-700">Perlu Diproses</p>
                <p className="text-xs text-amber-500 mt-1">Gunakan Kalkulator HPP & Bagi Hasil</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-amber-800 mb-2">
                <strong>Catatan:</strong> Penjualan item yayasan yang dijual melalui koperasi harus diproses melalui 
                <strong> Kalkulator HPP & Bagi Hasil</strong> terlebih dahulu sebelum dicatat sebagai pemasukan koperasi. 
                Ini memastikan pembagian hasil yang adil antara yayasan dan koperasi.
              </p>
              <div className="flex items-center gap-2 text-xs text-amber-700">
                <Package className="h-4 w-4" />
                <span>
                  {unprocessedSalesSummary.count} transaksi menunggu untuk diproses. 
                  Klik tombol di atas untuk membuka Kalkulator HPP & Bagi Hasil.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 5: Riwayat Transaksi */}
      <RiwayatTransaksi 
        transactions={recentTransactions}
        selectedAccountId={selectedAccountFilter}
        selectedAccountName={selectedAccountName}
        onClearFilter={handleClearAccountFilter}
        onViewDetail={handleViewDetail}
        onEditTransaction={handleEditTransaction}
        onDeleteTransaction={handleDeleteTransaction}
        initialDateFilter={dateFilter}
        onDateFilterChange={(filter) => {
          setDateFilter(filter);
        }}
        initialCustomStartDate={customStartDate}
        initialCustomEndDate={customEndDate}
        onCustomDateChange={(startDate, endDate) => {
          setCustomStartDate(startDate);
          setCustomEndDate(endDate);
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
            </div>
  );
};

export default KeuanganUnifiedPage;
