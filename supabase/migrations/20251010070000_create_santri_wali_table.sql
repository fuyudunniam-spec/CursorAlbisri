-- =====================================================
-- SANTRI WALI TABLE MIGRATION
-- Created: 2025-01-10
-- Purpose: Create table for guardian/parent data
-- =====================================================

-- Create santri_wali table
CREATE TABLE IF NOT EXISTS santri_wali (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  
  -- Personal Information
  nama_lengkap VARCHAR(200) NOT NULL,
  hubungan_keluarga VARCHAR(50) NOT NULL, -- Ayah, Ibu, Kakek, Nenek, Paman, Bibi, Saudara, Lainnya
  
  -- Contact Information
  no_whatsapp VARCHAR(20),
  email VARCHAR(200),
  alamat TEXT,
  
  -- Economic Information
  pekerjaan VARCHAR(100),
  penghasilan_bulanan DECIMAL(15,2) DEFAULT 0,
  
  -- Status
  is_utama BOOLEAN DEFAULT false, -- Main guardian
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT valid_hubungan_keluarga CHECK (
    hubungan_keluarga IN ('Ayah', 'Ibu', 'Kakek', 'Nenek', 'Paman', 'Bibi', 'Saudara', 'Lainnya')
  )
);

-- Comments
COMMENT ON TABLE santri_wali IS 'Guardian/parent information for santri';
COMMENT ON COLUMN santri_wali.is_utama IS 'Indicates the main/primary guardian';
COMMENT ON COLUMN santri_wali.penghasilan_bulanan IS 'Monthly income for scholarship eligibility';

-- Indexes
CREATE INDEX idx_santri_wali_santri_id ON santri_wali(santri_id);
CREATE INDEX idx_santri_wali_is_utama ON santri_wali(is_utama);
CREATE INDEX idx_santri_wali_is_active ON santri_wali(is_active);

-- Ensure only one main guardian per santri
CREATE UNIQUE INDEX idx_one_main_guardian 
ON santri_wali(santri_id) 
WHERE is_utama = true;

-- RLS Policies
ALTER TABLE santri_wali ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view wali data"
ON santri_wali FOR SELECT
USING (
  auth.uid() IN (
    SELECT created_by FROM santri WHERE id = santri_wali.santri_id
  )
  OR
  auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
);

CREATE POLICY "Users can insert wali data"
ON santri_wali FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT created_by FROM santri WHERE id = santri_wali.santri_id
  )
  OR
  auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
);

CREATE POLICY "Users can update wali data"
ON santri_wali FOR UPDATE
USING (
  auth.uid() IN (
    SELECT created_by FROM santri WHERE id = santri_wali.santri_id
  )
  OR
  auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
);

CREATE POLICY "Admin can delete wali data"
ON santri_wali FOR DELETE
USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

