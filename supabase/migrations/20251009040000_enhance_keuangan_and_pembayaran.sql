-- ================================================
-- ENHANCE KEUANGAN & PEMBAYARAN SANTRI MODULE
-- ================================================
-- Purpose: Enhance keuangan table dan create pembayaran_santri table
-- Features: Multi akun kas, pembayaran santri (SPP, makan, dll)
-- ================================================

-- ================================================
-- 1. ENHANCE keuangan TABLE
-- ================================================

-- Add new columns to keuangan
ALTER TABLE keuangan 
  ADD COLUMN IF NOT EXISTS akun_kas VARCHAR(100) DEFAULT 'Kas Utama',
  ADD COLUMN IF NOT EXISTS nomor_transaksi VARCHAR(50),
  ADD COLUMN IF NOT EXISTS metode_pembayaran VARCHAR(50),
  ADD COLUMN IF NOT EXISTS penerima_pembayar TEXT,
  ADD COLUMN IF NOT EXISTS bukti_file TEXT,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'posted' 
    CHECK (status IN ('draft', 'verified', 'posted', 'cancelled')),
  ADD COLUMN IF NOT EXISTS sub_kategori VARCHAR(100);

-- Add unique constraint on nomor_transaksi (if not null)
CREATE UNIQUE INDEX idx_keuangan_nomor_transaksi_unique 
  ON keuangan(nomor_transaksi) 
  WHERE nomor_transaksi IS NOT NULL;

-- Add index on akun_kas
CREATE INDEX IF NOT EXISTS idx_keuangan_akun_kas ON keuangan(akun_kas);

-- Update existing records to have default status
UPDATE keuangan SET status = 'posted' WHERE status IS NULL;

-- ================================================
-- 2. TABLE: jenis_pembayaran_santri (Master payment types)
-- ================================================
CREATE TABLE IF NOT EXISTS jenis_pembayaran_santri (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode VARCHAR(20) UNIQUE NOT NULL,
  nama VARCHAR(100) NOT NULL,
  deskripsi TEXT,
  tarif_default DECIMAL(15,2),
  periode_default VARCHAR(20) CHECK (periode_default IN ('Bulanan', 'Semester', 'Tahunan', 'Sekali')),
  is_active BOOLEAN DEFAULT TRUE,
  urutan INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 3. TABLE: pembayaran_santri (Student payments)
-- ================================================
CREATE TABLE IF NOT EXISTS pembayaran_santri (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_pembayaran VARCHAR(50) UNIQUE,
  
  -- Student info
  santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  
  -- Payment type
  jenis_pembayaran_id UUID REFERENCES jenis_pembayaran_santri(id),
  jenis_pembayaran VARCHAR(100) NOT NULL, -- SPP, Makan, Laundry, dll (denormalized for flexibility)
  
  -- Period
  periode VARCHAR(50) NOT NULL, -- Format: "Oktober 2025", "Semester 1 2025/2026", dll
  tahun INTEGER NOT NULL,
  bulan INTEGER CHECK (bulan BETWEEN 1 AND 12), -- NULL jika semester/tahunan
  
  -- Amount
  jumlah_tagihan DECIMAL(15,2) NOT NULL CHECK (jumlah_tagihan >= 0),
  denda DECIMAL(15,2) DEFAULT 0 CHECK (denda >= 0),
  diskon DECIMAL(15,2) DEFAULT 0 CHECK (diskon >= 0),
  diskon_beasiswa DECIMAL(15,2) DEFAULT 0 CHECK (diskon_beasiswa >= 0), -- From beasiswa
  total_bayar DECIMAL(15,2) GENERATED ALWAYS AS (jumlah_tagihan + denda - diskon - diskon_beasiswa) STORED,
  
  jumlah_dibayar DECIMAL(15,2) DEFAULT 0 CHECK (jumlah_dibayar >= 0),
  sisa_tagihan DECIMAL(15,2) GENERATED ALWAYS AS (jumlah_tagihan + denda - diskon - diskon_beasiswa - jumlah_dibayar) STORED,
  
  -- Due date
  tanggal_jatuh_tempo DATE,
  tanggal_bayar DATE,
  
  -- Status
  status VARCHAR(20) DEFAULT 'belum_lunas' 
    CHECK (status IN ('belum_lunas', 'lunas', 'cicilan', 'terlambat', 'dibatalkan')),
  
  -- Payment method
  metode_pembayaran VARCHAR(50), -- Tunai, Transfer, dll
  
  -- Link to beasiswa (if applicable)
  beasiswa_id UUID, -- Soft reference to pencairan_beasiswa
  
  -- Link to keuangan when paid
  keuangan_id UUID REFERENCES keuangan(id),
  
  -- Notes
  catatan TEXT,
  alasan_diskon TEXT,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_jumlah_dibayar CHECK (jumlah_dibayar <= (jumlah_tagihan + denda - diskon - diskon_beasiswa))
);

-- ================================================
-- 4. TABLE: cicilan_pembayaran (Payment installments)
-- ================================================
CREATE TABLE IF NOT EXISTS cicilan_pembayaran (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pembayaran_santri_id UUID NOT NULL REFERENCES pembayaran_santri(id) ON DELETE CASCADE,
  
  cicilan_ke INTEGER NOT NULL,
  jumlah DECIMAL(15,2) NOT NULL CHECK (jumlah > 0),
  tanggal_bayar DATE NOT NULL DEFAULT CURRENT_DATE,
  metode_pembayaran VARCHAR(50),
  
  -- Link to keuangan
  keuangan_id UUID REFERENCES keuangan(id),
  
  catatan TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 5. TABLE: kategori_keuangan (Master categories)
-- ================================================
CREATE TABLE IF NOT EXISTS kategori_keuangan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode VARCHAR(20) UNIQUE,
  nama VARCHAR(100) NOT NULL,
  jenis TEXT NOT NULL CHECK (jenis IN ('Pemasukan', 'Pengeluaran')),
  parent_id UUID REFERENCES kategori_keuangan(id),
  deskripsi TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  urutan INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(nama, jenis)
);

-- ================================================
-- 6. INDEXES
-- ================================================
CREATE INDEX idx_jenis_pembayaran_santri_active ON jenis_pembayaran_santri(is_active);
CREATE INDEX idx_jenis_pembayaran_santri_kode ON jenis_pembayaran_santri(kode);

CREATE INDEX idx_pembayaran_santri_santri ON pembayaran_santri(santri_id);
CREATE INDEX idx_pembayaran_santri_status ON pembayaran_santri(status);
CREATE INDEX idx_pembayaran_santri_periode ON pembayaran_santri(periode);
CREATE INDEX idx_pembayaran_santri_tahun_bulan ON pembayaran_santri(tahun, bulan);
CREATE INDEX idx_pembayaran_santri_jatuh_tempo ON pembayaran_santri(tanggal_jatuh_tempo);
CREATE INDEX idx_pembayaran_santri_jenis ON pembayaran_santri(jenis_pembayaran_id);

CREATE INDEX idx_cicilan_pembayaran_santri ON cicilan_pembayaran(pembayaran_santri_id);
CREATE INDEX idx_cicilan_keuangan ON cicilan_pembayaran(keuangan_id);

CREATE INDEX idx_kategori_keuangan_jenis ON kategori_keuangan(jenis);
CREATE INDEX idx_kategori_keuangan_parent ON kategori_keuangan(parent_id);
CREATE INDEX idx_kategori_keuangan_active ON kategori_keuangan(is_active);

-- ================================================
-- 7. RLS POLICIES
-- ================================================
ALTER TABLE jenis_pembayaran_santri ENABLE ROW LEVEL SECURITY;
ALTER TABLE pembayaran_santri ENABLE ROW LEVEL SECURITY;
ALTER TABLE cicilan_pembayaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE kategori_keuangan ENABLE ROW LEVEL SECURITY;

-- Jenis Pembayaran Policies
CREATE POLICY "Authenticated users can view jenis_pembayaran_santri"
  ON jenis_pembayaran_santri FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage jenis_pembayaran_santri"
  ON jenis_pembayaran_santri FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Pembayaran Santri Policies
CREATE POLICY "Authenticated users can view pembayaran_santri"
  ON pembayaran_santri FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert pembayaran_santri"
  ON pembayaran_santri FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update pembayaran_santri"
  ON pembayaran_santri FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete pembayaran_santri"
  ON pembayaran_santri FOR DELETE TO authenticated USING (true);

-- Cicilan Policies
CREATE POLICY "Authenticated users can view cicilan_pembayaran"
  ON cicilan_pembayaran FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage cicilan_pembayaran"
  ON cicilan_pembayaran FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Kategori Keuangan Policies
CREATE POLICY "Authenticated users can view kategori_keuangan"
  ON kategori_keuangan FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage kategori_keuangan"
  ON kategori_keuangan FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ================================================
-- 8. TRIGGERS
-- ================================================
CREATE TRIGGER update_jenis_pembayaran_santri_updated_at
  BEFORE UPDATE ON jenis_pembayaran_santri
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pembayaran_santri_updated_at
  BEFORE UPDATE ON pembayaran_santri
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kategori_keuangan_updated_at
  BEFORE UPDATE ON kategori_keuangan
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- 9. HELPER FUNCTIONS
-- ================================================

-- Function: Generate nomor pembayaran otomatis
CREATE OR REPLACE FUNCTION generate_nomor_pembayaran()
RETURNS TRIGGER AS $$
DECLARE
  v_tahun VARCHAR(4);
  v_bulan VARCHAR(2);
  v_count INTEGER;
  v_nomor VARCHAR(50);
BEGIN
  IF NEW.nomor_pembayaran IS NULL THEN
    v_tahun := TO_CHAR(CURRENT_DATE, 'YYYY');
    v_bulan := TO_CHAR(CURRENT_DATE, 'MM');
    
    SELECT COUNT(*) + 1 INTO v_count
    FROM pembayaran_santri
    WHERE nomor_pembayaran LIKE 'PAY/' || v_tahun || '/' || v_bulan || '/%';
    
    v_nomor := 'PAY/' || v_tahun || '/' || v_bulan || '/' || LPAD(v_count::TEXT, 4, '0');
    NEW.nomor_pembayaran := v_nomor;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_nomor_pembayaran
  BEFORE INSERT ON pembayaran_santri
  FOR EACH ROW
  EXECUTE FUNCTION generate_nomor_pembayaran();

-- Function: Catat pembayaran santri
CREATE OR REPLACE FUNCTION catat_pembayaran_santri(
  p_pembayaran_id UUID,
  p_jumlah_bayar DECIMAL,
  p_tanggal_bayar DATE,
  p_metode VARCHAR DEFAULT 'Tunai',
  p_akun_kas VARCHAR DEFAULT 'Kas Utama',
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_pembayaran RECORD;
  v_santri RECORD;
  v_keuangan_id UUID;
  v_new_status VARCHAR;
  v_sisa DECIMAL;
BEGIN
  -- Get pembayaran details
  SELECT * INTO v_pembayaran FROM pembayaran_santri WHERE id = p_pembayaran_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', FALSE, 'message', 'Pembayaran tidak ditemukan');
  END IF;
  
  IF v_pembayaran.status = 'lunas' THEN
    RETURN json_build_object('success', FALSE, 'message', 'Pembayaran sudah lunas');
  END IF;
  
  -- Get santri details
  SELECT * INTO v_santri FROM santri WHERE id = v_pembayaran.santri_id;
  
  -- Calculate new status
  v_sisa := v_pembayaran.sisa_tagihan - p_jumlah_bayar;
  
  IF v_sisa <= 0 THEN
    v_new_status := 'lunas';
  ELSIF p_jumlah_bayar > 0 AND p_jumlah_bayar < v_pembayaran.sisa_tagihan THEN
    v_new_status := 'cicilan';
  ELSE
    v_new_status := v_pembayaran.status;
  END IF;
  
  -- Create keuangan entry
  INSERT INTO keuangan (
    jenis_transaksi,
    kategori,
    sub_kategori,
    jumlah,
    tanggal,
    deskripsi,
    penerima_pembayar,
    metode_pembayaran,
    akun_kas,
    referensi,
    status,
    created_by
  ) VALUES (
    'Pemasukan',
    'Pembayaran Santri',
    v_pembayaran.jenis_pembayaran,
    p_jumlah_bayar,
    p_tanggal_bayar,
    'Pembayaran ' || v_pembayaran.jenis_pembayaran || ' - ' || v_pembayaran.periode,
    v_santri.nama_lengkap || ' (' || v_santri.nis || ')',
    p_metode,
    p_akun_kas,
    'pembayaran_santri:' || p_pembayaran_id,
    'posted',
    p_user_id
  )
  RETURNING id INTO v_keuangan_id;
  
  -- Update pembayaran_santri
  UPDATE pembayaran_santri
  SET 
    jumlah_dibayar = jumlah_dibayar + p_jumlah_bayar,
    tanggal_bayar = p_tanggal_bayar,
    metode_pembayaran = p_metode,
    status = v_new_status,
    keuangan_id = CASE WHEN v_new_status = 'lunas' THEN v_keuangan_id ELSE keuangan_id END,
    updated_by = p_user_id,
    updated_at = NOW()
  WHERE id = p_pembayaran_id;
  
  -- If cicilan, create cicilan entry
  IF v_new_status = 'cicilan' OR p_jumlah_bayar < v_pembayaran.sisa_tagihan THEN
    INSERT INTO cicilan_pembayaran (
      pembayaran_santri_id,
      cicilan_ke,
      jumlah,
      tanggal_bayar,
      metode_pembayaran,
      keuangan_id,
      created_by
    ) VALUES (
      p_pembayaran_id,
      (SELECT COUNT(*) + 1 FROM cicilan_pembayaran WHERE pembayaran_santri_id = p_pembayaran_id),
      p_jumlah_bayar,
      p_tanggal_bayar,
      p_metode,
      v_keuangan_id,
      p_user_id
    );
  END IF;
  
  RETURN json_build_object(
    'success', TRUE,
    'keuangan_id', v_keuangan_id,
    'new_status', v_new_status,
    'sisa_tagihan', v_sisa
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Generate tagihan massal
CREATE OR REPLACE FUNCTION generate_tagihan_massal(
  p_jenis_pembayaran VARCHAR,
  p_periode VARCHAR,
  p_tahun INTEGER,
  p_bulan INTEGER,
  p_jumlah DECIMAL,
  p_tanggal_jatuh_tempo DATE,
  p_filter_kelas VARCHAR DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_santri RECORD;
  v_count INTEGER := 0;
BEGIN
  -- Loop through active santri
  FOR v_santri IN 
    SELECT * FROM santri 
    WHERE status = 'Aktif'
      AND (p_filter_kelas IS NULL OR kelas = p_filter_kelas)
  LOOP
    -- Check if already exists
    IF NOT EXISTS (
      SELECT 1 FROM pembayaran_santri
      WHERE santri_id = v_santri.id
        AND jenis_pembayaran = p_jenis_pembayaran
        AND periode = p_periode
    ) THEN
      -- Insert tagihan
      INSERT INTO pembayaran_santri (
        santri_id,
        jenis_pembayaran,
        periode,
        tahun,
        bulan,
        jumlah_tagihan,
        tanggal_jatuh_tempo,
        status,
        created_by
      ) VALUES (
        v_santri.id,
        p_jenis_pembayaran,
        p_periode,
        p_tahun,
        p_bulan,
        p_jumlah,
        p_tanggal_jatuh_tempo,
        'belum_lunas',
        p_user_id
      );
      
      v_count := v_count + 1;
    END IF;
  END LOOP;
  
  RETURN json_build_object(
    'success', TRUE,
    'generated_count', v_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 10. DEFAULT DATA
-- ================================================

-- Insert default jenis pembayaran santri
INSERT INTO jenis_pembayaran_santri (kode, nama, tarif_default, periode_default, urutan)
VALUES 
  ('SPP', 'SPP (Sumbangan Pembinaan Pendidikan)', 600000, 'Bulanan', 1),
  ('MAKAN', 'Uang Makan', 400000, 'Bulanan', 2),
  ('LAUNDRY', 'Uang Laundry', 100000, 'Bulanan', 3),
  ('KEGIATAN', 'Uang Kegiatan', 200000, 'Semester', 4),
  ('SERAGAM', 'Seragam', 500000, 'Tahunan', 5),
  ('BUKU', 'Buku Pelajaran', 300000, 'Semester', 6)
ON CONFLICT (kode) DO NOTHING;

-- Insert default kategori keuangan
INSERT INTO kategori_keuangan (kode, nama, jenis, urutan)
VALUES 
  -- Pemasukan
  ('PM-001', 'Donasi Tunai', 'Pemasukan', 1),
  ('PM-002', 'Donasi Barang', 'Pemasukan', 2),
  ('PM-003', 'Pembayaran Santri', 'Pemasukan', 3),
  ('PM-004', 'SPP Santri', 'Pemasukan', 4),
  ('PM-005', 'Penjualan Koperasi', 'Pemasukan', 5),
  ('PM-006', 'Penjualan Inventaris', 'Pemasukan', 6),
  ('PM-007', 'Bantuan Pemerintah', 'Pemasukan', 7),
  ('PM-008', 'Bunga Bank', 'Pemasukan', 8),
  ('PM-009', 'Pemasukan Lain-lain', 'Pemasukan', 99),
  
  -- Pengeluaran
  ('PK-001', 'Gaji & Honor', 'Pengeluaran', 1),
  ('PK-002', 'Operasional', 'Pengeluaran', 2),
  ('PK-003', 'Konsumsi', 'Pengeluaran', 3),
  ('PK-004', 'Utilitas (Listrik, Air, Internet)', 'Pengeluaran', 4),
  ('PK-005', 'Pembelian Inventaris', 'Pengeluaran', 5),
  ('PK-006', 'Pembelian Stok Koperasi', 'Pengeluaran', 6),
  ('PK-007', 'Beasiswa Santri', 'Pengeluaran', 7),
  ('PK-008', 'Biaya Admin Bank', 'Pengeluaran', 8),
  ('PK-009', 'Renovasi & Pemeliharaan', 'Pengeluaran', 9),
  ('PK-010', 'Transport', 'Pengeluaran', 10),
  ('PK-011', 'ATK & Perlengkapan', 'Pengeluaran', 11),
  ('PK-012', 'Koreksi Keuangan', 'Pengeluaran', 98),
  ('PK-013', 'Pengeluaran Lain-lain', 'Pengeluaran', 99)
ON CONFLICT (kode) DO NOTHING;

-- ================================================
-- 11. COMMENTS
-- ================================================
COMMENT ON TABLE jenis_pembayaran_santri IS 'Master jenis pembayaran santri (SPP, Makan, Laundry, dll)';
COMMENT ON TABLE pembayaran_santri IS 'Tagihan dan pembayaran santri dengan support cicilan dan beasiswa';
COMMENT ON TABLE cicilan_pembayaran IS 'Detail cicilan pembayaran santri (jika bayar bertahap)';
COMMENT ON TABLE kategori_keuangan IS 'Master kategori transaksi keuangan';

COMMENT ON COLUMN pembayaran_santri.total_bayar IS 'Total yang harus dibayar (tagihan + denda - diskon - beasiswa) [COMPUTED]';
COMMENT ON COLUMN pembayaran_santri.sisa_tagihan IS 'Sisa yang belum dibayar [COMPUTED]';
COMMENT ON COLUMN pembayaran_santri.diskon_beasiswa IS 'Potongan dari program beasiswa (auto-fill dari pencairan beasiswa)';

COMMENT ON FUNCTION catat_pembayaran_santri IS 'Catat pembayaran santri dan auto-create entry di keuangan, support cicilan';
COMMENT ON FUNCTION generate_tagihan_massal IS 'Generate tagihan massal untuk semua santri aktif per periode';

