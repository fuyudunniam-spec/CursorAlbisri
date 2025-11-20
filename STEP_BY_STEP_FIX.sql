-- STEP BY STEP FIX
-- Jalankan satu per satu di Supabase SQL Editor

-- STEP 1: Check tabel program_beasiswa
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'program_beasiswa'
ORDER BY ordinal_position;

-- STEP 2: Add missing columns
ALTER TABLE program_beasiswa ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE program_beasiswa ADD COLUMN IF NOT EXISTS tipe_beasiswa VARCHAR(50);

-- STEP 3: Test insert
INSERT INTO program_beasiswa (nama_program, tipe_beasiswa, is_active)
VALUES ('Beasiswa Yatim Piatu', 'Penuh', true);

-- STEP 4: Check result
SELECT * FROM program_beasiswa;

-- STEP 5: Insert more programs
INSERT INTO program_beasiswa (nama_program, tipe_beasiswa, is_active)
VALUES ('Beasiswa Prestasi', 'Sebagian', true);

INSERT INTO program_beasiswa (nama_program, tipe_beasiswa, is_active)
VALUES ('Beasiswa Dhuafa', 'Penuh', true);

-- STEP 6: Check all programs
SELECT * FROM program_beasiswa WHERE is_active = true;
