-- CHECK ALL CONSTRAINTS ON PROGRAM_BEASISWA
-- Jalankan di Supabase SQL Editor

-- 1. Check ALL columns with NOT NULL constraint
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'program_beasiswa'
  AND is_nullable = 'NO'
ORDER BY ordinal_position;

-- 2. Check all columns (untuk melihat struktur lengkap)
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'program_beasiswa'
ORDER BY ordinal_position;

-- 3. Check existing data (if any)
SELECT * FROM program_beasiswa LIMIT 5;
