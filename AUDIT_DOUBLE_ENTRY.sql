-- ================================================
-- AUDIT DOUBLE ENTRY - KEUANGAN MODULE
-- ================================================
-- Purpose: Audit dan fix double entry dari penjualan inventaris dan donasi
-- ================================================

-- ================================================
-- 1. AUDIT: Cek Duplikasi Penjualan Inventaris
-- ================================================

-- Cek transaksi keuangan yang mungkin duplikasi dari inventaris
SELECT 
  'INVENTARIS SALES AUDIT' as audit_type,
  kategori,
  COUNT(*) as jumlah_transaksi,
  SUM(jumlah) as total_nilai,
  MIN(tanggal) as tanggal_terlama,
  MAX(tanggal) as tanggal_terbaru
FROM keuangan 
WHERE (
  kategori ILIKE '%penjualan%' 
  OR kategori ILIKE '%inventaris%'
  OR kategori ILIKE '%jual%'
  OR deskripsi ILIKE '%penjualan%'
  OR deskripsi ILIKE '%jual%'
  OR referensi ILIKE '%inventaris%'
)
GROUP BY kategori
ORDER BY total_nilai DESC;

-- ================================================
-- 2. AUDIT: Cek Duplikasi Donasi
-- ================================================

-- Cek transaksi keuangan donasi
SELECT 
  'DONASI AUDIT' as audit_type,
  kategori,
  COUNT(*) as jumlah_transaksi,
  SUM(jumlah) as total_nilai,
  MIN(tanggal) as tanggal_terlama,
  MAX(tanggal) as tanggal_terbaru
FROM keuangan 
WHERE kategori = 'Donasi'
GROUP BY kategori;

-- ================================================
-- 3. AUDIT: Cek Transaksi dengan Referensi
-- ================================================

-- Cek semua referensi yang ada
SELECT 
  'REFERENSI AUDIT' as audit_type,
  referensi,
  COUNT(*) as jumlah_transaksi,
  SUM(jumlah) as total_nilai
FROM keuangan 
WHERE referensi IS NOT NULL
GROUP BY referensi
ORDER BY total_nilai DESC;

-- ================================================
-- 4. AUDIT: Cek Transaksi Berdasarkan Deskripsi
-- ================================================

-- Cek deskripsi yang mengandung kata kunci penjualan
SELECT 
  'DESKRIPSI PENJUALAN AUDIT' as audit_type,
  deskripsi,
  COUNT(*) as jumlah_transaksi,
  SUM(jumlah) as total_nilai
FROM keuangan 
WHERE deskripsi ILIKE '%penjualan%' 
   OR deskripsi ILIKE '%jual%'
   OR deskripsi ILIKE '%harga%'
GROUP BY deskripsi
ORDER BY total_nilai DESC;

-- ================================================
-- 5. AUDIT: Cek Transaksi Berdasarkan Waktu
-- ================================================

-- Cek transaksi yang dibuat dalam waktu yang sama (kemungkinan duplikasi)
SELECT 
  'TIMING AUDIT' as audit_type,
  DATE_TRUNC('minute', created_at) as waktu_menit,
  COUNT(*) as jumlah_transaksi,
  SUM(jumlah) as total_nilai,
  STRING_AGG(DISTINCT kategori, ', ') as kategori_list
FROM keuangan 
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('minute', created_at)
HAVING COUNT(*) > 1
ORDER BY waktu_menit DESC;

-- ================================================
-- 6. AUDIT: Cek Saldo vs Transaksi
-- ================================================

-- Hitung total pemasukan dan pengeluaran
SELECT 
  'SALDO AUDIT' as audit_type,
  jenis_transaksi,
  COUNT(*) as jumlah_transaksi,
  SUM(jumlah) as total_nilai,
  AVG(jumlah) as rata_rata
FROM keuangan 
WHERE status = 'posted'
GROUP BY jenis_transaksi;

-- ================================================
-- 7. AUDIT: Cek Akun Kas vs Keuangan
-- ================================================

-- Bandingkan saldo akun_kas dengan total keuangan
SELECT 
  'AKUN KAS AUDIT' as audit_type,
  ak.nama as nama_akun,
  ak.saldo_saat_ini as saldo_akun_kas,
  COALESCE(SUM(k.jumlah), 0) as total_keuangan,
  (ak.saldo_saat_ini - COALESCE(SUM(k.jumlah), 0)) as selisih
FROM akun_kas ak
LEFT JOIN keuangan k ON k.akun_kas_id = ak.id AND k.status = 'posted'
GROUP BY ak.id, ak.nama, ak.saldo_saat_ini
ORDER BY selisih DESC;

-- ================================================
-- 8. AUDIT: Cek Transaksi Inventaris vs Keuangan
-- ================================================

-- Bandingkan transaksi inventaris dengan keuangan
SELECT 
  'INVENTARIS VS KEUANGAN AUDIT' as audit_type,
  ti.tipe as tipe_inventaris,
  COUNT(ti.id) as jumlah_transaksi_inventaris,
  SUM(ti.harga_satuan * ti.jumlah) as total_nilai_inventaris,
  COUNT(k.id) as jumlah_transaksi_keuangan,
  SUM(k.jumlah) as total_nilai_keuangan
FROM transaksi_inventaris ti
LEFT JOIN keuangan k ON k.referensi = 'inventaris' 
  AND k.deskripsi ILIKE '%' || ti.catatan || '%'
  AND k.tanggal = ti.tanggal
WHERE ti.tipe = 'Keluar' AND ti.harga_satuan IS NOT NULL
GROUP BY ti.tipe
ORDER BY total_nilai_inventaris DESC;
