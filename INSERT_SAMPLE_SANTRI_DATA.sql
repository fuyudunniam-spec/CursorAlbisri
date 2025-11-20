-- Insert sample santri data untuk testing
-- Jalankan di Supabase SQL Editor

-- 1. Check apakah sudah ada data santri
SELECT COUNT(*) as total_santri FROM santri;

-- 2. Insert sample santri jika belum ada
INSERT INTO santri (
  nis,
  nama_lengkap,
  tempat_lahir,
  tanggal_lahir,
  jenis_kelamin,
  agama,
  status_anak,
  no_whatsapp,
  alamat,
  kategori,
  angkatan,
  tanggal_masuk,
  status_santri,
  tipe_pembayaran
)
VALUES 
  (
    'NIS2501001',
    'Zabadi',
    'Jakarta',
    '2010-05-15',
    'Laki-laki',
    'Islam',
    'Anak Kandung',
    '+6281234567890',
    'Jl. Merdeka No. 123, Jakarta Pusat',
    'Santri Reguler',
    '2025',
    '2025-01-01',
    'Aktif',
    'Bayar Sendiri'
  ),
  (
    'NIS2501002',
    'Ahmad Yatim',
    'Bandung',
    '2012-03-20',
    'Laki-laki',
    'Islam',
    'Anak Yatim',
    '+6281234567891',
    'Jl. Sudirman No. 456, Bandung',
    'Santri Reguler',
    '2025',
    '2025-01-15',
    'Aktif',
    'Bayar Sendiri'
  )
ON CONFLICT (nis) DO NOTHING;

-- 3. Insert sample wali data
INSERT INTO santri_wali (
  santri_id,
  nama_lengkap,
  hubungan_keluarga,
  no_whatsapp,
  alamat,
  pekerjaan,
  penghasilan_bulanan,
  is_utama
)
SELECT 
  s.id,
  'Budi Santoso',
  'Ayah',
  '+6281234567892',
  'Jl. Merdeka No. 123, Jakarta Pusat',
  'Karyawan Swasta',
  3000000,
  true
FROM santri s 
WHERE s.nis = 'NIS2501001'
ON CONFLICT DO NOTHING;

INSERT INTO santri_wali (
  santri_id,
  nama_lengkap,
  hubungan_keluarga,
  no_whatsapp,
  alamat,
  pekerjaan,
  penghasilan_bulanan,
  is_utama
)
SELECT 
  s.id,
  'Siti Aminah',
  'Ibu',
  '+6281234567893',
  'Jl. Sudirman No. 456, Bandung',
  'Ibu Rumah Tangga',
  1500000,
  true
FROM santri s 
WHERE s.nis = 'NIS2501002'
ON CONFLICT DO NOTHING;

-- 4. Insert sample program data (dengan nama_program)
INSERT INTO santri_programs (
  santri_id,
  nama_program,
  kelas_program,
  rombel
)
SELECT 
  s.id,
  'TPQ Reguler',
  'Kelas 1',
  'A'
FROM santri s 
WHERE s.nis = 'NIS2501001'
ON CONFLICT DO NOTHING;

INSERT INTO santri_programs (
  santri_id,
  nama_program,
  kelas_program,
  rombel
)
SELECT 
  s.id,
  'TPQ Reguler',
  'Kelas 3',
  'B'
FROM santri s 
WHERE s.nis = 'NIS2501002'
ON CONFLICT DO NOTHING;

-- 5. Verify data inserted
SELECT 
  s.id,
  s.nis,
  s.nama_lengkap,
  s.kategori,
  s.status_santri,
  sw.nama_lengkap as wali_nama,
  sp.kelas_program
FROM santri s
LEFT JOIN santri_wali sw ON s.id = sw.santri_id AND sw.is_utama = true
LEFT JOIN santri_programs sp ON s.id = sp.santri_id
ORDER BY s.created_at DESC;
