import { supabase } from '@/integrations/supabase/client';
// Fixed imports and functions for accurate statistics
// Shared utilities untuk filtering (Phase 1 & 2 refactoring)
import { 
  excludeTabunganTransactions, 
  applyTabunganExclusionFilter,
  excludeTabunganAccounts,
  isTabunganAccount,
  excludeKoperasiTransactions,
  excludeKoperasiAccounts,
  isKoperasiAccount
} from '@/utils/keuanganFilters';

export interface KeuanganData {
  jenis_transaksi: 'Pemasukan' | 'Pengeluaran';
  kategori: string;
  jumlah: number;
  tanggal: string;
  deskripsi?: string;
  referensi?: string;
  akun_kas_id?: string;
  status?: 'draft' | 'verified' | 'posted' | 'cancelled';
}

export interface KeuanganStats {
  totalSaldo: number;
  pemasukanBulanIni: number;
  pengeluaranBulanIni: number;
  pendingTagihan: number;
}

/**
 * Enhanced double entry detection with better accuracy
 */
export const checkDoubleEntry = async (
  sourceModule: string,
  sourceId: string,
  referensi: string,
  jumlah: number,
  tanggal: string
): Promise<boolean> => {
  // Check by source module and source ID (most accurate)
  const { data: bySource } = await supabase
    .from('keuangan')
    .select('id')
    .eq('source_module', sourceModule)
    .eq('source_id', sourceId)
    .eq('auto_posted', true);
  
  if (bySource && bySource.length > 0) {
    return true;
  }
  
  // Check by referensi pattern (fallback)
  const { data: byReferensi } = await supabase
    .from('keuangan')
    .select('id')
    .eq('referensi', referensi)
    .eq('auto_posted', true)
    .gte('created_at', new Date(Date.now() - 300000).toISOString()); // 5 menit terakhir
  
  return byReferensi && byReferensi.length > 0;
};

/**
 * Enhanced keuangan transaction with better double entry validation
 */
export const addKeuanganTransaction = async (data: KeuanganData): Promise<any> => {
  // Enhanced validation for auto-posted transactions
  if (data.referensi && data.referensi.includes(':')) {
    const [sourceModule, sourceId] = data.referensi.split(':');
    
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
  
  // Deteksi apakah ini adalah fallback sistem (bukan manual user)
  // Jika ada referensi yang mengindikasikan dari modul lain (inventaris, donasi, dll),
  // maka ini adalah auto-posted system entry, bukan manual entry
  const isSystemFallback = data.referensi && (
    data.referensi.startsWith('inventaris:') ||
    data.referensi.startsWith('inventory_sale:') ||
    data.referensi.startsWith('donasi:') ||
    data.referensi.startsWith('pembayaran_santri:')
  );
  
  // Insert transaksi with enhanced tracking
  const enhancedData = {
    ...data,
    // Set auto_posted = TRUE jika ini adalah fallback sistem, FALSE jika manual user
    auto_posted: isSystemFallback ? true : (data.auto_posted ?? false),
    source_module: data.referensi?.split(':')[0] || null,
    source_id: data.referensi?.split(':')[1] || null
    // Note: audit_trail field removed - column doesn't exist in keuangan table
  };
  
  const { data: result, error } = await supabase
    .from('keuangan')
    .insert([enhancedData])
    .select();

  if (error) throw error;
  return result;
};

/**
 * Enhanced dashboard stats using database views for better performance
 */
export const getKeuanganDashboardStats = async (): Promise<KeuanganStats> => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Get total saldo dari akun_kas
  // EXCLUDE accounts managed by tabungan and koperasi modules (using shared utility)
  const { data: akunKas } = await supabase
    .from('akun_kas')
    .select('saldo_saat_ini, managed_by')
    .eq('status', 'aktif');

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
    
  const { data: pemasukan } = await pemasukanQuery;

  // Filter out tabungan and koperasi transactions and potential duplicates (using shared utility)
  const filteredPemasukan = excludeKoperasiTransactions(excludeTabunganTransactions(pemasukan));
  
  // Filter out potential duplicates (keep only one per source)
  const uniquePemasukan = filteredPemasukan.reduce((acc, item) => {
    const key = `${item.source_module || 'manual'}_${item.jumlah}_${item.auto_posted}`;
    if (!acc.has(key)) {
      acc.set(key, item);
    }
    return acc;
  }, new Map()).values();

  const pemasukanBulanIni = Array.from(uniquePemasukan).reduce((sum, item) => sum + (item.jumlah || 0), 0);

  // Get pengeluaran bulan ini
  // Exclude tabungan and koperasi transactions (using shared utility)
  let pengeluaranQuery = supabase
    .from('keuangan')
    .select('jumlah, source_module, akun_kas(managed_by)')
    .eq('jenis_transaksi', 'Pengeluaran')
    .eq('status', 'posted')
    .gte('tanggal', startOfMonth.toISOString());
  
  pengeluaranQuery = applyTabunganExclusionFilter(pengeluaranQuery);
    
  const { data: pengeluaran } = await pengeluaranQuery;
  
  // Filter out tabungan and koperasi transactions (using shared utility)
  const filteredPengeluaran = excludeKoperasiTransactions(excludeTabunganTransactions(pengeluaran));

  const pengeluaranBulanIni = filteredPengeluaran.reduce((sum, item) => sum + (item.jumlah || 0), 0);

  // Get pending tagihan
  const { data: pendingTagihan } = await supabase
    .from('tagihan_santri')
    .select('id')
    .eq('status', 'pending');

  const pendingTagihanCount = pendingTagihan?.length || 0;
      
  return {
    totalSaldo,
    pemasukanBulanIni,
    pengeluaranBulanIni,
    pendingTagihan: pendingTagihanCount
  };
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

export const getAkunKasStats = async (akunKasId?: string): Promise<AkunKasStats> => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  // Start and end of current month
  const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
  const endOfCurrentMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
  
  // Start and end of previous month for trend calculation
  const startOfPrevMonth = new Date(currentYear, currentMonth - 1, 1);
  const endOfPrevMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);

  let query = supabase.from('keuangan').select('*, akun_kas(managed_by)');

  // Exclude tabungan santri transactions (using shared utility)
  query = applyTabunganExclusionFilter(query);

  // Filter by akun kas if provided
  if (akunKasId) {
    query = query.eq('akun_kas_id', akunKasId);
  }

  const { data: allTransactions, error } = await query;
  if (error) throw error;
  
  // Additional client-side filtering to exclude tabungan and koperasi transactions (using shared utility)
  const filteredTransactions = excludeKoperasiTransactions(excludeTabunganTransactions(allTransactions));

  // Get akun kas saldo
  // EXCLUDE accounts managed by tabungan and koperasi modules from total saldo (using shared utility)
  let totalSaldo = 0;
  if (akunKasId) {
    const { data: akunKas } = await supabase
      .from('akun_kas')
      .select('saldo_saat_ini, managed_by')
      .eq('id', akunKasId)
      .single();
    
    // Only count if not managed by tabungan or koperasi (using shared utility)
    if (akunKas && !isTabunganAccount(akunKas) && !isKoperasiAccount(akunKas)) {
      totalSaldo = akunKas.saldo_saat_ini || 0;
    }
  } else {
    const { data: allAkun } = await supabase
      .from('akun_kas')
      .select('saldo_saat_ini, managed_by')
      .eq('status', 'aktif');
    
    // Only count accounts not managed by tabungan or koperasi (using shared utility)
    const filteredAkun = excludeKoperasiAccounts(excludeTabunganAccounts(allAkun));
    totalSaldo = filteredAkun.reduce((sum, akun) => sum + (akun.saldo_saat_ini || 0), 0);
  }

  // Filter current month transactions (already filtered for tabungan)
  const currentMonthTransactions = filteredTransactions.filter(t => {
    const transactionDate = new Date(t.tanggal);
    return transactionDate >= startOfCurrentMonth && transactionDate <= endOfCurrentMonth;
  });

  // Filter previous month transactions for trend (already filtered for tabungan)
  const prevMonthTransactions = filteredTransactions.filter(t => {
    const transactionDate = new Date(t.tanggal);
    return transactionDate >= startOfPrevMonth && transactionDate <= endOfPrevMonth;
  });

  // Calculate current month stats
  const pemasukanBulanIni = currentMonthTransactions
    .filter(t => t.jenis_transaksi === 'Pemasukan')
    .reduce((sum, t) => sum + (t.jumlah || 0), 0);

  const pengeluaranBulanIni = currentMonthTransactions
    .filter(t => t.jenis_transaksi === 'Pengeluaran')
    .reduce((sum, t) => sum + (t.jumlah || 0), 0);

  // Calculate previous month stats for trend
  const pemasukanBulanLalu = prevMonthTransactions
    .filter(t => t.jenis_transaksi === 'Pemasukan')
    .reduce((sum, t) => sum + (t.jumlah || 0), 0);

  const pengeluaranBulanLalu = prevMonthTransactions
    .filter(t => t.jenis_transaksi === 'Pengeluaran')
    .reduce((sum, t) => sum + (t.jumlah || 0), 0);

  // Calculate trends
  const pemasukanTrend = pemasukanBulanLalu > 0 
    ? ((pemasukanBulanIni - pemasukanBulanLalu) / pemasukanBulanLalu * 100)
    : 0;

  const pengeluaranTrend = pengeluaranBulanLalu > 0
    ? ((pengeluaranBulanIni - pengeluaranBulanLalu) / pengeluaranBulanLalu * 100)
    : 0;

  return {
    totalSaldo,
    pemasukanBulanIni,
    pengeluaranBulanIni,
    totalTransaksi: currentMonthTransactions.length,
    pemasukanTrend,
    pengeluaranTrend
  };
};

/**
 * Get akun kas detail
 */
export const getAkunKasDetail = async () => {
    const { data, error } = await supabase
    .from('view_akun_kas_detail')
    .select('*')
    .order('is_default', { ascending: false });

    if (error) throw error;
  return data;
};

/**
 * Get total saldo semua akun
 */
export const getTotalSaldoSemuaAkun = async () => {
    const { data, error } = await supabase
    .from('view_total_saldo_semua_akun')
      .select('*')
    .single();

    if (error) throw error;
  return data;
};

/**
 * Enhanced monitoring using database views
 */
export const monitorDoubleEntry = async () => {
  // Use the database view for better performance
  const { data: doubleEntries } = await supabase
    .from('v_potential_double_entries')
    .select('*');
  
  if (doubleEntries && doubleEntries.length > 0) {
    console.warn('Potential double entries detected:', doubleEntries);
    return doubleEntries;
  }
  
  return [];
};

/**
 * Get auto-posted transactions summary
 */
export const getAutoPostedSummary = async (startDate?: string, endDate?: string) => {
  const { data, error } = await supabase.rpc('get_auto_posted_summary', {
    p_start_date: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    p_end_date: endDate || new Date().toISOString().split('T')[0]
  });
  
  if (error) throw error;
  return data;
};

/**
 * Reconcile auto-posted transactions with source records
 */
export const reconcileAutoPostedTransactions = async () => {
  const { data, error } = await supabase.rpc('reconcile_auto_posted_transactions');
  
  if (error) throw error;
  return data;
};

/**
 * Get orphaned keuangan entries
 */
export const getOrphanedKeuangan = async () => {
  const { data, error } = await supabase
    .from('v_orphaned_keuangan')
    .select('*');
  
  if (error) throw error;
  return data;
};

/**
 * Create double entry alert
 */
export async function createDoubleEntryAlert(
  transactionType: string,
  transactionId: string,
  amount: number,
  description: string
) {
  const { data, error } = await supabase.rpc('create_double_entry_alert', {
    p_transaction_type: transactionType,
    p_transaction_id: transactionId,
    p_amount: amount,
    p_description: description
  });
  
  if (error) throw error;
  return data;
}

// Get duplicate keuangan report
export async function getDuplicateKeuanganReport() {
  const { data, error } = await supabase.rpc('get_duplicate_keuangan_summary');
  
  if (error) throw error;
  return data || [];
}
