-- ============================================================================
-- MIGRATION: Enhance Santri Table
-- Description: Add missing fields for better integration with program, 
--              beasiswa, and document management systems
-- Date: 2025-01-10
-- ============================================================================

-- Add new columns to santri table
ALTER TABLE santri 
  ADD COLUMN IF NOT EXISTS kategori VARCHAR(50) CHECK (kategori IN (
    'Santri Binaan Mukim',
    'Santri Binaan Non-Mukim', 
    'Mahasantri Reguler',
    'Mahasantri Beasiswa',
    'Santri TPQ',
    'Santri Madin'
  )),
  ADD COLUMN IF NOT EXISTS angkatan VARCHAR(20),
  ADD COLUMN IF NOT EXISTS status_anak VARCHAR(50) CHECK (status_anak IN (
    'Yatim',
    'Piatu', 
    'Yatim Piatu',
    'Dhuafa',
    'Utuh'
  )),
  ADD COLUMN IF NOT EXISTS no_whatsapp VARCHAR(20),
  ADD COLUMN IF NOT EXISTS foto_profil TEXT,
  ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES program_santri(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_santri_kategori ON santri(kategori);
CREATE INDEX IF NOT EXISTS idx_santri_angkatan ON santri(angkatan);
CREATE INDEX IF NOT EXISTS idx_santri_status_anak ON santri(status_anak);
CREATE INDEX IF NOT EXISTS idx_santri_program_id ON santri(program_id);

-- Update existing santri with default values (if needed)
-- Uncomment and modify if you want to set defaults for existing records
-- UPDATE santri 
-- SET kategori = 'Santri Binaan Mukim',
--     status_anak = 'Utuh'
-- WHERE kategori IS NULL;

-- Add helpful comments
COMMENT ON COLUMN santri.kategori IS 'Kategori santri untuk menentukan program dan requirement dokumen';
COMMENT ON COLUMN santri.angkatan IS 'Tahun angkatan santri (format: 2024 atau 2024/2025)';
COMMENT ON COLUMN santri.status_anak IS 'Status keluarga untuk menentukan dokumen kondisional (Yatim/Piatu/Dhuafa/dll)';
COMMENT ON COLUMN santri.no_whatsapp IS 'Nomor WhatsApp santri atau wali (untuk komunikasi)';
COMMENT ON COLUMN santri.foto_profil IS 'URL atau Base64 foto profil santri';
COMMENT ON COLUMN santri.program_id IS 'Program santri yang diikuti (link ke program_santri)';

-- Update trigger for updated_at (already exists, just ensure it's working)
-- The trigger should already be set from previous migrations

-- Success message
DO $$ 
BEGIN
  RAISE NOTICE 'Santri table successfully enhanced with new columns';
  RAISE NOTICE 'New columns added: kategori, angkatan, status_anak, no_whatsapp, foto_profil, program_id';
  RAISE NOTICE 'Indexes created for better query performance';
END $$;

