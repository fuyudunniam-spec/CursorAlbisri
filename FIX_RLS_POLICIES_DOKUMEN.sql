-- Fix RLS Policies for dokumen_santri table
-- Apply this in Supabase SQL Editor

-- Drop existing policies (jika ada konflik)
DROP POLICY IF EXISTS "Users can view own documents" ON dokumen_santri;
DROP POLICY IF EXISTS "Users can insert own documents" ON dokumen_santri;
DROP POLICY IF EXISTS "Users can update own documents" ON dokumen_santri;
DROP POLICY IF EXISTS "Users can delete own documents" ON dokumen_santri;

-- Create new policies yang lebih permisif untuk development
CREATE POLICY "Allow all operations on dokumen_santri" ON dokumen_santri
  FOR ALL USING (true) WITH CHECK (true);

-- Alternative: Jika ingin lebih secure, gunakan policies ini:
-- CREATE POLICY "Allow authenticated users to view dokumen_santri" ON dokumen_santri
--   FOR SELECT USING (auth.role() = 'authenticated');

-- CREATE POLICY "Allow authenticated users to insert dokumen_santri" ON dokumen_santri
--   FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- CREATE POLICY "Allow authenticated users to update dokumen_santri" ON dokumen_santri
--   FOR UPDATE USING (auth.role() = 'authenticated');

-- CREATE POLICY "Allow authenticated users to delete dokumen_santri" ON dokumen_santri
--   FOR DELETE USING (auth.role() = 'authenticated');

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'dokumen_santri';
