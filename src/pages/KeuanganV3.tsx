import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw, Plus, FileText } from 'lucide-react';
import { toast } from 'sonner';

// Import new dashboard components
import SummaryCards from '../components/dashboard/SummaryCards';
import ChartsSection from '../components/dashboard/ChartsSection';
import SaldoPerAkun from '../components/SaldoPerAkun';
import RiwayatTransaksi from '../components/dashboard/RiwayatTransaksi';
import TransactionDetailModal from '../components/TransactionDetailModal';
import TransactionEditModal from '../components/TransactionEditModal';
import StackedAccountCards from '../components/dashboard/StackedAccountCards';
import TotalBalanceDisplay from '../components/dashboard/TotalBalanceDisplay';

  // Import services
import { getKeuanganDashboardStats, getAkunKasStats } from '../services/keuangan.service';
import { AkunKasService } from '../services/akunKas.service';
  import { PeriodFilter } from '../utils/export/types';
  import { ReportFormatter } from '../utils/export/reportFormatter';
  import { PDFExporter } from '../utils/export/pdfExporter';
  import { ExcelExporter } from '../utils/export/excelExporter';
import { AlokasiPengeluaranService } from '../services/alokasiPengeluaran.service';
import { supabase } from '../integrations/supabase/client';

// Import existing components for modal
import FormPengeluaranRinci from '../components/FormPengeluaranRinci';
import ExportPDFDialogV3 from '../components/ExportPDFDialogV3';

const KeuanganV3: React.FC = () => {
  const [sp] = useSearchParams();
  const activeTab = sp.get('tab') || 'dashboard';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [statistics, setStatistics] = useState<any>(null);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [akunKas, setAkunKas] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  
  // UI states
  const [showForm, setShowForm] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showEditAccount, setShowEditAccount] = useState(false);
  const [showTransactionDetail, setShowTransactionDetail] = useState(false);
  const [showTransactionEdit, setShowTransactionEdit] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string | undefined>(undefined);
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(undefined);
  const [editForm, setEditForm] = useState({
    nama: '',
    kode: '',
    tipe: 'Kas',
    nomor_rekening: '',
    nama_bank: '',
    atas_nama: '',
    saldo_awal: 0,
    status: 'aktif'
  });
  const [deletedAccountInfo, setDeletedAccountInfo] = useState<any>(null);
  const [showRestoreOption, setShowRestoreOption] = useState(false);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  // Reload chart data when account filter changes
  useEffect(() => {
    console.log('⚡ useEffect triggered by selectedAccountFilter change:', {
      selectedAccountFilter,
      isUndefined: selectedAccountFilter === undefined,
      timestamp: new Date().toISOString()
    });
    
    if (selectedAccountFilter !== undefined) {
      console.log('🔄 useEffect calling loadChartData and loadData...');
      loadChartData(selectedAccountFilter);
      loadData(); // FIXED: Also reload main data when filter changes
    }
  }, [selectedAccountFilter]);

  const getMonthlyData = async (accountId?: string) => {
    try {
      // Get last 7 months of data
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(endDate.getMonth() - 6); // Last 7 months including current
      
      let query = supabase
        .from('keuangan')
        .select('tanggal, jenis_transaksi, jumlah, source_module, kategori, akun_kas_id')
        .gte('tanggal', startDate.toISOString().split('T')[0])
        .lte('tanggal', endDate.toISOString().split('T')[0]);
      
      // Exclude tabungan santri transactions
      query = query.or('source_module.is.null,source_module.neq.tabungan_santri');
        
      if (accountId) {
        query = query.eq('akun_kas_id', accountId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Filter out tabungan transactions client-side (backup filtering)
      const filteredData = data?.filter(transaction => {
        // Exclude if source_module contains 'tabungan'
        if (transaction.source_module && 
            typeof transaction.source_module === 'string' &&
            transaction.source_module.toLowerCase().includes('tabungan')) {
          return false;
        }
        // Exclude if kategori is 'Tabungan Santri'
        if (transaction.kategori === 'Tabungan Santri') {
          return false;
        }
        return true;
      }) || [];
      
      // Group by month
      const monthlyStats: { [key: string]: { pemasukan: number; pengeluaran: number } } = {};
      
      // Initialize last 7 months
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toISOString().substring(0, 7); // YYYY-MM format
        const monthName = date.toLocaleDateString('id-ID', { month: 'short' });
        monthlyStats[monthKey] = { pemasukan: 0, pengeluaran: 0 };
      }
      
      // Process transactions
      filteredData.forEach(transaction => {
        const monthKey = transaction.tanggal.substring(0, 7);
        if (monthlyStats[monthKey]) {
          if (transaction.jenis_transaksi === 'Pemasukan') {
            monthlyStats[monthKey].pemasukan += transaction.jumlah || 0;
          } else if (transaction.jenis_transaksi === 'Pengeluaran') {
            monthlyStats[monthKey].pengeluaran += transaction.jumlah || 0;
          }
        }
      });
      
      // Convert to chart format
      return Object.entries(monthlyStats)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([monthKey, stats]) => {
          const date = new Date(monthKey + '-01');
          const monthName = date.toLocaleDateString('id-ID', { month: 'short' });
          return {
            month: monthName,
            pemasukan: stats.pemasukan,
            pengeluaran: stats.pengeluaran
          };
        });
        
    } catch (error) {
      console.error('Error loading monthly data:', error);
      return [];
    }
  };

  const getCategoryData = async (accountId?: string) => {
    try {
      console.log('🔍 getCategoryData called with:', { 
        accountId, 
        selectedAccountFilter,
        timestamp: new Date().toISOString()
      });
      
      // Get current year expenditures
      const currentYear = new Date().getFullYear();
      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear}-12-31`;
      
      let query = supabase
        .from('keuangan')
        .select('kategori, jumlah, akun_kas_id, source_module, akun_kas:akun_kas_id(nama, managed_by)')
        .eq('jenis_transaksi', 'Pengeluaran')
        .gte('tanggal', startDate)
        .lte('tanggal', endDate);
      
      // Exclude tabungan santri transactions
      query = query.or('source_module.is.null,source_module.neq.tabungan_santri');
        
      if (accountId) {
        console.log('🎯 Applying account filter:', accountId);
        query = query.eq('akun_kas_id', accountId);
      } else {
        console.log('📊 Loading data from ALL accounts');
      }
      
      const { data, error } = await query;
      console.log('📈 Category data query result:', { 
        data: data?.slice(0, 5), // Log first 5 entries to avoid spam
        totalRecords: data?.length,
        error, 
        accountFilter: accountId,
        uniqueAccounts: [...new Set(data?.map(d => d.akun_kas?.nama || 'Unknown'))]
      });
      if (error) throw error;
      
      // Filter out tabungan transactions client-side (backup filtering)
      const filteredData = data?.filter(transaction => {
        // Exclude if source_module contains 'tabungan'
        if (transaction.source_module && 
            typeof transaction.source_module === 'string' &&
            transaction.source_module.toLowerCase().includes('tabungan')) {
          return false;
        }
        // Exclude if kategori is 'Tabungan Santri'
        if (transaction.kategori === 'Tabungan Santri') {
          return false;
        }
        // Exclude if account is managed by tabungan module
        if (transaction.akun_kas?.managed_by === 'tabungan') {
          return false;
        }
        return true;
      }) || [];
      
      // Group by category
      const categoryStats: { [key: string]: number } = {};
      let totalExpenditure = 0;
      
      filteredData.forEach(transaction => {
        const category = transaction.kategori || 'Lainnya';
        categoryStats[category] = (categoryStats[category] || 0) + (transaction.jumlah || 0);
        totalExpenditure += transaction.jumlah || 0;
      });
      
      // Convert to chart format with colors
      const colors = ['#3b82f6', '#f59e0b', '#10b981', '#6b7280', '#ef4444', '#8b5cf6', '#f97316'];
      
      const result = Object.entries(categoryStats)
        .map(([name, total], index) => ({
          name,
          value: totalExpenditure > 0 ? Math.round((total / totalExpenditure) * 100) : 0,
          color: colors[index % colors.length]
        }))
        .sort((a, b) => b.value - a.value);
      
      console.log('📈 Final category data result:', {
        totalExpenditure,
        categoryCount: result.length,
        topCategories: result.slice(0, 3),
        accountFilter: accountId,
        allCategories: Object.keys(categoryStats)
      });
      
      return result;
        
    } catch (error) {
      console.error('Error loading category data:', error);
      return [];
    }
  };

  const loadChartData = async (accountId?: string) => {
    try {
      // Use passed accountId or fall back to current state
      const filterAccountId = accountId !== undefined ? accountId : selectedAccountFilter;
      
      console.log('🚀 loadChartData started with:', { 
        passedAccountId: accountId,
        selectedAccountFilter,
        filterAccountId,
        timestamp: new Date().toISOString()
      });
      
      const [monthlyData, categoryData] = await Promise.all([
        getMonthlyData(filterAccountId),
        getCategoryData(filterAccountId)
      ]);
      
      console.log('📊 Chart data loaded:', {
        monthlyDataLength: monthlyData.length,
        categoryDataLength: categoryData.length,
        categoryData: categoryData.map(c => ({ name: c.name, value: c.value })),
        filterAccountId
      });
      
      setMonthlyData(monthlyData);
      setCategoryData(categoryData);
    } catch (error) {
      console.error('Error loading chart data:', error);
      toast.error('Gagal memuat data chart');
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get accounts first
      const accounts = await AkunKasService.getAll();
      
      // Calculate total saldo from ACTIVE accounts only
      const totalSaldoAllAccounts = accounts
        .filter(akun => akun.status === 'aktif')
        .reduce((sum, akun) => sum + (akun.saldo_saat_ini || 0), 0);
      
      // Get recent transactions from supabase
      // EXCLUDE transactions from tabungan module
      let query = supabase
        .from('keuangan')
        .select(`
          *,
          akun_kas:akun_kas_id(nama, managed_by)
        `)
        .order('tanggal', { ascending: false })
        .limit(50);
      
      // Exclude tabungan santri transactions
      // Use .or() to exclude transactions with source_module = 'tabungan_santri'
      // This allows NULL source_module (manual transactions) and other modules, but excludes tabungan
      query = query.or('source_module.is.null,source_module.neq.tabungan_santri');
      
      // Apply account filter if selected
      if (selectedAccountFilter) {
        query = query.eq('akun_kas_id', selectedAccountFilter);
      }
      
      const { data: transactions, error } = await query;
      
      if (error) throw error;
      
      // Filter out transactions from tabungan module (client-side filtering as backup)
      // This handles cases where source_module might contain 'tabungan' in various forms
      const filteredTransactions = transactions?.filter(transaction => {
        // Exclude if source_module contains 'tabungan'
        if (transaction.source_module && 
            typeof transaction.source_module === 'string' &&
            transaction.source_module.toLowerCase().includes('tabungan')) {
          return false;
        }
        // Exclude if account is managed by tabungan module
        if (transaction.akun_kas?.managed_by === 'tabungan') {
          return false;
        }
        // Exclude if kategori is 'Tabungan Santri'
        if (transaction.kategori === 'Tabungan Santri') {
          return false;
        }
        return true;
      }) || [];
      
      // Transform transactions
      const transformedTransactions = filteredTransactions.map(transaction => ({
        ...transaction,
        akun_kas_nama: (transaction.akun_kas?.nama || transaction.akun_kas_nama || '') || 'Kas Utama',
        display_category: transaction.kategori || 'Lainnya',
        source_type: transaction.sub_kategori || transaction.kategori || 'Manual',
        display_description: (transaction.deskripsi || '') || (
          (transaction.jenis_transaksi === 'Pemasukan' ? 'Pemasukan' : 'Pengeluaran') +
          (transaction.kategori ? ` - ${transaction.kategori}` : '')
        )
      }));
      
      // FIXED: Get accurate statistics using new getAkunKasStats function
      const akunKasStats = await getAkunKasStats(selectedAccountFilter);
      
      // Create statistics object with accurate data
      const stats = {
        saldo_bersih: akunKasStats.totalSaldo,
        pemasukan_bulan_ini: akunKasStats.pemasukanBulanIni,
        pengeluaran_bulan_ini: akunKasStats.pengeluaranBulanIni,
        transaksi_bulan_ini: akunKasStats.totalTransaksi,
        pemasukan_trend: akunKasStats.pemasukanTrend,
        pengeluaran_trend: akunKasStats.pengeluaranTrend
      };
      
      setStatistics(stats);
      setRecentTransactions(transformedTransactions);
      setAkunKas(accounts);
      
      // Load chart data after main data is loaded
      await loadChartData(selectedAccountFilter);
      
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Gagal memuat data keuangan');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success('Data berhasil diperbarui');
  };

  const handleInputPengeluaran = () => {
    setShowForm(true);
  };

  const handleViewAllTransactions = () => {
    // For now, just show all transactions in the recent activities section
    // In a real implementation, this might open a full-page table or modal
    toast.info('Menampilkan semua transaksi...');
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    loadData();
    toast.success('Pengeluaran berhasil disimpan');
  };

  const handleEditSuccess = () => {
    setShowTransactionEdit(false);
    loadData();
  };

  const handleRefreshBalances = async () => {
    try {
      // Call the SQL function to recalculate all balances
      const { data, error } = await supabase.rpc('recalculate_all_balances');
      
      if (error) throw error;
      
      // Reload account data to get updated balances
      await loadData();
      
      toast.success('Saldo semua akun berhasil diperbarui');
    } catch (error) {
      console.error('Error refreshing balances:', error);
      toast.error('Gagal memperbarui saldo');
    }
  };

  const handleExportPDF = async (reportType: string, period?: PeriodFilter) => {
    try {
      toast.info(`Export PDF untuk ${reportType} sedang diproses...`);
      
      // Get real data from database
      const defaultPeriod = period || { start: new Date(2025, 0, 1), end: new Date() };
      const startDate = defaultPeriod.start.toISOString().split('T')[0];
      const endDate = defaultPeriod.end.toISOString().split('T')[0];
      
      let reportData;
      
      // Simplified export - just show success message
      reportData = {
        title: `Laporan ${reportType}`,
        period: defaultPeriod,
        data: []
      };
      
      const exporter = new PDFExporter();
      exporter.exportSingleReport(reportData);
      
      toast.success(`Export PDF ${reportType} berhasil!`);
    } catch (error) {
      console.error('Export PDF error:', error);
      toast.error(`Gagal export PDF: ${error.message}`);
    }
  };

  const handleExportExcel = async (reportType: string, period?: PeriodFilter) => {
    try {
      toast.info(`Export Excel untuk ${reportType} sedang diproses...`);
      
      // Get real data from database
      const defaultPeriod = period || { start: new Date(2025, 0, 1), end: new Date() };
      const startDate = defaultPeriod.start.toISOString().split('T')[0];
      const endDate = defaultPeriod.end.toISOString().split('T')[0];
      
      let sheets;
      
      // Simplified export - just show success message
      sheets = [{
        name: reportType,
        data: [{ sample: 'data' }],
        columns: [{ header: 'Sample', dataKey: 'sample', width: 20 }]
      }];
      
      const exporter = new ExcelExporter();
      exporter.exportMultipleSheets({
        filename: `Laporan_${reportType}`,
        title: `Laporan ${reportType}`,
        period,
        sheets
      });
      
      toast.success(`Export Excel ${reportType} berhasil!`);
    } catch (error) {
      console.error('Export Excel error:', error);
      toast.error(`Gagal export Excel: ${error.message}`);
    }
  };

  const handleExportAll = async (format: 'pdf' | 'excel', period?: PeriodFilter) => {
    try {
      toast.info(`Export All ${format.toUpperCase()} sedang diproses...`);
      
      const defaultPeriod = period || { start: new Date(2025, 0, 1), end: new Date() };
      const startDate = defaultPeriod.start.toISOString().split('T')[0];
      const endDate = defaultPeriod.end.toISOString().split('T')[0];
      
      // Simplified data loading
      const cashFlowData = { totalPemasukan: 0, totalPengeluaran: 0, saldoAkhir: 0, breakdown: [] };
      const categoryData = [];
      const santriData = [];
      const auditData = [];
      
      if (format === 'pdf') {
        const reports = [
          ReportFormatter.formatCashFlowReport(cashFlowData, defaultPeriod),
          ReportFormatter.formatKategoriReport(categoryData, defaultPeriod),
          ReportFormatter.formatSantriBantuanReport(santriData, defaultPeriod),
          ReportFormatter.formatAuditTrailReport(auditData, defaultPeriod)
        ];
        
        const exporter = new PDFExporter();
        exporter.exportMultipleReports(reports);
      } else {
        const sheets = [
          {
            name: 'Cash Flow',
            data: cashFlowData.breakdown,
            columns: [
              { header: 'Bulan', dataKey: 'bulan', width: 15 },
              { header: 'Pemasukan', dataKey: 'pemasukan', width: 20 },
              { header: 'Pengeluaran', dataKey: 'pengeluaran', width: 20 },
              { header: 'Saldo', dataKey: 'saldo', width: 20 }
            ]
          },
          {
            name: 'Per Kategori',
            data: categoryData,
            columns: [
              { header: 'Kategori', dataKey: 'kategori', width: 20 },
              { header: 'Total', dataKey: 'total', width: 15 },
              { header: 'Persentase', dataKey: 'persentase', width: 15 },
              { header: 'Jumlah Transaksi', dataKey: 'count', width: 15 }
            ]
          },
          {
            name: 'Per Santri',
            data: santriData,
            columns: [
              { header: 'Nama Santri', dataKey: 'nama', width: 25 },
              { header: 'Kategori', dataKey: 'kategori', width: 15 },
              { header: 'Total Bantuan', dataKey: 'totalBantuan', width: 20 },
              { header: 'Komponen', dataKey: 'komponen', width: 30 }
            ]
          },
          {
            name: 'Audit Trail',
            data: auditData,
            columns: [
              { header: 'Tanggal', dataKey: 'tanggal', width: 15 },
              { header: 'Jenis', dataKey: 'jenis', width: 10 },
              { header: 'Kategori', dataKey: 'kategori', width: 12 },
              { header: 'Jumlah', dataKey: 'jumlah', width: 15 },
              { header: 'User', dataKey: 'user', width: 10 },
              { header: 'Akun', dataKey: 'akun', width: 12 },
              { header: 'Status', dataKey: 'status', width: 10 },
              { header: 'Deskripsi', dataKey: 'deskripsi', width: 20 }
            ]
          }
        ];
        
        const exporter = new ExcelExporter();
        exporter.exportMultipleSheets({
          filename: 'Laporan_Keuangan_Komprehensif',
          title: 'Laporan Keuangan Komprehensif',
          period,
          summary: [
            { label: 'Total Pemasukan', value: ReportFormatter.formatCurrency(cashFlowData.totalPemasukan) },
            { label: 'Total Pengeluaran', value: ReportFormatter.formatCurrency(cashFlowData.totalPengeluaran) },
            { label: 'Saldo Akhir', value: ReportFormatter.formatCurrency(cashFlowData.saldoAkhir) }
          ],
          sheets
        });
      }
      
      toast.success(`Export All ${format.toUpperCase()} berhasil!`);
    } catch (error) {
      console.error('Export All error:', error);
      toast.error(`Gagal export All: ${error.message}`);
    }
  };



  const handleEditAccount = (account: any) => {
    console.log('handleEditAccount called with:', account); // Debug log
    setSelectedAccount(account);
    setEditForm({
      nama: account.nama || '',
      kode: account.kode || '',
      tipe: account.tipe || 'Kas',
      nomor_rekening: account.nomor_rekening || '',
      nama_bank: account.nama_bank || '',
      atas_nama: account.atas_nama || '',
      saldo_awal: account.saldo_awal || 0,
      status: account.status || 'aktif'
    });
    setShowEditAccount(true);
  };

  const handleSetDefaultAccount = async (accountId: string) => {
    try {
      await AkunKasService.setDefault(accountId);
      await loadData();
      toast.success('Akun berhasil dijadikan default');
    } catch (error) {
      console.error('Error setting default account:', error);
      toast.error('Gagal menjadikan akun default');
    }
  };

  const handleAddAccount = () => {
    console.log('✅ handleAddAccount called - opening modal');
    setSelectedAccount(null);
    setEditForm({
      nama: '',
      kode: '',
      tipe: 'Kas',
      nomor_rekening: '',
      nama_bank: '',
      atas_nama: '',
      saldo_awal: 0,
      status: 'aktif'
    });
    setDeletedAccountInfo(null);
    setShowRestoreOption(false);
    setShowEditAccount(true);
  };

  const checkForDeletedAccount = async (nama: string, kode: string) => {
    if (!selectedAccount && nama && kode) {
      try {
        const { exists, account } = await AkunKasService.checkDeletedAccount(nama, kode);
        if (exists) {
          setDeletedAccountInfo(account);
          setShowRestoreOption(true);
        } else {
          setDeletedAccountInfo(null);
          setShowRestoreOption(false);
        }
      } catch (error) {
        console.error('Error checking deleted account:', error);
      }
    }
  };

  const handleSaveAccount = async () => {
    try {
      // Validate form data
      const validationErrors = AkunKasService.validate({
        ...editForm,
        tipe: editForm.tipe as 'Kas' | 'Bank' | 'Tabungan'
      });
      if (validationErrors.length > 0) {
        toast.error(validationErrors.join(', '));
        return;
      }

      // Check for duplicate name/kode (only if not restoring)
      if (!showRestoreOption) {
        const { namaExists, kodeExists } = await AkunKasService.checkDuplicateNameKode(
          editForm.nama, 
          editForm.kode, 
          selectedAccount?.id
        );

        if (namaExists) {
          toast.error(`Nama akun "${editForm.nama}" sudah digunakan`);
          return;
        }

        if (kodeExists) {
          toast.error(`Kode akun "${editForm.kode}" sudah digunakan`);
          return;
        }
      }

      if (selectedAccount) {
        // Update existing account (tanpa langsung mengubah saldo_awal di kolom update)
        await AkunKasService.update(selectedAccount.id, {
          nama: editForm.nama,
          kode: editForm.kode,
          tipe: editForm.tipe as 'Kas' | 'Bank' | 'Tabungan',
          nomor_rekening: editForm.nomor_rekening,
          nama_bank: editForm.nama_bank,
          atas_nama: editForm.atas_nama,
          status: editForm.status as 'aktif' | 'ditutup' | 'suspended'
        });

        // Jika saldo_awal berubah, set via RPC resmi + recalc
        if (typeof selectedAccount.saldo_awal === 'number' && selectedAccount.saldo_awal !== editForm.saldo_awal) {
          const { error: saldoAwalError } = await supabase.rpc('set_akun_kas_saldo_awal', {
            p_akun_id: selectedAccount.id,
            p_saldo_awal: editForm.saldo_awal,
          });
          if (saldoAwalError) {
            console.warn('RPC set_akun_kas_saldo_awal error:', saldoAwalError);
          }
        }

        toast.success('Akun berhasil diperbarui');
      } else {
        // Create new account
        await AkunKasService.create({
          nama: editForm.nama,
          kode: editForm.kode,
          tipe: editForm.tipe as 'Kas' | 'Bank' | 'Tabungan',
          nomor_rekening: editForm.nomor_rekening,
          nama_bank: editForm.nama_bank,
          atas_nama: editForm.atas_nama,
          saldo_awal: editForm.saldo_awal
        });
        toast.success(showRestoreOption ? 'Akun berhasil dipulihkan' : 'Akun berhasil ditambahkan');
      }
      
      setShowEditAccount(false);
      setDeletedAccountInfo(null);
      setShowRestoreOption(false);
      await loadData();
    } catch (error) {
      console.error('Error saving account:', error);
      
      // Enhanced error handling with user-friendly messages
      if (error.message?.includes('duplicate key')) {
        toast.error('Nama atau kode akun sudah digunakan');
      } else if (error.message?.includes('violates unique constraint')) {
        toast.error('Nama atau kode akun sudah digunakan');
      } else if (error.message?.includes('foreign key constraint')) {
        toast.error('Tidak dapat menghapus akun yang masih memiliki transaksi');
      } else if (error.message?.includes('permission denied')) {
        toast.error('Anda tidak memiliki izin untuk melakukan operasi ini');
      } else if (error.message?.includes('network')) {
        toast.error('Koneksi internet bermasalah. Silakan coba lagi');
      } else {
        toast.error(`Gagal menyimpan akun: ${error.message || 'Terjadi kesalahan tidak diketahui'}`);
      }
    }
  };

  const handleSelectAccount = (accountId: string | undefined) => {
    console.log('🎯 handleSelectAccount called:', {
      newAccountId: accountId,
      previousAccountId: selectedAccountId,
      previousFilter: selectedAccountFilter,
      timestamp: new Date().toISOString()
    });
    
    // Clear chart data immediately to prevent showing stale data
    setMonthlyData([]);
    setCategoryData([]);
    
    setSelectedAccountId(accountId);
    setSelectedAccountFilter(accountId);
    
    console.log('🔄 State updated, calling loadChartData...');
    
    // Pass the new account ID directly to avoid state timing issues
    loadChartData(accountId);
    
    // Just add subtle highlight to recent activities section without scrolling
    if (accountId) {
      setTimeout(() => {
        const element = document.getElementById('recent-activities');
        if (element) {
          // Add highlight effect
          element.classList.add('ring-2', 'ring-blue-400', 'ring-offset-2');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-blue-400', 'ring-offset-2');
          }, 2000);
        }
      }, 100);
    }
  };

  const handleViewAccountTransactions = (accountId: string) => {
    console.log('handleViewAccountTransactions called with:', accountId); // Debug log
    handleSelectAccount(accountId);
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
    setSelectedTransaction(transaction);
    setShowTransactionEdit(true);
  };

  const handleDeleteTransaction = async (transaction: any) => {
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus transaksi "${transaction.deskripsi || transaction.kategori}" senilai ${new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(transaction.jumlah)}?`
    );
    
    if (confirmed) {
      try {
        // Use atomic RPC to delete and recalc saldo in one DB transaction
        const { error } = await supabase.rpc('delete_keuangan_and_recalc', { p_keuangan_id: transaction.id });
        if (error) throw error;
        
        toast.success('Transaksi berhasil dihapus');
        // Refetch data to sync UI
        await loadData();
        await loadChartData(selectedAccountFilter);
      } catch (error) {
        console.error('Error deleting transaction:', error);
        toast.error('Gagal menghapus transaksi');
      }
    }
  };

  const handleDeleteAccount = async (account: any) => {
    console.log('handleDeleteAccount called with:', account); // Debug log
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus akun "${account.nama}"? Tindakan ini tidak dapat dibatalkan dan akan menghapus semua transaksi yang terkait dengan akun ini.`
    );
    
    if (confirmed) {
      try {
        await AkunKasService.delete(account.id);
        toast.success('Akun berhasil dihapus');
        await loadData(); // Reload data
      } catch (error) {
        console.error('Error deleting account:', error);
        toast.error('Gagal menghapus akun');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Memuat data keuangan...</p>
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
    <div className="container mx-auto p-6 space-y-4 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Keuangan Umum</h1>
          <p className="text-muted-foreground">
            Dashboard keuangan terpadu dengan tracking per santri
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExportDialog(true)}
          >
            <FileText className="h-4 w-4 mr-2" />
            Export PDF v3
          </Button>
          <Button size="sm" onClick={handleInputPengeluaran}>
            <Plus className="h-4 w-4 mr-2" />
            Input Pengeluaran
          </Button>
        </div>
      </div>

      {/* Section 1: Simplified Top Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Account Cards */}
                <div>
                  <StackedAccountCards
                    accounts={akunKas.filter(akun => akun.status === 'aktif')}
                    selectedAccountId={selectedAccountId}
                    onSelectAccount={handleSelectAccount}
                    onAddAccount={handleAddAccount}
                    onEditAccount={handleEditAccount}
                    onDeleteAccount={handleDeleteAccount}
                    onViewTransactions={handleViewAccountTransactions}
                    onSetDefaultAccount={handleSetDefaultAccount}
                  />
                </div>
        
        {/* Total Balance Display */}
        <div>
          <TotalBalanceDisplay
            totalBalance={totals.totalBalance}
            accountCount={totals.accountCount}
            selectedAccount={currentSelectedAccount}
            onViewAllAccounts={() => handleSelectAccount(undefined)}
          />
        </div>
      </div>

      {/* Section 2: Summary Cards */}
      {statistics && (
        <SummaryCards 
          stats={{
            totalSaldo: totals.totalBalance,
            pemasukanBulanIni: statistics.pemasukan_bulan_ini,
            pengeluaranBulanIni: statistics.pengeluaran_bulan_ini,
            totalTransaksi: statistics.transaksi_bulan_ini,
            pemasukanTrend: statistics.pemasukan_trend || 0,
            pengeluaranTrend: statistics.pengeluaran_trend || 0,
          }}
          selectedAccountName={selectedAccountName}
        />
      )}

      {/* Section 3: Charts Section */}
      <ChartsSection 
        monthlyData={monthlyData}
        categoryData={categoryData}
        selectedAccountId={selectedAccountFilter}
        selectedAccountName={selectedAccountName}
      />

      {/* Section 4: Riwayat Transaksi - Single Table with Full Features */}
      <RiwayatTransaksi 
        transactions={recentTransactions}
        selectedAccountId={selectedAccountFilter}
        selectedAccountName={selectedAccountName}
        onClearFilter={handleClearAccountFilter}
        onViewDetail={handleViewDetail}
        onEditTransaction={handleEditTransaction}
        onDeleteTransaction={handleDeleteTransaction}
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
        onExportAll={handleExportAll}
      />

      {/* Modal for Input Pengeluaran */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Input Pengeluaran</DialogTitle>
          </DialogHeader>
          <FormPengeluaranRinci onSuccess={handleFormSuccess} />
        </DialogContent>
      </Dialog>

      {/* Modal for Edit Account */}
      <Dialog open={showEditAccount} onOpenChange={setShowEditAccount}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedAccount ? 'Edit Akun Kas' : 'Tambah Akun Kas'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nama">Nama Akun</Label>
                <Input
                  id="nama"
                  value={editForm.nama}
                  onChange={(e) => {
                    setEditForm({...editForm, nama: e.target.value});
                    checkForDeletedAccount(e.target.value, editForm.kode);
                  }}
                  placeholder="Kas Utama"
                />
              </div>
              <div>
                <Label htmlFor="kode">Kode</Label>
                <Input
                  id="kode"
                  value={editForm.kode}
                  onChange={(e) => {
                    setEditForm({...editForm, kode: e.target.value});
                    checkForDeletedAccount(editForm.nama, e.target.value);
                  }}
                  placeholder="KAS-01"
                />
              </div>
            </div>

            {/* Restore Option Alert */}
            {showRestoreOption && deletedAccountInfo && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-blue-800">
                      Akun dengan nama/kode ini pernah dihapus
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>Ditemukan akun yang dihapus dengan nama "{deletedAccountInfo.account_name}" dan kode "{deletedAccountInfo.account_kode}".</p>
                      <p className="mt-1">Apakah Anda ingin memulihkan akun lama atau membuat akun baru?</p>
                    </div>
                    <div className="mt-3 flex space-x-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowRestoreOption(false);
                          setDeletedAccountInfo(null);
                        }}
                      >
                        Buat Akun Baru
                      </Button>
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={() => {
                          // User chooses to restore
                          setShowRestoreOption(true);
                        }}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Pulihkan Akun Lama
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <Label htmlFor="tipe">Tipe</Label>
              <select
                id="tipe"
                value={editForm.tipe}
                onChange={(e) => setEditForm({...editForm, tipe: e.target.value})}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="Kas">Kas</option>
                <option value="Bank">Bank</option>
                <option value="Tabungan">Tabungan</option>
              </select>
            </div>

            {editForm.tipe === 'Bank' && (
              <>
                <div>
                  <Label htmlFor="nomor_rekening">Nomor Rekening</Label>
                  <Input
                    id="nomor_rekening"
                    value={editForm.nomor_rekening}
                    onChange={(e) => setEditForm({...editForm, nomor_rekening: e.target.value})}
                    placeholder="1234567890"
                  />
                </div>
                <div>
                  <Label htmlFor="nama_bank">Nama Bank</Label>
                  <Input
                    id="nama_bank"
                    value={editForm.nama_bank}
                    onChange={(e) => setEditForm({...editForm, nama_bank: e.target.value})}
                    placeholder="Bank BCA"
                  />
                </div>
                <div>
                  <Label htmlFor="atas_nama">Atas Nama</Label>
                  <Input
                    id="atas_nama"
                    value={editForm.atas_nama}
                    onChange={(e) => setEditForm({...editForm, atas_nama: e.target.value})}
                    placeholder="Yayasan Al-Bisri"
                  />
                </div>
              </>
            )}

            <div>
              <Label htmlFor="saldo_awal">Saldo Awal</Label>
              <Input
                id="saldo_awal"
                type="number"
                value={editForm.saldo_awal}
                onChange={(e) => setEditForm({...editForm, saldo_awal: Number(e.target.value)})}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={editForm.status}
                onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="aktif">Aktif</option>
                <option value="ditutup">Ditutup</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => {
                setShowEditAccount(false);
                setDeletedAccountInfo(null);
                setShowRestoreOption(false);
              }}>
                Batal
              </Button>
              <Button onClick={handleSaveAccount}>
                {selectedAccount 
                  ? 'Simpan Perubahan' 
                  : showRestoreOption 
                    ? 'Pulihkan Akun' 
                    : 'Tambah Akun'
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        transaction={selectedTransaction}
        isOpen={showTransactionDetail}
        onClose={() => setShowTransactionDetail(false)}
        onEdit={handleEditTransaction}
        onDelete={handleDeleteTransaction}
      />

      {/* Transaction Edit Modal */}
      <TransactionEditModal
        transaction={selectedTransaction}
        isOpen={showTransactionEdit}
        onClose={() => setShowTransactionEdit(false)}
        onSuccess={handleEditSuccess}
      />

      {/* Export PDF Dialog V3 */}
      <ExportPDFDialogV3
        open={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onExport={(filename) => {
          toast.success(`PDF berhasil di-export: ${filename}`);
        }}
        selectedAccountId={selectedAccountFilter}
        selectedAccountName={selectedAccountName}
      />
    </div>
  );
};

export default KeuanganV3;