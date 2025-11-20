-- Create table for scholarship applications
CREATE TABLE IF NOT EXISTS pengajuan_beasiswa (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  program_beasiswa_id UUID REFERENCES program_beasiswa(id) ON DELETE SET NULL,
  
  -- Application status
  status_pengajuan VARCHAR(50) NOT NULL DEFAULT 'Menunggu Verifikasi',
  -- Options: Menunggu Verifikasi, Dalam Review, Diterima, Ditolak, Dibatalkan
  
  -- Application data
  status_anak VARCHAR(50),
  alasan_pengajuan TEXT NOT NULL,
  data_kesehatan JSONB,
  
  -- Review data
  tanggal_pengajuan TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  tanggal_review TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  catatan_reviewer TEXT,
  
  -- Decision
  tanggal_keputusan TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  alasan_penolakan TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT pengajuan_beasiswa_status_check 
    CHECK (status_pengajuan IN (
      'Menunggu Verifikasi', 
      'Dalam Review', 
      'Diterima', 
      'Ditolak', 
      'Dibatalkan'
    ))
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_pengajuan_beasiswa_santri 
  ON pengajuan_beasiswa(santri_id);
CREATE INDEX IF NOT EXISTS idx_pengajuan_beasiswa_program 
  ON pengajuan_beasiswa(program_beasiswa_id);
CREATE INDEX IF NOT EXISTS idx_pengajuan_beasiswa_status 
  ON pengajuan_beasiswa(status_pengajuan);
CREATE INDEX IF NOT EXISTS idx_pengajuan_beasiswa_tanggal 
  ON pengajuan_beasiswa(tanggal_pengajuan DESC);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_pengajuan_beasiswa_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pengajuan_beasiswa_updated_at
  BEFORE UPDATE ON pengajuan_beasiswa
  FOR EACH ROW
  EXECUTE FUNCTION update_pengajuan_beasiswa_updated_at();

-- Enable RLS
ALTER TABLE pengajuan_beasiswa ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permissive for development)
CREATE POLICY "Enable all operations for authenticated users"
  ON pengajuan_beasiswa
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comments
COMMENT ON TABLE pengajuan_beasiswa IS 'Stores scholarship application data from santri';
COMMENT ON COLUMN pengajuan_beasiswa.status_pengajuan IS 'Current status of the scholarship application';
COMMENT ON COLUMN pengajuan_beasiswa.data_kesehatan IS 'JSON data containing health information';
COMMENT ON COLUMN pengajuan_beasiswa.alasan_pengajuan IS 'Reason for applying for scholarship';
