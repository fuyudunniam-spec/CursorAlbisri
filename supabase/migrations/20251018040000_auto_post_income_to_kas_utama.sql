-- ================================================
-- AUTO-POST INCOME TO KAS UTAMA
-- ================================================
-- Purpose: Auto-post donations and inventory sales to Kas Utama
-- Features: Real-time income tracking, integrated with akun_kas
-- ================================================

-- ================================================
-- 1. FUNCTION: Auto-post Donation to Keuangan (Cash Only)
-- ================================================

CREATE OR REPLACE FUNCTION auto_post_donasi_to_keuangan()
RETURNS TRIGGER AS $$
DECLARE
  v_kas_utama_id UUID;
  v_keuangan_id UUID;
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
    
    -- Check if already posted
    IF EXISTS (
      SELECT 1 FROM keuangan 
      WHERE referensi = 'donation:' || NEW.id::TEXT
    ) THEN
      RETURN NEW;
    END IF;
    
    -- Create keuangan entry
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
      'donation:' || NEW.id::TEXT,
      NEW.created_by
    )
    RETURNING id INTO v_keuangan_id;
    
    -- Update donation with keuangan reference
    UPDATE donations
    SET posted_to_finance_at = NOW()
    WHERE id = NEW.id;
    
    RAISE NOTICE 'Donasi % auto-posted to keuangan (ID: %)', NEW.id, v_keuangan_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_auto_post_donasi_to_keuangan ON donations;

-- Create trigger
CREATE TRIGGER trg_auto_post_donasi_to_keuangan
  AFTER INSERT OR UPDATE ON donations
  FOR EACH ROW
  EXECUTE FUNCTION auto_post_donasi_to_keuangan();

-- ================================================
-- 2. TABLE: transaksi_inventaris (if not exists)
-- ================================================

-- Check if transaksi_inventaris exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transaksi_inventaris') THEN
    CREATE TABLE transaksi_inventaris (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      inventaris_id UUID NOT NULL REFERENCES inventaris(id) ON DELETE CASCADE,
      jenis_transaksi VARCHAR(20) NOT NULL CHECK (jenis_transaksi IN ('Masuk', 'Keluar', 'Jual', 'Rusak', 'Hilang')),
      tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
      jumlah INTEGER NOT NULL CHECK (jumlah > 0),
      harga_satuan DECIMAL(15,2),
      total_nilai DECIMAL(15,2) GENERATED ALWAYS AS (jumlah * COALESCE(harga_satuan, 0)) STORED,
      keterangan TEXT,
      pembeli VARCHAR(200), -- For 'Jual' transaction
      created_at TIMESTAMPTZ DEFAULT NOW(),
      created_by UUID REFERENCES auth.users(id)
    );
    
    CREATE INDEX idx_transaksi_inventaris_item ON transaksi_inventaris(inventaris_id);
    CREATE INDEX idx_transaksi_inventaris_jenis ON transaksi_inventaris(jenis_transaksi);
    CREATE INDEX idx_transaksi_inventaris_tanggal ON transaksi_inventaris(tanggal DESC);
    
    ALTER TABLE transaksi_inventaris ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Authenticated users can view transaksi_inventaris"
      ON transaksi_inventaris FOR SELECT TO authenticated USING (true);
    
    CREATE POLICY "Authenticated users can manage transaksi_inventaris"
      ON transaksi_inventaris FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ================================================
-- 3. FUNCTION: Auto-post Inventory Sales to Keuangan
-- ================================================

CREATE OR REPLACE FUNCTION auto_post_inventory_sale_to_keuangan()
RETURNS TRIGGER AS $$
DECLARE
  v_kas_utama_id UUID;
  v_keuangan_id UUID;
  v_item_name TEXT;
BEGIN
  -- Only process if jenis_transaksi is 'Jual'
  IF NEW.jenis_transaksi = 'Jual' AND TG_OP = 'INSERT' THEN
    
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
    WHERE id = NEW.inventaris_id;
    
    -- Check if already posted
    IF EXISTS (
      SELECT 1 FROM keuangan 
      WHERE referensi = 'inventory_sale:' || NEW.id::TEXT
    ) THEN
      RETURN NEW;
    END IF;
    
    -- Create keuangan entry
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
      created_by
    ) VALUES (
      NEW.tanggal,
      'Pemasukan',
      'Penjualan Inventaris',
      NULL,
      NEW.total_nilai,
      'Penjualan ' || v_item_name || ' (' || NEW.jumlah || ' unit)' ||
        CASE WHEN NEW.pembeli IS NOT NULL 
          THEN ' kepada ' || NEW.pembeli 
          ELSE '' 
        END,
      NEW.pembeli,
      'Tunai',
      v_kas_utama_id,
      'posted',
      'inventory_sale:' || NEW.id::TEXT,
      NEW.created_by
    )
    RETURNING id INTO v_keuangan_id;
    
    RAISE NOTICE 'Penjualan inventaris % auto-posted to keuangan (ID: %)', NEW.id, v_keuangan_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_auto_post_inventory_sale_to_keuangan ON transaksi_inventaris;

-- Create trigger
CREATE TRIGGER trg_auto_post_inventory_sale_to_keuangan
  AFTER INSERT ON transaksi_inventaris
  FOR EACH ROW
  EXECUTE FUNCTION auto_post_inventory_sale_to_keuangan();

-- ================================================
-- 4. VIEW: Riwayat Pemasukan Lengkap
-- ================================================

CREATE OR REPLACE VIEW view_riwayat_pemasukan AS
SELECT 
  k.id,
  k.tanggal,
  k.kategori,
  k.sub_kategori,
  k.jumlah,
  k.deskripsi,
  k.penerima_pembayar as sumber,
  k.metode_pembayaran,
  ak.nama as akun_kas_nama,
  k.status,
  k.referensi,
  -- Source type detection
  CASE 
    WHEN k.referensi LIKE 'donation:%' THEN 'Donasi'
    WHEN k.referensi LIKE 'inventory_sale:%' THEN 'Penjualan Inventaris'
    WHEN k.referensi LIKE 'pembayaran_santri:%' THEN 'Pembayaran Santri'
    WHEN k.kategori = 'Donasi Tunai' THEN 'Donasi'
    WHEN k.kategori = 'Penjualan Inventaris' THEN 'Penjualan Inventaris'
    ELSE 'Lainnya'
  END as sumber_type,
  -- Link to source
  CASE 
    WHEN k.referensi LIKE 'donation:%' THEN SUBSTRING(k.referensi FROM 10)::UUID
    WHEN k.referensi LIKE 'inventory_sale:%' THEN SUBSTRING(k.referensi FROM 16)::UUID
    WHEN k.referensi LIKE 'pembayaran_santri:%' THEN SUBSTRING(k.referensi FROM 19)::UUID
    ELSE NULL
  END as source_id,
  k.created_at,
  k.created_by
FROM keuangan k
LEFT JOIN akun_kas ak ON ak.id = k.akun_kas_id
WHERE k.jenis_transaksi = 'Pemasukan'
  AND k.status = 'posted'
ORDER BY k.tanggal DESC, k.created_at DESC;

-- ================================================
-- 5. VIEW: Summary Pemasukan per Sumber
-- ================================================

CREATE OR REPLACE VIEW view_summary_pemasukan_per_sumber AS
SELECT 
  DATE_TRUNC('month', tanggal) as bulan,
  sumber_type,
  COUNT(*) as jumlah_transaksi,
  SUM(jumlah) as total_pemasukan,
  AVG(jumlah) as rata_rata_per_transaksi
FROM view_riwayat_pemasukan
GROUP BY DATE_TRUNC('month', tanggal), sumber_type
ORDER BY bulan DESC, total_pemasukan DESC;

-- ================================================
-- 6. VIEW: Dashboard Cards Data
-- ================================================

CREATE OR REPLACE VIEW view_dashboard_keuangan AS
SELECT 
  -- Total Saldo
  (SELECT SUM(saldo_saat_ini) FROM akun_kas WHERE status = 'aktif') as total_saldo,
  
  -- Pemasukan Bulan Ini
  (SELECT COALESCE(SUM(jumlah), 0) 
   FROM keuangan 
   WHERE jenis_transaksi = 'Pemasukan' 
     AND status = 'posted'
     AND DATE_TRUNC('month', tanggal) = DATE_TRUNC('month', CURRENT_DATE)
  ) as pemasukan_bulan_ini,
  
  -- Pengeluaran Bulan Ini
  (SELECT COALESCE(SUM(jumlah), 0) 
   FROM keuangan 
   WHERE jenis_transaksi = 'Pengeluaran' 
     AND status = 'posted'
     AND DATE_TRUNC('month', tanggal) = DATE_TRUNC('month', CURRENT_DATE)
  ) as pengeluaran_bulan_ini,
  
  -- Total Bantuan ke Santri Bulan Ini
  (SELECT COALESCE(SUM(nominal_alokasi), 0)
   FROM alokasi_pengeluaran_santri
   WHERE periode = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
  ) as bantuan_santri_bulan_ini,
  
  -- Breakdown Pemasukan by Source
  (SELECT json_object_agg(sumber_type, total_pemasukan)
   FROM (
     SELECT sumber_type, SUM(jumlah) as total_pemasukan
     FROM view_riwayat_pemasukan
     WHERE DATE_TRUNC('month', tanggal) = DATE_TRUNC('month', CURRENT_DATE)
     GROUP BY sumber_type
   ) sub
  ) as breakdown_pemasukan,
  
  -- Saldo per Akun
  (SELECT json_agg(
     json_build_object(
       'nama', nama,
       'kode', kode,
       'tipe', tipe,
       'saldo', saldo_saat_ini
     ) ORDER BY CASE WHEN is_default THEN 0 ELSE 1 END, nama
   )
   FROM akun_kas
   WHERE status = 'aktif'
  ) as saldo_per_akun;

-- ================================================
-- 7. BACKFILL: Post existing donations & sales
-- ================================================

DO $$
DECLARE
  v_kas_utama_id UUID;
  v_count_donations INTEGER := 0;
  v_count_sales INTEGER := 0;
BEGIN
  -- Get Kas Utama
  SELECT id INTO v_kas_utama_id
  FROM akun_kas
  WHERE is_default = TRUE AND status = 'aktif'
  LIMIT 1;
  
  IF v_kas_utama_id IS NULL THEN
    RAISE NOTICE 'Kas Utama not found, skipping backfill';
    RETURN;
  END IF;
  
  -- Backfill existing cash donations (that are not yet posted)
  INSERT INTO keuangan (
    tanggal,
    jenis_transaksi,
    kategori,
    jumlah,
    deskripsi,
    penerima_pembayar,
    metode_pembayaran,
    akun_kas_id,
    status,
    referensi,
    created_by
  )
  SELECT 
    COALESCE(d.donation_date, d.created_at::DATE),
    'Pemasukan',
    'Donasi Tunai',
    d.cash_amount,
    'Donasi tunai dari ' || d.donor_name,
    d.donor_name,
    'Tunai',
    v_kas_utama_id,
    'posted',
    'donation:' || d.id::TEXT,
    d.created_by
  FROM donations d
  WHERE d.donation_type = 'cash'
    AND d.status = 'received'
    AND d.cash_amount > 0
    AND NOT EXISTS (
      SELECT 1 FROM keuangan 
      WHERE referensi = 'donation:' || d.id::TEXT
    );
  
  GET DIAGNOSTICS v_count_donations = ROW_COUNT;
  
  -- Update posted_to_finance_at for backfilled donations
  UPDATE donations
  SET posted_to_finance_at = NOW()
  WHERE donation_type = 'cash'
    AND status = 'received'
    AND posted_to_finance_at IS NULL
    AND EXISTS (
      SELECT 1 FROM keuangan 
      WHERE referensi = 'donation:' || id::TEXT
    );
  
  -- Backfill existing inventory sales (if transaksi_inventaris exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transaksi_inventaris') THEN
    INSERT INTO keuangan (
      tanggal,
      jenis_transaksi,
      kategori,
      jumlah,
      deskripsi,
      penerima_pembayar,
      metode_pembayaran,
      akun_kas_id,
      status,
      referensi,
      created_by
    )
    SELECT 
      ti.tanggal,
      'Pemasukan',
      'Penjualan Inventaris',
      ti.total_nilai,
      'Penjualan ' || i.nama_barang || ' (' || ti.jumlah || ' unit)',
      ti.pembeli,
      'Tunai',
      v_kas_utama_id,
      'posted',
      'inventory_sale:' || ti.id::TEXT,
      ti.created_by
    FROM transaksi_inventaris ti
    JOIN inventaris i ON i.id = ti.inventaris_id
    WHERE ti.jenis_transaksi = 'Jual'
      AND ti.total_nilai > 0
      AND NOT EXISTS (
        SELECT 1 FROM keuangan 
        WHERE referensi = 'inventory_sale:' || ti.id::TEXT
      );
    
    GET DIAGNOSTICS v_count_sales = ROW_COUNT;
  END IF;
  
  RAISE NOTICE 'Backfill complete: % donations, % inventory sales posted to keuangan', 
    v_count_donations, v_count_sales;
END $$;

-- ================================================
-- 8. COMMENTS
-- ================================================
COMMENT ON FUNCTION auto_post_donasi_to_keuangan IS 'Auto-post cash donations to Kas Utama when status = received';
COMMENT ON FUNCTION auto_post_inventory_sale_to_keuangan IS 'Auto-post inventory sales to Kas Utama';

COMMENT ON VIEW view_riwayat_pemasukan IS 'Complete income history from all sources (donations, sales, payments)';
COMMENT ON VIEW view_summary_pemasukan_per_sumber IS 'Monthly summary of income by source type';
COMMENT ON VIEW view_dashboard_keuangan IS 'Dashboard stats: saldo, income, expenses, allocation to students';

