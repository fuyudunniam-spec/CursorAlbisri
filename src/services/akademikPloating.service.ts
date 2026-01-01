import { supabase } from '@/integrations/supabase/client';
import { searchSantriStandard, SantriLite } from '@/utils/santri.utils';

export interface KelasOption { id: string; nama_kelas: string; program: string; rombel?: string|null } // program fleksibel
// Export SantriLite dari utils untuk konsistensi
export type { SantriLite };

export class AkademikPloatingService {
  static async getKelasOptions(): Promise<KelasOption[]> {
    const { data, error } = await supabase
      .from('kelas_master')
      .select('id, nama_kelas, program, rombel')
      .eq('status', 'Aktif')
      .order('program', { ascending: true })
      .order('nama_kelas', { ascending: true });
    if (error) throw error;
    return (data || []) as KelasOption[];
  }

  /**
   * Search santri menggunakan utility function standar
   * Menggunakan id_santri (bukan nisn) sebagai identifier
   */
  static async searchSantri(keyword: string): Promise<SantriLite[]> {
    return await searchSantriStandard(keyword, 30);
  }

  static async listAnggota(kelasId: string): Promise<SantriLite[]> {
    const { data, error } = await supabase
      .from('kelas_anggota')
      .select('santri:santri_id(id, nama_lengkap, id_santri, kategori)')
      .eq('kelas_id', kelasId)
      .eq('status', 'Aktif')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map((row: any) => row.santri) as SantriLite[];
  }

  static async addMembers(kelasId: string, santriIds: string[]): Promise<void> {
    if (santriIds.length === 0) return;
    const rows = santriIds.map((sid) => ({ kelas_id: kelasId, santri_id: sid, status: 'Aktif' }));
    const { error } = await supabase.from('kelas_anggota').insert(rows, { defaultToNull: true });
    if (error) throw error;
  }

  /**
   * Add members with validation for Madin class enrollment (1 santri max 1 kelas Madin per term)
   * Returns array of errors for santri that already enrolled
   */
  static async addMembersWithValidation(
    kelasId: string, 
    santriIds: string[], 
    semesterId: string,
    kelasProgram: string
  ): Promise<{ success: string[]; errors: Array<{ santri_id: string; error: string }> }> {
    const errors: Array<{ santri_id: string; error: string }> = [];
    const validIds: string[] = [];

    // If not Madin class, skip validation
    if (kelasProgram !== 'Madin') {
      await this.addMembers(kelasId, santriIds);
      return { success: santriIds, errors: [] };
    }

    // Check each santri for existing Madin enrollment
    for (const santriId of santriIds) {
      const existing = await this.checkExistingMadinEnrollment(santriId, semesterId);
      if (existing) {
        errors.push({
          santri_id: santriId,
          error: `Santri sudah terdaftar di kelas Madin: ${existing.nama_kelas}`,
        });
      } else {
        validIds.push(santriId);
      }
    }

    // Add valid santri
    if (validIds.length > 0) {
      await this.addMembers(kelasId, validIds);
    }

    return { success: validIds, errors };
  }

  static async removeMember(kelasId: string, santriId: string): Promise<void> {
    const { error } = await supabase
      .from('kelas_anggota')
      .delete()
      .eq('kelas_id', kelasId)
      .eq('santri_id', santriId);
    if (error) throw error;
  }

  /**
   * Check if santri already enrolled in a Madin class for the given term
   * Returns the existing kelas if found, null otherwise
   */
  static async checkExistingMadinEnrollment(santriId: string, semesterId: string): Promise<{ kelas_id: string; nama_kelas: string } | null> {
    // Get all active enrollments for this santri with kelas info
    const { data: enrollments, error } = await supabase
      .from('kelas_anggota')
      .select(`
        kelas_id,
        kelas:kelas_id(
          id,
          nama_kelas,
          program,
          semester_id
        )
      `)
      .eq('santri_id', santriId)
      .eq('status', 'Aktif');
    
    if (error) throw error;
    
    if (!enrollments || enrollments.length === 0) return null;
    
    // Filter for Madin class in the given semester
    for (const enrollment of enrollments) {
      const kelas = (enrollment as any).kelas;
      if (kelas && kelas.program === 'Madin' && kelas.semester_id === semesterId) {
        return {
          kelas_id: kelas.id,
          nama_kelas: kelas.nama_kelas,
        };
      }
    }
    
    return null;
  }

  /**
   * Get list of santri IDs that are already enrolled in Madin classes for the given term
   */
  static async getEnrolledSantriIds(semesterId: string): Promise<string[]> {
    const { data: enrollments, error } = await supabase
      .from('kelas_anggota')
      .select(`
        santri_id,
        kelas:kelas_id(
          program,
          semester_id
        )
      `)
      .eq('status', 'Aktif');
    
    if (error) throw error;
    
    if (!enrollments || enrollments.length === 0) return [];
    
    // Filter for Madin class in the given semester and collect unique santri IDs
    const enrolledIds = new Set<string>();
    for (const enrollment of enrollments) {
      const kelas = (enrollment as any).kelas;
      if (kelas && kelas.program === 'Madin' && kelas.semester_id === semesterId) {
        enrolledIds.add(enrollment.santri_id);
      }
    }
    
    return Array.from(enrolledIds);
  }
}

