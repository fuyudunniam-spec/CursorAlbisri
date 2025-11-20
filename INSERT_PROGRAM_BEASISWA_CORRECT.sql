-- INSERT PROGRAM BEASISWA dengan kolom yang benar
-- Jalankan di Supabase SQL Editor

-- Insert dengan kolom 'jenis' (yang benar)
INSERT INTO program_beasiswa (nama_program, jenis, is_active)
VALUES ('Beasiswa Yatim Piatu', 'Penuh', true);

INSERT INTO program_beasiswa (nama_program, jenis, is_active)
VALUES ('Beasiswa Prestasi', 'Sebagian', true);

INSERT INTO program_beasiswa (nama_program, jenis, is_active)
VALUES ('Beasiswa Dhuafa', 'Penuh', true);

-- Verify data
SELECT * FROM program_beasiswa WHERE is_active = true;
