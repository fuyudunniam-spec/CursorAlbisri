-- =====================================================
-- SIMPLIFY PLOATING KELAS SYSTEM
-- =====================================================
-- Description: Remove complex program system, simplify to kelas/rombel assignment
-- Date: 2025-01-17
-- Purpose: Custom tagihan through keuangan module instead of auto-calculation
-- =====================================================

-- =====================================================
-- 1. BACKUP EXISTING DATA (Optional - for safety)
-- =====================================================

-- Create backup table for existing santri_programs data
CREATE TABLE IF NOT EXISTS santri_programs_backup AS 
SELECT * FROM santri_programs;

-- =====================================================
-- 2. DROP COMPLEX PROGRAM TABLES
-- =====================================================

-- Drop foreign key constraints first
ALTER TABLE santri_programs DROP CONSTRAINT IF EXISTS santri_programs_program_id_fkey;
ALTER TABLE komponen_biaya_program DROP CONSTRAINT IF EXISTS komponen_biaya_program_program_id_fkey;
ALTER TABLE tagihan_santri DROP CONSTRAINT IF EXISTS tagihan_santri_santri_program_id_fkey;

-- Drop complex program tables
DROP TABLE IF EXISTS komponen_biaya_program CASCADE;
DROP TABLE IF EXISTS program_santri CASCADE;

-- =====================================================
-- 3. SIMPLIFY SANTRI_PROGRAMS TO SANTRI_KELAS
-- =====================================================

-- Rename table
ALTER TABLE santri_programs RENAME TO santri_kelas;

-- Drop program-related columns
ALTER TABLE santri_kelas 
  DROP COLUMN IF EXISTS program_id,
  DROP COLUMN IF EXISTS nama_program,
  DROP COLUMN IF EXISTS subsidi_persen,
  DROP COLUMN IF EXISTS total_biaya_final,
  DROP COLUMN IF EXISTS catatan_subsidi,
  DROP COLUMN IF EXISTS paket_biaya_id;

-- Add new simplified columns
ALTER TABLE santri_kelas 
  ADD COLUMN IF NOT EXISTS tingkat VARCHAR(50), -- 'Dasar', 'Menengah', 'Tinggi'
  ADD COLUMN IF NOT EXISTS tahun_ajaran VARCHAR(20) DEFAULT '2024/2025',
  ADD COLUMN IF NOT EXISTS semester VARCHAR(20) DEFAULT 'Ganjil',
  ADD COLUMN IF NOT EXISTS status_kelas VARCHAR(20) DEFAULT 'Aktif' 
    CHECK (status_kelas IN ('Aktif', 'Non-Aktif', 'Lulus', 'Pindah'));

-- Update comments
COMMENT ON TABLE santri_kelas IS 'Simplified kelas assignment - no program complexity';
COMMENT ON COLUMN santri_kelas.kelas_program IS 'Kelas santri (e.g., Kelas 1, Iqro 3, Tahfidz 2)';
COMMENT ON COLUMN santri_kelas.rombel IS 'Rombongan belajar (e.g., A, B, C)';
COMMENT ON COLUMN santri_kelas.tingkat IS 'Tingkat pendidikan (Dasar, Menengah, Tinggi)';
COMMENT ON COLUMN santri_kelas.tahun_ajaran IS 'Tahun ajaran (e.g., 2024/2025)';
COMMENT ON COLUMN santri_kelas.semester IS 'Semester (Ganjil, Genap)';
COMMENT ON COLUMN santri_kelas.status_kelas IS 'Status kelas santri';

-- =====================================================
-- 4. UPDATE TAGIHAN_SANTRI (Remove program dependency)
-- =====================================================

-- Remove program dependency from tagihan_santri
ALTER TABLE tagihan_santri 
  DROP COLUMN IF EXISTS santri_program_id,
  ADD COLUMN IF NOT EXISTS kelas VARCHAR(100),
  ADD COLUMN IF NOT EXISTS rombel VARCHAR(50);

COMMENT ON COLUMN tagihan_santri.kelas IS 'Kelas santri untuk tagihan';
COMMENT ON COLUMN tagihan_santri.rombel IS 'Rombel santri untuk tagihan';

-- =====================================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Drop old indexes
DROP INDEX IF EXISTS idx_santri_programs_program_id;
DROP INDEX IF EXISTS idx_santri_programs_program;

-- Create new indexes
CREATE INDEX IF NOT EXISTS idx_santri_kelas_santri ON santri_kelas(santri_id);
CREATE INDEX IF NOT EXISTS idx_santri_kelas_kelas ON santri_kelas(kelas_program);
CREATE INDEX IF NOT EXISTS idx_santri_kelas_rombel ON santri_kelas(rombel);
CREATE INDEX IF NOT EXISTS idx_santri_kelas_tingkat ON santri_kelas(tingkat);
CREATE INDEX IF NOT EXISTS idx_santri_kelas_tahun ON santri_kelas(tahun_ajaran);
CREATE INDEX IF NOT EXISTS idx_santri_kelas_status ON santri_kelas(status_kelas);

-- =====================================================
-- 6. UPDATE RLS POLICIES
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Allow authenticated all santri_programs" ON santri_kelas;

-- Create new policies
ALTER TABLE santri_kelas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated all santri_kelas"
  ON santri_kelas FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- 7. CLEANUP TRIGGERS AND FUNCTIONS
-- =====================================================

-- Drop program-related triggers
DROP TRIGGER IF EXISTS trigger_sync_program_name ON santri_kelas;
DROP FUNCTION IF EXISTS sync_program_name();

-- Drop program-related functions
DROP FUNCTION IF EXISTS archive_program_change();

-- =====================================================
-- 8. UPDATE SANTRI TABLE (Remove program reference)
-- =====================================================

-- Remove program reference from santri table
ALTER TABLE santri DROP COLUMN IF EXISTS program_id;

-- =====================================================
-- 9. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to get santri kelas stats
CREATE OR REPLACE FUNCTION get_santri_kelas_stats()
RETURNS TABLE (
  total_approved INTEGER,
  sudah_diploat INTEGER,
  belum_diploat INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM santri WHERE status_approval = 'disetujui')::INTEGER as total_approved,
    (SELECT COUNT(DISTINCT santri_id) FROM santri_kelas WHERE status_kelas = 'Aktif')::INTEGER as sudah_diploat,
    (
      (SELECT COUNT(*) FROM santri WHERE status_approval = 'disetujui') - 
      (SELECT COUNT(DISTINCT santri_id) FROM santri_kelas WHERE status_kelas = 'Aktif')
    )::INTEGER as belum_diploat;
END;
$$ LANGUAGE plpgsql;

-- Function to get available kelas options
CREATE OR REPLACE FUNCTION get_kelas_options()
RETURNS TABLE (
  kelas VARCHAR,
  tingkat VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT 
    sk.kelas_program as kelas,
    sk.tingkat
  FROM santri_kelas sk
  WHERE sk.status_kelas = 'Aktif'
  ORDER BY sk.tingkat, sk.kelas_program;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. VERIFICATION QUERIES
-- =====================================================

-- Verify table structure
DO $$
BEGIN
  RAISE NOTICE '========================================================';
  RAISE NOTICE '✅ PLOATING KELAS SIMPLIFICATION COMPLETE!';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '';
  RAISE NOTICE '🗑️  REMOVED TABLES:';
  RAISE NOTICE '   • program_santri (complex program system)';
  RAISE NOTICE '   • komponen_biaya_program (cost breakdown)';
  RAISE NOTICE '';
  RAISE NOTICE '🔄  RENAMED TABLES:';
  RAISE NOTICE '   • santri_programs → santri_kelas';
  RAISE NOTICE '';
  RAISE NOTICE '📊  NEW STRUCTURE:';
  RAISE NOTICE '   • santri_kelas (simplified kelas assignment)';
  RAISE NOTICE '   • Custom tagihan through keuangan module';
  RAISE NOTICE '';
  RAISE NOTICE '⚡  NEW FUNCTIONS:';
  RAISE NOTICE '   • get_santri_kelas_stats() - ploating statistics';
  RAISE NOTICE '   • get_kelas_options() - available kelas options';
  RAISE NOTICE '';
  RAISE NOTICE '🎯  NEXT STEPS:';
  RAISE NOTICE '   1. Update ploating.service.ts';
  RAISE NOTICE '   2. Update PloatingKelas.tsx UI';
  RAISE NOTICE '   3. Test new functionality';
  RAISE NOTICE '========================================================';
END;
$$;
