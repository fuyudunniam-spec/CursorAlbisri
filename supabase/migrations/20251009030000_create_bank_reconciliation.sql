-- ================================================
-- MODUL REKONSILIASI BANK
-- ================================================
-- Purpose: Bank reconciliation system untuk sinkronisasi saldo bank dengan system
-- Features: Import mutasi bank, matching, adjustment, laporan rekonsiliasi
-- ================================================

-- ================================================
-- 1. TABLE: mutasi_bank (Bank statements/transactions)
-- ================================================
CREATE TABLE IF NOT EXISTS mutasi_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  akun_kas VARCHAR(100) NOT NULL, -- Link ke nama akun kas (Bank BCA, Mandiri, dll)
  
  -- Transaction details
  tanggal DATE NOT NULL,
  nomor_referensi VARCHAR(100), -- Reference number dari bank
  deskripsi TEXT NOT NULL,
  
  -- Amount
  debit DECIMAL(15,2) DEFAULT 0 CHECK (debit >= 0), -- Uang masuk (tambah saldo)
  kredit DECIMAL(15,2) DEFAULT 0 CHECK (kredit >= 0), -- Uang keluar (kurang saldo)
  saldo DECIMAL(15,2), -- Saldo di bank setelah transaksi ini
  
  -- Matching dengan system
  is_matched BOOLEAN DEFAULT FALSE,
  keuangan_id UUID REFERENCES keuangan(id), -- Link ke transaksi di system
  matched_at TIMESTAMPTZ,
  matched_by UUID REFERENCES auth.users(id),
  
  -- Import info
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  imported_by UUID REFERENCES auth.users(id),
  import_batch VARCHAR(100), -- Batch ID untuk tracking import
  
  catatan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 2. TABLE: rekonsiliasi_bank (Reconciliation header)
-- ================================================
CREATE TABLE IF NOT EXISTS rekonsiliasi_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_rekonsiliasi VARCHAR(50) UNIQUE, -- Format: RECON/YYYY/MM/XXX
  akun_kas VARCHAR(100) NOT NULL,
  
  -- Periode rekonsiliasi
  tanggal_mulai DATE NOT NULL,
  tanggal_selesai DATE NOT NULL,
  bulan INTEGER NOT NULL CHECK (bulan BETWEEN 1 AND 12),
  tahun INTEGER NOT NULL,
  
  -- Saldo
  saldo_bank_awal DECIMAL(15,2) NOT NULL,
  saldo_bank_akhir DECIMAL(15,2) NOT NULL,
  saldo_system_awal DECIMAL(15,2) NOT NULL,
  saldo_system_akhir DECIMAL(15,2) NOT NULL,
  
  -- Mutasi
  total_debit_bank DECIMAL(15,2) DEFAULT 0,
  total_kredit_bank DECIMAL(15,2) DEFAULT 0,
  total_debit_system DECIMAL(15,2) DEFAULT 0,
  total_kredit_system DECIMAL(15,2) DEFAULT 0,
  
  -- Selisih
  selisih DECIMAL(15,2) DEFAULT 0, -- saldo_bank_akhir - saldo_system_akhir
  is_balanced BOOLEAN DEFAULT FALSE, -- TRUE jika selisih = 0
  
  -- Matching stats
  jumlah_transaksi_bank INTEGER DEFAULT 0,
  jumlah_transaksi_system INTEGER DEFAULT 0,
  jumlah_matched INTEGER DEFAULT 0,
  jumlah_unmatched_bank INTEGER DEFAULT 0,
  jumlah_unmatched_system INTEGER DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'approved')),
  
  catatan TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id)
);

-- ================================================
-- 3. TABLE: adjustment_rekonsiliasi (Adjustment entries)
-- ================================================
CREATE TABLE IF NOT EXISTS adjustment_rekonsiliasi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rekonsiliasi_id UUID NOT NULL REFERENCES rekonsiliasi_bank(id) ON DELETE CASCADE,
  
  -- Jenis adjustment
  jenis VARCHAR(50) NOT NULL CHECK (jenis IN ('Biaya Bank', 'Bunga Bank', 'Koreksi Pencatatan', 'Transaksi Belum Tercatat', 'Lainnya')),
  arah VARCHAR(20) NOT NULL CHECK (arah IN ('Tambah System', 'Kurang System')),
  
  deskripsi TEXT NOT NULL,
  jumlah DECIMAL(15,2) NOT NULL CHECK (jumlah > 0),
  
  -- Link to created keuangan entry
  keuangan_id UUID REFERENCES keuangan(id),
  
  catatan TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 4. TABLE: akun_kas (Master cash/bank accounts)
-- ================================================
CREATE TABLE IF NOT EXISTS akun_kas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama VARCHAR(100) NOT NULL UNIQUE,
  kode VARCHAR(20) UNIQUE,
  tipe VARCHAR(50) NOT NULL CHECK (tipe IN ('Kas', 'Bank', 'Tabungan')),
  
  -- Bank details (jika tipe = Bank)
  nomor_rekening VARCHAR(50),
  nama_bank VARCHAR(100),
  atas_nama VARCHAR(200),
  
  -- Saldo
  saldo_awal DECIMAL(15,2) DEFAULT 0,
  saldo_saat_ini DECIMAL(15,2) DEFAULT 0,
  tanggal_buka DATE DEFAULT CURRENT_DATE,
  
  -- Status
  status VARCHAR(20) DEFAULT 'aktif' CHECK (status IN ('aktif', 'ditutup', 'suspended')),
  is_default BOOLEAN DEFAULT FALSE,
  
  deskripsi TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 5. INDEXES
-- ================================================
CREATE INDEX idx_mutasi_bank_akun ON mutasi_bank(akun_kas);
CREATE INDEX idx_mutasi_bank_tanggal ON mutasi_bank(tanggal DESC);
CREATE INDEX idx_mutasi_bank_matched ON mutasi_bank(is_matched);
CREATE INDEX idx_mutasi_bank_batch ON mutasi_bank(import_batch);
CREATE INDEX idx_mutasi_bank_keuangan ON mutasi_bank(keuangan_id);

CREATE INDEX idx_rekonsiliasi_bank_akun ON rekonsiliasi_bank(akun_kas);
CREATE INDEX idx_rekonsiliasi_bank_periode ON rekonsiliasi_bank(tahun, bulan);
CREATE INDEX idx_rekonsiliasi_bank_status ON rekonsiliasi_bank(status);
CREATE INDEX idx_rekonsiliasi_bank_nomor ON rekonsiliasi_bank(nomor_rekonsiliasi);

CREATE INDEX idx_adjustment_rekonsiliasi ON adjustment_rekonsiliasi(rekonsiliasi_id);
CREATE INDEX idx_adjustment_keuangan ON adjustment_rekonsiliasi(keuangan_id);

CREATE INDEX idx_akun_kas_status ON akun_kas(status);
CREATE INDEX idx_akun_kas_tipe ON akun_kas(tipe);

-- ================================================
-- 6. RLS POLICIES
-- ================================================
ALTER TABLE mutasi_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE rekonsiliasi_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE adjustment_rekonsiliasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE akun_kas ENABLE ROW LEVEL SECURITY;

-- Mutasi Bank Policies
CREATE POLICY "Authenticated users can view mutasi_bank"
  ON mutasi_bank FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert mutasi_bank"
  ON mutasi_bank FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update mutasi_bank"
  ON mutasi_bank FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete mutasi_bank"
  ON mutasi_bank FOR DELETE TO authenticated USING (true);

-- Rekonsiliasi Bank Policies
CREATE POLICY "Authenticated users can view rekonsiliasi_bank"
  ON rekonsiliasi_bank FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage rekonsiliasi_bank"
  ON rekonsiliasi_bank FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Adjustment Policies
CREATE POLICY "Authenticated users can view adjustment_rekonsiliasi"
  ON adjustment_rekonsiliasi FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage adjustment_rekonsiliasi"
  ON adjustment_rekonsiliasi FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Akun Kas Policies
CREATE POLICY "Authenticated users can view akun_kas"
  ON akun_kas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage akun_kas"
  ON akun_kas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ================================================
-- 7. TRIGGERS
-- ================================================
CREATE TRIGGER update_rekonsiliasi_bank_updated_at
  BEFORE UPDATE ON rekonsiliasi_bank
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_akun_kas_updated_at
  BEFORE UPDATE ON akun_kas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- 8. HELPER FUNCTIONS
-- ================================================

-- Function: Auto-match mutasi bank dengan transaksi keuangan
CREATE OR REPLACE FUNCTION auto_match_mutasi_bank(
  p_rekonsiliasi_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_rekon RECORD;
  v_matched_count INTEGER := 0;
  v_mutasi RECORD;
  v_keuangan_id UUID;
BEGIN
  -- Get rekonsiliasi details
  SELECT * INTO v_rekon FROM rekonsiliasi_bank WHERE id = p_rekonsiliasi_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', FALSE, 'message', 'Rekonsiliasi tidak ditemukan');
  END IF;
  
  -- Loop through unmatched mutasi bank
  FOR v_mutasi IN 
    SELECT * FROM mutasi_bank 
    WHERE akun_kas = v_rekon.akun_kas
      AND tanggal BETWEEN v_rekon.tanggal_mulai AND v_rekon.tanggal_selesai
      AND is_matched = FALSE
  LOOP
    -- Try to find matching keuangan entry
    -- Match criteria: same date, same amount, same account
    SELECT id INTO v_keuangan_id
    FROM keuangan
    WHERE akun_kas = v_rekon.akun_kas
      AND tanggal = v_mutasi.tanggal
      AND (
        (v_mutasi.debit > 0 AND jenis_transaksi = 'Pemasukan' AND jumlah = v_mutasi.debit) OR
        (v_mutasi.kredit > 0 AND jenis_transaksi = 'Pengeluaran' AND jumlah = v_mutasi.kredit)
      )
      AND NOT EXISTS (
        SELECT 1 FROM mutasi_bank mb WHERE mb.keuangan_id = keuangan.id
      )
    LIMIT 1;
    
    -- If match found, link them
    IF v_keuangan_id IS NOT NULL THEN
      UPDATE mutasi_bank
      SET 
        is_matched = TRUE,
        keuangan_id = v_keuangan_id,
        matched_at = NOW()
      WHERE id = v_mutasi.id;
      
      v_matched_count := v_matched_count + 1;
    END IF;
  END LOOP;
  
  RETURN json_build_object(
    'success', TRUE,
    'matched_count', v_matched_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Calculate saldo from keuangan
CREATE OR REPLACE FUNCTION calculate_saldo_system(
  p_akun_kas VARCHAR,
  p_tanggal_mulai DATE,
  p_tanggal_akhir DATE
)
RETURNS TABLE (
  saldo_awal DECIMAL,
  total_pemasukan DECIMAL,
  total_pengeluaran DECIMAL,
  saldo_akhir DECIMAL
) AS $$
DECLARE
  v_saldo_awal DECIMAL;
  v_pemasukan DECIMAL;
  v_pengeluaran DECIMAL;
BEGIN
  -- Get saldo awal from akun_kas
  SELECT COALESCE(ak.saldo_awal, 0) INTO v_saldo_awal
  FROM akun_kas ak
  WHERE ak.nama = p_akun_kas;
  
  -- Add previous transactions
  SELECT COALESCE(v_saldo_awal, 0) +
         COALESCE(SUM(CASE WHEN jenis_transaksi = 'Pemasukan' THEN jumlah ELSE 0 END), 0) -
         COALESCE(SUM(CASE WHEN jenis_transaksi = 'Pengeluaran' THEN jumlah ELSE 0 END), 0)
  INTO v_saldo_awal
  FROM keuangan
  WHERE akun_kas = p_akun_kas
    AND tanggal < p_tanggal_mulai;
  
  -- Get periode transactions
  SELECT 
    COALESCE(SUM(CASE WHEN jenis_transaksi = 'Pemasukan' THEN jumlah ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN jenis_transaksi = 'Pengeluaran' THEN jumlah ELSE 0 END), 0)
  INTO v_pemasukan, v_pengeluaran
  FROM keuangan
  WHERE akun_kas = p_akun_kas
    AND tanggal BETWEEN p_tanggal_mulai AND p_tanggal_akhir;
  
  RETURN QUERY
  SELECT 
    v_saldo_awal,
    v_pemasukan,
    v_pengeluaran,
    v_saldo_awal + v_pemasukan - v_pengeluaran;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Create adjustment and keuangan entry
CREATE OR REPLACE FUNCTION create_adjustment(
  p_rekonsiliasi_id UUID,
  p_jenis VARCHAR,
  p_arah VARCHAR,
  p_deskripsi TEXT,
  p_jumlah DECIMAL,
  p_tanggal DATE,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_rekon RECORD;
  v_keuangan_id UUID;
  v_adjustment_id UUID;
  v_jenis_transaksi TEXT;
  v_kategori TEXT;
BEGIN
  -- Get rekonsiliasi details
  SELECT * INTO v_rekon FROM rekonsiliasi_bank WHERE id = p_rekonsiliasi_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', FALSE, 'message', 'Rekonsiliasi tidak ditemukan');
  END IF;
  
  -- Determine jenis_transaksi and kategori
  IF p_arah = 'Kurang System' THEN
    v_jenis_transaksi := 'Pengeluaran';
    v_kategori := CASE p_jenis
      WHEN 'Biaya Bank' THEN 'Biaya Admin Bank'
      WHEN 'Koreksi Pencatatan' THEN 'Koreksi Keuangan'
      ELSE 'Pengeluaran Lain-lain'
    END;
  ELSE -- Tambah System
    v_jenis_transaksi := 'Pemasukan';
    v_kategori := CASE p_jenis
      WHEN 'Bunga Bank' THEN 'Bunga Bank'
      WHEN 'Koreksi Pencatatan' THEN 'Koreksi Keuangan'
      ELSE 'Pemasukan Lain-lain'
    END;
  END IF;
  
  -- Create keuangan entry
  INSERT INTO keuangan (
    jenis_transaksi,
    kategori,
    jumlah,
    tanggal,
    deskripsi,
    akun_kas,
    referensi,
    created_by
  ) VALUES (
    v_jenis_transaksi,
    v_kategori,
    p_jumlah,
    p_tanggal,
    p_deskripsi || ' (Adjustment Rekonsiliasi)',
    v_rekon.akun_kas,
    'recon_adjustment:' || p_rekonsiliasi_id,
    p_user_id
  )
  RETURNING id INTO v_keuangan_id;
  
  -- Create adjustment entry
  INSERT INTO adjustment_rekonsiliasi (
    rekonsiliasi_id,
    jenis,
    arah,
    deskripsi,
    jumlah,
    keuangan_id,
    created_by
  ) VALUES (
    p_rekonsiliasi_id,
    p_jenis,
    p_arah,
    p_deskripsi,
    p_jumlah,
    v_keuangan_id,
    p_user_id
  )
  RETURNING id INTO v_adjustment_id;
  
  RETURN json_build_object(
    'success', TRUE,
    'adjustment_id', v_adjustment_id,
    'keuangan_id', v_keuangan_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 9. DEFAULT DATA
-- ================================================

-- Insert default akun kas
INSERT INTO akun_kas (nama, kode, tipe, saldo_awal, saldo_saat_ini, is_default)
VALUES 
  ('Kas Utama', 'KAS-01', 'Kas', 0, 0, TRUE),
  ('Bank BCA', 'BANK-01', 'Bank', 0, 0, FALSE),
  ('Bank Mandiri', 'BANK-02', 'Bank', 0, 0, FALSE)
ON CONFLICT (nama) DO NOTHING;

-- ================================================
-- 10. COMMENTS
-- ================================================
COMMENT ON TABLE mutasi_bank IS 'Import mutasi rekening bank untuk rekonsiliasi';
COMMENT ON TABLE rekonsiliasi_bank IS 'Header rekonsiliasi bank (per periode/bulan)';
COMMENT ON TABLE adjustment_rekonsiliasi IS 'Jurnal penyesuaian hasil rekonsiliasi (biaya admin, bunga, koreksi)';
COMMENT ON TABLE akun_kas IS 'Master akun kas/bank (Kas Utama, Bank BCA, dll)';

COMMENT ON COLUMN mutasi_bank.is_matched IS 'TRUE jika sudah dipasangkan dengan transaksi di keuangan';
COMMENT ON COLUMN rekonsiliasi_bank.is_balanced IS 'TRUE jika saldo bank = saldo system (selisih = 0)';
COMMENT ON COLUMN adjustment_rekonsiliasi.arah IS 'Tambah System = menambah saldo system, Kurang System = mengurangi saldo system';

COMMENT ON FUNCTION auto_match_mutasi_bank IS 'Auto-match mutasi bank dengan transaksi keuangan berdasarkan tanggal, nominal, dan akun';
COMMENT ON FUNCTION calculate_saldo_system IS 'Hitung saldo awal, mutasi, dan saldo akhir dari pencatatan system';
COMMENT ON FUNCTION create_adjustment IS 'Buat adjustment rekonsiliasi dan auto-create entry di keuangan';

