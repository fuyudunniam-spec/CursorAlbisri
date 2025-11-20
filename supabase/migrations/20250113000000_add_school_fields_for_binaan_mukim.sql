-- =====================================================================
-- ADD SCHOOL FIELDS FOR BINAAN MUKIM
-- =====================================================================
-- Purpose: Add school information fields for Binaan Mukim santri
-- Date: January 13, 2025
-- =====================================================================

-- Add school information fields to santri table
ALTER TABLE santri 
ADD COLUMN IF NOT EXISTS nama_sekolah TEXT,
ADD COLUMN IF NOT EXISTS kelas_sekolah TEXT,
ADD COLUMN IF NOT EXISTS nomor_wali_kelas TEXT;

-- Add comments for documentation
COMMENT ON COLUMN santri.nama_sekolah IS 'Nama sekolah formal untuk Binaan Mukim';
COMMENT ON COLUMN santri.kelas_sekolah IS 'Kelas di sekolah formal untuk Binaan Mukim';
COMMENT ON COLUMN santri.nomor_wali_kelas IS 'Nomor WhatsApp wali kelas untuk Binaan Mukim';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_santri_nama_sekolah ON santri(nama_sekolah) WHERE nama_sekolah IS NOT NULL;
