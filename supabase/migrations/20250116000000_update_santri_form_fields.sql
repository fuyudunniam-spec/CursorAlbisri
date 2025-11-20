-- Migration: Update santri form fields
-- Date: 2025-01-16
-- Purpose: Update form fields for santri identity - NIS to NISN, add id_santri, make NIK required, remove unused fields

-- =====================================================
-- 1. RENAME NIS TO NISN
-- =====================================================
ALTER TABLE santri RENAME COLUMN nis TO nisn;

-- =====================================================
-- 2. ADD ID SANTRI COLUMN (AUTO-GENERATED)
-- =====================================================
ALTER TABLE santri ADD COLUMN IF NOT EXISTS id_santri VARCHAR(50) UNIQUE;

-- Add index for id_santri
CREATE INDEX IF NOT EXISTS idx_santri_id_santri ON santri(id_santri);

-- =====================================================
-- 3. MAKE NIK REQUIRED (NOT NULL)
-- =====================================================
-- First, update any NULL NIK values to empty string
UPDATE santri SET nik = '' WHERE nik IS NULL;

-- Then make the column NOT NULL
ALTER TABLE santri ALTER COLUMN nik SET NOT NULL;

-- =====================================================
-- 4. REMOVE UNUSED COLUMNS
-- =====================================================
-- Remove warna_seragam column
ALTER TABLE santri DROP COLUMN IF EXISTS warna_seragam;

-- =====================================================
-- 5. UPDATE KONDISI_KESEHATAN TABLE
-- =====================================================
-- Remove kontak darurat columns from kondisi_kesehatan
ALTER TABLE kondisi_kesehatan DROP COLUMN IF EXISTS kontak_darurat_nama;
ALTER TABLE kondisi_kesehatan DROP COLUMN IF EXISTS kontak_darurat_nomor;
ALTER TABLE kondisi_kesehatan DROP COLUMN IF EXISTS kontak_darurat_hubungan;

-- =====================================================
-- 6. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON COLUMN santri.nisn IS 'Nomor Induk Siswa Nasional (opsional)';
COMMENT ON COLUMN santri.id_santri IS 'ID Santri otomatis berdasarkan angkatan dan tanggal lahir';
COMMENT ON COLUMN santri.nik IS 'Nomor Induk Kependudukan (wajib)';
COMMENT ON COLUMN santri.hobi IS 'Hobi santri (opsional)';
COMMENT ON COLUMN santri.cita_cita IS 'Cita-cita santri (opsional)';

-- =====================================================
-- 7. UPDATE EXISTING DATA
-- =====================================================
-- Generate id_santri for existing records
UPDATE santri 
SET id_santri = CONCAT(
  'ANK-', 
  RIGHT(angkatan, 2), 
  '-', 
  EXTRACT(YEAR FROM tanggal_lahir)::TEXT,
  LPAD(EXTRACT(MONTH FROM tanggal_lahir)::TEXT, 2, '0'),
  LPAD(EXTRACT(DAY FROM tanggal_lahir)::TEXT, 2, '0'),
  '-',
  LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 3, '0')
)
WHERE id_santri IS NULL;
