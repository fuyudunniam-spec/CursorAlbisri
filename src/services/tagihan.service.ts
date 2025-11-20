// Tagihan Service - Consistent naming standard
// Service for handling santri billing (for Reguler/Mahasiswa)

import { supabase } from '@/integrations/supabase/client';

export interface TagihanSantri {
  id: string;
  santri_id: string;
  periode: string;
  tahun_ajaran?: string;
  bulan: string;
  komponen_tagihan?: any;
  total_tagihan: number;
  total_dibayar: number;
  sisa_tagihan: number;
  status: 'belum_bayar' | 'dibayar_sebagian' | 'lunas' | 'terlambat';
  tanggal_jatuh_tempo?: string;
  tanggal_bayar?: string;
  metode_pembayaran?: string;
  bukti_pembayaran?: string;
  catatan?: string;
  created_at: string;
  updated_at: string;
  // Relations
  santri?: {
    nama_lengkap: string;
    nis: string;
    kategori: string;
  };
}

export interface PembayaranSantri {
  id?: string;
  tagihan_id: string;
  santri_id: string;
  jumlah_bayar: number;
  tanggal_bayar: string;
  metode_pembayaran: string;
  nomor_referensi?: string;
  bukti_pembayaran?: string;
  catatan?: string;
}

export interface GenerateTagihanData {
  santri_ids: string[];
  periode: string;
  bulan: string;
  tahun_ajaran?: string;
  komponen_tagihan: any;
  total_tagihan: number;
  tanggal_jatuh_tempo?: string;
}

export class TagihanService {
  /**
   * Get all tagihan with filters
   */
  static async getTagihan(filters?: {
    santri_id?: string;
    periode?: string;
    status?: string;
  }): Promise<TagihanSantri[]> {
    try {
      let query = supabase
        .from('tagihan_santri')
        .select(`
          *,
          santri:santri_id(nama_lengkap, nisn, kategori)
        `)
        .order('periode', { ascending: false });

      if (filters?.santri_id) {
        query = query.eq('santri_id', filters.santri_id);
      }
      if (filters?.periode) {
        query = query.eq('periode', filters.periode);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting tagihan:', error);
      throw error;
    }
  }

  /**
   * Get tagihan by ID
   */
  static async getTagihanById(id: string): Promise<TagihanSantri | null> {
    try {
      const { data, error } = await supabase
        .from('tagihan_santri')
        .select(`
          *,
          santri:santri_id(nama_lengkap, nisn, kategori)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting tagihan by ID:', error);
      throw error;
    }
  }

  /**
   * Generate tagihan for santri (bulk)
   */
  static async generateTagihan(data: GenerateTagihanData): Promise<void> {
    try {
      const tagihan = data.santri_ids.map(santri_id => ({
        santri_id,
        periode: data.periode,
        bulan: data.bulan,
        tahun_ajaran: data.tahun_ajaran,
        komponen_tagihan: data.komponen_tagihan,
        total_tagihan: data.total_tagihan,
        tanggal_jatuh_tempo: data.tanggal_jatuh_tempo,
      }));

      const { error } = await supabase
        .from('tagihan_santri')
        .insert(tagihan);

      if (error) throw error;
    } catch (error) {
      console.error('Error generating tagihan:', error);
      throw error;
    }
  }

  /**
   * Create single tagihan
   */
  static async createTagihan(data: Partial<TagihanSantri>): Promise<void> {
    try {
      const { error } = await supabase
        .from('tagihan_santri')
        .insert(data);

      if (error) throw error;
    } catch (error) {
      console.error('Error creating tagihan:', error);
      throw error;
    }
  }

  /**
   * Update tagihan
   */
  static async updateTagihan(id: string, data: Partial<TagihanSantri>): Promise<void> {
    try {
      const { error } = await supabase
        .from('tagihan_santri')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating tagihan:', error);
      throw error;
    }
  }

  /**
   * Delete tagihan
   */
  static async deleteTagihan(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('tagihan_santri')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting tagihan:', error);
      throw error;
    }
  }

  /**
   * Record payment
   */
  static async recordPayment(data: PembayaranSantri): Promise<void> {
    try {
      const { error } = await supabase
        .from('pembayaran_santri')
        .insert(data);

      if (error) throw error;
    } catch (error) {
      console.error('Error recording payment:', error);
      throw error;
    }
  }

  /**
   * Get payment history for tagihan
   */
  static async getPaymentHistory(tagihan_id: string): Promise<PembayaranSantri[]> {
    try {
      const { data, error } = await supabase
        .from('pembayaran_santri')
        .select('*')
        .eq('tagihan_id', tagihan_id)
        .order('tanggal_bayar', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting payment history:', error);
      throw error;
    }
  }

  /**
   * Get santri for tagihan (Reguler/Mahasiswa only)
   */
  static async getSantriForTagihan(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('santri')
        .select('id, id_santri, nama_lengkap, kategori')
        .eq('status_approval', 'disetujui')
        .eq('tipe_pembayaran', 'Mandiri')
        .in('kategori', ['Reguler', 'Mahasantri'])
        .order('nama_lengkap');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting santri for tagihan:', error);
      throw error;
    }
  }

  /**
   * Get tagihan statistics
   */
  static async getTagihanStats() {
    try {
      const { data, error } = await supabase
        .from('tagihan_santri')
        .select('status, total_tagihan, total_dibayar, sisa_tagihan');

      if (error) throw error;

      const stats = {
        total_tagihan: 0,
        total_dibayar: 0,
        total_sisa: 0,
        belum_bayar: 0,
        dibayar_sebagian: 0,
        lunas: 0,
        terlambat: 0,
      };

      data?.forEach(item => {
        stats.total_tagihan += parseFloat(item.total_tagihan.toString());
        stats.total_dibayar += parseFloat(item.total_dibayar.toString());
        stats.total_sisa += parseFloat(item.sisa_tagihan.toString());

        if (item.status === 'belum_bayar') stats.belum_bayar++;
        else if (item.status === 'dibayar_sebagian') stats.dibayar_sebagian++;
        else if (item.status === 'lunas') stats.lunas++;
        else if (item.status === 'terlambat') stats.terlambat++;
      });

      return stats;
    } catch (error) {
      console.error('Error getting tagihan stats:', error);
      throw error;
    }
  }
}
