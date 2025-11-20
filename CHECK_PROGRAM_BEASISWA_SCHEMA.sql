-- CHECK STRUKTUR TABEL PROGRAM_BEASISWA YANG SEBENARNYA
-- Jalankan di Supabase SQL Editor

SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default,
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'program_beasiswa'
ORDER BY ordinal_position;
