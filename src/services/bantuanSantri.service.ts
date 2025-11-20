import { supabase } from "@/integrations/supabase/client";

export interface DistribusiBantuanSantri {
  id: string;
  santri_id: string;
  tanggal_distribusi: string;
  jenis_bantuan: 'Finansial' | 'Barang';
  kategori: string;
  deskripsi?: string;
  nominal: number;
  quantity?: number;
  satuan?: string;
  sumber: 'Inventaris' | 'Keuangan' | 'Manual';
  referensi_id?: string;
  bukti_file?: string;
  created_at: string;
}

export interface BantuanSummary {
  bantuan_bulan_ini: number;
  bantuan_tahun_ini: number;
  total_periode: number;
  jumlah_distribusi: number;
}

export interface BantuanBreakdown {
  jenis_bantuan: 'Finansial' | 'Barang';
  kategori: string;
  total_nominal: number;
  jumlah_distribusi: number;
}

export class BantuanSantriService {
  /**
   * Get bantuan summary for a specific santri
   */
  static async getBantuanSummary(santriId: string): Promise<BantuanSummary> {
    const { data, error } = await supabase
      .rpc('get_bantuan_summary', { p_santri_id: santriId });

    if (error) {
      console.error('Error getting bantuan summary:', error);
      throw error;
    }

    return data?.[0] || {
      bantuan_bulan_ini: 0,
      bantuan_tahun_ini: 0,
      total_periode: 0,
      jumlah_distribusi: 0
    };
  }

  /**
   * Get all bantuan distributions for a specific santri
   */
  static async getDistribusiBantuan(santriId: string): Promise<DistribusiBantuanSantri[]> {
    const { data, error } = await supabase
      .from('distribusi_bantuan_santri')
      .select('*')
      .eq('santri_id', santriId)
      .order('tanggal_distribusi', { ascending: false });

    if (error) {
      console.error('Error getting distribusi bantuan:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get bantuan breakdown by jenis and kategori
   */
  static async getBantuanBreakdown(santriId: string): Promise<BantuanBreakdown[]> {
    const { data, error } = await supabase
      .from('distribusi_bantuan_santri')
      .select('jenis_bantuan, kategori, nominal')
      .eq('santri_id', santriId);

    if (error) {
      console.error('Error getting bantuan breakdown:', error);
      throw error;
    }

    // Group by jenis_bantuan and kategori
    const breakdown = (data || []).reduce((acc: any, item) => {
      const key = `${item.jenis_bantuan}-${item.kategori}`;
      if (!acc[key]) {
        acc[key] = {
          jenis_bantuan: item.jenis_bantuan,
          kategori: item.kategori,
          total_nominal: 0,
          jumlah_distribusi: 0
        };
      }
      acc[key].total_nominal += item.nominal;
      acc[key].jumlah_distribusi += 1;
      return acc;
    }, {});

    return Object.values(breakdown);
  }

  /**
   * Get bantuan for specific month
   */
  static async getBantuanByMonth(santriId: string, year: number, month: number): Promise<DistribusiBantuanSantri[]> {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('distribusi_bantuan_santri')
      .select('*')
      .eq('santri_id', santriId)
      .gte('tanggal_distribusi', startDate)
      .lte('tanggal_distribusi', endDate)
      .order('tanggal_distribusi', { ascending: false });

    if (error) {
      console.error('Error getting bantuan by month:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get bantuan for specific year
   */
  static async getBantuanByYear(santriId: string, year: number): Promise<DistribusiBantuanSantri[]> {
    const startDate = new Date(year, 0, 1).toISOString().split('T')[0];
    const endDate = new Date(year, 11, 31).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('distribusi_bantuan_santri')
      .select('*')
      .eq('santri_id', santriId)
      .gte('tanggal_distribusi', startDate)
      .lte('tanggal_distribusi', endDate)
      .order('tanggal_distribusi', { ascending: false });

    if (error) {
      console.error('Error getting bantuan by year:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get recent bantuan distributions (last 10)
   */
  static async getRecentBantuan(santriId: string, limit: number = 10): Promise<DistribusiBantuanSantri[]> {
    const { data, error } = await supabase
      .from('distribusi_bantuan_santri')
      .select('*')
      .eq('santri_id', santriId)
      .order('tanggal_distribusi', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting recent bantuan:', error);
      throw error;
    }

    return data || [];
  }
}
