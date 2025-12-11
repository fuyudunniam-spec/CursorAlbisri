import { supabase } from '@/integrations/supabase/client';

// =====================================================
// LAPORAN KOPERASI SERVICE
// =====================================================

export interface PersediaanReportData {
  summary: {
    modalKoperasi: number;
    nilaiStokYayasan: number;
    totalNilai: number;
  };
  details: Array<{
    id: string;
    kode_produk: string;
    nama_produk: string;
    owner_type: 'koperasi' | 'yayasan';
    stok: number;
    hpp: number;
    nilai: number;
    satuan: string;
  }>;
}

export interface LabaRugiReportData {
  penjualanBersih: number;
  hpp: number;
  labaKotor: number;
  bebanOperasional: number;
  labaBersih: number;
  breakdown: {
    penjualan: Array<{
      tanggal: string;
      no_penjualan: string;
      total: number;
    }>;
    hpp: Array<{
      tanggal: string;
      no_penjualan: string;
      hpp: number;
    }>;
    beban: Array<{
      tanggal: string;
      kategori: string;
      sub_kategori: string;
      jumlah: number;
      deskripsi: string | null;
    }>;
  };
}

export interface BagiHasilReportData {
  summary: {
    totalPenjualan: number;
    totalBagianYayasan: number;
    totalBagianKoperasi: number;
    statusSetoran: 'sudah' | 'belum' | 'sebagian';
  };
  details: Array<{
    id: string;
    tanggal: string;
    no_penjualan: string;
    total_penjualan: number;
    bagian_yayasan: number;
    bagian_koperasi: number;
    status_setoran: string;
  }>;
  setoranHistory: Array<{
    id: string;
    tanggal: string;
    jumlah: number;
    keterangan: string | null;
  }>;
}

/**
 * Get Laporan Posisi Persediaan & Modal
 */
export const getPersediaanReport = async (): Promise<PersediaanReportData> => {
  // Get all active products with stock
  const { data: produkData, error } = await supabase
    .from('kop_barang')
    .select(`
      id,
      kode_barang,
      nama_barang,
      owner_type,
      stok,
      harga_beli,
      satuan_dasar
    `)
    .eq('is_active', true)
    .order('nama_barang');

  if (error) throw error;

  const details = (produkData || []).map((item: any) => {
    const stok = Number(item.stok || 0);
    const hpp = Number(item.harga_beli || 0);
    const nilai = stok * hpp;

    return {
      id: item.id,
      kode_produk: item.kode_barang,
      nama_produk: item.nama_barang,
      owner_type: item.owner_type || 'koperasi',
      stok,
      hpp,
      nilai,
      satuan: item.satuan_dasar || 'pcs',
    };
  });

  // Calculate summary
  const modalKoperasi = details
    .filter((d) => d.owner_type === 'koperasi')
    .reduce((sum, d) => sum + d.nilai, 0);

  const nilaiStokYayasan = details
    .filter((d) => d.owner_type === 'yayasan')
    .reduce((sum, d) => sum + d.nilai, 0);

  const totalNilai = modalKoperasi + nilaiStokYayasan;

  return {
    summary: {
      modalKoperasi,
      nilaiStokYayasan,
      totalNilai,
    },
    details,
  };
};

/**
 * Get Laporan Laba Rugi Koperasi
 */
export const getLabaRugiReport = async (
  startDate: string,
  endDate: string
): Promise<LabaRugiReportData> => {
  // 1. Get penjualan (from kop_penjualan)
  const { data: penjualanData, error: penjualanError } = await supabase
    .from('kop_penjualan')
    .select('id, tanggal, no_penjualan, total_transaksi')
    .gte('tanggal', startDate)
    .lte('tanggal', endDate)
    .eq('status_pembayaran', 'lunas')
    .order('tanggal', { ascending: false });

  if (penjualanError) throw penjualanError;

  const penjualanBersih = (penjualanData || []).reduce(
    (sum, p) => sum + Number(p.total_transaksi || 0),
    0
  );

  // 2. Get HPP from penjualan detail
  const penjualanIds = (penjualanData || []).map((p) => p.id);
  let totalHPP = 0;
  const hppBreakdown: Array<{ tanggal: string; no_penjualan: string; hpp: number }> = [];

  if (penjualanIds.length > 0) {
    const { data: penjualanDetailData, error: detailError } = await supabase
      .from('kop_penjualan_detail')
      .select('penjualan_id, hpp_snapshot, jumlah')
      .in('penjualan_id', penjualanIds);

    if (detailError) throw detailError;

    // Group HPP by penjualan
    const hppByPenjualan = new Map<string, number>();
    (penjualanDetailData || []).forEach((detail: any) => {
      const hpp = Number(detail.hpp_snapshot || 0) * Number(detail.jumlah || 0);
      const current = hppByPenjualan.get(detail.penjualan_id) || 0;
      hppByPenjualan.set(detail.penjualan_id, current + hpp);
    });

    // Create breakdown
    (penjualanData || []).forEach((penjualan: any) => {
      const hpp = hppByPenjualan.get(penjualan.id) || 0;
      totalHPP += hpp;
      hppBreakdown.push({
        tanggal: penjualan.tanggal,
        no_penjualan: penjualan.no_penjualan,
        hpp,
      });
    });
  }

  // 3. Get beban operasional (from keuangan_koperasi - Pengeluaran, exclude kewajiban)
  const { data: bebanData, error: bebanError } = await supabase
    .from('keuangan_koperasi')
    .select('tanggal, kategori, sub_kategori, jumlah, deskripsi')
    .eq('jenis_transaksi', 'Pengeluaran')
    .eq('status', 'posted')
    .gte('tanggal', startDate)
    .lte('tanggal', endDate)
    .not('kategori', 'eq', 'Kewajiban')
    .not('sub_kategori', 'eq', 'Bagi Hasil Yayasan')
    .order('tanggal', { ascending: false });

  if (bebanError) throw bebanError;

  const bebanOperasional = (bebanData || []).reduce(
    (sum, b) => sum + Number(b.jumlah || 0),
    0
  );

  const bebanBreakdown = (bebanData || []).map((b: any) => ({
    tanggal: b.tanggal,
    kategori: b.kategori || 'Lainnya',
    sub_kategori: b.sub_kategori || '',
    jumlah: Number(b.jumlah || 0),
    deskripsi: b.deskripsi,
  }));

  const labaKotor = penjualanBersih - totalHPP;
  const labaBersih = labaKotor - bebanOperasional;

  return {
    penjualanBersih,
    hpp: totalHPP,
    labaKotor,
    bebanOperasional,
    labaBersih,
    breakdown: {
      penjualan: (penjualanData || []).map((p: any) => ({
        tanggal: p.tanggal,
        no_penjualan: p.no_penjualan,
        total: Number(p.total_transaksi || 0),
      })),
      hpp: hppBreakdown,
      beban: bebanBreakdown,
    },
  };
};

/**
 * Get Laporan Bagi Hasil Produk Yayasan
 */
export const getBagiHasilReport = async (
  startDate: string,
  endDate: string
): Promise<BagiHasilReportData> => {
  // 1. Get penjualan produk yayasan from kop_penjualan_detail
  const { data: penjualanData, error: penjualanError } = await supabase
    .from('kop_penjualan')
    .select(`
      id,
      tanggal,
      no_penjualan,
      total_transaksi,
      kop_penjualan_detail(
        id,
        bagian_yayasan,
        bagian_koperasi,
        kop_barang(
          owner_type
        )
      )
    `)
    .gte('tanggal', startDate)
    .lte('tanggal', endDate)
    .eq('status_pembayaran', 'lunas')
    .order('tanggal', { ascending: false });

  if (penjualanError) throw penjualanError;

  // Filter only yayasan products - need to check if any detail has yayasan owner_type
  const penjualanYayasan = (penjualanData || []).filter((p: any) => {
    const details = p.kop_penjualan_detail || [];
    // Check if any detail has bagian_yayasan > 0 (indicates yayasan product)
    return details.some((d: any) => (d.bagian_yayasan || 0) > 0);
  });

  // Calculate totals
  let totalPenjualan = 0;
  let totalBagianYayasan = 0;
  let totalBagianKoperasi = 0;

  const details = penjualanYayasan.map((penjualan: any) => {
    const details = penjualan.kop_penjualan_detail || [];
    // Filter details that have bagian_yayasan > 0 (yayasan products)
    const yayasanDetails = details.filter(
      (d: any) => (d.bagian_yayasan || 0) > 0
    );

    const bagianYayasan = yayasanDetails.reduce(
      (sum: number, d: any) => sum + Number(d.bagian_yayasan || 0),
      0
    );
    const bagianKoperasi = yayasanDetails.reduce(
      (sum: number, d: any) => sum + Number(d.bagian_koperasi || 0),
      0
    );

    totalPenjualan += Number(penjualan.total_transaksi || 0);
    totalBagianYayasan += bagianYayasan;
    totalBagianKoperasi += bagianKoperasi;

    // Check status setoran (simplified - check if there's a keuangan transaction)
    // In real implementation, you might want to check kop_setoran_cash_kasir or keuangan_koperasi
    const statusSetoran = bagianYayasan > 0 ? 'belum' : 'tidak_ada';

    return {
      id: penjualan.id,
      tanggal: penjualan.tanggal,
      no_penjualan: penjualan.no_penjualan,
      total_penjualan: Number(penjualan.total_transaksi || 0),
      bagian_yayasan: bagianYayasan,
      bagian_koperasi: bagianKoperasi,
      status_setoran: statusSetoran,
    };
  });

  // Determine overall status setoran
  let statusSetoran: 'sudah' | 'belum' | 'sebagian' = 'belum';
  if (totalBagianYayasan === 0) {
    statusSetoran = 'tidak_ada' as any;
  } else {
    // Check if there are any setoran records in keuangan_koperasi
    const { data: setoranData } = await supabase
      .from('keuangan_koperasi')
      .select('jumlah')
      .eq('kategori', 'Kewajiban')
      .eq('sub_kategori', 'Bagi Hasil Yayasan')
      .gte('tanggal', startDate)
      .lte('tanggal', endDate);

    const totalSetoran = (setoranData || []).reduce(
      (sum, s) => sum + Number(s.jumlah || 0),
      0
    );

    if (totalSetoran >= totalBagianYayasan) {
      statusSetoran = 'sudah';
    } else if (totalSetoran > 0) {
      statusSetoran = 'sebagian';
    }
  }

  // Get setoran history
  const { data: setoranHistoryData, error: setoranError } = await supabase
    .from('keuangan_koperasi')
    .select('id, tanggal, jumlah, deskripsi')
    .eq('kategori', 'Kewajiban')
    .eq('sub_kategori', 'Bagi Hasil Yayasan')
    .gte('tanggal', startDate)
    .lte('tanggal', endDate)
    .order('tanggal', { ascending: false });

  const setoranHistory = (setoranHistoryData || []).map((s: any) => ({
    id: s.id,
    tanggal: s.tanggal,
    jumlah: Number(s.jumlah || 0),
    keterangan: s.deskripsi,
  }));

  return {
    summary: {
      totalPenjualan,
      totalBagianYayasan,
      totalBagianKoperasi,
      statusSetoran,
    },
    details,
    setoranHistory,
  };
};

