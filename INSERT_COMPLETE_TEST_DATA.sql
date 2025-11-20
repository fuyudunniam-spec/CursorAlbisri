-- INSERT COMPLETE TEST DATA - SANTRI + PROGRAM BEASISWA
-- Jalankan di Supabase SQL Editor

-- ===================================
-- 1. INSERT PROGRAM BEASISWA
-- ===================================
INSERT INTO program_beasiswa (
  nama_program, 
  jenis, 
  nominal_per_periode,
  periode_aktif,
  tanggal_mulai,
  status,
  kriteria,
  deskripsi
)
VALUES 
  (
    'Beasiswa Yatim Piatu', 
    'Yatim', 
    1000000, 
    'Bulanan',
    CURRENT_DATE,
    'aktif',
    'Anak yatim atau yatim piatu dengan kondisi ekonomi lemah',
    'Program beasiswa penuh untuk santri yatim piatu'
  ),
  (
    'Beasiswa Prestasi Akademik', 
    'Prestasi Akademik', 
    500000, 
    'Semester',
    CURRENT_DATE,
    'aktif',
    'Santri dengan nilai rata-rata minimal 85',
    'Beasiswa untuk santri berprestasi di bidang akademik'
  ),
  (
    'Beasiswa Dhuafa', 
    'Dhuafa', 
    800000, 
    'Bulanan',
    CURRENT_DATE,
    'aktif',
    'Keluarga dengan penghasilan di bawah UMR',
    'Program beasiswa untuk santri dari keluarga kurang mampu'
  )
ON CONFLICT DO NOTHING;

-- ===================================
-- 2. INSERT SANTRI
-- ===================================
INSERT INTO santri (
  nis, nama_lengkap, tempat_lahir, tanggal_lahir, jenis_kelamin, 
  agama, status_anak, no_whatsapp, alamat, kategori, 
  angkatan, tanggal_masuk, status_santri, tipe_pembayaran
)
VALUES (
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
)
ON CONFLICT (nis) DO NOTHING;

-- ===================================
-- 3. INSERT WALI
-- ===================================
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
ON CONFLICT DO NOTHING;

-- ===================================
-- 4. INSERT PROGRAM SANTRI
-- ===================================
INSERT INTO santri_programs (santri_id, nama_program, kelas_program, rombel)
SELECT 
  s.id, 
  'TPQ Reguler', 
  'Kelas 1', 
  'A'
FROM santri s 
WHERE s.nis = 'NIS2501001'
ON CONFLICT DO NOTHING;

-- ===================================
-- 5. VERIFY ALL DATA
-- ===================================

-- Check Program Beasiswa
SELECT 
  nama_program, 
  jenis,
  nominal_per_periode,
  periode_aktif,
  status
FROM program_beasiswa 
WHERE status = 'aktif';

-- Check Santri + Wali + Program
SELECT 
  s.nis,
  s.nama_lengkap AS santri_nama,
  s.kategori,
  s.status_anak,
  sw.nama_lengkap AS wali_nama,
  sw.hubungan_keluarga,
  sw.penghasilan_bulanan,
  sp.nama_program,
  sp.kelas_program
FROM santri s
LEFT JOIN santri_wali sw ON s.id = sw.santri_id AND sw.is_utama = true
LEFT JOIN santri_programs sp ON s.id = sp.santri_id
WHERE s.nis = 'NIS2501001';
