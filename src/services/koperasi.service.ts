import { supabase } from '@/integrations/supabase/client';
import { addKeuanganTransaction } from '@/services/keuangan.service';

// =====================================================
// TYPES
// =====================================================

export interface KoperasiProduk {
  id: string;
  nama_produk: string;
  kategori: string;
  harga_beli: number;
  harga_jual: number;
  margin: number;
  stok: number;
  stok_minimum: number;
  satuan?: string | null;
  sumber: 'Inventaris' | 'Vendor';
  referensi_inventaris_id?: string | null;
  supplier?: string | null;
  status: 'Aktif' | 'Non-Aktif';
  deskripsi?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

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
  kategori: string;
  harga_beli: number;
  harga_jual: number;
  stok_minimum?: number;
  satuan?: string;
  sumber: 'Inventaris' | 'Vendor';
  supplier?: string;
  deskripsi?: string;
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

  const { data, error } = await query;
  if (error) throw error;
  
  // Map kop_barang structure to KoperasiProduk structure
  return (data || []).map((item: any) => ({
    id: item.id,
    kode_produk: item.kode_barang,
    nama_produk: item.nama_barang,
    kategori: null, // Need to join to get kategori name
    satuan: item.satuan_dasar || 'pcs',
    harga_beli: parseFloat(item.harga_beli || 0),
    harga_jual_ecer: parseFloat(item.harga_jual_ecer || 0),
    harga_jual_grosir: parseFloat(item.harga_jual_grosir || 0),
    harga_jual: parseFloat(item.harga_jual_ecer || 0), // Backward compatibility
    owner_type: item.owner_type || 'koperasi',
    bagi_hasil_yayasan: item.bagi_hasil_yayasan || 0,
    barcode: null,
    deskripsi: null,
    foto_url: null,
    is_active: item.is_active !== false,
    inventaris_id: item.inventaris_id,
    sumber_modal_id: item.sumber_modal_id,
    created_at: item.created_at,
    updated_at: item.updated_at,
    created_by: null,
    updated_by: null,
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
    kode_produk: data.kode_barang,
    nama_produk: data.nama_barang,
    kategori: null, // Need to join to get kategori name
    satuan: data.satuan_dasar || 'pcs',
    harga_beli: parseFloat(data.harga_beli || 0),
    harga_jual_ecer: parseFloat(data.harga_jual_ecer || 0),
    harga_jual_grosir: parseFloat(data.harga_jual_grosir || 0),
    harga_jual: parseFloat(data.harga_jual_ecer || 0), // Backward compatibility
    owner_type: data.owner_type || 'koperasi',
    bagi_hasil_yayasan: data.bagi_hasil_yayasan || 0,
    barcode: null,
    deskripsi: null,
    foto_url: null,
    is_active: data.is_active !== false,
    inventaris_id: data.inventaris_id,
    sumber_modal_id: data.sumber_modal_id,
    created_at: data.created_at,
    updated_at: data.updated_at,
    created_by: null,
    updated_by: null,
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
    kode_produk: produk.kode_barang,
    nama_produk: produk.nama_barang,
    kategori: null,
    satuan: produk.satuan_dasar || 'pcs',
    harga_beli: parseFloat(produk.harga_beli || 0),
    harga_jual_ecer: parseFloat(produk.harga_jual_ecer || 0),
    harga_jual_grosir: parseFloat(produk.harga_jual_grosir || 0),
    harga_jual: parseFloat(produk.harga_jual_ecer || 0),
    owner_type: produk.owner_type || 'koperasi',
    bagi_hasil_yayasan: produk.bagi_hasil_yayasan || 0,
    barcode: null,
    deskripsi: null,
    foto_url: null,
    is_active: produk.is_active !== false,
    inventaris_id: produk.inventaris_id,
    sumber_modal_id: produk.sumber_modal_id,
    created_at: produk.created_at,
    updated_at: produk.updated_at,
    created_by: null,
    updated_by: null,
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
    kode_produk: produk.kode_barang,
    nama_produk: produk.nama_barang,
    kategori: null,
    satuan: produk.satuan_dasar || 'pcs',
    harga_beli: parseFloat(produk.harga_beli || 0),
    harga_jual_ecer: parseFloat(produk.harga_jual_ecer || 0),
    harga_jual_grosir: parseFloat(produk.harga_jual_grosir || 0),
    harga_jual: parseFloat(produk.harga_jual_ecer || 0),
    owner_type: produk.owner_type || 'koperasi',
    bagi_hasil_yayasan: produk.bagi_hasil_yayasan || 0,
    barcode: null,
    deskripsi: null,
    foto_url: null,
    is_active: produk.is_active !== false,
    inventaris_id: produk.inventaris_id,
    sumber_modal_id: produk.sumber_modal_id,
    created_at: produk.created_at,
    updated_at: produk.updated_at,
    created_by: null,
    updated_by: null,
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
      sumber: produk.sumber,
      referensi_inventaris_id: produk.referensi_inventaris_id,
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
  createPenjualan: createPenjualanKoperasi,
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
    
    // 1. Get total penjualan (Pemasukan)
    const { data: pemasukanData } = await supabase
      .from('keuangan_koperasi')
      .select('jumlah, laba_kotor, hpp')
      .eq('jenis_transaksi', 'Pemasukan')
      .eq('status', 'posted')
      .gte('tanggal', startDate)
      .lte('tanggal', endDate);
    
    const totalPenjualan = (pemasukanData || []).reduce((sum, t) => sum + parseFloat(t.jumlah || 0), 0);
    const totalLabaKotor = (pemasukanData || []).reduce((sum, t) => sum + parseFloat(t.laba_kotor || 0), 0);
    const totalHPP = (pemasukanData || []).reduce((sum, t) => sum + parseFloat(t.hpp || 0), 0);
    
    // 2. Get total pengeluaran
    const { data: pengeluaranData } = await supabase
      .from('keuangan_koperasi')
      .select('jumlah')
      .eq('jenis_transaksi', 'Pengeluaran')
      .eq('status', 'posted')
      .gte('tanggal', startDate)
      .lte('tanggal', endDate);
    
    const totalPengeluaran = (pengeluaranData || []).reduce((sum, t) => sum + parseFloat(t.jumlah || 0), 0);
    
    // 3. Get beban ke yayasan (bagian_yayasan dari penjualan)
    const { data: bebanYayasanData } = await supabase
      .from('keuangan_koperasi')
      .select('bagian_yayasan')
      .eq('jenis_transaksi', 'Pemasukan')
      .eq('status', 'posted')
      .gte('tanggal', startDate)
      .lte('tanggal', endDate);
    
    const bebanKeYayasan = (bebanYayasanData || []).reduce((sum, t) => sum + parseFloat(t.bagian_yayasan || 0), 0);
    
    // 4. Get total setoran cash
    const { data: setoranData } = await supabase
      .from('kop_setoran_cash_kasir')
      .select('jumlah_setor')
      .eq('status', 'posted')
      .gte('tanggal_setor', startDate)
      .lte('tanggal_setor', endDate);
    
    const totalSetoranCash = (setoranData || []).reduce((sum, s) => sum + parseFloat(s.jumlah_setor || 0), 0);
    
    // 5. Get saldo cash di kasir (penjualan cash - setoran)
    const { data: penjualanCashData } = await supabase
      .from('kop_penjualan')
      .select('total_transaksi')
      .eq('metode_pembayaran', 'cash')
      .eq('status_pembayaran', 'lunas')
      .gte('tanggal', startDate)
      .lte('tanggal', endDate);
    
    const totalPenjualanCash = (penjualanCashData || []).reduce((sum, p) => sum + parseFloat(p.total_transaksi || 0), 0);
    const saldoCashDiKasir = totalPenjualanCash - totalSetoranCash;
    
    // 6. Get saldo kas koperasi
    const { data: akunKasData } = await supabase
      .from('akun_kas')
      .select('saldo_saat_ini')
      .eq('managed_by', 'koperasi')
      .eq('status', 'aktif');
    
    const saldoKasKoperasi = (akunKasData || []).reduce((sum, akun) => sum + parseFloat(akun.saldo_saat_ini || 0), 0);
    
    // 7. Calculate laba bersih
    const labaBersih = totalLabaKotor - totalPengeluaran;
    
    // 8. Get penjualan hari ini
    const today = new Date().toISOString().split('T')[0];
    const { data: penjualanHariIniData } = await supabase
      .from('kop_penjualan')
      .select('id, total_transaksi')
      .eq('status_pembayaran', 'lunas')
      .eq('tanggal', today);
    
    const penjualanHariIni = (penjualanHariIniData || []).reduce((sum, p) => sum + parseFloat(p.total_transaksi || 0), 0);
    const totalTransaksiHariIni = penjualanHariIniData?.length || 0;
    
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
   * Update bulk sale item HPP and profit sharing (stub)
   */
  async updateBulkSaleItemHPPAndProfitSharing(updates: any[]) {
    // This would be implemented based on the actual table structure
    console.log('updateBulkSaleItemHPPAndProfitSharing called with:', updates);
    return updates;
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
    
    // Get sales from kop_penjualan - only those with details (valid transactions)
    let kopQuery = supabase
      .from('kop_penjualan')
      .select(`
        id,
        tanggal,
        total_transaksi,
        metode_pembayaran,
        kasir_id,
        created_at,
        kop_penjualan_detail!inner(id)
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
          // Filter out invalid transactions
          const total = parseFloat(s.total_transaksi || 0);
          return total > 0 && s.id && s.kop_penjualan_detail && s.kop_penjualan_detail.length > 0;
        })
        .map((s: any) => ({
          sale_id: s.id,
          tanggal: s.tanggal,
          customer_name: s.metode_pembayaran || '-',
          total_amount: parseFloat(s.total_transaksi || 0),
          source_type: 'kop_penjualan' as const,
          created_at: s.created_at,
          created_by: s.kasir_id || undefined, // Use kasir_id as created_by for compatibility
        })));
    }
    
    // Add transaksi_inventaris sales - Filter hanya penjualan koperasi
    const filteredInvSales = (invSales || []).filter((s: any) => {
      // Filter channel: hanya koperasi atau null
      const channelValid = !s.channel || s.channel === 'koperasi' || s.channel === null;
      if (!channelValid) return false;
      
      // Filter item yayasan yang boleh dijual koperasi
      const inventaris = s.inventaris;
      if (!inventaris) return false;
      
      const isYayasanItem = inventaris.boleh_dijual_koperasi === true ||
                            inventaris.is_komoditas === true ||
                            inventaris.tipe_item === 'Komoditas';
      
      // Apply owner type filter
      if (filterOwnerType === 'all') return isYayasanItem;
      if (filterOwnerType === 'koperasi') return inventaris.owner_type === 'koperasi';
      if (filterOwnerType === 'yayasan') return inventaris.owner_type !== 'koperasi' && isYayasanItem;
      
      return isYayasanItem;
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
    
    // Get kop_penjualan detail
    let kopQuery = supabase
      .from('kop_penjualan_detail')
      .select(`
        hpp_snapshot,
        harga_satuan_jual,
        jumlah,
        margin,
        bagian_yayasan,
        bagian_koperasi,
        kop_penjualan!inner (
          id,
          tanggal,
          status_pembayaran
        )
      `)
      .eq('kop_penjualan.status_pembayaran', 'lunas');
    
    if (startDate) kopQuery = kopQuery.gte('kop_penjualan.tanggal', startDate);
    if (endDate) kopQuery = kopQuery.lte('kop_penjualan.tanggal', endDate);
    
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
   */
  async deletePenjualan(penjualanId: string) {
    // Delete kop_penjualan (cascade will handle details)
    const { error } = await supabase
      .from('kop_penjualan')
      .delete()
      .eq('id', penjualanId);
    
    if (error) throw error;
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
    let kopQuery = supabase
      .from('kop_penjualan')
      .select(`
        id,
        tanggal,
        created_at,
        total_transaksi,
        kop_penjualan_detail (
          jumlah,
          kop_barang (
            nama_barang
          )
        )
      `)
      .eq('status_pembayaran', 'lunas');

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
      const { data: kopAll } = await supabase
        .from('kop_penjualan')
        .select('id, tanggal, created_at, total_transaksi, kop_penjualan_detail(jumlah, kop_barang(nama_barang))')
        .eq('status_pembayaran', 'lunas')
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
    const allSales = [
      ...(kopSales || []).map((s: any) => ({
        id: s.id,
        tanggal: s.tanggal,
        created_at: s.created_at,
        total: parseFloat(s.total_transaksi || 0),
        items: (s.kop_penjualan_detail || []).map((d: any) => ({
          nama_barang: d.kop_barang?.nama_barang || 'Unknown',
          jumlah: d.jumlah || 0,
        })),
        source: 'kop_penjualan' as const,
      })),
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
        ...(kopSalesAllTime || []).map((s: any) => ({
          id: s.id,
          tanggal: s.tanggal,
          created_at: s.created_at,
          total: parseFloat(s.total_transaksi || 0),
          items: (s.kop_penjualan_detail || []).map((d: any) => ({
            nama_barang: d.kop_barang?.nama_barang || 'Unknown',
            jumlah: d.jumlah || 0,
          })),
          source: 'kop_penjualan' as const,
        })),
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
      sale.items.forEach((item) => {
        if (!itemCounts[item.nama_barang]) {
          itemCounts[item.nama_barang] = {
            nama: item.nama_barang,
            jumlah: 0,
            total: 0,
          };
        }
        itemCounts[item.nama_barang].jumlah += item.jumlah;
        itemCounts[item.nama_barang].total += sale.total / sale.items.length; // Distribute total evenly
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
    let query = supabase
      .from('kop_penjualan')
      .select('id, total_transaksi, metode_pembayaran, tanggal')
      .eq('kasir_id', kasirId)
      .eq('metode_pembayaran', 'cash')
      .eq('status_pembayaran', 'lunas');

    if (shiftId) {
      query = query.eq('shift_id', shiftId);
    } else {
      // Jika tidak ada shift, ambil semua penjualan cash yang belum disetor
      const { data: setoranData } = await supabase
        .from('kop_setoran_cash_kasir')
        .select('penjualan_id')
        .eq('kasir_id', kasirId)
        .eq('status', 'posted');

      const setoranPenjualanIds = new Set((setoranData || []).map((s: any) => s.penjualan_id).filter(Boolean));

      const { data: allPenjualan } = await query;
      const belumDisetor = (allPenjualan || []).filter((p: any) => !setoranPenjualanIds.has(p.id));
      
      const total = belumDisetor.reduce((sum: number, p: any) => sum + parseFloat(p.total_transaksi || 0), 0);
      return total;
    }

    const { data, error } = await query;
    if (error) throw error;

    const total = (data || []).reduce((sum: number, p: any) => sum + parseFloat(p.total_transaksi || 0), 0);
    return total;
  },

  // Get total setoran kasir
  async getTotalSetoranKasir(kasirId: string, shiftId?: string) {
    let query = supabase
      .from('kop_setoran_cash_kasir')
      .select('jumlah_setor')
      .eq('kasir_id', kasirId)
      .eq('status', 'posted');

    if (shiftId) {
      query = query.eq('shift_id', shiftId);
    }

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
        shift_id: data.shift_id || null,
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

