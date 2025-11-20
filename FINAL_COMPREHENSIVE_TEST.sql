-- ========================================
-- FINAL COMPREHENSIVE TEST & FIX
-- ========================================
-- Jalankan di Supabase SQL Editor

-- STEP 1: Check if data exists
SELECT 
  '=== CHECKING EXISTING DATA ===' as step,
  COUNT(*) as total_santri
FROM santri;

-- STEP 2: Show all santri with details
SELECT 
  '=== ALL SANTRI ===' as step,
  id,
  nis,
  nama_lengkap,
  kategori,
  status_santri,
  angkatan,
  created_at
FROM santri 
ORDER BY created_at DESC
LIMIT 10;

-- STEP 3: Check specific santri (Ahmad Zabadi or NIS2501001)
SELECT 
  '=== SPECIFIC SANTRI ===' as step,
  id,
  nis,
  nama_lengkap,
  tempat_lahir,
  tanggal_lahir,
  jenis_kelamin,
  agama,
  status_anak,
  alamat,
  no_whatsapp,
  kategori,
  angkatan,
  tanggal_masuk,
  status_santri,
  tipe_pembayaran,
  foto_profil
FROM santri 
WHERE nis = 'NIS2501001' 
   OR nama_lengkap ILIKE '%Ahmad Zabadi%'
   OR nama_lengkap ILIKE '%Zabadi%'
LIMIT 1;

-- STEP 4: If no data, insert sample santri
INSERT INTO santri (
  nis, nama_lengkap, tempat_lahir, tanggal_lahir, jenis_kelamin, 
  agama, status_anak, no_whatsapp, alamat, kategori, 
  angkatan, tanggal_masuk, status_santri, tipe_pembayaran
)
SELECT 
  'NIS2501001', 
  'Ahmad Zabadi', 
  'Jakarta', 
  '2010-05-15', 
  'Laki-laki', 
  'Islam', 
  'Anak Yatim', 
  '+6281234567890', 
  'Jl. Merdeka No. 123, Jakarta Pusat', 
  'Santri Reguler', 
  '2025', 
  '2025-01-01', 
  'Aktif', 
  'Bayar Sendiri'
WHERE NOT EXISTS (
  SELECT 1 FROM santri 
  WHERE nis = 'NIS2501001'
);

-- STEP 5: Get santri ID for URL testing
SELECT 
  '=== SANTRI ID FOR URL ===' as step,
  id as santri_id,
  nis,
  nama_lengkap,
  'http://localhost:8080/santri/profile?santriId=' || id || '&santriName=' || nama_lengkap as profile_url
FROM santri 
WHERE nis = 'NIS2501001' 
   OR nama_lengkap ILIKE '%Ahmad Zabadi%'
LIMIT 1;

-- STEP 6: Check wali data
SELECT 
  '=== WALI DATA ===' as step,
  sw.id,
  sw.santri_id,
  s.nama_lengkap as santri_nama,
  sw.nama_lengkap as wali_nama,
  sw.hubungan_keluarga,
  sw.is_utama
FROM santri_wali sw
JOIN santri s ON sw.santri_id = s.id
WHERE s.nis = 'NIS2501001' 
   OR s.nama_lengkap ILIKE '%Ahmad Zabadi%';

-- STEP 7: Insert wali if not exists
INSERT INTO santri_wali (
  santri_id, nama_lengkap, hubungan_keluarga, 
  no_whatsapp, alamat, pekerjaan, penghasilan_bulanan, is_utama
)
SELECT 
  s.id, 
  'Siti Aminah', 
  'Ibu', 
  '+6281234567892', 
  'Jl. Merdeka No. 123, Jakarta Pusat',
  'Ibu Rumah Tangga',
  0,
  true
FROM santri s 
WHERE (s.nis = 'NIS2501001' OR s.nama_lengkap ILIKE '%Ahmad Zabadi%')
  AND NOT EXISTS (
    SELECT 1 FROM santri_wali sw 
    WHERE sw.santri_id = s.id AND sw.is_utama = true
  );

-- STEP 8: Check program data
SELECT 
  '=== PROGRAM DATA ===' as step,
  sp.id,
  sp.santri_id,
  s.nama_lengkap as santri_nama,
  sp.nama_program,
  sp.kelas_program,
  sp.rombel
FROM santri_programs sp
JOIN santri s ON sp.santri_id = s.id
WHERE s.nis = 'NIS2501001' 
   OR s.nama_lengkap ILIKE '%Ahmad Zabadi%';

-- STEP 9: Insert program if not exists
INSERT INTO santri_programs (
  santri_id, nama_program, kelas_program, rombel
)
SELECT 
  s.id, 
  'TPQ Reguler', 
  'Kelas 1', 
  'A'
FROM santri s 
WHERE (s.nis = 'NIS2501001' OR s.nama_lengkap ILIKE '%Ahmad Zabadi%')
  AND NOT EXISTS (
    SELECT 1 FROM santri_programs sp 
    WHERE sp.santri_id = s.id
  );

-- STEP 10: Final verification
SELECT 
  '=== FINAL VERIFICATION ===' as step,
  s.id as santri_id,
  s.nis,
  s.nama_lengkap,
  s.kategori,
  s.status_santri,
  COUNT(DISTINCT sw.id) as jumlah_wali,
  COUNT(DISTINCT sp.id) as jumlah_program,
  'READY TO TEST' as status
FROM santri s
LEFT JOIN santri_wali sw ON s.id = sw.santri_id
LEFT JOIN santri_programs sp ON s.id = sp.santri_id
WHERE s.nis = 'NIS2501001' 
   OR s.nama_lengkap ILIKE '%Ahmad Zabadi%'
GROUP BY s.id, s.nis, s.nama_lengkap, s.kategori, s.status_santri;

-- STEP 11: Generate test URLs for ALL santri
SELECT 
  '=== TEST URLS FOR ALL SANTRI ===' as step,
  ROW_NUMBER() OVER (ORDER BY created_at DESC) as no,
  id,
  nis,
  nama_lengkap,
  'http://localhost:8080/santri/profile?santriId=' || id || '&santriName=' || REPLACE(nama_lengkap, ' ', '%20') as url
FROM santri 
ORDER BY created_at DESC
LIMIT 5;
