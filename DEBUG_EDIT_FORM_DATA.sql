-- Debug script untuk mengecek data edit form
-- Apply this in Supabase SQL Editor

-- 1. Check santri table structure
SELECT 'SANTRI TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'santri' 
ORDER BY ordinal_position;

-- 2. Check santri_wali table structure
SELECT 'SANTRI_WALI TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'santri_wali' 
ORDER BY ordinal_position;

-- 3. Check santri_programs table structure
SELECT 'SANTRI_PROGRAMS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'santri_programs' 
ORDER BY ordinal_position;

-- 4. Check dokumen_santri table structure
SELECT 'DOKUMEN_SANTRI TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'dokumen_santri' 
ORDER BY ordinal_position;

-- 5. Check sample data
SELECT 'SAMPLE SANTRI DATA:' as info;
SELECT id, nama_lengkap, nis, kategori FROM santri LIMIT 3;

SELECT 'SAMPLE WALI DATA:' as info;
SELECT id, santri_id, nama_lengkap, is_utama FROM santri_wali LIMIT 3;

SELECT 'SAMPLE PROGRAM DATA:' as info;
SELECT id, santri_id, program_id, nama_program, kelas_program FROM santri_programs LIMIT 3;

SELECT 'SAMPLE DOKUMEN DATA:' as info;
SELECT id, santri_id, jenis_dokumen, nama_file, status_verifikasi FROM dokumen_santri LIMIT 3;
