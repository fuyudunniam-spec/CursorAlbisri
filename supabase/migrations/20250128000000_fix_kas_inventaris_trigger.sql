-- =====================================================
-- FIX KAS INVENTARIS TRIGGER ERROR
-- =====================================================
-- Description: Fix "Kas Inventaris tidak ditemukan" error by updating trigger to use default active kas
-- Date: 2025-01-28
-- Issue: Trigger auto_post_inventory_sale_to_keuangan_v2 looks for KAS-INV with status 'aktif' but it's 'ditutup'
-- Solution: Update trigger to use any default active kas account
-- =====================================================

-- =====================================================
-- 1. UPDATE TRIGGER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION auto_post_inventory_sale_to_keuangan_v2()
RETURNS TRIGGER AS $$
DECLARE
  v_kas_id UUID;
  v_keuangan_id UUID;
  v_barang_name TEXT;
BEGIN
  -- Only process sales transactions that aren't already posted
  IF NEW.tipe = 'Keluar' AND NEW.keluar_mode = 'Penjualan' AND 
     NEW.harga_total > 0 AND NEW.posted_to_finance_at IS NULL THEN
    
    -- Get default active Kas (bisa Kas Utama atau Bank Operasional)
    SELECT id INTO v_kas_id 
    FROM akun_kas 
    WHERE is_default = TRUE AND status = 'aktif' 
    LIMIT 1;
    
    IF v_kas_id IS NULL THEN
      RAISE EXCEPTION 'Tidak ada akun kas aktif yang tersedia';
    END IF;

    -- Get item name
    SELECT nama_barang INTO v_barang_name
    FROM inventaris 
    WHERE id = NEW.item_id;

    -- Create keuangan entry
    INSERT INTO keuangan (
      tanggal,
      jenis_transaksi,
      kategori,
      sub_kategori,
      jumlah,
      deskripsi,
      akun_kas_id,
      status,
      referensi,
      auto_posted,
      source_module,
      source_id,
      created_by
    ) VALUES (
      NEW.tanggal,
      'Pemasukan',
      'Penjualan Inventaris',
      'Penjualan Barang',
      NEW.harga_total,
      'Penjualan ' || COALESCE(v_barang_name, 'Barang') || ' (' || NEW.jumlah || ' unit)',
      v_kas_id,
      'posted',
      'inventory_sale:' || NEW.id,
      TRUE,
      'inventaris',
      NEW.id::TEXT,
      NEW.created_by
    ) RETURNING id INTO v_keuangan_id;

    -- Update transaction record
    NEW.posted_to_finance_at := NOW();
    NEW.keuangan_id := v_keuangan_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. ADD COMMENTS
-- =====================================================

COMMENT ON FUNCTION auto_post_inventory_sale_to_keuangan_v2 IS 'Auto-post inventory sales to default active kas account (fixed from KAS-INV specific lookup)';

-- =====================================================
-- 3. VERIFICATION QUERIES (for testing)
-- =====================================================

-- Check if function was updated correctly
-- SELECT prosrc FROM pg_proc WHERE proname = 'auto_post_inventory_sale_to_keuangan_v2';

-- Check available default active kas accounts
-- SELECT id, kode, nama, is_default, status FROM akun_kas WHERE is_default = TRUE AND status = 'aktif';

-- =====================================================
-- FIX COMPLETE
-- =====================================================
