// Ploating Service - Simplified Kelas Assignment
// Service for handling santri kelas/rombel assignment (no complex program system)

import { supabase } from '@/integrations/supabase/client';

export interface SantriForPloating {
  id: string;
  nis: string;
  nama_lengkap: string;
  kategori: string;
  jenis_kelamin: string;
  status_approval: string;
  created_at: string;
  // Existing kelas assignments
  kelas?: Array<{
    id: string;
    kelas_program: string;
    rombel: string;
    tingkat: string;
    tahun_ajaran: string;
    semester: string;
    status_kelas: string;
  }>;
}

export interface KelasAssignment {
  santri_id: string;
  kelas_program: string;
  rombel: string;
  tingkat: string;
  tahun_ajaran: string;
  semester: string;
}

export interface KelasStats {
  total_approved: number;
  sudah_diploat: number;
  belum_diploat: number;
}

export class PloatingService {
  /**
   * Get santri yang sudah disetujui untuk ploating kelas
   */
  static async getSantriForPloating(): Promise<SantriForPloating[]> {
    try {
      const { data, error } = await supabase
        .from('santri')
        .select(`
          *,
          kelas:santri_kelas(
            id,
            kelas_program,
            rombel,
            tingkat,
            tahun_ajaran,
            semester,
            status_kelas
          )
        `)
        .eq('status_approval', 'disetujui')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map the data
      const mapped = (data || []).map(santri => ({
        ...santri,
        kelas: santri.kelas?.map((k: any) => ({
          id: k.id,
          kelas_program: k.kelas_program,
          rombel: k.rombel,
          tingkat: k.tingkat,
          tahun_ajaran: k.tahun_ajaran,
          semester: k.semester,
          status_kelas: k.status_kelas,
        })) || [],
      }));

      return mapped;
    } catch (error) {
      console.error('Error getting santri for ploating:', error);
      throw error;
    }
  }

  /**
   * Get available kelas options from existing assignments
   */
  static async getAvailableKelas(): Promise<Array<{kelas: string, tingkat: string}>> {
    try {
      const { data, error } = await supabase
        .rpc('get_kelas_options');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting kelas options:', error);
      throw error;
    }
  }

  /**
   * Assign santri to kelas/rombel
   */
  static async assignKelas(kelasData: KelasAssignment): Promise<void> {
    try {
      const { error } = await supabase
        .from('santri_kelas')
        .insert({
          santri_id: kelasData.santri_id,
          kelas_program: kelasData.kelas_program,
          rombel: kelasData.rombel,
          tingkat: kelasData.tingkat,
          tahun_ajaran: kelasData.tahun_ajaran,
          semester: kelasData.semester,
          status_kelas: 'Aktif'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error assigning kelas:', error);
      throw error;
    }
  }

  /**
   * Update existing kelas assignment
   */
  static async updateKelas(
    assignmentId: string,
    kelasData: Partial<KelasAssignment>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('santri_kelas')
        .update({
          kelas_program: kelasData.kelas_program,
          rombel: kelasData.rombel,
          tingkat: kelasData.tingkat,
          tahun_ajaran: kelasData.tahun_ajaran,
          semester: kelasData.semester,
        })
        .eq('id', assignmentId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating kelas:', error);
      throw error;
    }
  }

  /**
   * Remove kelas assignment
   */
  static async removeKelas(assignmentId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('santri_kelas')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing kelas:', error);
      throw error;
    }
  }

  /**
   * Bulk assign kelas to multiple santri
   */
  static async bulkAssignKelas(
    santriIds: string[],
    kelasData: Omit<KelasAssignment, 'santri_id'>
  ): Promise<void> {
    try {
      const assignments = santriIds.map(santriId => ({
        santri_id: santriId,
        kelas_program: kelasData.kelas_program,
        rombel: kelasData.rombel,
        tingkat: kelasData.tingkat,
        tahun_ajaran: kelasData.tahun_ajaran,
        semester: kelasData.semester,
        status_kelas: 'Aktif'
      }));

      const { error } = await supabase
        .from('santri_kelas')
        .insert(assignments);

      if (error) throw error;
    } catch (error) {
      console.error('Error bulk assigning kelas:', error);
      throw error;
    }
  }

  /**
   * Get ploating statistics
   */
  static async getPloatingStats(): Promise<KelasStats> {
    try {
      const { data, error } = await supabase
        .rpc('get_santri_kelas_stats');

      if (error) throw error;
      return data[0] || { total_approved: 0, sudah_diploat: 0, belum_diploat: 0 };
    } catch (error) {
      console.error('Error getting ploating stats:', error);
      throw error;
    }
  }

  /**
   * Get santri by kelas/rombel for reporting
   */
  static async getSantriByKelas(kelas: string, rombel?: string): Promise<SantriForPloating[]> {
    try {
      let query = supabase
        .from('santri')
        .select(`
          *,
          kelas:santri_kelas(
            id,
            kelas_program,
            rombel,
            tingkat,
            tahun_ajaran,
            semester,
            status_kelas
          )
        `)
        .eq('status_approval', 'disetujui');

      // Filter by kelas
      query = query.eq('kelas.kelas_program', kelas);
      
      // Filter by rombel if provided
      if (rombel) {
        query = query.eq('kelas.rombel', rombel);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(santri => ({
        ...santri,
        kelas: santri.kelas?.map((k: any) => ({
          id: k.id,
          kelas_program: k.kelas_program,
          rombel: k.rombel,
          tingkat: k.tingkat,
          tahun_ajaran: k.tahun_ajaran,
          semester: k.semester,
          status_kelas: k.status_kelas,
        })) || [],
      }));
    } catch (error) {
      console.error('Error getting santri by kelas:', error);
      throw error;
    }
  }

  /**
   * Update kelas status (Aktif, Non-Aktif, Lulus, Pindah)
   */
  static async updateKelasStatus(
    assignmentId: string, 
    status: 'Aktif' | 'Non-Aktif' | 'Lulus' | 'Pindah'
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('santri_kelas')
        .update({ status_kelas: status })
        .eq('id', assignmentId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating kelas status:', error);
      throw error;
    }
  }
}