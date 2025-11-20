-- Add new fields to inventaris table
ALTER TABLE inventaris
ADD COLUMN IF NOT EXISTS tipe_item TEXT CHECK (tipe_item IN ('Aset', 'Komoditas')),
ADD COLUMN IF NOT EXISTS zona TEXT CHECK (zona IN ('Gedung Putra', 'Gedung Putri', 'Area luar')),
ADD COLUMN IF NOT EXISTS has_expiry BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tanggal_kedaluwarsa DATE;

-- Update existing records to have default values
UPDATE inventaris 
SET 
  tipe_item = 'Aset',
  zona = 'Gedung Putra',
  has_expiry = FALSE
WHERE tipe_item IS NULL;

-- Make tipe_item and zona required for new records
ALTER TABLE inventaris
ALTER COLUMN tipe_item SET NOT NULL,
ALTER COLUMN zona SET NOT NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventaris_tipe_item ON inventaris(tipe_item);
CREATE INDEX IF NOT EXISTS idx_inventaris_zona ON inventaris(zona);
CREATE INDEX IF NOT EXISTS idx_inventaris_has_expiry ON inventaris(has_expiry);
CREATE INDEX IF NOT EXISTS idx_inventaris_tanggal_kedaluwarsa ON inventaris(tanggal_kedaluwarsa);

-- Add constraint for expiry date validation
ALTER TABLE inventaris
ADD CONSTRAINT check_expiry_date 
CHECK (
  (has_expiry = FALSE) OR 
  (has_expiry = TRUE AND tanggal_kedaluwarsa IS NOT NULL)
);
