-- ================================================
-- ADD ALOKASI SANTRI BINAAN SYSTEM
-- ================================================
-- Purpose: Add fields and tables for tracking overhead allocation to santri binaan mukim
-- Features: Auto-generate alokasi from real expenses, transparency for santri
-- ================================================

-- ================================================
-- 1. ENHANCE keuangan TABLE
-- ================================================

-- Add jenis_alokasi field to keuangan table
ALTER TABLE keuangan 
ADD COLUMN IF NOT EXISTS jenis_alokasi VARCHAR(20) 
CHECK (jenis_alokasi IN ('langsung', 'overhead', NULL));

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_keuangan_alokasi 
ON keuangan(jenis_alokasi, EXTRACT(MONTH FROM tanggal), EXTRACT(YEAR FROM tanggal)) 
WHERE jenis_alokasi IS NOT NULL;

-- Add comment
COMMENT ON COLUMN keuangan.jenis_alokasi IS 'Alokasi ke santri: langsung=santri tertentu, overhead=dibagi ke semua binaan mukim, NULL=tidak dialokasikan';

-- ================================================
-- 2. TABLE: alokasi_overhead_bulanan (Header alokasi per bulan)
-- ================================================
CREATE TABLE IF NOT EXISTS alokasi_overhead_bulanan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bulan INT NOT NULL CHECK (bulan BETWEEN 1 AND 12),
  tahun INT NOT NULL,
  periode VARCHAR(50), -- "Oktober 2024"
  
  -- Total per kategori (from real expenses)
  total_spp_pendidikan DECIMAL(15,2) DEFAULT 0,
  total_asrama_kebutuhan DECIMAL(15,2) DEFAULT 0,
  total_overhead DECIMAL(15,2) GENERATED ALWAYS AS 
    (total_spp_pendidikan + total_asrama_kebutuhan) STORED,
  
  -- Jumlah santri
  jumlah_santri_binaan_mukim INT DEFAULT 0,
  
  -- Alokasi per santri
  alokasi_spp_per_santri DECIMAL(15,2) DEFAULT 0,
  alokasi_asrama_per_santri DECIMAL(15,2) DEFAULT 0,
  alokasi_total_per_santri DECIMAL(15,2) DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft' 
    CHECK (status IN ('draft', 'finalized')),
  
  -- Metadata
  catatan TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(bulan, tahun)
);

-- ================================================
-- 3. TABLE: alokasi_overhead_per_santri (Detail alokasi per santri)
-- ================================================
CREATE TABLE IF NOT EXISTS alokasi_overhead_per_santri (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alokasi_overhead_id UUID NOT NULL REFERENCES alokasi_overhead_bulanan(id) ON DELETE CASCADE,
  santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  
  bulan INT NOT NULL CHECK (bulan BETWEEN 1 AND 12),
  tahun INT NOT NULL,
  periode VARCHAR(50),
  
  -- Breakdown simplified
  spp_pendidikan DECIMAL(15,2) DEFAULT 0,
  asrama_kebutuhan DECIMAL(15,2) DEFAULT 0,
  total_alokasi DECIMAL(15,2) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(santri_id, bulan, tahun)
);

-- ================================================
-- 4. INDEXES
-- ================================================
CREATE INDEX IF NOT EXISTS idx_alokasi_overhead_periode 
ON alokasi_overhead_bulanan(tahun, bulan);

CREATE INDEX IF NOT EXISTS idx_alokasi_overhead_status 
ON alokasi_overhead_bulanan(status);

CREATE INDEX IF NOT EXISTS idx_alokasi_per_santri_santri 
ON alokasi_overhead_per_santri(santri_id, tahun, bulan);

CREATE INDEX IF NOT EXISTS idx_alokasi_per_santri_periode 
ON alokasi_overhead_per_santri(tahun, bulan);

-- ================================================
-- 5. RLS POLICIES
-- ================================================
ALTER TABLE alokasi_overhead_bulanan ENABLE ROW LEVEL SECURITY;
ALTER TABLE alokasi_overhead_per_santri ENABLE ROW LEVEL SECURITY;

-- Alokasi Overhead Bulanan Policies
CREATE POLICY "Authenticated users can view alokasi_overhead_bulanan"
  ON alokasi_overhead_bulanan FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage alokasi_overhead_bulanan"
  ON alokasi_overhead_bulanan FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Alokasi Per Santri Policies
CREATE POLICY "Authenticated users can view alokasi_overhead_per_santri"
  ON alokasi_overhead_per_santri FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage alokasi_overhead_per_santri"
  ON alokasi_overhead_per_santri FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ================================================
-- 6. TRIGGERS
-- ================================================
CREATE TRIGGER update_alokasi_overhead_bulanan_updated_at
  BEFORE UPDATE ON alokasi_overhead_bulanan
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- 7. HELPER FUNCTIONS
-- ================================================

-- Function: Generate alokasi overhead untuk bulan tertentu
CREATE OR REPLACE FUNCTION generate_alokasi_overhead(
  p_bulan INT,
  p_tahun INT,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_overhead RECORD;
  v_santri RECORD;
  v_spp_pendidikan DECIMAL := 0;
  v_asrama_kebutuhan DECIMAL := 0;
  v_jumlah_santri INT := 0;
  v_alokasi_spp DECIMAL := 0;
  v_alokasi_asrama DECIMAL := 0;
  v_alokasi_total DECIMAL := 0;
  v_header_id UUID;
  v_count INT := 0;
  v_bulan_names TEXT[] := ARRAY['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                                'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
BEGIN
  -- 1. Query pengeluaran overhead bulan ini
  SELECT 
    COALESCE(SUM(CASE 
      WHEN (kategori ILIKE '%gaji%' OR kategori ILIKE '%honor%' OR 
            sub_kategori ILIKE '%guru%' OR sub_kategori ILIKE '%pendidikan%' OR
            kategori ILIKE '%modul%' OR kategori ILIKE '%kitab%')
      THEN jumlah ELSE 0 END), 0) as spp_pendidikan,
    COALESCE(SUM(CASE 
      WHEN (kategori ILIKE '%konsumsi%' OR kategori ILIKE '%makan%' OR 
            kategori ILIKE '%listrik%' OR kategori ILIKE '%air%' OR
            kategori ILIKE '%pemeliharaan%' OR kategori ILIKE '%gas%' OR
            kategori ILIKE '%perlengkapan%' OR kategori ILIKE '%operasional%')
      THEN jumlah ELSE 0 END), 0) as asrama_kebutuhan
  INTO v_spp_pendidikan, v_asrama_kebutuhan
  FROM keuangan
  WHERE jenis_transaksi = 'Pengeluaran'
    AND jenis_alokasi = 'overhead'
    AND EXTRACT(MONTH FROM tanggal) = p_bulan
    AND EXTRACT(YEAR FROM tanggal) = p_tahun;
  
  -- 2. Get santri binaan mukim aktif
  SELECT COUNT(*) INTO v_jumlah_santri
  FROM santri
  WHERE status_santri = 'Aktif'
    AND (kategori ILIKE '%binaan%' AND kategori ILIKE '%mukim%');
  
  IF v_jumlah_santri = 0 THEN
    RETURN json_build_object(
      'success', FALSE, 
      'message', 'Tidak ada santri binaan mukim aktif'
    );
  END IF;
  
  -- 3. Calculate per santri
  v_alokasi_spp := v_spp_pendidikan / v_jumlah_santri;
  v_alokasi_asrama := v_asrama_kebutuhan / v_jumlah_santri;
  v_alokasi_total := v_alokasi_spp + v_alokasi_asrama;
  
  -- 4. Create/Update header
  INSERT INTO alokasi_overhead_bulanan (
    bulan, tahun, periode,
    total_spp_pendidikan, total_asrama_kebutuhan,
    jumlah_santri_binaan_mukim,
    alokasi_spp_per_santri, alokasi_asrama_per_santri, alokasi_total_per_santri,
    status, created_by
  ) VALUES (
    p_bulan, p_tahun, v_bulan_names[p_bulan] || ' ' || p_tahun,
    v_spp_pendidikan, v_asrama_kebutuhan,
    v_jumlah_santri,
    v_alokasi_spp, v_alokasi_asrama, v_alokasi_total,
    'finalized', p_user_id
  )
  ON CONFLICT (bulan, tahun) 
  DO UPDATE SET
    total_spp_pendidikan = EXCLUDED.total_spp_pendidikan,
    total_asrama_kebutuhan = EXCLUDED.total_asrama_kebutuhan,
    jumlah_santri_binaan_mukim = EXCLUDED.jumlah_santri_binaan_mukim,
    alokasi_spp_per_santri = EXCLUDED.alokasi_spp_per_santri,
    alokasi_asrama_per_santri = EXCLUDED.alokasi_asrama_per_santri,
    alokasi_total_per_santri = EXCLUDED.alokasi_total_per_santri,
    status = 'finalized',
    updated_at = NOW()
  RETURNING id INTO v_header_id;
  
  -- 5. Create detail per santri
  FOR v_santri IN 
    SELECT id FROM santri
    WHERE status_santri = 'Aktif'
      AND (kategori ILIKE '%binaan%' AND kategori ILIKE '%mukim%')
  LOOP
    INSERT INTO alokasi_overhead_per_santri (
      alokasi_overhead_id, santri_id,
      bulan, tahun, periode,
      spp_pendidikan, asrama_kebutuhan, total_alokasi
    ) VALUES (
      v_header_id, v_santri.id,
      p_bulan, p_tahun, v_bulan_names[p_bulan] || ' ' || p_tahun,
      v_alokasi_spp, v_alokasi_asrama, v_alokasi_total
    )
    ON CONFLICT (santri_id, bulan, tahun)
    DO UPDATE SET
      spp_pendidikan = EXCLUDED.spp_pendidikan,
      asrama_kebutuhan = EXCLUDED.asrama_kebutuhan,
      total_alokasi = EXCLUDED.total_alokasi;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN json_build_object(
    'success', TRUE,
    'header_id', v_header_id,
    'jumlah_santri', v_count,
    'total_spp_pendidikan', v_spp_pendidikan,
    'total_asrama_kebutuhan', v_asrama_kebutuhan,
    'alokasi_per_santri', v_alokasi_total
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get bantuan santri untuk bulan tertentu
CREATE OR REPLACE FUNCTION get_bantuan_santri(
  p_santri_id UUID,
  p_bulan INT,
  p_tahun INT
)
RETURNS JSON AS $$
DECLARE
  v_langsung JSON;
  v_overhead JSON;
  v_result JSON;
BEGIN
  -- Get direct allocations from alokasi_pengeluaran_santri
  SELECT json_agg(
    json_build_object(
      'id', aps.id,
      'nominal_alokasi', aps.nominal_alokasi,
      'jenis_bantuan', aps.jenis_bantuan,
      'keterangan', aps.keterangan,
      'periode', aps.periode,
      'tanggal', k.tanggal,
      'kategori', k.kategori,
      'sub_kategori', k.sub_kategori
    )
  ) INTO v_langsung
  FROM alokasi_pengeluaran_santri aps
  JOIN keuangan k ON aps.keuangan_id = k.id
  WHERE aps.santri_id = p_santri_id
    AND EXTRACT(MONTH FROM k.tanggal) = p_bulan
    AND EXTRACT(YEAR FROM k.tanggal) = p_tahun;

  -- Get overhead allocation
  SELECT json_build_object(
    'spp_pendidikan', spp_pendidikan,
    'asrama_kebutuhan', asrama_kebutuhan,
    'total_alokasi', total_alokasi
  ) INTO v_overhead
  FROM alokasi_overhead_per_santri
  WHERE santri_id = p_santri_id
    AND bulan = p_bulan
    AND tahun = p_tahun;

  RETURN json_build_object(
    'langsung', COALESCE(v_langsung, '[]'::json),
    'overhead', COALESCE(v_overhead, '{}'::json)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 8. COMMENTS
-- ================================================
COMMENT ON TABLE alokasi_overhead_bulanan IS 'Header alokasi overhead per bulan untuk santri binaan mukim';
COMMENT ON TABLE alokasi_overhead_per_santri IS 'Detail alokasi overhead per santri per bulan';

COMMENT ON COLUMN alokasi_overhead_bulanan.total_overhead IS 'Total overhead (SPP + Asrama) [COMPUTED]';
COMMENT ON COLUMN alokasi_overhead_bulanan.alokasi_total_per_santri IS 'Total alokasi per santri (SPP + Asrama)';

COMMENT ON FUNCTION generate_alokasi_overhead IS 'Generate alokasi overhead dari pengeluaran real bulan ini';
COMMENT ON FUNCTION get_bantuan_santri IS 'Get bantuan santri (langsung + overhead) untuk bulan tertentu';
