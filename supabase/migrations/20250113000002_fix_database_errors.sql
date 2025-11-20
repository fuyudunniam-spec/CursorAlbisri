-- =====================================================================
-- FIX DATABASE ERRORS
-- =====================================================================
-- Purpose: Fix various database errors found in the application
-- Date: January 13, 2025
-- =====================================================================

-- 1. Fix golongan_darah field length (currently varchar(5), "Tidak Tahu" is 9 chars)
ALTER TABLE kondisi_kesehatan 
ALTER COLUMN golongan_darah TYPE VARCHAR(20);

-- 2. Add rumpun_kelas and nama_kelas to santri_programs table
ALTER TABLE santri_programs 
ADD COLUMN IF NOT EXISTS rumpun_kelas VARCHAR(20),
ADD COLUMN IF NOT EXISTS nama_kelas VARCHAR(50);

-- 3. Add comments for documentation
COMMENT ON COLUMN kondisi_kesehatan.golongan_darah IS 'Golongan darah santri (A, B, AB, O, Tidak Tahu)';
COMMENT ON COLUMN santri_programs.rumpun_kelas IS 'Rumpun kelas santri (TPQ, Madin, Tahfidz)';
COMMENT ON COLUMN santri_programs.nama_kelas IS 'Nama kelas santri (A1, A2, I''dad, Ula, Wusta, Ulya)';

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_santri_programs_rumpun_kelas ON santri_programs(rumpun_kelas) WHERE rumpun_kelas IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_santri_programs_nama_kelas ON santri_programs(nama_kelas) WHERE nama_kelas IS NOT NULL;
