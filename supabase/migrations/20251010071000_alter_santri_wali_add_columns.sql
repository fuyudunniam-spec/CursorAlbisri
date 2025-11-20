-- =====================================================
-- ALTER SANTRI WALI - ADD MISSING COLUMNS
-- Created: 2025-01-10
-- Purpose: Add no_whatsapp, pekerjaan, penghasilan_bulanan
-- =====================================================

-- Add missing columns if they don't exist
ALTER TABLE santri_wali 
  ADD COLUMN IF NOT EXISTS no_whatsapp VARCHAR(20),
  ADD COLUMN IF NOT EXISTS email VARCHAR(200),
  ADD COLUMN IF NOT EXISTS pekerjaan VARCHAR(100),
  ADD COLUMN IF NOT EXISTS penghasilan_bulanan DECIMAL(15,2) DEFAULT 0;

-- Add comments
COMMENT ON COLUMN santri_wali.no_whatsapp IS 'WhatsApp contact number for guardian';
COMMENT ON COLUMN santri_wali.pekerjaan IS 'Occupation of guardian';
COMMENT ON COLUMN santri_wali.penghasilan_bulanan IS 'Monthly income for scholarship eligibility determination';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

