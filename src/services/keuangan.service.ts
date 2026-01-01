import { supabase } from '@/integrations/supabase/client';
import { 
  excludeTabunganTransactions, 
  applyTabunganExclusionFilter,
  excludeTabunganAccounts,
  isTabunganAccount,
  excludeKoperasiTransactions,
  applyKoperasiExclusionFilter,
  excludeKoperasiAccounts,
  isKoperasiAccount
} from '@/utils/keuanganFilters';

// Constants
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DOUBLE_ENTRY_CHECK_WINDOW_MS = 5 * 60 * 1000; // 5 minutes in milliseconds
const DEFAULT_DATE_RANGE_DAYS = 30;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

// Source module prefixes for system-generated transactions
const SYSTEM_SOURCE_MODULES = [
  'inventaris',
  'inventory_sale',
  'donasi',
  'pembayaran_santri',
  'transfer_yayasan'
] as const;

// Types
export interface KeuanganData {
  jenis_transaksi: 'Pemasukan' | 'Pengeluaran';
  kategori: string;
  jumlah: number;
  tanggal: string;
  deskripsi?: string;
  referensi?: string;
  akun_kas_id?: string;
  status?: 'draft' | 'verified' | 'posted' | 'cancelled';
  auto_posted?: boolean;
}

export interface KeuanganStats {
  totalSaldo: number;
  pemasukanBulanIni: number;
  pengeluaranBulanIni: number;
  pendingTagihan: number;
}

interface EnhancedKeuanganData extends KeuanganData {
  source_module?: string | null;
  source_id?: string;
}

interface KeuanganTransaction {
  id?: string;
  jumlah: number;
  auto_posted?: boolean;
  source_module?: string | null;
  jenis_transaksi?: 'Pemasukan' | 'Pengeluaran';
  tanggal?: string;
  akun_kas?: {
    managed_by?: string | null;
  } | Array<{
    managed_by?: string | null;
  }>;
  [key: string]: unknown;
}

/**
 * Enhanced double entry detection with better accuracy
 * Checks for duplicate transactions by source module/ID and referensi pattern
 */
export const checkDoubleEntry = async (
  sourceModule: string,
  sourceId: string,
  referensi: string,
  jumlah: number,
  tanggal: string
): Promise<boolean> => {
  try {
    // Check by source module and source ID (most accurate)
    const { data: bySource, error: sourceError } = await supabase
      .from('keuangan')
      .select('id')
      .eq('source_module', sourceModule)
      .eq('source_id', sourceId)
      .eq('auto_posted', true);
    
    if (sourceError) {
      console.error('Error checking double entry by source:', sourceError);
      throw sourceError;
    }
    
    if (bySource && bySource.length > 0) {
      return true;
    }
    
    // Check by referensi pattern (fallback)
    const timeWindow = new Date(Date.now() - DOUBLE_ENTRY_CHECK_WINDOW_MS);
    const { data: byReferensi, error: referensiError } = await supabase
      .from('keuangan')
      .select('id')
      .eq('referensi', referensi)
      .eq('auto_posted', true)
      .gte('created_at', timeWindow.toISOString());
    
    if (referensiError) {
      console.error('Error checking double entry by referensi:', referensiError);
      throw referensiError;
    }
    
    return byReferensi && byReferensi.length > 0;
  } catch (error) {
    console.error('Error in checkDoubleEntry:', error);
    throw error;
  }
};

/**
 * Check if a referensi indicates a system-generated transaction
 */
const isSystemGeneratedTransaction = (referensi?: string): boolean => {
  if (!referensi) return false;
  return SYSTEM_SOURCE_MODULES.some(module => referensi.startsWith(`${module}:`));
};

/**
 * Validate and extract UUID from referensi
 */
const extractSourceInfo = (referensi?: string): { sourceModule: string | null; sourceId: string | null; isValidUUID: boolean } => {
  if (!referensi || !referensi.includes(':')) {
    return { sourceModule: null, sourceId: null, isValidUUID: false };
  }
  
  const parts = referensi.split(':');
  const sourceModule = parts[0] || null;
  const sourceId = parts[1] || null;
  const isValidUUID = sourceId ? UUID_REGEX.test(sourceId) : false;
  
  return { sourceModule, sourceId, isValidUUID };
};

/**
 * Enhanced keuangan transaction with better double entry validation
 * Validates and inserts a new financial transaction with duplicate detection
 */
export const addKeuanganTransaction = async (data: KeuanganData): Promise<unknown[]> => {
  try {
    // Enhanced validation for auto-posted transactions
    // Only check double entry if source_id is a valid UUID
    if (data.referensi && data.referensi.includes(':')) {
      const { sourceModule, sourceId, isValidUUID } = extractSourceInfo(data.referensi);
      
      // Only check double entry if sourceId is a valid UUID
      // Skip for referensi like "transfer_yayasan:2025-09" which is not a UUID
      if (sourceModule && sourceId && isValidUUID) {
        const isDuplicate = await checkDoubleEntry(
          sourceModule,
          sourceId,
          data.referensi,
          data.jumlah,
          data.tanggal
        );
        
        if (isDuplicate) {
          throw new Error(`Double entry detected for ${sourceModule}:${sourceId}`);
        }
      }
    }
    
    // Detect if this is a system fallback (not manual user entry)
    // If referensi indicates from another module (inventaris, donasi, etc),
    // then this is an auto-posted system entry, not a manual entry
    const isSystemFallback = isSystemGeneratedTransaction(data.referensi);
    
    // Extract source information for enhanced tracking
    const { sourceModule, sourceId, isValidUUID } = extractSourceInfo(data.referensi);
    
    const enhancedData: EnhancedKeuanganData = {
      ...data,
      // Set auto_posted = TRUE if this is a system fallback, FALSE if manual user
      auto_posted: isSystemFallback ? true : (data.auto_posted ?? false),
      source_module: sourceModule,
      // Only set source_id if valid UUID (don't set for referensi like "transfer_yayasan:2025-09")
      ...(isValidUUID && sourceId ? { source_id: sourceId } : {})
    };
    
    const { data: result, error } = await supabase
      .from('keuangan')
      .insert([enhancedData])
      .select();

    if (error) {
      console.error('Error inserting keuangan transaction:', error);
      throw error;
    }
    
    if (!result || result.length === 0) {
      throw new Error('Failed to insert keuangan transaction: No data returned');
    }
    
    return result;
  } catch (error) {
    console.error('Error in addKeuanganTransaction:', error);
    throw error;
  }
};

/**
 * Calculate unique transactions by deduplicating based on source, amount, and auto_posted status
 */
const deduplicateTransactions = (transactions: KeuanganTransaction[]): KeuanganTransaction[] => {
  const uniqueMap = new Map<string, KeuanganTransaction>();
  
  for (const item of transactions) {
    const key = `${item.source_module || 'manual'}_${item.jumlah}_${item.auto_posted || false}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, item);
    }
  }
  
  return Array.from(uniqueMap.values());
};

/**
 * Get start of current month date
 */
const getStartOfCurrentMonth = (): Date => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  return startOfMonth;
};

/**
 * Enhanced dashboard stats using database views for better performance
 */
export const getKeuanganDashboardStats = async (): Promise<KeuanganStats> => {
  try {
    const startOfMonth = getStartOfCurrentMonth();

    // Get total saldo dari akun_kas
    // EXCLUDE accounts managed by tabungan and koperasi modules (using shared utility)
    const { data: akunKas, error: akunKasError } = await supabase
      .from('akun_kas')
      .select('saldo_saat_ini, managed_by')
      .eq('status', 'aktif');

    if (akunKasError) {
      console.error('Error fetching akun kas:', akunKasError);
      throw akunKasError;
    }

    // Only count accounts not managed by tabungan or koperasi (using shared utility)
    const filteredAkunKas = excludeKoperasiAccounts(excludeTabunganAccounts(akunKas));
    const totalSaldo = filteredAkunKas.reduce((sum, akun) => sum + (akun.saldo_saat_ini || 0), 0);

    // Get pemasukan bulan ini (using improved filtering)
    // Exclude tabungan and koperasi transactions (using shared utility)
    let pemasukanQuery = supabase
      .from('keuangan')
      .select('jumlah, auto_posted, source_module, akun_kas(managed_by)')
      .eq('jenis_transaksi', 'Pemasukan')
      .eq('status', 'posted')
      .gte('tanggal', startOfMonth.toISOString());
    
    pemasukanQuery = applyTabunganExclusionFilter(pemasukanQuery);
    
    const { data: pemasukan, error: pemasukanError } = await pemasukanQuery;

    if (pemasukanError) {
      console.error('Error fetching pemasukan:', pemasukanError);
      throw pemasukanError;
    }

    // Filter out tabungan and koperasi transactions and potential duplicates (using shared utility)
    const filteredPemasukan = excludeKoperasiTransactions(excludeTabunganTransactions(pemasukan || []));
    const uniquePemasukan = deduplicateTransactions(filteredPemasukan);
    const pemasukanBulanIni = uniquePemasukan.reduce((sum, item) => sum + (item.jumlah || 0), 0);

    // Get pengeluaran bulan ini
    // Exclude tabungan and koperasi transactions (using shared utility)
    let pengeluaranQuery = supabase
      .from('keuangan')
      .select('jumlah, source_module, akun_kas(managed_by)')
      .eq('jenis_transaksi', 'Pengeluaran')
      .eq('status', 'posted')
      .gte('tanggal', startOfMonth.toISOString());
    
    pengeluaranQuery = applyTabunganExclusionFilter(pengeluaranQuery);
    
    const { data: pengeluaran, error: pengeluaranError } = await pengeluaranQuery;

    if (pengeluaranError) {
      console.error('Error fetching pengeluaran:', pengeluaranError);
      throw pengeluaranError;
    }

    // Filter out tabungan and koperasi transactions (using shared utility)
    const filteredPengeluaran = excludeKoperasiTransactions(excludeTabunganTransactions(pengeluaran || []));
    const pengeluaranBulanIni = filteredPengeluaran.reduce((sum, item) => sum + (item.jumlah || 0), 0);

    // Get pending tagihan
    const { data: pendingTagihan, error: tagihanError } = await supabase
      .from('tagihan_santri')
      .select('id')
      .eq('status', 'pending');

    if (tagihanError) {
      console.error('Error fetching pending tagihan:', tagihanError);
      throw tagihanError;
    }

    const pendingTagihanCount = pendingTagihan?.length || 0;
      
    return {
      totalSaldo,
      pemasukanBulanIni,
      pengeluaranBulanIni,
      pendingTagihan: pendingTagihanCount
    };
  } catch (error) {
    console.error('Error in getKeuanganDashboardStats:', error);
    throw error;
  }
};

/**
 * Get stats per akun kas - FIXED: Menghitung statistik per akun kas tertentu
 */
export interface AkunKasStats {
  totalSaldo: number;
  pemasukanBulanIni: number;
  pengeluaranBulanIni: number;
  totalTransaksi: number;
  pemasukanTrend: number;
  pengeluaranTrend: number;
}

/**
 * Get month boundaries for a given year and month
 */
const getMonthBoundaries = (year: number, month: number) => {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59);
  return { start, end };
};

/**
 * Calculate trend percentage between two values
 */
const calculateTrend = (current: number, previous: number): number => {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

/**
 * Filter transactions by date range
 */
const filterTransactionsByDateRange = (
  transactions: KeuanganTransaction[],
  startDate: Date,
  endDate: Date
): KeuanganTransaction[] => {
  return transactions.filter(t => {
    if (!t.tanggal || typeof t.tanggal !== 'string') {
      return false;
    }
    const transactionDate = new Date(t.tanggal);
    return transactionDate >= startDate && transactionDate <= endDate;
  });
};

/**
 * Calculate total amount for a transaction type
 */
const calculateTotalByType = (
  transactions: KeuanganTransaction[],
  jenisTransaksi: 'Pemasukan' | 'Pengeluaran'
): number => {
  return transactions
    .filter(t => t.jenis_transaksi === jenisTransaksi)
    .reduce((sum, t) => sum + (t.jumlah || 0), 0);
};

/**
 * Get stats per akun kas - FIXED: Menghitung statistik per akun kas tertentu
 */
export const getAkunKasStats = async (akunKasId?: string): Promise<AkunKasStats> => {
  try {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    // Get month boundaries
    const { start: startOfCurrentMonth, end: endOfCurrentMonth } = getMonthBoundaries(currentYear, currentMonth);
    const { start: startOfPrevMonth, end: endOfPrevMonth } = getMonthBoundaries(currentYear, currentMonth - 1);

    let query = supabase.from('keuangan').select('*, akun_kas(managed_by)');

    // Exclude tabungan santri transactions (using shared utility)
    query = applyTabunganExclusionFilter(query);

    // Filter by akun kas if provided
    if (akunKasId) {
      query = query.eq('akun_kas_id', akunKasId);
    }

    const { data: allTransactions, error: transactionsError } = await query;
    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      throw transactionsError;
    }
    
    // Additional client-side filtering to exclude tabungan and koperasi transactions (using shared utility)
    const filteredTransactions = excludeKoperasiTransactions(
      excludeTabunganTransactions(allTransactions || [])
    );

    // Get akun kas saldo
    // EXCLUDE accounts managed by tabungan and koperasi modules from total saldo (using shared utility)
    let totalSaldo = 0;
    if (akunKasId) {
      const { data: akunKas, error: akunKasError } = await supabase
        .from('akun_kas')
        .select('saldo_saat_ini, managed_by')
        .eq('id', akunKasId)
        .single();
      
      if (akunKasError) {
        console.error('Error fetching akun kas:', akunKasError);
        throw akunKasError;
      }
      
      // Only count if not managed by tabungan or koperasi (using shared utility)
      if (akunKas && !isTabunganAccount(akunKas) && !isKoperasiAccount(akunKas)) {
        totalSaldo = akunKas.saldo_saat_ini || 0;
      }
    } else {
      const { data: allAkun, error: allAkunError } = await supabase
        .from('akun_kas')
        .select('saldo_saat_ini, managed_by')
        .eq('status', 'aktif');
      
      if (allAkunError) {
        console.error('Error fetching all akun kas:', allAkunError);
        throw allAkunError;
      }
      
      // Only count accounts not managed by tabungan or koperasi (using shared utility)
      const filteredAkun = excludeKoperasiAccounts(excludeTabunganAccounts(allAkun));
      totalSaldo = filteredAkun.reduce((sum, akun) => sum + (akun.saldo_saat_ini || 0), 0);
    }

    // Filter transactions by month
    const currentMonthTransactions = filterTransactionsByDateRange(
      filteredTransactions,
      startOfCurrentMonth,
      endOfCurrentMonth
    );

    const prevMonthTransactions = filterTransactionsByDateRange(
      filteredTransactions,
      startOfPrevMonth,
      endOfPrevMonth
    );

    // Calculate current month stats
    const pemasukanBulanIni = calculateTotalByType(currentMonthTransactions, 'Pemasukan');
    const pengeluaranBulanIni = calculateTotalByType(currentMonthTransactions, 'Pengeluaran');

    // Calculate previous month stats for trend
    const pemasukanBulanLalu = calculateTotalByType(prevMonthTransactions, 'Pemasukan');
    const pengeluaranBulanLalu = calculateTotalByType(prevMonthTransactions, 'Pengeluaran');

    // Calculate trends
    const pemasukanTrend = calculateTrend(pemasukanBulanIni, pemasukanBulanLalu);
    const pengeluaranTrend = calculateTrend(pengeluaranBulanIni, pengeluaranBulanLalu);

    return {
      totalSaldo,
      pemasukanBulanIni,
      pengeluaranBulanIni,
      totalTransaksi: currentMonthTransactions.length,
      pemasukanTrend,
      pengeluaranTrend
    };
  } catch (error) {
    console.error('Error in getAkunKasStats:', error);
    throw error;
  }
};

/**
 * Get akun kas detail
 */
export const getAkunKasDetail = async (): Promise<unknown> => {
  try {
    const { data, error } = await supabase
      .from('view_akun_kas_detail')
      .select('*')
      .order('is_default', { ascending: false });

    if (error) {
      console.error('Error fetching akun kas detail:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in getAkunKasDetail:', error);
    throw error;
  }
};

/**
 * Get total saldo semua akun
 */
export const getTotalSaldoSemuaAkun = async (): Promise<unknown> => {
  try {
    const { data, error } = await supabase
      .from('view_total_saldo_semua_akun')
      .select('*')
      .single();

    if (error) {
      console.error('Error fetching total saldo semua akun:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in getTotalSaldoSemuaAkun:', error);
    throw error;
  }
};

/**
 * Get default date range for queries (last N days)
 */
const getDefaultDateRange = (days: number = DEFAULT_DATE_RANGE_DAYS): { start: string; end: string } => {
  const endDate = new Date();
  const startDate = new Date(Date.now() - days * MILLISECONDS_PER_DAY);
  
  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0]
  };
};

/**
 * Enhanced monitoring using database views
 */
export const monitorDoubleEntry = async (): Promise<unknown[]> => {
  try {
    // Use the database view for better performance
    const { data: doubleEntries, error } = await supabase
      .from('v_potential_double_entries')
      .select('*');
    
    if (error) {
      console.error('Error monitoring double entries:', error);
      throw error;
    }
    
    if (doubleEntries && doubleEntries.length > 0) {
      console.warn('Potential double entries detected:', doubleEntries);
      return doubleEntries;
    }
    
    return [];
  } catch (error) {
    console.error('Error in monitorDoubleEntry:', error);
    throw error;
  }
};

/**
 * Get auto-posted transactions summary
 */
export const getAutoPostedSummary = async (startDate?: string, endDate?: string): Promise<unknown> => {
  try {
    const dateRange = getDefaultDateRange();
    const { data, error } = await supabase.rpc('get_auto_posted_summary', {
      p_start_date: startDate || dateRange.start,
      p_end_date: endDate || dateRange.end
    });
    
    if (error) {
      console.error('Error fetching auto-posted summary:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in getAutoPostedSummary:', error);
    throw error;
  }
};

/**
 * Reconcile auto-posted transactions with source records
 */
export const reconcileAutoPostedTransactions = async (): Promise<unknown> => {
  try {
    const { data, error } = await supabase.rpc('reconcile_auto_posted_transactions');
    
    if (error) {
      console.error('Error reconciling auto-posted transactions:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in reconcileAutoPostedTransactions:', error);
    throw error;
  }
};

/**
 * Get orphaned keuangan entries
 */
export const getOrphanedKeuangan = async (): Promise<unknown> => {
  try {
    const { data, error } = await supabase
      .from('v_orphaned_keuangan')
      .select('*');
    
    if (error) {
      console.error('Error fetching orphaned keuangan:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in getOrphanedKeuangan:', error);
    throw error;
  }
};

/**
 * Create double entry alert
 */
export async function createDoubleEntryAlert(
  transactionType: string,
  transactionId: string,
  amount: number,
  description: string
): Promise<unknown> {
  try {
    const { data, error } = await supabase.rpc('create_double_entry_alert', {
      p_transaction_type: transactionType,
      p_transaction_id: transactionId,
      p_amount: amount,
      p_description: description
    });
    
    if (error) {
      console.error('Error creating double entry alert:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in createDoubleEntryAlert:', error);
    throw error;
  }
}

/**
 * Get duplicate keuangan report
 */
export async function getDuplicateKeuanganReport(): Promise<unknown[]> {
  try {
    const { data, error } = await supabase.rpc('get_duplicate_keuangan_summary');
    
    if (error) {
      console.error('Error fetching duplicate keuangan report:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getDuplicateKeuanganReport:', error);
    throw error;
  }
}

/**
 * Get financial statistics for a specific date range (for Laporan Keuangan Yayasan)
 */
export interface FinancialStatsByDateRange {
  totalSaldo: number;
  pemasukan: number;
  pengeluaran: number;
  totalPemasukanTransaksi: number;
  totalPengeluaranTransaksi: number;
  danaTerikat: number;
  danaTidakTerikat: number;
  pemasukanTrend: number;
  pengeluaranTrend: number;
  penyesuaianSaldoInfo?: {
    jumlah: number; // Net penyesuaian saldo (pemasukan - pengeluaran) dalam periode
    jumlahTransaksi: number; // Jumlah transaksi penyesuaian saldo
    adaPenyesuaian: boolean; // Flag apakah ada penyesuaian saldo dalam periode
  };
}

export const getFinancialStatsByDateRange = async (
  startDate: string,
  endDate: string
): Promise<FinancialStatsByDateRange> => {
  try {
    // Get total saldo (current, not filtered by date)
    const { data: allAkun, error: allAkunError } = await supabase
      .from('akun_kas')
      .select('saldo_saat_ini, managed_by')
      .eq('status', 'aktif');
    
    if (allAkunError) {
      console.error('Error fetching all akun kas:', allAkunError);
      throw allAkunError;
    }
    
    // Filter out koperasi and tabungan accounts
    const filteredAkun = excludeKoperasiAccounts(excludeTabunganAccounts(allAkun));
    
    // Calculate total saldo
    // Note: fund_type column doesn't exist, so all funds are considered tidak_terikat
    let totalSaldo = 0;
    const danaTerikat = 0;
    let danaTidakTerikat = 0;
    
    filteredAkun.forEach(akun => {
      const saldo = akun.saldo_saat_ini || 0;
      totalSaldo += saldo;
      // Since fund_type doesn't exist, all funds are tidak_terikat
      danaTidakTerikat += saldo;
    });
    
    // Get transactions in date range
    let query = supabase
      .from('keuangan')
      .select('*, akun_kas(managed_by)')
      .eq('status', 'posted')
      .eq('ledger', 'UMUM')
      .gte('tanggal', startDate)
      .lte('tanggal', endDate);
    
    // Exclude tabungan and koperasi
    query = applyTabunganExclusionFilter(query);
    query = applyKoperasiExclusionFilter(query);
    
    const { data: transactions, error: transactionsError } = await query;
    
    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      throw transactionsError;
    }
    
    // Filter client-side (backup)
    const filteredTransactions = excludeKoperasiTransactions(
      excludeTabunganTransactions(transactions || [])
    );
    
    // Calculate stats
    const pemasukanTransactions = filteredTransactions.filter(t => t.jenis_transaksi === 'Pemasukan');
    const pengeluaranTransactions = filteredTransactions.filter(t => t.jenis_transaksi === 'Pengeluaran');
    
    const pemasukan = pemasukanTransactions.reduce((sum, t) => sum + (Number(t.jumlah) || 0), 0);
    const pengeluaran = pengeluaranTransactions.reduce((sum, t) => sum + (Number(t.jumlah) || 0), 0);
    
    // Calculate previous period for trend (same duration before startDate)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const duration = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - duration);
    const prevEnd = new Date(start.getTime() - 1);
    
    let prevQuery = supabase
      .from('keuangan')
      .select('*, akun_kas(managed_by)')
      .eq('status', 'posted')
      .eq('ledger', 'UMUM')
      .gte('tanggal', prevStart.toISOString().split('T')[0])
      .lte('tanggal', prevEnd.toISOString().split('T')[0]);
    
    prevQuery = applyTabunganExclusionFilter(prevQuery);
    prevQuery = applyKoperasiExclusionFilter(prevQuery);
    
    const { data: prevTransactions, error: prevError } = await prevQuery;
    
    let pemasukanTrend = 0;
    let pengeluaranTrend = 0;
    
    if (!prevError && prevTransactions) {
      const filteredPrevTransactions = excludeKoperasiTransactions(
        excludeTabunganTransactions(prevTransactions)
      );
      
      const prevPemasukan = filteredPrevTransactions
        .filter(t => t.jenis_transaksi === 'Pemasukan')
        .reduce((sum, t) => sum + (Number(t.jumlah) || 0), 0);
      
      const prevPengeluaran = filteredPrevTransactions
        .filter(t => t.jenis_transaksi === 'Pengeluaran')
        .reduce((sum, t) => sum + (Number(t.jumlah) || 0), 0);
      
      pemasukanTrend = calculateTrend(pemasukan, prevPemasukan);
      pengeluaranTrend = calculateTrend(pengeluaran, prevPengeluaran);
    }
    
    // Calculate penyesuaian saldo info (check if there are "Penyesuaian Saldo" transactions)
    const penyesuaianSaldoTransactions = filteredTransactions.filter(
      t => t.kategori === 'Penyesuaian Saldo'
    );
    
    const penyesuaianSaldoPemasukan = penyesuaianSaldoTransactions
      .filter(t => t.jenis_transaksi === 'Pemasukan')
      .reduce((sum, t) => sum + (Number(t.jumlah) || 0), 0);
    
    const penyesuaianSaldoPengeluaran = penyesuaianSaldoTransactions
      .filter(t => t.jenis_transaksi === 'Pengeluaran')
      .reduce((sum, t) => sum + (Number(t.jumlah) || 0), 0);
    
    const netPenyesuaianSaldo = penyesuaianSaldoPemasukan - penyesuaianSaldoPengeluaran;
    
    return {
      totalSaldo,
      pemasukan,
      pengeluaran,
      totalPemasukanTransaksi: pemasukanTransactions.length,
      totalPengeluaranTransaksi: pengeluaranTransactions.length,
      danaTerikat,
      danaTidakTerikat,
      pemasukanTrend,
      pengeluaranTrend,
      penyesuaianSaldoInfo: {
        jumlah: netPenyesuaianSaldo,
        jumlahTransaksi: penyesuaianSaldoTransactions.length,
        adaPenyesuaian: penyesuaianSaldoTransactions.length > 0,
      },
    };
  } catch (error) {
    console.error('Error in getFinancialStatsByDateRange:', error);
    throw error;
  }
};
