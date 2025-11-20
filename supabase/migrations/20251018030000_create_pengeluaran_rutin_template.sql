-- ================================================
-- PENGELUARAN RUTIN TEMPLATE - Recurring Expense Management
-- ================================================
-- Purpose: Template for recurring expenses (salaries, utilities, etc.)
-- Features: Auto-reminder, quick pay, flexible scheduling
-- ================================================

-- ================================================
-- 1. TABLE: pengeluaran_rutin_template
-- ================================================
CREATE TABLE IF NOT EXISTS pengeluaran_rutin_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Info
  nama_template VARCHAR(200) NOT NULL, -- e.g., "Gaji Pak Ahmad - Guru Matematika"
  kode VARCHAR(50) UNIQUE, -- e.g., "GAJI-001", "UTL-001"
  
  -- Category
  kategori_keuangan_id UUID REFERENCES kategori_keuangan(id),
  sub_kategori VARCHAR(100), -- e.g., "Gaji Guru Tetap", "Listrik Asrama"
  
  -- Amount
  nominal_estimasi DECIMAL(15,2) NOT NULL CHECK (nominal_estimasi >= 0),
  is_fixed_amount BOOLEAN DEFAULT TRUE, -- FALSE if amount varies each time
  
  -- Schedule
  frekuensi VARCHAR(20) NOT NULL CHECK (frekuensi IN ('bulanan', 'mingguan', 'tahunan', 'custom')),
  tanggal_jatuh_tempo INTEGER CHECK (tanggal_jatuh_tempo BETWEEN 1 AND 31), -- Day of month
  
  -- Payment Details
  penerima VARCHAR(200), -- Who receives this payment
  akun_kas_default_id UUID REFERENCES akun_kas(id),
  metode_pembayaran_default VARCHAR(50), -- 'Tunai', 'Transfer', dll
  
  -- Settings
  is_active BOOLEAN DEFAULT TRUE,
  auto_reminder BOOLEAN DEFAULT TRUE,
  reminder_days_before INTEGER DEFAULT 3, -- Remind X days before due date
  
  -- Notes
  deskripsi TEXT,
  catatan TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  last_generated_period VARCHAR(20) -- e.g., "2025-10" to track last generation
);

-- ================================================
-- 2. TABLE: pengeluaran_rutin_history (Track execution)
-- ================================================
CREATE TABLE IF NOT EXISTS pengeluaran_rutin_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link
  template_id UUID NOT NULL REFERENCES pengeluaran_rutin_template(id) ON DELETE CASCADE,
  keuangan_id UUID REFERENCES keuangan(id) ON DELETE SET NULL,
  
  -- Period
  periode VARCHAR(20) NOT NULL, -- e.g., "2025-10", "2025-W42"
  tanggal_jatuh_tempo DATE NOT NULL,
  tanggal_dibayar DATE,
  
  -- Amount
  nominal_rencana DECIMAL(15,2) NOT NULL,
  nominal_aktual DECIMAL(15,2),
  selisih DECIMAL(15,2) GENERATED ALWAYS AS (nominal_aktual - nominal_rencana) STORED,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'dibayar', 'skip', 'cancelled')),
  
  -- Notes
  alasan_selisih TEXT, -- If actual != planned
  catatan TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  dibayar_by UUID REFERENCES auth.users(id)
);

-- ================================================
-- 3. INDEXES
-- ================================================
CREATE INDEX IF NOT EXISTS idx_template_rutin_active ON pengeluaran_rutin_template(is_active);
CREATE INDEX IF NOT EXISTS idx_template_rutin_kategori ON pengeluaran_rutin_template(kategori_keuangan_id);
CREATE INDEX IF NOT EXISTS idx_template_rutin_jatuh_tempo ON pengeluaran_rutin_template(tanggal_jatuh_tempo);

CREATE INDEX IF NOT EXISTS idx_rutin_history_template ON pengeluaran_rutin_history(template_id);
CREATE INDEX IF NOT EXISTS idx_rutin_history_periode ON pengeluaran_rutin_history(periode);
CREATE INDEX IF NOT EXISTS idx_rutin_history_status ON pengeluaran_rutin_history(status);
CREATE INDEX IF NOT EXISTS idx_rutin_history_jatuh_tempo ON pengeluaran_rutin_history(tanggal_jatuh_tempo);

-- ================================================
-- 4. RLS POLICIES
-- ================================================
ALTER TABLE pengeluaran_rutin_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengeluaran_rutin_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view templates"
  ON pengeluaran_rutin_template FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage templates"
  ON pengeluaran_rutin_template FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view history"
  ON pengeluaran_rutin_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage history"
  ON pengeluaran_rutin_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ================================================
-- 5. TRIGGERS
-- ================================================
CREATE TRIGGER update_template_rutin_updated_at
  BEFORE UPDATE ON pengeluaran_rutin_template
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rutin_history_updated_at
  BEFORE UPDATE ON pengeluaran_rutin_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- 6. FUNCTIONS - Generation & Payment
-- ================================================

-- Function: Generate reminders for upcoming payments
CREATE OR REPLACE FUNCTION generate_rutin_reminders(p_target_month VARCHAR)
RETURNS JSON AS $$
DECLARE
  v_template RECORD;
  v_count INTEGER := 0;
  v_periode VARCHAR;
  v_tanggal_jatuh_tempo DATE;
BEGIN
  v_periode := p_target_month; -- e.g., "2025-10"
  
  -- Loop through active templates
  FOR v_template IN 
    SELECT * FROM pengeluaran_rutin_template 
    WHERE is_active = TRUE 
      AND frekuensi = 'bulanan'
      AND (last_generated_period IS NULL OR last_generated_period != v_periode)
  LOOP
    -- Calculate due date
    v_tanggal_jatuh_tempo := (v_periode || '-' || LPAD(v_template.tanggal_jatuh_tempo::TEXT, 2, '0'))::DATE;
    
    -- Skip if already exists for this period
    IF NOT EXISTS (
      SELECT 1 FROM pengeluaran_rutin_history
      WHERE template_id = v_template.id AND periode = v_periode
    ) THEN
      -- Create reminder entry
      INSERT INTO pengeluaran_rutin_history (
        template_id,
        periode,
        tanggal_jatuh_tempo,
        nominal_rencana,
        status
      ) VALUES (
        v_template.id,
        v_periode,
        v_tanggal_jatuh_tempo,
        v_template.nominal_estimasi,
        'pending'
      );
      
      v_count := v_count + 1;
      
      -- Update last generated
      UPDATE pengeluaran_rutin_template
      SET last_generated_period = v_periode
      WHERE id = v_template.id;
    END IF;
  END LOOP;
  
  RETURN json_build_object(
    'success', TRUE,
    'periode', v_periode,
    'generated_count', v_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Quick pay from template
CREATE OR REPLACE FUNCTION quick_pay_rutin(
  p_history_id UUID,
  p_nominal_aktual DECIMAL,
  p_tanggal_bayar DATE,
  p_akun_kas_id UUID,
  p_metode_pembayaran VARCHAR DEFAULT 'Tunai',
  p_catatan TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_history RECORD;
  v_template RECORD;
  v_keuangan_id UUID;
BEGIN
  -- Get history & template
  SELECT * INTO v_history FROM pengeluaran_rutin_history WHERE id = p_history_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', FALSE, 'message', 'History not found');
  END IF;
  
  SELECT * INTO v_template FROM pengeluaran_rutin_template WHERE id = v_history.template_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', FALSE, 'message', 'Template not found');
  END IF;
  
  -- Create keuangan entry
  INSERT INTO keuangan (
    tanggal,
    jenis_transaksi,
    kategori,
    sub_kategori,
    jumlah,
    deskripsi,
    penerima_pembayar,
    metode_pembayaran,
    akun_kas_id,
    status,
    referensi,
    created_by
  ) VALUES (
    p_tanggal_bayar,
    'Pengeluaran',
    (SELECT nama FROM kategori_keuangan WHERE id = v_template.kategori_keuangan_id),
    v_template.sub_kategori,
    p_nominal_aktual,
    v_template.nama_template || ' - ' || v_history.periode,
    v_template.penerima,
    p_metode_pembayaran,
    p_akun_kas_id,
    'posted',
    'rutin:' || p_history_id::TEXT,
    p_user_id
  )
  RETURNING id INTO v_keuangan_id;
  
  -- Update history
  UPDATE pengeluaran_rutin_history
  SET 
    keuangan_id = v_keuangan_id,
    tanggal_dibayar = p_tanggal_bayar,
    nominal_aktual = p_nominal_aktual,
    status = 'dibayar',
    catatan = p_catatan,
    dibayar_by = p_user_id,
    updated_at = NOW()
  WHERE id = p_history_id;
  
  RETURN json_build_object(
    'success', TRUE,
    'keuangan_id', v_keuangan_id,
    'nominal_aktual', p_nominal_aktual,
    'selisih', p_nominal_aktual - v_history.nominal_rencana
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 7. VIEWS - Reminders & Analytics
-- ================================================

-- View: Upcoming payments (reminders)
CREATE OR REPLACE VIEW view_rutin_upcoming AS
SELECT 
  h.id as history_id,
  t.id as template_id,
  t.nama_template,
  t.penerima,
  h.periode,
  h.tanggal_jatuh_tempo,
  h.nominal_rencana,
  h.status,
  ak.nama as akun_kas_default,
  t.metode_pembayaran_default,
  (h.tanggal_jatuh_tempo - CURRENT_DATE) as days_until_due,
  CASE 
    WHEN h.tanggal_jatuh_tempo < CURRENT_DATE THEN 'overdue'
    WHEN h.tanggal_jatuh_tempo <= CURRENT_DATE + INTERVAL '3 days' THEN 'urgent'
    ELSE 'upcoming'
  END as urgency
FROM pengeluaran_rutin_history h
JOIN pengeluaran_rutin_template t ON t.id = h.template_id
LEFT JOIN akun_kas ak ON ak.id = t.akun_kas_default_id
WHERE h.status = 'pending'
  AND t.is_active = TRUE
ORDER BY h.tanggal_jatuh_tempo;

-- View: Payment history with variance
CREATE OR REPLACE VIEW view_rutin_payment_history AS
SELECT 
  h.id,
  t.nama_template,
  t.penerima,
  h.periode,
  h.tanggal_jatuh_tempo,
  h.tanggal_dibayar,
  h.nominal_rencana,
  h.nominal_aktual,
  h.selisih,
  CASE 
    WHEN h.selisih = 0 THEN 'sesuai'
    WHEN h.selisih > 0 THEN 'lebih'
    ELSE 'kurang'
  END as variance_status,
  h.alasan_selisih,
  h.status,
  k.akun_kas_id,
  ak.nama as akun_kas_nama
FROM pengeluaran_rutin_history h
JOIN pengeluaran_rutin_template t ON t.id = h.template_id
LEFT JOIN keuangan k ON k.id = h.keuangan_id
LEFT JOIN akun_kas ak ON ak.id = k.akun_kas_id
WHERE h.status = 'dibayar'
ORDER BY h.tanggal_dibayar DESC;

-- View: Template statistics
CREATE OR REPLACE VIEW view_rutin_template_stats AS
SELECT 
  t.id,
  t.nama_template,
  t.penerima,
  t.nominal_estimasi,
  t.frekuensi,
  COUNT(h.id) as total_executions,
  COUNT(h.id) FILTER (WHERE h.status = 'dibayar') as paid_count,
  AVG(h.nominal_aktual) FILTER (WHERE h.status = 'dibayar') as avg_actual,
  SUM(h.nominal_aktual) FILTER (WHERE h.status = 'dibayar') as total_paid,
  MAX(h.tanggal_dibayar) as last_paid_date
FROM pengeluaran_rutin_template t
LEFT JOIN pengeluaran_rutin_history h ON h.template_id = t.id
WHERE t.is_active = TRUE
GROUP BY t.id, t.nama_template, t.penerima, t.nominal_estimasi, t.frekuensi;

-- ================================================
-- 8. DEFAULT DATA - Sample Templates
-- ================================================

-- Insert sample templates (commented out - to be customized by user)
/*
INSERT INTO pengeluaran_rutin_template (
  nama_template, kode, sub_kategori, nominal_estimasi, 
  frekuensi, tanggal_jatuh_tempo, penerima, is_active
) VALUES 
  ('Gaji Guru Tetap - Total', 'GAJI-001', 'Gaji Guru Tetap', 6000000, 'bulanan', 25, 'Tim Guru', TRUE),
  ('Gaji Karyawan - Total', 'GAJI-002', 'Gaji Karyawan', 2000000, 'bulanan', 25, 'Tim Karyawan', TRUE),
  ('Listrik', 'UTL-001', 'Utilitas', 1200000, 'bulanan', 10, 'PLN', TRUE),
  ('Air PDAM', 'UTL-002', 'Utilitas', 500000, 'bulanan', 10, 'PDAM', TRUE),
  ('Internet', 'UTL-003', 'Utilitas', 300000, 'bulanan', 5, 'Provider Internet', TRUE)
ON CONFLICT (kode) DO NOTHING;
*/

-- ================================================
-- 9. COMMENTS
-- ================================================
COMMENT ON TABLE pengeluaran_rutin_template IS 'Template for recurring expenses with auto-reminder';
COMMENT ON TABLE pengeluaran_rutin_history IS 'Execution history of recurring expense templates';

COMMENT ON FUNCTION generate_rutin_reminders IS 'Generate reminder entries for recurring payments in target month';
COMMENT ON FUNCTION quick_pay_rutin IS 'Quick payment from reminder - creates keuangan entry and updates history';

COMMENT ON VIEW view_rutin_upcoming IS 'Upcoming recurring payments with urgency indicator';
COMMENT ON VIEW view_rutin_payment_history IS 'Payment history with actual vs planned variance';
COMMENT ON VIEW view_rutin_template_stats IS 'Statistics for each recurring expense template';

