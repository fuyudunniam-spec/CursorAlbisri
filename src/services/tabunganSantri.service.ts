import { supabase } from '../integrations/supabase/client';
import {
  TabunganSantri,
  TabunganSantriWithSantri,
  SaldoTabunganSantri,
  SetorTabunganRequest,
  TarikTabunganRequest,
  SetorMassalRequest,
  TarikMassalRequest,
  TarikMassalResult,
  TabunganStats,
  TabunganFilter
} from '../types/tabungan.types';

export class TabunganSantriService {
  // Get saldo tabungan santri
  static async getSaldoTabungan(santriId: string): Promise<number> {
    const { data, error } = await supabase.rpc('get_saldo_tabungan_santri', {
      p_santri_id: santriId
    });

    if (error) {
      throw new Error(`Error getting saldo: ${error.message}`);
    }

    return data || 0;
  }

  // Get saldo semua santri dengan info santri
  static async getAllSaldoTabungan(): Promise<SaldoTabunganSantri[]> {
    const { data, error } = await supabase
      .from('santri')
      .select(`
        id,
        id_santri,
        nama_lengkap,
        nisn,
        kelas,
        kategori
      `)
      .eq('status', 'Aktif')
      .order('nama_lengkap');

    if (error) {
      throw new Error(`Error getting santri list: ${error.message}`);
    }

    const saldoPromises = data.map(async (santri) => {
      const saldo = await this.getSaldoTabungan(santri.id);
      return {
        santri_id: santri.id,
        saldo,
        santri: {
          id: santri.id,
          id_santri: santri.id_santri,
          nama_lengkap: santri.nama_lengkap,
          nisn: santri.nisn,
          kelas: santri.kelas,
          kategori: santri.kategori
        }
      };
    });

    return Promise.all(saldoPromises);
  }

  // Setor tabungan santri
  static async setorTabungan(request: SetorTabunganRequest): Promise<string> {
    const { data, error } = await supabase.rpc('setor_tabungan_santri', {
      p_santri_id: request.santri_id,
      p_nominal: request.nominal,
      p_deskripsi: request.deskripsi || 'Setoran tunai',
      p_catatan: request.catatan || null,
      p_bukti_file: request.bukti_file || null,
      p_petugas_id: request.petugas_id || null,
      p_petugas_nama: request.petugas_nama || null
    });

    if (error) {
      throw new Error(`Error setor tabungan: ${error.message}`);
    }

    return data;
  }

  // Tarik tabungan santri
  static async tarikTabungan(request: TarikTabunganRequest): Promise<string> {
    const { data, error } = await supabase.rpc('tarik_tabungan_santri', {
      p_santri_id: request.santri_id,
      p_nominal: request.nominal,
      p_deskripsi: request.deskripsi || 'Penarikan tunai',
      p_catatan: request.catatan || null,
      p_bukti_file: request.bukti_file || null,
      p_petugas_id: request.petugas_id || null,
      p_petugas_nama: request.petugas_nama || null
    });

    if (error) {
      throw new Error(`Error tarik tabungan: ${error.message}`);
    }

    return data;
  }

  // Setor massal tabungan santri
  static async setorMassal(request: SetorMassalRequest): Promise<string[]> {
    const { data, error } = await supabase.rpc('setor_tabungan_santri_massal', {
      p_santri_ids: request.santri_ids,
      p_nominal: request.nominal,
      p_deskripsi: request.deskripsi ?? 'Setoran massal',
      p_catatan: request.catatan || null,
      p_petugas_id: request.petugas_id || null,
      p_petugas_nama: request.petugas_nama || null
    });

    if (error) {
      throw new Error(`Error setor massal: ${error.message}`);
    }

    return data;
  }

  // Tarik massal tabungan santri
  static async tarikMassal(request: TarikMassalRequest): Promise<TarikMassalResult> {
    const { data, error } = await supabase.rpc('tarik_tabungan_santri_massal', {
      p_santri_ids: request.santri_ids,
      p_nominal: request.nominal,
      p_deskripsi: request.deskripsi ?? 'Penarikan massal',
      p_catatan: request.catatan || null,
      p_petugas_id: request.petugas_id || null,
      p_petugas_nama: request.petugas_nama || null
    });

    if (error) {
      throw new Error(`Error tarik massal: ${error.message}`);
    }

    return data;
  }

  // Get riwayat tabungan santri
  static async getRiwayatTabungan(filter: TabunganFilter): Promise<TabunganSantriWithSantri[]> {
    let query = supabase
      .from('santri_tabungan')
      .select(`
        *,
        santri:santri_id (
          id,
          id_santri,
          nama_lengkap,
          nisn,
          kelas,
          kategori
        )
      `)
      .order('created_at', { ascending: false });

    if (filter.santri_id) {
      query = query.eq('santri_id', filter.santri_id);
    }

    if (filter.jenis) {
      query = query.eq('jenis', filter.jenis);
    }

    if (filter.tanggal_mulai) {
      query = query.gte('tanggal', filter.tanggal_mulai);
    }

    if (filter.tanggal_selesai) {
      query = query.lte('tanggal', filter.tanggal_selesai);
    }

    if (filter.search) {
      query = query.or(`deskripsi.ilike.%${filter.search}%,catatan.ilike.%${filter.search}%`);
    }

    if (filter.limit) {
      query = query.limit(filter.limit);
    }

    if (filter.offset) {
      query = query.range(filter.offset, filter.offset + (filter.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Error getting riwayat tabungan: ${error.message}`);
    }

    return data || [];
  }

  // Get stats tabungan - FIXED: menggunakan perhitungan yang akurat
  static async getTabunganStats(): Promise<TabunganStats> {
    try {
      // Get current month transactions for setoran dan penarikan bulan ini
      const { data: monthlyData, error: monthlyError } = await supabase
        .from('santri_tabungan')
        .select('nominal, jenis, created_at')
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
        .lte('created_at', new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59).toISOString());

      if (monthlyError) {
        throw new Error(`Error getting monthly data: ${monthlyError.message}`);
      }

      // Calculate monthly totals
      let totalSetoranBulanIni = 0;
      let totalPenarikanBulanIni = 0;

      monthlyData.forEach(transaction => {
        if (transaction.jenis === 'Setoran' || transaction.jenis.includes('Reward')) {
          totalSetoranBulanIni += transaction.nominal;
        } else if (transaction.jenis === 'Penarikan') {
          totalPenarikanBulanIni += transaction.nominal;
        }
      });

      // Get all santri with transactions to calculate total saldo
      const { data: santriWithTransactions, error: santriError } = await supabase
        .from('santri_tabungan')
        .select('santri_id')
        .not('santri_id', 'is', null);

      if (santriError) {
        throw new Error(`Error getting santri data: ${santriError.message}`);
      }

      // Get unique santri IDs
      const uniqueSantriIds = [...new Set(santriWithTransactions.map(t => t.santri_id))];
      
      // Calculate actual saldo for each santri using the proper function
      let totalSaldo = 0;
      let jumlahSantriAktif = 0;

      for (const santriId of uniqueSantriIds) {
        const saldo = await this.getSaldoTabungan(santriId);
        totalSaldo += saldo;
        if (saldo > 0) {
          jumlahSantriAktif++;
        }
      }

      const rataRataSaldo = jumlahSantriAktif > 0 ? totalSaldo / jumlahSantriAktif : 0;

      return {
        total_saldo: totalSaldo,
        total_setoran_bulan_ini: totalSetoranBulanIni,
        total_penarikan_bulan_ini: totalPenarikanBulanIni,
        jumlah_santri_aktif: jumlahSantriAktif,
        rata_rata_saldo: rataRataSaldo
      };
    } catch (error: any) {
      console.error('Error in getTabunganStats:', error);
      throw new Error(`Error calculating tabungan stats: ${error.message}`);
    }
  }

  // Get santri dengan saldo tabungan (untuk multi-select)
  static async getSantriWithSaldo(): Promise<SaldoTabunganSantri[]> {
    const { data: santriData, error: santriError } = await supabase
      .from('santri')
      .select(`
        id,
        id_santri,
        nama_lengkap,
        nisn,
        kelas,
        kategori,
        status
      `)
      .eq('status', 'Aktif')
      .order('nama_lengkap');

    if (santriError) {
      throw new Error(`Error getting santri: ${santriError.message}`);
    }

    const saldoPromises = santriData.map(async (santri) => {
      const saldo = await this.getSaldoTabungan(santri.id);
      return {
        santri_id: santri.id,
        saldo,
        santri: {
          id: santri.id,
          id_santri: santri.id_santri,
          nama_lengkap: santri.nama_lengkap,
          nisn: santri.nisn,
          kelas: santri.kelas,
          kategori: santri.kategori
        }
      };
    });

    return Promise.all(saldoPromises);
  }
}
