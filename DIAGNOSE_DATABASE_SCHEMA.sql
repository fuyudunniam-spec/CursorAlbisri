-- DIAGNOSE DATABASE SCHEMA ISSUES
-- Jalankan di Supabase SQL Editor untuk debug

-- 1. Check apakah semua tabel yang diperlukan ada
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('santri', 'santri_wali', 'santri_programs', 'program_beasiswa', 'pengajuan_beasiswa')
ORDER BY table_name;

-- 2. Check struktur tabel santri
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'santri'
ORDER BY ordinal_position;

-- 3. Check struktur tabel santri_wali
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'santri_wali'
ORDER BY ordinal_position;

-- 4. Check struktur tabel santri_programs
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'santri_programs'
ORDER BY ordinal_position;

-- 5. Check struktur tabel program_beasiswa
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'program_beasiswa'
ORDER BY ordinal_position;

-- 6. Check constraints pada santri_programs
SELECT 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    tc.is_deferrable,
    tc.initially_deferred
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'santri_programs'
ORDER BY tc.constraint_type, kcu.column_name;

-- 7. Check apakah ada data existing
SELECT 'santri' as table_name, COUNT(*) as row_count FROM santri
UNION ALL
SELECT 'santri_wali', COUNT(*) FROM santri_wali
UNION ALL
SELECT 'santri_programs', COUNT(*) FROM santri_programs
UNION ALL
SELECT 'program_beasiswa', COUNT(*) FROM program_beasiswa
UNION ALL
SELECT 'pengajuan_beasiswa', COUNT(*) FROM pengajuan_beasiswa;

-- 8. Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('santri', 'santri_wali', 'santri_programs', 'program_beasiswa', 'pengajuan_beasiswa')
ORDER BY tablename, policyname;
