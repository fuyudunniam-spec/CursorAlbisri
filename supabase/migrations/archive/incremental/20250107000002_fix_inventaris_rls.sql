-- Fix RLS policies for inventaris table
-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated users to read inventaris" ON inventaris;
DROP POLICY IF EXISTS "Allow authenticated users to insert inventaris" ON inventaris;
DROP POLICY IF EXISTS "Allow authenticated users to update inventaris" ON inventaris;
DROP POLICY IF EXISTS "Allow authenticated users to delete inventaris" ON inventaris;

-- Enable RLS
ALTER TABLE inventaris ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read all inventaris
CREATE POLICY "Allow authenticated users to read inventaris"
  ON inventaris FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to insert inventaris
CREATE POLICY "Allow authenticated users to insert inventaris"
  ON inventaris FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow authenticated users to update inventaris
CREATE POLICY "Allow authenticated users to update inventaris"
  ON inventaris FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Allow authenticated users to delete inventaris
CREATE POLICY "Allow authenticated users to delete inventaris"
  ON inventaris FOR DELETE
  TO authenticated
  USING (true);

-- Add comment
COMMENT ON TABLE inventaris IS 'Table untuk menyimpan data inventaris dengan RLS enabled';

