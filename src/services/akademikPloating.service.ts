import { supabase } from '@/integrations/supabase/client';

export interface KelasOption { id: string; nama_kelas: string; program: 'Madin'|'TPQ'|'Tahfid'|'Tahsin'; rombel?: string|null }
export interface SantriLite { id: string; nama_lengkap: string; nisn?: string|null; kategori?: string|null }

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

  static async searchSantri(keyword: string): Promise<SantriLite[]> {
    const kw = keyword.trim();
    const query = supabase.from('santri')
      .select('id, nama_lengkap, nisn, kategori')
      .limit(30);
    if (kw) {
      query.or(`nama_lengkap.ilike.%${kw}%,nisn.ilike.%${kw}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as SantriLite[];
  }

  static async listAnggota(kelasId: string): Promise<SantriLite[]> {
    const { data, error } = await supabase
      .from('kelas_anggota')
      .select('santri:santri_id(id, nama_lengkap, nisn, kategori)')
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

  static async removeMember(kelasId: string, santriId: string): Promise<void> {
    const { error } = await supabase
      .from('kelas_anggota')
      .delete()
      .eq('kelas_id', kelasId)
      .eq('santri_id', santriId);
    if (error) throw error;
  }
}


