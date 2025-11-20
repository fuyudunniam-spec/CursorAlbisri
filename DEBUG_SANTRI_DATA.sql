-- Debug script untuk check data santri
-- Jalankan di Supabase SQL Editor

-- 1. Check apakah ada data santri
SELECT 
  id,
  nama_lengkap,
  nis,
  kategori,
  angkatan,
  tanggal_masuk,
  status_santri,
  tempat_lahir,
  tanggal_lahir,
  jenis_kelamin,
  agama,
  status_anak,
  no_whatsapp,
  alamat
FROM santri 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Check apakah ada data wali
SELECT 
  sw.id,
  sw.nama_lengkap,
  sw.hubungan_keluarga,
  sw.is_utama,
  s.nama_lengkap as santri_nama
FROM santri_wali sw
JOIN santri s ON sw.santri_id = s.id
ORDER BY sw.created_at DESC 
LIMIT 5;

-- 3. Check apakah ada data program
SELECT 
  sp.id,
  sp.kelas_program,
  sp.rombel,
  s.nama_lengkap as santri_nama
FROM santri_programs sp
JOIN santri s ON sp.santri_id = s.id
ORDER BY sp.created_at DESC 
LIMIT 5;

-- 4. Check pengajuan beasiswa
SELECT 
  pb.id,
  pb.status_pengajuan,
  pb.tanggal_pengajuan,
  s.nama_lengkap as santri_nama
FROM pengajuan_beasiswa pb
JOIN santri s ON pb.santri_id = s.id
ORDER BY pb.tanggal_pengajuan DESC 
LIMIT 5;
