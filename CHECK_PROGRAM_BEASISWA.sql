-- Check apakah tabel program_beasiswa ada dan terisi
-- Jalankan di Supabase SQL Editor

-- 1. Check apakah tabel ada
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'program_beasiswa';

-- 2. Check struktur tabel
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'program_beasiswa'
ORDER BY ordinal_position;

-- 3. Check apakah ada data
SELECT * FROM program_beasiswa LIMIT 5;

-- 4. Add tipe_beasiswa column jika belum ada
ALTER TABLE program_beasiswa ADD COLUMN IF NOT EXISTS tipe_beasiswa VARCHAR(50);

-- 5. Jika tidak ada data, insert beberapa program contoh
INSERT INTO program_beasiswa (nama_program, tipe_beasiswa, is_active)
VALUES 
  ('Beasiswa Yatim Piatu', 'Penuh', true),
  ('Beasiswa Prestasi', 'Sebagian', true),
  ('Beasiswa Dhuafa', 'Penuh', true),
  ('Beasiswa Tahfidz', 'Penuh', true)
ON CONFLICT DO NOTHING;

-- 5. Verify data inserted
SELECT * FROM program_beasiswa WHERE is_active = true;
