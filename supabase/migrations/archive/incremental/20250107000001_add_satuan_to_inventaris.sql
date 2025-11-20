-- Add satuan column to inventaris table
ALTER TABLE inventaris 
ADD COLUMN IF NOT EXISTS satuan VARCHAR(50);

-- Add comment
COMMENT ON COLUMN inventaris.satuan IS 'Satuan pengukuran barang (pcs, kg, liter, dll)';

