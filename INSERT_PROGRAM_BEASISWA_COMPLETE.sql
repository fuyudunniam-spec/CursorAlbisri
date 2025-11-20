-- INSERT PROGRAM BEASISWA DENGAN SEMUA KOLOM YANG DIPERLUKAN
-- Jalankan di Supabase SQL Editor

-- Insert dengan semua kolom NOT NULL yang diperlukan
INSERT INTO program_beasiswa (
  nama_program, 
  jenis, 
  nominal_per_periode,
  is_active
)
VALUES 
  ('Beasiswa Yatim Piatu', 'Penuh', 1000000, true),
  ('Beasiswa Prestasi', 'Sebagian', 500000, true),
  ('Beasiswa Dhuafa', 'Penuh', 800000, true);

-- Verify data
SELECT * FROM program_beasiswa WHERE is_active = true;
