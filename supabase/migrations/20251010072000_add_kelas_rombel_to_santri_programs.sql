-- Add kelas_program and rombel columns to santri_programs
-- Also ensure program_id exists (should already exist from main migration)
ALTER TABLE santri_programs 
  ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES program_santri(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS kelas_program VARCHAR(100),
  ADD COLUMN IF NOT EXISTS rombel VARCHAR(50),
  ADD COLUMN IF NOT EXISTS nama_program VARCHAR(200);

COMMENT ON COLUMN santri_programs.program_id IS 'Reference to master program_santri table';
COMMENT ON COLUMN santri_programs.kelas_program IS 'Kelas/tingkat santri dalam program (e.g., Kelas 1, Kelas 2)';
COMMENT ON COLUMN santri_programs.rombel IS 'Rombongan belajar (e.g., A, B, C)';
COMMENT ON COLUMN santri_programs.nama_program IS 'Denormalized program name for quick access (synced from program_santri)';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_santri_programs_program_id ON santri_programs(program_id);

-- Function to sync nama_program from program_santri
CREATE OR REPLACE FUNCTION sync_program_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.program_id IS NOT NULL THEN
    SELECT nama_program INTO NEW.nama_program
    FROM program_santri
    WHERE id = NEW.program_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-sync nama_program
DROP TRIGGER IF EXISTS trigger_sync_program_name ON santri_programs;
CREATE TRIGGER trigger_sync_program_name
BEFORE INSERT OR UPDATE ON santri_programs
FOR EACH ROW
EXECUTE FUNCTION sync_program_name();

