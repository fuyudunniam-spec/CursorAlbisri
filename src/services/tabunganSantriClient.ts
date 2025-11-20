import { supabase } from '@/integrations/supabase/client';

export async function getSaldoDanRingkas(santriId: string) {
  const { data: tx, error } = await supabase
    .from('santri_tabungan')
    .select('jenis, nominal')
    .eq('santri_id', santriId);
  if (error) throw error;
  const saldo = (tx || []).reduce((acc: number, t: any) => acc + (t.jenis === 'Setoran' ? Number(t.nominal) : -Number(t.nominal)), 0);
  return { saldo };
}

export async function listTransaksi(santriId: string, page = 1, pageSize = 20) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return await supabase
    .from('santri_tabungan')
    .select('*')
    .eq('santri_id', santriId)
    .order('tanggal', { ascending: false })
    .range(from, to);
}

export async function ajukanPenarikan(santriId: string, nominal: number, catatan?: string) {
  const { data, error } = await supabase
    .from('tabungan_withdraw_requests')
    .insert({ santri_id: santriId, nominal, catatan_santri: catatan })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listPermohonanSaya(santriId: string) {
  const { data, error } = await supabase
    .from('tabungan_withdraw_requests')
    .select('*')
    .eq('santri_id', santriId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function listPermohonanAdmin(status?: string, query?: string) {
  let q = supabase
    .from('tabungan_withdraw_requests')
    .select('id, santri_id, nominal, status, catatan_santri, alasan_admin, created_at, approved_at, approved_by, santri:santri(id_santri, nama_lengkap)')
    .order('created_at', { ascending: false });
  if (status && status !== 'all') q = q.eq('status', status);
  if (query) q = q.ilike('santri.nama_lengkap', `%${query}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function approvePermohonan(id: string, ok: boolean, reason?: string) {
  const { data, error } = await supabase.rpc('approve_withdraw_request', {
    p_id: id,
    p_approved: ok,
    p_reason: reason || null,
  });
  if (error) throw error;
  return data;
}


