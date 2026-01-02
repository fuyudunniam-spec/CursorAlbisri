// Tagihan Service - Consistent naming standard
// Service for handling santri billing (for Reguler/Mahasiswa)

import { supabase } from '@/integrations/supabase/client';

export interface KomponenTagihan {
  nama: string;
  jenis_pendidikan: 'formal' | 'pesantren';
  nominal: number;
}

export interface TagihanSantri {
  id: string;
  santri_id: string;
  periode: string;
  tahun_ajaran?: string;
  bulan: string;
  komponen_tagihan?: KomponenTagihan[];
  total_tagihan: number;
  total_tagihan_formal?: number;
  total_tagihan_pesantren?: number;
  total_bayar: number;
  total_bayar_formal?: number;
  total_bayar_pesantren?: number;
  sisa_tagihan: number;
  sisa_tagihan_formal?: number;
  sisa_tagihan_pesantren?: number;
  status: 'belum_bayar' | 'dibayar_sebagian' | 'lunas' | 'terlambat';
  tanggal_bayar?: string;
  metode_pembayaran?: string;
  bukti_pembayaran?: string;
  catatan?: string;
  created_at: string;
  updated_at: string;
  // Relations
  santri?: {
    id?: string;
    id_santri?: string;
    nama_lengkap: string;
    nisn?: string;
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
  sumber_pembayaran?: 'orang_tua' | 'donatur' | 'yayasan';
  donatur_id?: string;
  campaign_id?: string;
  alokasi_ke?: 'otomatis' | 'formal' | 'pesantren';
  is_kas_bergerak?: boolean; // true = kas nyata, false = alokasi internal
  // Relations
  donatur?: {
    id: string;
    donor_name: string;
    kategori_donasi?: string;
  };
  santri?: {
    id?: string;
    id_santri?: string;
    nama_lengkap?: string;
    nisn?: string;
    kategori?: string;
  };
  tagihan?: {
    id?: string;
    periode?: string;
    bulan?: string;
    tahun_ajaran?: string;
    total_tagihan?: number;
  };
}

export interface GenerateTagihanData {
  santri_ids: string[];
  periode: string;
  bulan: string;
  tahun_ajaran?: string;
  komponen_tagihan: KomponenTagihan[];
  total_tagihan: number;
  total_tagihan_formal?: number;
  total_tagihan_pesantren?: number;
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
          santri:santri_id(id, id_santri, nama_lengkap, kategori)
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
          santri:santri_id(nama_lengkap, id_santri, kategori)
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
      const tagihan = data.santri_ids.map(santri_id => {
        const tagihanData: any = {
          santri_id,
          periode: data.periode,
          bulan: data.bulan,
          tahun_ajaran: data.tahun_ajaran,
          komponen_tagihan: data.komponen_tagihan,
          total_tagihan: data.total_tagihan,
          total_tagihan_formal: data.total_tagihan_formal || 0,
          total_tagihan_pesantren: data.total_tagihan_pesantren || 0,
          total_bayar: 0,
          total_bayar_formal: 0,
          total_bayar_pesantren: 0,
          sisa_tagihan: data.total_tagihan,
          sisa_tagihan_formal: data.total_tagihan_formal || 0,
          sisa_tagihan_pesantren: data.total_tagihan_pesantren || 0,
          status: 'belum_bayar',
        };
        
        return tagihanData;
      });

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
      // Set default is_kas_bergerak berdasarkan sumber_pembayaran
      // orang_tua dan donatur = true (kas bergerak)
      // yayasan = false (alokasi internal, tidak masuk kas)
      const isKasBergerak = data.is_kas_bergerak ?? 
        (data.sumber_pembayaran !== 'yayasan'); // Default: true kecuali yayasan
      
      const paymentData = {
        ...data,
        is_kas_bergerak: isKasBergerak,
      };

      const { error } = await supabase
        .from('pembayaran_santri')
        .insert(paymentData);

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
        .select(`
          *,
          donatur:donatur_id(id, donor_name, kategori_donasi),
          tagihan:tagihan_id(id, periode, bulan, tahun_ajaran),
          santri:santri_id(id, id_santri, nama_lengkap, kategori)
        `)
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
   * Get all payments (for riwayat pembayaran page)
   */
  static async getAllPayments(filters?: {
    santri_id?: string;
    santri_ids?: string[];
    tanggal_mulai?: string;
    tanggal_selesai?: string;
    sumber_pembayaran?: string;
    search?: string;
  }): Promise<PembayaranSantri[]> {
    try {
      let query = supabase
        .from('pembayaran_santri')
        .select(`
          *,
          donatur:donatur_id(id, donor_name, kategori_donasi),
          tagihan:tagihan_id(id, periode, bulan, tahun_ajaran, total_tagihan),
          santri:santri_id(id, id_santri, nama_lengkap, kategori)
        `)
        .order('tanggal_bayar', { ascending: false });

      // Support multiple santri IDs
      if (filters?.santri_ids && filters.santri_ids.length > 0) {
        query = query.in('santri_id', filters.santri_ids);
      } else if (filters?.santri_id) {
        query = query.eq('santri_id', filters.santri_id);
      }

      if (filters?.tanggal_mulai) {
        query = query.gte('tanggal_bayar', filters.tanggal_mulai);
      }

      if (filters?.tanggal_selesai) {
        query = query.lte('tanggal_bayar', filters.tanggal_selesai);
      }

      if (filters?.sumber_pembayaran) {
        query = query.eq('sumber_pembayaran', filters.sumber_pembayaran);
      }

      if (filters?.search) {
        query = query.or(`nomor_referensi.ilike.%${filters.search}%,catatan.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting all payments:', error);
      throw error;
    }
  }

  /**
   * Update payment
   */
  static async updatePayment(id: string, data: Partial<PembayaranSantri>): Promise<void> {
    try {
      // Set default is_kas_bergerak jika sumber_pembayaran diubah
      // Trigger akan handle sinkronisasi dengan keuangan
      if (data.sumber_pembayaran !== undefined) {
        const isKasBergerak = data.is_kas_bergerak ?? 
          (data.sumber_pembayaran !== 'yayasan');
        data.is_kas_bergerak = isKasBergerak;
      }

      const { error } = await supabase
        .from('pembayaran_santri')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating payment:', error);
      throw error;
    }
  }

  /**
   * Delete payment
   */
  static async deletePayment(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('pembayaran_santri')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting payment:', error);
      throw error;
    }
  }

  /**
   * Get single payment by ID
   */
  static async getPaymentById(id: string): Promise<PembayaranSantri | null> {
    try {
      const { data, error } = await supabase
        .from('pembayaran_santri')
        .select(`
          *,
          donatur:donatur_id(id, donor_name, kategori_donasi),
          tagihan:tagihan_id(id, periode, bulan, tahun_ajaran, total_tagihan, komponen_tagihan),
          santri:santri_id(id, id_santri, nama_lengkap, kategori, alamat, no_hp)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting payment by id:', error);
      throw error;
    }
  }

  /**
   * Get santri for tagihan (all approved santri)
   * Includes: Reguler, Mahasantri, Binaan Mukim, Binaan Non Mukim
   */
  static async getSantriForTagihan(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('santri')
        .select('id, id_santri, nama_lengkap, kategori, tipe_pembayaran')
        .eq('status_approval', 'disetujui')
        .in('kategori', ['Reguler', 'Mahasantri', 'Binaan Mukim', 'Binaan Non Mukim', 'Mahasiswa'])
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
        .select('status, total_tagihan, total_bayar, sisa_tagihan');

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
        stats.total_dibayar += parseFloat((item.total_bayar || 0).toString());
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
