-- =====================================================
-- INVENTARIS MODULE - COMPLETE MIGRATION
-- =====================================================
-- Description: Complete inventaris system with all enhancements
-- Date: 2025-01-07
-- Features: Master inventaris, transactions, stock management, RLS, triggers
-- =====================================================

-- 1. CREATE INVENTARIS TABLE (Enhanced)
-- =====================================================
CREATE TABLE IF NOT EXISTS inventaris (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_barang TEXT NOT NULL,
  kategori TEXT,
  satuan VARCHAR(50),
  jumlah INTEGER DEFAULT 0 CHECK (jumlah >= 0),
  harga_satuan DECIMAL(15,2),
  supplier TEXT,
  lokasi TEXT,
  keterangan TEXT,
  min_stock INTEGER DEFAULT 10 CHECK (min_stock >= 0),
  tipe_zona TEXT CHECK (tipe_zona IN ('Gudang Utama', 'Gudang Cabang', 'Lokasi Khusus')),
  kondisi TEXT CHECK (kondisi IN ('Baik', 'Rusak Ringan', 'Rusak Berat', 'Tidak Layak')),
  batch_number TEXT,
  expiry_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventaris_nama ON inventaris(nama_barang);
CREATE INDEX IF NOT EXISTS idx_inventaris_kategori ON inventaris(kategori);
CREATE INDEX IF NOT EXISTS idx_inventaris_lokasi ON inventaris(lokasi);
CREATE INDEX IF NOT EXISTS idx_inventaris_kondisi ON inventaris(kondisi);
CREATE INDEX IF NOT EXISTS idx_inventaris_expiry ON inventaris(expiry_date);

-- Add comments
COMMENT ON TABLE inventaris IS 'Master table untuk inventaris dengan fitur lengkap';
COMMENT ON COLUMN inventaris.min_stock IS 'Batas minimum stok untuk alert UI';
COMMENT ON COLUMN inventaris.satuan IS 'Satuan pengukuran barang (pcs, kg, liter, dll)';
COMMENT ON COLUMN inventaris.tipe_zona IS 'Jenis zona penyimpanan';
COMMENT ON COLUMN inventaris.kondisi IS 'Kondisi fisik barang';
COMMENT ON COLUMN inventaris.batch_number IS 'Nomor batch untuk tracking';
COMMENT ON COLUMN inventaris.expiry_date IS 'Tanggal kadaluarsa barang';

-- 2. CREATE TRANSAKSI INVENTARIS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS transaksi_inventaris (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventaris(id) ON DELETE CASCADE,
  jumlah INTEGER NOT NULL CHECK (jumlah > 0),
  harga_satuan DECIMAL(15,2),
  tipe TEXT NOT NULL CHECK (tipe IN ('Masuk', 'Keluar', 'Stocktake')),
  penerima TEXT,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  catatan TEXT,
  before_qty INTEGER,
  after_qty INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transaksi_inventaris_item_id ON transaksi_inventaris(item_id);
CREATE INDEX IF NOT EXISTS idx_transaksi_inventaris_tanggal ON transaksi_inventaris(tanggal);
CREATE INDEX IF NOT EXISTS idx_transaksi_inventaris_tipe ON transaksi_inventaris(tipe);

-- 3. ENABLE RLS AND CREATE POLICIES
-- =====================================================
-- Enable RLS
ALTER TABLE inventaris ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaksi_inventaris ENABLE ROW LEVEL SECURITY;

-- Inventaris RLS Policies
CREATE POLICY "Allow authenticated users to read inventaris"
  ON inventaris FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert inventaris"
  ON inventaris FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update inventaris"
  ON inventaris FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete inventaris"
  ON inventaris FOR DELETE
  TO authenticated
  USING (true);

-- Transaksi Inventaris RLS Policies
CREATE POLICY "Allow authenticated users to read transaksi_inventaris"
  ON transaksi_inventaris FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert transaksi_inventaris"
  ON transaksi_inventaris FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update transaksi_inventaris"
  ON transaksi_inventaris FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete transaksi_inventaris"
  ON transaksi_inventaris FOR DELETE
  TO authenticated
  USING (true);

-- 4. CREATE STOCK MANAGEMENT FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.apply_transaksi_to_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_qty INTEGER;
BEGIN
  -- Get current qty from inventaris
  SELECT jumlah INTO current_qty FROM inventaris WHERE id = NEW.item_id FOR UPDATE;

  IF TG_OP = 'INSERT' THEN
    IF NEW.tipe = 'Masuk' THEN
      UPDATE inventaris SET jumlah = COALESCE(current_qty, 0) + NEW.jumlah, updated_at = NOW() WHERE id = NEW.item_id;
    ELSIF NEW.tipe = 'Keluar' THEN
      UPDATE inventaris SET jumlah = GREATEST(COALESCE(current_qty, 0) - NEW.jumlah, 0), updated_at = NOW() WHERE id = NEW.item_id;
    ELSIF NEW.tipe = 'Stocktake' THEN
      -- Stocktake sets quantity to after_qty if provided
      IF NEW.after_qty IS NOT NULL THEN
        UPDATE inventaris SET jumlah = GREATEST(NEW.after_qty, 0), updated_at = NOW() WHERE id = NEW.item_id;
      END IF;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Recalculate delta between old and new rows to keep stock consistent
    IF NEW.item_id <> OLD.item_id THEN
      -- revert effect from OLD to old item
      IF OLD.tipe = 'Masuk' THEN
        UPDATE inventaris SET jumlah = GREATEST(COALESCE(jumlah,0) - OLD.jumlah, 0), updated_at = NOW() WHERE id = OLD.item_id;
      ELSIF OLD.tipe = 'Keluar' THEN
        UPDATE inventaris SET jumlah = COALESCE(jumlah,0) + OLD.jumlah, updated_at = NOW() WHERE id = OLD.item_id;
      ELSIF OLD.tipe = 'Stocktake' AND OLD.after_qty IS NOT NULL AND OLD.before_qty IS NOT NULL THEN
        UPDATE inventaris SET jumlah = GREATEST(OLD.before_qty, 0), updated_at = NOW() WHERE id = OLD.item_id;
      END IF;

      -- apply effect of NEW to new item
      IF NEW.tipe = 'Masuk' THEN
        UPDATE inventaris SET jumlah = COALESCE(jumlah,0) + NEW.jumlah, updated_at = NOW() WHERE id = NEW.item_id;
      ELSIF NEW.tipe = 'Keluar' THEN
        UPDATE inventaris SET jumlah = GREATEST(COALESCE(jumlah,0) - NEW.jumlah, 0), updated_at = NOW() WHERE id = NEW.item_id;
      ELSIF NEW.tipe = 'Stocktake' AND NEW.after_qty IS NOT NULL THEN
        UPDATE inventaris SET jumlah = GREATEST(NEW.after_qty, 0), updated_at = NOW() WHERE id = NEW.item_id;
      END IF;
    ELSE
      -- Same item, adjust by delta
      IF NEW.tipe IN ('Masuk','Keluar') THEN
        -- Remove old effect then apply new
        IF OLD.tipe = 'Masuk' THEN
          UPDATE inventaris SET jumlah = GREATEST(COALESCE(jumlah,0) - OLD.jumlah, 0), updated_at = NOW() WHERE id = NEW.item_id;
        ELSIF OLD.tipe = 'Keluar' THEN
          UPDATE inventaris SET jumlah = COALESCE(jumlah,0) + OLD.jumlah, updated_at = NOW() WHERE id = NEW.item_id;
        ELSIF OLD.tipe = 'Stocktake' AND OLD.before_qty IS NOT NULL THEN
          UPDATE inventaris SET jumlah = GREATEST(OLD.before_qty, 0), updated_at = NOW() WHERE id = NEW.item_id;
        END IF;

        IF NEW.tipe = 'Masuk' THEN
          UPDATE inventaris SET jumlah = COALESCE(jumlah,0) + NEW.jumlah, updated_at = NOW() WHERE id = NEW.item_id;
        ELSE
          UPDATE inventaris SET jumlah = GREATEST(COALESCE(jumlah,0) - NEW.jumlah, 0), updated_at = NOW() WHERE id = NEW.item_id;
        END IF;
      ELSE
        -- Stocktake overwrite with after_qty
        IF NEW.after_qty IS NOT NULL THEN
          UPDATE inventaris SET jumlah = GREATEST(NEW.after_qty, 0), updated_at = NOW() WHERE id = NEW.item_id;
        END IF;
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- Rollback the effect
    IF OLD.tipe = 'Masuk' THEN
      UPDATE inventaris SET jumlah = GREATEST(COALESCE(jumlah,0) - OLD.jumlah, 0), updated_at = NOW() WHERE id = OLD.item_id;
    ELSIF OLD.tipe = 'Keluar' THEN
      UPDATE inventaris SET jumlah = COALESCE(jumlah,0) + OLD.jumlah, updated_at = NOW() WHERE id = OLD.item_id;
    ELSIF OLD.tipe = 'Stocktake' AND OLD.before_qty IS NOT NULL THEN
      UPDATE inventaris SET jumlah = GREATEST(OLD.before_qty, 0), updated_at = NOW() WHERE id = OLD.item_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. CREATE TRIGGERS
-- =====================================================
-- Drop existing triggers if any
DROP TRIGGER IF EXISTS transaksi_inventaris_apply_insert ON transaksi_inventaris;
DROP TRIGGER IF EXISTS transaksi_inventaris_apply_update ON transaksi_inventaris;
DROP TRIGGER IF EXISTS transaksi_inventaris_apply_delete ON transaksi_inventaris;
DROP TRIGGER IF EXISTS transaksi_inventaris_updated_at ON transaksi_inventaris;

-- Create triggers
CREATE TRIGGER transaksi_inventaris_apply_insert
AFTER INSERT ON transaksi_inventaris
FOR EACH ROW
EXECUTE FUNCTION public.apply_transaksi_to_stock();

CREATE TRIGGER transaksi_inventaris_apply_update
AFTER UPDATE ON transaksi_inventaris
FOR EACH ROW
EXECUTE FUNCTION public.apply_transaksi_to_stock();

CREATE TRIGGER transaksi_inventaris_apply_delete
AFTER DELETE ON transaksi_inventaris
FOR EACH ROW
EXECUTE FUNCTION public.apply_transaksi_to_stock();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_transaksi_inventaris_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transaksi_inventaris_updated_at
  BEFORE UPDATE ON transaksi_inventaris
  FOR EACH ROW
  EXECUTE FUNCTION update_transaksi_inventaris_updated_at();

-- 6. ADD COMMENTS
-- =====================================================
COMMENT ON TABLE transaksi_inventaris IS 'Table untuk menyimpan transaksi penjualan dan distribusi inventaris';
COMMENT ON COLUMN transaksi_inventaris.before_qty IS 'Jumlah stok sebelum stocktake';
COMMENT ON COLUMN transaksi_inventaris.after_qty IS 'Jumlah stok setelah stocktake';

-- =====================================================
-- INVENTARIS MODULE COMPLETE
-- =====================================================
