-- ================================================
-- ALOKASI PENGELUARAN SANTRI - Per-Student Expense Tracking
-- ================================================
-- Purpose: Track expenses allocated to specific students
-- Features: Real-time accumulation, auto-split, transparent reporting
-- ================================================

-- ================================================
-- 1. TABLE: alokasi_pengeluaran_santri
-- ================================================
CREATE TABLE IF NOT EXISTS alokasi_pengeluaran_santri (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links
  keuangan_id UUID NOT NULL REFERENCES keuangan(id) ON DELETE CASCADE,
  rincian_pengeluaran_id UUID REFERENCES rincian_pengeluaran(id) ON DELETE SET NULL,
  santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  
  -- Allocation Details
  nominal_alokasi DECIMAL(15,2) NOT NULL CHECK (nominal_alokasi >= 0),
  persentase_alokasi DECIMAL(5,2) CHECK (persentase_alokasi BETWEEN 0 AND 100), -- For shared costs
  
  -- Classification
  jenis_bantuan VARCHAR(100) NOT NULL, -- "SPP Formal", "Konsumsi", "Buku", "Seragam", "Uang Saku", dll
  periode VARCHAR(20) NOT NULL, -- "2025-10" or "Oktober 2025"
  
  -- Method
  metode_alokasi VARCHAR(20) DEFAULT 'manual' CHECK (metode_alokasi IN ('manual', 'auto-split', 'proporsional')),
  
  -- Notes
  keterangan TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- ================================================
-- 2. INDEXES
-- ================================================
CREATE INDEX IF NOT EXISTS idx_alokasi_santri ON alokasi_pengeluaran_santri(santri_id);
CREATE INDEX IF NOT EXISTS idx_alokasi_keuangan ON alokasi_pengeluaran_santri(keuangan_id);
CREATE INDEX IF NOT EXISTS idx_alokasi_rincian ON alokasi_pengeluaran_santri(rincian_pengeluaran_id);
CREATE INDEX IF NOT EXISTS idx_alokasi_periode ON alokasi_pengeluaran_santri(periode);
CREATE INDEX IF NOT EXISTS idx_alokasi_jenis_bantuan ON alokasi_pengeluaran_santri(jenis_bantuan);
CREATE INDEX IF NOT EXISTS idx_alokasi_santri_periode ON alokasi_pengeluaran_santri(santri_id, periode);

-- ================================================
-- 3. RLS POLICIES
-- ================================================
ALTER TABLE alokasi_pengeluaran_santri ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view alokasi_pengeluaran_santri"
  ON alokasi_pengeluaran_santri FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert alokasi_pengeluaran_santri"
  ON alokasi_pengeluaran_santri FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update alokasi_pengeluaran_santri"
  ON alokasi_pengeluaran_santri FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete alokasi_pengeluaran_santri"
  ON alokasi_pengeluaran_santri FOR DELETE TO authenticated USING (true);

-- ================================================
-- 4. FUNCTIONS - Auto-Split & Batch Creation
-- ================================================

-- Function: Auto-split expense to multiple students (equal distribution)
CREATE OR REPLACE FUNCTION auto_split_to_santri(
  p_keuangan_id UUID,
  p_santri_ids UUID[],
  p_jenis_bantuan VARCHAR,
  p_periode VARCHAR,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_total_amount DECIMAL;
  v_per_santri DECIMAL;
  v_santri_id UUID;
  v_count INTEGER := 0;
BEGIN
  -- Get total amount from keuangan
  SELECT jumlah INTO v_total_amount
  FROM keuangan
  WHERE id = p_keuangan_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', FALSE, 'message', 'Transaksi keuangan tidak ditemukan');
  END IF;
  
  -- Calculate per-student amount
  v_per_santri := v_total_amount / array_length(p_santri_ids, 1);
  
  -- Create allocations for each student
  FOREACH v_santri_id IN ARRAY p_santri_ids
  LOOP
    INSERT INTO alokasi_pengeluaran_santri (
      keuangan_id,
      santri_id,
      nominal_alokasi,
      persentase_alokasi,
      jenis_bantuan,
      periode,
      metode_alokasi,
      created_by
    ) VALUES (
      p_keuangan_id,
      v_santri_id,
      v_per_santri,
      (100.0 / array_length(p_santri_ids, 1))::DECIMAL(5,2),
      p_jenis_bantuan,
      p_periode,
      'auto-split',
      p_user_id
    );
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN json_build_object(
    'success', TRUE,
    'allocated_count', v_count,
    'per_santri', v_per_santri,
    'total_amount', v_total_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Auto-split to all active beasiswa students
CREATE OR REPLACE FUNCTION auto_split_to_all_beasiswa_santri(
  p_keuangan_id UUID,
  p_kategori_santri VARCHAR, -- 'Binaan Mukim', 'Binaan Non-Mukim', or NULL for all
  p_jenis_bantuan VARCHAR,
  p_periode VARCHAR,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_santri_ids UUID[];
BEGIN
  -- Get all active beasiswa students
  IF p_kategori_santri IS NULL THEN
    SELECT array_agg(id) INTO v_santri_ids
    FROM santri
    WHERE status_santri = 'Aktif'
      AND kategori LIKE 'Binaan%';
  ELSE
    SELECT array_agg(id) INTO v_santri_ids
    FROM santri
    WHERE status_santri = 'Aktif'
      AND kategori = p_kategori_santri;
  END IF;
  
  IF v_santri_ids IS NULL OR array_length(v_santri_ids, 1) = 0 THEN
    RETURN json_build_object('success', FALSE, 'message', 'Tidak ada santri beasiswa aktif');
  END IF;
  
  -- Call auto_split_to_santri
  RETURN auto_split_to_santri(
    p_keuangan_id,
    v_santri_ids,
    p_jenis_bantuan,
    p_periode,
    p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Create manual allocations (batch)
CREATE OR REPLACE FUNCTION create_alokasi_batch(
  p_keuangan_id UUID,
  p_allocations JSONB,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_alloc JSONB;
  v_count INTEGER := 0;
  v_total DECIMAL := 0;
BEGIN
  -- Loop through allocations
  FOR v_alloc IN SELECT * FROM jsonb_array_elements(p_allocations)
  LOOP
    INSERT INTO alokasi_pengeluaran_santri (
      keuangan_id,
      santri_id,
      nominal_alokasi,
      jenis_bantuan,
      periode,
      metode_alokasi,
      keterangan,
      created_by
    ) VALUES (
      p_keuangan_id,
      (v_alloc->>'santri_id')::UUID,
      (v_alloc->>'nominal_alokasi')::DECIMAL,
      v_alloc->>'jenis_bantuan',
      v_alloc->>'periode',
      'manual',
      v_alloc->>'keterangan',
      p_user_id
    );
    
    v_count := v_count + 1;
    v_total := v_total + (v_alloc->>'nominal_alokasi')::DECIMAL;
  END LOOP;
  
  RETURN json_build_object(
    'success', TRUE,
    'created_count', v_count,
    'total_allocated', v_total
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 5. VIEWS - Accumulation & Reporting
-- ================================================

-- View: Akumulasi bantuan per santri per bulan (REAL-TIME)
CREATE OR REPLACE VIEW view_akumulasi_bantuan_santri AS
SELECT 
  s.id as santri_id,
  s.nis,
  s.nama_lengkap,
  s.kategori,
  aps.periode,
  COUNT(DISTINCT aps.keuangan_id) as jumlah_transaksi,
  COUNT(*) as jumlah_alokasi,
  SUM(aps.nominal_alokasi) as total_bantuan,
  json_agg(DISTINCT aps.jenis_bantuan) as jenis_bantuan_list,
  json_object_agg(
    aps.jenis_bantuan,
    SUM(aps.nominal_alokasi)
  ) FILTER (WHERE aps.jenis_bantuan IS NOT NULL) as breakdown_per_jenis
FROM santri s
JOIN alokasi_pengeluaran_santri aps ON aps.santri_id = s.id
GROUP BY s.id, s.nis, s.nama_lengkap, s.kategori, aps.periode;

-- View: Detail bantuan per santri dengan info transaksi
CREATE OR REPLACE VIEW view_bantuan_santri_detail AS
SELECT 
  aps.id,
  aps.santri_id,
  s.nis,
  s.nama_lengkap as santri_nama,
  aps.keuangan_id,
  k.tanggal,
  k.kategori as kategori_keuangan,
  k.deskripsi as deskripsi_transaksi,
  k.penerima_pembayar,
  aps.nominal_alokasi,
  aps.jenis_bantuan,
  aps.periode,
  aps.metode_alokasi,
  aps.keterangan,
  ak.nama as akun_kas_nama,
  aps.created_at
FROM alokasi_pengeluaran_santri aps
JOIN santri s ON s.id = aps.santri_id
JOIN keuangan k ON k.id = aps.keuangan_id
LEFT JOIN akun_kas ak ON ak.id = k.akun_kas_id
ORDER BY k.tanggal DESC, aps.created_at DESC;

-- View: Summary bantuan per santri (all time)
CREATE OR REPLACE VIEW view_summary_bantuan_per_santri AS
SELECT 
  s.id as santri_id,
  s.nis,
  s.nama_lengkap,
  s.kategori,
  COUNT(DISTINCT aps.periode) as jumlah_periode,
  COUNT(DISTINCT aps.keuangan_id) as jumlah_transaksi,
  SUM(aps.nominal_alokasi) as total_bantuan_all_time,
  MAX(k.tanggal) as terakhir_bantuan,
  json_object_agg(
    aps.jenis_bantuan,
    SUM(aps.nominal_alokasi)
  ) FILTER (WHERE aps.jenis_bantuan IS NOT NULL) as breakdown_per_jenis
FROM santri s
LEFT JOIN alokasi_pengeluaran_santri aps ON aps.santri_id = s.id
LEFT JOIN keuangan k ON k.id = aps.keuangan_id
WHERE s.status_santri = 'Aktif'
GROUP BY s.id, s.nis, s.nama_lengkap, s.kategori;

-- View: Top recipients per period
CREATE OR REPLACE VIEW view_top_recipients_per_period AS
SELECT 
  periode,
  santri_id,
  s.nis,
  s.nama_lengkap,
  s.kategori,
  SUM(nominal_alokasi) as total_bantuan,
  COUNT(DISTINCT keuangan_id) as jumlah_transaksi,
  ROW_NUMBER() OVER (PARTITION BY periode ORDER BY SUM(nominal_alokasi) DESC) as rank
FROM alokasi_pengeluaran_santri aps
JOIN santri s ON s.id = aps.santri_id
GROUP BY periode, santri_id, s.nis, s.nama_lengkap, s.kategori
ORDER BY periode DESC, total_bantuan DESC;

-- ================================================
-- 6. HELPER FUNCTIONS - Query & Stats
-- ================================================

-- Function: Get total bantuan for a student in a period
CREATE OR REPLACE FUNCTION get_total_bantuan_santri(
  p_santri_id UUID,
  p_periode VARCHAR
)
RETURNS DECIMAL AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(nominal_alokasi), 0)
    FROM alokasi_pengeluaran_santri
    WHERE santri_id = p_santri_id
      AND periode = p_periode
  );
END;
$$ LANGUAGE plpgsql;

-- Function: Get bantuan breakdown for a student
CREATE OR REPLACE FUNCTION get_bantuan_breakdown(
  p_santri_id UUID,
  p_periode VARCHAR
)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'santri_id', p_santri_id,
      'periode', p_periode,
      'total_bantuan', COALESCE(SUM(aps.nominal_alokasi), 0),
      'jumlah_transaksi', COUNT(DISTINCT aps.keuangan_id),
      'breakdown_per_jenis', json_object_agg(
        aps.jenis_bantuan,
        SUM(aps.nominal_alokasi)
      ) FILTER (WHERE aps.jenis_bantuan IS NOT NULL),
      'detail_transaksi', json_agg(
        json_build_object(
          'tanggal', k.tanggal,
          'jenis_bantuan', aps.jenis_bantuan,
          'nominal', aps.nominal_alokasi,
          'deskripsi', k.deskripsi,
          'metode', aps.metode_alokasi
        ) ORDER BY k.tanggal
      )
    )
    FROM alokasi_pengeluaran_santri aps
    JOIN keuangan k ON k.id = aps.keuangan_id
    WHERE aps.santri_id = p_santri_id
      AND aps.periode = p_periode
  );
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 7. COMMENTS
-- ================================================
COMMENT ON TABLE alokasi_pengeluaran_santri IS 'Track expenses allocated to individual students for transparency';
COMMENT ON COLUMN alokasi_pengeluaran_santri.metode_alokasi IS 'manual: explicit allocation | auto-split: equal distribution | proporsional: weighted by criteria';

COMMENT ON FUNCTION auto_split_to_santri IS 'Auto-split expense equally to selected students';
COMMENT ON FUNCTION auto_split_to_all_beasiswa_santri IS 'Auto-split expense to all active scholarship students';
COMMENT ON FUNCTION get_total_bantuan_santri IS 'Get total assistance for a student in specific period';
COMMENT ON FUNCTION get_bantuan_breakdown IS 'Get detailed breakdown of assistance for a student';

COMMENT ON VIEW view_akumulasi_bantuan_santri IS 'Real-time accumulation of assistance per student per period';
COMMENT ON VIEW view_bantuan_santri_detail IS 'Detailed view of student assistance with transaction info';
COMMENT ON VIEW view_summary_bantuan_per_santri IS 'Summary of all-time assistance per student';

