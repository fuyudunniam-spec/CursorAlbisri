-- =====================================================
-- FIX SCRIPT FOR DOUBLE ENTRY - MCP VERSION
-- =====================================================
-- WARNING: This script will DELETE data. Please BACKUP your database before running.
-- Ensure you have identified the correct duplicates using AUDIT_DOUBLE_ENTRY_MCP.sql first.

-- 1. BACKUP: Create backup table before fixing
-- =====================================================
CREATE TABLE IF NOT EXISTS keuangan_backup_before_fix AS 
SELECT * FROM keuangan 
WHERE (kategori ILIKE '%penjualan inventaris%' OR referensi ILIKE '%inventaris_penjualan%' OR (kategori = 'Donasi' AND referensi = 'donasi'))
    AND jenis_transaksi = 'Pemasukan';

-- 2. FIX: Delete duplicate entries for 'Penjualan Inventaris'
-- =====================================================
-- This keeps only one entry for each unique (referensi, jumlah, tanggal) combination
DELETE FROM keuangan
WHERE id IN (
    SELECT k.id
    FROM (
        SELECT
            id,
            referensi,
            jumlah,
            tanggal,
            created_at,
            ROW_NUMBER() OVER (PARTITION BY referensi, jumlah, tanggal ORDER BY created_at DESC) as rn
        FROM
            keuangan
        WHERE
            (kategori ILIKE '%penjualan inventaris%' OR referensi ILIKE '%inventaris_penjualan%')
            AND jenis_transaksi = 'Pemasukan'
    ) k
    WHERE k.rn > 1
);

-- 3. FIX: Delete duplicate entries for 'Donasi'
-- =====================================================
-- This keeps only one entry for each unique (referensi, jumlah, tanggal) combination
DELETE FROM keuangan
WHERE id IN (
    SELECT k.id
    FROM (
        SELECT
            id,
            referensi,
            jumlah,
            tanggal,
            created_at,
            ROW_NUMBER() OVER (PARTITION BY referensi, jumlah, tanggal ORDER BY created_at DESC) as rn
        FROM
            keuangan
        WHERE
            kategori = 'Donasi'
            AND referensi = 'donasi'
            AND jenis_transaksi = 'Pemasukan'
    ) k
    WHERE k.rn > 1
);

-- 4. UPDATE: Recalculate all account balances after cleanup
-- =====================================================
-- This ensures all saldo_saat_ini values are accurate
SELECT update_all_saldo_akun_kas();

-- 5. VERIFY: Check results after fix
-- =====================================================
SELECT
    'POST-FIX VERIFICATION' as status,
    'Total Pemasukan' as metric,
    COUNT(*) as count,
    SUM(jumlah) as total_amount
FROM keuangan 
WHERE jenis_transaksi = 'Pemasukan'

UNION ALL

SELECT
    'POST-FIX VERIFICATION' as status,
    'Inventaris Sales' as metric,
    COUNT(*) as count,
    SUM(jumlah) as total_amount
FROM keuangan 
WHERE (kategori ILIKE '%penjualan inventaris%' OR referensi ILIKE '%inventaris_penjualan%')
    AND jenis_transaksi = 'Pemasukan'

UNION ALL

SELECT
    'POST-FIX VERIFICATION' as status,
    'Donasi' as metric,
    COUNT(*) as count,
    SUM(jumlah) as total_amount
FROM keuangan 
WHERE kategori = 'Donasi' AND referensi = 'donasi' AND jenis_transaksi = 'Pemasukan';

-- 6. CLEANUP: Drop backup table after verification (optional)
-- =====================================================
-- DROP TABLE IF EXISTS keuangan_backup_before_fix;
