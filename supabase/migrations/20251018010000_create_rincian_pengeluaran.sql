-- ================================================
-- RINCIAN PENGELUARAN - Detail Item Tracking
-- ================================================
-- Purpose: Track detailed items for each expense transaction
-- Features: Multi-item per transaction, quantity, unit price, total
-- ================================================

-- ================================================
-- 1. TABLE: rincian_pengeluaran (Expense Item Details)
-- ================================================
CREATE TABLE IF NOT EXISTS rincian_pengeluaran (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to main transaction
  keuangan_id UUID NOT NULL REFERENCES keuangan(id) ON DELETE CASCADE,
  
  -- Item Details
  nama_item VARCHAR(200) NOT NULL, -- e.g., "Beras IR64", "Minyak Goreng Fortune"
  jumlah DECIMAL(10,2) NOT NULL CHECK (jumlah > 0), -- e.g., 50, 10, 1
  satuan VARCHAR(50) NOT NULL, -- e.g., "kg", "liter", "buah", "porsi", "paket"
  harga_satuan DECIMAL(15,2) NOT NULL CHECK (harga_satuan >= 0), -- Price per unit
  total DECIMAL(15,2) GENERATED ALWAYS AS (jumlah * harga_satuan) STORED, -- Auto-calculated
  
  -- Notes
  keterangan TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- ================================================
-- 2. INDEXES
-- ================================================
CREATE INDEX IF NOT EXISTS idx_rincian_pengeluaran_keuangan ON rincian_pengeluaran(keuangan_id);
CREATE INDEX IF NOT EXISTS idx_rincian_pengeluaran_nama_item ON rincian_pengeluaran(nama_item);
CREATE INDEX IF NOT EXISTS idx_rincian_pengeluaran_created_at ON rincian_pengeluaran(created_at DESC);

-- ================================================
-- 3. RLS POLICIES
-- ================================================
ALTER TABLE rincian_pengeluaran ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view rincian_pengeluaran"
  ON rincian_pengeluaran FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert rincian_pengeluaran"
  ON rincian_pengeluaran FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update rincian_pengeluaran"
  ON rincian_pengeluaran FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete rincian_pengeluaran"
  ON rincian_pengeluaran FOR DELETE TO authenticated USING (true);

-- ================================================
-- 4. FUNCTIONS - Validation & Helpers
-- ================================================

-- Function: Validate total rincian matches keuangan amount
CREATE OR REPLACE FUNCTION validate_rincian_total(p_keuangan_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_keuangan_jumlah DECIMAL;
  v_rincian_total DECIMAL;
BEGIN
  -- Get keuangan amount
  SELECT jumlah INTO v_keuangan_jumlah
  FROM keuangan
  WHERE id = p_keuangan_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Get total from rincian
  SELECT COALESCE(SUM(total), 0) INTO v_rincian_total
  FROM rincian_pengeluaran
  WHERE keuangan_id = p_keuangan_id;
  
  -- Allow small difference due to rounding (max 1 rupiah)
  RETURN ABS(v_keuangan_jumlah - v_rincian_total) <= 1;
END;
$$ LANGUAGE plpgsql;

-- Function: Get rincian summary for a transaction
CREATE OR REPLACE FUNCTION get_rincian_summary(p_keuangan_id UUID)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'jumlah_item', COUNT(*),
      'total_amount', COALESCE(SUM(total), 0),
      'items', json_agg(
        json_build_object(
          'nama_item', nama_item,
          'jumlah', jumlah,
          'satuan', satuan,
          'harga_satuan', harga_satuan,
          'total', total,
          'keterangan', keterangan
        ) ORDER BY created_at
      )
    )
    FROM rincian_pengeluaran
    WHERE keuangan_id = p_keuangan_id
  );
END;
$$ LANGUAGE plpgsql;

-- Function: Auto-create rincian from array
CREATE OR REPLACE FUNCTION create_rincian_batch(
  p_keuangan_id UUID,
  p_items JSONB,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_item JSONB;
  v_count INTEGER := 0;
  v_total DECIMAL := 0;
BEGIN
  -- Loop through items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO rincian_pengeluaran (
      keuangan_id,
      nama_item,
      jumlah,
      satuan,
      harga_satuan,
      keterangan,
      created_by
    ) VALUES (
      p_keuangan_id,
      v_item->>'nama_item',
      (v_item->>'jumlah')::DECIMAL,
      v_item->>'satuan',
      (v_item->>'harga_satuan')::DECIMAL,
      v_item->>'keterangan',
      p_user_id
    );
    
    v_count := v_count + 1;
    v_total := v_total + ((v_item->>'jumlah')::DECIMAL * (v_item->>'harga_satuan')::DECIMAL);
  END LOOP;
  
  RETURN json_build_object(
    'success', TRUE,
    'created_count', v_count,
    'total_amount', v_total
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 5. VIEWS - Analytics
-- ================================================

-- View: Most purchased items
CREATE OR REPLACE VIEW view_top_purchased_items AS
SELECT 
  nama_item,
  satuan,
  COUNT(*) as jumlah_pembelian,
  SUM(jumlah) as total_quantity,
  AVG(harga_satuan) as avg_harga_satuan,
  MAX(harga_satuan) as max_harga_satuan,
  MIN(harga_satuan) as min_harga_satuan,
  SUM(total) as total_pengeluaran,
  MAX(created_at) as terakhir_dibeli
FROM rincian_pengeluaran
GROUP BY nama_item, satuan
ORDER BY total_pengeluaran DESC;

-- View: Monthly item expenses
CREATE OR REPLACE VIEW view_monthly_item_expenses AS
SELECT 
  DATE_TRUNC('month', rp.created_at) as bulan,
  rp.nama_item,
  rp.satuan,
  COUNT(*) as jumlah_pembelian,
  SUM(rp.jumlah) as total_quantity,
  SUM(rp.total) as total_pengeluaran
FROM rincian_pengeluaran rp
GROUP BY DATE_TRUNC('month', rp.created_at), rp.nama_item, rp.satuan
ORDER BY bulan DESC, total_pengeluaran DESC;

-- View: Detailed expense with items
CREATE OR REPLACE VIEW view_keuangan_with_rincian AS
SELECT 
  k.id,
  k.tanggal,
  k.jenis_transaksi,
  k.kategori,
  k.jumlah,
  k.deskripsi,
  k.penerima_pembayar,
  k.akun_kas_id,
  ak.nama as akun_kas_nama,
  (SELECT COUNT(*) FROM rincian_pengeluaran WHERE keuangan_id = k.id) as jumlah_item,
  (SELECT json_agg(
    json_build_object(
      'nama_item', nama_item,
      'jumlah', jumlah,
      'satuan', satuan,
      'harga_satuan', harga_satuan,
      'total', total
    )
  ) FROM rincian_pengeluaran WHERE keuangan_id = k.id) as rincian_items
FROM keuangan k
LEFT JOIN akun_kas ak ON ak.id = k.akun_kas_id
WHERE k.jenis_transaksi = 'Pengeluaran';

-- ================================================
-- 6. COMMENTS
-- ================================================
COMMENT ON TABLE rincian_pengeluaran IS 'Detail item breakdown for expense transactions';
COMMENT ON COLUMN rincian_pengeluaran.total IS 'Auto-calculated: jumlah × harga_satuan';

COMMENT ON FUNCTION validate_rincian_total IS 'Check if total rincian matches keuangan amount';
COMMENT ON FUNCTION get_rincian_summary IS 'Get JSON summary of rincian items for a transaction';
COMMENT ON FUNCTION create_rincian_batch IS 'Batch create rincian items from JSON array';

COMMENT ON VIEW view_top_purchased_items IS 'Most frequently purchased items with statistics';
COMMENT ON VIEW view_monthly_item_expenses IS 'Monthly breakdown of item purchases';
COMMENT ON VIEW view_keuangan_with_rincian IS 'Keuangan transactions with detailed item breakdown';

