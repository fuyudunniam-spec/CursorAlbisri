import { supabase } from '@/integrations/supabase/client';

export type AgendaJenis = 'Absensi' | 'Setoran' | 'Gabungan';
export type AgendaFrekuensi = 'Harian' | 'Mingguan' | 'Khusus';
export type AgendaHari = 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu' | 'Ahad';

export interface AkademikAgendaInput {
  kelas_id: string;
  nama_agenda: string;
  jenis: AgendaJenis;
  frekuensi: AgendaFrekuensi;
  hari?: AgendaHari | null;
  jam_mulai?: string | null; // HH:mm:ss
  jam_selesai?: string | null;
  lokasi?: string | null;
  catatan?: string | null;
  pengajar_id?: string | null;
  mapel_id?: string | null;
  pengajar_nama?: string | null;
  mapel_nama?: string | null;
  kitab?: string | null;
  is_setoran?: boolean;
  aktif?: boolean;
  tanggal_mulai?: string | null; // YYYY-MM-DD
  tanggal_selesai?: string | null;
}

export interface AkademikAgenda extends AkademikAgendaInput {
  id: string;
  created_at: string;
  updated_at?: string;
  pengajar?: {
    id: string;
    nama_lengkap: string;
    status: 'Aktif' | 'Non-Aktif';
  } | null;
  mapel?: {
    id: string;
    nama_mapel: string;
    program: string;
  } | null;
  kelas?: {
    id: string;
    nama_kelas: string;
    program: string;
  };
}

export interface AkademikPengajarInput {
  nama_lengkap: string;
  kode_pengajar?: string | null;
  status?: 'Aktif' | 'Non-Aktif';
  program_spesialisasi?: string[];
  kontak?: string | null;
  catatan?: string | null;
  user_id?: string | null;
}

export interface AkademikMapelInput {
  nama_mapel: string;
  kode_mapel?: string | null;
  program: 'Madin' | 'TPQ' | 'Tahfid' | 'Tahsin' | 'Umum';
  kategori?: string | null;
  tingkat?: string | null;
  status?: 'Aktif' | 'Non-Aktif';
  catatan?: string | null;
}

export interface AgendaPertemuanSummary {
  agenda_id: string;
  kelas_id: string | null;
  nama_agenda: string;
  jenis: AgendaJenis;
  frekuensi: AgendaFrekuensi;
  hari?: AgendaHari | null;
  tanggal_mulai?: string | null;
  tanggal_selesai?: string | null;
  jam_mulai?: string | null;
  jam_selesai?: string | null;
  pengajar_id?: string | null;
  pengajar_nama?: string | null;
  nama_kelas?: string | null;
  program?: string | null;
  total_terjadwal: number;
  total_berjalan: number;
  total_selesai: number;
  total_tunda: number;
  total_batal: number;
  total_pertemuan: number;
}

export class AkademikAgendaService {
  /**
   * Get agenda yang di-assign ke pengajar tertentu
   */
  static async listAgendaByPengajar(pengajarId: string, options?: { aktifOnly?: boolean }): Promise<AkademikAgenda[]> {
    if (!pengajarId) return [];

    let query = supabase
      .from('kelas_agenda')
      .select(`
        *,
        pengajar:pengajar_id(id, nama_lengkap, status),
        mapel:mapel_id(id, nama_mapel, program),
        kelas:kelas_id(id, nama_kelas, program)
      `)
      .eq('pengajar_id', pengajarId);

    if (options?.aktifOnly !== false) {
      query = query.eq('aktif', true);
    }

    const { data, error } = await query.order('nama_agenda', { ascending: true });

    if (error) throw error;

    return (data || []).map((agenda: any) => ({
      id: agenda.id,
      kelas_id: agenda.kelas_id,
      nama_agenda: agenda.nama_agenda,
      jenis: agenda.jenis,
      frekuensi: agenda.frekuensi,
      hari: agenda.hari,
      jam_mulai: agenda.jam_mulai,
      jam_selesai: agenda.jam_selesai,
      lokasi: agenda.lokasi,
      catatan: agenda.catatan,
      pengajar_id: agenda.pengajar_id,
      mapel_id: agenda.mapel_id,
      pengajar_nama: agenda.pengajar_nama,
      mapel_nama: agenda.mapel_nama,
      kitab: agenda.kitab,
      is_setoran: agenda.is_setoran,
      aktif: agenda.aktif,
      tanggal_mulai: agenda.tanggal_mulai,
      tanggal_selesai: agenda.tanggal_selesai,
      created_at: agenda.created_at,
      updated_at: agenda.updated_at,
      pengajar: agenda.pengajar ? {
        id: agenda.pengajar.id,
        nama_lengkap: agenda.pengajar.nama_lengkap,
        status: agenda.pengajar.status,
      } : null,
      mapel: agenda.mapel ? {
        id: agenda.mapel.id,
        nama_mapel: agenda.mapel.nama_mapel,
        program: agenda.mapel.program,
      } : null,
      kelas: agenda.kelas ? {
        id: agenda.kelas.id,
        nama_kelas: agenda.kelas.nama_kelas,
        program: agenda.kelas.program,
      } : undefined,
    }));
  }

  static async listAgendaByKelas(
    kelasId: string,
    options?: { jenis?: AgendaJenis[]; aktifOnly?: boolean; semesterId?: string }
  ): Promise<AkademikAgenda[]> {
    if (!kelasId) return [];

    // Get kelas info to get semester_id
    const { data: kelasData, error: kelasError } = await supabase
      .from('kelas_master')
      .select('semester_id')
      .eq('id', kelasId)
      .single();

    if (kelasError) throw kelasError;
    const semesterIdFromKelas = kelasData?.semester_id;

    let query = supabase
      .from('kelas_agenda')
      .select(`
        *,
        pengajar:pengajar_id(id, nama_lengkap, status),
        mapel:mapel_id(id, nama_mapel, program),
        kelas:kelas_id(id, nama_kelas, program, semester_id)
      `)
      .eq('kelas_id', kelasId)
      .order('jam_mulai', { ascending: true, nullsLast: true })
      .order('nama_agenda', { ascending: true });

    // Filter by semester_id if provided or from kelas
    const targetSemesterId = options?.semesterId || semesterIdFromKelas;
    if (targetSemesterId) {
      query = query.eq('kelas.semester_id', targetSemesterId);
    }

    if (options?.jenis?.length) {
      query = query.in('jenis', options.jenis);
    }
    if (options?.aktifOnly !== false) {
      query = query.eq('aktif', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as AkademikAgenda[];
  }

  static async listAgenda(params?: {
    program?: string;
    jenis?: AgendaJenis[];
    aktifOnly?: boolean;
    kelasId?: string;
    semesterId?: string;
  }): Promise<AkademikAgenda[]> {
    let query = supabase
      .from('kelas_agenda')
      .select(`
        *,
        pengajar:pengajar_id(id, nama_lengkap, status),
        mapel:mapel_id(id, nama_mapel, program),
        kelas:kelas_id(id, nama_kelas, program, semester_id)
      `)
      .order('created_at', { ascending: false });

    if (params?.kelasId) {
      query = query.eq('kelas_id', params.kelasId);
    }
    if (params?.semesterId) {
      query = query.eq('kelas.semester_id', params.semesterId);
    }
    if (params?.program) {
      query = query.eq('kelas.program', params.program);
    }
    if (params?.jenis?.length) {
      query = query.in('jenis', params.jenis);
    }
    if (params?.aktifOnly !== false) {
      query = query.eq('aktif', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as AkademikAgenda[];
  }

  static async createAgenda(input: AkademikAgendaInput): Promise<void> {
    const payload = {
      kelas_id: input.kelas_id,
      nama_agenda: input.nama_agenda,
      jenis: input.jenis,
      frekuensi: input.frekuensi,
      hari: input.hari || null,
      jam_mulai: input.jam_mulai || null,
      jam_selesai: input.jam_selesai || null,
      lokasi: input.lokasi || null,
      catatan: input.catatan || null,
      pengajar_id: input.pengajar_id || null,
      mapel_id: input.mapel_id || null,
      pengajar_nama: input.pengajar_nama ? input.pengajar_nama.trim() : null,
      mapel_nama: input.mapel_nama ? input.mapel_nama.trim() : null,
      kitab: input.kitab ? input.kitab.trim() : null,
      is_setoran: input.is_setoran ?? (input.jenis !== 'Absensi'),
      aktif: input.aktif ?? true,
      tanggal_mulai: input.tanggal_mulai || null,
      tanggal_selesai: input.tanggal_selesai || null,
    };

    const { error } = await supabase.from('kelas_agenda').insert(payload);
    if (error) throw error;
  }

  static async updateAgenda(id: string, input: Partial<AkademikAgendaInput>): Promise<void> {
    if (!id) throw new Error('ID agenda wajib ada');
    const payload: any = { ...input };

    if ('hari' in input) payload.hari = input.hari || null;
    if ('jam_mulai' in input) payload.jam_mulai = input.jam_mulai || null;
    if ('jam_selesai' in input) payload.jam_selesai = input.jam_selesai || null;
    if ('lokasi' in input) payload.lokasi = input.lokasi || null;
    if ('catatan' in input) payload.catatan = input.catatan || null;
    if ('pengajar_id' in input) payload.pengajar_id = input.pengajar_id || null;
    if ('mapel_id' in input) payload.mapel_id = input.mapel_id || null;
    if ('pengajar_nama' in input) payload.pengajar_nama = input.pengajar_nama ? input.pengajar_nama.trim() : null;
    if ('mapel_nama' in input) payload.mapel_nama = input.mapel_nama ? input.mapel_nama.trim() : null;
    if ('kitab' in input) payload.kitab = input.kitab ? input.kitab.trim() : null;
    if ('is_setoran' in input) payload.is_setoran = input.is_setoran;
    if ('aktif' in input) payload.aktif = input.aktif;
    if ('tanggal_mulai' in input) payload.tanggal_mulai = input.tanggal_mulai || null;
    if ('tanggal_selesai' in input) payload.tanggal_selesai = input.tanggal_selesai || null;

    const { error } = await supabase.from('kelas_agenda').update(payload).eq('id', id);
    if (error) throw error;
  }

  static async deleteAgenda(id: string): Promise<void> {
    if (!id) return;
    const { error } = await supabase.from('kelas_agenda').delete().eq('id', id);
    if (error) throw error;
  }

  static async listAgendaSummary(filters?: {
    kelasId?: string;
    pengajarId?: string;
    program?: string;
  }): Promise<AgendaPertemuanSummary[]> {
    let query = supabase
      .from('v_agenda_pertemuan_summary')
      .select('*')
      .order('tanggal_mulai', { ascending: true, nullsLast: true });

    if (filters?.kelasId) {
      query = query.eq('kelas_id', filters.kelasId);
    }
    if (filters?.pengajarId) {
      query = query.eq('pengajar_id', filters.pengajarId);
    }
    if (filters?.program) {
      query = query.eq('program', filters.program);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as AgendaPertemuanSummary[];
  }

  // --------------------------
  // Pengajar
  // --------------------------
  static async listPengajar(status?: 'Aktif' | 'Non-Aktif' | 'Semua'): Promise<Array<{
    id: string;
    nama_lengkap: string;
    status: 'Aktif' | 'Non-Aktif';
    kode_pengajar?: string | null;
  }>> {
    let query = supabase.from('akademik_pengajar').select('id, nama_lengkap, status, kode_pengajar').order('nama_lengkap');
    if (status && status !== 'Semua') {
      query = query.eq('status', status);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  static async createPengajar(input: AkademikPengajarInput): Promise<void> {
    const payload = {
      nama_lengkap: input.nama_lengkap,
      kode_pengajar: input.kode_pengajar || null,
      status: input.status || 'Aktif',
      program_spesialisasi: input.program_spesialisasi || null,
      kontak: input.kontak || null,
      catatan: input.catatan || null,
      user_id: input.user_id || null,
    };
    const { error } = await supabase.from('akademik_pengajar').insert(payload);
    if (error) throw error;
  }

  static async updatePengajar(id: string, input: Partial<AkademikPengajarInput>): Promise<void> {
    const payload: any = {};
    if (input.nama_lengkap !== undefined) payload.nama_lengkap = input.nama_lengkap;
    if (input.kode_pengajar !== undefined) payload.kode_pengajar = input.kode_pengajar || null;
    if (input.status !== undefined) payload.status = input.status;
    if (input.program_spesialisasi !== undefined) payload.program_spesialisasi = input.program_spesialisasi || null;
    if (input.kontak !== undefined) payload.kontak = input.kontak || null;
    if (input.catatan !== undefined) payload.catatan = input.catatan || null;
    if (input.user_id !== undefined) payload.user_id = input.user_id || null;
    
    const { error } = await supabase.from('akademik_pengajar').update(payload).eq('id', id);
    if (error) throw error;
  }

  static async deletePengajar(id: string): Promise<void> {
    const { error } = await supabase.from('akademik_pengajar').delete().eq('id', id);
    if (error) throw error;
  }

  // --------------------------
  // Mapel
  // --------------------------
  static async listMapel(params?: { program?: string; status?: 'Aktif' | 'Non-Aktif' | 'Semua' }): Promise<Array<{
    id: string;
    nama_mapel: string;
    program: string;
    status: 'Aktif' | 'Non-Aktif';
  }>> {
    let query = supabase.from('akademik_mapel').select('id, nama_mapel, program, status').order('nama_mapel');
    if (params?.program) {
      query = query.eq('program', params.program);
    }
    if (params?.status && params.status !== 'Semua') {
      query = query.eq('status', params.status);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  static async createMapel(input: AkademikMapelInput): Promise<void> {
    const payload = {
      nama_mapel: input.nama_mapel,
      kode_mapel: input.kode_mapel || null,
      program: input.program,
      kategori: input.kategori || null,
      tingkat: input.tingkat || null,
      status: input.status || 'Aktif',
      catatan: input.catatan || null,
    };
    const { error } = await supabase.from('akademik_mapel').insert(payload);
    if (error) throw error;
  }

  static async updateMapel(id: string, input: Partial<AkademikMapelInput>): Promise<void> {
    const payload: any = {};
    if (input.nama_mapel !== undefined) payload.nama_mapel = input.nama_mapel;
    if (input.kode_mapel !== undefined) payload.kode_mapel = input.kode_mapel || null;
    if (input.program !== undefined) payload.program = input.program;
    if (input.kategori !== undefined) payload.kategori = input.kategori || null;
    if (input.tingkat !== undefined) payload.tingkat = input.tingkat || null;
    if (input.status !== undefined) payload.status = input.status;
    if (input.catatan !== undefined) payload.catatan = input.catatan || null;
    
    const { error } = await supabase.from('akademik_mapel').update(payload).eq('id', id);
    if (error) throw error;
  }

  static async deleteMapel(id: string): Promise<void> {
    const { error } = await supabase.from('akademik_mapel').delete().eq('id', id);
    if (error) throw error;
  }
}

