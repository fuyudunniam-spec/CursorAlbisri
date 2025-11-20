-- ================================================
-- IMPROVE DOUBLE ENTRY PREVENTION
-- ================================================
-- Purpose: Enhanced double-entry detection and prevention
-- Features: Better trigger functions, monitoring views, audit logging
-- ================================================

-- ================================================
-- 1. ADD AUDIT COLUMNS TO KEUANGAN TABLE
-- ================================================

-- Add columns for better tracking
ALTER TABLE keuangan 
ADD COLUMN IF NOT EXISTS auto_posted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS source_module VARCHAR(50),
ADD COLUMN IF NOT EXISTS source_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS audit_trail JSONB DEFAULT '{}'::jsonb;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_keuangan_auto_posted ON keuangan(auto_posted);
CREATE INDEX IF NOT EXISTS idx_keuangan_source ON keuangan(source_module, source_id);
CREATE INDEX IF NOT EXISTS idx_keuangan_referensi ON keuangan(referensi);

-- ================================================
-- 2. CREATE MONITORING VIEWS
-- ================================================

-- View to detect potential double entries
CREATE OR REPLACE VIEW v_potential_double_entries AS
SELECT 
  kategori,
  tanggal,
  jumlah,
  COUNT(*) as count,
  array_agg(id) as keuangan_ids,
  array_agg(referensi) as referensi_list
FROM keuangan
WHERE referensi LIKE 'donation:%' 
   OR referensi LIKE 'inventory_sale:%'
   OR referensi LIKE 'pembayaran_santri:%'
GROUP BY kategori, tanggal, jumlah
HAVING COUNT(*) > 1;

-- View to track auto-posted transactions
CREATE OR REPLACE VIEW v_auto_posted_transactions AS
SELECT 
  k.id,
  k.tanggal,
  k.jenis_transaksi,
  k.kategori,
  k.jumlah,
  k.deskripsi,
  k.referensi,
  k.source_module,
  k.source_id,
  k.auto_posted,
  k.created_at,
  -- Source details based on referensi
  CASE 
    WHEN k.referensi LIKE 'donation:%' THEN 
      (SELECT d.donor_name FROM donations d WHERE d.id::text = SUBSTRING(k.referensi FROM 10))
    WHEN k.referensi LIKE 'inventory_sale:%' THEN
      (SELECT i.nama_barang FROM transaksi_inventaris ti 
       JOIN inventaris i ON i.id = ti.item_id 
       WHERE ti.id::text = SUBSTRING(k.referensi FROM 16))
    WHEN k.referensi LIKE 'pembayaran_santri:%' THEN
      (SELECT s.nama_lengkap FROM pembayaran_santri ps
       JOIN santri s ON s.id = ps.santri_id
       WHERE ps.id::text = SUBSTRING(k.referensi FROM 19))
    ELSE NULL
  END as source_detail
FROM keuangan k
WHERE k.auto_posted = TRUE
ORDER BY k.created_at DESC;

-- View for orphaned keuangan entries (no source)
CREATE OR REPLACE VIEW v_orphaned_keuangan AS
SELECT 
  k.id,
  k.tanggal,
  k.kategori,
  k.jumlah,
  k.deskripsi,
  k.referensi,
  k.auto_posted,
  k.created_at
FROM keuangan k
WHERE k.auto_posted = TRUE
  AND k.referensi IS NOT NULL
  AND (
    (k.referensi LIKE 'donation:%' AND NOT EXISTS (
      SELECT 1 FROM donations d WHERE d.id::text = SUBSTRING(k.referensi FROM 10)
    ))
    OR (k.referensi LIKE 'inventory_sale:%' AND NOT EXISTS (
      SELECT 1 FROM transaksi_inventaris ti WHERE ti.id::text = SUBSTRING(k.referensi FROM 16)
    ))
    OR (k.referensi LIKE 'pembayaran_santri:%' AND NOT EXISTS (
      SELECT 1 FROM pembayaran_santri ps WHERE ps.id::text = SUBSTRING(k.referensi FROM 19)
    ))
  );

-- ================================================
-- 3. ENHANCED TRIGGER FUNCTIONS
-- ================================================

-- Enhanced function to check for duplicates before auto-posting
CREATE OR REPLACE FUNCTION check_duplicate_auto_post(
  p_source_module VARCHAR(50),
  p_source_id VARCHAR(100),
  p_referensi VARCHAR(200)
) RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN := FALSE;
BEGIN
  -- Check if already posted
  SELECT EXISTS(
    SELECT 1 FROM keuangan 
    WHERE source_module = p_source_module 
      AND source_id = p_source_id
      AND auto_posted = TRUE
  ) INTO v_exists;
  
  IF v_exists THEN
    RAISE NOTICE 'Auto-post already exists for %:%', p_source_module, p_source_id;
    RETURN TRUE;
  END IF;
  
  -- Check by referensi pattern
  SELECT EXISTS(
    SELECT 1 FROM keuangan 
    WHERE referensi = p_referensi
      AND auto_posted = TRUE
  ) INTO v_exists;
  
  IF v_exists THEN
    RAISE NOTICE 'Auto-post already exists for referensi: %', p_referensi;
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Enhanced auto-post donation function
CREATE OR REPLACE FUNCTION auto_post_donasi_to_keuangan()
RETURNS TRIGGER AS $$
DECLARE
  v_kas_utama_id UUID;
  v_keuangan_id UUID;
  v_referensi VARCHAR(200);
  v_is_duplicate BOOLEAN := FALSE;
BEGIN
  -- Only process if donation_type is 'cash' and status is 'received'
  IF NEW.donation_type = 'cash' AND NEW.status = 'received' AND 
     (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != 'received')) THEN
    
    -- Get Kas Utama ID
    SELECT id INTO v_kas_utama_id
    FROM akun_kas
    WHERE is_default = TRUE AND status = 'aktif'
    LIMIT 1;
    
    IF v_kas_utama_id IS NULL THEN
      RAISE EXCEPTION 'Kas Utama tidak ditemukan';
    END IF;
    
    -- Create referensi
    v_referensi := 'donation:' || NEW.id::TEXT;
    
    -- Check for duplicates with enhanced function
    SELECT check_duplicate_auto_post('donations', NEW.id::TEXT, v_referensi) INTO v_is_duplicate;
    
    IF v_is_duplicate THEN
      RAISE NOTICE 'Skipping auto-post for donation % - already exists', NEW.id;
      RETURN NEW;
    END IF;
    
    -- Create keuangan entry with enhanced tracking
    INSERT INTO keuangan (
      tanggal,
      jenis_transaksi,
      kategori,
      sub_kategori,
      jumlah,
      deskripsi,
      penerima_pembayar,
      metode_pembayaran,
      akun_kas_id,
      status,
      referensi,
      auto_posted,
      source_module,
      source_id,
      audit_trail,
      created_by
    ) VALUES (
      COALESCE(NEW.donation_date, CURRENT_DATE),
      'Pemasukan',
      'Donasi Tunai',
      NULL,
      NEW.cash_amount,
      'Donasi tunai dari ' || NEW.donor_name || 
        CASE WHEN NEW.hajat_doa IS NOT NULL 
          THEN ' (Hajat: ' || LEFT(NEW.hajat_doa, 50) || '...)' 
          ELSE '' 
        END,
      NEW.donor_name,
      'Tunai',
      v_kas_utama_id,
      'posted',
      v_referensi,
      TRUE,
      'donations',
      NEW.id::TEXT,
      jsonb_build_object(
        'trigger_function', 'auto_post_donasi_to_keuangan',
        'triggered_at', NOW(),
        'donation_id', NEW.id,
        'donor_name', NEW.donor_name,
        'cash_amount', NEW.cash_amount
      ),
      NEW.created_by
    )
    RETURNING id INTO v_keuangan_id;
    
    RAISE NOTICE 'Donasi % auto-posted to keuangan (ID: %)', NEW.id, v_keuangan_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced auto-post inventory sale function
CREATE OR REPLACE FUNCTION auto_post_inventory_sale_to_keuangan()
RETURNS TRIGGER AS $$
DECLARE
  v_kas_utama_id UUID;
  v_keuangan_id UUID;
  v_item_name TEXT;
  v_referensi VARCHAR(200);
  v_is_duplicate BOOLEAN := FALSE;
BEGIN
  -- Only process if tipe is 'Keluar' and keluar_mode is 'Penjualan'
  IF NEW.tipe = 'Keluar' AND NEW.keluar_mode = 'Penjualan' AND TG_OP = 'INSERT' THEN
    
    -- Get Kas Utama ID
    SELECT id INTO v_kas_utama_id
    FROM akun_kas
    WHERE is_default = TRUE AND status = 'aktif'
    LIMIT 1;
    
    IF v_kas_utama_id IS NULL THEN
      RAISE EXCEPTION 'Kas Utama tidak ditemukan';
    END IF;
    
    -- Get item name
    SELECT nama_barang INTO v_item_name
    FROM inventaris
    WHERE id = NEW.item_id;
    
    -- Create referensi
    v_referensi := 'inventory_sale:' || NEW.id::TEXT;
    
    -- Check for duplicates
    SELECT check_duplicate_auto_post('transaksi_inventaris', NEW.id::TEXT, v_referensi) INTO v_is_duplicate;
    
    IF v_is_duplicate THEN
      RAISE NOTICE 'Skipping auto-post for inventory sale % - already exists', NEW.id;
      RETURN NEW;
    END IF;
    
    -- Create keuangan entry with enhanced tracking
    INSERT INTO keuangan (
      tanggal,
      jenis_transaksi,
      kategori,
      sub_kategori,
      jumlah,
      deskripsi,
      penerima_pembayar,
      metode_pembayaran,
      akun_kas_id,
      status,
      referensi,
      auto_posted,
      source_module,
      source_id,
      audit_trail,
      created_by
    ) VALUES (
      NEW.tanggal,
      'Pemasukan',
      'Penjualan Inventaris',
      NULL,
      NEW.jumlah * NEW.harga_satuan,
      'Penjualan ' || v_item_name || ' (' || NEW.jumlah || ' unit)' ||
        CASE WHEN NEW.penerima IS NOT NULL 
          THEN ' kepada ' || NEW.penerima 
          ELSE '' 
        END,
      NEW.penerima,
      'Tunai',
      v_kas_utama_id,
      'posted',
      v_referensi,
      TRUE,
      'transaksi_inventaris',
      NEW.id::TEXT,
      jsonb_build_object(
        'trigger_function', 'auto_post_inventory_sale_to_keuangan',
        'triggered_at', NOW(),
        'transaction_id', NEW.id,
        'item_id', NEW.item_id,
        'item_name', v_item_name,
        'quantity', NEW.jumlah,
        'unit_price', NEW.harga_satuan,
        'total_value', NEW.jumlah * NEW.harga_satuan
      ),
      NEW.created_by
    )
    RETURNING id INTO v_keuangan_id;
    
    RAISE NOTICE 'Penjualan inventaris % auto-posted to keuangan (ID: %)', NEW.id, v_keuangan_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced auto-post SPP function
CREATE OR REPLACE FUNCTION auto_post_spp_to_keuangan()
RETURNS TRIGGER AS $$
DECLARE
  v_akun_kas_id UUID;
  v_keuangan_id UUID;
  v_santri_name TEXT;
  v_santri_id_santri TEXT;
  v_referensi VARCHAR(200);
  v_is_duplicate BOOLEAN := FALSE;
BEGIN
  -- Get default akun kas (Kas Utama)
  SELECT id INTO v_akun_kas_id 
  FROM akun_kas 
  WHERE is_default = true AND status = 'aktif' 
  LIMIT 1;
  
  -- Get santri details for description
  SELECT nama_lengkap, id_santri INTO v_santri_name, v_santri_id_santri
  FROM santri
  WHERE id = NEW.santri_id;
  
  -- Create referensi
  v_referensi := 'pembayaran_santri:' || NEW.id::TEXT;
  
  -- Check for duplicates
  SELECT check_duplicate_auto_post('pembayaran_santri', NEW.id::TEXT, v_referensi) INTO v_is_duplicate;
  
  IF v_is_duplicate THEN
    RAISE NOTICE 'Skipping auto-post for SPP payment % - already exists', NEW.id;
    RETURN NEW;
  END IF;
  
  -- Insert into keuangan with enhanced tracking
  INSERT INTO keuangan (
    tanggal,
    jenis_transaksi,
    kategori,
    jumlah,
    deskripsi,
    akun_kas_id,
    status,
    referensi,
    auto_posted,
    source_module,
    source_id,
    audit_trail,
    created_at,
    updated_at
  ) VALUES (
    NEW.tanggal_bayar,
    'Pemasukan',
    'Pembayaran SPP',
    NEW.jumlah_bayar,
    'Pembayaran SPP - ' || COALESCE(v_santri_id_santri, v_santri_name),
    v_akun_kas_id,
    'posted',
    v_referensi,
    TRUE,
    'pembayaran_santri',
    NEW.id::TEXT,
    jsonb_build_object(
      'trigger_function', 'auto_post_spp_to_keuangan',
      'triggered_at', NOW(),
      'payment_id', NEW.id,
      'santri_id', NEW.santri_id,
      'santri_name', v_santri_name,
      'amount', NEW.jumlah_bayar
    ),
    NOW(),
    NOW()
  )
  RETURNING id INTO v_keuangan_id;
  
  -- Update pembayaran_santri with keuangan_id
  NEW.keuangan_id := v_keuangan_id;
  NEW.posted_to_finance_at := NOW();
  
  RAISE NOTICE 'SPP payment % auto-posted to keuangan (ID: %)', NEW.id, v_keuangan_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 4. UPDATE EXISTING TRIGGERS
-- ================================================

-- Drop and recreate triggers with enhanced functions
DROP TRIGGER IF EXISTS trg_auto_post_donasi_to_keuangan ON donations;
CREATE TRIGGER trg_auto_post_donasi_to_keuangan
  AFTER INSERT OR UPDATE ON donations
  FOR EACH ROW
  EXECUTE FUNCTION auto_post_donasi_to_keuangan();

DROP TRIGGER IF EXISTS trg_auto_post_inventory_sale_to_keuangan ON transaksi_inventaris;
CREATE TRIGGER trg_auto_post_inventory_sale_to_keuangan
  AFTER INSERT ON transaksi_inventaris
  FOR EACH ROW
  EXECUTE FUNCTION auto_post_inventory_sale_to_keuangan();

DROP TRIGGER IF EXISTS trigger_auto_post_spp ON pembayaran_santri;
CREATE TRIGGER trigger_auto_post_spp
  BEFORE INSERT ON pembayaran_santri
  FOR EACH ROW
  EXECUTE FUNCTION auto_post_spp_to_keuangan();

-- ================================================
-- 5. CREATE MONITORING FUNCTIONS
-- ================================================

-- Function to check for double entries
CREATE OR REPLACE FUNCTION check_double_entries()
RETURNS TABLE(
  kategori VARCHAR,
  tanggal DATE,
  jumlah DECIMAL,
  count BIGINT,
  keuangan_ids UUID[],
  referensi_list TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.kategori,
    v.tanggal,
    v.jumlah,
    v.count,
    v.keuangan_ids,
    v.referensi_list
  FROM v_potential_double_entries v;
END;
$$ LANGUAGE plpgsql;

-- Function to get auto-posted transactions summary
CREATE OR REPLACE FUNCTION get_auto_posted_summary(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  source_module VARCHAR,
  transaction_count BIGINT,
  total_amount DECIMAL,
  avg_amount DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    k.source_module,
    COUNT(*) as transaction_count,
    SUM(k.jumlah) as total_amount,
    AVG(k.jumlah) as avg_amount
  FROM keuangan k
  WHERE k.auto_posted = TRUE
    AND k.tanggal BETWEEN p_start_date AND p_end_date
  GROUP BY k.source_module
  ORDER BY total_amount DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to reconcile auto-posted transactions
CREATE OR REPLACE FUNCTION reconcile_auto_posted_transactions()
RETURNS TABLE(
  keuangan_id UUID,
  referensi TEXT,
  source_exists BOOLEAN,
  source_type TEXT,
  source_detail TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    k.id as keuangan_id,
    k.referensi,
    CASE 
      WHEN k.referensi LIKE 'donation:%' THEN 
        EXISTS(SELECT 1 FROM donations d WHERE d.id::text = SUBSTRING(k.referensi FROM 10))
      WHEN k.referensi LIKE 'inventory_sale:%' THEN
        EXISTS(SELECT 1 FROM transaksi_inventaris ti WHERE ti.id::text = SUBSTRING(k.referensi FROM 16))
      WHEN k.referensi LIKE 'pembayaran_santri:%' THEN
        EXISTS(SELECT 1 FROM pembayaran_santri ps WHERE ps.id::text = SUBSTRING(k.referensi FROM 19))
      ELSE FALSE
    END as source_exists,
    k.source_module as source_type,
    CASE 
      WHEN k.referensi LIKE 'donation:%' THEN 
        (SELECT d.donor_name FROM donations d WHERE d.id::text = SUBSTRING(k.referensi FROM 10))
      WHEN k.referensi LIKE 'inventory_sale:%' THEN
        (SELECT i.nama_barang FROM transaksi_inventaris ti 
         JOIN inventaris i ON i.id = ti.item_id 
         WHERE ti.id::text = SUBSTRING(k.referensi FROM 16))
      WHEN k.referensi LIKE 'pembayaran_santri:%' THEN
        (SELECT s.nama_lengkap FROM pembayaran_santri ps
         JOIN santri s ON s.id = ps.santri_id
         WHERE ps.id::text = SUBSTRING(k.referensi FROM 19))
      ELSE NULL
    END as source_detail
  FROM keuangan k
  WHERE k.auto_posted = TRUE
  ORDER BY k.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 6. CREATE ALERT FUNCTION
-- ================================================

-- Function to create alerts for potential issues
CREATE OR REPLACE FUNCTION create_double_entry_alert()
RETURNS VOID AS $$
DECLARE
  v_double_count INTEGER;
  v_orphaned_count INTEGER;
BEGIN
  -- Check for double entries
  SELECT COUNT(*) INTO v_double_count FROM v_potential_double_entries;
  
  -- Check for orphaned entries
  SELECT COUNT(*) INTO v_orphaned_count FROM v_orphaned_keuangan;
  
  -- Log alerts if issues found
  IF v_double_count > 0 THEN
    RAISE WARNING 'Found % potential double entries in keuangan table', v_double_count;
  END IF;
  
  IF v_orphaned_count > 0 THEN
    RAISE WARNING 'Found % orphaned keuangan entries (no source record)', v_orphaned_count;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 7. COMMENTS AND DOCUMENTATION
-- ================================================

COMMENT ON VIEW v_potential_double_entries IS 'Detects potential duplicate auto-posted transactions';
COMMENT ON VIEW v_auto_posted_transactions IS 'Shows all auto-posted transactions with source details';
COMMENT ON VIEW v_orphaned_keuangan IS 'Shows auto-posted keuangan entries without valid source records';

COMMENT ON FUNCTION check_duplicate_auto_post IS 'Enhanced duplicate checking for auto-posted transactions';
COMMENT ON FUNCTION check_double_entries IS 'Returns all potential double entries for monitoring';
COMMENT ON FUNCTION get_auto_posted_summary IS 'Summary statistics for auto-posted transactions';
COMMENT ON FUNCTION reconcile_auto_posted_transactions IS 'Reconciles auto-posted transactions with source records';
COMMENT ON FUNCTION create_double_entry_alert IS 'Creates alerts for potential double-entry issues';

-- ================================================
-- 8. INITIAL DATA BACKFILL (Optional)
-- ================================================

-- Update existing auto-posted transactions with new columns
UPDATE keuangan 
SET auto_posted = TRUE,
    source_module = CASE 
      WHEN referensi LIKE 'donation:%' THEN 'donations'
      WHEN referensi LIKE 'inventory_sale:%' THEN 'transaksi_inventaris'
      WHEN referensi LIKE 'pembayaran_santri:%' THEN 'pembayaran_santri'
      ELSE NULL
    END,
    source_id = CASE 
      WHEN referensi LIKE 'donation:%' THEN SUBSTRING(referensi FROM 10)
      WHEN referensi LIKE 'inventory_sale:%' THEN SUBSTRING(referensi FROM 16)
      WHEN referensi LIKE 'pembayaran_santri:%' THEN SUBSTRING(referensi FROM 19)
      ELSE NULL
    END
WHERE referensi IS NOT NULL 
  AND (referensi LIKE 'donation:%' 
       OR referensi LIKE 'inventory_sale:%' 
       OR referensi LIKE 'pembayaran_santri:%');

-- ================================================
-- 9. PERFORMANCE OPTIMIZATIONS
-- ================================================

-- Create composite indexes for better performance
CREATE INDEX IF NOT EXISTS idx_keuangan_auto_posted_date ON keuangan(auto_posted, tanggal) WHERE auto_posted = TRUE;
CREATE INDEX IF NOT EXISTS idx_keuangan_source_lookup ON keuangan(source_module, source_id) WHERE auto_posted = TRUE;

-- Analyze tables for better query planning
ANALYZE keuangan;
ANALYZE donations;
ANALYZE transaksi_inventaris;
ANALYZE pembayaran_santri;

-- ================================================
-- MIGRATION COMPLETE
-- ================================================

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Double entry prevention migration completed successfully';
  RAISE NOTICE 'Enhanced triggers, monitoring views, and audit functions created';
  RAISE NOTICE 'Run SELECT * FROM v_potential_double_entries to check for existing issues';
END $$;
