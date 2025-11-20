-- Migration: Add breakdown fields to transaksi_inventaris table
-- Menambahkan kolom untuk menyimpan breakdown harga penjualan

-- Tambahkan kolom keluar_mode untuk membedakan Penjualan vs Distribusi
ALTER TABLE transaksi_inventaris 
ADD COLUMN IF NOT EXISTS keluar_mode TEXT;

-- Tambahkan kolom harga_dasar untuk harga dasar per unit
ALTER TABLE transaksi_inventaris 
ADD COLUMN IF NOT EXISTS harga_dasar NUMERIC(15,2);

-- Tambahkan kolom sumbangan untuk sumbangan tambahan
ALTER TABLE transaksi_inventaris 
ADD COLUMN IF NOT EXISTS sumbangan NUMERIC(15,2);

-- Tambahkan constraint untuk keluar_mode
ALTER TABLE transaksi_inventaris 
ADD CONSTRAINT IF NOT EXISTS keluar_mode_check 
CHECK (keluar_mode IS NULL OR keluar_mode IN ('Penjualan', 'Distribusi'));

-- Tambahkan constraint untuk harga_dasar (tidak boleh negatif)
ALTER TABLE transaksi_inventaris 
ADD CONSTRAINT IF NOT EXISTS harga_dasar_check 
CHECK (harga_dasar IS NULL OR harga_dasar >= 0);

-- Tambahkan constraint untuk sumbangan (tidak boleh negatif)
ALTER TABLE transaksi_inventaris 
ADD CONSTRAINT IF NOT EXISTS sumbangan_check 
CHECK (sumbangan IS NULL OR sumbangan >= 0);

-- Update existing records yang memiliki breakdown di catatan
-- Extract breakdown dari catatan untuk records yang ada
UPDATE transaksi_inventaris 
SET 
  keluar_mode = CASE 
    WHEN catatan LIKE '%Penjualan%' THEN 'Penjualan'
    WHEN catatan LIKE '%Distribusi%' THEN 'Distribusi'
    ELSE NULL
  END
WHERE keluar_mode IS NULL;

-- Extract harga_dasar dari catatan untuk records yang ada
UPDATE transaksi_inventaris 
SET harga_dasar = CASE 
  WHEN catatan ~ 'Harga Dasar: Rp ([0-9.,]+)' THEN 
    CAST(REPLACE(REGEXP_REPLACE(catatan, 'Harga Dasar: Rp ([0-9.,]+)', '\1'), ',', '') AS NUMERIC)
  ELSE NULL
END
WHERE harga_dasar IS NULL AND catatan LIKE '%Harga Dasar%';

-- Extract sumbangan dari catatan untuk records yang ada
UPDATE transaksi_inventaris 
SET sumbangan = CASE 
  WHEN catatan ~ 'Sumbangan: Rp ([0-9.,]+)' THEN 
    CAST(REPLACE(REGEXP_REPLACE(catatan, 'Sumbangan: Rp ([0-9.,]+)', '\1'), ',', '') AS NUMERIC)
  ELSE NULL
END
WHERE sumbangan IS NULL AND catatan LIKE '%Sumbangan%';

-- Tambahkan komentar untuk dokumentasi
COMMENT ON COLUMN transaksi_inventaris.keluar_mode IS 'Mode transaksi keluar: Penjualan atau Distribusi';
COMMENT ON COLUMN transaksi_inventaris.harga_dasar IS 'Harga dasar per unit untuk transaksi penjualan';
COMMENT ON COLUMN transaksi_inventaris.sumbangan IS 'Sumbangan tambahan untuk transaksi penjualan';

-- Verifikasi perubahan
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'transaksi_inventaris' 
  AND column_name IN ('keluar_mode', 'harga_dasar', 'sumbangan')
ORDER BY column_name;
