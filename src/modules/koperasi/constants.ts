/**
 * Constants untuk modul koperasi
 * Menghindari magic numbers dan duplicate values
 */

// Query stale time dan refetch intervals (dalam milliseconds)
export const QUERY_STALE_TIME = {
  SHORT: 30000, // 30 detik - untuk data yang sering berubah
  MEDIUM: 60000, // 1 menit - untuk data yang agak stabil
  LONG: 300000, // 5 menit - untuk data yang jarang berubah
} as const;

export const QUERY_REFETCH_INTERVAL = {
  SHORT: 30000, // 30 detik
  MEDIUM: 60000, // 1 menit
  LONG: 300000, // 5 menit
} as const;

// Toast notification durations (dalam milliseconds)
export const TOAST_DURATION = {
  SHORT: 3000, // 3 detik - default
  MEDIUM: 5000, // 5 detik - untuk error penting
  LONG: 10000, // 10 detik - untuk warning kritis
} as const;

// Kategori transaksi
export const KATEGORI_PEMASUKAN = [
  'Penjualan',
  'Setoran Anggota',
  'Lain-lain'
] as const;

export const KATEGORI_PENGELUARAN = [
  'Pembelian Barang',
  'Biaya Operasional',
  'Bagi Hasil Yayasan',
  'Lain-lain'
] as const;

// Profit sharing defaults
export const PROFIT_SHARING_DEFAULTS = {
  YAYASAN_PERCENTAGE: 70, // Default bagi hasil yayasan untuk item yayasan
  KOPERASI_PERCENTAGE: 0, // Default bagi hasil koperasi untuk item koperasi
  DEFAULT_SPLIT: 50, // Default split 50:50 jika tidak ditentukan
} as const;

// Harga discount untuk grosir
export const GROSIR_DISCOUNT = 0.95; // 5% discount untuk harga grosir

// Stock defaults
export const STOCK_DEFAULTS = {
  MINIMUM: 5, // Stok minimum default
  INITIAL: 0, // Stok awal saat produk dibuat
} as const;

// Payment quick amount increments
export const PAYMENT_QUICK_AMOUNT_INCREMENT = 50000; // Increment untuk quick payment buttons

// Date filter options
export const DATE_FILTER_OPTIONS = {
  TODAY: 'today',
  WEEK: 'week',
  MONTH: 'month',
  LAST_MONTH: 'lastMonth',
  ALL: 'all',
} as const;

// Owner type
export const OWNER_TYPE = {
  KOPERASI: 'koperasi',
  YAYASAN: 'yayasan',
} as const;

// Price type
export const PRICE_TYPE = {
  ECER: 'ecer',
  GROSIR: 'grosir',
} as const;

// Payment methods
export const PAYMENT_METHODS = {
  CASH: 'cash',
  TRANSFER: 'transfer',
  DEBIT: 'debit',
  KREDIT: 'kredit',
} as const;

// Payment status
export const PAYMENT_STATUS = {
  LUNAS: 'lunas',
  HUTANG: 'hutang',
  CICILAN: 'cicilan',
} as const;



















