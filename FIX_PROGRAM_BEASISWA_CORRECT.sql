-- FIX PROGRAM_BEASISWA dengan kolom yang benar
-- Jalankan di Supabase SQL Editor

-- 1. Check struktur tabel program_beasiswa yang sebenarnya
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'program_beasiswa'
ORDER BY ordinal_position;

-- 2. Insert dengan kolom yang benar (menggunakan 'jenis' bukan 'tipe_beasiswa')
INSERT INTO program_beasiswa (nama_program, jenis, is_active)
VALUES ('Beasiswa Yatim Piatu', 'Penuh', true);

INSERT INTO program_beasiswa (nama_program, jenis, is_active)
VALUES ('Beasiswa Prestasi', 'Sebagian', true);

INSERT INTO program_beasiswa (nama_program, jenis, is_active)
VALUES ('Beasiswa Dhuafa', 'Penuh', true);

-- 3. Verify data inserted
SELECT * FROM program_beasiswa WHERE is_active = true;

-- 4. Update aplikasi untuk menggunakan kolom 'jenis' bukan 'tipe_beasiswa'
-- Kita perlu update kode aplikasi untuk mapping yang benar
