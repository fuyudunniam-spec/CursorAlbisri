-- =====================================================
-- COMPLETE DOUBLE ENTRY FIX SCRIPT - MCP VERSION
-- =====================================================
-- Jalankan script ini di Supabase SQL Editor untuk complete fix

-- STEP 1: AUDIT - Check current state
-- =====================================================
\echo '=== STEP 1: AUDIT CURRENT STATE ==='

-- Check total transactions
SELECT 
    'BEFORE FIX' as status,
    jenis_transaksi,
    COUNT(*) as count,
    SUM(jumlah) as total_amount
FROM keuangan 
GROUP BY jenis_transaksi
ORDER BY jenis_transaksi;

-- Check for potential duplicates
SELECT 
    'POTENTIAL DUPLICATES' as status,
    kategori,
    referensi,
    jumlah,
    tanggal,
    COUNT(*) as duplicate_count
FROM keuangan
WHERE jenis_transaksi = 'Pemasukan'
GROUP BY kategori, referensi, jumlah, tanggal
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, tanggal DESC;

-- STEP 2: BACKUP - Create backup before fixing
-- =====================================================
\echo '=== STEP 2: CREATING BACKUP ==='

CREATE TABLE IF NOT EXISTS keuangan_backup_$(date +%Y%m%d_%H%M%S) AS 
SELECT * FROM keuangan 
WHERE (kategori ILIKE '%penjualan inventaris%' OR referensi ILIKE '%inventaris_penjualan%' OR (kategori = 'Donasi' AND referensi = 'donasi'))
    AND jenis_transaksi = 'Pemasukan';

-- STEP 3: FIX - Remove duplicates
-- =====================================================
\echo '=== STEP 3: FIXING DUPLICATES ==='

-- Fix Inventaris Sales duplicates
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

-- Fix Donasi duplicates
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

-- STEP 4: UPDATE - Recalculate balances
-- =====================================================
\echo '=== STEP 4: UPDATING BALANCES ==='

-- Update all account balances
SELECT update_all_saldo_akun_kas();

-- STEP 5: VERIFY - Check results
-- =====================================================
\echo '=== STEP 5: VERIFICATION ==='

-- Check final state
SELECT 
    'AFTER FIX' as status,
    jenis_transaksi,
    COUNT(*) as count,
    SUM(jumlah) as total_amount
FROM keuangan 
GROUP BY jenis_transaksi
ORDER BY jenis_transaksi;

-- Check if duplicates still exist
SELECT 
    'REMAINING DUPLICATES' as status,
    kategori,
    referensi,
    jumlah,
    tanggal,
    COUNT(*) as duplicate_count
FROM keuangan
WHERE jenis_transaksi = 'Pemasukan'
GROUP BY kategori, referensi, jumlah, tanggal
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, tanggal DESC;

-- STEP 6: MONITORING - Setup prevention
-- =====================================================
\echo '=== STEP 6: SETTING UP MONITORING ==='

-- Create monitoring functions
CREATE OR REPLACE FUNCTION detect_potential_double_entry()
RETURNS TABLE (
    duplicate_count BIGINT,
    total_amount NUMERIC,
    categories TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as duplicate_count,
        SUM(k.jumlah) as total_amount,
        ARRAY_AGG(DISTINCT k.kategori) as categories
    FROM (
        SELECT
            kategori,
            jumlah,
            tanggal,
            referensi,
            COUNT(*) OVER (PARTITION BY kategori, jumlah, tanggal, referensi) as dup_count
        FROM keuangan
        WHERE jenis_transaksi = 'Pemasukan'
    ) k
    WHERE k.dup_count > 1;
END;
$$ LANGUAGE plpgsql;

-- Create monitoring view
CREATE OR REPLACE VIEW v_double_entry_monitor AS
SELECT
    'POTENTIAL_DUPLICATES' as alert_type,
    k.kategori,
    k.referensi,
    k.jumlah,
    k.tanggal,
    COUNT(*) as duplicate_count,
    STRING_AGG(k.id::TEXT, ', ') as duplicate_ids
FROM keuangan k
WHERE k.jenis_transaksi = 'Pemasukan'
GROUP BY k.kategori, k.referensi, k.jumlah, k.tanggal
HAVING COUNT(*) > 1
ORDER BY k.tanggal DESC;

-- Test monitoring
SELECT 'MONITORING TEST' as test_type, * FROM detect_potential_double_entry();
SELECT 'MONITORING VIEW' as test_type, * FROM v_double_entry_monitor;

\echo '=== DOUBLE ENTRY FIX COMPLETED ==='
\echo 'Please verify the results and test your application.'
