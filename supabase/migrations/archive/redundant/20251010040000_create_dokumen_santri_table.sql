-- ============================================================================
-- MIGRATION: Create Dokumen Santri Table
-- Description: Table untuk menyimpan dokumen-dokumen santri dengan 
--              verification workflow dan audit trail
-- Date: 2025-01-10
-- ============================================================================

-- Create dokumen_santri table
CREATE TABLE IF NOT EXISTS dokumen_santri (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  santri_id UUID REFERENCES santri(id) ON DELETE CASCADE NOT NULL,
  kode_dokumen VARCHAR(50) NOT NULL,
  nama_dokumen VARCHAR(200),
  url TEXT, -- URL dari Supabase Storage atau Base64
  mime VARCHAR(100),
  size INTEGER, -- Size in bytes
  original_name VARCHAR(255),
  status_validasi VARCHAR(50) DEFAULT 'Perlu Perbaikan' CHECK (status_validasi IN (
    'Valid',
    'Perlu Perbaikan',
    'Tidak Valid'
  )),
  verifier UUID REFERENCES auth.users(id),
  tanggal_upload TIMESTAMPTZ DEFAULT NOW(),
  tanggal_verified TIMESTAMPTZ,
  catatan TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_dokumen_santri_santri_id ON dokumen_santri(santri_id);
CREATE INDEX IF NOT EXISTS idx_dokumen_santri_kode ON dokumen_santri(kode_dokumen);
CREATE INDEX IF NOT EXISTS idx_dokumen_santri_status ON dokumen_santri(status_validasi);
CREATE INDEX IF NOT EXISTS idx_dokumen_santri_active ON dokumen_santri(is_active);

-- Enable RLS
ALTER TABLE dokumen_santri ENABLE ROW LEVEL SECURITY;

-- RLS Policies (with IF NOT EXISTS handling)
DO $$ 
BEGIN
  -- Create SELECT policy if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'dokumen_santri' 
    AND policyname = 'Users can view all dokumen santri'
  ) THEN
    CREATE POLICY "Users can view all dokumen santri"
      ON dokumen_santri
      FOR SELECT
      USING (true);
  END IF;

  -- Create ALL policy if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'dokumen_santri' 
    AND policyname = 'Admins can manage dokumen santri'
  ) THEN
    CREATE POLICY "Admins can manage dokumen santri"
      ON dokumen_santri
      FOR ALL
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Trigger for updated_at (with IF NOT EXISTS handling)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_dokumen_santri_updated_at'
  ) THEN
    CREATE TRIGGER set_dokumen_santri_updated_at
      BEFORE UPDATE ON dokumen_santri
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- Add comments
COMMENT ON TABLE dokumen_santri IS 'Dokumen-dokumen santri dengan workflow verifikasi';
COMMENT ON COLUMN dokumen_santri.kode_dokumen IS 'Kode jenis dokumen (PAS_FOTO, KTP_ORTU, KK, dll)';
COMMENT ON COLUMN dokumen_santri.status_validasi IS 'Status verifikasi dokumen oleh admin';
COMMENT ON COLUMN dokumen_santri.is_active IS 'Soft delete flag - false jika dokumen dihapus';

-- Success message
DO $$ 
BEGIN
  RAISE NOTICE 'Table dokumen_santri created successfully';
  RAISE NOTICE 'RLS policies and indexes created';
END $$;

