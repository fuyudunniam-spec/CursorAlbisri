-- TEST DATABASE CONNECTION & DATA
-- Debug mengapa data tidak tampil di aplikasi

-- 1. Check apakah data santri benar-benar ada
SELECT 
  'Data Santri Count' as test_name,
  COUNT(*) as count,
  CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END as result
FROM santri;

-- 2. Check data Ahmad Zabadi specifically
SELECT 
  'Ahmad Zabadi Data' as test_name,
  COUNT(*) as count,
  CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END as result
FROM santri 
WHERE nis = 'NIS2501001' OR nama_lengkap ILIKE '%Ahmad Zabadi%';

-- 3. Check data wali
SELECT 
  'Data Wali Count' as test_name,
  COUNT(*) as count,
  CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END as result
FROM santri_wali;

-- 4. Check data program
SELECT 
  'Data Program Count' as test_name,
  COUNT(*) as count,
  CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END as result
FROM santri_programs;

-- 5. Check program beasiswa
SELECT 
  'Data Program Beasiswa Count' as test_name,
  COUNT(*) as count,
  CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END as result
FROM program_beasiswa 
WHERE status = 'aktif';

-- 6. Get exact data untuk testing
SELECT 
  'EXACT_DATA' as test_name,
  id,
  nis,
  nama_lengkap,
  kategori,
  status_santri
FROM santri 
WHERE nis = 'NIS2501001' OR nama_lengkap ILIKE '%Ahmad Zabadi%'
LIMIT 1;

-- 7. Test query dengan format yang sama seperti aplikasi
SELECT 
  'APP_QUERY_TEST' as test_name,
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
  tipe_pembayaran
FROM santri 
WHERE id = (SELECT id FROM santri WHERE nis = 'NIS2501001' LIMIT 1)
LIMIT 1;

