-- =====================================================
-- AUDIT SCRIPT FOR DOUBLE ENTRY - MCP VERSION
-- =====================================================
-- Jalankan script ini di Supabase SQL Editor untuk audit double entry

-- 1. AUDIT: Check for potential double entries from Inventaris Sales
-- =====================================================
SELECT
    'INVENTARIS SALES AUDIT' as audit_type,
    k.id,
    k.jenis_transaksi,
    k.kategori,
    k.jumlah,
    k.tanggal,
    k.deskripsi,
    k.referensi,
    ak.nama as akun_kas_nama,
    COUNT(*) OVER (PARTITION BY k.referensi, k.jumlah, k.tanggal) as potential_duplicates
FROM
    keuangan k
LEFT JOIN
    akun_kas ak ON k.akun_kas_id = ak.id
WHERE
    (k.kategori ILIKE '%penjualan inventaris%' OR k.referensi ILIKE '%inventaris_penjualan%')
    AND k.jenis_transaksi = 'Pemasukan'
ORDER BY
    k.tanggal DESC, k.jumlah DESC;

-- 2. AUDIT: Check for potential double entries from Donasi
-- =====================================================
SELECT
    'DONASI AUDIT' as audit_type,
    k.id,
    k.jenis_transaksi,
    k.kategori,
    k.jumlah,
    k.tanggal,
    k.deskripsi,
    k.referensi,
    ak.nama as akun_kas_nama,
    COUNT(*) OVER (PARTITION BY k.referensi, k.jumlah, k.tanggal) as potential_duplicates
FROM
    keuangan k
LEFT JOIN
    akun_kas ak ON k.akun_kas_id = ak.id
WHERE
    k.kategori = 'Donasi'
    AND k.referensi = 'donasi'
    AND k.jenis_transaksi = 'Pemasukan'
ORDER BY
    k.tanggal DESC, k.jumlah DESC;

-- 3. AUDIT: Identify exact duplicates (same amount, category, reference, and within a short time frame)
-- =====================================================
SELECT
    'EXACT DUPLICATES AUDIT' as audit_type,
    k.id,
    k.jenis_transaksi,
    k.kategori,
    k.jumlah,
    k.tanggal,
    k.deskripsi,
    k.referensi,
    ak.nama as akun_kas_nama,
    COUNT(*) OVER (PARTITION BY k.jenis_transaksi, k.kategori, k.jumlah, k.referensi, DATE_TRUNC('minute', k.created_at)) as exact_duplicates
FROM
    keuangan k
LEFT JOIN
    akun_kas ak ON k.akun_kas_id = ak.id
WHERE
    (k.kategori ILIKE '%penjualan inventaris%' OR k.referensi ILIKE '%inventaris_penjualan%' OR (k.kategori = 'Donasi' AND k.referensi = 'donasi'))
    AND k.jenis_transaksi = 'Pemasukan'
ORDER BY
    k.tanggal DESC, k.jumlah DESC;

-- 4. AUDIT: Summary statistics
-- =====================================================
SELECT
    'SUMMARY AUDIT' as audit_type,
    'Total Pemasukan' as metric,
    COUNT(*) as count,
    SUM(jumlah) as total_amount
FROM keuangan 
WHERE jenis_transaksi = 'Pemasukan'

UNION ALL

SELECT
    'SUMMARY AUDIT' as audit_type,
    'Inventaris Sales' as metric,
    COUNT(*) as count,
    SUM(jumlah) as total_amount
FROM keuangan 
WHERE (kategori ILIKE '%penjualan inventaris%' OR referensi ILIKE '%inventaris_penjualan%')
    AND jenis_transaksi = 'Pemasukan'

UNION ALL

SELECT
    'SUMMARY AUDIT' as audit_type,
    'Donasi' as metric,
    COUNT(*) as count,
    SUM(jumlah) as total_amount
FROM keuangan 
WHERE kategori = 'Donasi' AND referensi = 'donasi' AND jenis_transaksi = 'Pemasukan';
