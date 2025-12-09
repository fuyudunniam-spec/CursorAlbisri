import { supabase } from '@/integrations/supabase/client';
import { AkademikNilaiService, Nilai } from './akademikNilai.service';

export interface RapotInput {
  santri_id: string;
  kelas_id: string;
  semester_id: string;
  catatan_wali_kelas?: string | null;
  catatan_kepala_sekolah?: string | null;
  tanggal_cetak?: string | null;
}

export interface Rapot extends RapotInput {
  id: string;
  total_mapel: number;
  total_mapel_lulus: number;
  total_mapel_tidak_lulus: number;
  rata_rata_nilai: number;
  total_pertemuan_keseluruhan: number;
  total_hadir_keseluruhan: number;
  persentase_kehadiran_keseluruhan: number;
  status_kelulusan_semester: 'Belum Dinilai' | 'Lulus' | 'Tidak Lulus';
  alasan_tidak_lulus_semester?: string | null;
  predikat?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  santri?: {
    id: string;
    nama_lengkap: string;
    id_santri?: string;
  };
  kelas?: {
    id: string;
    nama_kelas: string;
    program: string;
  };
  semester?: {
    id: string;
    nama: string;
    tanggal_mulai: string;
    tanggal_selesai: string;
  };
}

export class AkademikRapotService {
  /**
   * Generate atau update rapot berdasarkan nilai yang sudah ada
   */
  static async generateRapot(input: RapotInput): Promise<Rapot> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Validasi input
      if (!input.santri_id || !input.kelas_id || !input.semester_id) {
        throw new Error('Data rapot tidak lengkap: santri_id, kelas_id, dan semester_id wajib diisi');
      }

      // Ambil semua nilai untuk santri, kelas, dan semester ini
      const semuaNilai = await AkademikNilaiService.listNilai(input.kelas_id, input.semester_id, {
        santriId: input.santri_id,
      });

      // Hitung statistik
      const totalMapel = semuaNilai.length;
      const totalMapelLulus = semuaNilai.filter((n) => n.status_kelulusan === 'Lulus').length;
      const totalMapelTidakLulus = semuaNilai.filter((n) => n.status_kelulusan === 'Tidak Lulus').length;

      // Hitung rata-rata nilai (hanya dari nilai yang sudah dinilai)
      const nilaiYangSudahDinilai = semuaNilai.filter((n) => n.nilai_angka !== null);
      const rataRataNilai =
        nilaiYangSudahDinilai.length > 0
          ? nilaiYangSudahDinilai.reduce((sum, n) => sum + (n.nilai_angka || 0), 0) / nilaiYangSudahDinilai.length
          : 0;

      // Hitung kehadiran keseluruhan (ambil dari nilai pertama, karena semua nilai punya data kehadiran yang sama)
      const kehadiranKeseluruhan =
        semuaNilai.length > 0
          ? {
              total_pertemuan: semuaNilai[0].total_pertemuan,
              total_hadir: semuaNilai[0].total_hadir,
              persentase_kehadiran: semuaNilai[0].persentase_kehadiran,
            }
          : { total_pertemuan: 0, total_hadir: 0, persentase_kehadiran: 0 };

      // Tentukan status kelulusan semester
      let statusKelulusanSemester: 'Belum Dinilai' | 'Lulus' | 'Tidak Lulus' = 'Belum Dinilai';
      let alasanTidakLulusSemester: string | null = null;

      if (totalMapel === 0) {
        statusKelulusanSemester = 'Belum Dinilai';
      } else if (totalMapelTidakLulus > 0 || kehadiranKeseluruhan.persentase_kehadiran < 60) {
        statusKelulusanSemester = 'Tidak Lulus';
        const alasan: string[] = [];
        if (totalMapelTidakLulus > 0) {
          alasan.push(`${totalMapelTidakLulus} mata pelajaran tidak lulus`);
        }
        if (kehadiranKeseluruhan.persentase_kehadiran < 60) {
          alasan.push(`Kehadiran kurang dari 60% (${kehadiranKeseluruhan.persentase_kehadiran.toFixed(2)}%)`);
        }
        alasanTidakLulusSemester = alasan.join(', ');
      } else {
        statusKelulusanSemester = 'Lulus';
      }

      // Tentukan predikat berdasarkan rata-rata nilai
      let predikat: string | null = null;
      if (rataRataNilai >= 90) {
        predikat = 'Sangat Memuaskan';
      } else if (rataRataNilai >= 80) {
        predikat = 'Memuaskan';
      } else if (rataRataNilai >= 70) {
        predikat = 'Cukup';
      } else if (rataRataNilai >= 60) {
        predikat = 'Kurang';
      } else if (rataRataNilai > 0) {
        predikat = 'Sangat Kurang';
      }

      // Insert atau update rapot
      const { data, error } = await supabase
        .from('akademik_rapot')
        .upsert(
          {
            santri_id: input.santri_id,
            kelas_id: input.kelas_id,
            semester_id: input.semester_id,
            total_mapel,
            total_mapel_lulus,
            total_mapel_tidak_lulus,
            rata_rata_nilai: Math.round(rataRataNilai * 100) / 100,
            total_pertemuan_keseluruhan: kehadiranKeseluruhan.total_pertemuan,
            total_hadir_keseluruhan: kehadiranKeseluruhan.total_hadir,
            persentase_kehadiran_keseluruhan: Math.round(kehadiranKeseluruhan.persentase_kehadiran * 100) / 100,
            status_kelulusan_semester: statusKelulusanSemester,
            alasan_tidak_lulus_semester: alasanTidakLulusSemester,
            predikat,
            catatan_wali_kelas: input.catatan_wali_kelas || null,
            catatan_kepala_sekolah: input.catatan_kepala_sekolah || null,
            tanggal_cetak: input.tanggal_cetak || null,
            updated_at: new Date().toISOString(),
            updated_by: user?.id || null,
          },
          {
            onConflict: 'santri_id,kelas_id,semester_id',
          }
        )
        .select(
          `
          *,
          santri:santri_id(id, nama_lengkap, id_santri),
          kelas:kelas_id(id, nama_kelas, program),
          semester:semester_id(id, nama, tanggal_mulai, tanggal_selesai)
        `
        )
        .single();

      if (error) {
        console.error('[AkademikRapotService] Error generating rapot:', error);
        throw error;
      }

      return data as Rapot;
    } catch (error: any) {
      console.error('[AkademikRapotService] Error in generateRapot:', {
        input,
        error: error.message || error,
      });
      throw error;
    }
  }

  /**
   * List rapot per kelas per semester
   */
  static async listRapot(
    kelasId: string,
    semesterId: string,
    options?: { santriId?: string }
  ): Promise<Rapot[]> {
    try {
      let query = supabase
        .from('akademik_rapot')
        .select(
          `
          *,
          santri:santri_id(id, nama_lengkap, id_santri),
          kelas:kelas_id(id, nama_kelas, program),
          semester:semester_id(id, nama, tanggal_mulai, tanggal_selesai)
        `
        )
        .eq('kelas_id', kelasId)
        .eq('semester_id', semesterId)
        .order('created_at', { ascending: false });

      if (options?.santriId) {
        query = query.eq('santri_id', options.santriId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[AkademikRapotService] Error loading rapot:', error);
        throw error;
      }

      return (data || []) as Rapot[];
    } catch (error: any) {
      console.error('[AkademikRapotService] Error in listRapot:', {
        kelasId,
        semesterId,
        options,
        error: error.message || error,
      });
      throw error;
    }
  }

  /**
   * Get rapot by ID
   */
  static async getRapotById(rapotId: string): Promise<Rapot | null> {
    try {
      const { data, error } = await supabase
        .from('akademik_rapot')
        .select(
          `
          *,
          santri:santri_id(id, nama_lengkap, id_santri),
          kelas:kelas_id(id, nama_kelas, program),
          semester:semester_id(id, nama, tanggal_mulai, tanggal_selesai)
        `
        )
        .eq('id', rapotId)
        .maybeSingle();

      if (error) {
        console.error('[AkademikRapotService] Error loading rapot:', error);
        throw error;
      }

      return data as Rapot | null;
    } catch (error: any) {
      console.error('[AkademikRapotService] Error in getRapotById:', {
        rapotId,
        error: error.message || error,
      });
      throw error;
    }
  }

  /**
   * Get rapot by santri, kelas, dan semester
   */
  static async getRapotBySantriKelasSemester(
    santriId: string,
    kelasId: string,
    semesterId: string
  ): Promise<Rapot | null> {
    try {
      const { data, error } = await supabase
        .from('akademik_rapot')
        .select(
          `
          *,
          santri:santri_id(id, nama_lengkap, id_santri),
          kelas:kelas_id(id, nama_kelas, program),
          semester:semester_id(id, nama, tanggal_mulai, tanggal_selesai)
        `
        )
        .eq('santri_id', santriId)
        .eq('kelas_id', kelasId)
        .eq('semester_id', semesterId)
        .maybeSingle();

      if (error) {
        console.error('[AkademikRapotService] Error loading rapot:', error);
        throw error;
      }

      return data as Rapot | null;
    } catch (error: any) {
      console.error('[AkademikRapotService] Error in getRapotBySantriKelasSemester:', {
        santriId,
        kelasId,
        semesterId,
        error: error.message || error,
      });
      throw error;
    }
  }

  /**
   * Update rapot (catatan, tanggal cetak, dll)
   */
  static async updateRapot(rapotId: string, input: Partial<RapotInput>): Promise<Rapot> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('akademik_rapot')
        .update({
          ...input,
          updated_at: new Date().toISOString(),
          updated_by: user?.id || null,
        })
        .eq('id', rapotId)
        .select(
          `
          *,
          santri:santri_id(id, nama_lengkap, id_santri),
          kelas:kelas_id(id, nama_kelas, program),
          semester:semester_id(id, nama, tanggal_mulai, tanggal_selesai)
        `
        )
        .single();

      if (error) {
        console.error('[AkademikRapotService] Error updating rapot:', error);
        throw error;
      }

      return data as Rapot;
    } catch (error: any) {
      console.error('[AkademikRapotService] Error in updateRapot:', {
        rapotId,
        input,
        error: error.message || error,
      });
      throw error;
    }
  }

  /**
   * Delete rapot
   */
  static async deleteRapot(rapotId: string): Promise<void> {
    try {
      const { error } = await supabase.from('akademik_rapot').delete().eq('id', rapotId);

      if (error) {
        console.error('[AkademikRapotService] Error deleting rapot:', error);
        throw error;
      }
    } catch (error: any) {
      console.error('[AkademikRapotService] Error in deleteRapot:', {
        rapotId,
        error: error.message || error,
      });
      throw error;
    }
  }
}




