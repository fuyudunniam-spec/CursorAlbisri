// Tarif Service - Master tariff management for santri
// Service for handling custom tariffs per santri with JSONB components

import { supabase } from '@/integrations/supabase/client';

export interface TarifSantri {
  id: string;
  santri_id: string;
  komponen_tarif: Record<string, number>; // {spp: 500000, buku: 100000, asrama: 300000}
  periode_berlaku?: string; // 2024/2025
  tahun_ajaran?: string;
  catatan?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  // Relations
  santri?: {
    nama_lengkap: string;
    nisn?: string;
    kategori: string;
    tipe_pembayaran: string;
  };
}

export interface CreateTarifData {
  santri_id: string;
  komponen_tarif: Record<string, number>;
  periode_berlaku?: string;
  tahun_ajaran?: string;
  catatan?: string;
}

export interface BulkUpdateTarifData {
  santri_ids: string[];
  komponen_tarif: Record<string, number>;
  periode_berlaku: string;
  tahun_ajaran?: string;
  catatan?: string;
}

export class TarifService {
  /**
   * Get tariff for specific santri
   */
  static async getTarifBySantri(santri_id: string, periode?: string): Promise<TarifSantri | null> {
    try {
      let query = supabase
        .from('tarif_santri')
        .select(`
          *,
          santri:santri_id(nama_lengkap, id_santri, kategori, tipe_pembayaran)
        `)
        .eq('santri_id', santri_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (periode) {
        query = query.eq('periode_berlaku', periode);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data?.[0] || null;
    } catch (error) {
      console.error('Error getting tariff by santri:', error);
      throw error;
    }
  }

  /**
   * Get all tariffs with filters
   */
  static async getAllTarif(filters?: {
    kategori?: string;
    periode?: string;
    tahun_ajaran?: string;
    is_active?: boolean;
  }): Promise<TarifSantri[]> {
    try {
      let query = supabase
        .from('tarif_santri')
        .select(`
          *,
          santri:santri_id(nama_lengkap, id_santri, kategori, tipe_pembayaran)
        `)
        .order('created_at', { ascending: false });

      if (filters?.kategori) {
        query = query.eq('santri.kategori', filters.kategori);
      }
      if (filters?.periode) {
        query = query.eq('periode_berlaku', filters.periode);
      }
      if (filters?.tahun_ajaran) {
        query = query.eq('tahun_ajaran', filters.tahun_ajaran);
      }
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting all tariffs:', error);
      throw error;
    }
  }

  /**
   * Get santri eligible for tariff (Reguler & Mahasiswa only)
   */
  static async getSantriForTarif(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('santri')
        .select('id, id_santri, nama_lengkap, kategori, tipe_pembayaran, status_santri')
        .eq('status_approval', 'disetujui')
        .in('kategori', ['Reguler', 'Mahasantri'])
        .order('nama_lengkap');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting santri for tariff:', error);
      throw error;
    }
  }

  /**
   * Create or update tariff for santri
   */
  static async setTarif(data: CreateTarifData): Promise<void> {
    try {
      // Check if tariff exists for this santri and period
      const existing = await this.getTarifBySantri(data.santri_id, data.periode_berlaku);
      
      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('tarif_santri')
          .update({
            komponen_tarif: data.komponen_tarif,
            tahun_ajaran: data.tahun_ajaran,
            catatan: data.catatan,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('tarif_santri')
          .insert({
            santri_id: data.santri_id,
            komponen_tarif: data.komponen_tarif,
            periode_berlaku: data.periode_berlaku,
            tahun_ajaran: data.tahun_ajaran,
            catatan: data.catatan,
            is_active: true
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error setting tariff:', error);
      throw error;
    }
  }

  /**
   * Bulk update tariff for multiple santri
   */
  static async bulkUpdateTarif(data: BulkUpdateTarifData): Promise<void> {
    try {
      const tarifRecords = data.santri_ids.map(santri_id => ({
        santri_id,
        komponen_tarif: data.komponen_tarif,
        periode_berlaku: data.periode_berlaku,
        tahun_ajaran: data.tahun_ajaran,
        catatan: data.catatan,
        is_active: true
      }));

      const { error } = await supabase
        .from('tarif_santri')
        .upsert(tarifRecords, {
          onConflict: 'santri_id,periode_berlaku',
          ignoreDuplicates: false
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error bulk updating tariff:', error);
      throw error;
    }
  }

  /**
   * Delete tariff
   */
  static async deleteTarif(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('tarif_santri')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting tariff:', error);
      throw error;
    }
  }

  /**
   * Deactivate tariff (soft delete)
   */
  static async deactivateTarif(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('tarif_santri')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deactivating tariff:', error);
      throw error;
    }
  }

  /**
   * Get default tariff components for kategori
   */
  static getDefaultTarifForKategori(kategori: string): Record<string, number> {
    const defaults: Record<string, Record<string, number>> = {
      'Reguler': {
        spp: 500000,
        buku: 100000,
        seragam: 150000
      },
      'Mahasiswa': {
        spp: 750000,
        buku: 150000,
        asrama: 300000
      },
      'Santri TPO': {
        spp: 400000,
        buku: 80000
      }
    };

    return defaults[kategori] || defaults['Reguler'];
  }

  /**
   * Calculate total from komponen_tarif
   */
  static calculateTotal(komponen_tarif: Record<string, number>): number {
    return Object.values(komponen_tarif).reduce((sum, amount) => sum + amount, 0);
  }

  /**
   * Get available periods
   */
  static getAvailablePeriods(): string[] {
    const currentYear = new Date().getFullYear();
    const periods: string[] = [];
    
    // Generate periods for current and next year
    for (let year = currentYear - 1; year <= currentYear + 1; year++) {
      periods.push(`${year}/${year + 1}`);
    }
    
    return periods;
  }
}
