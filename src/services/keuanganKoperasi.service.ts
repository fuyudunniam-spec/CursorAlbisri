import { supabase } from '@/integrations/supabase/client';

export type KeuanganKoperasiAccountType =
  | 'Aset'
  | 'Kewajiban'
  | 'Ekuitas'
  | 'Pendapatan'
  | 'Beban'
  | 'Transfer'
  | 'Adjustment';

export interface KeuanganKoperasiData {
  jenis_transaksi: 'Pemasukan' | 'Pengeluaran';
  kategori: string;
  jumlah: number;
  tanggal: string;
  deskripsi?: string;
  referensi?: string;
  akun_kas_id?: string;
  sub_kategori?: string;
  penerima_pembayar?: string;
  status?: 'draft' | 'pending' | 'posted' | 'cancelled';
  hpp?: number;
  laba_kotor?: number;
  tipe_akun?: KeuanganKoperasiAccountType;
}

export interface KeuanganKoperasiStats {
  totalSaldo: number;
  pemasukanBulanIni: number;
  pengeluaranBulanIni: number;
  labaKotorBulanIni: number;
  labaBersihBulanIni: number;
}

/**
 * Infer tipe_akun based on kategori/sub_kategori + jenis_transaksi.
 * This is a lightweight mapping to prepare for future accounting reports.
 */
export const inferKeuanganKoperasiAccountType = (params: {
  jenis_transaksi: 'Pemasukan' | 'Pengeluaran';
  kategori: string;
  sub_kategori?: string;
}): KeuanganKoperasiAccountType | undefined => {
  const { jenis_transaksi, kategori, sub_kategori } = params;
  const cat = (kategori || '').toLowerCase();
  const sub = (sub_kategori || '').toLowerCase();

  // Kewajiban / hutang ke yayasan
  if (
    cat === 'kewajiban' ||
    cat.includes('hutang') ||
    sub.includes('kewajiban penjualan inventaris yayasan') ||
    sub.includes('pembayaran omset penjualan inventaris yayasan') ||
    sub.includes('hutang ke yayasan')
  ) {
    return 'Kewajiban';
  }

  // Pendapatan: penjualan, jasa pengelolaan, bagi hasil, dll.
  if (
    jenis_transaksi === 'Pemasukan' &&
    (cat.includes('penjualan') ||
      cat.includes('jasa pengelolaan') ||
      cat.includes('bagi hasil') ||
      cat.includes('pendapatan'))
  ) {
    return 'Pendapatan';
  }

  // Beban: beban/operasional/pengeluaran lainnya
  if (
    jenis_transaksi === 'Pengeluaran' &&
    (cat.includes('beban') ||
      cat.includes('operasional') ||
      cat.includes('biaya') ||
      cat.includes('konsumsi') ||
      cat.includes('utilitas'))
  ) {
    return 'Beban';
  }

  // Transfer / adjustment (belum difokuskan di modul koperasi)
  if (cat.includes('transfer')) return 'Transfer';
  if (cat.includes('penyesuaian') || cat.includes('adjustment')) return 'Adjustment';

  return undefined;
};

/**
 * Normalise payload sebelum dikirim ke Supabase:
 * - Set default status (posted) jika belum diisi.
 * - Isi tipe_akun jika belum diisi secara eksplisit.
 */
export const normalizeKeuanganKoperasiData = (
  data: KeuanganKoperasiData
): KeuanganKoperasiData => {
  const withStatus: KeuanganKoperasiData = {
    ...data,
    status: data.status || 'posted',
  };

  // Jika tipe_akun sudah diisi oleh caller, jangan di-override.
  if (withStatus.tipe_akun) {
    return withStatus;
  }

  const inferred = inferKeuanganKoperasiAccountType({
    jenis_transaksi: withStatus.jenis_transaksi,
    kategori: withStatus.kategori,
    sub_kategori: withStatus.sub_kategori,
  });

  return {
    ...withStatus,
    tipe_akun: inferred,
  };
};

/**
 * Add transaction to keuangan_koperasi
 */
export const addKeuanganKoperasiTransaction = async (data: KeuanganKoperasiData): Promise<any> => {
  const payload = normalizeKeuanganKoperasiData(data);

  const { data: result, error } = await supabase
    .from('keuangan_koperasi')
    .insert([payload])
    .select();

  if (error) throw error;
  return result;
};

/**
 * Get keuangan koperasi stats
 */
export const getKeuanganKoperasiStats = async (akunKasId?: string): Promise<KeuanganKoperasiStats> => {
  const currentDate = new Date();
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  
  // Get Kas Koperasi saldo
  let totalSaldo = 0;
  if (akunKasId) {
    const { data: akunKas } = await supabase
      .from('akun_kas')
      .select('saldo_saat_ini')
      .eq('id', akunKasId)
      .single();
    totalSaldo = akunKas?.saldo_saat_ini || 0;
  }
  
  // Get transactions this month
  let query = supabase
    .from('keuangan_koperasi')
    .select('*')
    .gte('tanggal', startOfMonth.toISOString());
  
  if (akunKasId) {
    query = query.eq('akun_kas_id', akunKasId);
  }
  
  const { data: transactions } = await query;
  
  const pemasukanBulanIni = (transactions || [])
    .filter(t => t.jenis_transaksi === 'Pemasukan')
    .reduce((sum, t) => sum + (t.jumlah || 0), 0);
  
  const pengeluaranBulanIni = (transactions || [])
    .filter(t => t.jenis_transaksi === 'Pengeluaran')
    .reduce((sum, t) => sum + (t.jumlah || 0), 0);
  
  const labaKotorBulanIni = (transactions || [])
    .filter(t => t.jenis_transaksi === 'Pemasukan')
    .reduce((sum, t) => sum + (t.laba_kotor || 0), 0);
  
  const labaBersihBulanIni = labaKotorBulanIni - pengeluaranBulanIni;
  
  return {
    totalSaldo,
    pemasukanBulanIni,
    pengeluaranBulanIni,
    labaKotorBulanIni,
    labaBersihBulanIni
  };
};

/**
 * Get laporan laba rugi
 */
export const getLaporanLabaRugi = async (
  startDate: string,
  endDate: string,
  akunKasId?: string
) => {
  let query = supabase
    .from('keuangan_koperasi')
    .select('*')
    .gte('tanggal', startDate)
    .lte('tanggal', endDate);
  
  if (akunKasId) {
    query = query.eq('akun_kas_id', akunKasId);
  }
  
  const { data: transactions, error } = await query;
  
  if (error) throw error;
  
  // Calculate totals
  const totalPenjualan = (transactions || [])
    .filter(t => t.kategori === 'Penjualan Koperasi' || t.kategori === 'Penjualan Inventaris')
    .reduce((sum, t) => sum + (t.jumlah || 0), 0);
  
  const totalHPP = (transactions || [])
    .filter(t => t.kategori === 'Penjualan Koperasi' || t.kategori === 'Penjualan Inventaris')
    .reduce((sum, t) => sum + (t.hpp || 0), 0);
  
  const labaKotor = totalPenjualan - totalHPP;
  
  const totalBeban = (transactions || [])
    .filter(t => t.tipe_akun === 'Beban')
    .reduce((sum, t) => sum + (t.jumlah || 0), 0);
  
  const labaBersih = labaKotor - totalBeban;
  
  // Breakdown beban per kategori
  const bebanPerKategori = (transactions || [])
    .filter(t => t.tipe_akun === 'Beban')
    .reduce((acc, t) => {
      const kategori = t.kategori || 'Lainnya';
      if (!acc[kategori]) {
        acc[kategori] = 0;
      }
      acc[kategori] += t.jumlah || 0;
      return acc;
    }, {} as Record<string, number>);
  
  return {
    totalPenjualan,
    totalHPP,
    labaKotor,
    totalBeban,
    labaBersih,
    marginPersen: totalPenjualan > 0 ? (labaKotor / totalPenjualan * 100) : 0,
    bebanPerKategori
  };
};
