-- ================================================
-- AKUN KAS SYSTEM - Multi-Account Cash Management
-- ================================================
-- Purpose: Manage multiple cash accounts (Kas Utama, Bank Umum, Bank Pembangunan, Tabungan Santri)
-- Features: Real-time balance calculation, transaction tracking
-- ================================================

-- ================================================
-- 1. TABLE: akun_kas (Master Cash Accounts)
-- ================================================
CREATE TABLE IF NOT EXISTS akun_kas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Info
  nama VARCHAR(100) NOT NULL UNIQUE,
  kode VARCHAR(20) NOT NULL UNIQUE,
  tipe VARCHAR(20) NOT NULL CHECK (tipe IN ('Kas', 'Bank', 'Tabungan')),
  
  -- Bank Details (for Bank type)
  nomor_rekening VARCHAR(50),
  nama_bank VARCHAR(100),
  atas_nama VARCHAR(100),
  
  -- Balance
  saldo_awal DECIMAL(15,2) DEFAULT 0 CHECK (saldo_awal >= 0),
  saldo_saat_ini DECIMAL(15,2) DEFAULT 0, -- Will be calculated
  
  -- Settings
  is_default BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'aktif' CHECK (status IN ('aktif', 'ditutup', 'suspended')),
  
  -- Notes
  deskripsi TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- ================================================
-- 2. UPDATE keuangan TABLE - Add akun_kas_id
-- ================================================
ALTER TABLE keuangan 
  ADD COLUMN IF NOT EXISTS akun_kas_id UUID REFERENCES akun_kas(id);

-- Set default akun_kas_id untuk existing records
DO $$
DECLARE
  v_kas_utama_id UUID;
BEGIN
  -- Get or create Kas Utama
  INSERT INTO akun_kas (nama, kode, tipe, saldo_awal, is_default, status)
  VALUES ('Kas Utama', 'KAS-001', 'Kas', 0, TRUE, 'aktif')
  ON CONFLICT (nama) DO NOTHING
  RETURNING id INTO v_kas_utama_id;
  
  -- If insert didn't return (already exists), select it
  IF v_kas_utama_id IS NULL THEN
    SELECT id INTO v_kas_utama_id FROM akun_kas WHERE nama = 'Kas Utama';
  END IF;
  
  -- Update existing keuangan records
  UPDATE keuangan 
  SET akun_kas_id = v_kas_utama_id 
  WHERE akun_kas_id IS NULL;
END $$;

-- Make akun_kas_id required after setting defaults
ALTER TABLE keuangan 
  ALTER COLUMN akun_kas_id SET NOT NULL;

-- ================================================
-- 3. INDEXES
-- ================================================
CREATE INDEX IF NOT EXISTS idx_akun_kas_tipe ON akun_kas(tipe);
CREATE INDEX IF NOT EXISTS idx_akun_kas_status ON akun_kas(status);
CREATE INDEX IF NOT EXISTS idx_akun_kas_is_default ON akun_kas(is_default);
CREATE INDEX IF NOT EXISTS idx_keuangan_akun_kas ON keuangan(akun_kas_id);

-- ================================================
-- 4. RLS POLICIES
-- ================================================
ALTER TABLE akun_kas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view akun_kas"
  ON akun_kas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage akun_kas"
  ON akun_kas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ================================================
-- 5. TRIGGERS
-- ================================================
CREATE TRIGGER update_akun_kas_updated_at
  BEFORE UPDATE ON akun_kas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- 6. FUNCTIONS - Calculate Saldo
-- ================================================

-- Function: Calculate current balance for an account
CREATE OR REPLACE FUNCTION calculate_saldo_akun_kas(p_akun_kas_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_saldo_awal DECIMAL;
  v_total_pemasukan DECIMAL;
  v_total_pengeluaran DECIMAL;
  v_saldo_akhir DECIMAL;
BEGIN
  -- Get initial balance
  SELECT saldo_awal INTO v_saldo_awal
  FROM akun_kas
  WHERE id = p_akun_kas_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Calculate total income (posted only)
  SELECT COALESCE(SUM(jumlah), 0) INTO v_total_pemasukan
  FROM keuangan
  WHERE akun_kas_id = p_akun_kas_id
    AND jenis_transaksi = 'Pemasukan'
    AND status = 'posted';
  
  -- Calculate total expense (posted only)
  SELECT COALESCE(SUM(jumlah), 0) INTO v_total_pengeluaran
  FROM keuangan
  WHERE akun_kas_id = p_akun_kas_id
    AND jenis_transaksi = 'Pengeluaran'
    AND status = 'posted';
  
  -- Calculate final balance
  v_saldo_akhir := v_saldo_awal + v_total_pemasukan - v_total_pengeluaran;
  
  RETURN v_saldo_akhir;
END;
$$ LANGUAGE plpgsql;

-- Function: Update all account balances
CREATE OR REPLACE FUNCTION update_all_saldo_akun_kas()
RETURNS void AS $$
BEGIN
  UPDATE akun_kas
  SET saldo_saat_ini = calculate_saldo_akun_kas(id);
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update account balance when keuangan changes
CREATE OR REPLACE FUNCTION trigger_update_saldo_akun_kas()
RETURNS TRIGGER AS $$
BEGIN
  -- Update affected account(s)
  IF TG_OP = 'DELETE' THEN
    UPDATE akun_kas 
    SET saldo_saat_ini = calculate_saldo_akun_kas(id)
    WHERE id = OLD.akun_kas_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Update both old and new account if changed
    UPDATE akun_kas 
    SET saldo_saat_ini = calculate_saldo_akun_kas(id)
    WHERE id = NEW.akun_kas_id OR id = OLD.akun_kas_id;
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    UPDATE akun_kas 
    SET saldo_saat_ini = calculate_saldo_akun_kas(id)
    WHERE id = NEW.akun_kas_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_saldo_after_keuangan_change
  AFTER INSERT OR UPDATE OR DELETE ON keuangan
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_saldo_akun_kas();

-- ================================================
-- 7. DEFAULT DATA - 4 Accounts
-- ================================================

-- Insert default accounts
INSERT INTO akun_kas (nama, kode, tipe, saldo_awal, is_default, status, deskripsi)
VALUES 
  ('Kas Utama', 'KAS-001', 'Kas', 0, TRUE, 'aktif', 'Kas tunai utama pesantren'),
  ('Bank Umum', 'BANK-001', 'Bank', 0, FALSE, 'aktif', 'Rekening bank untuk operasional sehari-hari'),
  ('Bank Pembangunan', 'BANK-002', 'Bank', 0, FALSE, 'aktif', 'Rekening khusus untuk dana pembangunan dan renovasi'),
  ('Tabungan Santri', 'TAB-001', 'Tabungan', 0, FALSE, 'aktif', 'Rekening khusus untuk tabungan santri (terpisah dari operasional)')
ON CONFLICT (nama) DO NOTHING;

-- Update all balances
SELECT update_all_saldo_akun_kas();

-- ================================================
-- 8. VIEWS - Quick Stats
-- ================================================

-- View: Total balance across all accounts
CREATE OR REPLACE VIEW view_total_saldo_semua_akun AS
SELECT 
  COUNT(*) as jumlah_akun,
  SUM(saldo_saat_ini) as total_saldo,
  SUM(CASE WHEN tipe = 'Kas' THEN saldo_saat_ini ELSE 0 END) as total_kas,
  SUM(CASE WHEN tipe = 'Bank' THEN saldo_saat_ini ELSE 0 END) as total_bank,
  SUM(CASE WHEN tipe = 'Tabungan' THEN saldo_saat_ini ELSE 0 END) as total_tabungan
FROM akun_kas
WHERE status = 'aktif';

-- View: Account details with balance
CREATE OR REPLACE VIEW view_akun_kas_detail AS
SELECT 
  ak.id,
  ak.nama,
  ak.kode,
  ak.tipe,
  ak.nomor_rekening,
  ak.nama_bank,
  ak.saldo_awal,
  ak.saldo_saat_ini,
  ak.is_default,
  ak.status,
  ak.deskripsi,
  (SELECT COUNT(*) FROM keuangan WHERE akun_kas_id = ak.id) as jumlah_transaksi,
  (SELECT SUM(jumlah) FROM keuangan WHERE akun_kas_id = ak.id AND jenis_transaksi = 'Pemasukan' AND status = 'posted') as total_pemasukan,
  (SELECT SUM(jumlah) FROM keuangan WHERE akun_kas_id = ak.id AND jenis_transaksi = 'Pengeluaran' AND status = 'posted') as total_pengeluaran
FROM akun_kas ak
WHERE ak.status = 'aktif'
ORDER BY 
  CASE 
    WHEN ak.is_default THEN 0
    ELSE 1
  END,
  ak.nama;

-- ================================================
-- 9. COMMENTS
-- ================================================
COMMENT ON TABLE akun_kas IS 'Master akun kas & bank untuk multi-account management';
COMMENT ON COLUMN akun_kas.saldo_saat_ini IS 'Calculated real-time from keuangan transactions';
COMMENT ON COLUMN akun_kas.is_default IS 'Default account for transactions if not specified';

COMMENT ON FUNCTION calculate_saldo_akun_kas IS 'Calculate current balance for specific account';
COMMENT ON FUNCTION update_all_saldo_akun_kas IS 'Update balance for all accounts (run periodically)';

COMMENT ON VIEW view_total_saldo_semua_akun IS 'Summary of total balance across all active accounts';
COMMENT ON VIEW view_akun_kas_detail IS 'Detailed account information with transaction statistics';

