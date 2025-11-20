export type InventoryItem = {
  id: string;
  nama_barang: string;
  tipe_item: 'Aset' | 'Komoditas';
  kategori: string;
  zona: string;
  lokasi: string;
  kondisi: 'Baik' | 'Rusak Ringan' | 'Perlu Perbaikan' | 'Rusak Berat';
  jumlah?: number | null;
  satuan?: string | null;
  harga_perolehan?: number | null;
  supplier?: string | null;
  has_expiry?: boolean | null;
  tanggal_kedaluwarsa?: string | null;
  min_stock?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type InventoryTransaction = {
  id: string;
  item_id: string;
  tipe: "Masuk" | "Keluar" | "Stocktake";
  keluar_mode?: "Penjualan" | "Distribusi" | null;
  jumlah?: number | null;
  harga_satuan?: number | null;
  harga_dasar?: number | null;
  sumbangan?: number | null;
  total_nilai?: number | null;
  before_qty?: number | null;
  after_qty?: number | null;
  penerima?: string | null;
  penerima_santri_id?: string | null;
  tanggal: string;
  catatan?: string | null;
  keuangan_id?: string | null;
  created_at?: string | null;
  // Legacy fields for compatibility
  mutation_id?: string | null;
  kategori_barang?: string | null;
  nama_barang?: string | null;
  satuan?: string | null;
};

export type Pagination = { page: number; pageSize: number };
export type Sort = { column: string; direction: "asc" | "desc" } | null;

export type InventoryFilters = {
  search?: string | null;
  kategori?: string | null;
  kondisi?: string | null;
  tipe_item?: 'Aset' | 'Komoditas' | 'all' | null;
  zona?: string | null;
  lokasi?: string | null;
  has_expiry?: boolean | null;
  min_stock_alert?: boolean | null;
};

export type TransactionFilters = {
  search?: string | null; // by nama_barang
  tipe?: "Masuk" | "Keluar" | "Stocktake" | "all" | null;
  keluar_mode?: "Penjualan" | "Distribusi" | "all" | null;
  startDate?: string | null;
  endDate?: string | null;
  item_id?: string | null;
  penerima?: string | null;
};

export type StockAlert = {
  id: string;
  nama_barang: string;
  jumlah: number;
  min_stock: number;
  status: 'low' | 'out';
  urgency: 'low' | 'medium' | 'high';
};

export type ExpiryAlert = {
  id: string;
  nama_barang: string;
  tanggal_kedaluwarsa: string;
  days_until_expiry: number;
  status: 'warning' | 'critical' | 'expired';
  urgency: 'low' | 'medium' | 'high';
};

export type InventoryStats = {
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
  nearExpiryCount: number;
  asetCount: number;
  komoditasCount: number;
  totalTransactions: number;
  stockMovement: {
    masuk: number;
    keluar: number;
    net: number;
  };
};
