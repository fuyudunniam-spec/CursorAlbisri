-- Add expiry tracking columns to inventaris
ALTER TABLE IF EXISTS inventaris
  ADD COLUMN IF NOT EXISTS has_expiry BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tanggal_kedaluwarsa DATE;

COMMENT ON COLUMN inventaris.has_expiry IS 'Menandai apakah item memiliki tanggal kedaluwarsa';
COMMENT ON COLUMN inventaris.tanggal_kedaluwarsa IS 'Tanggal kedaluwarsa untuk item komoditas';

-- Ensure created_by/updated_by columns exist (safe add)
ALTER TABLE IF EXISTS inventaris
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Re-assert NOT changing any RLS here; policies already exist


