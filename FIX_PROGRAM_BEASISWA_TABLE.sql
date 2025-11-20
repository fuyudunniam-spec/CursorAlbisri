-- FIX PROGRAM_BEASISWA TABLE SCHEMA
-- Jalankan di Supabase SQL Editor

-- 1. Check struktur tabel program_beasiswa yang ada
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'program_beasiswa'
ORDER BY ordinal_position;

-- 2. Check apakah ada constraint atau index
SELECT 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'program_beasiswa'
ORDER BY tc.constraint_type, kcu.column_name;

-- 3. Add missing columns jika belum ada
ALTER TABLE program_beasiswa ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE program_beasiswa ADD COLUMN IF NOT EXISTS tipe_beasiswa VARCHAR(50);
ALTER TABLE program_beasiswa ADD COLUMN IF NOT EXISTS deskripsi TEXT;

-- 4. Test insert dengan kolom yang benar
INSERT INTO program_beasiswa (nama_program, tipe_beasiswa, is_active)
VALUES ('Beasiswa Yatim Piatu', 'Penuh', true);

INSERT INTO program_beasiswa (nama_program, tipe_beasiswa, is_active)
VALUES ('Beasiswa Prestasi', 'Sebagian', true);

INSERT INTO program_beasiswa (nama_program, tipe_beasiswa, is_active)
VALUES ('Beasiswa Dhuafa', 'Penuh', true);

-- 5. Verify data inserted
SELECT * FROM program_beasiswa;

-- 6. Check struktur tabel santri juga
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'santri'
ORDER BY ordinal_position;

-- 7. Insert sample santri
INSERT INTO santri (
  nis, nama_lengkap, tempat_lahir, tanggal_lahir, jenis_kelamin, 
  agama, status_anak, no_whatsapp, alamat, kategori, 
  angkatan, tanggal_masuk, status_santri, tipe_pembayaran
)
VALUES (
  'NIS2501001', 'Zabadi', 'Jakarta', '2010-05-15', 'Laki-laki', 
  'Islam', 'Anak Kandung', '+6281234567890', 'Jl. Merdeka No. 123, Jakarta Pusat', 'Santri Reguler', 
  '2025', '2025-01-01', 'Aktif', 'Bayar Sendiri'
)
ON CONFLICT (nis) DO NOTHING;

-- 8. Check apakah santri_wali ada dan strukturnya
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'santri_wali'
ORDER BY ordinal_position;

-- 9. Insert wali jika tabel ada
INSERT INTO santri_wali (santri_id, nama_lengkap, hubungan_keluarga, no_whatsapp, is_utama)
SELECT s.id, 'Budi Santoso', 'Ayah', '+6281234567892', true
FROM santri s WHERE s.nis = 'NIS2501001'
ON CONFLICT DO NOTHING;

-- 10. Check santri_programs
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'santri_programs'
ORDER BY ordinal_position;

-- 11. Insert program jika tabel ada
INSERT INTO santri_programs (santri_id, nama_program, kelas_program, rombel)
SELECT s.id, 'TPQ Reguler', 'Kelas 1', 'A'
FROM santri s WHERE s.nis = 'NIS2501001'
ON CONFLICT DO NOTHING;

-- 12. Final verification
SELECT 
  s.nama_lengkap,
  s.kategori,
  sw.nama_lengkap as wali_nama,
  sp.nama_program,
  sp.kelas_program
FROM santri s
LEFT JOIN santri_wali sw ON s.id = sw.santri_id AND sw.is_utama = true
LEFT JOIN santri_programs sp ON s.id = sp.santri_id
WHERE s.nis = 'NIS2501001';
