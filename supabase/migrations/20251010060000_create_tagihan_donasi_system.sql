-- =====================================================
-- TAGIHAN & DONASI SYSTEM MIGRATION
-- Created: 2025-01-10
-- Purpose: Complete billing & donation/infaq system
-- =====================================================

-- =====================================================
-- 1. PAKET BIAYA PROGRAM
-- =====================================================
CREATE TABLE IF NOT EXISTS paket_biaya_program (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id UUID REFERENCES program_santri(id) ON DELETE CASCADE,
  nama_paket VARCHAR(100) NOT NULL,
  deskripsi TEXT,
  total_biaya DECIMAL(15,2) NOT NULL DEFAULT 0,
  periode VARCHAR(50) DEFAULT 'Bulanan', -- Bulanan, Per Semester, Tahunan
  kategori_santri TEXT[], -- Array of eligible categories
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE paket_biaya_program IS 'Paket biaya untuk setiap program santri';
COMMENT ON COLUMN paket_biaya_program.kategori_santri IS 'Array of santri categories eligible for this package';

-- =====================================================
-- 2. KOMPONEN BIAYA PAKET (Breakdown)
-- =====================================================
CREATE TABLE IF NOT EXISTS komponen_biaya_paket (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paket_id UUID REFERENCES paket_biaya_program(id) ON DELETE CASCADE,
  nama_komponen VARCHAR(100) NOT NULL, -- SPP, Makan, Asrama, Buku, Seragam, dll
  jumlah DECIMAL(15,2) NOT NULL DEFAULT 0,
  is_wajib BOOLEAN DEFAULT true,
  keterangan TEXT,
  urutan INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE komponen_biaya_paket IS 'Detail breakdown komponen biaya dalam paket';

-- =====================================================
-- 3. SANTRI PROGRAMS (Enhancement)
-- =====================================================
ALTER TABLE santri_programs 
  ADD COLUMN IF NOT EXISTS paket_biaya_id UUID REFERENCES paket_biaya_program(id),
  ADD COLUMN IF NOT EXISTS subsidi_persen DECIMAL(5,2) DEFAULT 0, -- 0-100%
  ADD COLUMN IF NOT EXISTS total_biaya_final DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS catatan_subsidi TEXT;

COMMENT ON COLUMN santri_programs.subsidi_persen IS 'Percentage of subsidy (0-100). 100 = full scholarship';
COMMENT ON COLUMN santri_programs.total_biaya_final IS 'Final cost after subsidy';

-- =====================================================
-- 4. TAGIHAN SANTRI (Auto-generated)
-- =====================================================
CREATE TABLE IF NOT EXISTS tagihan_santri (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  santri_id UUID REFERENCES santri(id) ON DELETE CASCADE,
  santri_program_id UUID REFERENCES santri_programs(id) ON DELETE CASCADE,
  
  -- Billing Details
  periode VARCHAR(7) NOT NULL, -- Format: YYYY-MM (e.g., "2025-01")
  tanggal_jatuh_tempo DATE NOT NULL,
  total_tagihan DECIMAL(15,2) NOT NULL DEFAULT 0,
  subsidi DECIMAL(15,2) DEFAULT 0,
  total_bayar DECIMAL(15,2) NOT NULL DEFAULT 0, -- total_tagihan - subsidi
  
  -- Payment Status
  status VARCHAR(50) DEFAULT 'Belum Bayar', -- Belum Bayar, Sebagian, Lunas, Lewat Tempo
  jumlah_dibayar DECIMAL(15,2) DEFAULT 0,
  sisa_tagihan DECIMAL(15,2) DEFAULT 0,
  
  -- Payment Details
  tanggal_bayar TIMESTAMP,
  metode_bayar VARCHAR(50), -- Transfer, Tunai, QRIS, Virtual Account, dll
  bukti_bayar_url TEXT,
  nomor_referensi VARCHAR(100),
  
  -- Social Mission Message
  deskripsi_sosial TEXT DEFAULT 'Pembayaran Anda turut mendukung pendidikan anak yatim, piatu, dan dhuafa di yayasan kami. Jazakumullah khairan katsiran.',
  
  -- Metadata
  catatan TEXT,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT unique_tagihan_periode UNIQUE(santri_id, santri_program_id, periode)
);

COMMENT ON TABLE tagihan_santri IS 'Monthly billing for santri programs with social mission message';
COMMENT ON COLUMN tagihan_santri.deskripsi_sosial IS 'Social mission message to encourage support for yatim/piatu/dhuafa education';

CREATE INDEX idx_tagihan_santri_id ON tagihan_santri(santri_id);
CREATE INDEX idx_tagihan_status ON tagihan_santri(status);
CREATE INDEX idx_tagihan_periode ON tagihan_santri(periode);
CREATE INDEX idx_tagihan_jatuh_tempo ON tagihan_santri(tanggal_jatuh_tempo);

-- =====================================================
-- 5. DONASI / INFAQ SYSTEM
-- =====================================================
CREATE TABLE IF NOT EXISTS donasi_infaq (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Donor Information
  donatur_name VARCHAR(200) NOT NULL,
  donatur_email VARCHAR(200),
  donatur_phone VARCHAR(50),
  is_anonim BOOLEAN DEFAULT false,
  
  -- Donation Details
  jenis VARCHAR(50) NOT NULL DEFAULT 'Umum', -- Umum, Beasiswa, Operasional, Pembangunan, Qurban, dll
  jumlah DECIMAL(15,2) NOT NULL,
  metode_bayar VARCHAR(50), -- Transfer, Tunai, QRIS, Virtual Account
  
  -- Purpose & Impact
  tujuan TEXT, -- Specific purpose
  pesan_donatur TEXT, -- Message from donor
  doa_donatur TEXT, -- Prayer request
  
  -- Program Target (Optional)
  program_target UUID REFERENCES program_santri(id),
  santri_target UUID REFERENCES santri(id), -- Specific santri to support
  
  -- Payment Status
  status VARCHAR(50) DEFAULT 'Pending', -- Pending, Verified, Completed, Rejected
  tanggal_donasi TIMESTAMP DEFAULT NOW(),
  bukti_transfer_url TEXT,
  nomor_referensi VARCHAR(100),
  
  -- Verification
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP,
  
  -- Receipt
  nomor_kwitansi VARCHAR(100),
  kwitansi_url TEXT,
  
  -- Tax Deduction (if applicable)
  tax_deduction_receipt BOOLEAN DEFAULT false,
  
  -- Metadata
  catatan_admin TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- User relation (if logged in)
  user_id UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE donasi_infaq IS 'Donation and infaq system with social impact tracking';
COMMENT ON COLUMN donasi_infaq.is_anonim IS 'Hide donor name in public listings';
COMMENT ON COLUMN donasi_infaq.santri_target IS 'Specific santri to support (optional)';

CREATE INDEX idx_donasi_status ON donasi_infaq(status);
CREATE INDEX idx_donasi_jenis ON donasi_infaq(jenis);
CREATE INDEX idx_donasi_tanggal ON donasi_infaq(tanggal_donasi);
CREATE INDEX idx_donasi_user ON donasi_infaq(user_id);

-- =====================================================
-- 6. KAMPANYE DONASI (Fundraising Campaigns)
-- =====================================================
CREATE TABLE IF NOT EXISTS kampanye_donasi (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Campaign Details
  judul VARCHAR(200) NOT NULL,
  slug VARCHAR(200) UNIQUE NOT NULL,
  deskripsi TEXT NOT NULL,
  gambar_url TEXT,
  
  -- Fundraising Goals
  target_dana DECIMAL(15,2) NOT NULL,
  dana_terkumpul DECIMAL(15,2) DEFAULT 0,
  jumlah_donatur INT DEFAULT 0,
  
  -- Timeline
  tanggal_mulai DATE NOT NULL,
  tanggal_selesai DATE NOT NULL,
  
  -- Status
  status VARCHAR(50) DEFAULT 'Draft', -- Draft, Active, Completed, Closed
  is_featured BOOLEAN DEFAULT false,
  
  -- Social Impact
  kategori VARCHAR(50), -- Beasiswa, Operasional, Pembangunan, Qurban, dll
  jumlah_penerima_manfaat INT DEFAULT 0,
  cerita_dampak TEXT, -- Impact stories
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE kampanye_donasi IS 'Fundraising campaigns for specific purposes';

CREATE INDEX idx_kampanye_status ON kampanye_donasi(status);
CREATE INDEX idx_kampanye_featured ON kampanye_donasi(is_featured);

-- =====================================================
-- 7. ALLOCATION TRACKING (Transparansi Dana)
-- =====================================================
CREATE TABLE IF NOT EXISTS alokasi_dana (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Source
  donasi_id UUID REFERENCES donasi_infaq(id),
  kampanye_id UUID REFERENCES kampanye_donasi(id),
  
  -- Allocation
  jumlah DECIMAL(15,2) NOT NULL,
  tujuan_alokasi TEXT NOT NULL,
  kategori VARCHAR(50), -- Beasiswa, Operasional, Gaji, Konsumsi, dll
  
  -- Beneficiary
  santri_id UUID REFERENCES santri(id),
  program_id UUID REFERENCES program_santri(id),
  
  -- Documentation
  tanggal_alokasi DATE DEFAULT NOW(),
  bukti_penggunaan_url TEXT,
  keterangan TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE alokasi_dana IS 'Track dana allocation for transparency';

-- =====================================================
-- 8. TRIGGER: Auto-calculate sisa tagihan
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_sisa_tagihan()
RETURNS TRIGGER AS $$
BEGIN
  NEW.sisa_tagihan := NEW.total_bayar - NEW.jumlah_dibayar;
  
  -- Update status based on payment
  IF NEW.jumlah_dibayar = 0 THEN
    NEW.status := 'Belum Bayar';
  ELSIF NEW.jumlah_dibayar >= NEW.total_bayar THEN
    NEW.status := 'Lunas';
  ELSE
    NEW.status := 'Sebagian';
  END IF;
  
  -- Check if overdue
  IF NEW.tanggal_jatuh_tempo < CURRENT_DATE AND NEW.status != 'Lunas' THEN
    NEW.status := 'Lewat Tempo';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_sisa_tagihan
BEFORE INSERT OR UPDATE ON tagihan_santri
FOR EACH ROW
EXECUTE FUNCTION calculate_sisa_tagihan();

-- =====================================================
-- 9. TRIGGER: Update kampanye dana_terkumpul
-- =====================================================
CREATE OR REPLACE FUNCTION update_kampanye_dana()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Find related kampanye and update
    UPDATE kampanye_donasi
    SET 
      dana_terkumpul = (
        SELECT COALESCE(SUM(jumlah), 0)
        FROM donasi_infaq
        WHERE status = 'Completed'
      ),
      jumlah_donatur = (
        SELECT COUNT(DISTINCT id)
        FROM donasi_infaq
        WHERE status = 'Completed'
      )
    WHERE id IS NOT NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_kampanye_dana
AFTER INSERT OR UPDATE ON donasi_infaq
FOR EACH ROW
EXECUTE FUNCTION update_kampanye_dana();

-- =====================================================
-- 10. RLS POLICIES
-- =====================================================

-- Tagihan Santri
ALTER TABLE tagihan_santri ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tagihan"
ON tagihan_santri FOR SELECT
USING (auth.uid() IN (
  SELECT created_by FROM santri WHERE id = tagihan_santri.santri_id
));

CREATE POLICY "Admin can manage all tagihan"
ON tagihan_santri FOR ALL
USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

-- Donasi Infaq
ALTER TABLE donasi_infaq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create donation"
ON donasi_infaq FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view their own donations"
ON donasi_infaq FOR SELECT
USING (user_id = auth.uid() OR is_anonim = false);

CREATE POLICY "Admin can manage all donations"
ON donasi_infaq FOR ALL
USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

-- Kampanye Donasi
ALTER TABLE kampanye_donasi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active campaigns"
ON kampanye_donasi FOR SELECT
USING (status = 'Active' OR auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

CREATE POLICY "Admin can manage campaigns"
ON kampanye_donasi FOR ALL
USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

-- =====================================================
-- 11. SEED DATA: Default Paket Biaya
-- =====================================================

-- Insert default paket for testing
INSERT INTO paket_biaya_program (nama_paket, deskripsi, total_biaya, periode, kategori_santri, is_default) VALUES
('Paket Santri Binaan Mukim', 'Program beasiswa penuh untuk santri binaan mukim', 0, 'Bulanan', ARRAY['Santri Binaan Mukim'], true),
('Paket Santri Binaan Non-Mukim', 'Program subsidi 50% untuk santri binaan non-mukim', 75000, 'Bulanan', ARRAY['Santri Binaan Non-Mukim'], true),
('Paket Mahasantri A', 'Paket dasar untuk mahasantri reguler', 500000, 'Bulanan', ARRAY['Mahasantri Reguler'], false),
('Paket Mahasantri B', 'Paket standar dengan fasilitas lengkap', 750000, 'Bulanan', ARRAY['Mahasantri Reguler'], true),
('Paket Mahasantri C', 'Paket premium dengan fasilitas VIP', 1000000, 'Bulanan', ARRAY['Mahasantri Reguler'], false);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMENT ON SCHEMA public IS 'Tagihan & Donasi System Migration Complete - 2025-01-10';

