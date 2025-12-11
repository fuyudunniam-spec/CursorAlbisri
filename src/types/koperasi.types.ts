// =====================================================
// KOPERASI MODULE - TYPE DEFINITIONS
// =====================================================

// =====================================================
// 1. MASTER DATA TYPES
// =====================================================

export interface KoperasiProduk {
  id: string;
  kode_produk: string;
  nama_produk: string;
  kategori: string | null;
  satuan: string;
  harga_beli: number;
  harga_jual_ecer: number; // Harga jual eceran
  harga_jual_grosir: number; // Harga jual grosir
  harga_jual?: number; // Backward compatibility
  owner_type: 'koperasi' | 'yayasan'; // Owner classification: koperasi or yayasan
  bagi_hasil_yayasan: number; // Profit sharing percentage for yayasan (70 for yayasan, 0 for koperasi)
  margin_persen?: number;
  barcode: string | null;
  deskripsi: string | null;
  foto_url: string | null;
  is_active: boolean;
  inventaris_id: string | null;
  sumber_modal_id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  stok?: number; // Stock quantity (optional for backward compatibility)
  stock?: number; // Alternative field name (for backward compatibility)
}

export interface KoperasiProdukInsert {
  kode_produk: string;
  nama_produk: string;
  kategori?: string;
  satuan: string;
  harga_beli: number;
  harga_jual_ecer: number; // Harga jual eceran
  harga_jual_grosir: number; // Harga jual grosir
  owner_type: 'koperasi' | 'yayasan'; // Owner classification: koperasi or yayasan
  bagi_hasil_yayasan?: number; // Profit sharing percentage for yayasan (auto-set based on owner_type)
  barcode?: string;
  deskripsi?: string;
  foto_url?: string;
  is_active?: boolean;
  inventaris_id?: string;
  sumber_modal_id?: string; // Sumber modal ID for yayasan products
  stok?: number; // Stock quantity
}

export interface KoperasiSupplier {
  id: string;
  kode_supplier: string;
  nama_supplier: string;
  kategori: string | null;
  kontak_person: string | null;
  no_telepon: string | null;
  email: string | null;
  alamat: string | null;
  keterangan: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface KoperasiSupplierInsert {
  kode_supplier: string;
  nama_supplier: string;
  kategori?: string;
  kontak_person?: string;
  no_telepon?: string;
  email?: string;
  alamat?: string;
  keterangan?: string;
  is_active?: boolean;
}

// =====================================================
// 2. INVENTARIS TYPES
// =====================================================

export interface KoperasiStock {
  id: string;
  produk_id: string;
  jumlah: number;
  stock_minimum: number;
  created_at: string;
  updated_at: string;
}

export interface KoperasiStockView {
  id: string;
  produk_id: string;
  kode_produk: string;
  nama_produk: string;
  kategori: string | null;
  satuan: string;
  harga_beli: number;
  harga_jual: number;
  stock: number;
  stock_minimum: number;
  status_stock: 'habis' | 'menipis' | 'aman';
  nilai_stock: number;
  updated_at: string;
}

export interface KoperasiPembelian {
  id: string;
  no_pembelian: string;
  tanggal: string;
  supplier_id: string;
  total_pembelian: number;
  status_bayar: 'lunas' | 'tempo';
  tanggal_jatuh_tempo: string | null;
  keterangan: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface KoperasiPembelianItem {
  id: string;
  pembelian_id: string;
  produk_id: string;
  jumlah: number;
  harga_beli: number;
  subtotal?: number;
  created_at: string;
}

export interface KoperasiPembelianInsert {
  no_pembelian: string;
  tanggal: string;
  supplier_id: string;
  total_pembelian: number;
  status_bayar: 'lunas' | 'tempo';
  tanggal_jatuh_tempo?: string;
  keterangan?: string;
  items: {
    produk_id: string;
    jumlah: number;
    harga_beli: number;
  }[];
}

// =====================================================
// 3. PENJUALAN (POS) TYPES
// =====================================================

export interface KoperasiShiftKasir {
  id: string;
  no_shift: string;
  kasir_id: string;
  waktu_buka: string;
  waktu_tutup: string | null;
  saldo_awal: number;
  saldo_akhir: number | null;
  total_penjualan: number;
  total_transaksi: number;
  status: 'buka' | 'tutup';
  keterangan: string | null;
  created_at: string;
}

export interface KoperasiPenjualan {
  id: string;
  no_penjualan: string;
  tanggal: string;
  shift_id: string | null;
  kasir_id: string;
  subtotal: number;
  diskon: number;
  total: number;
  metode_bayar: 'cash' | 'transfer';
  jumlah_bayar: number;
  kembalian: number;
  keterangan: string | null;
  transaksi_keuangan_id: string | null;
  created_at: string;
  created_by: string | null;
}

export interface KoperasiPenjualanItem {
  id: string;
  penjualan_id: string;
  produk_id: string;
  jumlah: number;
  harga_jual: number;
  harga_beli: number;
  diskon: number;
  subtotal?: number;
  sumber_modal_id?: string;
  bagian_yayasan?: number; // Yayasan's share of profit (70% for yayasan products)
  bagian_koperasi?: number; // Koperasi's share of profit (30% for yayasan products, 100% for koperasi products)
  margin?: number; // Profit margin for koperasi
  created_at: string;
}

export interface KoperasiPenjualanInsert {
  no_penjualan: string;
  tanggal: string;
  shift_id?: string;
  kasir_id: string;
  subtotal: number;
  diskon: number;
  total: number;
  metode_bayar: 'cash' | 'transfer';
  jumlah_bayar: number;
  kembalian: number;
  keterangan?: string;
  items: {
    produk_id: string;
    jumlah: number;
    harga_jual: number;
    harga_beli: number;
    diskon: number;
    sumber_modal_id?: string;
    price_type?: 'ecer' | 'grosir';
  }[];
}

export interface KoperasiPenjualanView {
  id: string;
  no_penjualan: string;
  tanggal: string;
  kasir_id: string;
  nama_kasir: string | null;
  shift_id: string | null;
  no_shift: string | null;
  subtotal: number;
  diskon: number;
  total: number;
  metode_bayar: 'cash' | 'transfer';
  jumlah_bayar: number;
  kembalian: number;
  keterangan: string | null;
  created_at: string;
  jumlah_item: number;
}

// =====================================================
// 4. KASIR/POS CART TYPES
// =====================================================

export interface KasirCartItem {
  produk_id: string;
  kode_produk: string;
  nama_produk: string;
  satuan: string;
  harga_jual: number;
  harga_beli: number;
  jumlah: number;
  diskon: number;
  subtotal: number;
  stock_tersedia: number;
  sumber_modal_id?: string;
  price_type?: 'ecer' | 'grosir'; // Tipe harga yang digunakan
}

export interface KasirCart {
  items: KasirCartItem[];
  subtotal: number;
  diskon_total: number;
  total: number;
}

// =====================================================
// 5. DASHBOARD & REPORT TYPES
// =====================================================

export interface KoperasiDashboardStats {
  penjualan_hari_ini: number;
  kas_koperasi: number;
  produk_aktif: number;
  stock_alert: number;
  total_transaksi_hari_ini: number;
}

export interface KoperasiPenjualanChart {
  tanggal: string;
  total_penjualan: number;
  jumlah_transaksi: number;
}

export interface KoperasiProdukTerlaris {
  produk_id: string;
  kode_produk: string;
  nama_produk: string;
  total_terjual: number;
  total_pendapatan: number;
}

export interface KoperasiLaporanLabaRugi {
  periode: string;
  pendapatan_penjualan: number;
  hpp: number;
  laba_kotor: number;
  biaya_operasional: number;
  laba_bersih: number;
  margin_persen: number;
}

// =====================================================
// 6. PROFIT SHARING TYPES
// =====================================================

export interface ProfitSharing {
  bagian_yayasan: number; // Yayasan's share of profit (70% for yayasan products)
  bagian_koperasi: number; // Koperasi's share of profit (30% for yayasan products, 100% for koperasi products)
  margin: number; // Profit margin for koperasi
}

export interface MonthlySummary {
  id: string;
  bulan: number; // Month (1-12)
  tahun: number; // Year
  total_penjualan: number; // Total sales amount for yayasan products
  bagian_yayasan: number; // Total yayasan share for the month
  bagian_koperasi: number; // Total koperasi share for the month
  status: 'paid' | 'unpaid'; // Payment status
  tanggal_bayar?: string | null; // Payment date (if paid)
  created_at: string;
}

export interface MonthlySummaryInsert {
  bulan: number;
  tahun: number;
  total_penjualan: number;
  bagian_yayasan: number;
  bagian_koperasi: number;
  status?: 'paid' | 'unpaid';
  tanggal_bayar?: string;
}

// =====================================================
// 7. FILTER & PAGINATION TYPES
// =====================================================

export interface KoperasiProdukFilter {
  search?: string;
  kategori?: string;
  is_active?: boolean;
}

export interface KoperasiPenjualanFilter {
  tanggal_dari?: string;
  tanggal_sampai?: string;
  kasir_id?: string;
  shift_id?: string;
  metode_bayar?: 'cash' | 'transfer';
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

}

}

}
