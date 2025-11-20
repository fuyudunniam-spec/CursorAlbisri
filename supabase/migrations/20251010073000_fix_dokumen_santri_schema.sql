-- Fix dokumen_santri table schema
-- Ensure we have the correct structure for document management

-- Drop existing table if it exists (to avoid conflicts)
DROP TABLE IF EXISTS dokumen_santri CASCADE;

-- Create the correct dokumen_santri table structure
CREATE TABLE IF NOT EXISTS dokumen_santri (
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_dokumen_santri_santri_id ON dokumen_santri(santri_id);
CREATE INDEX IF NOT EXISTS idx_dokumen_santri_jenis ON dokumen_santri(jenis_dokumen);
CREATE INDEX IF NOT EXISTS idx_dokumen_santri_status ON dokumen_santri(status_verifikasi);

-- Enable RLS
ALTER TABLE dokumen_santri ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (permissive for development)
CREATE POLICY "Allow all operations on dokumen_santri" ON dokumen_santri
  FOR ALL USING (true) WITH CHECK (true);

-- Force refresh schema cache
NOTIFY pgrst, 'reload schema';
