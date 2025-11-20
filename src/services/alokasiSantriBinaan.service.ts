import { supabase } from '@/integrations/supabase/client';

export interface AlokasiOverheadBulanan {
  id: string;
  bulan: number;
  tahun: number;
  periode: string;
  total_spp_pendidikan: number;
  total_asrama_kebutuhan: number;
  total_overhead: number;
  jumlah_santri_binaan_mukim: number;
  alokasi_spp_per_santri: number;
  alokasi_asrama_per_santri: number;
  alokasi_total_per_santri: number;
  status: 'draft' | 'finalized';
  catatan?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AlokasiOverheadPerSantri {
  id: string;
  alokasi_overhead_id: string;
  santri_id: string;
  bulan: number;
  tahun: number;
  periode: string;
  spp_pendidikan: number;
  asrama_kebutuhan: number;
  total_alokasi: number;
  created_at: string;
}

export interface BantuanSantri {
  langsung: Array<{
    id: string;
    jumlah: number;
    deskripsi: string;
    tanggal: string;
    kategori: string;
  }>;
  overhead?: {
    spp_pendidikan: number;
    asrama_kebutuhan: number;
    total_alokasi: number;
  };
}

const BULAN_NAMES = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Generate alokasi overhead untuk bulan tertentu
 */
export const generateAlokasiOverhead = async (
  bulan: number, 
  tahun: number
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const { data, error } = await supabase.rpc('generate_alokasi_overhead', {
      p_bulan: bulan,
      p_tahun: tahun
    });

    if (error) {
      console.error('Error generating alokasi:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error generating alokasi:', error);
    return { success: false, error: 'Gagal generate alokasi overhead' };
  }
};

/**
 * Get alokasi summary untuk bulan tertentu
 */
export const getAlokasiSummary = async (
  bulan: number, 
  tahun: number
): Promise<AlokasiOverheadBulanan | null> => {
  try {
    const { data, error } = await supabase
      .from('alokasi_overhead_bulanan')
      .select('*')
      .eq('bulan', bulan)
      .eq('tahun', tahun)
      .single();

    if (error) {
      console.error('Error getting alokasi summary:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting alokasi summary:', error);
    return null;
  }
};

/**
 * Get bantuan santri (langsung + overhead) untuk bulan tertentu
 */
export const getBantuanSantri = async (
  santriId: string, 
  bulan: number, 
  tahun: number
): Promise<BantuanSantri | null> => {
  try {
    const { data, error } = await supabase.rpc('get_bantuan_santri', {
      p_santri_id: santriId,
      p_bulan: bulan,
      p_tahun: tahun
    });

    if (error) {
      console.error('Error getting bantuan santri:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting bantuan santri:', error);
    return null;
  }
};

/**
 * Get history alokasi per bulan
 */
export const getAlokasiHistory = async (
  limit: number = 12
): Promise<AlokasiOverheadBulanan[]> => {
  try {
    const { data, error } = await supabase
      .from('alokasi_overhead_bulanan')
      .select('*')
      .order('tahun', { ascending: false })
      .order('bulan', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting alokasi history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting alokasi history:', error);
    return [];
  }
};

/**
 * Get alokasi per santri untuk bulan tertentu
 */
export const getAlokasiPerSantri = async (
  bulan: number, 
  tahun: number
): Promise<AlokasiOverheadPerSantri[]> => {
  try {
    const { data, error } = await supabase
      .from('alokasi_overhead_per_santri')
      .select(`
        *,
        santri:santri_id (
          id,
          nama_lengkap,
          nis,
          kategori
        )
      `)
      .eq('bulan', bulan)
      .eq('tahun', tahun)
      .order('santri.nama_lengkap');

    if (error) {
      console.error('Error getting alokasi per santri:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting alokasi per santri:', error);
    return [];
  }
};

/**
 * Get preview alokasi sebelum generate (untuk konfirmasi)
 */
export const getPreviewAlokasi = async (
  bulan: number, 
  tahun: number
): Promise<{
  totalOverhead: number;
  sppPendidikan: number;
  asramaKebutuhan: number;
  jumlahSantri: number;
  alokasiPerSantri: number;
} | null> => {
  try {
    // Get total overhead expenses
    const { data: overhead } = await supabase
      .from('keuangan')
      .select('kategori, sub_kategori, jumlah')
      .eq('jenis_transaksi', 'Pengeluaran')
      .eq('jenis_alokasi', 'overhead')
      .eq('bulan', bulan)
      .eq('tahun', tahun);

    if (!overhead) return null;

    // Calculate categories
    const sppPendidikan = overhead
      .filter(x => 
        (x.kategori?.toLowerCase().includes('gaji') || 
         x.kategori?.toLowerCase().includes('honor') ||
         x.sub_kategori?.toLowerCase().includes('guru') ||
         x.sub_kategori?.toLowerCase().includes('pendidikan') ||
         x.kategori?.toLowerCase().includes('modul') ||
         x.kategori?.toLowerCase().includes('kitab'))
      )
      .reduce((sum, x) => sum + (x.jumlah || 0), 0);

    const asramaKebutuhan = overhead
      .filter(x => 
        (x.kategori?.toLowerCase().includes('konsumsi') ||
         x.kategori?.toLowerCase().includes('makan') ||
         x.kategori?.toLowerCase().includes('listrik') ||
         x.kategori?.toLowerCase().includes('air') ||
         x.kategori?.toLowerCase().includes('pemeliharaan') ||
         x.kategori?.toLowerCase().includes('gas') ||
         x.kategori?.toLowerCase().includes('perlengkapan') ||
         x.kategori?.toLowerCase().includes('operasional'))
      )
      .reduce((sum, x) => sum + (x.jumlah || 0), 0);

    // Get jumlah santri binaan mukim
    const { data: santri } = await supabase
      .from('santri')
      .select('id')
      .eq('status_santri', 'Aktif')
      .or('kategori.ilike.%binaan%mukim%,kategori.ilike.%mukim%binaan%');

    const jumlahSantri = santri?.length || 0;
    const totalOverhead = sppPendidikan + asramaKebutuhan;
    const alokasiPerSantri = jumlahSantri > 0 ? totalOverhead / jumlahSantri : 0;

    return {
      totalOverhead,
      sppPendidikan,
      asramaKebutuhan,
      jumlahSantri,
      alokasiPerSantri
    };
  } catch (error) {
    console.error('Error getting preview alokasi:', error);
    return null;
  }
};

/**
 * Format currency to Rupiah
 */
export const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format date to Indonesian format
 */
export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

/**
 * Get bulan names array
 */
export const getBulanNames = (): string[] => {
  return BULAN_NAMES;
};

/**
 * Get current month and year
 */
export const getCurrentPeriod = (): { bulan: number; tahun: number } => {
  const now = new Date();
  return {
    bulan: now.getMonth() + 1,
    tahun: now.getFullYear()
  };
};
