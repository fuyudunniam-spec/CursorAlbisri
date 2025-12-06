/**
 * Transfer Inventaris Yayasan - Type Definitions
 * 
 * Defines types and interfaces for the transfer system that manages
 * inventory transfers from yayasan to various destinations with approval
 * workflow for koperasi transfers.
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Transfer destination options
 */
export enum TransferDestination {
  KOPERASI = 'koperasi',
  DISTRIBUSI = 'distribusi',
  DAPUR = 'dapur',
  ASRAMA = 'asrama',
  KANTOR = 'kantor',
  LAINNYA = 'lainnya'
}

/**
 * Transfer status throughout the workflow
 */
export enum TransferStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed'
}

/**
 * Item condition for pricing rules
 */
export enum ItemCondition {
  BAIK = 'baik',
  RUSAK = 'rusak'
}

// ============================================================================
// Core Interfaces
// ============================================================================

/**
 * Main transfer record
 */
export interface Transfer {
  id: string
  item_id: string
  item_name?: string
  jumlah: number
  tujuan: TransferDestination
  status: TransferStatus
  created_by: string
  created_at: string
  
  // Approval data (for koperasi transfers)
  approved_by?: string
  approved_at?: string
  kondisi_barang?: ItemCondition
  hpp_yayasan?: number
  harga_jual_koperasi?: number
  profit_sharing_ratio?: string
  
  // Metadata
  catatan?: string
  rejection_reason?: string
}

/**
 * Data required for approving a transfer
 */
export interface ApprovalData {
  kondisi_barang: ItemCondition
  harga_jual: number
  catatan?: string
}

/**
 * Profit sharing calculation result
 */
export interface ProfitSplit {
  total_sale: number
  yayasan_share: number
  koperasi_share: number
  yayasan_percentage: number
  koperasi_percentage: number
}

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

/**
 * DTO for creating a new transfer
 */
export interface CreateTransferDTO {
  item_id: string
  jumlah: number
  tujuan: TransferDestination
  catatan?: string
}

/**
 * Filters for querying transfer history
 */
export interface TransferFilters {
  tujuan?: TransferDestination
  status?: TransferStatus
  date_from?: string
  date_to?: string
  item_id?: string
  page?: number
  limit?: number
}

/**
 * Paginated transfer results
 */
export interface PaginatedTransfers {
  data: Transfer[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ============================================================================
// Database Models
// ============================================================================

/**
 * Transfer record as stored in database
 */
export interface TransferRecord {
  id: string
  item_id: string
  jumlah: number
  tujuan: string
  status: string
  created_by: string
  created_at: string
  approved_by?: string
  approved_at?: string
  kondisi_barang?: string
  hpp_yayasan?: number
  harga_jual_koperasi?: number
  profit_sharing_ratio?: string
  catatan?: string
  rejection_reason?: string
}

/**
 * Bank item distribusi record
 */
export interface BankItemDistribusi {
  id: string
  transfer_id: string
  item_id: string
  jumlah_tersedia: number
  jumlah_terpakai: number
  created_at: string
}

// ============================================================================
// Extended Types
// ============================================================================

/**
 * Transfer with item details (for display)
 */
export interface TransferWithItem extends Transfer {
  item_name: string
  item_satuan?: string
  item_kategori?: string
  item_harga_perolehan?: number
  created_by_name?: string  // Username dari profiles
  approved_by_name?: string  // Username dari profiles
}

/**
 * Koperasi produk with transfer metadata
 */
export interface KoperasiProdukWithTransfer {
  id: string
  nama: string
  harga_jual: number
  stok: number
  sumber_transfer?: string
  kondisi_barang?: ItemCondition
  profit_sharing_yayasan?: number
  profit_sharing_koperasi?: number
}
