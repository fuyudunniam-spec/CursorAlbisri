-- Migration: Add Nomor Bukti System
-- Date: 2025-01-28
-- Description: Implement nomor bukti system for better transaction tracking

-- 1. Add nomor bukti columns to keuangan table
ALTER TABLE keuangan 
ADD COLUMN IF NOT EXISTS nomor_bukti VARCHAR(50),
ADD COLUMN IF NOT EXISTS prefix_bukti VARCHAR(10),
ADD COLUMN IF NOT EXISTS nomor_urut INTEGER;

-- 2. Create sequence table for nomor bukti
CREATE TABLE IF NOT EXISTS nomor_bukti_sequence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prefix VARCHAR(10) NOT NULL,
  tahun INTEGER NOT NULL,
  bulan INTEGER NOT NULL,
  nomor_terakhir INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prefix, tahun, bulan)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_keuangan_nomor_bukti ON keuangan(nomor_bukti);
CREATE INDEX IF NOT EXISTS idx_keuangan_prefix_bukti ON keuangan(prefix_bukti, tanggal);

-- 4. Function to generate nomor bukti
CREATE OR REPLACE FUNCTION generate_nomor_bukti(
  p_jenis_transaksi TEXT,
  p_tanggal DATE
) RETURNS TEXT AS $$
DECLARE
  v_prefix TEXT;
  v_tahun INTEGER;
  v_bulan INTEGER;
  v_nomor_urut INTEGER;
  v_nomor_bukti TEXT;
BEGIN
  -- Determine prefix based on transaction type
  IF p_jenis_transaksi = 'Pemasukan' THEN
    v_prefix := 'BKM';
  ELSIF p_jenis_transaksi = 'Pengeluaran' THEN
    v_prefix := 'BKK';
  ELSE
    v_prefix := 'BM';
  END IF;
  
  -- Extract year and month
  v_tahun := EXTRACT(YEAR FROM p_tanggal);
  v_bulan := EXTRACT(MONTH FROM p_tanggal);
  
  -- Get or create sequence
  INSERT INTO nomor_bukti_sequence (prefix, tahun, bulan, nomor_terakhir)
  VALUES (v_prefix, v_tahun, v_bulan, 1)
  ON CONFLICT (prefix, tahun, bulan)
  DO UPDATE SET 
    nomor_terakhir = nomor_bukti_sequence.nomor_terakhir + 1,
    updated_at = NOW()
  RETURNING nomor_terakhir INTO v_nomor_urut;
  
  -- Format nomor bukti
  v_nomor_bukti := v_prefix || '-' || 
                   v_tahun || LPAD(v_bulan::TEXT, 2, '0') || '-' ||
                   LPAD(v_nomor_urut::TEXT, 3, '0');
  
  RETURN v_nomor_bukti;
END;
$$ LANGUAGE plpgsql;

-- 5. Function to extract nama from auto-post description
CREATE OR REPLACE FUNCTION extract_nama_from_auto_post(deskripsi TEXT)
RETURNS TEXT AS $$
BEGIN
  IF deskripsi IS NULL OR deskripsi = '' THEN
    RETURN '-';
  END IF;
  
  -- Extract nama from "Auto-post dari donasi: Hambali" -> "Hambali"
  IF deskripsi LIKE 'Auto-post dari donasi:%' THEN
    RETURN TRIM(SUBSTRING(deskripsi FROM 'Auto-post dari donasi: (.+)$'));
  END IF;
  
  -- Extract nama from "Auto-post dari penjualan: Beras 5kg" -> "Beras 5kg"
  IF deskripsi LIKE 'Auto-post dari penjualan:%' THEN
    RETURN TRIM(SUBSTRING(deskripsi FROM 'Auto-post dari penjualan: (.+)$'));
  END IF;
  
  -- Extract nama from "Auto-post dari overhead: SPP & Asrama" -> "SPP & Asrama"
  IF deskripsi LIKE 'Auto-post dari overhead:%' THEN
    RETURN TRIM(SUBSTRING(deskripsi FROM 'Auto-post dari overhead: (.+)$'));
  END IF;
  
  -- Return original if not auto-post format
  RETURN deskripsi;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger to auto-generate nomor bukti
CREATE OR REPLACE FUNCTION auto_generate_nomor_bukti()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if nomor_bukti is null
  IF NEW.nomor_bukti IS NULL THEN
    NEW.nomor_bukti := generate_nomor_bukti(NEW.jenis_transaksi, NEW.tanggal);
    NEW.prefix_bukti := SPLIT_PART(NEW.nomor_bukti, '-', 1);
    NEW.nomor_urut := CAST(SPLIT_PART(NEW.nomor_bukti, '-', 3) AS INTEGER);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_nomor_bukti ON keuangan;
CREATE TRIGGER trigger_auto_generate_nomor_bukti
BEFORE INSERT ON keuangan
FOR EACH ROW EXECUTE FUNCTION auto_generate_nomor_bukti();

-- 8. Backfill existing data with nomor bukti
DO $$
DECLARE
  rec RECORD;
  v_nomor_bukti TEXT;
BEGIN
  -- Generate nomor bukti for existing records that don't have one
  FOR rec IN 
    SELECT id, jenis_transaksi, tanggal 
    FROM keuangan 
    WHERE nomor_bukti IS NULL 
    ORDER BY tanggal, created_at
  LOOP
    v_nomor_bukti := generate_nomor_bukti(rec.jenis_transaksi, rec.tanggal);
    
    UPDATE keuangan 
    SET 
      nomor_bukti = v_nomor_bukti,
      prefix_bukti = SPLIT_PART(v_nomor_bukti, '-', 1),
      nomor_urut = CAST(SPLIT_PART(v_nomor_bukti, '-', 3) AS INTEGER)
    WHERE id = rec.id;
  END LOOP;
END $$;
