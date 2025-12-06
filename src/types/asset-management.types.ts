// ============================================================================
// Asset Management Type Definitions
// ============================================================================
// This file contains all TypeScript type definitions for the asset management
// system that handles transfer of yayasan assets to koperasi and profit sharing.

// ============================================================================
// Transfer Types
// ============================================================================

/**
 * Asset Transfer Log - Records when assets are transferred from inventaris to koperasi
 */
export interface AssetTransferLog {
  id: string;
  inventaris_id: string;
  koperasi_produk_id: string;
  transfer_reference: string;
  quantity_transferred: number;
  harga_transfer: number;
  transfer_date: string;
  transferred_by: string;
  notes: string | null;
  status: 'active' | 'returned' | 'sold_out';
  created_at: string;
  updated_at: string;
}

/**
 * Request payload for transferring an asset from inventaris to koperasi
 */
export interface TransferAssetRequest {
  inventaris_id: string;
  quantity: number;
  harga_transfer: number;
  notes?: string;
}

/**
 * Response from asset transfer operation
 */
export interface TransferAssetResponse {
  success: boolean;
  data: {
    transfer_reference: string;
    koperasi_produk_id: string;
    transfer_log_id: string;
  };
}

// ============================================================================
// Bagi Hasil (Profit Sharing) Types
// ============================================================================

/**
 * Bagi Hasil Log - Records profit sharing calculations and transactions
 */
export interface BagiHasilLog {
  id: string;
  periode_start: string;
  periode_end: string;
  total_penjualan: number;
  total_hpp: number;
  laba_kotor: number;
  biaya_operasional: number;
  laba_bersih: number;
  persentase_yayasan: number;
  persentase_koperasi: number;
  bagian_yayasan: number;
  bagian_koperasi: number;
  transaksi_keuangan_id: string | null;
  processed_by: string;
  processed_at: string;
  notes: string | null;
  created_at: string;
}

/**
 * Bagi Hasil Detail - Individual sales records included in profit sharing
 */
export interface BagiHasilDetail {
  id: string;
  bagi_hasil_id: string;
  penjualan_id: string;
  inventaris_id: string;
  quantity: number;
  harga_jual: number;
  harga_transfer: number;
  total_penjualan: number;
  total_hpp: number;
  laba_item: number;
  created_at: string;
}

/**
 * Request payload for calculating or processing bagi hasil
 */
export interface BagiHasilRequest {
  periode_start: string; // YYYY-MM-DD format
  periode_end: string; // YYYY-MM-DD format
  biaya_operasional: number;
  persentase_yayasan: number; // e.g., 60 for 60%
  persentase_koperasi: number; // e.g., 40 for 40%
  notes?: string;
}

/**
 * Preview data for bagi hasil calculation before processing
 */
export interface BagiHasilPreviewData {
  total_penjualan: number;
  total_hpp: number;
  laba_kotor: number;
  biaya_operasional: number;
  laba_bersih: number;
  bagian_yayasan: number;
  bagian_koperasi: number;
  detail_penjualan: BagiHasilDetailPreview[];
}

/**
 * Individual sale detail in bagi hasil preview
 */
export interface BagiHasilDetailPreview {
  penjualan_id: string;
  no_penjualan: string;
  tanggal: string;
  inventaris_id: string;
  nama_barang: string;
  quantity: number;
  harga_jual: number;
  harga_transfer: number;
  total_penjualan: number;
  total_hpp: number;
  laba: number;
}

/**
 * Response from bagi hasil preview calculation
 */
export interface BagiHasilPreviewResponse {
  success: boolean;
  data: BagiHasilPreviewData;
}

/**
 * Response from processing bagi hasil
 */
export interface BagiHasilProcessResponse {
  success: boolean;
  data: {
    bagi_hasil_id: string;
    transaksi_keuangan_id: string;
    bagian_yayasan: number;
  };
}

/**
 * Bagi hasil history item with summary information
 */
export interface BagiHasilHistoryItem {
  id: string;
  periode_start: string;
  periode_end: string;
  total_penjualan: number;
  laba_bersih: number;
  bagian_yayasan: number;
  bagian_koperasi: number;
  processed_at: string;
  processed_by_name: string;
}

/**
 * Complete bagi hasil detail including header and line items
 */
export interface BagiHasilDetailResponse {
  success: boolean;
  data: {
    header: BagiHasilLog;
    detail: BagiHasilDetail[];
  };
}

// ============================================================================
// Accountability Report Types
// ============================================================================

/**
 * Asset accountability report showing status of transferred assets
 */
export interface AssetAccountabilityReport {
  inventaris_id: string;
  kode_barang: string;
  nama_barang: string;
  total_transferred: number;
  total_sold: number;
  remaining_stock: number;
  nilai_transfer: number;
  nilai_penjualan: number;
  laba_kotor: number;
  status: 'belum_terjual' | 'terjual_sebagian' | 'habis';
  last_transfer_date: string;
  last_sale_date: string | null;
}

/**
 * Filter options for accountability report
 */
export interface AccountabilityFilter {
  periode_start?: string;
  periode_end?: string;
  inventaris_id?: string;
  kategori?: string;
  status?: 'belum_terjual' | 'terjual_sebagian' | 'habis';
}

/**
 * Response from accountability report query
 */
export interface AccountabilityReportResponse {
  success: boolean;
  data: AssetAccountabilityReport[];
}

// ============================================================================
// Filter and Query Types
// ============================================================================

/**
 * Date range filter for various queries
 */
export interface DateRangeFilter {
  start_date?: string;
  end_date?: string;
}

/**
 * Transfer history filter options
 */
export interface TransferHistoryFilter extends DateRangeFilter {
  inventaris_id?: string;
  status?: 'active' | 'returned' | 'sold_out';
}

/**
 * Bagi hasil history filter options
 */
export interface BagiHasilHistoryFilter extends DateRangeFilter {
  processed_by?: string;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error codes for asset management operations
 */
export enum AssetManagementErrorCode {
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  INVALID_TRANSFER_AMOUNT = 'INVALID_TRANSFER_AMOUNT',
  DUPLICATE_PERIODE = 'DUPLICATE_PERIODE',
  INVALID_PERCENTAGE = 'INVALID_PERCENTAGE',
  INSUFFICIENT_KAS = 'INSUFFICIENT_KAS',
  ASSET_NOT_FOUND = 'ASSET_NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_DATE_RANGE = 'INVALID_DATE_RANGE',
  PROCESSING_ERROR = 'PROCESSING_ERROR',
}

/**
 * Custom error class for asset management operations
 */
export class AssetManagementError extends Error {
  constructor(
    public code: AssetManagementErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AssetManagementError';
  }
}

/**
 * Error messages mapped to error codes
 */
export const ERROR_MESSAGES: Record<AssetManagementErrorCode, string> = {
  [AssetManagementErrorCode.INSUFFICIENT_STOCK]: 
    'Stock inventaris tidak mencukupi untuk transfer',
  [AssetManagementErrorCode.INVALID_TRANSFER_AMOUNT]: 
    'Jumlah transfer harus lebih dari 0',
  [AssetManagementErrorCode.DUPLICATE_PERIODE]: 
    'Periode ini sudah pernah diproses',
  [AssetManagementErrorCode.INVALID_PERCENTAGE]: 
    'Total persentase bagi hasil harus 100%',
  [AssetManagementErrorCode.INSUFFICIENT_KAS]: 
    'Saldo Kas Koperasi tidak mencukupi untuk transfer',
  [AssetManagementErrorCode.ASSET_NOT_FOUND]: 
    'Aset tidak ditemukan',
  [AssetManagementErrorCode.UNAUTHORIZED]: 
    'Anda tidak memiliki akses untuk operasi ini',
  [AssetManagementErrorCode.INVALID_DATE_RANGE]: 
    'Rentang tanggal tidak valid',
  [AssetManagementErrorCode.PROCESSING_ERROR]: 
    'Terjadi kesalahan saat memproses data',
};

// ============================================================================
// View Types (Database Views)
// ============================================================================

/**
 * View for sales of yayasan assets
 */
export interface PenjualanAsetYayasanView {
  penjualan_id: string;
  no_penjualan: string;
  tanggal: string;
  produk_id: string;
  inventaris_id: string;
  nama_barang: string;
  jumlah: number;
  harga_jual: number;
  harga_transfer: number;
  total_penjualan: number;
  total_hpp: number;
  laba: number;
}

/**
 * View for asset accountability
 */
export interface AssetAccountabilityView {
  inventaris_id: string;
  kode_barang: string;
  nama_barang: string;
  kategori: string;
  total_transferred: number;
  total_sold: number;
  remaining_stock: number;
  nilai_transfer: number;
  nilai_penjualan: number;
  laba_kotor: number;
  status: 'belum_terjual' | 'terjual_sebagian' | 'habis';
  last_transfer_date: string;
  last_sale_date: string | null;
}

// ============================================================================
// Dashboard and Statistics Types
// ============================================================================

/**
 * Dashboard statistics for asset management
 */
export interface AssetManagementDashboardStats {
  total_assets_managed: number;
  total_value_unsold: number;
  total_sales_this_month: number;
  total_profit_this_month: number;
  assets_by_status: {
    belum_terjual: number;
    terjual_sebagian: number;
    habis: number;
  };
}

/**
 * Sales trend data for charts
 */
export interface SalesTrendData {
  date: string;
  total_penjualan: number;
  total_laba: number;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

/**
 * Sort parameters
 */
export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Generic API response
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
