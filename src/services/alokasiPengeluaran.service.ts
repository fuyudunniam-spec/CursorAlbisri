import { supabase } from '../integrations/supabase/client';

export interface AlokasiPengeluaranSantri {
  id: string;
  keuangan_id: string;
  rincian_id?: string;
  santri_id: string;
  nominal_alokasi: number;
  persentase_alokasi: number;
  jenis_bantuan: string;
  periode: string;
  keterangan?: string;
  created_at: string;
  updated_at: string;
}

export interface SantriAllocation {
  santri_id: string;
  nama_lengkap: string;
  nisn: string;
  nominal_alokasi: number;
  persentase_alokasi: number;
  jenis_bantuan: string;
  periode: string;
  keterangan?: string;
}

export interface CreateAlokasiData {
  keuangan_id: string;
  rincian_id?: string;
  santri_id: string;
  nominal_alokasi: number;
  persentase_alokasi?: number;
  jenis_bantuan: string;
  periode: string;
  keterangan?: string;
}

export interface BatchAllocationData {
  keuangan_id: string;
  rincian_id?: string;
  allocations: Omit<CreateAlokasiData, 'keuangan_id' | 'rincian_id'>[];
}

export interface AkumulasiBantuanSantri {
  santri_id: string;
  nama_lengkap: string;
  nisn: string;
  periode_bulan: string;
  total_bantuan: number;
  jumlah_transaksi: number;
  jenis_bantuan_list: string[];
}

export class AlokasiPengeluaranService {
  /**
   * Get all allocations
   */
  static async getAll(): Promise<AlokasiPengeluaranSantri[]> {
    const { data, error } = await supabase
      .from('alokasi_pengeluaran_santri')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get allocations by keuangan_id
   */
  static async getByKeuanganId(keuangan_id: string): Promise<AlokasiPengeluaranSantri[]> {
    const { data, error } = await supabase
      .from('alokasi_pengeluaran_santri')
      .select('*')
      .eq('keuangan_id', keuangan_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get allocations by santri_id
   */
  static async getBySantriId(santri_id: string): Promise<AlokasiPengeluaranSantri[]> {
    const { data, error } = await supabase
      .from('alokasi_pengeluaran_santri')
      .select('*')
      .eq('santri_id', santri_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get allocations by santri_id and period
   */
  static async getBySantriIdAndPeriod(santri_id: string, periode: string): Promise<AlokasiPengeluaranSantri[]> {
    const { data, error } = await supabase
      .from('alokasi_pengeluaran_santri')
      .select('*')
      .eq('santri_id', santri_id)
      .eq('periode', periode)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get real-time accumulation for all santri
   */
  static async getAkumulasiBantuan(): Promise<AkumulasiBantuanSantri[]> {
    const { data, error } = await supabase
      .from('view_akumulasi_bantuan_santri')
      .select('*')
      .order('periode_bulan', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get real-time accumulation by santri_id
   */
  static async getAkumulasiBantuanBySantri(santri_id: string): Promise<AkumulasiBantuanSantri[]> {
    const { data, error } = await supabase
      .from('view_akumulasi_bantuan_santri')
      .select('*')
      .eq('santri_id', santri_id)
      .order('periode_bulan', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get real-time accumulation by period
   */
  static async getAkumulasiBantuanByPeriod(periode: string): Promise<AkumulasiBantuanSantri[]> {
    const { data, error } = await supabase
      .from('view_akumulasi_bantuan_santri')
      .select('*')
      .eq('periode_bulan', periode)
      .order('total_bantuan', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Create single allocation
   */
  static async create(data: CreateAlokasiData): Promise<AlokasiPengeluaranSantri> {
    const { data: result, error } = await supabase
      .from('alokasi_pengeluaran_santri')
      .insert([{
        ...data,
        persentase_alokasi: data.persentase_alokasi || 0,
      }])
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  /**
   * Create batch allocations
   */
  static async createBatch(data: BatchAllocationData): Promise<AlokasiPengeluaranSantri[]> {
    const allocations = data.allocations.map(allocation => ({
      ...allocation,
      keuangan_id: data.keuangan_id,
      rincian_id: data.rincian_id,
      persentase_alokasi: allocation.persentase_alokasi || 0,
    }));

    const { data: result, error } = await supabase
      .from('alokasi_pengeluaran_santri')
      .insert(allocations)
      .select();

    if (error) throw error;
    return result || [];
  }

  /**
   * Auto-split allocation among selected santri
   */
  static async createAutoSplit(
    keuangan_id: string,
    rincian_id: string | undefined,
    total_amount: number,
    santri_ids: string[],
    jenis_bantuan: string,
    periode: string,
    keterangan?: string
  ): Promise<AlokasiPengeluaranSantri[]> {
    const amount_per_santri = total_amount / santri_ids.length;
    const percentage_per_santri = 100 / santri_ids.length;

    const allocations = santri_ids.map(santri_id => ({
      keuangan_id,
      rincian_id,
      santri_id,
      nominal_alokasi: amount_per_santri,
      persentase_alokasi: percentage_per_santri,
      jenis_bantuan,
      periode,
      keterangan: keterangan || `Auto-split ${jenis_bantuan}`,
    }));

    return this.createBatch({ keuangan_id, rincian_id, allocations });
  }

  /**
   * Update allocation
   */
  static async update(id: string, data: Partial<CreateAlokasiData>): Promise<AlokasiPengeluaranSantri> {
    const { data: result, error } = await supabase
      .from('alokasi_pengeluaran_santri')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  /**
   * Delete allocation
   */
  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('alokasi_pengeluaran_santri')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Delete all allocations for a keuangan_id
   */
  static async deleteByKeuanganId(keuangan_id: string): Promise<void> {
    const { error } = await supabase
      .from('alokasi_pengeluaran_santri')
      .delete()
      .eq('keuangan_id', keuangan_id);

    if (error) throw error;
  }

  /**
   * Get allocation summary by keuangan_id
   */
  static async getSummaryByKeuanganId(keuangan_id: string): Promise<{
    total_allocation: number;
    total_santri: number;
    allocations: AlokasiPengeluaranSantri[];
  }> {
    const allocations = await this.getByKeuanganId(keuangan_id);
    
    const total_allocation = allocations.reduce((sum, alloc) => sum + alloc.nominal_alokasi, 0);
    const total_santri = allocations.length;

    return {
      total_allocation,
      total_santri,
      allocations,
    };
  }

  /**
   * Get allocation summary by santri_id for a period
   */
  static async getSummaryBySantriId(santri_id: string, periode?: string): Promise<{
    total_bantuan: number;
    jumlah_transaksi: number;
    jenis_bantuan_list: string[];
    allocations: AlokasiPengeluaranSantri[];
  }> {
    const allocations = periode 
      ? await this.getBySantriIdAndPeriod(santri_id, periode)
      : await this.getBySantriId(santri_id);

    const total_bantuan = allocations.reduce((sum, alloc) => sum + alloc.nominal_alokasi, 0);
    const jenis_bantuan_list = [...new Set(allocations.map(alloc => alloc.jenis_bantuan))];

    return {
      total_bantuan,
      jumlah_transaksi: allocations.length,
      jenis_bantuan_list,
      allocations,
    };
  }

  /**
   * Validate allocation data
   */
  static validate(data: CreateAlokasiData): string[] {
    const errors: string[] = [];

    if (!data.keuangan_id) {
      errors.push('ID keuangan harus diisi');
    }

    if (!data.santri_id) {
      errors.push('ID santri harus diisi');
    }

    if (!data.jenis_bantuan || data.jenis_bantuan.trim().length === 0) {
      errors.push('Jenis bantuan harus diisi');
    }

    if (!data.periode || data.periode.trim().length === 0) {
      errors.push('Periode harus diisi');
    }

    if (data.nominal_alokasi <= 0) {
      errors.push('Nominal alokasi harus lebih dari 0');
    }

    if (data.persentase_alokasi !== undefined && (data.persentase_alokasi < 0 || data.persentase_alokasi > 100)) {
      errors.push('Persentase alokasi harus antara 0-100');
    }

    return errors;
  }

  /**
   * Get available santri for allocation
   */
  static async getAvailableSantri(): Promise<{ 
    id: string; 
    nama_lengkap: string; 
    nisn: string;
    id_santri: string;
    program?: string;
  }[]> {
    const { data, error } = await supabase
      .from('santri')
      .select(`
        id, 
        nama_lengkap, 
        nisn,
        id_santri,
        santri_programs_history(
          nama_program,
          is_active
        )
      `)
      .eq('status', 'Aktif')
      .order('nama_lengkap', { ascending: true });

    if (error) throw error;
    
    // Transform data to include program info
    return (data || []).map(item => ({
      id: item.id,
      nama_lengkap: item.nama_lengkap,
      nisn: item.nisn,
      id_santri: item.id_santri,
      program: item.santri_programs_history?.find((p: any) => p.is_active)?.nama_program
    }));
  }

  /**
   * Get allocation statistics
   */
  static async getStatistics(): Promise<{
    total_allocations: number;
    total_amount: number;
    unique_santri: number;
    unique_periods: string[];
    top_beneficiaries: Array<{ santri_id: string; nama_lengkap: string; total_bantuan: number }>;
  }> {
    const { data, error } = await supabase
      .from('alokasi_pengeluaran_santri')
      .select(`
        *,
        santri!inner(nama_lengkap)
      `);

    if (error) throw error;

    const allocations = data || [];
    const total_allocations = allocations.length;
    const total_amount = allocations.reduce((sum, alloc) => sum + alloc.nominal_alokasi, 0);
    
    const unique_santri = new Set(allocations.map(alloc => alloc.santri_id)).size;
    const unique_periods = [...new Set(allocations.map(alloc => alloc.periode))];

    // Calculate top beneficiaries
    const santriTotals: { [key: string]: { nama_lengkap: string; total: number } } = {};
    allocations.forEach(alloc => {
      if (!santriTotals[alloc.santri_id]) {
        santriTotals[alloc.santri_id] = { nama_lengkap: alloc.santri.nama_lengkap, total: 0 };
      }
      santriTotals[alloc.santri_id].total += alloc.nominal_alokasi;
    });

    const top_beneficiaries = Object.entries(santriTotals)
      .map(([santri_id, data]) => ({ santri_id, nama_lengkap: data.nama_lengkap, total_bantuan: data.total }))
      .sort((a, b) => b.total_bantuan - a.total_bantuan)
      .slice(0, 10);

    return {
      total_allocations,
      total_amount,
      unique_santri,
      unique_periods,
      top_beneficiaries,
    };
  }

  /**
   * Get santri assistance summary for reports
   */
  static async getSantriAssistanceSummary(filters?: {
    periode?: string;
    program?: string;
  }): Promise<Array<{
    id_santri: string;
    nama_lengkap: string;
    program: string;
    total_bantuan: number;
    jumlah_alokasi: number;
  }>> {
    let query = supabase
      .from('alokasi_pengeluaran_santri')
      .select(`
        santri_id,
        nominal_alokasi,
        santri!inner(
          id_santri,
          nama_lengkap,
          santri_programs_history(
            nama_program,
            is_active
          )
        )
      `);

    // Apply filters
    if (filters?.periode) {
      query = query.eq('periode', filters.periode);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Group by santri and calculate totals
    const santriTotals: { [key: string]: {
      id_santri: string;
      nama_lengkap: string;
      program: string;
      total_bantuan: number;
      jumlah_alokasi: number;
    } } = {};

    (data || []).forEach(allocation => {
      const santri = allocation.santri;
      const program = santri.santri_programs_history?.find((p: any) => p.is_active)?.nama_program || 'Tidak ada program';

      // Apply program filter if specified
      if (filters?.program && program !== filters.program) {
        return;
      }

      if (!santriTotals[santri.id]) {
        santriTotals[santri.id] = {
          id_santri: santri.id_santri,
          nama_lengkap: santri.nama_lengkap,
          program,
          total_bantuan: 0,
          jumlah_alokasi: 0,
        };
      }

      santriTotals[santri.id].total_bantuan += allocation.nominal_alokasi;
      santriTotals[santri.id].jumlah_alokasi += 1;
    });

    return Object.values(santriTotals).sort((a, b) => b.total_bantuan - a.total_bantuan);
  }
}
