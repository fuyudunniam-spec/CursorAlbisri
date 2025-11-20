-- Run this in Supabase SQL Editor to check table structure

-- 1. Check if table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'santri_programs';

-- 2. Check columns if table exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'santri_programs'
ORDER BY ordinal_position;

-- 3. If table doesn't exist or columns missing, create/add them:
CREATE TABLE IF NOT EXISTS santri_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES program_santri(id) ON DELETE CASCADE,
  
  -- Program specific info
  kelas_program VARCHAR(100),
  rombel VARCHAR(50),
  nama_program VARCHAR(200),
  tanggal_mulai DATE DEFAULT CURRENT_DATE,
  tanggal_selesai DATE,
  status VARCHAR(50) DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Selesai', 'Dikeluarkan')),
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  
  UNIQUE(santri_id, program_id)
);

-- 4. Add columns if table exists but columns missing
ALTER TABLE santri_programs 
  ADD COLUMN IF NOT EXISTS kelas_program VARCHAR(100),
  ADD COLUMN IF NOT EXISTS rombel VARCHAR(50),
  ADD COLUMN IF NOT EXISTS nama_program VARCHAR(200);

-- 5. Enable RLS
ALTER TABLE santri_programs ENABLE ROW LEVEL SECURITY;

-- 6. Create policies
DROP POLICY IF EXISTS "Users can view their programs" ON santri_programs;
CREATE POLICY "Users can view their programs"
ON santri_programs FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can insert programs" ON santri_programs;
CREATE POLICY "Users can insert programs"
ON santri_programs FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update programs" ON santri_programs;
CREATE POLICY "Users can update programs"
ON santri_programs FOR UPDATE
USING (true);

DROP POLICY IF EXISTS "Users can delete programs" ON santri_programs;
CREATE POLICY "Users can delete programs"
ON santri_programs FOR DELETE
USING (true);

-- 7. Verify columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'santri_programs'
ORDER BY ordinal_position;

