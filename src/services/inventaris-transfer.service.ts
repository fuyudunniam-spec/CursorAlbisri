/**
 * Transfer Inventaris Yayasan Service
 * 
 * Handles inventory transfers from yayasan to various destinations with:
 * - Stock validation and reduction
 * - Approval workflow for koperasi transfers
 * - Profit sharing calculation for damaged goods
 * - Integration with keuangan system
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  Transfer,
  TransferDestination,
  TransferStatus,
  ItemCondition,
  CreateTransferDTO,
  ApprovalData,
  ProfitSplit,
  TransferFilters,
  PaginatedTransfers,
  TransferWithItem,
  BankItemDistribusi
} from "@/types/transfer.types";

// ============================================================================
// Error Classes
// ============================================================================

export class TransferValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransferValidationError';
  }
}

export class TransferStockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransferStockError';
  }
}

export class TransferApprovalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransferApprovalError';
  }
}

// ============================================================================
// Core Transfer Functions
// ============================================================================

/**
 * Create a new transfer from yayasan inventaris to a destination
 * 
 * Validates stock availability, reduces inventaris stock, and creates transfer record.
 * For koperasi transfers, status is set to 'pending' requiring approval.
 * For other destinations, status is set to 'completed' immediately.
 * 
 * Requirements: AC-1.4, AC-1.5, AC-1.6, AC-2.2
 * 
 * @param data - Transfer creation data
 * @returns Created transfer record
 * @throws TransferValidationError if validation fails
 * @throws TransferStockError if insufficient stock
 */
export async function createTransfer(
  data: CreateTransferDTO
): Promise<Transfer> {
  // Validate input
  if (!data.item_id || !data.jumlah || !data.tujuan) {
    throw new TransferValidationError('Item ID, jumlah, dan tujuan harus diisi');
  }

  if (data.jumlah <= 0) {
    throw new TransferValidationError('Jumlah transfer harus lebih besar dari 0');
  }

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new TransferValidationError('User tidak terautentikasi');
  }

  // Validate stock availability
  const { data: item, error: itemError } = await supabase
    .from('inventaris')
    .select('id, nama_barang, jumlah, harga_perolehan')
    .eq('id', data.item_id)
    .single();

  if (itemError || !item) {
    throw new TransferValidationError('Item tidak ditemukan');
  }

  const availableStock = item.jumlah || 0;
  if (data.jumlah > availableStock) {
    throw new TransferStockError(
      `Stok tidak mencukupi. Tersedia: ${availableStock}, Diminta: ${data.jumlah}`
    );
  }

  // For koperasi transfers: Create pengajuan_item_yayasan (NO stock reduction)
  // Stock will only be reduced when admin koperasi approves the pengajuan
  if (data.tujuan === 'koperasi') {
    const nilaiPerolehan = item.harga_perolehan || 0;
    const usulanHpp = nilaiPerolehan; // Default usulan HPP = nilai perolehan

    // Create pengajuan_item_yayasan
    // Note: catatan field might not exist in table, so we don't include it
    const pengajuanData: any = {
      inventaris_item_id: data.item_id,
      nama: item.nama_barang,
      qty: data.jumlah,
      nilai_perolehan: nilaiPerolehan,
      usulan_hpp: usulanHpp,
      status: 'pending_koperasi',
      created_by: user.id,
    };

    const { data: pengajuan, error: pengajuanError } = await supabase
      .from('pengajuan_item_yayasan')
      .insert(pengajuanData)
      .select('*')
      .single();

    if (pengajuanError) {
      throw new TransferValidationError('Gagal membuat pengajuan: ' + pengajuanError.message);
    }

    // Return a transfer-like object for consistency
    return {
      id: pengajuan.id,
      item_id: data.item_id,
      item_name: item.nama_barang,
      jumlah: data.jumlah,
      tujuan: 'koperasi' as TransferDestination,
      status: 'pending' as TransferStatus,
      created_by: user.id,
      created_at: pengajuan.created_at,
      hpp_yayasan: nilaiPerolehan,
      catatan: data.catatan || null,
    } as Transfer;
  }

  // For non-koperasi destinations: Reduce stock immediately and create transfer_inventaris
  const newStock = availableStock - data.jumlah;
  const { error: updateError } = await supabase
    .from('inventaris')
    .update({ jumlah: newStock })
    .eq('id', data.item_id);

  if (updateError) {
    throw new TransferStockError('Gagal mengurangi stok: ' + updateError.message);
  }

  // Create transfer record
  const transferData = {
    item_id: data.item_id,
    jumlah: data.jumlah,
    tujuan: data.tujuan,
    status: 'completed' as TransferStatus,
    created_by: user.id,
    hpp_yayasan: item.harga_perolehan || null,
    catatan: data.catatan || null
  };

  const { data: transfer, error: transferError } = await supabase
    .from('transfer_inventaris')
    .insert(transferData)
    .select('*')
    .single();

  if (transferError) {
    // Rollback stock reduction
    await supabase
      .from('inventaris')
      .update({ jumlah: availableStock })
      .eq('id', data.item_id);
    
    throw new Error('Gagal membuat transfer: ' + transferError.message);
  }

  // If destination is distribusi, create bank item
  if (data.tujuan === 'distribusi' && transfer) {
    await createBankItemDistribusi(transfer.id, data.item_id, data.jumlah);
  }

  return {
    ...transfer,
    item_name: item.nama_barang,
    tujuan: transfer.tujuan as TransferDestination,
    status: transfer.status as TransferStatus
  } as Transfer;
}

/**
 * Calculate profit sharing split based on item condition
 * 
 * For good condition items: 100% to yayasan (koperasi only adds minimal markup)
 * For damaged items: 70% to yayasan, 30% to koperasi
 * 
 * Requirements: AC-2.6, AC-2A.4
 * 
 * @param saleAmount - Total sale amount
 * @param condition - Item condition (baik/rusak)
 * @returns Profit split breakdown
 */
export function calculateProfitSharing(
  saleAmount: number,
  condition: ItemCondition
): ProfitSplit {
  if (condition === 'baik') {
    // For good condition: 100% to yayasan
    return {
      total_sale: saleAmount,
      yayasan_share: saleAmount,
      koperasi_share: 0,
      yayasan_percentage: 100,
      koperasi_percentage: 0
    };
  } else {
    // For damaged condition: 70% yayasan, 30% koperasi
    const yayasanShare = Math.floor(saleAmount * 0.7);
    const koperasiShare = Math.floor(saleAmount * 0.3);
    
    return {
      total_sale: saleAmount,
      yayasan_share: yayasanShare,
      koperasi_share: koperasiShare,
      yayasan_percentage: 70,
      koperasi_percentage: 30
    };
  }
}

/**
 * Approve a pending transfer to koperasi
 * 
 * Validates transfer status, pricing rules, creates koperasi product,
 * records liability, and updates transfer status to approved.
 * 
 * Requirements: AC-2.4, AC-2.5, AC-2.7, AC-2.8
 * 
 * @param transferId - ID of transfer to approve
 * @param approval - Approval data with condition and pricing
 * @throws TransferApprovalError if validation fails
 */
export async function approveTransfer(
  transferId: string,
  approval: ApprovalData
): Promise<void> {
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new TransferApprovalError('User tidak terautentikasi');
  }

  // Get transfer record
  const { data: transfer, error: transferError } = await supabase
    .from('transfer_inventaris')
    .select('*, inventaris(nama_barang, satuan, kategori, harga_perolehan)')
    .eq('id', transferId)
    .single();

  if (transferError || !transfer) {
    throw new TransferApprovalError('Transfer tidak ditemukan');
  }

  if (transfer.status !== 'pending') {
    throw new TransferApprovalError('Transfer sudah diproses sebelumnya');
  }

  if (transfer.tujuan !== 'koperasi') {
    throw new TransferApprovalError('Hanya transfer ke koperasi yang memerlukan approval');
  }

  // Validate pricing rules
  const hppYayasan = transfer.hpp_yayasan || 0;
  if (approval.kondisi_barang === 'baik' && approval.harga_jual < hppYayasan) {
    throw new TransferApprovalError(
      'Harga jual harus lebih besar atau sama dengan HPP untuk barang kondisi baik'
    );
  }

  // Calculate profit sharing
  const profitSplit = calculateProfitSharing(approval.harga_jual, approval.kondisi_barang);
  const profitSharingRatio = approval.kondisi_barang === 'baik' ? '100:0' : '70:30';

  // Get sumber modal Yayasan
  const { data: sumberModal } = await supabase
    .from('kop_sumber_modal')
    .select('id')
    .eq('nama', 'Yayasan')
    .single();

  // Create kop_barang record (map to kop_barang structure)
  const produkData = {
    kode_barang: `INV-${transfer.inventaris_id?.slice(0, 8) || Date.now().toString().slice(-8)}`,
    nama_barang: transfer.inventaris?.nama_barang || 'Item Transfer',
    kategori_id: null, // Will be set based on kategori if needed
    satuan_dasar: transfer.inventaris?.satuan || 'pcs',
    harga_beli: hppYayasan,
    harga_jual_ecer: approval.harga_jual,
    harga_jual_grosir: approval.harga_jual * 0.95, // 5% discount for grosir
    stok: transfer.jumlah,
    stok_minimum: 0,
    inventaris_id: transfer.inventaris_id,
    harga_transfer: hppYayasan,
    transfer_date: new Date().toISOString(),
    transfer_reference: transferId,
    owner_type: 'yayasan' as const,
    bagi_hasil_yayasan: profitSplit.yayasan_percentage || 70,
    sumber_modal_id: sumberModal?.id || '',
    is_active: true,
  };

  const { error: produkError } = await supabase
    .from('kop_barang')
    .insert(produkData);

  if (produkError) {
    throw new TransferApprovalError('Gagal membuat produk koperasi: ' + produkError.message);
  }

  // Record liability (kewajiban koperasi ke yayasan)
  try {
    await recordTransferLiability(
      transferId,
      hppYayasan,
      transfer.jumlah,
      transfer.inventaris?.nama_barang || 'Item Transfer'
    );
  } catch (liabilityError) {
    console.warn('Warning: Gagal mencatat kewajiban:', liabilityError);
    // Don't throw - product creation succeeded
  }

  // Update transfer status
  const { error: updateError } = await supabase
    .from('transfer_inventaris')
    .update({
      status: 'approved',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      kondisi_barang: approval.kondisi_barang,
      harga_jual_koperasi: approval.harga_jual,
      profit_sharing_ratio: profitSharingRatio,
      catatan: approval.catatan || transfer.catatan
    })
    .eq('id', transferId);

  if (updateError) {
    throw new TransferApprovalError('Gagal update status transfer: ' + updateError.message);
  }
}

/**
 * Reject a pending transfer to koperasi
 * 
 * Restores inventaris stock and updates transfer status to rejected.
 * 
 * Requirements: AC-2B.6
 * 
 * @param transferId - ID of transfer to reject
 * @param reason - Rejection reason
 * @throws TransferApprovalError if validation fails
 */
export async function rejectTransfer(
  transferId: string,
  reason: string
): Promise<void> {
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new TransferApprovalError('User tidak terautentikasi');
  }

  // Get transfer record
  const { data: transfer, error: transferError } = await supabase
    .from('transfer_inventaris')
    .select('*')
    .eq('id', transferId)
    .single();

  if (transferError || !transfer) {
    throw new TransferApprovalError('Transfer tidak ditemukan');
  }

  if (transfer.status !== 'pending') {
    throw new TransferApprovalError('Transfer sudah diproses sebelumnya');
  }

  // Restore stock
  const { data: item, error: itemError } = await supabase
    .from('inventaris')
    .select('jumlah')
    .eq('id', transfer.item_id)
    .single();

  if (itemError || !item) {
    throw new TransferApprovalError('Item tidak ditemukan');
  }

  const restoredStock = (item.jumlah || 0) + transfer.jumlah;
  const { error: updateStockError } = await supabase
    .from('inventaris')
    .update({ jumlah: restoredStock })
    .eq('id', transfer.item_id);

  if (updateStockError) {
    throw new TransferApprovalError('Gagal mengembalikan stok: ' + updateStockError.message);
  }

  // Update transfer status
  const { error: updateError } = await supabase
    .from('transfer_inventaris')
    .update({
      status: 'rejected',
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      rejection_reason: reason
    })
    .eq('id', transferId);

  if (updateError) {
    throw new TransferApprovalError('Gagal update status transfer: ' + updateError.message);
  }
}

/**
 * Get transfers by status
 * 
 * Query transfers filtered by status with item details.
 * Supports pagination.
 * 
 * Requirements: AC-2.3, AC-2B.1
 * 
 * @param status - Transfer status to filter
 * @param page - Page number (default 1)
 * @param limit - Items per page (default 50)
 * @returns List of transfers with item details
 */
export async function getTransfersByStatus(
  status: TransferStatus,
  page: number = 1,
  limit: number = 50
): Promise<PaginatedTransfers> {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabase
    .from('transfer_inventaris')
    .select(`
      *,
      inventaris(nama_barang, satuan, kategori, harga_perolehan)
    `, { count: 'exact' })
    .eq('status', status)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    // Handle case when table doesn't exist yet
    if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
      console.warn('Tabel transfer_inventaris belum tersedia, mengembalikan data kosong');
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0
      };
    }
    throw new Error('Gagal mengambil data transfer: ' + error.message);
  }

  // Get user profiles untuk created_by dan approved_by
  const userIds = new Set<string>();
  (data || []).forEach(t => {
    if (t.created_by) userIds.add(t.created_by);
    if (t.approved_by) userIds.add(t.approved_by);
  });

  let profilesMap = new Map<string, string>();
  if (userIds.size > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', Array.from(userIds));
    
    if (profilesData) {
      profilesMap = new Map(profilesData.map(p => [p.id, p.full_name || 'Unknown']));
    }
  }

  const transfers: TransferWithItem[] = (data || []).map(t => ({
    ...t,
    item_name: t.inventaris?.nama_barang || 'Item tidak ditemukan',
    item_satuan: t.inventaris?.satuan,
    item_kategori: t.inventaris?.kategori,
    item_harga_perolehan: t.inventaris?.harga_perolehan,
    tujuan: t.tujuan as TransferDestination,
    status: t.status as TransferStatus,
    kondisi_barang: t.kondisi_barang as ItemCondition | undefined,
    created_by_name: profilesMap.get(t.created_by) || t.created_by?.substring(0, 8) || 'Unknown',
    approved_by_name: t.approved_by ? (profilesMap.get(t.approved_by) || t.approved_by.substring(0, 8)) : undefined
  }));

  return {
    data: transfers,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit)
  };
}

/**
 * Get transfer history with filters
 * 
 * Supports filtering by destination, status, date range, and item.
 * Includes pagination.
 * 
 * Requirements: AC-4.1, AC-4.2
 * 
 * @param filters - Filter criteria
 * @returns Paginated transfer history
 */
export async function getTransferHistory(
  filters: TransferFilters
): Promise<PaginatedTransfers> {
  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('transfer_inventaris')
    .select(`
      *,
      inventaris(nama_barang, satuan, kategori)
    `, { count: 'exact' });

  // Apply filters
  if (filters.tujuan) {
    query = query.eq('tujuan', filters.tujuan);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.item_id) {
    query = query.eq('item_id', filters.item_id);
  }
  if (filters.date_from) {
    query = query.gte('created_at', filters.date_from);
  }
  if (filters.date_to) {
    query = query.lte('created_at', filters.date_to);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    // Handle case when table doesn't exist yet
    if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
      console.warn('Tabel transfer_inventaris belum tersedia, mengembalikan data kosong');
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0
      };
    }
    throw new Error('Gagal mengambil riwayat transfer: ' + error.message);
  }

  // Get user profiles untuk created_by dan approved_by
  const userIds = new Set<string>();
  (data || []).forEach(t => {
    if (t.created_by) userIds.add(t.created_by);
    if (t.approved_by) userIds.add(t.approved_by);
  });

  let profilesMap = new Map<string, string>();
  if (userIds.size > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', Array.from(userIds));
    
    if (profilesData) {
      profilesMap = new Map(profilesData.map(p => [p.id, p.full_name || 'Unknown']));
    }
  }

  const transfers: TransferWithItem[] = (data || []).map(t => ({
    ...t,
    item_name: t.inventaris?.nama_barang || 'Item tidak ditemukan',
    item_satuan: t.inventaris?.satuan,
    item_kategori: t.inventaris?.kategori,
    item_harga_perolehan: t.inventaris?.harga_perolehan,
    tujuan: t.tujuan as TransferDestination,
    status: t.status as TransferStatus,
    kondisi_barang: t.kondisi_barang as ItemCondition | undefined,
    created_by_name: profilesMap.get(t.created_by) || t.created_by?.substring(0, 8) || 'Unknown',
    approved_by_name: t.approved_by ? (profilesMap.get(t.approved_by) || t.approved_by.substring(0, 8)) : undefined
  }));

  return {
    data: transfers,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit)
  };
}

/**
 * Update transfer record
 * 
 * Only allows updating pending transfers (catatan, jumlah if not approved yet)
 * 
 * @param transferId - ID of transfer to update
 * @param updates - Fields to update
 * @throws TransferValidationError if validation fails
 */
export async function updateTransfer(
  transferId: string,
  updates: {
    jumlah?: number;
    catatan?: string;
  }
): Promise<Transfer> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new TransferValidationError('User tidak terautentikasi');
  }

  // Get current transfer
  const { data: currentTransfer, error: fetchError } = await supabase
    .from('transfer_inventaris')
    .select('*')
    .eq('id', transferId)
    .single();

  if (fetchError || !currentTransfer) {
    throw new TransferValidationError('Transfer tidak ditemukan');
  }

  // Only allow update for pending transfers
  if (currentTransfer.status !== 'pending') {
    throw new TransferValidationError('Hanya transfer pending yang dapat diubah');
  }

  // Validate jumlah if provided
  if (updates.jumlah !== undefined) {
    if (updates.jumlah <= 0) {
      throw new TransferValidationError('Jumlah harus lebih besar dari 0');
    }

    // Check stock availability
    const { data: item, error: itemError } = await supabase
      .from('inventaris')
      .select('jumlah')
      .eq('id', currentTransfer.item_id)
      .single();

    if (itemError || !item) {
      throw new TransferValidationError('Item tidak ditemukan');
    }

    const currentStock = item.jumlah || 0;
    const stockNeeded = updates.jumlah - currentTransfer.jumlah;
    
    if (currentStock < stockNeeded) {
      throw new TransferValidationError(
        `Stok tidak mencukupi. Tersedia: ${currentStock}, Dibutuhkan: ${stockNeeded}`
      );
    }
  }

  // Update transfer
  const updateData: any = {};
  if (updates.jumlah !== undefined) updateData.jumlah = updates.jumlah;
  if (updates.catatan !== undefined) updateData.catatan = updates.catatan;

  const { data: updatedTransfer, error: updateError } = await supabase
    .from('transfer_inventaris')
    .update(updateData)
    .eq('id', transferId)
    .select()
    .single();

  if (updateError) {
    throw new TransferValidationError('Gagal mengupdate transfer: ' + updateError.message);
  }

  // Update stock if jumlah changed
  if (updates.jumlah !== undefined && updates.jumlah !== currentTransfer.jumlah) {
    const { data: item } = await supabase
      .from('inventaris')
      .select('jumlah')
      .eq('id', currentTransfer.item_id)
      .single();

    if (item) {
      const stockDiff = currentTransfer.jumlah - updates.jumlah;
      const newStock = (item.jumlah || 0) + stockDiff;
      
      await supabase
        .from('inventaris')
        .update({ jumlah: newStock })
        .eq('id', currentTransfer.item_id);
    }
  }

  return {
    id: updatedTransfer.id,
    item_id: updatedTransfer.item_id,
    jumlah: updatedTransfer.jumlah,
    tujuan: updatedTransfer.tujuan as TransferDestination,
    status: updatedTransfer.status as TransferStatus
  } as Transfer;
}

/**
 * Delete transfer record
 * 
 * Only allows deleting pending transfers. Restores stock to inventaris.
 * 
 * @param transferId - ID of transfer to delete
 * @throws TransferValidationError if validation fails
 */
export async function deleteTransfer(transferId: string): Promise<void> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new TransferValidationError('User tidak terautentikasi');
  }

  // Get transfer
  const { data: transfer, error: fetchError } = await supabase
    .from('transfer_inventaris')
    .select('*')
    .eq('id', transferId)
    .single();

  if (fetchError || !transfer) {
    throw new TransferValidationError('Transfer tidak ditemukan');
  }

  // Only allow delete for pending transfers
  if (transfer.status !== 'pending') {
    throw new TransferValidationError('Hanya transfer pending yang dapat dihapus');
  }

  // Restore stock
  const { data: item, error: itemError } = await supabase
    .from('inventaris')
    .select('jumlah')
    .eq('id', transfer.item_id)
    .single();

  if (itemError || !item) {
    throw new TransferValidationError('Item tidak ditemukan');
  }

  const restoredStock = (item.jumlah || 0) + transfer.jumlah;
  await supabase
    .from('inventaris')
    .update({ jumlah: restoredStock })
    .eq('id', transfer.item_id);

  // Delete transfer
  const { error: deleteError } = await supabase
    .from('transfer_inventaris')
    .delete()
    .eq('id', transferId);

  if (deleteError) {
    throw new TransferValidationError('Gagal menghapus transfer: ' + deleteError.message);
  }
}

// ============================================================================
// Distribusi Bank Functions
// ============================================================================

/**
 * Create bank item for distribusi module
 * 
 * Creates a separate stock record for distribusi bantuan module.
 * 
 * Requirements: AC-3.1, AC-5.5
 * 
 * @param transferId - ID of the transfer
 * @param itemId - ID of the item
 * @param jumlah - Quantity transferred
 */
async function createBankItemDistribusi(
  transferId: string,
  itemId: string,
  jumlah: number
): Promise<void> {
  const { error } = await supabase
    .from('bank_item_distribusi')
    .insert({
      transfer_id: transferId,
      item_id: itemId,
      jumlah_tersedia: jumlah,
      jumlah_terpakai: 0
    });

  if (error) {
    console.error('Warning: Gagal membuat bank item distribusi:', error);
    // Don't throw - transfer creation succeeded
  }
}

/**
 * Get bank item stock for distribusi module
 * 
 * Returns available stock in distribusi bank.
 * 
 * Requirements: AC-3.2, AC-3.3, AC-3.4
 * 
 * @returns List of bank items with available stock
 */
export async function getBankItemStock(): Promise<BankItemDistribusi[]> {
  const { data, error } = await supabase
    .from('bank_item_distribusi')
    .select(`
      *,
      inventaris(nama_barang, satuan, kategori)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Gagal mengambil bank item: ' + error.message);
  }

  return (data || []) as BankItemDistribusi[];
}

/**
 * Validate paket bantuan against bank stock
 * 
 * Checks if requested quantity is available in bank.
 * 
 * Requirements: AC-3.5
 * 
 * @param itemId - ID of the item
 * @param requestedQty - Requested quantity
 * @returns Validation result
 */
export async function validatePaketBantuan(
  itemId: string,
  requestedQty: number
): Promise<{ valid: boolean; message?: string; available?: number }> {
  const { data, error } = await supabase
    .from('bank_item_distribusi')
    .select('jumlah_tersedia, jumlah_terpakai')
    .eq('item_id', itemId)
    .single();

  if (error || !data) {
    return {
      valid: false,
      message: 'Item tidak ditemukan di bank distribusi'
    };
  }

  const available = data.jumlah_tersedia - data.jumlah_terpakai;
  
  if (requestedQty > available) {
    return {
      valid: false,
      message: `Stok tidak mencukupi. Tersedia: ${available}, Diminta: ${requestedQty}`,
      available
    };
  }

  return { valid: true, available };
}

// ============================================================================
// Keuangan Integration Functions
// ============================================================================

/**
 * Record liability to keuangan system when transfer is approved
 * 
 * Creates a keuangan record for the liability (hutang koperasi ke yayasan)
 * based on HPP × quantity.
 * 
 * Requirements: AC-2.8
 * 
 * @param transferId - ID of the approved transfer
 * @param hppYayasan - HPP (Harga Pokok Penjualan) from yayasan
 * @param jumlah - Quantity transferred
 * @param itemName - Name of the item for description
 * @returns ID of created keuangan record
 */
export async function recordTransferLiability(
  transferId: string,
  hppYayasan: number,
  jumlah: number,
  itemName: string
): Promise<string> {
  // Calculate liability amount
  const liabilityAmount = hppYayasan * jumlah;

  // Get default akun kas for koperasi
  const { data: akunKas, error: akunError } = await supabase
    .from('akun_kas')
    .select('id')
    .eq('nama_akun', 'Kas Koperasi')
    .eq('status', 'aktif')
    .maybeSingle();

  if (akunError) {
    console.warn('Warning: Gagal mendapatkan akun kas koperasi:', akunError);
  }

  // Create keuangan record
  const keuanganData = {
    tanggal: new Date().toISOString().split('T')[0],
    jenis_transaksi: 'Pengeluaran',
    kategori: 'Hutang ke Yayasan',
    jumlah: liabilityAmount,
    deskripsi: `Kewajiban transfer: ${itemName} (${jumlah} unit)`,
    referensi: `transfer:${transferId}`,
    akun_kas_id: akunKas?.id || null,
    status: 'posted',
    auto_posted: true,
    source_module: 'transfer',
    source_id: transferId
  };

  const { data: keuangan, error: keuanganError } = await supabase
    .from('keuangan')
    .insert(keuanganData)
    .select('id')
    .single();

  if (keuanganError) {
    throw new Error('Gagal mencatat kewajiban: ' + keuanganError.message);
  }

  return keuangan.id;
}

/**
 * Record sale liability to keuangan system
 * 
 * When a product from yayasan transfer is sold, record the yayasan portion
 * as a liability in the keuangan system.
 * 
 * Requirements: AC-5.4
 * 
 * @param saleId - ID of the sale
 * @param yayasanShare - Yayasan's share from the sale
 * @param itemName - Name of the item sold
 * @param transferId - ID of the original transfer (if available)
 * @returns ID of created keuangan record
 */
export async function recordSaleLiability(
  saleId: string,
  yayasanShare: number,
  itemName: string,
  transferId?: string
): Promise<string> {
  // Get default akun kas for koperasi
  const { data: akunKas, error: akunError } = await supabase
    .from('akun_kas')
    .select('id')
    .eq('nama_akun', 'Kas Koperasi')
    .eq('status', 'aktif')
    .maybeSingle();

  if (akunError) {
    console.warn('Warning: Gagal mendapatkan akun kas koperasi:', akunError);
  }

  // Create keuangan record for yayasan portion
  const keuanganData = {
    tanggal: new Date().toISOString().split('T')[0],
    jenis_transaksi: 'Pengeluaran',
    kategori: 'Hutang ke Yayasan',
    jumlah: yayasanShare,
    deskripsi: transferId 
      ? `Kewajiban penjualan transfer: ${itemName}` 
      : `Kewajiban penjualan: ${itemName}`,
    referensi: `sale:${saleId}`,
    akun_kas_id: akunKas?.id || null,
    status: 'posted',
    auto_posted: true,
    source_module: 'koperasi_sale',
    source_id: saleId
  };

  const { data: keuangan, error: keuanganError } = await supabase
    .from('keuangan')
    .insert(keuanganData)
    .select('id')
    .single();

  if (keuanganError) {
    throw new Error('Gagal mencatat kewajiban penjualan: ' + keuanganError.message);
  }

  return keuangan.id;
}

// ============================================================================
// Dashboard and Reporting Functions
// ============================================================================

export interface TransferSummaryByDestination {
  tujuan: TransferDestination;
  total_transfers: number;
  total_quantity: number;
  total_value: number;
}

export interface TransferTrendData {
  date: string;
  count: number;
  quantity: number;
}

export interface PeriodSummary {
  total_transfers: number;
  total_quantity: number;
  by_destination: TransferSummaryByDestination[];
  by_status: {
    status: TransferStatus;
    count: number;
  }[];
}

/**
 * Get transfer summary by destination
 * 
 * Aggregates transfer data grouped by destination.
 * 
 * Requirements: AC-4.5
 * 
 * @param dateFrom - Start date filter (optional)
 * @param dateTo - End date filter (optional)
 * @returns Summary by destination
 */
export async function getTransferSummaryByDestination(
  dateFrom?: string,
  dateTo?: string
): Promise<TransferSummaryByDestination[]> {
  let query = supabase
    .from('transfer_inventaris')
    .select('tujuan, jumlah, hpp_yayasan, status')
    // Exclude rejected transfers - mereka tidak dihitung karena stok sudah dikembalikan
    .neq('status', 'rejected');

  if (dateFrom) {
    query = query.gte('created_at', dateFrom);
  }
  if (dateTo) {
    query = query.lte('created_at', dateTo);
  }

  const { data, error } = await query;

  if (error) {
    // Handle case when table doesn't exist yet
    if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
      console.warn('Tabel transfer_inventaris belum tersedia, mengembalikan data kosong');
      return [];
    }
    throw new Error('Gagal mengambil summary transfer: ' + error.message);
  }

  // Filter out rejected transfers (stok sudah dikembalikan)
  const validTransfers = (data || []).filter(t => t.status !== 'rejected');

  // Aggregate by destination
  const summaryMap = new Map<TransferDestination, {
    count: number;
    quantity: number;
    value: number;
  }>();

  validTransfers.forEach(transfer => {
    const tujuan = transfer.tujuan as TransferDestination;
    const current = summaryMap.get(tujuan) || { count: 0, quantity: 0, value: 0 };
    
    summaryMap.set(tujuan, {
      count: current.count + 1,
      quantity: current.quantity + (transfer.jumlah || 0),
      value: current.value + ((transfer.hpp_yayasan || 0) * (transfer.jumlah || 0))
    });
  });

  return Array.from(summaryMap.entries()).map(([tujuan, stats]) => ({
    tujuan,
    total_transfers: stats.count,
    total_quantity: stats.quantity,
    total_value: stats.value
  }));
}

/**
 * Get transfer trends over time
 * 
 * Returns daily transfer counts and quantities for charting.
 * 
 * Requirements: AC-4.5
 * 
 * @param dateFrom - Start date
 * @param dateTo - End date
 * @returns Daily transfer trends
 */
export async function getTransferTrends(
  dateFrom: string,
  dateTo: string
): Promise<TransferTrendData[]> {
  const { data, error } = await supabase
    .from('transfer_inventaris')
    .select('created_at, jumlah, status')
    .gte('created_at', dateFrom)
    .lte('created_at', dateTo)
    // Exclude rejected transfers - mereka tidak dihitung karena stok sudah dikembalikan
    .neq('status', 'rejected')
    .order('created_at', { ascending: true });

  if (error) {
    // Handle case when table doesn't exist yet
    if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
      console.warn('Tabel transfer_inventaris belum tersedia, mengembalikan data kosong');
      return [];
    }
    throw new Error('Gagal mengambil trend transfer: ' + error.message);
  }

  // Data sudah difilter di query level (.neq('status', 'rejected'))
  // Tapi kita tetap filter lagi untuk safety
  const validTransfers = (data || []).filter(t => t.status !== 'rejected');

  // Group by date
  const trendMap = new Map<string, { count: number; quantity: number }>();

  validTransfers.forEach(transfer => {
    const date = new Date(transfer.created_at).toISOString().split('T')[0];
    const current = trendMap.get(date) || { count: 0, quantity: 0 };
    
    trendMap.set(date, {
      count: current.count + 1,
      quantity: current.quantity + (transfer.jumlah || 0)
    });
  });

  return Array.from(trendMap.entries()).map(([date, stats]) => ({
    date,
    count: stats.count,
    quantity: stats.quantity
  }));
}

/**
 * Get period summary with aggregations
 * 
 * Returns comprehensive summary for a date range.
 * 
 * Requirements: AC-4.3, AC-4.5
 * 
 * @param dateFrom - Start date
 * @param dateTo - End date
 * @returns Period summary with breakdowns
 */
export async function getPeriodSummary(
  dateFrom: string,
  dateTo: string
): Promise<PeriodSummary> {
  const { data, error } = await supabase
    .from('transfer_inventaris')
    .select('tujuan, status, jumlah, hpp_yayasan')
    .gte('created_at', dateFrom)
    .lte('created_at', dateTo);

  if (error) {
    // Handle case when table doesn't exist yet
    if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
      console.warn('Tabel transfer_inventaris belum tersedia, mengembalikan summary kosong');
      return {
        total_transfers: 0,
        total_quantity: 0,
        by_destination: [],
        by_status: []
      };
    }
    throw new Error('Gagal mengambil summary periode: ' + error.message);
  }

  const allTransfers = data || [];
  
  // Filter out rejected transfers for totals (stok sudah dikembalikan)
  const validTransfers = allTransfers.filter(t => t.status !== 'rejected');
  
  // Calculate totals (exclude rejected)
  const totalTransfers = validTransfers.length;
  const totalQuantity = validTransfers.reduce((sum, t) => sum + (t.jumlah || 0), 0);

  // Group by destination (exclude rejected)
  const byDestinationMap = new Map<TransferDestination, {
    count: number;
    quantity: number;
    value: number;
  }>();

  validTransfers.forEach(transfer => {
    const tujuan = transfer.tujuan as TransferDestination;
    const current = byDestinationMap.get(tujuan) || { count: 0, quantity: 0, value: 0 };
    
    byDestinationMap.set(tujuan, {
      count: current.count + 1,
      quantity: current.quantity + (transfer.jumlah || 0),
      value: current.value + ((transfer.hpp_yayasan || 0) * (transfer.jumlah || 0))
    });
  });

  const byDestination = Array.from(byDestinationMap.entries()).map(([tujuan, stats]) => ({
    tujuan,
    total_transfers: stats.count,
    total_quantity: stats.quantity,
    total_value: stats.value
  }));

  // Group by status (include all statuses for breakdown, but totals exclude rejected)
  const byStatusMap = new Map<TransferStatus, number>();
  allTransfers.forEach(transfer => {
    const status = transfer.status as TransferStatus;
    byStatusMap.set(status, (byStatusMap.get(status) || 0) + 1);
  });

  const byStatus = Array.from(byStatusMap.entries()).map(([status, count]) => ({
    status,
    count
  }));

  return {
    total_transfers: totalTransfers,
    total_quantity: totalQuantity,
    by_destination: byDestination,
    by_status: byStatus
  };
}
