-- Setup Storage Policies untuk santri-documents bucket
-- Jalankan ini di Supabase SQL Editor setelah bucket dibuat

-- 1. Allow authenticated users to upload documents
CREATE POLICY "Allow authenticated users to upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'santri-documents' AND
  auth.role() = 'authenticated'
);

-- 2. Allow public to view/download documents
CREATE POLICY "Allow public to view documents" ON storage.objects
FOR SELECT USING (bucket_id = 'santri-documents');

-- 3. Allow authenticated users to update documents
CREATE POLICY "Allow authenticated users to update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'santri-documents' AND
  auth.role() = 'authenticated'
);

-- 4. Allow authenticated users to delete documents
CREATE POLICY "Allow authenticated users to delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'santri-documents' AND
  auth.role() = 'authenticated'
);

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%santri%';
