-- DEBUG SANTRI PROFILE ISSUE
-- Jalankan di Supabase SQL Editor untuk check data

-- 1. Check apakah data santri ada
SELECT 
  id,
  nis,
  nama_lengkap,
  kategori,
  status_santri,
  created_at
FROM santri 
WHERE nis = 'NIS2501001'
ORDER BY created_at DESC;

-- 2. Check semua santri yang ada
SELECT 
  id,
  nis,
  nama_lengkap,
  kategori,
  status_santri
FROM santri 
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check wali data
SELECT 
  s.nis,
  s.nama_lengkap AS santri_nama,
  sw.nama_lengkap AS wali_nama,
  sw.hubungan_keluarga
FROM santri s
LEFT JOIN santri_wali sw ON s.id = sw.santri_id
WHERE s.nis = 'NIS2501001';

-- 4. Check program data
SELECT 
  s.nis,
  s.nama_lengkap AS santri_nama,
  sp.nama_program,
  sp.kelas_program
FROM santri s
LEFT JOIN santri_programs sp ON s.id = sp.santri_id
WHERE s.nis = 'NIS2501001';

-- 5. Check program beasiswa
SELECT 
  id,
  nama_program,
  jenis,
  status
FROM program_beasiswa 
WHERE status = 'aktif'
ORDER BY nama_program;
