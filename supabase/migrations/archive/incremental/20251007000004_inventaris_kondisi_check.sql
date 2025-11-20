-- Update kondisi check constraint to align with UI and allow NULL (for Komoditas)

ALTER TABLE IF EXISTS inventaris
  DROP CONSTRAINT IF EXISTS inventaris_kondisi_check;

ALTER TABLE IF EXISTS inventaris
  ADD CONSTRAINT inventaris_kondisi_check
  CHECK (
    kondisi IS NULL OR kondisi IN (
      'Baik',
      'Butuh Perbaikan',
      'Rusak',
      'Rusak Ringan',
      'Perlu Perbaikan',
      'Rusak Berat'
    )
  );

COMMENT ON CONSTRAINT inventaris_kondisi_check ON inventaris IS 'Kondisi item aset; boleh NULL untuk Komoditas';


