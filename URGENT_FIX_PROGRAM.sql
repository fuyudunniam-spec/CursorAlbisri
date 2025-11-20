-- URGENT FIX FOR PROGRAM ERROR
-- Run this in Supabase SQL Editor

-- Step 1: Check current table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'santri_programs'
ORDER BY ordinal_position;

-- Step 2: If program_id column exists, REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';

-- Step 3: If columns missing, add them
ALTER TABLE santri_programs 
  ADD COLUMN IF NOT EXISTS kelas_program VARCHAR(100),
  ADD COLUMN IF NOT EXISTS rombel VARCHAR(50),
  ADD COLUMN IF NOT EXISTS nama_program VARCHAR(200);

-- Step 4: Verify again
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'santri_programs'
ORDER BY ordinal_position;

-- Step 5: Refresh schema cache again
NOTIFY pgrst, 'reload schema';

-- Expected result should show these columns:
-- id, santri_id, program_id, kelas_program, rombel, nama_program, 
-- tanggal_mulai, tanggal_selesai, status, created_at, etc

