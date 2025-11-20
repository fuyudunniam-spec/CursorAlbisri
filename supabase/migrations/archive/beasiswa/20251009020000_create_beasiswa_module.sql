-- ================================================
-- MODUL BEASISWA SANTRI
-- ================================================
-- Purpose: Sistem beasiswa untuk santri (binaan & prestasi)
-- Features: Program beasiswa, penerima, pencairan, integrasi dengan pembayaran
-- ================================================

-- ================================================
-- 1. TABLE: program_beasiswa
-- ================================================
CREATE TABLE IF NOT EXISTS program_beasiswa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_program VARCHAR(200) NOT NULL,
  jenis VARCHAR(50) NOT NULL CHECK (jenis IN ('Binaan', 'Prestasi', 'Prestasi Akademik', 'Prestasi Non-Akademik', 'Yatim', 'Dhuafa')),
  
  -- Sumber dana
  sumber_dana VARCHAR(100), -- 'Dana Umum', 'Donasi Terikat', nama donatur
  donor_id UUID, -- Jika dari donatur tertentu (soft reference ke donor_profiles)
  
  -- Nominal & periode
  nominal_per_periode DECIMAL(15,2) NOT NULL CHECK (nominal_per_periode >= 0),
  periode_aktif VARCHAR(20) NOT NULL CHECK (periode_aktif IN ('Bulanan', 'Semester', 'Tahunan')),
  
  -- Kriteria
  kriteria TEXT, -- Syarat mendapat beasiswa
  max_penerima INTEGER CHECK (max_penerima > 0), -- Quota
  
  -- Status
  status VARCHAR(20) DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif', 'selesai')),
  tanggal_mulai DATE NOT NULL,
  tanggal_selesai DATE,
  
  deskripsi TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 2. TABLE: penerima_beasiswa
-- ================================================
CREATE TABLE IF NOT EXISTS penerima_beasiswa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES program_beasiswa(id) ON DELETE CASCADE,
  santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  
  -- Periode penerimaan
  tanggal_mulai DATE NOT NULL,
  tanggal_selesai DATE,
  status VARCHAR(20) DEFAULT 'aktif' CHECK (status IN ('aktif', 'selesai', 'dicabut')),
  
  -- Nominal (bisa beda per santri jika %)
  nominal_per_periode DECIMAL(15,2) NOT NULL CHECK (nominal_per_periode >= 0),
  persentase_bantuan INTEGER CHECK (persentase_bantuan BETWEEN 0 AND 100), -- Jika beasiswa bentuk %, misal 50% dari SPP
  
  -- Alasan & catatan
  alasan_diberikan TEXT, -- Kenapa dapat beasiswa
  prestasi_detail TEXT, -- Jika prestasi, apa prestasinya
  monitoring_ref TEXT, -- Link ke tabel monitoring (jika ada) - soft reference
  
  -- Pencairan
  total_sudah_dicairkan DECIMAL(15,2) DEFAULT 0,
  
  catatan TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(program_id, santri_id, tanggal_mulai)
);

-- ================================================
-- 3. TABLE: pencairan_beasiswa
-- ================================================
CREATE TABLE IF NOT EXISTS pencairan_beasiswa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  penerima_id UUID NOT NULL REFERENCES penerima_beasiswa(id) ON DELETE CASCADE,
  
  periode VARCHAR(50) NOT NULL, -- 'Januari 2025', 'Semester 1 2025', dll
  nominal DECIMAL(15,2) NOT NULL CHECK (nominal > 0),
  
  -- Metode pencairan
  metode VARCHAR(50) NOT NULL CHECK (metode IN ('Potong Tagihan', 'Transfer Tunai', 'Bayar Langsung')),
  
  -- Jika potong tagihan SPP (soft reference, akan diimplementasi nanti)
  pembayaran_santri_id UUID, -- Link ke pembayaran_santri
  
  -- Jika transfer/tunai
  keuangan_id UUID REFERENCES keuangan(id),
  akun_kas VARCHAR(50),
  
  tanggal_cair DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) DEFAULT 'dicairkan' CHECK (status IN ('pending', 'dicairkan', 'dibatalkan')),
  
  bukti_file TEXT, -- Upload bukti transfer jika ada
  catatan TEXT,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 4. INDEXES
-- ================================================
CREATE INDEX idx_program_beasiswa_status ON program_beasiswa(status);
CREATE INDEX idx_program_beasiswa_jenis ON program_beasiswa(jenis);
CREATE INDEX idx_program_beasiswa_tanggal ON program_beasiswa(tanggal_mulai, tanggal_selesai);

CREATE INDEX idx_penerima_beasiswa_santri ON penerima_beasiswa(santri_id);
CREATE INDEX idx_penerima_beasiswa_program ON penerima_beasiswa(program_id);
CREATE INDEX idx_penerima_beasiswa_status ON penerima_beasiswa(status);

CREATE INDEX idx_pencairan_beasiswa_penerima ON pencairan_beasiswa(penerima_id);
CREATE INDEX idx_pencairan_beasiswa_periode ON pencairan_beasiswa(periode);
CREATE INDEX idx_pencairan_beasiswa_status ON pencairan_beasiswa(status);
CREATE INDEX idx_pencairan_beasiswa_tanggal ON pencairan_beasiswa(tanggal_cair);

-- ================================================
-- 5. RLS POLICIES
-- ================================================
ALTER TABLE program_beasiswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE penerima_beasiswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE pencairan_beasiswa ENABLE ROW LEVEL SECURITY;

-- Program Beasiswa Policies
CREATE POLICY "Authenticated users can view program_beasiswa"
  ON program_beasiswa FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Authenticated users can insert program_beasiswa"
  ON program_beasiswa FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update program_beasiswa"
  ON program_beasiswa FOR UPDATE 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete program_beasiswa"
  ON program_beasiswa FOR DELETE 
  TO authenticated 
  USING (true);

-- Penerima Beasiswa Policies
CREATE POLICY "Authenticated users can view penerima_beasiswa"
  ON penerima_beasiswa FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Authenticated users can insert penerima_beasiswa"
  ON penerima_beasiswa FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update penerima_beasiswa"
  ON penerima_beasiswa FOR UPDATE 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete penerima_beasiswa"
  ON penerima_beasiswa FOR DELETE 
  TO authenticated 
  USING (true);

-- Pencairan Beasiswa Policies
CREATE POLICY "Authenticated users can view pencairan_beasiswa"
  ON pencairan_beasiswa FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Authenticated users can insert pencairan_beasiswa"
  ON pencairan_beasiswa FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update pencairan_beasiswa"
  ON pencairan_beasiswa FOR UPDATE 
  TO authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete pencairan_beasiswa"
  ON pencairan_beasiswa FOR DELETE 
  TO authenticated 
  USING (true);

-- ================================================
-- 6. TRIGGERS FOR updated_at
-- ================================================
CREATE TRIGGER update_program_beasiswa_updated_at
  BEFORE UPDATE ON program_beasiswa
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_penerima_beasiswa_updated_at
  BEFORE UPDATE ON penerima_beasiswa
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pencairan_beasiswa_updated_at
  BEFORE UPDATE ON pencairan_beasiswa
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- 7. HELPER FUNCTIONS
-- ================================================

-- Function: Get total dana program beasiswa
CREATE OR REPLACE FUNCTION get_dana_program_beasiswa(p_program_id UUID)
RETURNS TABLE (
  dana_tersedia DECIMAL,
  dana_dicairkan DECIMAL,
  dana_sisa DECIMAL,
  jumlah_penerima INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(pb.nominal_per_periode * pb.max_penerima, 0) AS dana_tersedia,
    COALESCE(SUM(pc.nominal), 0) AS dana_dicairkan,
    COALESCE(pb.nominal_per_periode * pb.max_penerima - SUM(pc.nominal), 0) AS dana_sisa,
    COUNT(DISTINCT pen.id)::INTEGER AS jumlah_penerima
  FROM program_beasiswa pb
  LEFT JOIN penerima_beasiswa pen ON pen.program_id = pb.id AND pen.status = 'aktif'
  LEFT JOIN pencairan_beasiswa pc ON pc.penerima_id = pen.id AND pc.status = 'dicairkan'
  WHERE pb.id = p_program_id
  GROUP BY pb.id, pb.nominal_per_periode, pb.max_penerima;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get total beasiswa yang diterima santri
CREATE OR REPLACE FUNCTION get_total_beasiswa_santri(p_santri_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_total DECIMAL;
BEGIN
  SELECT COALESCE(SUM(pc.nominal), 0)
  INTO v_total
  FROM penerima_beasiswa pen
  JOIN pencairan_beasiswa pc ON pc.penerima_id = pen.id
  WHERE pen.santri_id = p_santri_id 
    AND pc.status = 'dicairkan';
  
  RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Cairkan beasiswa (create entry di keuangan jika transfer tunai)
CREATE OR REPLACE FUNCTION cairkan_beasiswa_tunai(
  p_pencairan_id UUID,
  p_akun_kas VARCHAR DEFAULT 'Kas Utama',
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_pencairan RECORD;
  v_penerima RECORD;
  v_santri RECORD;
  v_program RECORD;
  v_keuangan_id UUID;
  v_result JSON;
BEGIN
  -- Get pencairan details
  SELECT * INTO v_pencairan FROM pencairan_beasiswa WHERE id = p_pencairan_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', FALSE, 'message', 'Pencairan tidak ditemukan');
  END IF;
  
  IF v_pencairan.status != 'pending' THEN
    RETURN json_build_object('success', FALSE, 'message', 'Pencairan sudah diproses');
  END IF;
  
  -- Get related data
  SELECT * INTO v_penerima FROM penerima_beasiswa WHERE id = v_pencairan.penerima_id;
  SELECT * INTO v_santri FROM santri WHERE id = v_penerima.santri_id;
  SELECT * INTO v_program FROM program_beasiswa WHERE id = v_penerima.program_id;
  
  -- Create entry in keuangan (if metode is Transfer Tunai)
  IF v_pencairan.metode IN ('Transfer Tunai', 'Bayar Langsung') THEN
    INSERT INTO keuangan (
      jenis_transaksi,
      kategori,
      jumlah,
      tanggal,
      deskripsi,
      penerima_pembayar,
      referensi,
      akun_kas,
      created_by
    ) VALUES (
      'Pengeluaran',
      'Beasiswa Santri',
      v_pencairan.nominal,
      v_pencairan.tanggal_cair,
      'Beasiswa ' || v_program.nama_program || ' - ' || v_pencairan.periode,
      v_santri.nama_lengkap,
      'beasiswa:' || p_pencairan_id,
      p_akun_kas,
      p_user_id
    )
    RETURNING id INTO v_keuangan_id;
    
    -- Update pencairan with keuangan_id
    UPDATE pencairan_beasiswa
    SET 
      status = 'dicairkan',
      keuangan_id = v_keuangan_id,
      akun_kas = p_akun_kas,
      updated_at = NOW()
    WHERE id = p_pencairan_id;
  ELSE
    -- Jika Potong Tagihan, just update status
    UPDATE pencairan_beasiswa
    SET 
      status = 'dicairkan',
      updated_at = NOW()
    WHERE id = p_pencairan_id;
  END IF;
  
  -- Update total_sudah_dicairkan di penerima
  UPDATE penerima_beasiswa
  SET 
    total_sudah_dicairkan = total_sudah_dicairkan + v_pencairan.nominal,
    updated_at = NOW()
  WHERE id = v_pencairan.penerima_id;
  
  v_result := json_build_object(
    'success', TRUE,
    'pencairan_id', p_pencairan_id,
    'keuangan_id', v_keuangan_id,
    'nominal', v_pencairan.nominal,
    'santri', v_santri.nama_lengkap
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 8. COMMENTS
-- ================================================
COMMENT ON TABLE program_beasiswa IS 'Master program beasiswa (binaan, prestasi, yatim, dhuafa, dll)';
COMMENT ON TABLE penerima_beasiswa IS 'Santri yang menerima beasiswa dari program tertentu';
COMMENT ON TABLE pencairan_beasiswa IS 'Detail pencairan beasiswa per periode (bisa potong tagihan atau transfer tunai)';

COMMENT ON COLUMN program_beasiswa.jenis IS 'Jenis beasiswa: Binaan, Prestasi, Prestasi Akademik, Prestasi Non-Akademik, Yatim, Dhuafa';
COMMENT ON COLUMN program_beasiswa.sumber_dana IS 'Sumber dana beasiswa: Dana Umum, Donasi Terikat, atau nama donatur';
COMMENT ON COLUMN program_beasiswa.periode_aktif IS 'Periode pembayaran: Bulanan, Semester, Tahunan';

COMMENT ON COLUMN penerima_beasiswa.persentase_bantuan IS 'Jika beasiswa dalam bentuk %, misal 50% dari SPP';
COMMENT ON COLUMN penerima_beasiswa.total_sudah_dicairkan IS 'Total beasiswa yang sudah dicairkan (kumulatif)';

COMMENT ON COLUMN pencairan_beasiswa.metode IS 'Metode: Potong Tagihan (kurangi tagihan SPP), Transfer Tunai, Bayar Langsung';
COMMENT ON COLUMN pencairan_beasiswa.pembayaran_santri_id IS 'Link ke pembayaran_santri jika metode Potong Tagihan';
COMMENT ON COLUMN pencairan_beasiswa.keuangan_id IS 'Link ke keuangan jika metode Transfer Tunai/Bayar Langsung';

COMMENT ON FUNCTION get_dana_program_beasiswa IS 'Get total dana tersedia, dicairkan, dan sisa untuk program beasiswa';
COMMENT ON FUNCTION get_total_beasiswa_santri IS 'Get total beasiswa yang sudah diterima santri (kumulatif)';
COMMENT ON FUNCTION cairkan_beasiswa_tunai IS 'Cairkan beasiswa dan auto-create entry di keuangan (untuk metode Transfer Tunai)';

