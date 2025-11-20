-- Fix RLS policies for keuangan table to allow authenticated users to insert data
-- This resolves the 403 Forbidden error when saving financial transactions

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can insert keuangan data" ON keuangan;
DROP POLICY IF EXISTS "Users can view keuangan data" ON keuangan;
DROP POLICY IF EXISTS "Users can update keuangan data" ON keuangan;
DROP POLICY IF EXISTS "Users can delete keuangan data" ON keuangan;

-- Create new permissive policies for authenticated users
CREATE POLICY "Enable insert for authenticated users" ON keuangan
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable read for authenticated users" ON keuangan
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable update for authenticated users" ON keuangan
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" ON keuangan
  FOR DELETE
  TO authenticated
  USING (true);

-- Add comments for documentation
COMMENT ON POLICY "Enable insert for authenticated users" ON keuangan IS 
  'Allow all authenticated users to insert financial transactions';
COMMENT ON POLICY "Enable read for authenticated users" ON keuangan IS 
  'Allow all authenticated users to read financial transactions';
COMMENT ON POLICY "Enable update for authenticated users" ON keuangan IS 
  'Allow all authenticated users to update financial transactions';
COMMENT ON POLICY "Enable delete for authenticated users" ON keuangan IS 
  'Allow all authenticated users to delete financial transactions';
