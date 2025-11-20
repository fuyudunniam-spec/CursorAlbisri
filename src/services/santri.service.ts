import { supabase } from '../integrations/supabase/client';

export interface Santri {
  id: string;
  nama_lengkap: string;
  nisn: string;
  id_santri: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSantriData {
  nama_lengkap: string;
  nisn: string;
  status?: string;
}

export interface UpdateSantriData {
  nama_lengkap?: string;
  nisn?: string;
  status?: string;
}

export class SantriService {
  /**
   * Get all active santri
   */
  static async getActive(): Promise<Santri[]> {
    const { data, error } = await supabase
      .from('santri')
      .select('id, nama_lengkap, nisn, id_santri, status, created_at, updated_at')
      .eq('status', 'Aktif')
      .order('nama_lengkap');

    if (error) throw error;
    return data || [];
  }

  /**
   * Get all santri
   */
  static async getAll(): Promise<Santri[]> {
    const { data, error } = await supabase
      .from('santri')
      .select('id, nama_lengkap, nisn, id_santri, status, created_at, updated_at')
      .order('nama_lengkap');

    if (error) throw error;
    return data || [];
  }

  /**
   * Get santri by ID
   */
  static async getById(id: string): Promise<Santri | null> {
    const { data, error } = await supabase
      .from('santri')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Create new santri
   */
  static async create(data: CreateSantriData): Promise<Santri> {
    const { data: result, error } = await supabase
      .from('santri')
      .insert([{
        ...data,
        status: data.status || 'Aktif',
      }])
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  /**
   * Update santri
   */
  static async update(id: string, data: UpdateSantriData): Promise<Santri> {
    const { data: result, error } = await supabase
      .from('santri')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  /**
   * Delete santri
   */
  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('santri')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Search santri by name or NISN
   */
  static async search(query: string): Promise<Santri[]> {
    const { data, error } = await supabase
      .from('santri')
      .select('*')
      .or(`nama_lengkap.ilike.%${query}%,nisn.ilike.%${query}%`)
      .eq('status', 'Aktif')
      .order('nama_lengkap');

    if (error) throw error;
    return data || [];
  }
}
