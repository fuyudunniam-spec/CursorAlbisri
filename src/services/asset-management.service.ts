// =====================================================
// ASSET MANAGEMENT SERVICE LAYER
// Pengelolaan Aset Yayasan oleh Koperasi
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import { checkDoubleEntry } from '@/services/keuangan.service';
import type {
  AssetTransferLog,
  TransferAssetRequest,
  BagiHasilLog,
  BagiHasilDetail,
  BagiHasilRequest,
  BagiHasilPreviewData,
  AssetAccountabilityReport,
  AccountabilityFilter,
} from '@/types/asset-management.types';

// =====================================================
// ERROR HANDLING
// =====================================================

export enum AssetManagementErrorCode {
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  INVALID_TRANSFER_AMOUNT = 'INVALID_TRANSFER_AMOUNT',
  DUPLICATE_PERIODE = 'DUPLICATE_PERIODE',
  INVALID_PERCENTAGE = 'INVALID_PERCENTAGE',
  INSUFFICIENT_KAS = 'INSUFFICIENT_KAS',
  ASSET_NOT_FOUND = 'ASSET_NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
}

export class AssetManagementError extends Error {
  constructor(
    public code: AssetManagementErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AssetManagementError';
  }
}

const ERROR_MESSAGES = {
  [AssetManagementErrorCode.INSUFFICIENT_STOCK]: 
    'Stock inventaris tidak mencukupi untuk transfer',
  [AssetManagementErrorCode.INVALID_TRANSFER_AMOUNT]: 
    'Jumlah transfer harus lebih dari 0',
  [AssetManagementErrorCode.DUPLICATE_PERIODE]: 
    'Periode ini sudah pernah diproses',
  [AssetManagementErrorCode.INVALID_PERCENTAGE]: 
    'Total persentase bagi hasil harus 100%',
  [AssetManagementErrorCode.INSUFFICIENT_KAS]: 
    'Saldo Kas Koperasi tidak mencukupi untuk transfer',
  [AssetManagementErrorCode.ASSET_NOT_FOUND]: 
    'Aset tidak ditemukan',
  [AssetManagementErrorCode.UNAUTHORIZED]: 
    'Anda tidak memiliki akses untuk operasi ini',
};

// =====================================================
// ASSET MANAGEMENT SERVICE
// =====================================================

export const assetManagementService = {
  // =====================================================
  // 1. ASSET TRANSFER
  // =====================================================

  /**
   * Transfer asset from inventaris to koperasi
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
   * 
   * PERUBAHAN: Untuk transfer ke koperasi, sekarang membuat pengajuan_item_yayasan
   * dengan status pending_koperasi. Stok inventaris TIDAK langsung dikurangi.
   * Stok akan dikurangi saat admin koperasi approve pengajuan.
   */
  async transferAsset(data: TransferAssetRequest): Promise<AssetTransferLog> {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user.user) {
        throw new AssetManagementError(
          AssetManagementErrorCode.UNAUTHORIZED,
          ERROR_MESSAGES[AssetManagementErrorCode.UNAUTHORIZED]
        );
      }

      // 1. Validate input
      if (!data.inventaris_id) {
        throw new AssetManagementError(
          AssetManagementErrorCode.ASSET_NOT_FOUND,
          'ID inventaris harus diisi'
        );
      }

      if (data.quantity <= 0) {
        throw new AssetManagementError(
          AssetManagementErrorCode.INVALID_TRANSFER_AMOUNT,
          ERROR_MESSAGES[AssetManagementErrorCode.INVALID_TRANSFER_AMOUNT]
        );
      }

      // 2. Check inventaris stock
      const { data: inventaris, error: invError } = await supabase
        .from('inventaris')
        .select('id, nama_barang, jumlah, satuan, kategori, harga_perolehan')
        .eq('id', data.inventaris_id)
        .single();

      if (invError || !inventaris) {
        throw new AssetManagementError(
          AssetManagementErrorCode.ASSET_NOT_FOUND,
          ERROR_MESSAGES[AssetManagementErrorCode.ASSET_NOT_FOUND]
        );
      }

      if ((inventaris.jumlah || 0) < data.quantity) {
        throw new AssetManagementError(
          AssetManagementErrorCode.INSUFFICIENT_STOCK,
          ERROR_MESSAGES[AssetManagementErrorCode.INSUFFICIENT_STOCK],
          { available: inventaris.jumlah, requested: data.quantity }
        );
      }

      // 3. Create pengajuan_item_yayasan untuk approval
      // Stok inventaris TIDAK dikurangi dulu, tunggu approval dari admin koperasi
      const nilaiPerolehan = inventaris.harga_perolehan || 0;
      const usulanHpp = data.harga_transfer || nilaiPerolehan;

      const { data: pengajuan, error: pengajuanError } = await supabase
        .from('pengajuan_item_yayasan')
        .insert({
          inventaris_item_id: data.inventaris_id,
          nama: inventaris.nama_barang,
          qty: data.quantity,
          nilai_perolehan: nilaiPerolehan,
          usulan_hpp: usulanHpp,
          status: 'pending_koperasi',
          created_by: user.user.id,
        })
        .select()
        .single();

      if (pengajuanError || !pengajuan) {
        throw new AssetManagementError(
          AssetManagementErrorCode.ASSET_NOT_FOUND,
          'Gagal membuat pengajuan transfer: ' + (pengajuanError?.message || 'Unknown error')
        );
      }

      // 4. Return a mock AssetTransferLog untuk backward compatibility
      // Note: Actual transfer will happen when admin approves the pengajuan
      return {
        id: pengajuan.id,
        inventaris_id: data.inventaris_id,
        koperasi_produk_id: '', // Will be set when approved
        transfer_reference: `PENGAJUAN-${pengajuan.id.substring(0, 8).toUpperCase()}`,
        quantity_transferred: data.quantity,
        harga_transfer: usulanHpp,
        transfer_date: new Date().toISOString(),
        transferred_by: user.user.id,
        notes: data.notes || 'Pengajuan transfer - menunggu approval',
        status: 'pending',
      } as AssetTransferLog;
    } catch (error) {
      // Re-throw AssetManagementError as-is
      if (error instanceof AssetManagementError) {
        throw error;
      }
      // Wrap other errors
      throw new AssetManagementError(
        AssetManagementErrorCode.ASSET_NOT_FOUND,
        'Terjadi kesalahan saat transfer aset: ' + (error as Error).message,
        error
      );
    }
  },

  /**
   * Generate unique transfer reference
   */
  async generateTransferReference(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const prefix = `TRF-${year}${month}`;

    const { data, error } = await supabase
      .from('asset_transfer_log')
      .select('transfer_reference')
      .like('transfer_reference', `${prefix}%`)
      .order('transfer_reference', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!data || data.length === 0) {
      return `${prefix}-0001`;
    }

    const lastRef = data[0].transfer_reference;
    const match = lastRef.match(/-(\d+)$/);
    if (match) {
      const nextNum = parseInt(match[1]) + 1;
      return `${prefix}-${nextNum.toString().padStart(4, '0')}`;
    }

    return `${prefix}-0001`;
  },

  /**
   * Generate kode produk for new yayasan item (managed by koperasi)
   */
  async generateKodeProduk(): Promise<string> {
    const { data, error } = await supabase
      .from('kop_barang')
      .select('kode_barang')
      .like('kode_barang', 'YYS-%')
      .order('kode_barang', { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!data || data.length === 0 || !data[0].kode_barang) {
      return 'YYS-0001';
    }

    const lastCode = data[0].kode_barang as string;
    const match = lastCode.match(/^YYS-(\d+)$/);
    if (match) {
      const nextNum = parseInt(match[1], 10) + 1;
      return `YYS-${nextNum.toString().padStart(4, '0')}`;
    }

    return 'YYS-0001';
  },

  /**
   * Get asset transfer history
   * Requirements: 2.1
   */
  async getTransferHistory(inventarisId?: string): Promise<AssetTransferLog[]> {
    try {
      let query = supabase
        .from('asset_transfer_log')
        .select(`
          *,
          inventaris!inner(id, nama_barang, kategori),
          kop_barang!asset_transfer_log_koperasi_produk_id_fkey(id, nama_barang, kode_barang),
          profiles!asset_transfer_log_transferred_by_fkey(full_name)
        `)
        .order('transfer_date', { ascending: false });

      if (inventarisId) {
        query = query.eq('inventaris_id', inventarisId);
      }

      const { data, error } = await query;
      if (error) {
        throw new AssetManagementError(
          AssetManagementErrorCode.ASSET_NOT_FOUND,
          'Gagal mengambil riwayat transfer: ' + error.message
        );
      }

      return data as any[];
    } catch (error) {
      if (error instanceof AssetManagementError) {
        throw error;
      }
      throw new AssetManagementError(
        AssetManagementErrorCode.ASSET_NOT_FOUND,
        'Terjadi kesalahan saat mengambil riwayat transfer: ' + (error as Error).message,
        error
      );
    }
  },

  /**
   * Get transfer by ID
   */
  async getTransferById(id: string): Promise<AssetTransferLog> {
    try {
      if (!id) {
        throw new AssetManagementError(
          AssetManagementErrorCode.ASSET_NOT_FOUND,
          'ID transfer harus diisi'
        );
      }

      const { data, error } = await supabase
        .from('asset_transfer_log')
        .select(`
          *,
          inventaris!inner(id, nama_barang, kategori, satuan),
          kop_barang!asset_transfer_log_koperasi_produk_id_fkey(id, nama_barang, kode_barang),
          profiles!asset_transfer_log_transferred_by_fkey(full_name)
        `)
        .eq('id', id)
        .single();

      if (error || !data) {
        throw new AssetManagementError(
          AssetManagementErrorCode.ASSET_NOT_FOUND,
          'Transfer tidak ditemukan'
        );
      }

      return data as any;
    } catch (error) {
      if (error instanceof AssetManagementError) {
        throw error;
      }
      throw new AssetManagementError(
        AssetManagementErrorCode.ASSET_NOT_FOUND,
        'Terjadi kesalahan saat mengambil detail transfer: ' + (error as Error).message,
        error
      );
    }
  },

  // =====================================================
  // 2. ACCOUNTABILITY REPORT
  // =====================================================

  /**
   * Get asset accountability report
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
   */
  async getAccountabilityReport(
    filter?: AccountabilityFilter
  ): Promise<AssetAccountabilityReport[]> {
    try {
      // Use the database view for optimized query
      let query = supabase
        .from('v_asset_accountability')
        .select('*')
        .order('last_transfer_date', { ascending: false });

      if (filter?.periode_start) {
        query = query.gte('last_transfer_date', filter.periode_start);
      }
      if (filter?.periode_end) {
        query = query.lte('last_transfer_date', filter.periode_end);
      }
      if (filter?.inventaris_id) {
        query = query.eq('inventaris_id', filter.inventaris_id);
      }
      if (filter?.kategori) {
        query = query.eq('kategori', filter.kategori);
      }
      if (filter?.status) {
        query = query.eq('status', filter.status);
      }

      const { data, error } = await query;
      if (error) {
        throw new AssetManagementError(
          AssetManagementErrorCode.ASSET_NOT_FOUND,
          'Gagal mengambil laporan pertanggungjawaban: ' + error.message
        );
      }

      return data as AssetAccountabilityReport[];
    } catch (error) {
      if (error instanceof AssetManagementError) {
        throw error;
      }
      throw new AssetManagementError(
        AssetManagementErrorCode.ASSET_NOT_FOUND,
        'Terjadi kesalahan saat mengambil laporan pertanggungjawaban: ' + (error as Error).message,
        error
      );
    }
  },

  // =====================================================
  // 3. BAGI HASIL
  // =====================================================

  /**
   * Validate bagi hasil request data
   * Requirements: 6.1, 6.2, 6.5, 6.6
   */
  validateBagiHasilRequest(data: BagiHasilRequest): void {
    // Validate periode
    if (!data.periode_start || !data.periode_end) {
      throw new AssetManagementError(
        AssetManagementErrorCode.INVALID_TRANSFER_AMOUNT,
        'Periode start dan end harus diisi'
      );
    }

    const startDate = new Date(data.periode_start);
    const endDate = new Date(data.periode_end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new AssetManagementError(
        AssetManagementErrorCode.INVALID_TRANSFER_AMOUNT,
        'Format tanggal tidak valid'
      );
    }

    if (startDate > endDate) {
      throw new AssetManagementError(
        AssetManagementErrorCode.INVALID_TRANSFER_AMOUNT,
        'Periode start tidak boleh lebih besar dari periode end'
      );
    }

    // Validate biaya operasional
    if (data.biaya_operasional < 0) {
      throw new AssetManagementError(
        AssetManagementErrorCode.INVALID_TRANSFER_AMOUNT,
        'Biaya operasional tidak boleh negatif'
      );
    }

    if (!Number.isFinite(data.biaya_operasional)) {
      throw new AssetManagementError(
        AssetManagementErrorCode.INVALID_TRANSFER_AMOUNT,
        'Biaya operasional harus berupa angka yang valid'
      );
    }

    // Validate percentage
    if (!Number.isFinite(data.persentase_yayasan) || !Number.isFinite(data.persentase_koperasi)) {
      throw new AssetManagementError(
        AssetManagementErrorCode.INVALID_PERCENTAGE,
        'Persentase harus berupa angka yang valid'
      );
    }

    if (data.persentase_yayasan < 0 || data.persentase_koperasi < 0) {
      throw new AssetManagementError(
        AssetManagementErrorCode.INVALID_PERCENTAGE,
        'Persentase tidak boleh negatif'
      );
    }

    if (data.persentase_yayasan > 100 || data.persentase_koperasi > 100) {
      throw new AssetManagementError(
        AssetManagementErrorCode.INVALID_PERCENTAGE,
        'Persentase tidak boleh lebih dari 100%'
      );
    }

    const totalPercentage = data.persentase_yayasan + data.persentase_koperasi;
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new AssetManagementError(
        AssetManagementErrorCode.INVALID_PERCENTAGE,
        ERROR_MESSAGES[AssetManagementErrorCode.INVALID_PERCENTAGE],
        { 
          total: totalPercentage,
          yayasan: data.persentase_yayasan,
          koperasi: data.persentase_koperasi
        }
      );
    }
  },

  /**
   * Validate that periode has not been processed before
   * Requirements: 6.9
   */
  async validatePeriodeNotProcessed(
    periodeStart: string,
    periodeEnd: string
  ): Promise<void> {
    const { data: existing } = await supabase
      .from('bagi_hasil_log')
      .select('id, periode_start, periode_end, processed_at')
      .eq('periode_start', periodeStart)
      .eq('periode_end', periodeEnd)
      .maybeSingle();

    if (existing) {
      throw new AssetManagementError(
        AssetManagementErrorCode.DUPLICATE_PERIODE,
        ERROR_MESSAGES[AssetManagementErrorCode.DUPLICATE_PERIODE],
        {
          existing_id: existing.id,
          processed_at: existing.processed_at
        }
      );
    }
  },

  /**
   * Validate that Kas Koperasi has sufficient balance
   * Requirements: 6.7
   */
  async validateKasKoperasiBalance(requiredAmount: number): Promise<string> {
    if (requiredAmount <= 0) {
      throw new AssetManagementError(
        AssetManagementErrorCode.INVALID_TRANSFER_AMOUNT,
        'Jumlah transfer harus lebih dari 0'
      );
    }

    const { data: kasKoperasi, error: kasKoperasiError } = await supabase
      .from('akun_kas')
      .select('id, saldo_saat_ini, nama_akun')
      .eq('nama_akun', 'Kas Koperasi')
      .single();

    if (kasKoperasiError || !kasKoperasi) {
      throw new AssetManagementError(
        AssetManagementErrorCode.ASSET_NOT_FOUND,
        'Kas Koperasi tidak ditemukan'
      );
    }

    if (kasKoperasi.saldo_saat_ini < requiredAmount) {
      throw new AssetManagementError(
        AssetManagementErrorCode.INSUFFICIENT_KAS,
        ERROR_MESSAGES[AssetManagementErrorCode.INSUFFICIENT_KAS],
        { 
          available: kasKoperasi.saldo_saat_ini, 
          required: requiredAmount,
          shortfall: requiredAmount - kasKoperasi.saldo_saat_ini
        }
      );
    }

    return kasKoperasi.id;
  },

  /**
   * Validate that laba bersih is positive
   * Requirements: 6.4, 6.5
   */
  validateLabaBersih(labaBersih: number): void {
    if (!Number.isFinite(labaBersih)) {
      throw new AssetManagementError(
        AssetManagementErrorCode.INVALID_TRANSFER_AMOUNT,
        'Laba bersih tidak valid'
      );
    }

    if (labaBersih <= 0) {
      throw new AssetManagementError(
        AssetManagementErrorCode.INVALID_TRANSFER_AMOUNT,
        'Laba bersih harus lebih dari 0 untuk proses bagi hasil',
        { laba_bersih: labaBersih }
      );
    }
  },

  /**
   * Calculate bagi hasil preview
   * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
   */
  async calculateBagiHasilPreview(
    data: BagiHasilRequest
  ): Promise<BagiHasilPreviewData> {
    try {
      // Validate input using dedicated validation function
      this.validateBagiHasilRequest(data);

      // Query penjualan aset yayasan using the view
      const { data: penjualanData, error } = await supabase
        .from('v_penjualan_aset_yayasan')
        .select('*')
        .gte('tanggal', data.periode_start)
        .lte('tanggal', data.periode_end);

      if (error) {
        throw new AssetManagementError(
          AssetManagementErrorCode.ASSET_NOT_FOUND,
          'Gagal mengambil data penjualan: ' + error.message
        );
      }

      const penjualan = penjualanData || [];

      // Calculate totals
      const total_penjualan = penjualan.reduce((sum, p) => sum + (p.total_penjualan || 0), 0);
      const total_hpp = penjualan.reduce((sum, p) => sum + (p.total_hpp || 0), 0);
      const laba_kotor = total_penjualan - total_hpp;
      const laba_bersih = laba_kotor - data.biaya_operasional;
      const bagian_yayasan = laba_bersih * (data.persentase_yayasan / 100);
      const bagian_koperasi = laba_bersih * (data.persentase_koperasi / 100);

      // Format detail penjualan
      const detail_penjualan = penjualan.map((p: any) => ({
        penjualan_id: p.penjualan_id,
        no_penjualan: p.no_penjualan,
        tanggal: p.tanggal,
        inventaris_id: p.inventaris_id,
        nama_barang: p.nama_barang,
        quantity: p.jumlah,
        harga_jual: p.harga_jual,
        harga_transfer: p.harga_transfer,
        total_penjualan: p.total_penjualan,
        total_hpp: p.total_hpp,
        laba: p.laba,
      }));

      return {
        total_penjualan,
        total_hpp,
        laba_kotor,
        biaya_operasional: data.biaya_operasional,
        laba_bersih,
        bagian_yayasan,
        bagian_koperasi,
        detail_penjualan,
      };
    } catch (error) {
      if (error instanceof AssetManagementError) {
        throw error;
      }
      throw new AssetManagementError(
        AssetManagementErrorCode.ASSET_NOT_FOUND,
        'Terjadi kesalahan saat menghitung preview bagi hasil: ' + (error as Error).message,
        error
      );
    }
  },

  /**
   * Process bagi hasil
   * Requirements: 6.7, 6.8, 6.9
   */
  async processBagiHasil(data: BagiHasilRequest): Promise<BagiHasilLog> {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user.user) {
        throw new AssetManagementError(
          AssetManagementErrorCode.UNAUTHORIZED,
          ERROR_MESSAGES[AssetManagementErrorCode.UNAUTHORIZED]
        );
      }

      // 1. Validate input data
      this.validateBagiHasilRequest(data);

      // 2. Validate periode not already processed
      await this.validatePeriodeNotProcessed(data.periode_start, data.periode_end);

      // 3. Calculate bagi hasil
      const preview = await this.calculateBagiHasilPreview(data);

      // 4. Validate laba bersih is positive
      this.validateLabaBersih(preview.laba_bersih);

      // 5. Validate Kas Koperasi balance and get kas ID
      const kasKoperasiId = await this.validateKasKoperasiBalance(preview.bagian_yayasan);

      // 6. Get Kas Yayasan
      const { data: kasYayasan, error: kasYayasanError } = await supabase
        .from('akun_kas')
        .select('id')
        .eq('nama_akun', 'Kas Utama')
        .single();

      if (kasYayasanError || !kasYayasan) {
        throw new AssetManagementError(
          AssetManagementErrorCode.ASSET_NOT_FOUND,
          'Kas Yayasan (Kas Utama) tidak ditemukan'
        );
      }

      // 7. Generate unique bagi hasil ID for tracking
      const bagiHasilTempId = `bagi_hasil_${Date.now()}`;
      const referensi = `bagi_hasil:${bagiHasilTempId}`;

      // 8. Check for double entry before creating transaction
      const isDuplicate = await checkDoubleEntry(
        'bagi_hasil',
        bagiHasilTempId,
        referensi,
        preview.bagian_yayasan,
        new Date().toISOString()
      );

      if (isDuplicate) {
        throw new AssetManagementError(
          AssetManagementErrorCode.DUPLICATE_PERIODE,
          'Transaksi bagi hasil ini sudah pernah dibuat'
        );
      }

      // 9. Create keuangan transaction (transfer from Koperasi to Yayasan)
      // Using direct insert to keuangan table with proper tracking fields
      const { data: transaksiKeuangan, error: keuanganError } = await supabase
        .from('keuangan')
        .insert({
          tanggal: new Date().toISOString().split('T')[0], // Date only
          jenis_transaksi: 'Pengeluaran', // From Kas Koperasi perspective
          kategori: 'Bagi Hasil Aset',
          jumlah: preview.bagian_yayasan,
          akun_kas_id: kasKoperasiId, // Debit from Kas Koperasi
          deskripsi: `Bagi Hasil Aset periode ${data.periode_start} - ${data.periode_end}`,
          referensi: referensi,
          status: 'posted',
          auto_posted: true,
          source_module: 'bagi_hasil',
          source_id: bagiHasilTempId,
        })
        .select()
        .single();

      if (keuanganError || !transaksiKeuangan) {
        throw new AssetManagementError(
          AssetManagementErrorCode.ASSET_NOT_FOUND,
          'Gagal membuat transaksi keuangan: ' + (keuanganError?.message || 'Unknown error')
        );
      }

      // 10. Create corresponding Pemasukan transaction for Kas Yayasan
      const { error: keuanganYayasanError } = await supabase
        .from('keuangan')
        .insert({
          tanggal: new Date().toISOString().split('T')[0],
          jenis_transaksi: 'Pemasukan', // To Kas Yayasan perspective
          kategori: 'Bagi Hasil Aset',
          jumlah: preview.bagian_yayasan,
          akun_kas_id: kasYayasan.id, // Credit to Kas Yayasan
          deskripsi: `Bagi Hasil Aset dari Koperasi periode ${data.periode_start} - ${data.periode_end}`,
          referensi: referensi,
          status: 'posted',
          auto_posted: true,
          source_module: 'bagi_hasil',
          source_id: bagiHasilTempId,
        });

      if (keuanganYayasanError) {
        throw new AssetManagementError(
          AssetManagementErrorCode.ASSET_NOT_FOUND,
          'Gagal membuat transaksi keuangan untuk Kas Yayasan: ' + keuanganYayasanError.message
        );
      }

      // 11. Create bagi_hasil_log
      const { data: bagiHasilLog, error: logError } = await supabase
        .from('bagi_hasil_log')
        .insert({
          periode_start: data.periode_start,
          periode_end: data.periode_end,
          total_penjualan: preview.total_penjualan,
          total_hpp: preview.total_hpp,
          laba_kotor: preview.laba_kotor,
          biaya_operasional: data.biaya_operasional,
          laba_bersih: preview.laba_bersih,
          persentase_yayasan: data.persentase_yayasan,
          persentase_koperasi: data.persentase_koperasi,
          bagian_yayasan: preview.bagian_yayasan,
          bagian_koperasi: preview.bagian_koperasi,
          transaksi_keuangan_id: transaksiKeuangan.id, // Reference to keuangan table
          processed_by: user.user.id,
          notes: data.notes,
        })
        .select()
        .single();

      if (logError || !bagiHasilLog) {
        throw new AssetManagementError(
          AssetManagementErrorCode.ASSET_NOT_FOUND,
          'Gagal membuat log bagi hasil: ' + (logError?.message || 'Unknown error')
        );
      }

      // 12. Update source_id in keuangan transactions with actual bagi_hasil_log ID
      await supabase
        .from('keuangan')
        .update({ source_id: bagiHasilLog.id })
        .eq('source_id', bagiHasilTempId);

      // 13. Create bagi_hasil_detail for each penjualan
      if (preview.detail_penjualan.length > 0) {
        const details = preview.detail_penjualan.map(p => ({
          bagi_hasil_id: bagiHasilLog.id,
          penjualan_id: p.penjualan_id,
          inventaris_id: p.inventaris_id,
          quantity: p.quantity,
          harga_jual: p.harga_jual,
          harga_transfer: p.harga_transfer,
          total_penjualan: p.total_penjualan,
          total_hpp: p.total_hpp,
          laba_item: p.laba,
        }));

        const { error: detailError } = await supabase
          .from('bagi_hasil_detail')
          .insert(details);

        if (detailError) {
          throw new AssetManagementError(
            AssetManagementErrorCode.ASSET_NOT_FOUND,
            'Gagal membuat detail bagi hasil: ' + detailError.message
          );
        }
      }

      return bagiHasilLog as BagiHasilLog;
    } catch (error) {
      if (error instanceof AssetManagementError) {
        throw error;
      }
      throw new AssetManagementError(
        AssetManagementErrorCode.ASSET_NOT_FOUND,
        'Terjadi kesalahan saat memproses bagi hasil: ' + (error as Error).message,
        error
      );
    }
  },

  /**
   * Get bagi hasil history
   * Requirements: 6.8
   */
  async getBagiHasilHistory(
    periodeStart?: string,
    periodeEnd?: string
  ): Promise<BagiHasilLog[]> {
    try {
      let query = supabase
        .from('bagi_hasil_log')
        .select(`
          *,
          profiles!bagi_hasil_log_processed_by_fkey(full_name)
        `)
        .order('processed_at', { ascending: false });

      if (periodeStart) {
        query = query.gte('periode_start', periodeStart);
      }
      if (periodeEnd) {
        query = query.lte('periode_end', periodeEnd);
      }

      const { data, error } = await query;
      if (error) {
        throw new AssetManagementError(
          AssetManagementErrorCode.ASSET_NOT_FOUND,
          'Gagal mengambil riwayat bagi hasil: ' + error.message
        );
      }

      return data as any[];
    } catch (error) {
      if (error instanceof AssetManagementError) {
        throw error;
      }
      throw new AssetManagementError(
        AssetManagementErrorCode.ASSET_NOT_FOUND,
        'Terjadi kesalahan saat mengambil riwayat bagi hasil: ' + (error as Error).message,
        error
      );
    }
  },

  /**
   * Get bagi hasil detail by ID
   */
  async getBagiHasilDetail(id: string): Promise<{
    header: BagiHasilLog;
    detail: BagiHasilDetail[];
  }> {
    try {
      if (!id) {
        throw new AssetManagementError(
          AssetManagementErrorCode.ASSET_NOT_FOUND,
          'ID bagi hasil harus diisi'
        );
      }

      // Get header
      const { data: header, error: headerError } = await supabase
        .from('bagi_hasil_log')
        .select(`
          *,
          profiles!bagi_hasil_log_processed_by_fkey(full_name),
          keuangan!bagi_hasil_log_transaksi_keuangan_id_fkey(id, tanggal, jumlah, deskripsi)
        `)
        .eq('id', id)
        .single();

      if (headerError || !header) {
        throw new AssetManagementError(
          AssetManagementErrorCode.ASSET_NOT_FOUND,
          'Bagi hasil tidak ditemukan'
        );
      }

      // Get detail
      const { data: detail, error: detailError } = await supabase
        .from('bagi_hasil_detail')
        .select(`
          *,
          kop_penjualan!bagi_hasil_detail_penjualan_id_fkey(nomor_struk, tanggal),
          inventaris!bagi_hasil_detail_inventaris_id_fkey(nama_barang)
        `)
        .eq('bagi_hasil_id', id)
        .order('created_at');

      if (detailError) {
        throw new AssetManagementError(
          AssetManagementErrorCode.ASSET_NOT_FOUND,
          'Gagal mengambil detail bagi hasil: ' + detailError.message
        );
      }

      return {
        header: header as any,
        detail: (detail || []) as any[],
      };
    } catch (error) {
      if (error instanceof AssetManagementError) {
        throw error;
      }
      throw new AssetManagementError(
        AssetManagementErrorCode.ASSET_NOT_FOUND,
        'Terjadi kesalahan saat mengambil detail bagi hasil: ' + (error as Error).message,
        error
      );
    }
  },
};

};

};

};
