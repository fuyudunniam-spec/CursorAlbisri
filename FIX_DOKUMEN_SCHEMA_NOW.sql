-- URGENT FIX: Dokumen Santri Schema
-- Apply this in Supabase SQL Editor immediately

-- Step 1: Drop existing table to avoid conflicts
DROP TABLE IF EXISTS dokumen_santri CASCADE;

-- Step 2: Create the correct dokumen_santri table structure
CREATE TABLE dokumen_santri (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  
  -- Document info
  nama_dokumen VARCHAR(200) NOT NULL,
  jenis_dokumen VARCHAR(100) NOT NULL CHECK (jenis_dokumen IN (
    'Pas Foto', 'Kartu Keluarga (KK)', 'Akta Lahir', 'Ijazah Terakhir', 'Transkrip Nilai',
    'KTP', 'KK', 'Akta Kelahiran', 'Ijazah', 'Transkrip', 
    'Foto', 'Surat Keterangan', 'Dokumen Lainnya'
  )),
  
  -- File info
  nama_file VARCHAR(255) NOT NULL,
  ukuran_file BIGINT,
  tipe_file VARCHAR(100),
  path_file TEXT NOT NULL,
  
  -- Status & verification
  status_verifikasi VARCHAR(50) DEFAULT 'Belum Diverifikasi' 
    CHECK (status_verifikasi IN ('Belum Diverifikasi', 'Diverifikasi', 'Ditolak')),
  tanggal_verifikasi TIMESTAMPTZ,
  verifikasi_oleh UUID REFERENCES auth.users(id),
  catatan_verifikasi TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Step 3: Create indexes for performance
CREATE INDEX idx_dokumen_santri_santri_id ON dokumen_santri(santri_id);
CREATE INDEX idx_dokumen_santri_jenis ON dokumen_santri(jenis_dokumen);
CREATE INDEX idx_dokumen_santri_status ON dokumen_santri(status_verifikasi);

-- Step 4: Enable RLS
ALTER TABLE dokumen_santri ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
CREATE POLICY "Users can view own documents" ON dokumen_santri
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert own documents" ON dokumen_santri
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own documents" ON dokumen_santri
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own documents" ON dokumen_santri
  FOR DELETE USING (auth.uid() = created_by);

-- Step 6: Force refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Step 7: Verify table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'dokumen_santri' 
ORDER BY ordinal_position;
