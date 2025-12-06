import { supabase } from '@/integrations/supabase/client';

/**
 * ---------- TIPE DATA ----------
 */

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

export interface KeuanganKoperasiMonthlyData {
  month: string;
  pemasukan: number;
  pengeluaran: number;
}

export interface KeuanganKoperasiCategoryData {
  name: string;
  value: number;
  color: string;
}

/**
 * ---------- HELPER: INFER TIPE AKUN ----------
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

  // Pendapatan
  if (
    jenis_transaksi === 'Pemasukan' &&
    (cat.includes('penjualan') ||
      cat.includes('jasa pengelolaan') ||
      cat.includes('bagi hasil') ||
      cat.includes('pendapatan'))
  ) {
    return 'Pendapatan';
  }

  // Beban
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

  if (cat.includes('transfer')) return 'Transfer';
  if (cat.includes('penyesuaian') || cat.includes('adjustment')) return 'Adjustment';

  return undefined;
};

/**
 * Normalisasi payload sebelum insert/update
 */
export const normalizeKeuanganKoperasiData = (
  data: KeuanganKoperasiData
): KeuanganKoperasiData => {
  const withStatus: KeuanganKoperasiData = {
    ...data,
    status: data.status || 'posted',
  };

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
 * ---------- CRUD DASAR ----------
 */

export const addKeuanganKoperasiTransaction = async (
  data: KeuanganKoperasiData
): Promise<any> => {
  const payload = normalizeKeuanganKoperasiData(data);

  const { data: result, error } = await supabase
    .from('keuangan_koperasi')
    .insert([payload])
    .select();

  if (error) throw error;
  return result;
};

export const updateKeuanganKoperasiTransaction = async (
  id: string,
  data: Partial<KeuanganKoperasiData>
): Promise<any> => {
  const { data: user } = await supabase.auth.getUser();

  const updateData: any = {
    ...data,
    updated_by: user.user?.id,
    updated_at: new Date().toISOString(),
  };

  const { data: result, error } = await supabase
    .from('keuangan_koperasi')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  if (result.akun_kas_id) {
    try {
      await supabase.rpc('ensure_akun_kas_saldo_correct_for', {
        p_akun_id: result.akun_kas_id,
      });
    } catch (saldoError) {
      console.warn('Warning ensuring saldo correct:', saldoError);
    }
  }

  return result;
};

export const deleteKeuanganKoperasiTransaction = async (id: string): Promise<void> => {
  const { data: transaction, error: fetchError } = await supabase
    .from('keuangan_koperasi')
    .select('akun_kas_id, jenis_transaksi, jumlah')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  const { error: deleteError } = await supabase
    .from('keuangan_koperasi')
    .delete()
    .eq('id', id);

  if (deleteError) throw deleteError;

  if (transaction?.akun_kas_id) {
    try {
      await supabase.rpc('ensure_akun_kas_saldo_correct_for', {
        p_akun_id: transaction.akun_kas_id,
      });
    } catch (saldoError) {
      console.warn('Warning ensuring saldo correct:', saldoError);
    }
  }
};

/**
 * ---------- STATISTIK & LAPORAN ----------
 */

export const getKeuanganKoperasiStats = async (
  akunKasId?: string
): Promise<KeuanganKoperasiStats> => {
  const currentDate = new Date();
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

  let totalSaldo = 0;
  if (akunKasId) {
    const { data: akunKas } = await supabase
      .from('akun_kas')
      .select('saldo_saat_ini')
      .eq('id', akunKasId)
      .single();
    totalSaldo = akunKas?.saldo_saat_ini || 0;
  }

  let query = supabase
    .from('keuangan_koperasi')
    .select('*')
    .gte('tanggal', startOfMonth.toISOString());

  if (akunKasId) {
    query = query.eq('akun_kas_id', akunKasId);
  }

  const { data: transactions } = await query;

  const pemasukanBulanIni = (transactions || [])
    .filter((t) => t.jenis_transaksi === 'Pemasukan')
    .reduce((sum, t) => sum + (t.jumlah || 0), 0);

  const pengeluaranBulanIni = (transactions || [])
    .filter((t) => t.jenis_transaksi === 'Pengeluaran')
    .reduce((sum, t) => sum + (t.jumlah || 0), 0);

  const labaKotorBulanIni = (transactions || [])
    .filter((t) => t.jenis_transaksi === 'Pemasukan')
    .reduce((sum, t) => sum + (t.laba_kotor || 0), 0);

  const labaBersihBulanIni = labaKotorBulanIni - pengeluaranBulanIni;

  return {
    totalSaldo,
    pemasukanBulanIni,
    pengeluaranBulanIni,
    labaKotorBulanIni,
    labaBersihBulanIni,
  };
};

export const getKeuanganKoperasiMonthlyData = async (
  akunKasId?: string
): Promise<KeuanganKoperasiMonthlyData[]> => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - 6);

    let query = supabase
      .from('keuangan_koperasi')
      .select('tanggal, jenis_transaksi, jumlah')
      .gte('tanggal', startDate.toISOString().split('T')[0])
      .lte('tanggal', endDate.toISOString().split('T')[0]);

    if (akunKasId) {
      query = query.eq('akun_kas_id', akunKasId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const monthlyStats: { [key: string]: { pemasukan: number; pengeluaran: number } } = {};

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().substring(0, 7);
      monthlyStats[monthKey] = { pemasukan: 0, pengeluaran: 0 };
    }

    (data || []).forEach((transaction) => {
      const monthKey = transaction.tanggal.substring(0, 7);
      if (monthlyStats[monthKey]) {
        if (transaction.jenis_transaksi === 'Pemasukan') {
          monthlyStats[monthKey].pemasukan += transaction.jumlah || 0;
        } else if (transaction.jenis_transaksi === 'Pengeluaran') {
          monthlyStats[monthKey].pengeluaran += transaction.jumlah || 0;
        }
      }
    });

    return Object.entries(monthlyStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([monthKey, stats]) => {
        const date = new Date(monthKey + '-01');
        const monthName = date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
        return {
          month: monthName,
          pemasukan: stats.pemasukan,
          pengeluaran: stats.pengeluaran,
        };
      });
  } catch (error) {
    console.error('Error loading monthly data:', error);
    return [];
  }
};

export const getKeuanganKoperasiCategoryData = async (
  akunKasId?: string
): Promise<KeuanganKoperasiCategoryData[]> => {
  try {
    const currentDate = new Date();
    const startOfYear = new Date(currentDate.getFullYear(), 0, 1);

    let query = supabase
      .from('keuangan_koperasi')
      .select('kategori, jenis_transaksi, jumlah')
      .gte('tanggal', startOfYear.toISOString().split('T')[0])
      .eq('jenis_transaksi', 'Pengeluaran');

    if (akunKasId) {
      query = query.eq('akun_kas_id', akunKasId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const categoryMap = new Map<string, number>();

    (data || []).forEach((transaction) => {
      const kategori = transaction.kategori || 'Lainnya';
      const currentValue = categoryMap.get(kategori) || 0;
      categoryMap.set(kategori, currentValue + (transaction.jumlah || 0));
    });

    const colors = [
      '#ef4444',
      '#f59e0b',
      '#eab308',
      '#10b981',
      '#3b82f6',
      '#8b5cf6',
      '#ec4899',
      '#06b6d4',
      '#84cc16',
      '#f97316',
    ];

    return Array.from(categoryMap.entries())
      .map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length],
      }))
      .sort((a, b) => b.value - a.value);
  } catch (error) {
    console.error('Error loading category data:', error);
    return [];
  }
};

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

  const totalPenjualan = (transactions || [])
    .filter(
      (t) => t.kategori === 'Penjualan Koperasi' || t.kategori === 'Penjualan Inventaris'
    )
    .reduce((sum, t) => sum + (t.jumlah || 0), 0);

  const totalHPP = (transactions || [])
    .filter(
      (t) => t.kategori === 'Penjualan Koperasi' || t.kategori === 'Penjualan Inventaris'
    )
    .reduce((sum, t) => sum + (t.hpp || 0), 0);

  const labaKotor = totalPenjualan - totalHPP;

  const totalBeban = (transactions || [])
    .filter((t) => t.tipe_akun === 'Beban')
    .reduce((sum, t) => sum + (t.jumlah || 0), 0);

  const labaBersih = labaKotor - totalBeban;

  const bebanPerKategori = (transactions || [])
    .filter((t) => t.tipe_akun === 'Beban')
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
    marginPersen: totalPenjualan > 0 ? (labaKotor / totalPenjualan) * 100 : 0,
    bebanPerKategori,
  };
};