-- =====================================================================
-- UPDATE SCHOOL FIELDS FOR BINAAN MUKIM
-- =====================================================================
-- Purpose: Update school information fields for Binaan Mukim santri
-- Date: January 13, 2025
-- =====================================================================

-- Add new school fields
ALTER TABLE santri 
ADD COLUMN IF NOT EXISTS jenjang_sekolah TEXT,
ADD COLUMN IF NOT EXISTS alamat_sekolah TEXT;

-- Add comments for documentation
COMMENT ON COLUMN santri.jenjang_sekolah IS 'Jenjang sekolah formal untuk Binaan Mukim (SD, SMP, SMA, SMK, MA)';
COMMENT ON COLUMN santri.alamat_sekolah IS 'Alamat sekolah formal untuk Binaan Mukim';

-- Remove old formal education fields that are no longer needed
ALTER TABLE santri 
DROP COLUMN IF EXISTS jenjang_formal,
DROP COLUMN IF EXISTS kelas_formal,
DROP COLUMN IF EXISTS tarif_spp_id;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_santri_jenjang_sekolah ON santri(jenjang_sekolah) WHERE jenjang_sekolah IS NOT NULL;
