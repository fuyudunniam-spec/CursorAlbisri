import { supabase } from '@/integrations/supabase/client';

export interface SantriAccountInfo {
  santriId: string;
  idSantri: string;
  namaLengkap: string;
  email: string;
  statusAkun: 'Aktif' | 'Belum Dibuat';
  lastSignIn?: string;
  createdAt?: string;
  userId?: string;
}

/**
 * Create auth account for santri (admin only)
 */
export async function createSantriAccount(
  idSantri: string,
  initialPassword: string
): Promise<{ userId: string; email: string }> {
  // Get santri data
  const { data: santri, error: santriError } = await supabase
    .from('santri')
    .select('id, nama_lengkap, user_id')
    .eq('id_santri', idSantri.toUpperCase())
    .single();

  if (santriError || !santri) {
    throw new Error('Santri tidak ditemukan');
  }

  // Check if account already exists
  if (santri.user_id) {
    throw new Error('Akun untuk santri ini sudah ada');
  }

  // Call Edge Function to create account
  const { data, error } = await supabase.functions.invoke('santri-auth-admin', {
    body: {
      action: 'create_account',
      id_santri: idSantri.toUpperCase(),
      password: initialPassword,
      nama_lengkap: santri.nama_lengkap,
    },
  });

  if (error) throw error;
  if (data.error) throw new Error(data.error);

  return { userId: data.userId, email: data.email };
}

/**
 * Reset password untuk santri (admin only)
 */
export async function resetSantriPassword(
  userId: string,
  newPassword: string
): Promise<void> {
  const { data, error } = await supabase.functions.invoke('santri-auth-admin', {
    body: {
      action: 'reset_password',
      userId,
      newPassword,
    },
  });

  if (error) throw error;
  if (data.error) throw new Error(data.error);
}

/**
 * Get all santri dengan status akun
 */
export async function getSantriAccounts(): Promise<SantriAccountInfo[]> {
  const { data, error } = await supabase
    .from('v_santri_account_status')
    .select('*')
    .order('id_santri');

  if (error) throw error;

  return data.map(item => ({
    santriId: item.id,
    idSantri: item.id_santri,
    namaLengkap: item.nama_lengkap,
    email: item.auth_email || `${item.id_santri}@pondoksukses.local`,
    statusAkun: item.status_akun,
    lastSignIn: item.last_sign_in_at,
    createdAt: item.akun_dibuat_pada,
    userId: item.user_id,
  }));
}

/**
 * Delete santri account (admin only)
 */
export async function deleteSantriAccount(userId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('santri-auth-admin', {
    body: {
      action: 'delete_account',
      userId,
    },
  });

  if (error) throw error;
  if (data.error) throw new Error(data.error);
}

/**
 * Santri change their own password
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  // Get current session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Tidak ada session aktif');

  // Re-authenticate with current password
  const { error: reAuthError } = await supabase.auth.signInWithPassword({
    email: session.user.email!,
    password: currentPassword,
  });

  if (reAuthError) {
    throw new Error('Password lama salah');
  }

  // Update password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) throw updateError;
}

