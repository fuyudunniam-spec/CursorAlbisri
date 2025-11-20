-- QUICK FIX untuk schema errors
-- Jalankan satu per satu di Supabase SQL Editor

-- STEP 1: Fix santri_programs constraint
ALTER TABLE santri_programs ALTER COLUMN nama_program DROP NOT NULL;

-- STEP 2: Add tipe_beasiswa column jika belum ada
ALTER TABLE program_beasiswa ADD COLUMN IF NOT EXISTS tipe_beasiswa VARCHAR(50);

-- STEP 3: Insert program beasiswa
INSERT INTO program_beasiswa (nama_program, tipe_beasiswa, is_active)
VALUES 
  ('Beasiswa Yatim Piatu', 'Penuh', true),
  ('Beasiswa Prestasi', 'Sebagian', true),
  ('Beasiswa Dhuafa', 'Penuh', true)
ON CONFLICT DO NOTHING;

-- STEP 4: Insert sample santri
INSERT INTO santri (
  nis, nama_lengkap, tempat_lahir, tanggal_lahir, jenis_kelamin, 
  agama, status_anak, no_whatsapp, alamat, kategori, 
  angkatan, tanggal_masuk, status_santri, tipe_pembayaran
)
VALUES 
  ('NIS2501001', 'Zabadi', 'Jakarta', '2010-05-15', 'Laki-laki', 
   'Islam', 'Anak Kandung', '+6281234567890', 'Jl. Merdeka No. 123', 'Santri Reguler', 
   '2025', '2025-01-01', 'Aktif', 'Bayar Sendiri')
ON CONFLICT (nis) DO NOTHING;

-- STEP 5: Insert wali
INSERT INTO santri_wali (santri_id, nama_lengkap, hubungan_keluarga, no_whatsapp, is_utama)
SELECT s.id, 'Budi Santoso', 'Ayah', '+6281234567892', true
FROM santri s WHERE s.nis = 'NIS2501001'
ON CONFLICT DO NOTHING;

-- STEP 6: Insert program dengan nama_program
INSERT INTO santri_programs (santri_id, nama_program, kelas_program, rombel)
SELECT s.id, 'TPQ Reguler', 'Kelas 1', 'A'
FROM santri s WHERE s.nis = 'NIS2501001'
ON CONFLICT DO NOTHING;

