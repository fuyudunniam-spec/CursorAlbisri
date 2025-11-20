-- FIX MISSING COLUMNS IN PROGRAM_BEASISWA
-- Jalankan di Supabase SQL Editor

-- Add missing columns if they don't exist
ALTER TABLE program_beasiswa ADD COLUMN IF NOT EXISTS nominal_per_periode INTEGER;
ALTER TABLE program_beasiswa ADD COLUMN IF NOT EXISTS tipe_beasiswa VARCHAR(50);

-- Update existing rows to have default values for required columns
UPDATE program_beasiswa 
SET nominal_per_periode = 1000000 
WHERE nominal_per_periode IS NULL;

-- Now try insert with all required fields
INSERT INTO program_beasiswa (
  nama_program, 
  jenis, 
  nominal_per_periode,
  is_active
)
VALUES 
  ('Beasiswa Yatim Piatu', 'Penuh', 1000000, true)
ON CONFLICT (nama_program) DO NOTHING;

INSERT INTO program_beasiswa (
  nama_program, 
  jenis, 
  nominal_per_periode,
  is_active
)
VALUES 
  ('Beasiswa Prestasi', 'Sebagian', 500000, true)
ON CONFLICT (nama_program) DO NOTHING;

INSERT INTO program_beasiswa (
  nama_program, 
  jenis, 
  nominal_per_periode,
  is_active
)
VALUES 
  ('Beasiswa Dhuafa', 'Penuh', 800000, true)
ON CONFLICT (nama_program) DO NOTHING;

-- Verify final result
SELECT * FROM program_beasiswa WHERE is_active = true;
