import { supabase } from '@/integrations/supabase/client';

export interface KelasMasterInput {
  nama_kelas: string;
  program: 'Madin' | 'TPQ' | 'Tahfid' | 'Tahsin';
  rombel?: string;
  tingkat?: string;
  tahun_ajaran?: string;
  semester?: string;
  status?: 'Aktif' | 'Non-Aktif';
}

export interface KelasMaster extends KelasMasterInput {
  id: string;
  created_at: string;
}

export class AkademikKelasService {
  static async listKelas(): Promise<Array<KelasMaster & { jumlah_anggota: number }>> {
    // Fetch kelas and members count using RPC or manual join
    const { data, error } = await supabase
      .from('kelas_master')
      .select('id, nama_kelas, program, rombel, tingkat, tahun_ajaran, semester, status, created_at');
    if (error) throw error;

    const kelasIds = (data || []).map(k => k.id);
    if (kelasIds.length === 0) return [];

    const { data: counts, error: err2 } = await supabase
      .from('kelas_anggota')
      .select('kelas_id, count:kelas_id', { count: 'exact', head: false })
      .in('kelas_id', kelasIds)
      .eq('status', 'Aktif');
    if (err2) throw err2;

    const kelasIdToCount: Record<string, number> = {};
    (counts || []).forEach((row: any) => {
      const key = row.kelas_id;
      kelasIdToCount[key] = (kelasIdToCount[key] || 0) + 1;
    });

    return (data || []).map(k => ({
      ...k,
      jumlah_anggota: kelasIdToCount[k.id] || 0,
    }));
  }

  static async createKelas(input: KelasMasterInput): Promise<void> {
    const payload = {
      nama_kelas: input.nama_kelas,
      program: input.program,
      rombel: input.rombel || null,
      tingkat: input.tingkat || null,
      tahun_ajaran: input.tahun_ajaran || '2024/2025',
      semester: input.semester || 'Ganjil',
      status: input.status || 'Aktif',
    };
    const { error } = await supabase.from('kelas_master').insert(payload);
    if (error) throw error;
  }

  static async createKelasBulk(inputs: KelasMasterInput[]): Promise<void> {
    if (!inputs || inputs.length === 0) return;
    const rows = inputs.map((i) => ({
      nama_kelas: i.nama_kelas,
      program: i.program,
      rombel: i.rombel || null,
      tingkat: i.tingkat || null,
      tahun_ajaran: i.tahun_ajaran || '2024/2025',
      semester: i.semester || 'Ganjil',
      status: i.status || 'Aktif',
    }));
    const { error } = await supabase.from('kelas_master').insert(rows);
    if (error) throw error;
  }
  static async updateKelas(id: string, input: Partial<KelasMasterInput>): Promise<void> {
    const { error } = await supabase.from('kelas_master').update(input).eq('id', id);
    if (error) throw error;
  }

  static async deleteKelas(id: string): Promise<void> {
    const { error } = await supabase.from('kelas_master').delete().eq('id', id);
    if (error) throw error;
  }
}


