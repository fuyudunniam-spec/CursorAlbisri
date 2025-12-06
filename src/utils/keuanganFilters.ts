/**
 * Shared utilities untuk filtering transaksi keuangan
 * 
 * IMPORTANT: Data keuangan sangat penting, jadi semua fungsi di sini harus:
 * 1. Tidak mengubah data asli (hanya filter)
 * 2. Konsisten dengan logic yang sudah ada
 * 3. Well-tested sebelum digunakan
 */

/**
 * Interface untuk transaksi keuangan yang perlu di-filter
 * Menggunakan any untuk akun_kas karena bisa berupa object atau array dari Supabase join
 */
export interface TransactionToFilter {
  source_module?: string | null;
  kategori?: string | null;
  akun_kas?: any; // Can be object or array from Supabase join
  [key: string]: any; // Allow other properties
}

/**
 * Check apakah transaksi adalah transaksi tabungan santri
 * 
 * Logic ini harus konsisten dengan filtering yang sudah ada di:
 * - KeuanganV3.tsx
 * - keuangan.service.ts
 * - akunKas.service.ts
 */
export function isTabunganTransaction(transaction: TransactionToFilter): boolean {
  // Check 1: source_module contains 'tabungan'
  if (transaction.source_module && 
      typeof transaction.source_module === 'string' &&
      transaction.source_module.toLowerCase().includes('tabungan')) {
    return true;
  }
  
  // Check 2: kategori is 'Tabungan Santri'
  if (transaction.kategori === 'Tabungan Santri') {
    return true;
  }
  
  // Check 3: account is managed by tabungan module
  const akunKas = Array.isArray(transaction.akun_kas) 
    ? transaction.akun_kas[0] 
    : transaction.akun_kas;
  
  if (akunKas?.managed_by === 'tabungan') {
    return true;
  }
  
  return false;
}

/**
 * Filter out transaksi tabungan santri dari array transaksi
 * 
 * IMPORTANT: Function ini tidak mengubah data asli, hanya return filtered array
 * 
 * @param transactions Array of transactions to filter
 * @returns Filtered array without tabungan transactions
 */
export function excludeTabunganTransactions<T extends TransactionToFilter>(
  transactions: T[] | null | undefined
): T[] {
  if (!transactions || !Array.isArray(transactions)) {
    return [];
  }
  
  return transactions.filter(transaction => !isTabunganTransaction(transaction));
}

/**
 * Get Supabase query filter untuk exclude tabungan transactions
 * 
 * Returns query modifier yang bisa digunakan dengan Supabase query builder
 * 
 * Usage:
 * ```typescript
 * let query = supabase.from('keuangan').select('*');
 * query = applyTabunganExclusionFilter(query);
 * ```
 */
export function applyTabunganExclusionFilter<T extends { or: (filter: string) => any }>(
  query: T
): T {
  // Exclude tabungan santri transactions
  // This allows NULL source_module (manual transactions) and other modules, but excludes tabungan
  return query.or('source_module.is.null,source_module.neq.tabungan_santri') as T;
}

/**
 * Filter akun kas untuk exclude yang managed by tabungan
 * 
 * @param accounts Array of akun kas
 * @returns Filtered array without tabungan-managed accounts
 */
export function excludeTabunganAccounts<T extends { managed_by?: string | null }>(
  accounts: T[] | null | undefined
): T[] {
  if (!accounts || !Array.isArray(accounts)) {
    return [];
  }
  
  return accounts.filter(account => account.managed_by !== 'tabungan');
}

/**
 * Check apakah akun kas adalah akun tabungan
 */
export function isTabunganAccount(account: { managed_by?: string | null }): boolean {
  return account.managed_by === 'tabungan';
}

/**
 * Normalize akun_kas field dari Supabase response
 * 
 * Supabase bisa return akun_kas sebagai object atau array (jika join)
 * Function ini normalize ke single object
 */
export function normalizeAkunKas(akunKasField: any): any {
  if (!akunKasField) return undefined;
  return Array.isArray(akunKasField) ? akunKasField[0] : akunKasField;
}

/**
 * Check apakah transaksi adalah transaksi koperasi
 * 
 * Logic ini konsisten dengan filtering tabungan
 */
export function isKoperasiTransaction(transaction: TransactionToFilter): boolean {
  // Check 1: source_module contains 'koperasi'
  if (transaction.source_module && 
      typeof transaction.source_module === 'string' &&
      transaction.source_module.toLowerCase().includes('koperasi')) {
    return true;
  }
  
  // Check 2: account is managed by koperasi module
  const akunKas = Array.isArray(transaction.akun_kas) 
    ? transaction.akun_kas[0] 
    : transaction.akun_kas;
  
  if (akunKas?.managed_by === 'koperasi') {
    return true;
  }
  
  return false;
}

/**
 * Filter out transaksi koperasi dari array transaksi
 * 
 * IMPORTANT: Function ini tidak mengubah data asli, hanya return filtered array
 * 
 * @param transactions Array of transactions to filter
 * @returns Filtered array without koperasi transactions
 */
export function excludeKoperasiTransactions<T extends TransactionToFilter>(
  transactions: T[] | null | undefined
): T[] {
  if (!transactions || !Array.isArray(transactions)) {
    return [];
  }
  
  return transactions.filter(transaction => !isKoperasiTransaction(transaction));
}

/**
 * Filter akun kas untuk exclude yang managed by koperasi
 * 
 * @param accounts Array of akun kas
 * @returns Filtered array without koperasi-managed accounts
 */
export function excludeKoperasiAccounts<T extends { managed_by?: string | null }>(
  accounts: T[] | null | undefined
): T[] {
  if (!accounts || !Array.isArray(accounts)) {
    return [];
  }
  
  return accounts.filter(account => account.managed_by !== 'koperasi');
}

/**
 * Check apakah akun kas adalah akun koperasi
 */
export function isKoperasiAccount(account: { managed_by?: string | null }): boolean {
  return account.managed_by === 'koperasi';
}

/**
 * Get Supabase query filter untuk exclude koperasi transactions
 * 
 * Returns query modifier yang bisa digunakan dengan Supabase query builder
 * 
 * Usage:
 * ```typescript
 * let query = supabase.from('keuangan').select('*');
 * query = applyKoperasiExclusionFilter(query);
 * ```
 */
export function applyKoperasiExclusionFilter<T extends { or: (filter: string) => any }>(
  query: T
): T {
  // Exclude koperasi transactions
  // This allows NULL source_module (manual transactions) and other modules, but excludes koperasi
  return query.or('source_module.is.null,source_module.neq.koperasi') as T;
}

