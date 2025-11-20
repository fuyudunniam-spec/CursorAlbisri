-- FIX DATA LOADING ISSUE
-- Script untuk memastikan data ada dan format benar

-- 1. Check semua data yang ada
SELECT 
  'SANTRI_DATA' as table_name,
  id,
  nis,
  nama_lengkap,
  kategori,
  status_santri,
  created_at
FROM santri 
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check data Ahmad Zabadi secara spesifik
SELECT 
  'AHMAD_ZABADI_DATA' as table_name,
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
WHERE nis = 'NIS2501001' 
   OR nama_lengkap ILIKE '%Ahmad Zabadi%'
   OR nama_lengkap ILIKE '%Zabadi%';

-- 3. Check wali data
SELECT 
  'WALI_DATA' as table_name,
  sw.id,
  sw.santri_id,
  s.nis,
  s.nama_lengkap as santri_nama,
  sw.nama_lengkap as wali_nama,
  sw.hubungan_keluarga,
  sw.is_utama
FROM santri_wali sw
JOIN santri s ON sw.santri_id = s.id
WHERE s.nis = 'NIS2501001' 
   OR s.nama_lengkap ILIKE '%Ahmad Zabadi%';

-- 4. Check program data
SELECT 
  'PROGRAM_DATA' as table_name,
  sp.id,
  sp.santri_id,
  s.nis,
  s.nama_lengkap as santri_nama,
  sp.nama_program,
  sp.kelas_program,
  sp.rombel
FROM santri_programs sp
JOIN santri s ON sp.santri_id = s.id
WHERE s.nis = 'NIS2501001' 
   OR s.nama_lengkap ILIKE '%Ahmad Zabadi%';

-- 5. Insert data jika belum ada (force insert)
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
     OR nama_lengkap ILIKE '%Ahmad Zabadi%'
);

-- 6. Insert wali jika belum ada
INSERT INTO santri_wali (santri_id, nama_lengkap, hubungan_keluarga, no_whatsapp, alamat, pekerjaan, penghasilan_bulanan, is_utama)
SELECT 
  s.id, 
  'Siti Aminah', 
  'Ibu', 
  '+6281234567892', 
  'Jl. Merdeka No. 123, Jakarta Pusat',
  'Buruh Pabrik',
  1500000,
  true
FROM santri s 
WHERE s.nis = 'NIS2501001'
  AND NOT EXISTS (
    SELECT 1 FROM santri_wali sw 
    WHERE sw.santri_id = s.id AND sw.is_utama = true
  );

-- 7. Insert program jika belum ada
INSERT INTO santri_programs (santri_id, nama_program, kelas_program, rombel)
SELECT 
  s.id, 
  'TPQ Reguler', 
  'Kelas 1', 
  'A'
FROM santri s 
WHERE s.nis = 'NIS2501001'
  AND NOT EXISTS (
    SELECT 1 FROM santri_programs sp 
    WHERE sp.santri_id = s.id
  );

-- 8. Verify final data
SELECT 
  'FINAL_VERIFICATION' as table_name,
  s.id,
  s.nis,
  s.nama_lengkap,
  s.kategori,
  s.status_santri,
  sw.nama_lengkap as wali_nama,
  sp.nama_program,
  sp.kelas_program
FROM santri s
LEFT JOIN santri_wali sw ON s.id = sw.santri_id AND sw.is_utama = true
LEFT JOIN santri_programs sp ON s.id = sp.santri_id
WHERE s.nis = 'NIS2501001';

