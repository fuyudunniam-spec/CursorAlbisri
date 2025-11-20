-- INSERT PROGRAM BEASISWA DENGAN SEMUA KOLOM REQUIRED
-- Jalankan di Supabase SQL Editor setelah check constraint

-- Insert dengan semua kolom yang kemungkinan NOT NULL
INSERT INTO program_beasiswa (
  nama_program, 
  jenis, 
  nominal_per_periode,
  periode_aktif,
  is_active
)
VALUES 
  ('Beasiswa Yatim Piatu', 'Penuh', 1000000, 'Bulanan', true),
  ('Beasiswa Prestasi', 'Sebagian', 500000, 'Bulanan', true),
  ('Beasiswa Dhuafa', 'Penuh', 800000, 'Bulanan', true);

-- Verify data
SELECT * FROM program_beasiswa WHERE is_active = true;
