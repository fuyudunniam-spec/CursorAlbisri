import { supabase } from '@/integrations/supabase/client';

export interface SalesTransaction {
  id: string;
  item_id: string;
  nama_barang: string;
  kategori: string;
  jumlah: number;
  harga_dasar: number;
  sumbangan: number;
  harga_satuan: number; // calculated: (harga_dasar * jumlah + sumbangan) / jumlah
  total_nilai: number; // harga_dasar * jumlah + sumbangan
  pembeli: string;
  tanggal: string;
  catatan?: string;
  keuangan_id?: string;
  created_at: string;
}

export interface SalesFormData {
  item_id: string;
  jumlah: number;
  harga_dasar: number;
  sumbangan: number;
  pembeli: string;
  tanggal: string;
  catatan?: string;
}

export interface SalesStats {
  totalPenjualan: number;
  totalTransaksi: number;
  totalJumlah: number;
  rataRataPenjualan: number;
  kategoriSummary: Record<string, { total: number; jumlah: number; transaksi: number }>;
  itemSummary: Array<{ nama: string; total: number; jumlah: number; transaksi: number; item_id: string }>;
}

export interface SalesFilters {
  startDate?: string;
  endDate?: string;
  kategori?: string;
  item_id?: string;
  pembeli?: string;
}

/**
 * Create a new sales transaction with price breakdown
 * 
 * DEPRECATED: Penjualan langsung dari inventaris tidak diperbolehkan.
 * Semua penjualan harus melalui transfer ke koperasi terlebih dahulu.
 * Gunakan koperasi kasir untuk penjualan.
 * 
 * @deprecated Use koperasi kasir instead
 */
export const createSalesTransaction = async (data: SalesFormData): Promise<SalesTransaction> => {
  // Validasi: Pastikan item sudah ditransfer ke koperasi
  const { data: transferCheck } = await supabase
    .from('transfer_inventaris')
    .select('id')
    .eq('item_id', data.item_id)
    .eq('tujuan', 'koperasi')
    .eq('status', 'approved')
    .limit(1);
  
  if (!transferCheck || transferCheck.length === 0) {
    throw new Error(
      'Penjualan langsung dari inventaris tidak diperbolehkan. ' +
      'Item harus ditransfer ke koperasi terlebih dahulu melalui halaman Transfer. ' +
      'Setelah transfer, gunakan Kasir Koperasi untuk melakukan penjualan.'
    );
  }
  
  // Calculate total value and unit price
  const totalNilai = (data.harga_dasar * data.jumlah) + data.sumbangan;
  const hargaSatuan = Math.max(0, Math.floor(totalNilai / data.jumlah));
  
  // Get user ID first
  const { data: { user } } = await supabase.auth.getUser();
  
  const payload = {
    item_id: data.item_id,
    tipe: 'Keluar',
    keluar_mode: 'Penjualan',
    jumlah: data.jumlah,
    harga_dasar: data.harga_dasar,
    sumbangan: data.sumbangan,
    harga_satuan: hargaSatuan,
    harga_total: totalNilai, // Menggunakan harga_total bukan total_nilai
    penerima: data.pembeli,
    tanggal: data.tanggal,
    catatan: data.catatan || (() => {
      const sumbanganText = data.sumbangan > 0 
        ? `, Sumbangan: Rp ${data.sumbangan.toLocaleString('id-ID')}` 
        : '';
      return `Penjualan - Harga Dasar: Rp ${data.harga_dasar.toLocaleString('id-ID')}/unit${sumbanganText}`;
    })(),
    created_by: user?.id
  };

  const { data: result, error } = await supabase
    .from('transaksi_inventaris')
    .insert([payload])
    .select(`
      *,
      inventaris!inner(nama_barang, kategori)
    `)
    .single();

  if (error) throw error;

  // Transform to SalesTransaction format
  const salesTransaction: SalesTransaction = {
    id: result.id,
    item_id: result.item_id,
    nama_barang: result.inventaris.nama_barang,
    kategori: result.inventaris.kategori,
    jumlah: result.jumlah,
    harga_dasar: result.harga_dasar,
    sumbangan: result.sumbangan,
    harga_satuan: result.harga_satuan,
    total_nilai: result.harga_total || totalNilai, // Menggunakan harga_total dari database
    pembeli: result.penerima,
    tanggal: result.tanggal,
    catatan: result.catatan,
    keuangan_id: result.keuangan_id,
    created_at: result.created_at
  };

  return salesTransaction;
};

/**
 * Get sales transactions with filtering
 */
export const getSalesTransactions = async (
  pagination: { page: number; pageSize: number },
  filters: SalesFilters = {},
  sort: { column: string; direction: 'asc' | 'desc' } = { column: 'tanggal', direction: 'desc' }
) => {
  const { page, pageSize } = pagination;
  
  let query = supabase
    .from('transaksi_inventaris')
    .select(`
      *,
      inventaris!inner(nama_barang, kategori)
    `, { count: 'exact' })
    .eq('tipe', 'Keluar')
    .eq('keluar_mode', 'Penjualan')
    .not('harga_satuan', 'is', null);

  // Apply filters
  if (filters.startDate) query = query.gte('tanggal', filters.startDate);
  if (filters.endDate) query = query.lte('tanggal', filters.endDate);
  if (filters.item_id) query = query.eq('item_id', filters.item_id);
  if (filters.pembeli) query = query.ilike('penerima', `%${filters.pembeli}%`);

  // Apply sorting
  query = query.order(sort.column, { ascending: sort.direction === 'asc' });

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await query.range(from, to);

  if (error) throw error;

  // Transform data
  const transformedData = (data || []).map(row => ({
    id: row.id,
    item_id: row.item_id,
    nama_barang: row.inventaris.nama_barang,
    kategori: row.inventaris.kategori,
    jumlah: row.jumlah,
    harga_dasar: row.harga_dasar,
    sumbangan: row.sumbangan,
    harga_satuan: row.harga_satuan,
    total_nilai: row.harga_total || 0, // Menggunakan harga_total dari database
    pembeli: row.penerima,
    tanggal: row.tanggal,
    catatan: row.catatan,
    keuangan_id: row.keuangan_id,
    created_at: row.created_at
  }));

  // Filter by kategori if specified (client-side for now)
  const filteredData = filters.kategori 
    ? transformedData.filter(item => item.kategori === filters.kategori)
    : transformedData;

  return { 
    data: filteredData as SalesTransaction[], 
    total: count || 0 
  };
};

/**
 * Get sales statistics
 */
export const getSalesStats = async (filters: SalesFilters = {}): Promise<SalesStats> => {
  // Simplified version for now - return default stats
  console.log('getSalesStats called with filters:', filters);
  
  return {
    totalPenjualan: 0,
    totalTransaksi: 0,
    totalJumlah: 0,
    rataRataPenjualan: 0,
    kategoriSummary: {},
    itemSummary: []
  };
};

/**
 * Update sales transaction
 */
export const updateSalesTransaction = async (id: string, data: Partial<SalesFormData>): Promise<SalesTransaction> => {
  // Recalculate if price breakdown changed
  let updateData: any = {
    penerima: data.pembeli,
    jumlah: data.jumlah,
    catatan: data.catatan
  };

  if (data.harga_dasar !== undefined || data.sumbangan !== undefined) {
    const hargaDasar = data.harga_dasar || 0;
    const sumbangan = data.sumbangan || 0;
    const jumlah = data.jumlah || 0;
    
    const totalNilai = (hargaDasar * jumlah) + sumbangan;
    const hargaSatuan = Math.max(0, Math.floor(totalNilai / jumlah));
    
    updateData = {
      ...updateData,
      harga_dasar: hargaDasar,
      sumbangan: sumbangan,
      harga_satuan: hargaSatuan,
      harga_total: totalNilai, // Menggunakan harga_total bukan total_nilai
      catatan: (() => {
        const sumbanganText = sumbangan > 0 
          ? `, Sumbangan: Rp ${sumbangan.toLocaleString('id-ID')}` 
          : '';
        return `Penjualan - Harga Dasar: Rp ${hargaDasar.toLocaleString('id-ID')}/unit${sumbanganText}`;
      })()
    };
  }

  const { data: result, error } = await supabase
    .from('transaksi_inventaris')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      inventaris!inner(nama_barang, kategori)
    `)
    .single();

  if (error) throw error;

  // Transform to SalesTransaction format
  // Calculate total_nilai if harga_total is not available
  const calculatedTotalNilai = result.harga_total || 
    ((result.harga_dasar || 0) * (result.jumlah || 0) + (result.sumbangan || 0));
  
  const salesTransaction: SalesTransaction = {
    id: result.id,
    item_id: result.item_id,
    nama_barang: result.inventaris.nama_barang,
    kategori: result.inventaris.kategori,
    jumlah: result.jumlah,
    harga_dasar: result.harga_dasar,
    sumbangan: result.sumbangan,
    harga_satuan: result.harga_satuan,
    total_nilai: calculatedTotalNilai, // Menggunakan harga_total dari database atau dihitung
    pembeli: result.penerima,
    tanggal: result.tanggal,
    catatan: result.catatan,
    keuangan_id: result.keuangan_id,
    created_at: result.created_at
  };

  return salesTransaction;
};

/**
 * Delete sales transaction
 */
export const deleteSalesTransaction = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('transaksi_inventaris')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

/**
 * Get sales transaction by ID
 */
export const getSalesTransaction = async (id: string): Promise<SalesTransaction> => {
  const { data, error } = await supabase
    .from('transaksi_inventaris')
    .select(`
      *,
      inventaris!inner(nama_barang, kategori)
    `)
    .eq('id', id)
    .eq('tipe', 'Keluar')
    .eq('keluar_mode', 'Penjualan')
    .single();

  if (error) throw error;

  return {
    id: data.id,
    item_id: data.item_id,
    nama_barang: data.inventaris.nama_barang,
    kategori: data.inventaris.kategori,
    jumlah: data.jumlah,
    harga_dasar: data.harga_dasar,
    sumbangan: data.sumbangan,
    harga_satuan: data.harga_satuan,
    total_nilai: data.harga_total || 0, // Menggunakan harga_total dari database
    pembeli: data.penerima,
    tanggal: data.tanggal,
    catatan: data.catatan,
    keuangan_id: data.keuangan_id,
    created_at: data.created_at
  };
};

/**
 * Get linked keuangan entry for sales transaction
 */
export const getSalesKeuanganLink = async (salesId: string) => {
  const { data, error } = await supabase
    .from('keuangan')
    .select('*')
    .eq('referensi', `inventory_sale:${salesId}`)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};
