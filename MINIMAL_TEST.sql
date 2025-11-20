-- MINIMAL TEST - Test apakah database bisa diakses
-- Jalankan di Supabase SQL Editor

-- 1. Test basic table access
SELECT 'santri' as table_name, COUNT(*) as count FROM santri
UNION ALL
SELECT 'program_beasiswa', COUNT(*) FROM program_beasiswa;

-- 2. Test insert simple data
INSERT INTO program_beasiswa (nama_program, is_active) 
VALUES ('Test Program', true);

-- 3. Test select
SELECT * FROM program_beasiswa WHERE nama_program = 'Test Program';

-- 4. Test delete
DELETE FROM program_beasiswa WHERE nama_program = 'Test Program';

-- 5. Verify deleted
SELECT COUNT(*) as remaining_programs FROM program_beasiswa WHERE nama_program = 'Test Program';
