-- ================================================
-- FIX DOUBLE ENTRY - KEUANGAN MODULE
-- ================================================
-- Purpose: Fix double entry dari penjualan inventaris dan donasi
-- ================================================

-- ================================================
-- 1. BACKUP DATA SEBELUM PERBAIKAN
-- ================================================

-- Buat backup table keuangan
CREATE TABLE IF NOT EXISTS keuangan_backup_before_fix AS 
SELECT * FROM keuangan;

-- Buat backup table transaksi_inventaris
CREATE TABLE IF NOT EXISTS transaksi_inventaris_backup_before_fix AS 
SELECT * FROM transaksi_inventaris;

-- ================================================
-- 2. IDENTIFIKASI DUPLIKASI PENJUALAN INVENTARIS
-- ================================================

-- Cek transaksi keuangan yang kemungkinan duplikasi dari inventaris
-- (berdasarkan pola deskripsi dan referensi)
WITH duplicate_inventaris AS (
  SELECT 
    k.id,
    k.jumlah,
    k.tanggal,
    k.deskripsi,
    k.referensi,
    ROW_NUMBER() OVER (
      PARTITION BY k.jumlah, k.tanggal, k.deskripsi 
      ORDER BY k.created_at
    ) as rn
  FROM keuangan k
  WHERE (
    k.kategori ILIKE '%penjualan%' 
    OR k.kategori ILIKE '%inventaris%'
    OR k.deskripsi ILIKE '%penjualan%'
    OR k.deskripsi ILIKE '%harga%'
    OR k.referensi ILIKE '%inventaris%'
  )
  AND k.jenis_transaksi = 'Pemasukan'
)
SELECT 
  'DUPLICATE INVENTARIS FOUND' as status,
  COUNT(*) as total_duplicates
FROM duplicate_inventaris 
WHERE rn > 1;

-- ================================================
-- 3. IDENTIFIKASI DUPLIKASI DONASI
-- ================================================

-- Cek transaksi keuangan donasi yang kemungkinan duplikasi
WITH duplicate_donasi AS (
  SELECT 
    k.id,
    k.jumlah,
    k.tanggal,
    k.deskripsi,
    ROW_NUMBER() OVER (
      PARTITION BY k.jumlah, k.tanggal, k.deskripsi 
      ORDER BY k.created_at
    ) as rn
  FROM keuangan k
  WHERE k.kategori = 'Donasi'
  AND k.jenis_transaksi = 'Pemasukan'
)
SELECT 
  'DUPLICATE DONASI FOUND' as status,
  COUNT(*) as total_duplicates
FROM duplicate_donasi 
WHERE rn > 1;

-- ================================================
-- 4. HAPUS DUPLIKASI PENJUALAN INVENTARIS
-- ================================================

-- Hapus duplikasi penjualan inventaris (keep yang pertama, hapus yang duplikat)
WITH duplicate_inventaris AS (
  SELECT 
    k.id,
    ROW_NUMBER() OVER (
      PARTITION BY k.jumlah, k.tanggal, k.deskripsi 
      ORDER BY k.created_at
    ) as rn
  FROM keuangan k
  WHERE (
    k.kategori ILIKE '%penjualan%' 
    OR k.kategori ILIKE '%inventaris%'
    OR k.deskripsi ILIKE '%penjualan%'
    OR k.deskripsi ILIKE '%harga%'
    OR k.referensi ILIKE '%inventaris%'
  )
  AND k.jenis_transaksi = 'Pemasukan'
)
DELETE FROM keuangan 
WHERE id IN (
  SELECT id FROM duplicate_inventaris WHERE rn > 1
);

-- ================================================
-- 5. HAPUS DUPLIKASI DONASI
-- ================================================

-- Hapus duplikasi donasi (keep yang pertama, hapus yang duplikat)
WITH duplicate_donasi AS (
  SELECT 
    k.id,
    ROW_NUMBER() OVER (
      PARTITION BY k.jumlah, k.tanggal, k.deskripsi 
      ORDER BY k.created_at
    ) as rn
  FROM keuangan k
  WHERE k.kategori = 'Donasi'
  AND k.jenis_transaksi = 'Pemasukan'
)
DELETE FROM keuangan 
WHERE id IN (
  SELECT id FROM duplicate_donasi WHERE rn > 1
);

-- ================================================
-- 6. UPDATE REFERENSI UNTUK MENCEGAH DOUBLE ENTRY
-- ================================================

-- Update referensi untuk transaksi inventaris
UPDATE keuangan 
SET referensi = 'inventaris_penjualan'
WHERE (
  kategori ILIKE '%penjualan%' 
  OR kategori ILIKE '%inventaris%'
  OR deskripsi ILIKE '%penjualan%'
  OR deskripsi ILIKE '%harga%'
)
AND jenis_transaksi = 'Pemasukan'
AND referensi IS NULL;

-- Update referensi untuk transaksi donasi
UPDATE keuangan 
SET referensi = 'donasi_auto'
WHERE kategori = 'Donasi'
AND jenis_transaksi = 'Pemasukan'
AND referensi IS NULL;

-- ================================================
-- 7. UPDATE SALDO AKUN KAS
-- ================================================

-- Update saldo akun kas setelah perbaikan
SELECT update_all_saldo_akun_kas();

-- ================================================
-- 8. VERIFIKASI HASIL PERBAIKAN
-- ================================================

-- Cek total pemasukan setelah perbaikan
SELECT 
  'AFTER FIX - PEMASUKAN' as status,
  COUNT(*) as jumlah_transaksi,
  SUM(jumlah) as total_pemasukan
FROM keuangan 
WHERE jenis_transaksi = 'Pemasukan' 
AND status = 'posted';

-- Cek total pengeluaran setelah perbaikan
SELECT 
  'AFTER FIX - PENGELUARAN' as status,
  COUNT(*) as jumlah_transaksi,
  SUM(jumlah) as total_pengeluaran
FROM keuangan 
WHERE jenis_transaksi = 'Pengeluaran' 
AND status = 'posted';

-- Cek saldo akun kas setelah perbaikan
SELECT 
  'AFTER FIX - SALDO AKUN KAS' as status,
  nama,
  saldo_saat_ini
FROM akun_kas 
WHERE status = 'aktif'
ORDER BY saldo_saat_ini DESC;

-- ================================================
-- 9. CREATE VIEW UNTUK DASHBOARD (FILTER DOUBLE ENTRY)
-- ================================================

-- Buat view untuk dashboard yang filter out auto entries
CREATE OR REPLACE VIEW view_keuangan_dashboard AS
SELECT 
  id,
  jenis_transaksi,
  kategori,
  jumlah,
  tanggal,
  deskripsi,
  referensi,
  akun_kas_id,
  status,
  created_at
FROM keuangan 
WHERE status = 'posted'
AND (
  referensi IS NULL 
  OR referensi NOT IN ('inventaris_penjualan', 'donasi_auto')
);

-- ================================================
-- 10. CREATE FUNCTION UNTUK MENCEGAH DOUBLE ENTRY
-- ================================================

-- Function untuk cek dan prevent double entry
CREATE OR REPLACE FUNCTION check_double_entry(
  p_referensi VARCHAR,
  p_jumlah DECIMAL,
  p_tanggal DATE,
  p_deskripsi TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Cek apakah sudah ada transaksi yang sama dalam 1 menit terakhir
  SELECT COUNT(*) INTO v_count
  FROM keuangan 
  WHERE referensi = p_referensi
    AND jumlah = p_jumlah
    AND tanggal = p_tanggal
    AND deskripsi = p_deskripsi
    AND created_at >= NOW() - INTERVAL '1 minute';
  
  -- Return true jika tidak ada duplikasi
  RETURN v_count = 0;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 11. CREATE TRIGGER UNTUK MENCEGAH DOUBLE ENTRY
-- ================================================

-- Trigger untuk prevent double entry saat insert
CREATE OR REPLACE FUNCTION prevent_double_entry_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Cek double entry untuk referensi tertentu
  IF NEW.referensi IN ('inventaris_penjualan', 'donasi_auto') THEN
    IF NOT check_double_entry(NEW.referensi, NEW.jumlah, NEW.tanggal, NEW.deskripsi) THEN
      RAISE EXCEPTION 'Double entry detected for referensi: %', NEW.referensi;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger
DROP TRIGGER IF EXISTS trg_prevent_double_entry ON keuangan;
CREATE TRIGGER trg_prevent_double_entry
  BEFORE INSERT ON keuangan
  FOR EACH ROW
  EXECUTE FUNCTION prevent_double_entry_trigger();

-- ================================================
-- 12. SUMMARY REPORT
-- ================================================

-- Report hasil perbaikan
SELECT 
  'FIX SUMMARY' as status,
  'Duplikasi berhasil dihapus' as message,
  NOW() as timestamp;
