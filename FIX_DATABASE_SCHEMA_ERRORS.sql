-- Fix database schema errors
-- Jalankan di Supabase SQL Editor

-- 1. Check struktur tabel santri_programs
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'santri_programs'
ORDER BY ordinal_position;

-- 2. Check struktur tabel program_beasiswa  
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'program_beasiswa'
ORDER BY ordinal_position;

-- 3. Fix santri_programs - make nama_program nullable atau add default
ALTER TABLE santri_programs ALTER COLUMN nama_program DROP NOT NULL;

-- 4. Check jika program_beasiswa ada kolom yang salah
-- Jika tidak ada tipe_beasiswa, buat kolom baru
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'program_beasiswa' 
        AND column_name = 'tipe_beasiswa'
    ) THEN
        ALTER TABLE program_beasiswa ADD COLUMN tipe_beasiswa VARCHAR(50);
    END IF;
END $$;

-- 5. Insert program beasiswa dengan kolom yang benar
INSERT INTO program_beasiswa (nama_program, tipe_beasiswa, deskripsi, is_active)
VALUES 
  ('Beasiswa Yatim Piatu', 'Penuh', 'Beasiswa untuk anak yatim piatu', true),
  ('Beasiswa Prestasi', 'Sebagian', 'Beasiswa untuk santri berprestasi', true),
  ('Beasiswa Dhuafa', 'Penuh', 'Beasiswa untuk keluarga kurang mampu', true),
  ('Beasiswa Tahfidz', 'Penuh', 'Beasiswa untuk penghafal Al-Quran', true)
ON CONFLICT DO NOTHING;

-- 6. Insert sample santri data dengan nama_program yang benar
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

-- 7. Insert wali data
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

-- 8. Insert program data dengan nama_program yang benar
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

-- 9. Verify data
SELECT 
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
ORDER BY s.created_at DESC;

