-- SAFE INSERT PROGRAM BEASISWA - Check constraints first
-- Jalankan di Supabase SQL Editor

-- Step 1: Check table constraints
SELECT 
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  tc.is_deferrable,
  tc.initially_deferred
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'program_beasiswa'
  AND tc.constraint_type = 'CHECK';

-- Step 2: Try insert with minimal required fields
INSERT INTO program_beasiswa (
  nama_program, 
  jenis, 
  nominal_per_periode,
  is_active
)
VALUES 
  ('Beasiswa Yatim Piatu', 'Penuh', 1000000, true);

-- Step 3: If successful, insert more
INSERT INTO program_beasiswa (
  nama_program, 
  jenis, 
  nominal_per_periode,
  is_active
)
VALUES 
  ('Beasiswa Prestasi', 'Sebagian', 500000, true);

INSERT INTO program_beasiswa (
  nama_program, 
  jenis, 
  nominal_per_periode,
  is_active
)
VALUES 
  ('Beasiswa Dhuafa', 'Penuh', 800000, true);

-- Step 4: Verify
SELECT * FROM program_beasiswa WHERE is_active = true;
