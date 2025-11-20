import { supabase } from '../integrations/supabase/client';

export interface AkunKas {
  id: string;
  nama: string;
  kode: string;
  tipe: 'Kas' | 'Bank' | 'Tabungan';
  nomor_rekening?: string;
  nama_bank?: string;
  atas_nama?: string;
  saldo_awal: number;
  saldo_saat_ini: number;
  tanggal_buka: string;
  status: 'aktif' | 'ditutup' | 'suspended';
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAkunKasData {
  nama: string;
  kode: string;
  tipe: 'Kas' | 'Bank' | 'Tabungan';
  nomor_rekening?: string;
  nama_bank?: string;
  atas_nama?: string;
  saldo_awal?: number;
  is_default?: boolean;
}

export interface UpdateAkunKasData {
  nama?: string;
  kode?: string;
  tipe?: 'Kas' | 'Bank' | 'Tabungan';
  nomor_rekening?: string;
  nama_bank?: string;
  atas_nama?: string;
  saldo_awal?: number;
  status?: 'aktif' | 'ditutup' | 'suspended';
  is_default?: boolean;
}

export class AkunKasService {
  /**
   * Get all cash accounts
   */
  static async getAll(): Promise<AkunKas[]> {
    const { data, error } = await supabase
      .from('akun_kas')
      .select('*')
      .neq('managed_by', 'tabungan')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get active cash accounts only - FILTERED for 3 main accounts
   */
  static async getActive(): Promise<AkunKas[]> {
    const { data, error } = await supabase
      .from('akun_kas')
      .select('*')
      .eq('status', 'aktif')
      .neq('managed_by', 'tabungan')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get all active cash accounts (including old structure) - for admin purposes
   */
  static async getAllActive(): Promise<AkunKas[]> {
    const { data, error } = await supabase
      .from('akun_kas')
      .select('*')
      .eq('status', 'aktif')
      .neq('managed_by', 'tabungan')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get cash account by ID
   */
  static async getById(id: string): Promise<AkunKas | null> {
    const { data, error } = await supabase
      .from('akun_kas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get default cash account (Bank Operasional - new structure)
   */
  static async getDefault(): Promise<AkunKas | null> {
    const { data, error } = await supabase
      .from('akun_kas')
      .select('*')
      .eq('is_default', true)
      .eq('status', 'aktif')
      .single();

    if (error && error.code !== 'PGRST116') {
      // Fallback to Bank Operasional if no default set
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('akun_kas')
        .select('*')
        .eq('nama', 'Bank Operasional')
        .eq('status', 'aktif')
        .single();
      
      if (fallbackError && fallbackError.code !== 'PGRST116') {
        throw new Error(`Gagal mendapatkan akun kas default: ${fallbackError.message}`);
      }
      
      return fallbackData;
    }

    return data;
  }

  /**
   * Get main cash account (Kas Utama) - alias for getDefault
   */
  static async getMain(): Promise<AkunKas | null> {
    return this.getDefault();
  }

  /**
   * Check if deleted account exists with same name/kode
   */
  static async checkDeletedAccount(nama: string, kode: string): Promise<{
    exists: boolean;
    account?: any;
  }> {
    try {
      const { data: existingDeleted, error: checkError } = await supabase
        .rpc('check_deleted_account_exists', {
          p_nama: nama,
          p_kode: kode
        });

      if (checkError) {
        // Fallback: Check directly from table if function doesn't exist
        if (checkError.message?.includes('Could not find the function')) {
          console.warn('Migration not applied yet, using fallback method');
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('akun_kas')
            .select('id, nama, kode, status')
            .eq('nama', nama)
            .eq('kode', kode)
            .in('status', ['ditutup', 'suspended']);

          if (fallbackError) throw fallbackError;

          return {
            exists: fallbackData && fallbackData.length > 0,
            account: fallbackData?.[0] ? {
              account_id: fallbackData[0].id,
              account_name: fallbackData[0].nama,
              account_kode: fallbackData[0].kode,
              account_status: fallbackData[0].status
            } : null
          };
        }
        throw checkError;
      }

      return {
        exists: existingDeleted && existingDeleted.length > 0,
        account: existingDeleted?.[0] || null
      };
    } catch (error) {
      console.error('Error checking deleted account:', error);
      return { exists: false, account: null };
    }
  }

  /**
   * Create new cash account
   */
  static async create(data: CreateAkunKasData): Promise<AkunKas> {
    // Check if deleted account with same name/kode exists
    try {
      const { data: existingDeleted, error: checkError } = await supabase
        .rpc('check_deleted_account_exists', {
          p_nama: data.nama,
          p_kode: data.kode
        });

      if (checkError) {
        // Fallback: Check directly from table if function doesn't exist
        if (checkError.message?.includes('Could not find the function')) {
          console.warn('Migration not applied yet, using fallback method for create');
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('akun_kas')
            .select('id, nama, kode, status')
            .eq('nama', data.nama)
            .eq('kode', data.kode)
            .in('status', ['ditutup', 'suspended']);

          if (fallbackError) throw fallbackError;

          // If deleted account exists, restore it
          if (fallbackData && fallbackData.length > 0) {
            const deletedAccount = fallbackData[0];
            
            // If setting as default, unset other defaults first
            if (data.is_default) {
              await supabase
                .from('akun_kas')
                .update({ is_default: false })
                .eq('is_default', true);
            }

            // Restore the deleted account with new data
            const { data: restoredAccount, error: restoreError } = await supabase
              .from('akun_kas')
              .update({
                nama: data.nama,
                kode: data.kode,
                tipe: data.tipe,
                nomor_rekening: data.nomor_rekening,
                nama_bank: data.nama_bank,
                atas_nama: data.atas_nama,
                saldo_awal: data.saldo_awal || 0,
                saldo_saat_ini: data.saldo_awal || 0,
                is_default: data.is_default || false,
                status: 'aktif',
                updated_at: new Date().toISOString()
              })
              .eq('id', deletedAccount.id)
              .select()
              .single();

            if (restoreError) throw restoreError;
            return restoredAccount;
          }
        } else {
          throw checkError;
        }
      } else {
        // If deleted account exists, restore it instead of creating new
        if (existingDeleted && existingDeleted.length > 0) {
          const deletedAccount = existingDeleted[0];
          
          // If setting as default, unset other defaults first
          if (data.is_default) {
            await supabase
              .from('akun_kas')
              .update({ is_default: false })
              .eq('is_default', true);
          }

          // Restore the deleted account with new data
          const { data: restoredAccount, error: restoreError } = await supabase
            .rpc('restore_deleted_account', {
              p_account_id: deletedAccount.account_id,
              p_new_data: {
                nama: data.nama,
                kode: data.kode,
                tipe: data.tipe,
                nomor_rekening: data.nomor_rekening,
                nama_bank: data.nama_bank,
                atas_nama: data.atas_nama,
                saldo_awal: data.saldo_awal || 0,
                is_default: data.is_default || false
              }
            });

          if (restoreError) throw restoreError;
          return restoredAccount;
        }
      }
    } catch (error) {
      console.error('Error checking for deleted account:', error);
      // Continue with normal creation if check fails
    }

    // If setting as default, unset other defaults first
    if (data.is_default) {
      await supabase
        .from('akun_kas')
        .update({ is_default: false })
        .eq('is_default', true);
    }

    const { data: result, error } = await supabase
      .from('akun_kas')
      .insert([{
        ...data,
        saldo_awal: data.saldo_awal || 0,
        saldo_saat_ini: data.saldo_awal || 0, // Set initial current balance same as initial balance
        is_default: data.is_default || false,
      }])
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  /**
   * Update cash account
   */
  static async update(id: string, data: UpdateAkunKasData): Promise<AkunKas> {
    // If setting as default, unset other defaults first
    if (data.is_default) {
      await supabase
        .from('akun_kas')
        .update({ is_default: false })
        .eq('is_default', true);
    }

    const { data: result, error } = await supabase
      .from('akun_kas')
      .update({
        ...data,
        // Don't automatically update saldo_saat_ini when saldo_awal changes
        // saldo_saat_ini should be calculated based on transactions
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    // Recalculate saldo_saat_ini after updating akun kas
    try {
      const { error: recalculateError } = await supabase.rpc('ensure_akun_kas_saldo_correct');
      if (recalculateError) {
        console.warn('Warning recalculating saldo after akun kas update:', recalculateError);
      }
    } catch (recalculateErr) {
      console.warn('Error recalculating saldo after akun kas update:', recalculateErr);
    }
    
    return result;
  }

  /**
   * Delete cash account (soft delete by setting status to ditutup)
   */
  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('akun_kas')
      .update({ status: 'ditutup' })
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Get cash accounts with current balances
   */
  static async getWithBalances(): Promise<AkunKas[]> {
    const { data, error } = await supabase
      .from('akun_kas')
      .select(`
        *,
        saldo_saat_ini
      `)
      .eq('status', 'aktif')
      .neq('managed_by', 'tabungan')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get total balance across main 3 accounts only (unified view)
   */
  static async getTotalBalance(): Promise<number> {
    const { data, error } = await supabase
      .from('akun_kas')
      .select('saldo_saat_ini')
      .eq('status', 'aktif')
      .neq('managed_by', 'tabungan');

    if (error) throw error;
    
    const total = data?.reduce((sum, account) => sum + (account.saldo_saat_ini || 0), 0) || 0;
    return total;
  }

  /**
   * Get unified financial summary (Operasional + Pembangunan, exclude Tabungan Santri)
   */
  static async getUnifiedBalance(): Promise<{
    totalOperational: number;
    totalTabunganSantri: number;
    grandTotal: number;
  }> {
    const { data, error } = await supabase
      .from('akun_kas')
      .select('nama, saldo_saat_ini')
      .eq('status', 'aktif')
      .neq('managed_by', 'tabungan');

    if (error) throw error;
    
    const operationalAccounts = ['Bank Operasional', 'Bank Pembangunan'];
    const totalOperational = data
      ?.filter(account => operationalAccounts.includes(account.nama))
      .reduce((sum, account) => sum + (account.saldo_saat_ini || 0), 0) || 0;
    
    const totalTabunganSantri = 0;
    
    const grandTotal = totalOperational + totalTabunganSantri;
    
    return {
      totalOperational,
      totalTabunganSantri,
      grandTotal
    };
  }

  /**
   * Get total balance across all accounts (including inactive)
   */
  static async getTotalBalanceAll(): Promise<number> {
    const { data, error } = await supabase
      .from('akun_kas')
      .select('saldo_saat_ini');

    if (error) throw error;
    
    const total = data?.reduce((sum, account) => sum + (account.saldo_saat_ini || 0), 0) || 0;
    return total;
  }

  /**
   * Get balance by account type (ACTIVE accounts only)
   */
  static async getBalanceByType(): Promise<{ [key: string]: number }> {
    const { data, error } = await supabase
      .from('akun_kas')
      .select('tipe, saldo_saat_ini')
      .eq('status', 'aktif')
      .neq('managed_by', 'tabungan');

    if (error) throw error;

    const balances: { [key: string]: number } = {};
    data?.forEach(account => {
      balances[account.tipe] = (balances[account.tipe] || 0) + (account.saldo_saat_ini || 0);
    });

    return balances;
  }

  /**
   * Check if account name/kode already exists (for active accounts)
   */
  static async checkDuplicateNameKode(nama: string, kode: string, excludeId?: string): Promise<{ namaExists: boolean; kodeExists: boolean }> {
    let query = supabase
      .from('akun_kas')
      .select('id, nama, kode')
      .eq('status', 'aktif')
      .or(`nama.eq.${nama},kode.eq.${kode}`);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) throw error;

    const namaExists = data?.some(account => account.nama === nama) || false;
    const kodeExists = data?.some(account => account.kode === kode) || false;

    return { namaExists, kodeExists };
  }

  /**
   * Set an account as default. Ensures only one default at a time.
   */
  static async setDefault(accountId: string): Promise<void> {
    // Unset any existing default
    const { error: unsetError } = await supabase
      .from('akun_kas')
      .update({ is_default: false })
      .eq('is_default', true);

    if (unsetError) throw unsetError;

    // Set selected account as default
    const { error: setError } = await supabase
      .from('akun_kas')
      .update({ is_default: true, status: 'aktif' })
      .eq('id', accountId);

    if (setError) throw setError;
  }
  /**
   * Validate cash account data
   */
  static validate(data: CreateAkunKasData | UpdateAkunKasData): string[] {
    const errors: string[] = [];

    if ('nama' in data && (!data.nama || data.nama.trim().length === 0)) {
      errors.push('Nama akun harus diisi');
    }

    if ('kode' in data && (!data.kode || data.kode.trim().length === 0)) {
      errors.push('Kode akun harus diisi');
    }

    if ('tipe' in data && !['Kas', 'Bank', 'Tabungan'].includes(data.tipe)) {
      errors.push('Tipe akun harus salah satu dari: Kas, Bank, Tabungan');
    }

    if ('saldo_awal' in data && data.saldo_awal !== undefined && data.saldo_awal < 0) {
      errors.push('Saldo awal tidak boleh negatif');
    }

    return errors;
  }
}
