/**
 * Service Layer untuk Master Data Keuangan
 * 
 * Menangani:
 * - CRUD Pilar Layanan
 * - CRUD Kategori Pengeluaran
 * - CRUD Sub Kategori Pengeluaran
 * - Mapping Kategori & Sub Kategori ke Santri
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================
// INTERFACES - Pilar Layanan
// ============================================

export interface MasterPilarLayanan {
  id: string;
  kode: string;
  nama: string;
  deskripsi?: string;
  urutan: number;
  warna_badge?: string;
  aktif: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePilarLayananData {
  kode: string;
  nama: string;
  deskripsi?: string;
  urutan?: number;
  warna_badge?: string;
}

export interface UpdatePilarLayananData {
  nama?: string;
  deskripsi?: string;
  urutan?: number;
  warna_badge?: string;
  aktif?: boolean;
}

// ============================================
// INTERFACES - Kategori Pengeluaran
// ============================================

export interface MasterKategoriPengeluaran {
  id: string;
  nama: string;
  jenis: 'Pemasukan' | 'Pengeluaran';
  ledger: 'UMUM';
  pilar_layanan_kode?: string;
  pilar_layanan?: MasterPilarLayanan;
  deskripsi?: string;
  urutan: number;
  aktif: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  sub_kategori?: MasterSubKategoriPengeluaran[];
  santri_mapping?: KategoriSantriMapping;
}

export interface CreateKategoriPengeluaranData {
  nama: string;
  jenis: 'Pemasukan' | 'Pengeluaran';
  pilar_layanan_kode?: string;
  deskripsi?: string;
  urutan?: number;
}

export interface UpdateKategoriPengeluaranData {
  nama?: string;
  pilar_layanan_kode?: string;
  deskripsi?: string;
  urutan?: number;
  aktif?: boolean;
}

// ============================================
// INTERFACES - Sub Kategori Pengeluaran
// ============================================

export interface MasterSubKategoriPengeluaran {
  id: string;
  kategori_id: string;
  nama: string;
  pilar_layanan_kode?: string;
  pilar_layanan?: MasterPilarLayanan;
  deskripsi?: string;
  urutan: number;
  aktif: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  santri_mapping?: SubKategoriSantriMapping;
}

export interface CreateSubKategoriPengeluaranData {
  kategori_id: string;
  nama: string;
  pilar_layanan_kode?: string;
  deskripsi?: string;
  urutan?: number;
}

export interface UpdateSubKategoriPengeluaranData {
  nama?: string;
  pilar_layanan_kode?: string;
  deskripsi?: string;
  urutan?: number;
  aktif?: boolean;
}

// ============================================
// INTERFACES - Mapping Santri
// ============================================

export interface KategoriSantriMapping {
  id: string;
  kategori_id: string;
  tipe_alokasi: 'tidak_dialokasikan' | 'seluruh_binaan_mukim' | 'pilih_santri';
  deskripsi?: string;
  aktif: boolean;
  created_at: string;
  updated_at: string;
  // Joined data (jika tipe_alokasi = 'pilih_santri')
  santri_list?: Array<{
    santri_id: string;
    santri_nama: string;
    santri_id_santri?: string;
  }>;
}

export interface CreateKategoriSantriMappingData {
  kategori_id: string;
  tipe_alokasi: 'tidak_dialokasikan' | 'seluruh_binaan_mukim' | 'pilih_santri';
  deskripsi?: string;
  santri_ids?: string[]; // Hanya untuk tipe 'pilih_santri'
}

export interface SubKategoriSantriMapping {
  id: string;
  sub_kategori_id: string;
  tipe_alokasi: 'tidak_dialokasikan' | 'seluruh_binaan_mukim' | 'pilih_santri';
  deskripsi?: string;
  aktif: boolean;
  created_at: string;
  updated_at: string;
  // Joined data (jika tipe_alokasi = 'pilih_santri')
  santri_list?: Array<{
    santri_id: string;
    santri_nama: string;
    santri_id_santri?: string;
  }>;
}

export interface CreateSubKategoriSantriMappingData {
  sub_kategori_id: string;
  tipe_alokasi: 'tidak_dialokasikan' | 'seluruh_binaan_mukim' | 'pilih_santri';
  deskripsi?: string;
  santri_ids?: string[]; // Hanya untuk tipe 'pilih_santri'
}

// ============================================
// SERVICE CLASS
// ============================================

export class MasterDataKeuanganService {
  // ============================================
  // PILAR LAYANAN
  // ============================================

  /**
   * Get semua pilar layanan
   */
  static async getPilarLayanan(aktifOnly: boolean = false): Promise<MasterPilarLayanan[]> {
    try {
      let query = supabase
        .from('master_pilar_layanan')
        .select('*')
        .order('urutan', { ascending: true })
        .order('nama', { ascending: true });

      if (aktifOnly) {
        query = query.eq('aktif', true);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting pilar layanan:', error);
      throw error;
    }
  }

  /**
   * Get pilar layanan by kode
   */
  static async getPilarLayananByKode(kode: string): Promise<MasterPilarLayanan | null> {
    try {
      const { data, error } = await supabase
        .from('master_pilar_layanan')
        .select('*')
        .eq('kode', kode)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting pilar layanan by kode:', error);
      throw error;
    }
  }

  /**
   * Create pilar layanan
   */
  static async createPilarLayanan(data: CreatePilarLayananData): Promise<MasterPilarLayanan> {
    try {
      const { data: pilar, error } = await supabase
        .from('master_pilar_layanan')
        .insert({
          kode: data.kode.toLowerCase().replace(/\s+/g, '_'),
          nama: data.nama,
          deskripsi: data.deskripsi || null,
          urutan: data.urutan || 0,
          warna_badge: data.warna_badge || null,
        })
        .select()
        .single();

      if (error) throw error;
      return pilar;
    } catch (error) {
      console.error('Error creating pilar layanan:', error);
      throw error;
    }
  }

  /**
   * Update pilar layanan
   */
  static async updatePilarLayanan(id: string, data: UpdatePilarLayananData): Promise<void> {
    try {
      const { error } = await supabase
        .from('master_pilar_layanan')
        .update({
          ...(data.nama && { nama: data.nama }),
          ...(data.deskripsi !== undefined && { deskripsi: data.deskripsi || null }),
          ...(data.urutan !== undefined && { urutan: data.urutan }),
          ...(data.warna_badge !== undefined && { warna_badge: data.warna_badge || null }),
          ...(data.aktif !== undefined && { aktif: data.aktif }),
        })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating pilar layanan:', error);
      throw error;
    }
  }

  /**
   * Delete pilar layanan
   */
  static async deletePilarLayanan(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('master_pilar_layanan')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting pilar layanan:', error);
      throw error;
    }
  }

  /**
   * Check pilar layanan usage
   */
  static async checkPilarLayananUsage(kode: string): Promise<{
    ledger_layanan_santri: number;
    rancangan_anggaran: number;
    kategori_pengeluaran: number;
    sub_kategori_pengeluaran: number;
  }> {
    try {
      // Check ledger_layanan_santri
      const { count: ledgerCount } = await supabase
        .from('ledger_layanan_santri')
        .select('*', { count: 'exact', head: true })
        .eq('pilar_layanan', kode);

      // Check kategori_pengeluaran
      // NOTE: rancangan_anggaran_layanan sudah dihapus, tidak perlu check lagi
      const { count: kategoriCount } = await supabase
        .from('master_kategori_pengeluaran')
        .select('*', { count: 'exact', head: true })
        .eq('pilar_layanan_kode', kode);

      // Check sub_kategori_pengeluaran
      const { count: subKategoriCount } = await supabase
        .from('master_sub_kategori_pengeluaran')
        .select('*', { count: 'exact', head: true })
        .eq('pilar_layanan_kode', kode);

      return {
        ledger_layanan_santri: ledgerCount || 0,
        rancangan_anggaran: 0, // Tabel sudah dihapus
        kategori_pengeluaran: kategoriCount || 0,
        sub_kategori_pengeluaran: subKategoriCount || 0,
      };
    } catch (error) {
      console.error('Error checking pilar layanan usage:', error);
      throw error;
    }
  }

  // ============================================
  // KATEGORI PENGELUARAN
  // ============================================

  /**
   * Get semua kategori pengeluaran
   */
  static async getKategoriPengeluaran(filters?: {
    jenis?: string;
    aktifOnly?: boolean;
  }): Promise<MasterKategoriPengeluaran[]> {
    try {
      let query = supabase
        .from('master_kategori_pengeluaran')
        .select(`
          *,
          pilar_layanan:master_pilar_layanan(*)
        `)
        .eq('ledger', 'UMUM')
        .order('urutan', { ascending: true })
        .order('nama', { ascending: true });

      if (filters?.jenis) {
        query = query.eq('jenis', filters.jenis);
      }

      if (filters?.aktifOnly) {
        query = query.eq('aktif', true);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(item => ({
        ...item,
        pilar_layanan: item.pilar_layanan || undefined,
      }));
    } catch (error) {
      console.error('Error getting kategori pengeluaran:', error);
      throw error;
    }
  }

  /**
   * Get kategori pengeluaran by ID
   */
  static async getKategoriPengeluaranById(id: string): Promise<MasterKategoriPengeluaran | null> {
    try {
      const { data, error } = await supabase
        .from('master_kategori_pengeluaran')
        .select(`
          *,
          pilar_layanan:master_pilar_layanan(*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return {
        ...data,
        pilar_layanan: data.pilar_layanan || undefined,
      };
    } catch (error) {
      console.error('Error getting kategori pengeluaran by id:', error);
      throw error;
    }
  }

  /**
   * Create kategori pengeluaran
   */
  static async createKategoriPengeluaran(
    data: CreateKategoriPengeluaranData
  ): Promise<MasterKategoriPengeluaran> {
    try {
      const { data: kategori, error } = await supabase
        .from('master_kategori_pengeluaran')
        .insert({
          nama: data.nama,
          jenis: data.jenis,
          ledger: 'UMUM',
          pilar_layanan_kode: data.pilar_layanan_kode || null,
          deskripsi: data.deskripsi || null,
          urutan: data.urutan || 0,
        })
        .select(`
          *,
          pilar_layanan:master_pilar_layanan(*)
        `)
        .single();

      if (error) throw error;

      return {
        ...kategori,
        pilar_layanan: kategori.pilar_layanan || undefined,
      };
    } catch (error) {
      console.error('Error creating kategori pengeluaran:', error);
      throw error;
    }
  }

  /**
   * Update kategori pengeluaran
   */
  static async updateKategoriPengeluaran(
    id: string,
    data: UpdateKategoriPengeluaranData
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('master_kategori_pengeluaran')
        .update({
          ...(data.nama && { nama: data.nama }),
          ...(data.pilar_layanan_kode !== undefined && {
            pilar_layanan_kode: data.pilar_layanan_kode || null,
          }),
          ...(data.deskripsi !== undefined && { deskripsi: data.deskripsi || null }),
          ...(data.urutan !== undefined && { urutan: data.urutan }),
          ...(data.aktif !== undefined && { aktif: data.aktif }),
        })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating kategori pengeluaran:', error);
      throw error;
    }
  }

  /**
   * Delete kategori pengeluaran
   */
  static async deleteKategoriPengeluaran(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('master_kategori_pengeluaran')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting kategori pengeluaran:', error);
      throw error;
    }
  }

  /**
   * Check kategori usage
   */
  static async checkKategoriUsage(id: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('keuangan')
        .select('*', { count: 'exact', head: true })
        .eq('kategori', id);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error checking kategori usage:', error);
      throw error;
    }
  }

  // ============================================
  // SUB KATEGORI PENGELUARAN
  // ============================================

  /**
   * Get sub kategori by kategori ID
   */
  static async getSubKategoriByKategori(
    kategoriId: string
  ): Promise<MasterSubKategoriPengeluaran[]> {
    try {
      const { data, error } = await supabase
        .from('master_sub_kategori_pengeluaran')
        .select(`
          *,
          pilar_layanan:master_pilar_layanan(*)
        `)
        .eq('kategori_id', kategoriId)
        .order('urutan', { ascending: true })
        .order('nama', { ascending: true });

      if (error) throw error;

      return (data || []).map(item => ({
        ...item,
        pilar_layanan: item.pilar_layanan || undefined,
      }));
    } catch (error) {
      console.error('Error getting sub kategori:', error);
      throw error;
    }
  }

  /**
   * Get sub kategori count per kategori
   */
  static async getSubKategoriCountByKategori(
    kategoriIds: string[]
  ): Promise<Record<string, number>> {
    try {
      if (kategoriIds.length === 0) return {};

      const { data, error } = await supabase
        .from('master_sub_kategori_pengeluaran')
        .select('kategori_id')
        .in('kategori_id', kategoriIds);

      if (error) throw error;

      // Count sub kategori per kategori
      const counts: Record<string, number> = {};
      kategoriIds.forEach(id => {
        counts[id] = 0;
      });

      (data || []).forEach(item => {
        if (counts[item.kategori_id] !== undefined) {
          counts[item.kategori_id] = (counts[item.kategori_id] || 0) + 1;
        }
      });

      return counts;
    } catch (error) {
      console.error('Error getting sub kategori count:', error);
      throw error;
    }
  }

  /**
   * Create sub kategori
   */
  static async createSubKategori(
    data: CreateSubKategoriPengeluaranData
  ): Promise<MasterSubKategoriPengeluaran> {
    try {
      const { data: subKategori, error } = await supabase
        .from('master_sub_kategori_pengeluaran')
        .insert({
          kategori_id: data.kategori_id,
          nama: data.nama,
          pilar_layanan_kode: data.pilar_layanan_kode || null,
          deskripsi: data.deskripsi || null,
          urutan: data.urutan || 0,
        })
        .select(`
          *,
          pilar_layanan:master_pilar_layanan(*)
        `)
        .single();

      if (error) throw error;

      return {
        ...subKategori,
        pilar_layanan: subKategori.pilar_layanan || undefined,
      };
    } catch (error) {
      console.error('Error creating sub kategori:', error);
      throw error;
    }
  }

  /**
   * Update sub kategori
   */
  static async updateSubKategori(
    id: string,
    data: UpdateSubKategoriPengeluaranData
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('master_sub_kategori_pengeluaran')
        .update({
          ...(data.nama && { nama: data.nama }),
          ...(data.pilar_layanan_kode !== undefined && {
            pilar_layanan_kode: data.pilar_layanan_kode || null,
          }),
          ...(data.deskripsi !== undefined && { deskripsi: data.deskripsi || null }),
          ...(data.urutan !== undefined && { urutan: data.urutan }),
          ...(data.aktif !== undefined && { aktif: data.aktif }),
        })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating sub kategori:', error);
      throw error;
    }
  }

  /**
   * Delete sub kategori
   */
  static async deleteSubKategori(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('master_sub_kategori_pengeluaran')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting sub kategori:', error);
      throw error;
    }
  }

  // ============================================
  // MAPPING SANTRI - KATEGORI
  // ============================================

  /**
   * Get mapping santri untuk kategori
   */
  static async getSantriMappingByKategori(
    kategoriId: string
  ): Promise<KategoriSantriMapping | null> {
    try {
      const { data, error } = await supabase
        .from('master_kategori_santri_mapping')
        .select('*')
        .eq('kategori_id', kategoriId)
        .eq('aktif', true)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) return null;

      // Load santri list jika tipe = 'pilih_santri'
      if (data.tipe_alokasi === 'pilih_santri') {
        const santriList = await this.getKategoriSantriListByMapping(data.id);
        return {
          ...data,
          santri_list: santriList,
        };
      }

      return data;
    } catch (error) {
      console.error('Error getting kategori santri mapping:', error);
      throw error;
    }
  }

  /**
   * Get mapping santri untuk kategori (by nama)
   */
  static async getSantriMappingByKategoriNama(
    namaKategori: string
  ): Promise<KategoriSantriMapping | null> {
    try {
      // Cari kategori dulu
      const { data: kategori, error: kategoriError } = await supabase
        .from('master_kategori_pengeluaran')
        .select('id')
        .eq('nama', namaKategori)
        .eq('ledger', 'UMUM')
        .single();

      if (kategoriError || !kategori) return null;

      return this.getSantriMappingByKategori(kategori.id);
    } catch (error) {
      console.error('Error getting kategori santri mapping by nama:', error);
      throw error;
    }
  }

  /**
   * Save mapping santri untuk kategori
   */
  static async saveKategoriSantriMapping(
    data: CreateKategoriSantriMappingData
  ): Promise<KategoriSantriMapping> {
    try {
      // Nonaktifkan mapping lama jika ada
      await supabase
        .from('master_kategori_santri_mapping')
        .update({ aktif: false })
        .eq('kategori_id', data.kategori_id)
        .eq('aktif', true);

      // Insert mapping baru
      const { data: mapping, error: mappingError } = await supabase
        .from('master_kategori_santri_mapping')
        .insert({
          kategori_id: data.kategori_id,
          tipe_alokasi: data.tipe_alokasi,
          deskripsi: data.deskripsi || null,
          aktif: true,
        })
        .select()
        .single();

      if (mappingError) throw mappingError;

      // Jika tipe = 'pilih_santri', insert santri list
      if (data.tipe_alokasi === 'pilih_santri' && data.santri_ids && data.santri_ids.length > 0) {
        const santriList = data.santri_ids.map(santri_id => ({
          mapping_id: mapping.id,
          santri_id,
        }));

        const { error: listError } = await supabase
          .from('master_kategori_santri_list')
          .insert(santriList);

        if (listError) throw listError;
      }

      return this.getSantriMappingByKategori(data.kategori_id) as Promise<KategoriSantriMapping>;
    } catch (error) {
      console.error('Error saving kategori santri mapping:', error);
      throw error;
    }
  }

  /**
   * Get santri list untuk mapping kategori
   */
  static async getKategoriSantriListByMapping(
    mappingId: string
  ): Promise<Array<{
    santri_id: string;
    santri_nama: string;
    santri_id_santri?: string;
  }>> {
    try {
      const { data, error } = await supabase
        .from('master_kategori_santri_list')
        .select(`
          santri_id,
          santri:santri_id(id, nama_lengkap, id_santri)
        `)
        .eq('mapping_id', mappingId);

      if (error) throw error;

      return (data || []).map(item => ({
        santri_id: item.santri_id,
        santri_nama: (item.santri as any)?.nama_lengkap || '',
        santri_id_santri: (item.santri as any)?.id_santri || undefined,
      }));
    } catch (error) {
      console.error('Error getting kategori santri list:', error);
      throw error;
    }
  }

  // ============================================
  // MAPPING SANTRI - SUB KATEGORI
  // ============================================

  /**
   * Get mapping santri untuk sub kategori
   */
  static async getSantriMappingBySubKategori(
    subKategoriId: string
  ): Promise<SubKategoriSantriMapping | null> {
    try {
      const { data, error } = await supabase
        .from('master_sub_kategori_santri_mapping')
        .select('*')
        .eq('sub_kategori_id', subKategoriId)
        .eq('aktif', true)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) return null;

      // Load santri list jika tipe = 'pilih_santri'
      if (data.tipe_alokasi === 'pilih_santri') {
        const santriList = await this.getSubKategoriSantriListByMapping(data.id);
        return {
          ...data,
          santri_list: santriList,
        };
      }

      return data;
    } catch (error) {
      console.error('Error getting sub kategori santri mapping:', error);
      throw error;
    }
  }

  /**
   * Get mapping santri untuk sub kategori (by nama)
   */
  static async getSantriMappingBySubKategoriNama(
    namaSubKategori: string
  ): Promise<SubKategoriSantriMapping | null> {
    try {
      // Cari sub kategori dulu
      const { data: subKategori, error: subKategoriError } = await supabase
        .from('master_sub_kategori_pengeluaran')
        .select('id')
        .eq('nama', namaSubKategori)
        .single();

      if (subKategoriError || !subKategori) return null;

      return this.getSantriMappingBySubKategori(subKategori.id);
    } catch (error) {
      console.error('Error getting sub kategori santri mapping by nama:', error);
      throw error;
    }
  }

  /**
   * Save mapping santri untuk sub kategori
   */
  static async saveSubKategoriSantriMapping(
    data: CreateSubKategoriSantriMappingData
  ): Promise<SubKategoriSantriMapping> {
    try {
      // Nonaktifkan mapping lama jika ada
      await supabase
        .from('master_sub_kategori_santri_mapping')
        .update({ aktif: false })
        .eq('sub_kategori_id', data.sub_kategori_id)
        .eq('aktif', true);

      // Insert mapping baru
      const { data: mapping, error: mappingError } = await supabase
        .from('master_sub_kategori_santri_mapping')
        .insert({
          sub_kategori_id: data.sub_kategori_id,
          tipe_alokasi: data.tipe_alokasi,
          deskripsi: data.deskripsi || null,
          aktif: true,
        })
        .select()
        .single();

      if (mappingError) throw mappingError;

      // Jika tipe = 'pilih_santri', insert santri list
      if (data.tipe_alokasi === 'pilih_santri' && data.santri_ids && data.santri_ids.length > 0) {
        const santriList = data.santri_ids.map(santri_id => ({
          mapping_id: mapping.id,
          santri_id,
        }));

        const { error: listError } = await supabase
          .from('master_sub_kategori_santri_list')
          .insert(santriList);

        if (listError) throw listError;
      }

      return this.getSantriMappingBySubKategori(
        data.sub_kategori_id
      ) as Promise<SubKategoriSantriMapping>;
    } catch (error) {
      console.error('Error saving sub kategori santri mapping:', error);
      throw error;
    }
  }

  /**
   * Get santri list untuk mapping sub kategori
   */
  static async getSubKategoriSantriListByMapping(
    mappingId: string
  ): Promise<Array<{
    santri_id: string;
    santri_nama: string;
    santri_id_santri?: string;
  }>> {
    try {
      const { data, error } = await supabase
        .from('master_sub_kategori_santri_list')
        .select(`
          santri_id,
          santri:santri_id(id, nama_lengkap, id_santri)
        `)
        .eq('mapping_id', mappingId);

      if (error) throw error;

      return (data || []).map(item => ({
        santri_id: item.santri_id,
        santri_nama: (item.santri as any)?.nama_lengkap || '',
        santri_id_santri: (item.santri as any)?.id_santri || undefined,
      }));
    } catch (error) {
      console.error('Error getting sub kategori santri list:', error);
      throw error;
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Get semua santri Binaan Mukim aktif
   */
  static async getAllBinaanMukimAktif(): Promise<Array<{
    id: string;
    nama_lengkap: string;
    id_santri?: string;
  }>> {
    try {
      const { data, error } = await supabase
        .from('santri')
        .select('id, nama_lengkap, id_santri')
        .eq('kategori', 'Binaan Mukim')
        .eq('status', 'Aktif')
        .order('nama_lengkap', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting all binaan mukim aktif:', error);
      throw error;
    }
  }

  /**
   * Search santri untuk mapping
   */
  static async searchSantriForMapping(filters?: {
    search?: string;
    kategori?: string;
    status?: string;
  }): Promise<Array<{
    id: string;
    nama_lengkap: string;
    id_santri?: string;
    kategori: string;
    status: string;
  }>> {
    try {
      let query = supabase
        .from('santri')
        .select('id, nama_lengkap, id_santri, kategori, status')
        .order('nama_lengkap', { ascending: true });

      if (filters?.search) {
        query = query.or(
          `nama_lengkap.ilike.%${filters.search}%,id_santri.ilike.%${filters.search}%`
        );
      }

      if (filters?.kategori && filters.kategori !== 'Semua') {
        query = query.eq('kategori', filters.kategori);
      }

      if (filters?.status && filters.status !== 'Semua') {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(item => ({
        id: item.id,
        nama_lengkap: item.nama_lengkap,
        id_santri: item.id_santri || undefined,
        kategori: item.kategori || '',
        status: item.status || '',
      }));
    } catch (error) {
      console.error('Error searching santri for mapping:', error);
      throw error;
    }
  }

  /**
   * Get mapping dengan prioritas (untuk form pengeluaran)
   * Prioritas: Sub Kategori → Kategori
   */
  static async getMappingWithPriority(
    kategori: string,
    subKategori?: string
  ): Promise<{
    mapping: KategoriSantriMapping | SubKategoriSantriMapping | null;
    source: 'kategori' | 'sub_kategori' | null;
  }> {
    try {
      // 1. Cek mapping di sub kategori dulu (prioritas tertinggi)
      if (subKategori) {
        const subMapping = await this.getSantriMappingBySubKategoriNama(subKategori);
        if (subMapping && subMapping.aktif) {
          return {
            mapping: subMapping,
            source: 'sub_kategori',
          };
        }
      }

      // 2. Jika tidak ada, cek mapping di kategori
      const kategoriMapping = await this.getSantriMappingByKategoriNama(kategori);
      if (kategoriMapping && kategoriMapping.aktif) {
        return {
          mapping: kategoriMapping,
          source: 'kategori',
        };
      }

      // 3. Jika tidak ada, tidak ada mapping
      return {
        mapping: null,
        source: null,
      };
    } catch (error) {
      console.error('Error getting mapping with priority:', error);
      throw error;
    }
  }
}

