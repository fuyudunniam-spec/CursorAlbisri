import { supabase } from '@/integrations/supabase/client';
import { addKeuanganTransaction } from '@/services/keuangan.service';
import type { KoperasiPenjualanInsert, KoperasiProduk } from '@/types/koperasi.types';

// =====================================================
// TYPES
// =====================================================

export interface KoperasiTransaksi {
  id: string;
  produk_id: string;
  tipe: 'Pembelian' | 'Penjualan';
  jumlah: number;
  harga_beli?: number | null;
  harga_jual?: number | null;
  total_beli?: number | null;
  total_jual?: number | null;
  keuntungan?: number | null;
  sumber?: 'Inventaris' | 'Vendor' | null;
  referensi_inventaris_id?: string | null;
  pembeli?: string | null;
  supplier?: string | null;
  tanggal: string;
  catatan?: string | null;
  created_at?: string | null;
  // Joined fields
  produk?: KoperasiProduk | null;
}

export interface KoperasiFormData {
  nama_produk: string;
  kategori?: string; // Optional, use kategori_id instead
  harga_beli: number;
  harga_jual?: number; // Optional, use harga_jual_ecer instead
  stok_minimum?: number;
  satuan?: string;
  sumber: 'Inventaris' | 'Vendor';
  supplier?: string;
  deskripsi?: string;
  // Additional fields for kop_barang table
  kode_produk?: string;
  kategori_id?: string;
  sumber_modal_id?: string;
  harga_jual_ecer?: number;
  harga_jual_grosir?: number;
  owner_type?: 'koperasi' | 'yayasan';
  bagi_hasil_yayasan?: number;
  inventaris_id?: string | null;
}

export interface PembelianFormData {
  produk_id: string;
  jumlah: number;
  harga_beli: number;
  supplier?: string;
  sumber: 'Inventaris' | 'Vendor';
  referensi_inventaris_id?: string; // Jika dari inventaris
  tanggal: string;
  catatan?: string;
}

export interface PenjualanFormData {
  produk_id: string;
  jumlah: number;
  harga_jual: number;
  pembeli: string;
  tanggal: string;
  catatan?: string;
}

export interface SHUData {
  bulan: string;
  total_transaksi_penjualan: number;
  total_revenue: number;
  total_cost: number;
  total_keuntungan: number;
  keuntungan_dari_inventaris: number;
  keuntungan_dari_vendor: number;
}

// =====================================================
// MASTER PRODUK
// =====================================================

/**
 * Get all produk koperasi
 */
export const listKoperasiProduk = async (filters?: {
  kategori?: string;
  status?: 'Aktif' | 'Non-Aktif';
  sumber?: 'Inventaris' | 'Vendor';
  is_active?: boolean;
  min_stock?: number; // Filter products with stock >= min_stock
}): Promise<KoperasiProduk[]> => {
  let query = supabase
    .from('kop_barang')
    .select(`
      id,
      kode_barang,
      nama_barang,
      kategori_id,
      sumber_modal_id,
      satuan_dasar,
      harga_beli,
      harga_jual_ecer,
      harga_jual_grosir,
      stok_minimum,
      stok,
      is_active,
      owner_type,
      bagi_hasil_yayasan,
      inventaris_id,
      created_at,
      updated_at
    `)
    .order('nama_barang', { ascending: true });

  // Map status filter to is_active
  if (filters?.status) {
    query = query.eq('is_active', filters.status === 'Aktif');
  } else if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active);
  }

  if (filters?.kategori) {
    // Need to join with kop_kategori to filter by nama
    // For now, filter by kategori_id if provided as UUID
    query = query.eq('kategori_id', filters.kategori);
  }

  // Filter by minimum stock (for kasir: only show products with stock > 0)
  if (filters?.min_stock !== undefined) {
    query = query.gte('stok', filters.min_stock);
  }

  const { data, error } = await query;
  if (error) throw error;
  
  // Map kop_barang structure to KoperasiProduk structure
  return (data || []).map((item: any) => ({
    id: item.id,
    kode_produk: item.kode_barang || '',
    nama_produk: item.nama_barang || '',
    kategori: null, // Need to join to get kategori name
    satuan: item.satuan_dasar || 'pcs',
    harga_beli: parseFloat(item.harga_beli || 0),
    harga_jual_ecer: parseFloat(item.harga_jual_ecer || 0),
    harga_jual_grosir: parseFloat(item.harga_jual_grosir || 0),
    harga_jual: parseFloat(item.harga_jual_ecer || 0), // Backward compatibility
    owner_type: (item.owner_type || 'koperasi') as 'koperasi' | 'yayasan',
    bagi_hasil_yayasan: parseFloat(item.bagi_hasil_yayasan || 0),
    margin_persen: item.harga_beli > 0 
      ? ((parseFloat(item.harga_jual_ecer || 0) - parseFloat(item.harga_beli || 0)) / parseFloat(item.harga_beli || 0)) * 100 
      : 0,
    barcode: null,
    deskripsi: null,
    foto_url: null,
    is_active: item.is_active !== false,
    inventaris_id: item.inventaris_id || null,
    sumber_modal_id: item.sumber_modal_id || '',
    created_at: item.created_at || new Date().toISOString(),
    updated_at: item.updated_at || new Date().toISOString(),
    created_by: null,
    updated_by: null,
    stok: parseFloat(item.stok || 0),
    stock: parseFloat(item.stok || 0), // Alternative field name
  })) as KoperasiProduk[];
};

/**
 * Get produk by ID
 */
export const getKoperasiProduk = async (id: string): Promise<KoperasiProduk | null> => {
  const { data, error } = await supabase
    .from('kop_barang')
    .select(`
      id,
      kode_barang,
      nama_barang,
      kategori_id,
      sumber_modal_id,
      satuan_dasar,
      harga_beli,
      harga_jual_ecer,
      harga_jual_grosir,
      stok_minimum,
      stok,
      is_active,
      owner_type,
      bagi_hasil_yayasan,
      inventaris_id,
      created_at,
      updated_at
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  
  // Map kop_barang structure to KoperasiProduk structure
  return {
    id: data.id,
    kode_produk: data.kode_barang || '',
    nama_produk: data.nama_barang || '',
    kategori: null, // Need to join to get kategori name
    satuan: data.satuan_dasar || 'pcs',
    harga_beli: parseFloat(data.harga_beli || 0),
    harga_jual_ecer: parseFloat(data.harga_jual_ecer || 0),
    harga_jual_grosir: parseFloat(data.harga_jual_grosir || 0),
    harga_jual: parseFloat(data.harga_jual_ecer || 0), // Backward compatibility
    owner_type: (data.owner_type || 'koperasi') as 'koperasi' | 'yayasan',
    bagi_hasil_yayasan: parseFloat(data.bagi_hasil_yayasan || 0),
    margin_persen: data.harga_beli > 0 
      ? ((parseFloat(data.harga_jual_ecer || 0) - parseFloat(data.harga_beli || 0)) / parseFloat(data.harga_beli || 0)) * 100 
      : 0,
    barcode: null,
    deskripsi: null,
    foto_url: null,
    is_active: data.is_active !== false,
    inventaris_id: data.inventaris_id || null,
    sumber_modal_id: data.sumber_modal_id || '',
    created_at: data.created_at || new Date().toISOString(),
    updated_at: data.updated_at || new Date().toISOString(),
    created_by: null,
    updated_by: null,
    stok: parseFloat(data.stok || 0),
    stock: parseFloat(data.stok || 0), // Alternative field name
  } as KoperasiProduk;
};

/**
 * Create produk koperasi
 */
export const createKoperasiProduk = async (data: KoperasiFormData): Promise<KoperasiProduk> => {
  const { data: { user } } = await supabase.auth.getUser();

  const { data: produk, error } = await supabase
    .from('kop_barang')
    .insert([{
      kode_barang: data.kode_produk,
      nama_barang: data.nama_produk,
      kategori_id: data.kategori_id || null,
      sumber_modal_id: data.sumber_modal_id,
      satuan_dasar: data.satuan || 'pcs',
      harga_beli: data.harga_beli || 0,
      harga_jual_ecer: data.harga_jual_ecer || 0,
      harga_jual_grosir: data.harga_jual_grosir || 0,
      stok_minimum: data.stok_minimum || 5,
      stok: 0, // Stok awal 0, akan bertambah saat pembelian
      is_active: true,
      owner_type: data.owner_type || 'koperasi',
      bagi_hasil_yayasan: data.bagi_hasil_yayasan || 0,
      inventaris_id: data.inventaris_id || null,
    }])
    .select(`
      id,
      kode_barang,
      nama_barang,
      kategori_id,
      sumber_modal_id,
      satuan_dasar,
      harga_beli,
      harga_jual_ecer,
      harga_jual_grosir,
      stok_minimum,
      stok,
      is_active,
      owner_type,
      bagi_hasil_yayasan,
      inventaris_id,
      created_at,
      updated_at
    `)
    .single();

  if (error) throw error;
  
  // Map to KoperasiProduk format
  return {
    id: produk.id,
    kode_produk: produk.kode_barang || '',
    nama_produk: produk.nama_barang || '',
    kategori: null,
    satuan: produk.satuan_dasar || 'pcs',
    harga_beli: parseFloat(produk.harga_beli || 0),
    harga_jual_ecer: parseFloat(produk.harga_jual_ecer || 0),
    harga_jual_grosir: parseFloat(produk.harga_jual_grosir || 0),
    harga_jual: parseFloat(produk.harga_jual_ecer || 0), // Backward compatibility
    owner_type: (produk.owner_type || 'koperasi') as 'koperasi' | 'yayasan',
    bagi_hasil_yayasan: parseFloat(produk.bagi_hasil_yayasan || 0),
    margin_persen: produk.harga_beli > 0 
      ? ((parseFloat(produk.harga_jual_ecer || 0) - parseFloat(produk.harga_beli || 0)) / parseFloat(produk.harga_beli || 0)) * 100 
      : 0,
    barcode: null,
    deskripsi: null,
    foto_url: null,
    is_active: produk.is_active !== false,
    inventaris_id: produk.inventaris_id || null,
    sumber_modal_id: produk.sumber_modal_id || '',
    created_at: produk.created_at || new Date().toISOString(),
    updated_at: produk.updated_at || new Date().toISOString(),
    created_by: null,
    updated_by: null,
    stok: parseFloat(produk.stok || 0),
    stock: parseFloat(produk.stok || 0), // Alternative field name
  } as KoperasiProduk;
};

/**
 * Update produk koperasi
 */
export const updateKoperasiProduk = async (
  id: string,
  data: Partial<KoperasiFormData>
): Promise<KoperasiProduk> => {
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  // Map KoperasiFormData fields to kop_barang fields
  if (data.kode_produk !== undefined) updateData.kode_barang = data.kode_produk;
  if (data.nama_produk !== undefined) updateData.nama_barang = data.nama_produk;
  if (data.kategori_id !== undefined) updateData.kategori_id = data.kategori_id;
  if (data.sumber_modal_id !== undefined) updateData.sumber_modal_id = data.sumber_modal_id;
  if (data.satuan !== undefined) updateData.satuan_dasar = data.satuan;
  if (data.harga_beli !== undefined) updateData.harga_beli = data.harga_beli;
  if (data.harga_jual_ecer !== undefined) updateData.harga_jual_ecer = data.harga_jual_ecer;
  if (data.harga_jual_grosir !== undefined) updateData.harga_jual_grosir = data.harga_jual_grosir;
  if (data.stok_minimum !== undefined) updateData.stok_minimum = data.stok_minimum;
  if (data.owner_type !== undefined) updateData.owner_type = data.owner_type;
  if (data.bagi_hasil_yayasan !== undefined) updateData.bagi_hasil_yayasan = data.bagi_hasil_yayasan;
  if (data.inventaris_id !== undefined) updateData.inventaris_id = data.inventaris_id;

  const { data: produk, error } = await supabase
    .from('kop_barang')
    .update(updateData)
    .eq('id', id)
    .select(`
      id,
      kode_barang,
      nama_barang,
      kategori_id,
      sumber_modal_id,
      satuan_dasar,
      harga_beli,
      harga_jual_ecer,
      harga_jual_grosir,
      stok_minimum,
      stok,
      is_active,
      owner_type,
      bagi_hasil_yayasan,
      inventaris_id,
      created_at,
      updated_at
    `)
    .single();

  if (error) throw error;
  
  // Map to KoperasiProduk format
  return {
    id: produk.id,
    kode_produk: produk.kode_barang || '',
    nama_produk: produk.nama_barang || '',
    kategori: null,
    satuan: produk.satuan_dasar || 'pcs',
    harga_beli: parseFloat(produk.harga_beli || 0),
    harga_jual_ecer: parseFloat(produk.harga_jual_ecer || 0),
    harga_jual_grosir: parseFloat(produk.harga_jual_grosir || 0),
    harga_jual: parseFloat(produk.harga_jual_ecer || 0), // Backward compatibility
    owner_type: (produk.owner_type || 'koperasi') as 'koperasi' | 'yayasan',
    bagi_hasil_yayasan: parseFloat(produk.bagi_hasil_yayasan || 0),
    margin_persen: produk.harga_beli > 0 
      ? ((parseFloat(produk.harga_jual_ecer || 0) - parseFloat(produk.harga_beli || 0)) / parseFloat(produk.harga_beli || 0)) * 100 
      : 0,
    barcode: null,
    deskripsi: null,
    foto_url: null,
    is_active: produk.is_active !== false,
    inventaris_id: produk.inventaris_id || null,
    sumber_modal_id: produk.sumber_modal_id || '',
    created_at: produk.created_at || new Date().toISOString(),
    updated_at: produk.updated_at || new Date().toISOString(),
    created_by: null,
    updated_by: null,
    stok: parseFloat(produk.stok || 0),
    stock: parseFloat(produk.stok || 0), // Alternative field name
  } as KoperasiProduk;
};

/**
 * Delete produk koperasi (soft delete)
 */
export const deleteKoperasiProduk = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('kop_barang')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw error;
};

// =====================================================
// TRANSAKSI PEMBELIAN
// =====================================================

/**
 * Create transaksi pembelian
 */
export const createPembelianKoperasi = async (
  data: PembelianFormData
): Promise<KoperasiTransaksi> => {
  const { data: { user } } = await supabase.auth.getUser();

  // Get produk untuk validasi
  const produk = await getKoperasiProduk(data.produk_id);
  if (!produk) throw new Error('Produk tidak ditemukan');

  const totalBeli = data.harga_beli * data.jumlah;

  const { data: transaksi, error } = await supabase
    .from('transaksi_koperasi')
    .insert([{
      produk_id: data.produk_id,
      tipe: 'Pembelian',
      jumlah: data.jumlah,
      harga_beli: data.harga_beli,
      total_beli: totalBeli,
      sumber: data.sumber,
      referensi_inventaris_id: data.referensi_inventaris_id || null,
      supplier: data.supplier || null,
      tanggal: data.tanggal,
      catatan: data.catatan || null,
      created_by: user?.id
    }])
    .select(`
      *,
      produk:koperasi(*)
    `)
    .single();

  if (error) throw error;

  // Jika dari inventaris, auto-post ke keuangan sebagai pengeluaran
  if (data.sumber === 'Inventaris' && data.referensi_inventaris_id) {
    try {
      await addKeuanganTransaction({
        jenis_transaksi: 'Pengeluaran',
        kategori: 'Pembelian Inventaris ke Koperasi',
        jumlah: totalBeli,
        tanggal: data.tanggal,
        referensi: `koperasi_pembelian:${transaksi.id}`
      });
    } catch (e) {
      console.warn('Gagal auto-post ke keuangan:', e);
    }
  }

  return transaksi as KoperasiTransaksi;
};

// =====================================================
// TRANSAKSI PENJUALAN
// =====================================================

/**
 * Create transaksi penjualan
 */
export const createPenjualanKoperasi = async (
  data: PenjualanFormData
): Promise<KoperasiTransaksi> => {
  const { data: { user } } = await supabase.auth.getUser();

  // Get produk untuk validasi stok dan harga beli
  const produk = await getKoperasiProduk(data.produk_id);
  if (!produk) throw new Error('Produk tidak ditemukan');

  // Validasi stok
  if (produk.stok < data.jumlah) {
    throw new Error(`Stok tidak mencukupi! Tersedia: ${produk.stok}, Dibutuhkan: ${data.jumlah}`);
  }

  const totalJual = data.harga_jual * data.jumlah;
  const totalBeli = produk.harga_beli * data.jumlah;

  const sumber = produk.inventaris_id ? 'Inventaris' : 'Vendor';

  const { data: transaksi, error } = await supabase
    .from('transaksi_koperasi')
    .insert([{
      produk_id: data.produk_id,
      tipe: 'Penjualan',
      jumlah: data.jumlah,
      harga_beli: produk.harga_beli,
      harga_jual: data.harga_jual,
      total_beli: totalBeli,
      total_jual: totalJual,
      sumber: sumber,
      referensi_inventaris_id: produk.inventaris_id,
      pembeli: data.pembeli,
      tanggal: data.tanggal,
      catatan: data.catatan || null,
      created_by: user?.id
    }])
    .select(`
      *,
      produk:koperasi(*)
    `)
    .single();

  if (error) throw error;

  // Auto-post ke keuangan sudah di-handle oleh trigger
  return transaksi as KoperasiTransaksi;
};

// =====================================================
// TRANSFER DARI INVENTARIS (Manual Approach)
// =====================================================
// Note: Modul koperasi akan dibuat sebagai aplikasi terpisah
// Function ini untuk referensi jika diperlukan workflow manual

/**
 * Transfer barang dari inventaris yayasan ke koperasi (manual approach)
 * Workflow: 
 * 1. Di inventaris: Buat transaksi keluar dengan mode "Penjualan" ke koperasi
 * 2. Di koperasi: Input manual transaksi pembelian menggunakan function ini
 */
export const transferFromInventaris = async (
  inventarisTransactionId: string, // ID transaksi keluar dari inventaris
  produkId: string,
  jumlah: number,
  hargaBeli: number // Harga beli dari inventaris (harga murah)
): Promise<KoperasiTransaksi> => {
  // Validasi produk koperasi
  const produk = await getKoperasiProduk(produkId);
  if (!produk) throw new Error('Produk koperasi tidak ditemukan');

  // Create transaksi pembelian di koperasi
  const pembelian = await createPembelianKoperasi({
    produk_id: produkId,
    jumlah: jumlah,
    harga_beli: hargaBeli,
    supplier: 'Inventaris Yayasan',
    sumber: 'Inventaris',
    referensi_inventaris_id: inventarisTransactionId,
    tanggal: new Date().toISOString().split('T')[0],
    catatan: `Transfer dari inventaris yayasan`
  });

  return pembelian;
};

// =====================================================
// LIST TRANSAKSI
// =====================================================

/**
 * Get transaksi koperasi dengan filtering
 */
export const listKoperasiTransaksi = async (
  pagination: { page: number; pageSize: number },
  filters?: {
    tipe?: 'Pembelian' | 'Penjualan';
    sumber?: 'Inventaris' | 'Vendor';
    startDate?: string;
    endDate?: string;
    produk_id?: string;
  },
  sort: { column: string; direction: 'asc' | 'desc' } = { column: 'tanggal', direction: 'desc' }
) => {
  const { page, pageSize } = pagination;
  
  let query = supabase
    .from('transaksi_koperasi')
    .select(`
      *,
      produk:koperasi(*)
    `, { count: 'exact' });

  if (filters?.tipe) query = query.eq('tipe', filters.tipe);
  if (filters?.sumber) query = query.eq('sumber', filters.sumber);
  if (filters?.produk_id) query = query.eq('produk_id', filters.produk_id);
  if (filters?.startDate) query = query.gte('tanggal', filters.startDate);
  if (filters?.endDate) query = query.lte('tanggal', filters.endDate);

  query = query.order(sort.column, { ascending: sort.direction === 'asc' });

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await query.range(from, to);

  if (error) throw error;

  return {
    data: (data || []) as KoperasiTransaksi[],
    total: count || 0
  };
};

// =====================================================
// SHU & STATISTIK
// =====================================================

/**
 * Get SHU data per bulan
 */
export const getSHUData = async (filters?: {
  startDate?: string;
  endDate?: string;
}): Promise<SHUData[]> => {
  let query = supabase
    .from('view_shu_koperasi')
    .select('*')
    .order('bulan', { ascending: false });

  if (filters?.startDate) {
    query = query.gte('bulan', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('bulan', filters.endDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as SHUData[];
};

/**
 * Get statistik koperasi
 */
export const getKoperasiStats = async (filters?: {
  startDate?: string;
  endDate?: string;
}) => {
  const startDate = filters?.startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const endDate = filters?.endDate || new Date().toISOString().split('T')[0];

  // Get total produk aktif
  const { count: totalProduk } = await supabase
    .from('kop_barang')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  // Get transaksi bulan ini
  const { data: transaksi, error } = await supabase
    .from('transaksi_koperasi')
    .select('tipe, total_jual, total_beli, keuntungan')
    .gte('tanggal', startDate)
    .lte('tanggal', endDate);

  if (error) throw error;

  const penjualan = transaksi?.filter(t => t.tipe === 'Penjualan') || [];
  const totalOmzet = penjualan.reduce((sum, t) => sum + (t.total_jual || 0), 0);
  const totalTransaksi = penjualan.length;
  const totalKeuntungan = penjualan.reduce((sum, t) => sum + (t.keuntungan || 0), 0);
  const rataRataHari = totalTransaksi > 0 ? totalOmzet / (new Date().getDate()) : 0;

  return {
    totalProduk: totalProduk || 0,
    totalOmzet,
    totalTransaksi,
    totalKeuntungan,
    rataRataHari
  };
};

// =====================================================
// KOPERASI SERVICE - Unified Sales & Analytics
// =====================================================

export const koperasiService = {
  // Wrap existing functions for compatibility
  getProduk: listKoperasiProduk,
  getProdukById: getKoperasiProduk,
  createProduk: createKoperasiProduk,
  updateProduk: updateKoperasiProduk,
  deleteProduk: deleteKoperasiProduk,
  // Note: createPenjualan is defined as async method below (line 1110)
  // Using createPenjualanKoperasi for legacy compatibility
  createPenjualanLegacy: createPenjualanKoperasi,
  getTransaksi: listKoperasiTransaksi,
  getSHUData,
  getStats: getKoperasiStats,

  /**
   * Get comprehensive keuangan dashboard stats with accounting variables
   */
  async getKeuanganDashboardStats(filters?: {
    startDate?: string;
    endDate?: string;
  }) {
    const currentDate = new Date();
    const startDate = filters?.startDate || new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
    const endDate = filters?.endDate || new Date().toISOString().split('T')[0];
    
    // 1. Get total penjualan from kop_penjualan (penjualan baru)
    const { data: penjualanData } = await supabase
      .from('kop_penjualan')
      .select(`
        id,
        tanggal,
        total_transaksi,
        kop_penjualan_detail(
          hpp_snapshot,
          margin,
          subtotal
        )
      `)
      .eq('status_pembayaran', 'lunas')
      .gte('tanggal', startDate)
      .lte('tanggal', endDate);
    
    // Calculate totals from kop_penjualan
    let totalPenjualanKop = 0;
    let totalHPPKop = 0;
    let totalLabaKotorKop = 0;
    
    if (penjualanData) {
      penjualanData.forEach((p: any) => {
        const totalTransaksi = parseFloat(p.total_transaksi || 0);
        totalPenjualanKop += totalTransaksi;
        
        if (p.kop_penjualan_detail && p.kop_penjualan_detail.length > 0) {
          p.kop_penjualan_detail.forEach((detail: any) => {
            const subtotal = parseFloat(detail.subtotal || 0);
            const margin = parseFloat(detail.margin || 0);
            const itemHPP = subtotal - margin;
            totalHPPKop += itemHPP;
            totalLabaKotorKop += margin;
          });
        } else {
          totalHPPKop += totalTransaksi * 0.5;
          totalLabaKotorKop += totalTransaksi * 0.5;
        }
      });
    }
    
    // 2. Get total penjualan from transaksi_inventaris (penjualan item yayasan historis)
    const { data: invSalesData } = await supabase
      .from('transaksi_inventaris')
      .select(`
        id,
        tanggal,
        harga_total,
        harga_satuan,
        jumlah,
        inventaris!inner(
          boleh_dijual_koperasi,
          is_komoditas,
          tipe_item,
          hpp_yayasan,
          harga_perolehan
        )
      `)
      .eq('tipe', 'Keluar')
      .eq('keluar_mode', 'Penjualan')
      .or('channel.is.null,channel.eq.koperasi')
      .not('harga_total', 'is', null)
      .gt('harga_total', 0)
      .gte('tanggal', startDate)
      .lte('tanggal', endDate);
    
    // Filter hanya item yayasan yang boleh dijual koperasi
    const filteredInvSales = (invSalesData || []).filter((tx: any) => {
      const inventaris = tx.inventaris;
      if (!inventaris) return false;
      return inventaris.boleh_dijual_koperasi === true ||
             inventaris.is_komoditas === true ||
             inventaris.tipe_item === 'Komoditas';
    });
    
    // Calculate totals from transaksi_inventaris
    let totalPenjualanInv = 0;
    let totalHPPInv = 0;
    let totalLabaKotorInv = 0;
    
    filteredInvSales.forEach((tx: any) => {
      const hargaTotal = parseFloat(tx.harga_total || 0);
      const jumlah = parseFloat(tx.jumlah || 0);
      const hppYayasan = tx.inventaris.hpp_yayasan || tx.inventaris.harga_perolehan || 0;
      const totalHPP = hppYayasan * jumlah;
      
      totalPenjualanInv += hargaTotal;
      totalHPPInv += totalHPP;
      totalLabaKotorInv += (hargaTotal - totalHPP);
    });
    
    // Combine totals
    const totalPenjualan = totalPenjualanKop + totalPenjualanInv;
    const totalHPP = totalHPPKop + totalHPPInv;
    const totalLabaKotor = totalLabaKotorKop + totalLabaKotorInv;
    
    // Also get from keuangan_koperasi for verification
    const { data: pemasukanData } = await supabase
      .from('keuangan_koperasi')
      .select('jumlah, laba_kotor, hpp')
      .eq('jenis_transaksi', 'Pemasukan')
      .eq('status', 'posted')
      .gte('tanggal', startDate)
      .lte('tanggal', endDate);
    
    const totalPenjualanFromKeuangan = (pemasukanData || []).reduce((sum, t) => sum + parseFloat(t.jumlah || 0), 0);
    const totalLabaKotorFromKeuangan = (pemasukanData || []).reduce((sum, t) => sum + parseFloat(t.laba_kotor || 0), 0);
    const totalHPPFromKeuangan = (pemasukanData || []).reduce((sum, t) => sum + parseFloat(t.hpp || 0), 0);
    
    // 3. Get total pengeluaran
    const { data: pengeluaranData } = await supabase
      .from('keuangan_koperasi')
      .select('jumlah')
      .eq('jenis_transaksi', 'Pengeluaran')
      .eq('status', 'posted')
      .gte('tanggal', startDate)
      .lte('tanggal', endDate);
    
    const totalPengeluaran = (pengeluaranData || []).reduce((sum, t) => sum + parseFloat(t.jumlah || 0), 0);
    
    // 4. Get beban ke yayasan (bagian_yayasan dari penjualan)
    const { data: bebanYayasanData } = await supabase
      .from('keuangan_koperasi')
      .select('bagian_yayasan')
      .eq('jenis_transaksi', 'Pemasukan')
      .eq('status', 'posted')
      .gte('tanggal', startDate)
      .lte('tanggal', endDate);
    
    const bebanKeYayasan = (bebanYayasanData || []).reduce((sum, t) => sum + parseFloat(t.bagian_yayasan || 0), 0);
    
    // 5. Get total setoran cash
    const { data: setoranData } = await supabase
      .from('kop_setoran_cash_kasir')
      .select('jumlah_setor')
      .eq('status', 'posted')
      .gte('tanggal_setor', startDate)
      .lte('tanggal_setor', endDate);
    
    const totalSetoranCash = (setoranData || []).reduce((sum, s) => sum + parseFloat(s.jumlah_setor || 0), 0);
    
    // 6. Get saldo cash di kasir (penjualan cash - setoran)
    const { data: penjualanCashData } = await supabase
      .from('kop_penjualan')
      .select('total_transaksi')
      .eq('metode_pembayaran', 'cash')
      .eq('status_pembayaran', 'lunas')
      .gte('tanggal', startDate)
      .lte('tanggal', endDate);
    
    const totalPenjualanCash = (penjualanCashData || []).reduce((sum, p) => sum + parseFloat(p.total_transaksi || 0), 0);
    const saldoCashDiKasir = totalPenjualanCash - totalSetoranCash;
    
    // 7. Get saldo kas koperasi
    const { data: akunKasData } = await supabase
      .from('akun_kas')
      .select('saldo_saat_ini')
      .eq('managed_by', 'koperasi')
      .eq('status', 'aktif');
    
    const saldoKasKoperasi = (akunKasData || []).reduce((sum, akun) => sum + parseFloat(akun.saldo_saat_ini || 0), 0);
    
    // 8. Calculate laba bersih
    const labaBersih = totalLabaKotor - totalPengeluaran;
    
    // 9. Get penjualan hari ini (dari kop_penjualan + transaksi_inventaris)
    const today = new Date().toISOString().split('T')[0];
    
    // Penjualan dari kop_penjualan
    const { data: penjualanHariIniKop } = await supabase
      .from('kop_penjualan')
      .select('id, total_transaksi')
      .eq('status_pembayaran', 'lunas')
      .eq('tanggal', today);
    
    // Penjualan dari transaksi_inventaris (item yayasan)
    const { data: penjualanHariIniInv } = await supabase
      .from('transaksi_inventaris')
      .select('id, harga_total, inventaris!inner(boleh_dijual_koperasi, is_komoditas, tipe_item)')
      .eq('tipe', 'Keluar')
      .eq('keluar_mode', 'Penjualan')
      .or('channel.is.null,channel.eq.koperasi')
      .not('harga_total', 'is', null)
      .eq('tanggal', today);
    
    const filteredInvHariIni = (penjualanHariIniInv || []).filter((tx: any) => {
      const inventaris = tx.inventaris;
      if (!inventaris) return false;
      return inventaris.boleh_dijual_koperasi === true ||
             inventaris.is_komoditas === true ||
             inventaris.tipe_item === 'Komoditas';
    });
    
    const penjualanHariIniKopTotal = (penjualanHariIniKop || []).reduce((sum, p) => sum + parseFloat(p.total_transaksi || 0), 0);
    const penjualanHariIniInvTotal = filteredInvHariIni.reduce((sum, tx) => sum + parseFloat(tx.harga_total || 0), 0);
    const penjualanHariIni = penjualanHariIniKopTotal + penjualanHariIniInvTotal;
    const totalTransaksiHariIni = (penjualanHariIniKop?.length || 0) + filteredInvHariIni.length;
    
    return {
      // Income/Revenue
      totalPenjualan,
      penjualanHariIni,
      totalTransaksiHariIni,
      
      // Expenses
      totalPengeluaran,
      bebanKeYayasan,
      
      // Profit
      totalHPP,
      labaKotor: totalLabaKotor,
      labaBersih,
      
      // Cash Management
      totalPenjualanCash,
      totalSetoranCash,
      saldoCashDiKasir,
      saldoKasKoperasi,
      
      // Additional metrics
      marginPersen: totalPenjualan > 0 ? (totalLabaKotor / totalPenjualan * 100) : 0,
      labaBersihPersen: totalPenjualan > 0 ? (labaBersih / totalPenjualan * 100) : 0,
    };
  },

  /**
   * Get dashboard stats (stub implementation)
   */
  async getDashboardStats() {
    // Get data from kop_barang for produk_aktif
    const { data: produkData, error: produkError } = await supabase
      .from('kop_barang')
      .select('id, stock, stock_minimum, is_active')
      .eq('is_active', true);
    
    const produk_aktif = produkData?.length || 0;
    const stock_alert = produkData?.filter(p => (p.stock || 0) <= (p.stock_minimum || 0)).length || 0;
    
    // Get penjualan hari ini from kop_penjualan
    const today = new Date().toISOString().split('T')[0];
    const { data: penjualanData } = await supabase
      .from('kop_penjualan')
      .select('total_transaksi, id')
      .gte('tanggal', today)
      .eq('status_pembayaran', 'lunas');
    
    const penjualan_hari_ini = penjualanData?.reduce((sum, p) => sum + parseFloat(p.total_transaksi || '0'), 0) || 0;
    const total_transaksi_hari_ini = penjualanData?.length || 0;
    
    // Get kas koperasi (akun kas managed by koperasi)
    const { data: kasData } = await supabase
      .from('akun_kas')
      .select('saldo_saat_ini')
      .eq('managed_by', 'koperasi')
      .eq('status', 'aktif')
      .maybeSingle();
    
    const kas_koperasi = kasData?.saldo_saat_ini || 0;
    
    return {
      penjualan_hari_ini,
      total_transaksi_hari_ini,
      kas_koperasi,
      produk_aktif,
      stock_alert,
    };
  },

  /**
   * Get stock alerts
   */
  async getStockAlerts() {
    const { data, error } = await supabase
      .from('kop_barang')
      .select('id, kode_barang, nama_barang, stock, stock_minimum, satuan')
      .eq('is_active', true)
      .order('stock', { ascending: true });
    
    if (error) throw error;
    
    // Filter items where stock <= stock_minimum
    const filtered = (data || []).filter(item => (item.stock || 0) <= (item.stock_minimum || 0));
    
    return filtered.map(item => ({
      ...item,
      status_stock: item.stock === 0 ? 'habis' : 'menipis',
      kode_produk: item.kode_barang,
      nama_produk: item.nama_barang,
    }));
  },

  /**
   * Get stock data
   */
  async getStock() {
    const { data, error } = await supabase
      .from('kop_barang')
      .select('id, stok, nama_barang, kode_barang')
      .eq('is_active', true)
      .order('nama_barang');
    
    if (error) throw error;
    // Map to expected format with produk_id field for compatibility
    return (data || []).map((item: any) => ({
      id: item.id,
      produk_id: item.id, // Add produk_id as alias for compatibility
      stock: item.stok ?? 0,
      stok: item.stok ?? 0, // Keep both for compatibility
      nama_barang: item.nama_barang,
      kode_barang: item.kode_barang,
    }));
  },

  /**
   * Get kewajiban koperasi ke yayasan
   */
  async getKewajibanKoperasiYayasan() {
    const { data, error } = await supabase
      .from('keuangan_koperasi')
      .select('jumlah, status')
      .eq('kategori', 'Kewajiban')
      .or('sub_kategori.ilike.%kewajiban%,sub_kategori.ilike.%hutang%')
      .eq('status', 'posted');
    
    if (error) throw error;
    
    const total = (data || []).reduce((sum, item) => sum + (item.jumlah || 0), 0);
    return { total_kewajiban: total };
  },

  /**
   * Open cashier shift
   */
  async openShift(kasirId: string, saldoAwal: number) {
    const { data, error } = await supabase
      .from('kop_shift_kasir')
      .insert({
        kasir_id: kasirId,
        saldo_awal: saldoAwal,
        status: 'open',
        waktu_buka: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Close cashier shift
   */
  async closeShift(shiftId: string, saldoAkhir: number) {
    const { data, error } = await supabase
      .from('kop_shift_kasir')
      .update({
        saldo_akhir: saldoAkhir,
        status: 'closed',
        waktu_tutup: new Date().toISOString(),
      })
      .eq('id', shiftId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Get active shift for kasir
   */
  async getActiveShift(kasirId: string) {
    const { data, error } = await supabase
      .from('kop_shift_kasir')
      .select('*')
      .eq('kasir_id', kasirId)
      .eq('status', 'open')
      .order('waktu_buka', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  /**
   * Generate nomor penjualan
   */
  async generateNoPenjualan() {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    
    // Get today's count
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const { count } = await supabase
      .from('kop_penjualan')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfDay);
    
    const seq = ((count || 0) + 1).toString().padStart(4, '0');
    return `KOP${year}${month}${day}-${seq}`;
  },

  /**
   * Calculate profit sharing for an item
   */
  calculateProfitSharing(subtotal: number, produk: any) {
    const margin = subtotal - ((produk.hpp || 0) * (produk.qty || 1));
    const ownerType = produk.owner_type || 'koperasi';
    
    if (ownerType === 'koperasi') {
      return {
        margin,
        bagian_yayasan: 0,
        bagian_koperasi: margin,
      };
    } else {
      const bagiHasilYayasan = produk.bagi_hasil_yayasan || 0.3;
      return {
        margin,
        bagian_yayasan: margin * bagiHasilYayasan,
        bagian_koperasi: margin * (1 - bagiHasilYayasan),
      };
    }
  },

  /**
   * Create penjualan with atomic stock validation and profit sharing calculation
   * Uses RPC function for atomic transaction
   * 
   * This function ensures:
   * - Atomic stock validation with FOR UPDATE locking (prevents race condition)
   * - Stock update and penjualan creation in single transaction
   * - HPP, bagian_yayasan, and bagian_koperasi are always calculated and filled
   * - Automatic kartu stok creation
   */
  async createPenjualan(data: KoperasiPenjualanInsert) {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Prepare items for RPC call
    const itemsJson = data.items.map(item => ({
      barang_id: item.produk_id,
      jumlah: item.jumlah,
      harga_satuan_jual: item.harga_jual,
      tipe_harga: item.price_type || 'ecer',
      sumber_modal_id: item.sumber_modal_id || null,
    }));
    
    // Convert tanggal string (YYYY-MM-DD) to ISO string with time
    // Frontend mengirim 'YYYY-MM-DD', tapi database butuh timestamptz
    let tanggalParam: string;
    if (data.tanggal && data.tanggal.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Jika format YYYY-MM-DD, tambahkan waktu
      tanggalParam = `${data.tanggal}T00:00:00.000Z`;
    } else {
      // Jika sudah format ISO, gunakan langsung
      tanggalParam = data.tanggal || new Date().toISOString();
    }
    
    console.log('🔧 createPenjualan - Parameters:', {
      no_penjualan: data.no_penjualan,
      tanggal: tanggalParam,
      kasir_id: data.kasir_id,
      items_count: itemsJson.length,
      total: data.total,
    });
    
    // Call atomic RPC function
    // Jika no_penjualan tidak ada, biarkan NULL - trigger akan auto-generate
    const { data: result, error } = await supabase.rpc(
      'rpc_create_penjualan_koperasi_atomic',
      {
        p_no_penjualan: data.no_penjualan || null, // NULL akan trigger auto-generate
        p_tanggal: tanggalParam,
        p_kasir_id: data.kasir_id,
        p_subtotal: data.subtotal,
        p_total: data.total,
        p_items: itemsJson,
        p_shift_id: data.shift_id || null,
        p_anggota_id: null, // Can be added later if needed
        p_tipe_pelanggan: 'umum', // Can be added later if needed
        p_diskon: data.diskon,
        p_metode_pembayaran: data.metode_bayar,
        p_status_pembayaran: 'lunas',
        p_user_id: user?.id || null,
      }
    );
    
    console.log('📥 RPC Response:', { result, error });
    
    if (error) {
      console.error('❌ Error creating penjualan:', error);
      console.error('❌ Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      // Check if error is related to GROUP BY clause
      if (error.message && error.message.includes('GROUP BY')) {
        throw new Error('Error database: Masalah dengan query GROUP BY. Silakan hubungi administrator untuk memperbaiki function database.');
      }
      // Check if error is related to UUID type mismatch
      if (error.message && (error.message.includes('uuid') || error.message.includes('operator does not exist'))) {
        throw new Error(`Error tipe data UUID: ${error.message}. Silakan hubungi administrator.`);
      }
      throw new Error(error.message || 'Gagal membuat penjualan');
    }
    
    if (!result) {
      console.error('❌ No result returned from RPC');
      throw new Error('Tidak ada response dari server. Silakan coba lagi.');
    }
    
    console.log('✅ RPC Result:', result);
    
    if (!result.success) {
      // Tampilkan pesan error yang lebih informatif
      const errorMessage = result?.error || 'Gagal membuat penjualan';
      console.error('❌ RPC returned error:', errorMessage);
      console.error('❌ RPC error details:', {
        error: result?.error,
        barang_id: result?.barang_id,
        barang_nama: result?.barang_nama,
        stok_available: result?.stok_available,
        stok_required: result?.stok_required,
      });
      // Jika ada informasi barang, tambahkan ke pesan
      if (result?.barang_nama) {
        throw new Error(`${errorMessage}\nBarang: ${result.barang_nama}\nStok tersedia: ${result.stok_available || 0}, Dibutuhkan: ${result.stok_required || 0}`);
      }
      // Jika error mengandung ID barang, coba fetch nama barang untuk menampilkan info lebih jelas
      if (errorMessage.includes('barang ID') && result?.barang_id) {
        throw new Error(`${errorMessage}\nSilakan cek stok barang di Master Barang.`);
      }
      throw new Error(errorMessage);
    }
    
    console.log('✅ Penjualan berhasil dibuat:', result.penjualan_id);
    
    // Jika RPC berhasil, langsung return data dari result tanpa fetch tambahan
    // Ini menghindari query tambahan yang mungkin menyebabkan error GROUP BY
    // Return minimal data yang diperlukan
    return {
      id: result.penjualan_id,
      no_penjualan: result.no_penjualan || data.no_penjualan,
      nomor_struk: result.no_penjualan || data.no_penjualan,
      tanggal: data.tanggal,
      total_transaksi: data.total,
      subtotal: data.subtotal,
      diskon: data.diskon,
      total: data.total,
      metode_pembayaran: data.metode_bayar,
      status_pembayaran: 'lunas',
      kasir_id: data.kasir_id,
      shift_id: data.shift_id || null,
      total_hpp: result.total_hpp || 0,
      total_margin: result.total_margin || 0,
      total_bagian_yayasan: result.total_bagian_yayasan || 0,
      total_bagian_koperasi: result.total_bagian_koperasi || 0,
      kop_penjualan_detail: [], // Detail akan di-fetch terpisah jika diperlukan
    } as any;
  },

  /**
   * Get penjualan by ID with kasir name
   */
  async getPenjualanById(penjualanId: string) {
    // Get penjualan data
    const { data, error } = await supabase
      .from('kop_penjualan')
      .select('*')
      .eq('id', penjualanId)
      .single();

    if (error) throw error;

    // Get kasir name separately (kasir_id doesn't have FK relationship to profiles)
    let namaKasir = null;
    if (data.kasir_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', data.kasir_id)
        .single();
      
      namaKasir = profile?.full_name || null;
    }

    return {
      ...data,
      nama_kasir: namaKasir,
    };
  },

  /**
   * Update bulk sale item HPP and profit sharing (stub)
   */
  async updateBulkSaleItemHPPAndProfitSharing(updates: any[]) {
    // This would be implemented based on the actual table structure
    console.log('updateBulkSaleItemHPPAndProfitSharing called with:', updates);
    return updates;
  },

  /**
   * Restore stock for edit mode (without deleting penjualan)
   * This allows user to edit penjualan without stock validation issues
   */
  async restoreStockForEdit(penjualanId: string) {
    console.log('🔄 restoreStockForEdit called with ID:', penjualanId);
    
    try {
      const { data: result, error } = await supabase.rpc(
        'restore_stock_for_edit_kop_penjualan',
        { p_penjualan_id: penjualanId }
      );

      if (error) {
        console.error('❌ RPC Error:', error);
        throw new Error(error.message || 'Gagal mengembalikan stok untuk edit');
      }

      if (result && !result.success) {
        console.error('❌ RPC Result Error:', result.error);
        throw new Error(result.error || 'Gagal mengembalikan stok untuk edit');
      }

      console.log('✅ Stok berhasil dikembalikan untuk edit');
      return result;
    } catch (error: any) {
      console.error('❌ Error in restoreStockForEdit:', error);
      throw error;
    }
  },

  /**
   * Reverse restore stock (reduce stock back) when canceling edit
   * This is needed to maintain stock accuracy if user cancels edit without checkout
   */
  async reverseRestoreStockForEdit(penjualanId: string) {
    console.log('🔄 reverseRestoreStockForEdit called with ID:', penjualanId);
    
    try {
      // Get penjualan detail to know how much stock to reduce
      const { data: detail, error: fetchError } = await supabase
        .from('kop_penjualan_detail')
        .select('barang_id, jumlah')
        .eq('penjualan_id', penjualanId);

      if (fetchError) {
        console.error('❌ Error fetching penjualan detail:', fetchError);
        throw new Error('Gagal mengambil detail penjualan');
      }

      if (!detail || detail.length === 0) {
        console.log('⚠️ No detail found, nothing to reverse');
        return { success: true, message: 'No items to reverse' };
      }

      // Reduce stock for each item
      for (const item of detail) {
        // Get current stock
        const { data: barang, error: fetchError } = await supabase
          .from('kop_barang')
          .select('stok')
          .eq('id', item.barang_id)
          .single();

        if (fetchError || !barang) {
          console.error(`❌ Error fetching stock for ${item.barang_id}:`, fetchError);
          continue;
        }

        // Calculate new stock (ensure non-negative)
        const currentStock = Math.max(0, Math.floor(barang.stok || 0));
        const newStock = Math.max(0, currentStock - item.jumlah);

        // Update stock
        const { error: updateError } = await supabase
          .from('kop_barang')
          .update({ stok: newStock })
          .eq('id', item.barang_id);

        if (updateError) {
          console.error(`❌ Error reducing stock for ${item.barang_id}:`, updateError);
        }
      }

      console.log('✅ Stok berhasil dikurangi kembali (reverse restore)');
      return { success: true, message: 'Stock reversed successfully' };
    } catch (error: any) {
      console.error('❌ Error in reverseRestoreStockForEdit:', error);
      // Don't throw, just log - this is a cleanup operation
      return { success: false, error: error.message };
    }
  },

  /**
   * Update existing penjualan
   * Strategy: Delete old transaction and create new one (safer than in-place update)
   * Note: Stock should already be restored when entering edit mode
   * To avoid double restore, we reverse restore first, then delete (which will restore again to correct value)
   */
  async updatePenjualan(penjualanId: string, data: KoperasiPenjualanInsert) {
    console.log('🔄 updatePenjualan called with ID:', penjualanId);
    
    try {
      // Step 1: Reverse restore stock (reduce stock back to original value before edit)
      // This is needed because stock was restored when entering edit mode
      await this.reverseRestoreStockForEdit(penjualanId);
      console.log('✅ Stock reversed to original value');
      
      // Step 2: Delete old penjualan (this will restore stock again to correct value)
      await this.deletePenjualan(penjualanId);
      console.log('✅ Old penjualan deleted, stock restored');
      
      // Step 3: Create new penjualan with updated data (this will reduce stock)
      const newPenjualan = await this.createPenjualan(data);
      console.log('✅ New penjualan created:', newPenjualan.id);
      
      return newPenjualan;
    } catch (error: any) {
      console.error('❌ Error updating penjualan:', error);
      throw new Error(error.message || 'Gagal memperbarui penjualan');
    }
  },

  /**
   * Get unified sales history from both kop_penjualan and transaksi_inventaris
   */
  async getUnifiedSalesHistory(filters?: {
    startDate?: string;
    endDate?: string;
    filterOwnerType?: 'all' | 'koperasi' | 'yayasan';
  }) {
    const { startDate, endDate, filterOwnerType = 'all' } = filters || {};
    
    // Get sales from kop_penjualan - ambil semua penjualan yang valid
    // Jangan filter berdasarkan detail karena detail mungkin kosong (akan diperbaiki nanti)
    let kopQuery = supabase
      .from('kop_penjualan')
      .select(`
        id,
        tanggal,
        total_transaksi,
        metode_pembayaran,
        kasir_id,
        created_at,
        nomor_struk,
        items_summary,
        kop_penjualan_detail(id)
      `)
      .eq('status_pembayaran', 'lunas')
      .gt('total_transaksi', 0); // Only transactions with positive total
    
    // Apply date filters - ensure proper chaining
    if (startDate) {
      kopQuery = kopQuery.gte('tanggal', startDate);
    }
    if (endDate) {
      kopQuery = kopQuery.lte('tanggal', endDate);
    }
    
    kopQuery = kopQuery.order('tanggal', { ascending: false });
    
    const { data: kopSales, error: kopError } = await kopQuery;
    if (kopError) {
      console.error('Error fetching kop_penjualan:', kopError);
      throw kopError;
    }
    
    // Get sales from transaksi_inventaris
    let invQuery = supabase
      .from('transaksi_inventaris')
      .select(`
        id,
        tanggal,
        harga_total,
        channel,
        inventaris (
          nama_barang,
          owner_type,
          boleh_dijual_koperasi,
          is_komoditas,
          tipe_item
        ),
        created_at
      `)
      .eq('tipe', 'Keluar')
      .eq('keluar_mode', 'Penjualan')
      .not('harga_total', 'is', null);
    
    // Apply date filters - ensure proper chaining
    if (startDate) {
      invQuery = invQuery.gte('tanggal', startDate);
    }
    if (endDate) {
      invQuery = invQuery.lte('tanggal', endDate);
    }
    
    invQuery = invQuery.order('tanggal', { ascending: false });
    
    const { data: invSales, error: invError } = await invQuery;
    if (invError) {
      console.error('Error fetching transaksi_inventaris:', invError);
      throw invError;
    }
    
    // Process and combine results
    let results: any[] = [];
    
    // Add kop_penjualan sales - deduplicate and filter invalid transactions
    if (filterOwnerType === 'all' || filterOwnerType === 'koperasi') {
      // Deduplicate kopSales by id (inner join can create duplicates)
      const uniqueKopSalesMap = new Map();
      (kopSales || []).forEach((s: any) => {
        if (!uniqueKopSalesMap.has(s.id)) {
          uniqueKopSalesMap.set(s.id, s);
        }
      });
      const uniqueKopSales = Array.from(uniqueKopSalesMap.values());
      
      results = results.concat(uniqueKopSales
        .filter((s: any) => {
          // Filter out invalid transactions - hanya pastikan total > 0 dan id ada
          // Jangan filter berdasarkan detail karena detail mungkin kosong
          const total = parseFloat(s.total_transaksi || 0);
          return total > 0 && s.id;
        })
        .map((s: any) => ({
          sale_id: s.id,
          tanggal: s.tanggal,
          customer_name: s.metode_pembayaran || s.nomor_struk || '-',
          total_amount: parseFloat(s.total_transaksi || 0),
          source_type: 'kop_penjualan' as const,
          created_at: s.created_at,
          created_by: s.kasir_id || undefined, // Use kasir_id as created_by for compatibility
          items_summary: s.items_summary || null, // NEW: Include items_summary
          nomor_struk: s.nomor_struk || null, // NEW: Include nomor_struk
        })));
    }
    
    // Add transaksi_inventaris sales - Filter hanya penjualan item yayasan yang boleh dijual koperasi
    // Semua data historis dari Kalkulator HPP adalah item yayasan
    const filteredInvSales = (invSales || []).filter((s: any) => {
      // Filter item yayasan yang boleh dijual koperasi
      const inventaris = s.inventaris;
      if (!inventaris) return false;
      
      const isYayasanItem = inventaris.boleh_dijual_koperasi === true ||
                            inventaris.is_komoditas === true ||
                            inventaris.tipe_item === 'Komoditas';
      
      if (!isYayasanItem) return false;
      
      // Filter channel: hanya koperasi atau null (untuk data historis)
      const channelValid = !s.channel || s.channel === 'koperasi' || s.channel === null;
      if (!channelValid) return false;
      
      // Apply owner type filter
      if (filterOwnerType === 'all') return true;
      if (filterOwnerType === 'koperasi') return inventaris.owner_type === 'koperasi';
      if (filterOwnerType === 'yayasan') return inventaris.owner_type !== 'koperasi';
      
      return true;
    });
    
    results = results.concat(filteredInvSales.map((s: any) => ({
      sale_id: s.id,
      tanggal: s.tanggal,
      customer_name: s.inventaris?.nama_barang || '-',
      total_amount: parseFloat(s.harga_total || 0),
      source_type: 'transaksi_inventaris' as const,
      created_at: s.created_at,
    })));
    
    // Deduplicate results by sale_id and source_type (in case of any duplicates)
    const seen = new Set<string>();
    const uniqueResults = results.filter((item) => {
      const key = `${item.source_type}-${item.sale_id}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
    
    // Sort by date (most recent first)
    uniqueResults.sort((a, b) => {
      const dateA = new Date(a.tanggal).getTime();
      const dateB = new Date(b.tanggal).getTime();
      if (dateA !== dateB) {
        return dateB - dateA;
      }
      // If same date, sort by created_at (most recent first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    
    return uniqueResults;
  },

  /**
   * Get sales summary with liabilities
   */
  async getSalesSummaryWithLiabilities(filters?: {
    startDate?: string;
    endDate?: string;
  }) {
    const { startDate, endDate } = filters || {};
    
    // Get kop_penjualan detail dengan query terpisah untuk menghindari masalah GROUP BY
    // Query kop_penjualan terlebih dahulu dengan filter tanggal
    let penjualanQuery = supabase
      .from('kop_penjualan')
      .select('id, tanggal, status_pembayaran')
      .eq('status_pembayaran', 'lunas');
    
    if (startDate) penjualanQuery = penjualanQuery.gte('tanggal', startDate);
    if (endDate) penjualanQuery = penjualanQuery.lte('tanggal', endDate);
    
    const { data: penjualanData, error: penjualanError } = await penjualanQuery;
    if (penjualanError) throw penjualanError;
    
    // Jika tidak ada penjualan, return empty summary
    if (!penjualanData || penjualanData.length === 0) {
      return {
        total_revenue: 0,
        total_hpp: 0,
        total_profit: 0,
        kewajiban_yayasan: 0,
        margin_koperasi: 0,
      };
    }
    
    const penjualanIds = penjualanData.map((p: any) => p.id);
    
    // Get kop_penjualan detail untuk penjualan yang sudah difilter
    let kopQuery = supabase
      .from('kop_penjualan_detail')
      .select(`
        hpp_snapshot,
        harga_satuan_jual,
        jumlah,
        margin,
        bagian_yayasan,
        bagian_koperasi,
        penjualan_id
      `)
      .in('penjualan_id', penjualanIds);
    
    const { data: kopDetails, error: kopError } = await kopQuery;
    if (kopError) throw kopError;
    
    // Get transaksi_inventaris (fetch separately to avoid relation issues)
    let invQuery = supabase
      .from('transaksi_inventaris')
      .select('harga_total, jumlah, item_id, tanggal')
      .eq('tipe', 'Keluar')
      .eq('keluar_mode', 'Penjualan')
      .not('harga_total', 'is', null);
    
    if (startDate) invQuery = invQuery.gte('tanggal', startDate);
    if (endDate) invQuery = invQuery.lte('tanggal', endDate);
    
    const { data: invData, error: invError } = await invQuery;
    if (invError) throw invError;
    
    // Fetch inventaris data separately
    const itemIds = [...new Set((invData || []).map((t: any) => t.item_id).filter(Boolean))];
    let inventarisMap = new Map();
    
    if (itemIds.length > 0) {
      const { data: inventarisData } = await supabase
        .from('inventaris')
        .select('id, hpp_yayasan, owner_type, bagi_hasil_yayasan')
        .in('id', itemIds);
      
      inventarisMap = new Map((inventarisData || []).map((i: any) => [i.id, i]));
    }
    
    // Combine data
    const invTransactions = (invData || []).map((t: any) => ({
      ...t,
      inventaris: inventarisMap.get(t.item_id) || { hpp_yayasan: 0, owner_type: 'yayasan', bagi_hasil_yayasan: 0.3 }
    }));
    
    // Calculate summary
    let total_revenue = 0;
    let total_hpp = 0;
    let kewajiban_yayasan = 0;
    let margin_koperasi = 0;
    
    // Sum from kop_penjualan_detail
    (kopDetails || []).forEach((detail: any) => {
      const revenue = (detail.harga_satuan_jual || 0) * (detail.jumlah || 0);
      const hpp = (detail.hpp_snapshot || 0) * (detail.jumlah || 0);
      
      total_revenue += revenue;
      total_hpp += hpp;
      kewajiban_yayasan += detail.bagian_yayasan || 0;
      margin_koperasi += detail.bagian_koperasi || 0;
    });
    
    // Sum from transaksi_inventaris
    (invTransactions || []).forEach((trans: any) => {
      const revenue = trans.harga_total || 0;
      const jumlah = trans.jumlah || 1;
      const hpp = (trans.inventaris?.hpp_yayasan || 0) * jumlah;
      const margin = revenue - hpp;
      
      total_revenue += revenue;
      total_hpp += hpp;
      
      const ownerType = trans.inventaris?.owner_type || 'yayasan';
      if (ownerType === 'koperasi') {
        const bagiHasilYayasan = trans.inventaris?.bagi_hasil_yayasan || 0.3;
        kewajiban_yayasan += margin * bagiHasilYayasan;
        margin_koperasi += margin * (1 - bagiHasilYayasan);
      } else {
        kewajiban_yayasan += margin;
      }
    });
    
    return {
      total_revenue,
      total_hpp,
      total_profit: total_revenue - total_hpp,
      kewajiban_yayasan,
      margin_koperasi,
    };
  },

  /**
   * Get detailed sale information with profit sharing
   */
  async getSalesDetailWithProfitSharing(saleId: string, sourceType: string) {
    if (sourceType === 'kop_penjualan') {
      const { data, error } = await supabase
        .from('kop_penjualan')
        .select(`
          id,
          tanggal,
          total_transaksi,
          kop_penjualan_detail (
            id,
            jumlah,
            hpp_snapshot,
            harga_satuan_jual,
            margin,
            bagian_yayasan,
            bagian_koperasi,
            kop_barang (
              id,
              nama_barang,
              satuan_dasar
            )
          )
        `)
        .eq('id', saleId)
        .single();
      
      if (error) throw error;
      
      const items = (data.kop_penjualan_detail || []).map((detail: any) => ({
        id: detail.id,
        item_id: detail.kop_barang?.id || '',
        nama_barang: detail.kop_barang?.nama_barang || '',
        jumlah: detail.jumlah,
        satuan: detail.kop_barang?.satuan_dasar || '',
        harga_satuan_jual: detail.harga_satuan_jual,
        subtotal: detail.harga_satuan_jual * detail.jumlah,
        hpp: detail.hpp_snapshot || 0,
        profit: detail.margin || 0,
        bagian_yayasan: detail.bagian_yayasan,
        bagian_koperasi: detail.bagian_koperasi,
      }));
      
      const summary = {
        total_revenue: parseFloat(data.total_transaksi || 0),
        total_hpp: items.reduce((sum: number, item: any) => sum + (item.hpp * item.jumlah), 0),
        total_profit: items.reduce((sum: number, item: any) => sum + item.profit, 0),
        bagian_yayasan: items.reduce((sum: number, item: any) => sum + (item.bagian_yayasan || 0), 0),
        bagian_koperasi: items.reduce((sum: number, item: any) => sum + (item.bagian_koperasi || 0), 0),
        profit_sharing_ratio: '',
      };
      
      return {
        sale_id: data.id,
        source_type: sourceType,
        items,
        summary,
      };
    } else if (sourceType === 'transaksi_inventaris') {
      const { data, error } = await supabase
        .from('transaksi_inventaris')
        .select(`
          id,
          tanggal,
          harga_total,
          jumlah,
          inventaris:inventaris_id (
            id,
            nama_barang,
            satuan,
            hpp_yayasan,
            owner_type,
            bagi_hasil_yayasan
          )
        `)
        .eq('id', saleId)
        .single();
      
      if (error) throw error;
      
      // Extract inventaris (it's an object when using named relation)
      const inventaris = data.inventaris as any;
      
      const hpp = (inventaris?.hpp_yayasan || 0) * (data.jumlah || 1);
      const revenue = data.harga_total || 0;
      const profit = revenue - hpp;
      
      const ownerType = inventaris?.owner_type || 'yayasan';
      const bagiHasilYayasan = ownerType === 'koperasi' ? (inventaris?.bagi_hasil_yayasan || 0.3) : 1;
      
      const bagian_yayasan = profit * bagiHasilYayasan;
      const bagian_koperasi = profit * (1 - bagiHasilYayasan);
      
      const item = {
        id: data.id,
        item_id: inventaris?.id || '',
        nama_barang: inventaris?.nama_barang || '',
        jumlah: data.jumlah || 1,
        satuan: inventaris?.satuan || '',
        harga_total: revenue,
        hpp: inventaris?.hpp_yayasan || 0,
        profit,
        bagian_yayasan,
        bagian_koperasi,
      };
      
      return {
        sale_id: data.id,
        source_type: sourceType,
        items: [item],
        summary: {
          total_revenue: revenue,
          total_hpp: hpp,
          total_profit: profit,
          bagian_yayasan,
          bagian_koperasi,
          profit_sharing_ratio: '',
        },
      };
    }
    
    throw new Error('Unknown source type');
  },

  /**
   * Delete penjualan (kop_penjualan only, for now)
   * Uses RPC function delete_kop_penjualan to handle UUID properly and rollback stock
   * 
   * This function:
   * - Uses RPC to avoid UUID type mismatch errors
   * - Automatically rolls back stock for all items
   * - Deletes detail, header, and related financial entries
   * - All operations are atomic within the RPC function
   */
  async deletePenjualan(penjualanId: string) {
    console.log('🗑️ deletePenjualan called with ID:', penjualanId);
    
    // Validate penjualanId is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(penjualanId)) {
      console.error('❌ Invalid UUID format:', penjualanId);
      throw new Error(`Format ID penjualan tidak valid: ${penjualanId}`);
    }

    try {
      // Use RPC function to delete penjualan with proper UUID handling
      // This function handles:
      // - Stock rollback for all items
      // - Deletion of detail records
      // - Deletion of header record
      // - Deletion of related financial entries
      // - All in a single atomic transaction
      console.log('🔧 Calling RPC delete_kop_penjualan...');
      
      const { data: rpcResult, error: rpcError } = await supabase.rpc('delete_kop_penjualan', {
        p_penjualan_id: penjualanId
      });
      
      if (rpcError) {
        console.error('❌ RPC error:', rpcError);
        
        // Handle specific error cases
        if (rpcError.code === 'P0001' || rpcError.message?.includes('tidak ditemukan')) {
          throw new Error(`Penjualan dengan ID ${penjualanId} tidak ditemukan`);
        }
        
        if (rpcError.message?.includes('Stok menjadi negatif')) {
          throw new Error(`Gagal menghapus penjualan: ${rpcError.message}. Stok tidak mencukupi untuk rollback.`);
        }
        
        throw new Error(rpcError.message || 'Gagal menghapus penjualan');
      }
      
      // Check RPC result
      if (rpcResult && !rpcResult.success) {
        const errorMsg = rpcResult.error || 'Gagal menghapus penjualan';
        console.error('❌ RPC returned error:', errorMsg);
        throw new Error(errorMsg);
      }
      
      // Success
      const deletedItems = rpcResult?.deleted_items || 0;
      console.log(`✅ Penjualan berhasil dihapus. ${deletedItems} item(s) stok dikembalikan.`);
      
    } catch (error: any) {
      console.error('❌ Error in deletePenjualan:', error);
      
      // Re-throw with better error message
      if (error.message) {
        throw error;
      }
      throw new Error(`Gagal menghapus penjualan: ${error.toString()}`);
    }
  },

  /**
   * Get sales analytics data
   */
  async getSalesAnalytics(filters?: {
    startDate?: string;
    endDate?: string;
    monthlyTrendAllTime?: boolean;
  }) {
    const { startDate, endDate, monthlyTrendAllTime } = filters || {};

    // Get sales from kop_penjualan (new system) - for hourly data (uses filter)
    // Ambil detail dengan nama barang untuk popular items
    let kopQuery = supabase
      .from('kop_penjualan')
      .select(`
        id,
        tanggal,
        created_at,
        total_transaksi,
        nomor_struk,
        metode_pembayaran,
        items_summary,
        kop_penjualan_detail(
          id,
          jumlah,
          kop_barang(
            id,
            nama_barang
          )
        )
      `)
      .eq('status_pembayaran', 'lunas')
      .gt('total_transaksi', 0); // Hanya transaksi dengan total > 0

    // Apply date filters - ensure proper chaining
    if (startDate) {
      kopQuery = kopQuery.gte('tanggal', startDate);
    }
    if (endDate) {
      kopQuery = kopQuery.lte('tanggal', endDate);
    }
    
    kopQuery = kopQuery.order('tanggal', { ascending: false });

    const { data: kopSales, error: kopError } = await kopQuery;
    if (kopError) throw kopError;

    // Get sales from transaksi_inventaris (old system) - for hourly data (uses filter)
    // Hanya ambil penjualan koperasi (channel = 'koperasi' atau null untuk kompatibilitas)
    let invQuery = supabase
      .from('transaksi_inventaris')
      .select('id, tanggal, created_at, harga_total, jumlah, item_id, channel')
      .eq('tipe', 'Keluar')
      .eq('keluar_mode', 'Penjualan')
      .not('harga_total', 'is', null);

    // Apply date filters - ensure proper chaining
    if (startDate) {
      invQuery = invQuery.gte('tanggal', startDate);
    }
    if (endDate) {
      invQuery = invQuery.lte('tanggal', endDate);
    }
    
    invQuery = invQuery.order('tanggal', { ascending: false });

    const { data: invData, error: invError } = await invQuery;
    if (invError) {
      console.error('Error fetching transaksi_inventaris for analytics:', invError);
      throw invError;
    }
    
    // Filter hanya penjualan koperasi (channel = 'koperasi' atau null)
    const filteredInvData = (invData || []).filter((t: any) => 
      !t.channel || t.channel === 'koperasi' || t.channel === null
    );

    // Get all-time data for monthly trend (if monthlyTrendAllTime is true)
    let kopSalesAllTime: any[] = [];
    let invSalesAllTime: any[] = [];
    
    if (monthlyTrendAllTime) {
      // Get all kop_penjualan for monthly trend
      // Ambil detail dengan nama barang untuk popular items
      const { data: kopAll } = await supabase
        .from('kop_penjualan')
        .select(`
          id,
          tanggal,
          created_at,
          total_transaksi,
          nomor_struk,
          metode_pembayaran,
          items_summary,
          kop_penjualan_detail(
            id,
            jumlah,
            kop_barang(
              id,
              nama_barang
            )
          )
        `)
        .eq('status_pembayaran', 'lunas')
        .gt('total_transaksi', 0) // Hanya transaksi dengan total > 0
        .order('tanggal', { ascending: false });

      // Get all transaksi_inventaris for monthly trend
      const { data: invAllData } = await supabase
        .from('transaksi_inventaris')
        .select('id, tanggal, created_at, harga_total, jumlah, item_id, channel')
        .eq('tipe', 'Keluar')
        .eq('keluar_mode', 'Penjualan')
        .not('harga_total', 'is', null)
        .order('tanggal', { ascending: false });

      if (invAllData && invAllData.length > 0) {
        // Filter hanya penjualan koperasi
        const filteredInvAllData = invAllData.filter((t: any) => 
          !t.channel || t.channel === 'koperasi' || t.channel === null
        );
        
        const itemIdsAll = [...new Set(filteredInvAllData.map((t: any) => t.item_id).filter(Boolean))];
        if (itemIdsAll.length > 0) {
          const { data: inventarisAllData } = await supabase
            .from('inventaris')
            .select('id, nama_barang, boleh_dijual_koperasi, is_komoditas, tipe_item')
            .in('id', itemIdsAll);
          
          const inventarisAllMap = new Map((inventarisAllData || []).map((i: any) => [i.id, i]));
          
          // Filter hanya item yang boleh dijual koperasi
          invSalesAllTime = filteredInvAllData.filter((s: any) => {
            const inventaris = inventarisAllMap.get(s.item_id);
            if (!inventaris) return false;
            return inventaris.boleh_dijual_koperasi === true ||
                   inventaris.is_komoditas === true ||
                   inventaris.tipe_item === 'Komoditas';
          }).map((s: any) => ({
            ...s,
            inventaris: inventarisAllMap.get(s.item_id) || { nama_barang: 'Unknown' }
          }));
        }
      }

      kopSalesAllTime = kopAll || [];
    }

    // Fetch inventaris data separately
    const itemIds = [...new Set((filteredInvData || []).map((t: any) => t.item_id).filter(Boolean))];
    let inventarisMap = new Map();
    
    if (itemIds.length > 0) {
      const { data: inventarisData } = await supabase
        .from('inventaris')
        .select('id, nama_barang, boleh_dijual_koperasi, is_komoditas, tipe_item')
        .in('id', itemIds);
      
      inventarisMap = new Map((inventarisData || []).map((i: any) => [i.id, i]));
    }

    // Filter hanya item yang boleh dijual koperasi
    const invSales = (filteredInvData || []).filter((s: any) => {
      const inventaris = inventarisMap.get(s.item_id);
      if (!inventaris) return false;
      // Hanya item yayasan yang boleh dijual koperasi
      return inventaris.boleh_dijual_koperasi === true ||
             inventaris.is_komoditas === true ||
             inventaris.tipe_item === 'Komoditas';
    }).map((s: any) => ({
      ...s,
      inventaris: inventarisMap.get(s.item_id) || { nama_barang: 'Unknown' }
    }));

    // Combine and process data
    // Untuk kop_penjualan, gunakan detail dengan nama barang
    const allSales = [
      ...(kopSales || []).map((s: any) => {
        // Jika ada detail, gunakan detail dengan nama barang
        if (s.kop_penjualan_detail && s.kop_penjualan_detail.length > 0) {
          return {
            id: s.id,
            tanggal: s.tanggal,
            created_at: s.created_at,
            total: parseFloat(s.total_transaksi || 0),
            items: s.kop_penjualan_detail.map((d: any) => ({
              nama_barang: d.kop_barang?.nama_barang || 'Unknown',
              jumlah: d.jumlah || 0,
            })),
            source: 'kop_penjualan' as const,
          };
        }
        
        // Jika tidak ada detail, parse dari items_summary
        if (s.items_summary) {
          // Parse items_summary: "Beras Acik 25 Kg x1, Mie Sedaap Goreng x1"
          const items = s.items_summary.split(', ').map((itemStr: string) => {
            const match = itemStr.match(/^(.+?)\s+x(\d+)$/);
            if (match) {
              return {
                nama_barang: match[1].trim(),
                jumlah: parseInt(match[2], 10) || 1,
              };
            }
            return {
              nama_barang: itemStr.trim(),
              jumlah: 1,
            };
          });
          
          return {
            id: s.id,
            tanggal: s.tanggal,
            created_at: s.created_at,
            total: parseFloat(s.total_transaksi || 0),
            items,
            source: 'kop_penjualan' as const,
          };
        }
        
        // Fallback terakhir: skip penjualan ini dari popular items
        return {
          id: s.id,
          tanggal: s.tanggal,
          created_at: s.created_at,
          total: parseFloat(s.total_transaksi || 0),
          items: [], // Skip dari popular items
          source: 'kop_penjualan' as const,
        };
      }),
      ...(invSales || []).map((s: any) => ({
        id: s.id,
        tanggal: s.tanggal,
        created_at: s.created_at,
        total: parseFloat(s.harga_total || 0),
        items: [{
          nama_barang: s.inventaris?.nama_barang || 'Unknown',
          jumlah: s.jumlah || 0,
        }],
        source: 'transaksi_inventaris' as const,
      })),
    ];

    // Calculate hourly distribution (uses filtered data)
    const hourlyData: Record<number, number> = {};
    allSales.forEach((sale) => {
      if (sale.created_at) {
        const hour = new Date(sale.created_at).getHours();
        hourlyData[hour] = (hourlyData[hour] || 0) + sale.total;
      }
    });

    // Calculate daily sales trend - use all-time data for monthly trend if requested
    let salesForDailyTrend = allSales;
    if (monthlyTrendAllTime && kopSalesAllTime.length > 0) {
      // Combine all-time data for monthly trend
      salesForDailyTrend = [
        ...(kopSalesAllTime || []).map((s: any) => {
          // Jika ada detail, gunakan detail dengan nama barang
          if (s.kop_penjualan_detail && s.kop_penjualan_detail.length > 0) {
            return {
              id: s.id,
              tanggal: s.tanggal,
              created_at: s.created_at,
              total: parseFloat(s.total_transaksi || 0),
              items: s.kop_penjualan_detail.map((d: any) => ({
                nama_barang: d.kop_barang?.nama_barang || 'Unknown',
                jumlah: d.jumlah || 0,
              })),
              source: 'kop_penjualan' as const,
            };
          }
          
          // Jika tidak ada detail, parse dari items_summary
          if (s.items_summary) {
            const items = s.items_summary.split(', ').map((itemStr: string) => {
              const match = itemStr.match(/^(.+?)\s+x(\d+)$/);
              if (match) {
                return {
                  nama_barang: match[1].trim(),
                  jumlah: parseInt(match[2], 10) || 1,
                };
              }
              return {
                nama_barang: itemStr.trim(),
                jumlah: 1,
              };
            });
            
            return {
              id: s.id,
              tanggal: s.tanggal,
              created_at: s.created_at,
              total: parseFloat(s.total_transaksi || 0),
              items,
              source: 'kop_penjualan' as const,
            };
          }
          
          // Fallback terakhir: skip penjualan ini dari popular items
          return {
            id: s.id,
            tanggal: s.tanggal,
            created_at: s.created_at,
            total: parseFloat(s.total_transaksi || 0),
            items: [], // Skip dari popular items
            source: 'kop_penjualan' as const,
          };
        }),
        ...(invSalesAllTime || []).map((s: any) => ({
          id: s.id,
          tanggal: s.tanggal,
          created_at: s.created_at,
          total: parseFloat(s.harga_total || 0),
          items: [{
            nama_barang: s.inventaris?.nama_barang || 'Unknown',
            jumlah: s.jumlah || 0,
          }],
          source: 'transaksi_inventaris' as const,
        })),
      ];
    }

    const dailyData: Record<string, number> = {};
    salesForDailyTrend.forEach((sale) => {
      const dateKey = sale.tanggal;
      dailyData[dateKey] = (dailyData[dateKey] || 0) + sale.total;
    });

    // Calculate popular items
    const itemCounts: Record<string, { nama: string; jumlah: number; total: number }> = {};
    allSales.forEach((sale) => {
      // Skip jika tidak ada items (untuk penjualan tanpa detail)
      if (!sale.items || sale.items.length === 0) return;
      
      sale.items.forEach((item) => {
        // Skip jika nama barang tidak valid
        if (!item.nama_barang || item.nama_barang === 'Unknown' || item.nama_barang.includes('PJ-')) {
          return;
        }
        
        if (!itemCounts[item.nama_barang]) {
          itemCounts[item.nama_barang] = {
            nama: item.nama_barang,
            jumlah: 0,
            total: 0,
          };
        }
        itemCounts[item.nama_barang].jumlah += item.jumlah;
        // Distribute total berdasarkan proporsi jumlah item
        const itemProportion = sale.items.length > 0 ? item.jumlah / sale.items.reduce((sum: number, i: any) => sum + i.jumlah, 0) : 1 / sale.items.length;
        itemCounts[item.nama_barang].total += sale.total * itemProportion;
      });
    });

    const popularItems = Object.values(itemCounts)
      .sort((a, b) => b.jumlah - a.jumlah)
      .slice(0, 10);

    return {
      hourlyData,
      dailyData,
      popularItems,
      totalSales: allSales.length,
      totalRevenue: allSales.reduce((sum, s) => sum + s.total, 0),
    };
  },
};

// Setoran Cash Kasir Functions
export const setoranCashKasirService = {
  // Get total cash sales for kasir (belum disetor)
  async getTotalCashSalesForKasir(kasirId: string, shiftId?: string) {
    // Get all cash sales for this kasir
    let query = supabase
      .from('kop_penjualan')
      .select('id, total_transaksi, metode_pembayaran, tanggal')
      .eq('kasir_id', kasirId)
      .eq('metode_pembayaran', 'cash')
      .eq('status_pembayaran', 'lunas');

    if (shiftId) {
      // Note: shift_id tidak ada di kop_penjualan, jadi kita skip filter ini
      // Jika shift diperlukan, bisa filter berdasarkan tanggal
    }

    const { data: allPenjualan, error } = await query;
    if (error) throw error;

    // Get penjualan yang sudah di-post ke keuangan_koperasi (sudah disetor)
    const { data: postedSales } = await supabase
      .from('keuangan_koperasi')
      .select('source_id')
      .eq('source_module', 'kop_penjualan')
      .eq('jenis_transaksi', 'Pemasukan')
      .eq('status', 'posted')
      .in('source_id', (allPenjualan || []).map((p: any) => p.id));

    const postedSaleIds = new Set((postedSales || []).map((s: any) => s.source_id));

    // Filter penjualan yang belum disetor (belum ada di keuangan_koperasi)
    const belumDisetor = (allPenjualan || []).filter((p: any) => !postedSaleIds.has(p.id));

    // Calculate total cash sales yang belum disetor
    const totalPenjualanCash = belumDisetor.reduce(
      (sum: number, p: any) => sum + parseFloat(p.total_transaksi || 0),
      0
    );

    return totalPenjualanCash;
  },

  // Get total setoran kasir
  async getTotalSetoranKasir(kasirId: string, shiftId?: string) {
    let query = supabase
      .from('kop_setoran_cash_kasir')
      .select('jumlah_setor')
      .eq('kasir_id', kasirId)
      .eq('status', 'posted');

    // Note: shift_id tidak ada di kop_setoran_cash_kasir
    // Jika shift diperlukan, bisa filter berdasarkan tanggal_setor
    // if (shiftId) {
    //   query = query.eq('shift_id', shiftId);
    // }

    const { data, error } = await query;
    if (error) throw error;

    const total = (data || []).reduce((sum: number, s: any) => sum + parseFloat(s.jumlah_setor || 0), 0);
    return total;
  },

  // Create setoran cash kasir
  async createSetoranCashKasir(data: {
    kasir_id: string;
    shift_id?: string;
    jumlah_setor: number;
    total_penjualan_tunai_snapshot: number;
    total_setoran_sebelumnya: number;
    akun_kas_id?: string;
    metode_setor?: 'cash' | 'transfer';
    catatan?: string;
  }) {
    const { data: user } = await supabase.auth.getUser();
    
    const selisih = data.total_penjualan_tunai_snapshot - (data.total_setoran_sebelumnya + data.jumlah_setor);

    const { data: result, error } = await supabase
      .from('kop_setoran_cash_kasir')
      .insert({
        kasir_id: data.kasir_id,
        // Note: shift_id tidak ada di kop_setoran_cash_kasir, jadi kita skip
        // shift_id: data.shift_id || null,
        jumlah_setor: data.jumlah_setor,
        total_penjualan_tunai_snapshot: data.total_penjualan_tunai_snapshot,
        total_setoran_sebelumnya: data.total_setoran_sebelumnya,
        selisih: selisih,
        akun_kas_id: data.akun_kas_id || null,
        metode_setor: data.metode_setor || 'cash',
        status: 'posted',
        catatan: data.catatan || null,
        created_by: user.user?.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Update akun kas saldo jika ada akun_kas_id
    if (data.akun_kas_id) {
      const { error: updateError } = await supabase.rpc('increment_akun_kas_saldo', {
        akun_kas_id: data.akun_kas_id,
        amount: data.jumlah_setor,
      });

      if (updateError) {
        console.error('Error updating akun kas saldo:', updateError);
      }
    }

    return result;
  },

  // Get riwayat setoran kasir
  async getRiwayatSetoranKasir(kasirId: string, filters?: {
    startDate?: string;
    endDate?: string;
  }) {
    let query = supabase
      .from('kop_setoran_cash_kasir')
      .select(`
        *,
        akun_kas (
          nama,
          kode
        )
      `)
      .eq('kasir_id', kasirId)
      .order('tanggal_setor', { ascending: false });

    if (filters?.startDate) {
      query = query.gte('tanggal_setor', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('tanggal_setor', filters.endDate);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },
};

