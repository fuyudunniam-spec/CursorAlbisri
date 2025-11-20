-- Migration: Create tarif_santri system and default Kas Pembayaran Santri
-- Date: 2025-01-18
-- Purpose: Enable custom tariffs per santri and auto-sync to Keuangan Umum

-- ================================================
-- 1. CREATE tarif_santri TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS tarif_santri (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  
  -- Tariff components as JSONB
  komponen_tarif JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Example: {"spp": 500000, "buku": 100000, "asrama": 300000, "seragam": 150000}
  
  -- Period of validity
  periode_berlaku VARCHAR(20), -- 2024/2025
  tahun_ajaran VARCHAR(20),
  
  -- Metadata
  catatan TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Constraint: one active tariff per santri per period
  UNIQUE(santri_id, periode_berlaku)
);

-- Indexes for tarif_santri
CREATE INDEX IF NOT EXISTS idx_tarif_santri_santri_id ON tarif_santri(santri_id);
CREATE INDEX IF NOT EXISTS idx_tarif_santri_periode ON tarif_santri(periode_berlaku);
CREATE INDEX IF NOT EXISTS idx_tarif_santri_active ON tarif_santri(is_active);

-- ================================================
-- 2. CREATE DEFAULT "Kas Pembayaran Santri" ACCOUNT
-- ================================================
INSERT INTO akun_kas (nama, kode, tipe, saldo_awal, is_default, status, deskripsi)
VALUES (
  'Kas Pembayaran Santri',
  'KAS-SANTRI',
  'Kas',
  0,
  FALSE,
  'aktif',
  'Akun kas khusus untuk pembayaran santri (SPP, buku, dll). Auto-sync dari sistem tagihan.'
)
ON CONFLICT (nama) DO NOTHING;

-- ================================================
-- 3. ADD POSTING FIELDS TO pembayaran_santri
-- ================================================
ALTER TABLE pembayaran_santri 
  ADD COLUMN IF NOT EXISTS is_posted_to_keuangan BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS keuangan_id UUID REFERENCES keuangan(id),
  ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_pembayaran_is_posted ON pembayaran_santri(is_posted_to_keuangan);

-- ================================================
-- 4. CREATE FUNCTION FOR AUTO-POSTING TO KEUANGAN
-- ================================================
CREATE OR REPLACE FUNCTION post_pembayaran_to_keuangan(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  posted_count INTEGER,
  total_amount DECIMAL(15,2)
) AS $$
DECLARE
  v_kas_santri_id UUID;
  v_payments RECORD;
  v_keuangan_entries JSONB[];
  v_entry JSONB;
  v_count INTEGER := 0;
  v_total DECIMAL(15,2) := 0;
BEGIN
  -- Get Kas Pembayaran Santri account
  SELECT id INTO v_kas_santri_id 
  FROM akun_kas 
  WHERE kode = 'KAS-SANTRI' 
  LIMIT 1;
  
  IF v_kas_santri_id IS NULL THEN
    RAISE EXCEPTION 'Kas Pembayaran Santri account not found';
  END IF;
  
  -- Get unposted payments in date range
  FOR v_payments IN 
    SELECT 
      p.*,
      s.nama_lengkap
    FROM pembayaran_santri p
    JOIN santri s ON p.santri_id = s.id
    WHERE p.is_posted_to_keuangan = FALSE
      AND p.tanggal_bayar >= p_start_date
      AND p.tanggal_bayar <= p_end_date
  LOOP
    -- Create keuangan entry
    INSERT INTO keuangan (
      tanggal,
      kategori,
      sub_kategori,
      jumlah,
      akun_kas_id,
      deskripsi,
      nomor_referensi,
      catatan
    ) VALUES (
      v_payments.tanggal_bayar,
      'Pemasukan',
      'Pembayaran Santri',
      v_payments.jumlah_bayar,
      v_kas_santri_id,
      v_payments.santri.nama_lengkap || ' - Pembayaran ' || v_payments.metode_pembayaran,
      v_payments.nomor_referensi,
      'Auto-post dari pembayaran_santri.id: ' || v_payments.id
    ) RETURNING id INTO v_entry;
    
    -- Update pembayaran_santri
    UPDATE pembayaran_santri 
    SET 
      is_posted_to_keuangan = TRUE,
      keuangan_id = (v_entry->>'id')::UUID,
      posted_at = NOW()
    WHERE id = v_payments.id;
    
    v_count := v_count + 1;
    v_total := v_total + v_payments.jumlah_bayar;
  END LOOP;
  
  RETURN QUERY SELECT v_count, v_total;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 5. COMMENTS
-- ================================================
COMMENT ON TABLE tarif_santri IS 'Master tariff per santri dengan komponen billing modular';
COMMENT ON COLUMN tarif_santri.komponen_tarif IS 'JSONB: {spp: 500000, buku: 100000, asrama: 300000}';
COMMENT ON COLUMN tarif_santri.periode_berlaku IS 'Format: 2024/2025, 2025/2026, etc';
COMMENT ON FUNCTION post_pembayaran_to_keuangan IS 'Batch post pembayaran santri to keuangan umum';

-- ================================================
-- 6. GRANT PERMISSIONS
-- ================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON tarif_santri TO authenticated;
GRANT EXECUTE ON FUNCTION post_pembayaran_to_keuangan TO authenticated;
