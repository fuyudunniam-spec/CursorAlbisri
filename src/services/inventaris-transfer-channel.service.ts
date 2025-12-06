/**
 * Service untuk Transfer Inventaris menggunakan Channel Tracking
 * Menggunakan transaksi_inventaris dengan channel (koperasi, dapur, distribusi_bantuan)
 * sebagai pengganti transfer_inventaris lama
 */

import { supabase } from '@/integrations/supabase/client';

export interface ChannelSummary {
  channel: 'koperasi' | 'dapur' | 'distribusi_bantuan' | null;
  total_transfers: number;
  total_quantity: number;
  total_value: number; // Estimasi harga perolehan, bukan HPP
}

export interface ChannelTransfer {
  id: string;
  tanggal: string;
  item_id: string;
  nama_barang: string;
  kategori: string;
  kode_inventaris: string | null;
  jumlah: number;
  channel: 'koperasi' | 'dapur' | 'distribusi_bantuan' | null;
  penerima: string | null;
  catatan: string | null;
  harga_satuan: number | null;
  harga_total: number | null;
  created_at: string;
}

/**
 * Get summary by channel untuk periode tertentu
 * Menggunakan estimasi harga perolehan (harga_perolehan dari inventaris), bukan HPP
 */
export async function getTransferSummaryByChannel(
  dateFrom?: string,
  dateTo?: string
): Promise<ChannelSummary[]> {
  // Query lebih sederhana untuk menghindari error join
  let query = supabase
    .from('transaksi_inventaris')
    .select('channel, jumlah, harga_satuan, harga_total, item_id')
    .eq('tipe', 'Keluar')
    .not('channel', 'is', null);

  if (dateFrom) {
    query = query.gte('tanggal', dateFrom);
  }
  if (dateTo) {
    query = query.lte('tanggal', dateTo);
  }

  const { data, error } = await query;

  if (error) {
    console.warn('Error fetching channel summary:', error);
    return [];
  }

  // Aggregate by channel
  const summaryMap = new Map<string, {
    count: number;
    quantity: number;
    value: number;
  }>();

  // Fetch harga_perolehan dari inventaris secara terpisah untuk menghindari error join
  const itemIds = [...new Set((data || []).map((t: any) => t.item_id).filter(Boolean))];
  let inventarisMap = new Map();
  
  if (itemIds.length > 0) {
    const { data: inventarisData } = await supabase
      .from('inventaris')
      .select('id, harga_perolehan')
      .in('id', itemIds);
    
    if (inventarisData) {
      inventarisData.forEach((item: any) => {
        inventarisMap.set(item.id, item.harga_perolehan);
      });
    }
  }

  (data || []).forEach((transaction: any) => {
    const channel = transaction.channel || 'unknown';
    const current = summaryMap.get(channel) || { count: 0, quantity: 0, value: 0 };
    
    // Gunakan harga_perolehan dari inventaris sebagai estimasi harga perolehan
    // Fallback ke harga_satuan atau harga_total jika harga_perolehan tidak ada
    const estimasiHargaPerolehan = inventarisMap.get(transaction.item_id) || 
                                   transaction.harga_satuan || 
                                   (transaction.harga_total && transaction.jumlah ? transaction.harga_total / transaction.jumlah : 0) ||
                                   0;
    const jumlah = transaction.jumlah || 0;
    const totalNilai = estimasiHargaPerolehan * jumlah;
    
    summaryMap.set(channel, {
      count: current.count + 1,
      quantity: current.quantity + jumlah,
      value: current.value + totalNilai
    });
  });

  return Array.from(summaryMap.entries()).map(([channel, stats]) => ({
    channel: channel as 'koperasi' | 'dapur' | 'distribusi_bantuan' | null,
    total_transfers: stats.count,
    total_quantity: stats.quantity,
    total_value: stats.value
  }));
}

/**
 * Get transfer history by channel
 */
export async function getChannelTransferHistory(
  filters: {
    channel?: 'koperasi' | 'dapur' | 'distribusi_bantuan' | 'all' | null;
    dateFrom?: string;
    dateTo?: string;
    itemId?: string;
    page?: number;
    limit?: number;
  } = {}
): Promise<{ data: ChannelTransfer[]; total: number }> {
  const { channel, dateFrom, dateTo, itemId, page = 1, limit = 20 } = filters;

  let query = supabase
    .from('transaksi_inventaris')
    .select(`
      *,
      inventaris(
        nama_barang,
        kategori,
        kode_inventaris,
        harga_perolehan
      )
    `, { count: 'exact' })
    .eq('tipe', 'Keluar')
    .not('channel', 'is', null);

  if (channel && channel !== 'all') {
    query = query.eq('channel', channel);
  }

  if (dateFrom) {
    query = query.gte('tanggal', dateFrom);
  }
  if (dateTo) {
    query = query.lte('tanggal', dateTo);
  }
  if (itemId) {
    query = query.eq('item_id', itemId);
  }

  query = query.order('tanggal', { ascending: false });

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const { data, error, count } = await query.range(from, to);

  if (error) {
    console.warn('Error fetching channel transfer history:', error);
    return { data: [], total: 0 };
  }

  const transformed = (data || []).map((row: any) => {
    const inventarisData = Array.isArray(row.inventaris) 
      ? row.inventaris[0] 
      : row.inventaris;
    
    return {
      id: row.id,
      tanggal: row.tanggal,
      item_id: row.item_id,
      nama_barang: inventarisData?.nama_barang || 'Item tidak ditemukan',
      kategori: inventarisData?.kategori || '',
      kode_inventaris: inventarisData?.kode_inventaris || null,
      jumlah: row.jumlah || 0,
      channel: row.channel,
      penerima: row.penerima,
      catatan: row.catatan,
      harga_satuan: inventarisData?.harga_perolehan || row.harga_satuan, // Gunakan harga_perolehan
      harga_total: (inventarisData?.harga_perolehan || row.harga_satuan || 0) * (row.jumlah || 0),
      created_at: row.created_at
    };
  });

  return { data: transformed, total: count || 0 };
}

/**
 * Get channel label in Indonesian
 */
export function getChannelLabel(channel: string | null): string {
  switch (channel) {
    case 'koperasi':
      return 'Koperasi';
    case 'dapur':
      return 'Dapur';
    case 'distribusi_bantuan':
      return 'Distribusi Bantuan';
    default:
      return 'Lainnya';
  }
}

/**
 * Get channel icon (lucide-react icon name)
 */
export function getChannelIconName(channel: string | null): string {
  switch (channel) {
    case 'koperasi':
      return 'Store';
    case 'dapur':
      return 'ChefHat';
    case 'distribusi_bantuan':
      return 'HandHeart';
    default:
      return 'Package';
  }
}

