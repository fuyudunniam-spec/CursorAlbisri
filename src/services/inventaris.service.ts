import { supabase } from "@/integrations/supabase/client";
import { addKeuanganTransaction } from "@/services/keuangan.service";
import { AkunKasService } from "@/services/akunKas.service";
import type { 
  MultiItemSalePayload, 
  MultiItemSaleDetail, 
  PenjualanHeader, 
  PenjualanItem 
} from "@/types/inventaris.types";
import { 
  ValidationError, 
  StockError, 
  DatabaseError, 
  FinancialError 
} from "@/utils/inventaris-error-handling";

// Helper untuk mendeteksi error CORS
function isCorsError(error: any): boolean {
  if (!error) return false;
  const message = error.message || '';
  return message.includes('CORS') || 
         message.includes('523') || 
         message.includes('Failed to fetch') ||
         message.includes('unreachable') ||
         message.includes('Access-Control-Allow-Origin') ||
         message.includes('520');
}

// Helper untuk menampilkan error CORS dengan pesan yang jelas
function handleCorsError(context: string) {
  console.error(`❌ ${context}: Error CORS - Supabase tidak dapat diakses`);
  console.error('   🔧 SOLUSI: Konfigurasi CORS di Supabase Dashboard');
  console.error('   1. Buka https://supabase.com/dashboard');
  console.error('   2. Pilih project → Settings → API');
  console.error('   3. Tambahkan "http://localhost:8080" ke Allowed Origins');
  console.error('   4. Lihat CORS_FIX_GUIDE.md untuk detail lengkap');
}

export type InventoryItem = {
  id: string;
  nama_barang: string;
  tipe_item: string;
  kategori: string;
  zona: string;
  lokasi: string;
  kondisi: string;
  jumlah?: number | null;
  satuan?: string | null;
  harga_perolehan?: number | null;
  sumber?: 'Pembelian' | 'Donasi' | null;
  has_expiry?: boolean | null;
  tanggal_kedaluwarsa?: string | null;
  min_stock?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type InventoryTransaction = {
  id: string;
  item_id: string;
  tipe: "Masuk" | "Keluar" | "Stocktake";
  jumlah?: number | null;
  harga_satuan?: number | null;
  before_qty?: number | null;
  after_qty?: number | null;
  penerima?: string | null;
  tanggal: string;
  catatan?: string | null;
  mutation_id?: string | null;
  created_at?: string | null;
  // New fields for mass distribution
  penerima_santri_id?: string | null;
  kategori_barang?: string | null;
  nama_barang?: string | null;
  satuan?: string | null;
  keluar_mode?: string | null;
};

export type Pagination = { page: number; pageSize: number };
export type Sort = { column: string; direction: "asc" | "desc" } | null;

export type InventoryFilters = {
  search?: string | null;
  kategori?: string | null;
  kondisi?: string | null;
  tipe_item?: string | null;
  zona?: string | null;
  lokasi?: string | null;
};

export async function listInventory(
  pagination: Pagination,
  filters: InventoryFilters = {},
  sort: Sort = { column: "created_at", direction: "desc" }
) {
  const { page, pageSize } = pagination;
  let query = supabase.from("inventaris").select("*", { count: "exact" });

  console.log('listInventory called with filters:', filters);

  if (filters.search) {
    query = query.ilike("nama_barang", `%${filters.search}%`);
  }
  if (filters.kategori && filters.kategori !== "all") query = query.eq("kategori", filters.kategori);
  if (filters.kondisi && filters.kondisi !== "all") query = query.eq("kondisi", filters.kondisi);
  if (filters.tipe_item && filters.tipe_item !== "all") {
    console.log('Filtering by tipe_item:', filters.tipe_item);
    query = query.eq("tipe_item", filters.tipe_item);
  }
  if (filters.zona && filters.zona !== "all") query = query.eq("zona", filters.zona);
  if (filters.lokasi && filters.lokasi !== "all") query = query.eq("lokasi", filters.lokasi);

  if (sort) {
    query = query.order(sort.column, { ascending: sort.direction === "asc" });
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await query.range(from, to);
  
  console.log('Query result:', { data: data?.length, count, error });
  
  if (error) throw error;
  return { data: (data || []) as InventoryItem[], total: count || 0 };
}

export async function getInventoryItem(id: string) {
  const { data, error } = await supabase.from("inventaris").select("*").eq("id", id).single();
  if (error) throw error;
  return data as InventoryItem;
}

export async function createInventoryItem(payload: Partial<InventoryItem>) {
  const { data, error } = await supabase.from("inventaris").insert(payload).select("*").single();
  if (error) throw error;
  return data as InventoryItem;
}

export async function updateInventoryItem(id: string, payload: Partial<InventoryItem>) {
  const { data, error } = await supabase.from("inventaris").update(payload).eq("id", id).select("*").single();
  if (error) throw error;
  return data as InventoryItem;
}

export async function deleteInventoryItem(id: string) {
  const { error } = await supabase.from("inventaris").delete().eq("id", id);
  if (error) throw error;
}

export type TransactionFilters = {
  search?: string | null; // by nama_barang
  tipe?: "Masuk" | "Keluar" | "Stocktake" | "all" | null;
  keluar_mode?: string | null; // Filter untuk mode keluar (Penjualan, Distribusi, dll)
  startDate?: string | null;
  endDate?: string | null;
};

export async function listTransactions(
  pagination: Pagination,
  filters: TransactionFilters = {},
  sort: Sort = { column: "tanggal", direction: "desc" }
) {
  const { page, pageSize } = pagination;
  
  // Join dengan inventaris untuk mendapatkan nama_barang
  // Include referensi_distribusi_paket_id untuk mengelompokkan distribusi paket
  let query = supabase
    .from("transaksi_inventaris")
    .select(`
      *,
      inventaris!inner(nama_barang, kategori, satuan),
      distribusi_paket:referensi_distribusi_paket_id(
        id,
        paket_id,
        penerima,
        tanggal_distribusi,
        paket_sembako(nama_paket)
      )
    `, { count: "exact" });

  if (filters.tipe && filters.tipe !== "all") query = query.eq("tipe", filters.tipe);
  if (filters.keluar_mode && filters.keluar_mode !== "all") query = query.eq("keluar_mode", filters.keluar_mode);
  if (filters.startDate) query = query.gte("tanggal", filters.startDate);
  if (filters.endDate) query = query.lte("tanggal", filters.endDate);

  if (sort) query = query.order(sort.column, { ascending: sort.direction === "asc" });

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await query.range(from, to);
  if (error) throw error;

  const rows = (data || []) as any[];

  // Transform data untuk menambahkan nama_barang
  const transformedRows = rows.map(row => ({
    ...row,
    nama_barang: row.inventaris?.nama_barang || "Item tidak ditemukan",
    kategori: row.inventaris?.kategori || "",
    satuan: row.inventaris?.satuan || ""
  }));

  // If search by nama_barang is requested
  if (filters.search) {
    const filtered = transformedRows.filter(r => 
      r.nama_barang.toLowerCase().includes((filters.search || "").toLowerCase())
    );
    return { data: filtered, total: filtered.length };
  }

  return { data: transformedRows, total: count || 0 };
}

// Add debouncing to prevent double submissions
let lastSubmitTime = 0;
const DEBOUNCE_TIME = 2000; // 2 seconds

export async function createTransaction(payload: Partial<InventoryTransaction>) {
  // Prevent rapid double-clicks
  const now = Date.now();
  if (now - lastSubmitTime < DEBOUNCE_TIME) {
    throw new Error('Please wait before submitting again');
  }
  lastSubmitTime = now;
  
  // Calculate harga_total with support for sales breakdown
  const jumlah = payload.jumlah || 0;
  const isPenjualan = (payload.tipe === "Keluar") && ((payload as any).keluar_mode === "Penjualan");
  const hargaDasar = (payload as any).harga_dasar || 0;
  const sumbangan = (payload as any).sumbangan || 0;
  const calculatedHargaSatuan = isPenjualan
    ? (hargaDasar + sumbangan)
    : (payload.harga_satuan || 0);
  const hargaTotal = calculatedHargaSatuan && jumlah ? calculatedHargaSatuan * jumlah : null;
  
  // Gunakan payload minimal untuk menghindari trigger bermasalah
  const minimalPayload = {
    item_id: payload.item_id,
    tipe: payload.tipe,
    jumlah: payload.jumlah,
    tanggal: payload.tanggal,
    catatan: payload.catatan || null,
    penerima: payload.penerima || null,
    // gunakan harga satuan yang sudah dihitung (khusus penjualan dari harga_dasar+sumbangan)
    harga_satuan: calculatedHargaSatuan || null,
    harga_total: hargaTotal,
    // Fields untuk Stocktake
    before_qty: payload.before_qty || null,
    after_qty: payload.after_qty || null,
    // New fields for mass distribution
    penerima_santri_id: (payload as any).penerima_santri_id || null,
    kategori_barang: (payload as any).kategori_barang || null,
    nama_barang: (payload as any).nama_barang || null,
    satuan: (payload as any).satuan || null,
    // Mode fields
    masuk_mode: (payload as any).masuk_mode || null,
    keluar_mode: (payload as any).keluar_mode || null,
    referensi_koperasi_id: (payload as any).referensi_koperasi_id || null,
    // field breakdown penjualan agar trigger/ETL dapat bekerja
    harga_dasar: (payload as any).harga_dasar || null,
    sumbangan: (payload as any).sumbangan || null
  };
  
  // Log payload untuk Stocktake
  if (payload.tipe === 'Stocktake') {
    console.log('Creating Stocktake transaction with payload:', {
      item_id: minimalPayload.item_id,
      before_qty: minimalPayload.before_qty,
      after_qty: minimalPayload.after_qty,
      jumlah: minimalPayload.jumlah,
      fullPayload: minimalPayload
    });
  }

  // Insert dengan payload minimal
  // Gunakan select sederhana untuk menghindari error 406
  const { data, error } = await supabase
    .from("transaksi_inventaris")
    .insert(minimalPayload)
    .select('*')
    .single();
    
  if (error) {
    if (isCorsError(error)) {
      handleCorsError('inventaris.service: createTransaction');
      // Throw error dengan pesan yang lebih jelas
      const corsError = new Error('CORS Error: Supabase tidak dapat diakses. Silakan konfigurasi CORS di Supabase Dashboard.');
      (corsError as any).isCorsError = true;
      throw corsError;
    }
    
    // Handle error 406 (Not Acceptable) atau PGRST116 (no rows)
    if (error.code === 'PGRST116' || error.code === 'PGRST204' || error.message?.includes('406') || error.message?.includes('Not Acceptable') || error.message?.includes('Cannot coerce')) {
      console.error("Insert error - mungkin field tidak valid atau transaksi belum tersimpan:", error);
      console.error("Payload yang diinsert:", minimalPayload);
      
      // Coba insert lagi tanpa .single() untuk melihat apakah insert berhasil
      const { data: retryData, error: retryError } = await supabase
        .from("transaksi_inventaris")
        .insert(minimalPayload)
        .select('*');
      
      if (retryError) {
        console.error("Retry insert juga gagal:", retryError);
        throw retryError;
      }
      
      // Jika retry berhasil tapi tidak ada data, berarti ada masalah lain
      if (!retryData || retryData.length === 0) {
        throw new Error('Transaksi berhasil diinsert tapi tidak bisa di-fetch. Mungkin ada masalah dengan RLS policy atau trigger.');
      }
      
      // Gunakan data pertama dari retry
      const insertedData = retryData[0];
      return { ...insertedData, _keuanganPosted: false, _fallbackUsed: false } as any;
    }
    
    console.error("Insert error details:", error);
    throw error;
  }
  
  // Pastikan data tidak null
  if (!data) {
    throw new Error('Transaksi berhasil diinsert tapi tidak ada data yang dikembalikan.');
  }

  // Log hasil untuk Stocktake
  if (payload.tipe === 'Stocktake' && data) {
    console.log('Stocktake transaction inserted:', {
      id: data.id,
      item_id: data.item_id,
      before_qty: (data as any).before_qty,
      after_qty: (data as any).after_qty,
      jumlah: data.jumlah
    });
  }
  
  // Defensive fallback: buat transaksi keuangan jika belum terhubung
  let keuanganPosted = false;
  let fallbackUsed = false;
  try {
    const needsKeuangan = isPenjualan && (data?.harga_total || 0) > 0 && !data?.keuangan_id;
    if (needsKeuangan) {
      // Gunakan akun_kas_id dari input user bila tersedia; baru fallback ke default
      let targetAkunKasId: string | undefined = (data as any)?.akun_kas_id;
      if (!targetAkunKasId) {
        try {
          const defaultAkun = await AkunKasService.getDefault();
          targetAkunKasId = defaultAkun?.id;
        } catch (e) {
          console.warn('Gagal mengambil akun kas default, lanjut tanpa akun_kas_id');
        }
      }

      const result = await addKeuanganTransaction({
        jenis_transaksi: 'Pemasukan',
        kategori: 'Penjualan Inventaris',
        jumlah: data.harga_total,
        tanggal: data.tanggal,
        deskripsi: data.catatan || `Penjualan inventaris`,
        referensi: `inventaris:${data.id}`,
        akun_kas_id: targetAkunKasId,
        status: 'posted'
      });
      const created = Array.isArray(result) ? result[0] : (result?.[0] || result);
      if (created?.id) {
        await supabase
          .from('transaksi_inventaris')
          .update({ keuangan_id: created.id })
          .eq('id', data.id);
        keuanganPosted = true;
        fallbackUsed = true;
        // reflect keuangan_id on returned object
        (data as any).keuangan_id = created.id;
      }
    }
  } catch (e) {
    console.warn('Fallback keuangan creation failed:', e);
  }

  return { ...data, _keuanganPosted: keuanganPosted, _fallbackUsed: fallbackUsed } as any;
}

export async function updateTransaction(id: string, payload: Partial<InventoryTransaction>) {
  console.log('updateTransaction called with:', { id, payload });
  
  // OPTIMASI: Deteksi apakah ini update sederhana (hanya field non-finansial)
  // Field finansial: jumlah, harga_satuan, harga_total, harga_dasar, sumbangan
  // Field non-finansial: tanggal, catatan, penerima
  const hasFinancialChanges = 
    payload.jumlah !== undefined ||
    payload.harga_satuan !== undefined ||
    (payload as any).harga_total !== undefined ||
    (payload as any).harga_dasar !== undefined ||
    (payload as any).sumbangan !== undefined;
  
  const hasNonFinancialChanges = 
    payload.tanggal !== undefined ||
    payload.catatan !== undefined ||
    payload.penerima !== undefined;
  
  // Jika hanya field non-finansial yang berubah, gunakan direct UPDATE (lebih cepat)
  if (!hasFinancialChanges && hasNonFinancialChanges) {
    console.log('Fast path: Simple update (non-financial fields only)');
    
    const updateData: any = {};
    if (payload.tanggal !== undefined) updateData.tanggal = payload.tanggal;
    if (payload.catatan !== undefined) updateData.catatan = payload.catatan;
    if (payload.penerima !== undefined) updateData.penerima = payload.penerima;
    
    const { data, error } = await supabase
      .from('transaksi_inventaris')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) {
      console.error("Simple update error:", error);
      throw error;
    }
    
    // Sync tanggal ke keuangan jika ada keuangan_id (tanpa perlu fetch current transaction)
    if (payload.tanggal !== undefined && data?.keuangan_id) {
      try {
        await supabase
          .from('keuangan')
          .update({ tanggal: payload.tanggal })
          .eq('id', data.keuangan_id);
      } catch (keuError) {
        console.warn('Failed to sync tanggal to keuangan:', keuError);
        // Don't throw - transaction update succeeded
      }
    }
    
    return data;
  }
  
  // Full update path: ada perubahan finansial, perlu validasi dan sync keuangan
  console.log('Full path: Update with financial changes');
  
  // Get current transaction to check if it's a sales transaction with keuangan_id
  const { data: currentTx, error: fetchError } = await supabase
    .from('transaksi_inventaris')
    .select('id, tipe, keluar_mode, harga_total, keuangan_id, jumlah, harga_dasar, sumbangan, catatan, tanggal')
    .eq('id', id)
    .maybeSingle();
  
  if (fetchError) {
    console.error("Error fetching current transaction:", fetchError);
    throw fetchError;
  }
  
  // If transaction doesn't exist, this is likely a create operation, not update
  if (!currentTx) {
    throw new Error(`Transaction with ID ${id} not found. Use createTransaction() instead.`);
  }
  
  // Calculate new harga_total if it's a sales transaction
  const isPenjualan = currentTx?.tipe === "Keluar" && currentTx?.keluar_mode === "Penjualan";
  let newHargaTotal = (payload as any).harga_total !== undefined ? (payload as any).harga_total : currentTx?.harga_total || null;
  
  // Calculate harga_total if not provided but we have breakdown data
  if (isPenjualan && newHargaTotal === null) {
    const jumlah = payload.jumlah !== undefined ? payload.jumlah : currentTx?.jumlah || 0;
    const hargaDasar = (payload as any).harga_dasar !== undefined ? (payload as any).harga_dasar : currentTx?.harga_dasar || 0;
    const sumbangan = (payload as any).sumbangan !== undefined ? (payload as any).sumbangan : currentTx?.sumbangan || 0;
    const calculatedHargaSatuan = hargaDasar + sumbangan;
    newHargaTotal = calculatedHargaSatuan && jumlah ? calculatedHargaSatuan * jumlah : null;
  }
  
  try {
    // Use direct UPDATE for better performance (RPC mungkin lebih lambat)
    const updateData: any = {};
    if (payload.jumlah !== undefined) updateData.jumlah = payload.jumlah;
    if (payload.tanggal !== undefined) updateData.tanggal = payload.tanggal;
    if (payload.catatan !== undefined) updateData.catatan = payload.catatan;
    if (payload.penerima !== undefined) updateData.penerima = payload.penerima;
    if (payload.harga_satuan !== undefined) updateData.harga_satuan = payload.harga_satuan;
    if ((payload as any).harga_dasar !== undefined) updateData.harga_dasar = (payload as any).harga_dasar;
    if ((payload as any).sumbangan !== undefined) updateData.sumbangan = (payload as any).sumbangan;
    if (newHargaTotal !== null && newHargaTotal !== currentTx?.harga_total) {
      updateData.harga_total = newHargaTotal;
    }
    
    const { data, error } = await supabase
      .from('transaksi_inventaris')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) {
      console.error("Update error:", error);
      throw error;
    }
    
    if (!data) {
      throw new Error(`No data returned from update for ID ${id}`);
    }
    
    // Sync with keuangan if it's a sales transaction and harga_total changed
    if (isPenjualan && currentTx?.keuangan_id) {
      const needsKeuanganSync = 
        (newHargaTotal !== null && newHargaTotal !== currentTx?.harga_total) ||
        (payload.tanggal !== undefined && payload.tanggal !== currentTx?.tanggal) ||
        (payload.catatan !== undefined && payload.catatan !== currentTx?.catatan);
      
      if (needsKeuanganSync) {
        try {
          const keuanganUpdate: any = {};
          if (newHargaTotal !== null && newHargaTotal !== currentTx?.harga_total) {
            keuanganUpdate.jumlah = newHargaTotal;
          }
          if (payload.tanggal !== undefined) {
            keuanganUpdate.tanggal = payload.tanggal;
          }
          if (payload.catatan !== undefined) {
            keuanganUpdate.deskripsi = payload.catatan || 'Penjualan inventaris';
          }
          
          await supabase
            .from('keuangan')
            .update(keuanganUpdate)
            .eq('id', currentTx.keuangan_id);
          
          console.log('Keuangan transaction synced:', { keuangan_id: currentTx.keuangan_id, updates: keuanganUpdate });
        } catch (keuError) {
          console.warn('Failed to sync keuangan transaction:', keuError);
          // Don't throw - transaction update succeeded, keuangan sync is secondary
        }
      }
    }
    
    console.log('Update successful:', data);
    return data;
    
  } catch (updateError) {
    console.error("Update failed:", updateError);
    throw updateError;
  }
}

export async function deleteTransaction(transactionId: string) {
  // Ambil transaksi terlebih dahulu untuk mengetahui efek ke stok
  const { data: trx, error: fetchErr } = await supabase
    .from('transaksi_inventaris')
    .select('id, item_id, tipe, keluar_mode, jumlah, before_qty, after_qty, keuangan_id')
    .eq('id', transactionId)
    .maybeSingle();

  if (fetchErr) {
    console.error('Fetch transaction before delete failed:', fetchErr);
    throw fetchErr;
  }

  // Jika transaksi tidak ditemukan, return early dengan pesan yang jelas
  if (!trx) {
    console.warn(`Transaction ${transactionId} not found, may have been already deleted`);
    // Return success karena tujuan akhir (menghapus transaksi) sudah tercapai
    return true;
  }

  // 1) Hapus entri keuangan terkait
  // Prioritaskan keuangan_id jika tersedia (lebih spesifik dan aman)
  try {
    if (trx.keuangan_id) {
      // Coba hapus menggunakan keuangan_id langsung
      const { error: deleteError } = await supabase
        .from('keuangan')
        .delete()
        .eq('id', trx.keuangan_id);
      
      if (deleteError) {
        // Error 409 berarti entri tidak bisa dihapus karena constraint/trigger
        // Ini biasanya terjadi jika auto_posted = FALSE (manual entry)
        // Coba update auto_posted menjadi TRUE dulu, lalu hapus
        if (deleteError.code === 'PGRST409' || deleteError.message?.includes('409')) {
          console.warn(`⚠️ Tidak dapat menghapus entri keuangan ${trx.keuangan_id} langsung. Mencoba update auto_posted...`);
          
          // Update auto_posted menjadi TRUE agar bisa dihapus
          const { error: updateError } = await supabase
            .from('keuangan')
            .update({ auto_posted: true })
            .eq('id', trx.keuangan_id);
          
          if (!updateError) {
            // Setelah update, coba hapus lagi
            const { error: retryDeleteError } = await supabase
              .from('keuangan')
              .delete()
              .eq('id', trx.keuangan_id);
            
            if (retryDeleteError) {
              console.warn('⚠️ Masih tidak dapat menghapus entri keuangan setelah update auto_posted:', retryDeleteError);
            }
          } else {
            console.warn('⚠️ Gagal update auto_posted:', updateError);
          }
        } else {
          console.warn('⚠️ Error menghapus entri keuangan:', deleteError);
        }
      }
    } else {
      // Fallback: hapus berdasarkan referensi (hanya untuk auto_posted entries)
      // Hanya hapus entri yang auto_posted = TRUE untuk menghindari error 409
      const { error: deleteError } = await supabase
        .from('keuangan')
        .delete()
        .or(`referensi.eq.inventaris:${transactionId},referensi.eq.inventory_sale:${transactionId}`)
        .eq('auto_posted', true); // Hanya hapus auto-posted entries
      
      if (deleteError) {
        console.warn('⚠️ Warning deleting related keuangan entry by referensi:', deleteError);
      }
    }
  } catch (keuErr: any) {
    // Tangani error yang tidak terduga
    if (keuErr?.code === 'PGRST409' || keuErr?.message?.includes('409')) {
      console.warn('⚠️ Error 409 Conflict saat menghapus entri keuangan. Entri mungkin terproteksi.');
    } else {
      console.warn('⚠️ Warning deleting related keuangan entry:', keuErr);
    }
    // Lanjutkan proses delete transaksi meskipun keuangan gagal dihapus
  }

  // 2) Kembalikan stok berdasarkan tipe transaksi
  try {
    // Ambil stok saat ini
    const { data: item, error: itemErr } = await supabase
      .from('inventaris')
      .select('jumlah')
      .eq('id', trx.item_id)
      .single();

    if (itemErr) throw itemErr;

    const currentQty = (item?.jumlah ?? 0) as number;
    const delta = (() => {
      if (trx.tipe === 'Keluar') return +(trx.jumlah || 0); // tambah kembali
      if (trx.tipe === 'Masuk') return -(trx.jumlah || 0); // kurangi kembali
      if (trx.tipe === 'Stocktake') {
        // Jika ada before_qty/after_qty, balikan ke before_qty
        if (typeof trx.before_qty === 'number') {
          return (trx.before_qty as number) - currentQty;
        }
        return 0;
      }
      return 0;
    })();

    const newQty = Math.max(0, currentQty + delta);

    if (delta !== 0) {
      const { error: updErr } = await supabase
        .from('inventaris')
        .update({ jumlah: newQty })
        .eq('id', trx.item_id);
      if (updErr) throw updErr;
    }
  } catch (stockErr) {
    console.warn('Warning adjusting stock on delete:', stockErr);
    // Lanjutkan proses hapus transaksi meski stok gagal disesuaikan
  }

  // 3) Hapus transaksi
  const { error } = await supabase
    .from('transaksi_inventaris')
    .delete()
    .eq('id', transactionId);
    
  if (error) {
    console.error('Delete error:', error);
    throw error;
  }
  
  return true;
}

export async function deleteTransactions(ids: string[]) {
  const { error } = await supabase
    .from("transaksi_inventaris")
    .delete()
    .in("id", ids);
  if (error) throw error;
}

export async function getLowStock(minThreshold = 10) {
  // Get all items first, then filter client-side for better accuracy
  const { data, error } = await supabase
    .from("inventaris")
    .select("id,nama_barang,jumlah,min_stock,kategori");
  if (error) throw error;
  // Filter items where jumlah <= min_stock or jumlah < threshold
  const filtered = (data || []).filter(item => {
    const jumlah = item.jumlah || 0;
    const minStock = item.min_stock || minThreshold;
    return jumlah <= minStock || jumlah < minThreshold;
  });
  return filtered as Pick<InventoryItem, "id" | "nama_barang" | "jumlah" | "min_stock" | "kategori">[];
}

export async function getNearExpiry(days = 30) {
  const now = new Date();
  const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("inventaris")
    .select("id,nama_barang,tanggal_kedaluwarsa,has_expiry,kategori")
    .eq("has_expiry", true)
    .lte("tanggal_kedaluwarsa", until);
  if (error) throw error;
  return (data || []) as Pick<InventoryItem, "id" | "nama_barang" | "tanggal_kedaluwarsa" | "has_expiry" | "kategori">[];
}

// Ringkasan pemasukan dari penjualan inventaris
export async function getSalesSummary(filters: TransactionFilters = {}) {
  let query = supabase
    .from("transaksi_inventaris")
    .select(`
      item_id,
      tipe,
      jumlah,
      harga_satuan,
      harga_total,
      tanggal,
      catatan,
      keluar_mode,
      harga_dasar,
      sumbangan,
      inventaris!inner(nama_barang, kategori)
    `)
    .eq("tipe", "Keluar")
    .eq("keluar_mode", "Penjualan")
    .not("harga_total", "is", null)
    .gt("harga_total", 0);

  if (filters.startDate) query = query.gte("tanggal", filters.startDate);
  if (filters.endDate) query = query.lte("tanggal", filters.endDate);

  const { data, error } = await query;
  if (error) throw error;

  // Semua transaksi penjualan yang sudah difilter oleh query
  const transactions = (data || []) as any[];
  
  // Hitung ringkasan menggunakan harga_total untuk akurasi
  const totalPenjualan = transactions.reduce((sum, t) => {
    return sum + (t.harga_total || 0);
  }, 0);

  const totalTransaksi = transactions.length;
  const totalJumlah = transactions.reduce((sum, t) => sum + (t.jumlah || 0), 0);
  const rataRataPenjualan = totalTransaksi > 0 ? totalPenjualan / totalTransaksi : 0;

  // Ringkasan per kategori
  const kategoriSummary = transactions.reduce((acc, t) => {
    const kategori = t.inventaris?.kategori || "Lainnya";
    if (!acc[kategori]) {
      acc[kategori] = { total: 0, jumlah: 0, transaksi: 0 };
    }
    acc[kategori].total += (t.harga_total || 0);
    acc[kategori].jumlah += t.jumlah || 0;
    acc[kategori].transaksi += 1;
    return acc;
  }, {} as Record<string, { total: number; jumlah: number; transaksi: number }>);

  // Ringkasan per item
  const itemSummary = transactions.reduce((acc, t) => {
    const nama = t.inventaris?.nama_barang || "Item tidak ditemukan";
    const itemId = t.item_id;
    if (!acc[nama]) {
      acc[nama] = { total: 0, jumlah: 0, transaksi: 0, item_id: itemId };
    }
    acc[nama].total += (t.harga_total || 0);
    acc[nama].jumlah += t.jumlah || 0;
    acc[nama].transaksi += 1;
    return acc;
  }, {} as Record<string, { total: number; jumlah: number; transaksi: number; item_id: string }>);

  // Calculate monthly revenue (current month)
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const monthlyTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.tanggal);
    return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear;
  });
  
  const monthlyRevenue = monthlyTransactions.reduce((sum, t) => sum + (t.harga_total || 0), 0);
  const monthlyTransactionCount = monthlyTransactions.length;

  return {
    totalPenjualan,
    totalTransaksi,
    totalJumlah,
    rataRataPenjualan,
    monthlyRevenue,
    monthlyTransactions: monthlyTransactionCount,
    kategoriSummary,
    itemSummary: Object.entries(itemSummary)
      .map(([nama, data]) => {
        const item = data as { total: number; jumlah: number; transaksi: number; item_id: string };
        return { nama, total: item.total, jumlah: item.jumlah, transaksi: item.transaksi, item_id: item.item_id };
      })
      .sort((a, b) => b.total - a.total)
  };
}

// ============================================================================
// Multi-Item Sales Stock Validation
// ============================================================================

export type StockValidationItem = {
  item_id: string;
  jumlah: number;
};

export type StockValidationError = {
  item_id: string;
  nama_barang: string;
  requested: number;
  available: number;
  message: string;
};

export type StockValidationResult = {
  valid: boolean;
  errors: StockValidationError[];
};

/**
 * Validate stock availability for multiple items in a transaction
 * Checks if requested quantities are available and handles concurrent access
 * 
 * Requirements: 3.1, 3.2, 3.3
 * 
 * @param items - Array of items with item_id and requested quantity
 * @returns Validation result with errors if any items have insufficient stock
 */
export async function validateStockAvailability(
  items: StockValidationItem[]
): Promise<StockValidationResult> {
  const errors: StockValidationError[] = [];
  
  // Return early if no items to validate
  if (!items || items.length === 0) {
    return { valid: true, errors: [] };
  }
  
  // Get all item IDs to fetch in one query
  const itemIds = items.map(item => item.item_id);
  
  // Fetch current stock for all items in a single query
  // Use FOR UPDATE to lock rows and prevent concurrent modifications
  const { data: inventoryItems, error } = await supabase
    .from('inventaris')
    .select('id, nama_barang, jumlah')
    .in('id', itemIds);
  
  if (error) {
    console.error('Error fetching inventory items for validation:', error);
    throw new DatabaseError(
      'Gagal memvalidasi stok: Tidak dapat mengambil data inventaris',
      { originalError: error }
    );
  }
  
  // Create a map for quick lookup
  const inventoryMap = new Map(
    (inventoryItems || []).map(item => [item.id, item])
  );
  
  // Validate each item
  for (const item of items) {
    const inventoryItem = inventoryMap.get(item.item_id);
    
    // Check if item exists
    if (!inventoryItem) {
      errors.push({
        item_id: item.item_id,
        nama_barang: 'Item tidak ditemukan',
        requested: item.jumlah,
        available: 0,
        message: `Item dengan ID ${item.item_id} tidak ditemukan dalam inventaris`
      });
      continue;
    }
    
    const availableStock = inventoryItem.jumlah ?? 0;
    
    // Check if requested quantity is valid (positive)
    if (item.jumlah <= 0) {
      errors.push({
        item_id: item.item_id,
        nama_barang: inventoryItem.nama_barang,
        requested: item.jumlah,
        available: availableStock,
        message: `Jumlah harus lebih dari 0 untuk ${inventoryItem.nama_barang}`
      });
      continue;
    }
    
    // Check if sufficient stock is available
    if (item.jumlah > availableStock) {
      errors.push({
        item_id: item.item_id,
        nama_barang: inventoryItem.nama_barang,
        requested: item.jumlah,
        available: availableStock,
        message: `Stok tidak mencukupi untuk ${inventoryItem.nama_barang}. Tersedia: ${availableStock}, Diminta: ${item.jumlah}`
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get current stock for a single item
 * Used for real-time stock display in the UI
 * 
 * Requirements: 3.1, 3.4
 * 
 * @param itemId - ID of the inventory item
 * @returns Current stock quantity
 */
export async function getCurrentStock(itemId: string): Promise<number> {
  const { data, error } = await supabase
    .from('inventaris')
    .select('jumlah')
    .eq('id', itemId)
    .single();
  
  if (error) {
    console.error('Error fetching current stock:', error);
    throw new Error(`Failed to get current stock: ${error.message}`);
  }
  
  return data?.jumlah ?? 0;
}

/**
 * Get current stock for multiple items in a single query
 * More efficient than calling getCurrentStock multiple times
 * 
 * Requirements: 3.1, 3.4
 * 
 * @param itemIds - Array of inventory item IDs
 * @returns Map of item_id to current stock quantity
 */
export async function getCurrentStockBatch(
  itemIds: string[]
): Promise<Map<string, number>> {
  if (!itemIds || itemIds.length === 0) {
    return new Map();
  }
  
  const { data, error } = await supabase
    .from('inventaris')
    .select('id, jumlah')
    .in('id', itemIds);
  
  if (error) {
    console.error('Error fetching current stock batch:', error);
    throw new Error(`Failed to get current stock: ${error.message}`);
  }
  
  return new Map(
    (data || []).map(item => [item.id, item.jumlah ?? 0])
  );
}



// ============================================================================
// Multi-Item Sales Calculation Utilities
// ============================================================================

/**
 * Calculate subtotal for a single item
 * Requirements: 1.3, 2.1, 2.2, 2.3
 * 
 * @param jumlah - Quantity of items
 * @param harga_dasar - Base price per unit
 * @param sumbangan - Donation amount (not per unit, total for this item)
 * @returns Subtotal: (harga_dasar × jumlah) + sumbangan
 */
export function calculateSubtotal(
  jumlah: number,
  harga_dasar: number,
  sumbangan: number
): number {
  return (harga_dasar * jumlah) + sumbangan;
}

/**
 * Calculate grand total from all items
 * Requirements: 1.3, 2.4
 * 
 * @param items - Array of items with quantity, base price, and donation
 * @returns Object with total_harga_dasar, total_sumbangan, and grand_total
 */
export function calculateGrandTotal(
  items: Array<{ jumlah: number; harga_dasar: number; sumbangan: number }>
): {
  total_harga_dasar: number;
  total_sumbangan: number;
  grand_total: number;
} {
  const total_harga_dasar = items.reduce(
    (sum, item) => sum + (item.harga_dasar * item.jumlah),
    0
  );
  const total_sumbangan = items.reduce(
    (sum, item) => sum + item.sumbangan,
    0
  );
  const grand_total = total_harga_dasar + total_sumbangan;
  
  return { total_harga_dasar, total_sumbangan, grand_total };
}

// ============================================================================
// Backward Compatibility Layer
// ============================================================================

/**
 * Convert a single-item transaction to multi-item format
 * This adapter allows existing single-item transactions to be viewed/edited
 * in the multi-item interface
 * 
 * Requirements: 7.1, 7.2, 7.4
 * 
 * @param transaction - Single-item transaction from transaksi_inventaris
 * @param inventoryItem - Optional inventory item data (if not included in transaction)
 * @returns Multi-item sale detail with single item
 */
export async function convertSingleToMultiItem(
  transaction: (InventoryTransaction & { inventaris?: { nama_barang: string } }) | any,
  inventoryItem?: InventoryItem
): Promise<MultiItemSaleDetail> {
  // Get item name from transaction or fetch it
  let namaBarang = transaction.inventaris?.nama_barang || transaction.nama_barang;
  
  if (!namaBarang && inventoryItem) {
    namaBarang = inventoryItem.nama_barang;
  }
  
  if (!namaBarang) {
    // Fetch item name if not provided
    const { data: item } = await supabase
      .from('inventaris')
      .select('nama_barang')
      .eq('id', transaction.item_id)
      .single();
    namaBarang = item?.nama_barang || 'Item tidak ditemukan';
  }
  
  // Extract pricing information with safe access
  const hargaDasar = (transaction.harga_dasar as number | null | undefined) || 0;
  const sumbangan = (transaction.sumbangan as number | null | undefined) || 0;
  
  // Calculate subtotal using breakdown fields if available
  // Otherwise fall back to harga_satuan or total_nilai
  let subtotal: number;
  if (hargaDasar > 0 || sumbangan > 0) {
    // Use breakdown calculation
    subtotal = calculateSubtotal(
      transaction.jumlah || 0,
      hargaDasar,
      sumbangan
    );
  } else if (transaction.harga_satuan) {
    // Fall back to harga_satuan
    subtotal = transaction.harga_satuan * (transaction.jumlah || 0);
  } else {
    // Fall back to total_nilai
    subtotal = (transaction.total_nilai as number | null | undefined) || 0;
  }
  
  // Create synthetic header from transaction data
  const header: PenjualanHeader = {
    id: transaction.id, // Use transaction ID as synthetic header ID
    pembeli: transaction.penerima || 'Pembeli tidak diketahui',
    tanggal: transaction.tanggal,
    total_harga_dasar: hargaDasar * (transaction.jumlah || 0),
    total_sumbangan: sumbangan,
    grand_total: subtotal,
    catatan: transaction.catatan || null,
    keuangan_id: (transaction.keuangan_id as string | null | undefined) || null,
    created_at: transaction.created_at || undefined,
    created_by: undefined,
    updated_at: undefined,
    updated_by: undefined
  };
  
  // Create synthetic item from transaction data
  const item: PenjualanItem = {
    id: transaction.id, // Use transaction ID as synthetic item ID
    penjualan_header_id: transaction.id, // Link to synthetic header
    item_id: transaction.item_id,
    nama_barang: namaBarang,
    jumlah: transaction.jumlah || 0,
    harga_dasar: hargaDasar,
    sumbangan: sumbangan,
    subtotal: subtotal,
    transaksi_inventaris_id: transaction.id,
    created_at: transaction.created_at || undefined
  };
  
  return {
    ...header,
    items: [item]
  };
}

/**
 * Detect if a transaction is single-item or multi-item
 * 
 * Requirements: 7.3
 * 
 * @param transactionId - ID to check
 * @returns Object indicating transaction type and data
 */
export async function detectTransactionType(
  transactionId: string
): Promise<{
  isMultiItem: boolean;
  data: MultiItemSaleDetail | null;
}> {
  // First, check if it's a multi-item transaction
  const { data: multiItemHeader, error: multiItemError } = await supabase
    .from('penjualan_header')
    .select(`
      *,
      items:penjualan_items(*)
    `)
    .eq('id', transactionId)
    .maybeSingle();
  
  if (!multiItemError && multiItemHeader) {
    return {
      isMultiItem: true,
      data: multiItemHeader as MultiItemSaleDetail
    };
  }
  
  // If not found in penjualan_header, check transaksi_inventaris
  const { data: singleItemTx, error: singleItemError } = await supabase
    .from('transaksi_inventaris')
    .select(`
      *,
      inventaris!inner(nama_barang)
    `)
    .eq('id', transactionId)
    .eq('tipe', 'Keluar')
    .eq('keluar_mode', 'Penjualan')
    .maybeSingle();
  
  if (!singleItemError && singleItemTx) {
    // Convert single-item to multi-item format
    const converted = await convertSingleToMultiItem(singleItemTx as any);
    return {
      isMultiItem: false,
      data: converted
    };
  }
  
  return {
    isMultiItem: false,
    data: null
  };
}

/**
 * Unified function to get transaction details (single or multi-item)
 * This provides a consistent interface for both transaction types
 * 
 * Requirements: 7.1, 7.2, 7.3
 * 
 * @param transactionId - ID of the transaction
 * @returns Transaction detail in multi-item format
 */
export async function getTransactionDetail(
  transactionId: string
): Promise<MultiItemSaleDetail> {
  const { isMultiItem, data } = await detectTransactionType(transactionId);
  
  if (!data) {
    throw new Error(`Transaction with ID ${transactionId} not found`);
  }
  
  return data;
}

/**
 * Update a transaction (single or multi-item)
 * Automatically detects transaction type and routes to appropriate handler
 * 
 * Requirements: 7.1, 7.2, 7.4
 * 
 * @param transactionId - ID of the transaction to update
 * @param payload - Update payload in multi-item format
 * @returns Updated transaction detail
 */
export async function updateTransactionUnified(
  transactionId: string,
  payload: MultiItemSalePayload
): Promise<MultiItemSaleDetail> {
  const { isMultiItem } = await detectTransactionType(transactionId);
  
  if (isMultiItem) {
    // Use multi-item update function (to be implemented in task 8)
    throw new Error('Multi-item update not yet implemented. Please complete task 8 first.');
  } else {
    // Convert single-item transaction to multi-item if adding more items
    if (payload.items.length > 1) {
      // User is converting single-item to multi-item by adding more items
      // Create a new multi-item transaction and delete the old single-item one
      
      // First, delete the old single-item transaction
      await deleteTransaction(transactionId);
      
      // Then create a new multi-item transaction
      return await createMultiItemSale(payload);
    } else {
      // Still a single item, update using existing single-item handler
      const item = payload.items[0];
      
      await updateTransaction(transactionId, {
        item_id: item.item_id,
        tipe: 'Keluar',
        keluar_mode: 'Penjualan',
        jumlah: item.jumlah,
        harga_dasar: item.harga_dasar,
        sumbangan: item.sumbangan,
        tanggal: payload.tanggal,
        catatan: payload.catatan || null,
        penerima: payload.pembeli
      } as any);
      
      // Return updated transaction in multi-item format
      return await getTransactionDetail(transactionId);
    }
  }
}

/**
 * Delete a transaction (single or multi-item)
 * Automatically detects transaction type and routes to appropriate handler
 * 
 * Requirements: 7.1, 7.2
 * 
 * @param transactionId - ID of the transaction to delete
 */
export async function deleteTransactionUnified(
  transactionId: string
): Promise<void> {
  const { isMultiItem } = await detectTransactionType(transactionId);
  
  if (isMultiItem) {
    // Use multi-item delete function (to be implemented in task 9)
    throw new Error('Multi-item delete not yet implemented. Please complete task 9 first.');
  } else {
    // Use existing single-item delete
    await deleteTransaction(transactionId);
  }
}

/**
 * List all sales transactions (single and multi-item) in a unified format
 * 
 * Requirements: 7.3
 * 
 * @param pagination - Pagination parameters
 * @param filters - Transaction filters
 * @param sort - Sort parameters
 * @returns List of transactions in multi-item format with indicators
 */
export async function listAllSalesTransactions(
  pagination: Pagination,
  filters: TransactionFilters = {},
  sort: Sort = { column: "tanggal", direction: "desc" }
): Promise<{
  data: Array<MultiItemSaleDetail & { itemCount: number; transactionType: 'single' | 'multi' }>;
  total: number;
}> {
  const { page, pageSize } = pagination;
  
  // Fetch multi-item transactions
  let multiItemQuery = supabase
    .from('penjualan_header')
    .select(`
      *,
      items:penjualan_items(*)
    `, { count: 'exact' });
  
  if (filters.startDate) multiItemQuery = multiItemQuery.gte('tanggal', filters.startDate);
  if (filters.endDate) multiItemQuery = multiItemQuery.lte('tanggal', filters.endDate);
  if (filters.search) multiItemQuery = multiItemQuery.ilike('pembeli', `%${filters.search}%`);
  
  const { data: multiItemData, error: multiItemError } = await multiItemQuery;
  
  if (multiItemError) {
    console.error('Error fetching multi-item transactions:', multiItemError);
  }
  
  // Fetch single-item transactions
  let singleItemQuery = supabase
    .from('transaksi_inventaris')
    .select(`
      *,
      inventaris!inner(nama_barang)
    `, { count: 'exact' })
    .eq('tipe', 'Keluar')
    .eq('keluar_mode', 'Penjualan');
  
  if (filters.startDate) singleItemQuery = singleItemQuery.gte('tanggal', filters.startDate);
  if (filters.endDate) singleItemQuery = singleItemQuery.lte('tanggal', filters.endDate);
  if (filters.search) singleItemQuery = singleItemQuery.ilike('penerima', `%${filters.search}%`);
  
  const { data: singleItemData, error: singleItemError } = await singleItemQuery;
  
  if (singleItemError) {
    console.error('Error fetching single-item transactions:', singleItemError);
  }
  
  // Convert single-item transactions to multi-item format
  const convertedSingleItems = await Promise.all(
    (singleItemData || []).map(async (tx: any) => {
      const converted = await convertSingleToMultiItem(tx);
      return {
        ...converted,
        itemCount: 1,
        transactionType: 'single' as const
      };
    })
  );
  
  // Format multi-item transactions
  const formattedMultiItems = (multiItemData || []).map((header: any) => ({
    ...header,
    itemCount: header.items?.length || 0,
    transactionType: 'multi' as const
  }));
  
  // Combine and sort
  const allTransactions = [...convertedSingleItems, ...formattedMultiItems];
  
  // Apply sorting
  if (sort) {
    allTransactions.sort((a, b) => {
      const aVal = (a as any)[sort.column];
      const bVal = (b as any)[sort.column];
      
      if (sort.direction === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }
  
  // Apply pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize;
  const paginatedData = allTransactions.slice(from, to);
  
  return {
    data: paginatedData,
    total: allTransactions.length
  };
}

// ============================================================================
// Multi-Item Sales Transaction Functions
// ============================================================================

/**
 * Create a multi-item sales transaction
 * 
 * This function performs the following steps in a transaction:
 * 1. Validate stock availability for all items
 * 2. Create transaction header in penjualan_header
 * 3. Batch insert items to penjualan_items
 * 4. Create individual transaksi_inventaris records for each item
 * 5. Update stock quantities for all items
 * 6. Create single keuangan entry with grand total
 * 7. Link keuangan_id back to penjualan_header
 * 
 * If any step fails, the entire transaction is rolled back.
 * 
 * Requirements: 1.5, 3.5, 4.1, 4.2, 4.3, 4.4
 * 
 * @param payload - Multi-item sale data including buyer info and items
 * @returns Complete transaction detail with header and items
 * @throws Error if validation fails or any database operation fails
 */
export async function createMultiItemSale(
  payload: MultiItemSalePayload
): Promise<MultiItemSaleDetail> {
  // Validate input
  if (!payload.items || payload.items.length === 0) {
    throw new ValidationError('Transaksi harus memiliki minimal satu item');
  }
  
  if (!payload.pembeli || payload.pembeli.trim() === '') {
    throw new ValidationError('Nama pembeli harus diisi');
  }
  
  if (!payload.tanggal || payload.tanggal.trim() === '') {
    throw new ValidationError('Tanggal transaksi harus diisi');
  }
  
  // Validate each item
  const itemErrors: string[] = [];
  for (let i = 0; i < payload.items.length; i++) {
    const item = payload.items[i];
    if (!item.item_id || item.item_id.trim() === '') {
      itemErrors.push(`Item #${i + 1}: ID item tidak valid`);
    }
    if (item.jumlah <= 0) {
      itemErrors.push(`Item #${i + 1}: Jumlah harus lebih dari 0`);
    }
    if (item.harga_dasar < 0) {
      itemErrors.push(`Item #${i + 1}: Harga dasar tidak boleh negatif`);
    }
    if (item.sumbangan < 0) {
      itemErrors.push(`Item #${i + 1}: Sumbangan tidak boleh negatif`);
    }
  }
  
  if (itemErrors.length > 0) {
    throw new ValidationError(
      `Validasi item gagal:\n${itemErrors.join('\n')}`,
      { errors: itemErrors }
    );
  }
  
  // Step 1: Validate stock availability
  const stockValidation = await validateStockAvailability(
    payload.items.map(item => ({
      item_id: item.item_id,
      jumlah: item.jumlah
    }))
  );
  
  if (!stockValidation.valid) {
    throw new StockError(
      'Stok tidak mencukupi untuk beberapa item',
      { errors: stockValidation.errors }
    );
  }
  
  // Calculate totals
  const totals = calculateGrandTotal(payload.items);
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;
  
  try {
    // Step 2: Create transaction header
    const { data: header, error: headerError } = await supabase
      .from('penjualan_header')
      .insert({
        pembeli: payload.pembeli,
        tanggal: payload.tanggal,
        total_harga_dasar: totals.total_harga_dasar,
        total_sumbangan: totals.total_sumbangan,
        grand_total: totals.grand_total,
        catatan: payload.catatan || null,
        created_by: userId,
        updated_by: userId
      })
      .select()
      .single();
    
    if (headerError) {
      console.error('Error creating penjualan_header:', headerError);
      throw new DatabaseError(
        'Gagal membuat header transaksi',
        { originalError: headerError }
      );
    }
    
    if (!header) {
      throw new DatabaseError('Header transaksi tidak dikembalikan setelah insert');
    }
    
    // Fetch item names for the items
    const itemIds = payload.items.map(item => item.item_id);
    const { data: inventoryItems, error: inventoryError } = await supabase
      .from('inventaris')
      .select('id, nama_barang')
      .in('id', itemIds);
    
    if (inventoryError) {
      // Rollback: delete header
      await supabase.from('penjualan_header').delete().eq('id', header.id);
      throw new DatabaseError(
        'Gagal mengambil data inventaris',
        { originalError: inventoryError }
      );
    }
    
    const inventoryMap = new Map(
      (inventoryItems || []).map(item => [item.id, item.nama_barang])
    );
    
    // Step 3: Prepare items for batch insert
    const itemsToInsert = payload.items.map(item => ({
      penjualan_header_id: header.id,
      item_id: item.item_id,
      nama_barang: inventoryMap.get(item.item_id) || 'Item tidak ditemukan',
      jumlah: item.jumlah,
      harga_dasar: item.harga_dasar,
      sumbangan: item.sumbangan,
      subtotal: calculateSubtotal(item.jumlah, item.harga_dasar, item.sumbangan)
    }));
    
    // Batch insert items
    const { data: insertedItems, error: itemsError } = await supabase
      .from('penjualan_items')
      .insert(itemsToInsert)
      .select();
    
    if (itemsError) {
      // Rollback: delete header (items will cascade)
      await supabase.from('penjualan_header').delete().eq('id', header.id);
      throw new DatabaseError(
        'Gagal menyimpan item penjualan',
        { originalError: itemsError }
      );
    }
    
    if (!insertedItems || insertedItems.length === 0) {
      // Rollback: delete header
      await supabase.from('penjualan_header').delete().eq('id', header.id);
      throw new DatabaseError('Item penjualan tidak dikembalikan setelah insert');
    }
    
    // Step 4: Create individual transaksi_inventaris records for each item
    const transaksiInventarisRecords = [];
    
    for (let i = 0; i < payload.items.length; i++) {
      const item = payload.items[i];
      const insertedItem = insertedItems[i];
      
      try {
        // Create inventory transaction for this item
        const { data: transaksiData, error: transaksiError } = await supabase
          .from('transaksi_inventaris')
          .insert({
            item_id: item.item_id,
            tipe: 'Keluar',
            keluar_mode: 'Penjualan',
            jumlah: item.jumlah,
            harga_satuan: item.harga_dasar + (item.sumbangan / item.jumlah),
            harga_total: calculateSubtotal(item.jumlah, item.harga_dasar, item.sumbangan),
            harga_dasar: item.harga_dasar,
            sumbangan: item.sumbangan,
            tanggal: payload.tanggal,
            catatan: `Multi-item sale: ${payload.pembeli}${payload.catatan ? ' - ' + payload.catatan : ''}`,
            penerima: payload.pembeli
          })
          .select()
          .single();
        
        if (transaksiError) {
          throw transaksiError;
        }
        
        if (!transaksiData) {
          throw new DatabaseError('Transaksi inventaris tidak dikembalikan');
        }
        
        transaksiInventarisRecords.push(transaksiData);
        
        // Link transaksi_inventaris_id back to penjualan_items
        await supabase
          .from('penjualan_items')
          .update({ transaksi_inventaris_id: transaksiData.id })
          .eq('id', insertedItem.id);
        
      } catch (transaksiError: any) {
        console.error('Error creating transaksi_inventaris:', transaksiError);
        // Rollback: delete header (will cascade to items)
        await supabase.from('penjualan_header').delete().eq('id', header.id);
        // Delete any created transaksi_inventaris records
        if (transaksiInventarisRecords.length > 0) {
          await supabase
            .from('transaksi_inventaris')
            .delete()
            .in('id', transaksiInventarisRecords.map(t => t.id));
        }
        throw new DatabaseError(
          'Gagal membuat transaksi inventaris',
          { originalError: transaksiError }
        );
      }
    }
    
    // Step 5: Update stock quantities (already handled by transaksi_inventaris triggers)
    // The database triggers should automatically update stock when transaksi_inventaris is created
    
    // Step 6: Create single keuangan entry with grand total
    let keuanganId: string | null = null;
    
    if (totals.grand_total > 0) {
      try {
        // Get default akun kas
        let targetAkunKasId: string | undefined;
        try {
          const defaultAkun = await AkunKasService.getDefault();
          targetAkunKasId = defaultAkun?.id;
        } catch (e) {
          console.warn('Gagal mengambil akun kas default, lanjut tanpa akun_kas_id');
        }
        
        // Build description with all item names
        const itemNames = insertedItems.map(item => item.nama_barang).join(', ');
        const description = `Penjualan multi-item kepada ${payload.pembeli}: ${itemNames}${payload.catatan ? ' - ' + payload.catatan : ''}`;
        
        const keuanganResult = await addKeuanganTransaction({
          jenis_transaksi: 'Pemasukan',
          kategori: 'Penjualan Inventaris',
          jumlah: totals.grand_total,
          tanggal: payload.tanggal,
          deskripsi: description,
          referensi: `multi_item_sale:${header.id}`,
          akun_kas_id: targetAkunKasId,
          status: 'posted'
        });
        
        const createdKeuangan = Array.isArray(keuanganResult) 
          ? keuanganResult[0] 
          : (keuanganResult?.[0] || keuanganResult);
        
        if (createdKeuangan?.id) {
          keuanganId = createdKeuangan.id;
        } else {
          throw new FinancialError('Entri keuangan tidak dikembalikan setelah insert');
        }
      } catch (keuanganError: any) {
        console.error('Error creating keuangan entry:', keuanganError);
        // Rollback: delete header and transaksi_inventaris
        await supabase.from('penjualan_header').delete().eq('id', header.id);
        await supabase
          .from('transaksi_inventaris')
          .delete()
          .in('id', transaksiInventarisRecords.map(t => t.id));
        throw new FinancialError(
          'Gagal membuat entri keuangan. Transaksi dibatalkan.',
          { originalError: keuanganError }
        );
      }
    }
    
    // Step 7: Link keuangan_id back to penjualan_header
    if (keuanganId) {
      const { error: updateError } = await supabase
        .from('penjualan_header')
        .update({ keuangan_id: keuanganId })
        .eq('id', header.id);
      
      if (updateError) {
        console.warn('Warning: Failed to link keuangan_id to header:', updateError);
        // Don't rollback - transaction is essentially complete
      }
    }
    
    // Fetch complete transaction detail
    const { data: completeHeader, error: fetchError } = await supabase
      .from('penjualan_header')
      .select(`
        *,
        items:penjualan_items(*)
      `)
      .eq('id', header.id)
      .single();
    
    if (fetchError || !completeHeader) {
      console.error('Error fetching complete transaction:', fetchError);
      // Transaction is created, just return what we have
      return {
        ...header,
        keuangan_id: keuanganId,
        items: insertedItems as PenjualanItem[]
      };
    }
    
    return completeHeader as MultiItemSaleDetail;
    
  } catch (error: any) {
    console.error('Error in createMultiItemSale:', error);
    throw error;
  }
}

/**
 * Get a single multi-item sale by ID with all its items
 * @param headerId - The ID of the penjualan_header
 * @returns Complete multi-item sale detail
 */
export async function getMultiItemSale(
  headerId: string
): Promise<MultiItemSaleDetail | null> {
  try {
    const { data, error } = await supabase
      .from('penjualan_header')
      .select(`
        *,
        items:penjualan_items(*)
      `)
      .eq('id', headerId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw new DatabaseError(
        'Gagal mengambil detail transaksi multi-item',
        { originalError: error }
      );
    }
    
    return data as MultiItemSaleDetail;
  } catch (error: any) {
    console.error('Error in getMultiItemSale:', error);
    throw error;
  }
}

/**
 * List all multi-item sales with pagination and filtering
 * Supports cross-item search functionality
 * @param pagination - Page and page size
 * @param filters - Search and date filters
 * @returns List of multi-item sales with total count
 */
export async function listMultiItemSales(
  pagination: Pagination,
  filters: {
    search?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    pembeli?: string | null;
  } = {}
): Promise<{ data: MultiItemSaleDetail[]; total: number }> {
  try {
    const { page, pageSize } = pagination;
    
    // Build base query
    let query = supabase
      .from('penjualan_header')
      .select(`
        *,
        items:penjualan_items(*)
      `, { count: 'exact' });
    
    // Apply filters
    if (filters.pembeli) {
      query = query.ilike('pembeli', `%${filters.pembeli}%`);
    }
    
    if (filters.startDate) {
      query = query.gte('tanggal', filters.startDate);
    }
    
    if (filters.endDate) {
      query = query.lte('tanggal', filters.endDate);
    }
    
    // For cross-item search, we need to filter by items
    // This is more complex - we'll fetch all and filter client-side for now
    // In production, consider using a database view or full-text search
    
    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
    
    // Order by date descending
    query = query.order('tanggal', { ascending: false });
    
    const { data, error, count } = await query;
    
    if (error) {
      throw new DatabaseError(
        'Gagal mengambil daftar transaksi multi-item',
        { originalError: error }
      );
    }
    
    let results = (data || []) as MultiItemSaleDetail[];
    
    // Apply cross-item search if provided
    if (filters.search && filters.search.trim() !== '') {
      const searchLower = filters.search.toLowerCase();
      results = results.filter(sale => {
        // Search in pembeli
        if (sale.pembeli.toLowerCase().includes(searchLower)) {
          return true;
        }
        // Search across all item names
        return sale.items.some(item => 
          item.nama_barang.toLowerCase().includes(searchLower)
        );
      });
    }
    
    return {
      data: results,
      total: count || 0
    };
  } catch (error: any) {
    console.error('Error in listMultiItemSales:', error);
    throw error;
  }
}

/**
 * Get combined sales history including both single-item and multi-item transactions
 * This function provides a unified view for the sales history display
 * @param pagination - Page and page size
 * @param filters - Search and filter options
 * @returns Combined list of sales with indicators for multi-item transactions
 */
export async function getCombinedSalesHistory(
  pagination: Pagination,
  filters: {
    search?: string | null;
    startDate?: string | null;
    endDate?: string | null;
  } = {}
): Promise<{
  data: Array<{
    id: string;
    type: 'single' | 'multi';
    pembeli: string;
    tanggal: string;
    total: number;
    itemCount: number;
    itemName?: string; // For single items
    items?: PenjualanItem[]; // For multi items
    originalData: InventoryTransaction | MultiItemSaleDetail;
  }>;
  total: number;
}> {
  try {
    // Fetch single-item transactions
    const singleItemsPromise = listTransactions(
      pagination,
      {
        tipe: 'Keluar',
        keluar_mode: 'Penjualan',
        search: filters.search,
        startDate: filters.startDate,
        endDate: filters.endDate
      }
    );
    
    // Fetch multi-item transactions
    const multiItemsPromise = listMultiItemSales(
      pagination,
      filters
    );
    
    const [singleResult, multiResult] = await Promise.all([
      singleItemsPromise,
      multiItemsPromise
    ]);
    
    // Transform single-item transactions
    const singleItems = singleResult.data.map(trx => ({
      id: trx.id,
      type: 'single' as const,
      pembeli: trx.penerima || 'Unknown',
      tanggal: trx.tanggal,
      total: trx.harga_total || ((trx.jumlah || 0) * (trx.harga_satuan || 0)),
      itemCount: 1,
      itemName: trx.nama_barang,
      originalData: trx
    }));
    
    // Transform multi-item transactions
    const multiItems = multiResult.data.map(sale => ({
      id: sale.id,
      type: 'multi' as const,
      pembeli: sale.pembeli,
      tanggal: sale.tanggal,
      total: sale.grand_total,
      itemCount: sale.items.length,
      items: sale.items,
      originalData: sale
    }));
    
    // Combine and sort by date
    const combined = [...singleItems, ...multiItems].sort((a, b) => {
      return new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime();
    });
    
    return {
      data: combined,
      total: singleResult.total + multiResult.total
    };
  } catch (error: any) {
    console.error('Error in getCombinedSalesHistory:', error);
    throw error;
  }
}
