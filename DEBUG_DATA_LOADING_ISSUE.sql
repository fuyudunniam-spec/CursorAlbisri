-- DEBUG DATA LOADING ISSUE
-- SantriId sudah terbaca tapi data tidak tampil

-- 1. Check semua data santri yang ada
SELECT 
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
  created_at
FROM santri 
ORDER BY created_at DESC;

-- 2. Check data wali
SELECT 
  sw.id,
  sw.santri_id,
  s.nis,
  s.nama_lengkap as santri_nama,
  sw.nama_lengkap as wali_nama,
  sw.hubungan_keluarga,
  sw.no_whatsapp,
  sw.alamat,
  sw.pekerjaan,
  sw.penghasilan_bulanan,
  sw.is_utama
FROM santri_wali sw
JOIN santri s ON sw.santri_id = s.id
ORDER BY sw.created_at DESC;

-- 3. Check data program
SELECT 
  sp.id,
  sp.santri_id,
  s.nis,
  s.nama_lengkap as santri_nama,
  sp.nama_program,
  sp.kelas_program,
  sp.rombel
FROM santri_programs sp
JOIN santri s ON sp.santri_id = s.id
ORDER BY sp.created_at DESC;

-- 4. Test query yang sama dengan SantriProfile.tsx
-- (Ganti UUID dengan ID yang benar dari query #1)
SELECT 
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
WHERE id = 'REPLACE_WITH_ACTUAL_ID_FROM_QUERY_1'
  AND id IS NOT NULL;

