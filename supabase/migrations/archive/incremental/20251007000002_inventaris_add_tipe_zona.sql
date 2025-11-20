-- Add missing columns used by frontend: tipe_item and zona
-- Safe defaults + simple check constraints to align with UI options

ALTER TABLE IF EXISTS inventaris
  ADD COLUMN IF NOT EXISTS tipe_item TEXT NOT NULL DEFAULT 'Aset',
  ADD COLUMN IF NOT EXISTS zona TEXT NOT NULL DEFAULT 'Gedung Putra';

-- Add lightweight checks to keep values within expected set
ALTER TABLE IF EXISTS inventaris
  DROP CONSTRAINT IF EXISTS inventaris_tipe_item_check;
ALTER TABLE IF EXISTS inventaris
  ADD CONSTRAINT inventaris_tipe_item_check CHECK (tipe_item IN ('Aset','Komoditas'));

ALTER TABLE IF EXISTS inventaris
  DROP CONSTRAINT IF EXISTS inventaris_zona_check;
ALTER TABLE IF EXISTS inventaris
  ADD CONSTRAINT inventaris_zona_check CHECK (zona IN ('Gedung Putra','Gedung Putri','Area luar'));

COMMENT ON COLUMN inventaris.tipe_item IS 'Tipe item: Aset atau Komoditas';
COMMENT ON COLUMN inventaris.zona IS 'Zona lokasi utama: Gedung Putra/Gedung Putri/Area luar';


