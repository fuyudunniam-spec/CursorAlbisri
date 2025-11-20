-- ================================================
-- PROGRAM SANTRI & TARIF SYSTEM
-- ================================================
-- Purpose: Sistem program santri dengan tarif komponen terstruktur
-- Features: Program master, tarif per komponen, flexible pricing
-- Created: October 10, 2025
-- ================================================

-- ================================================
-- 1. TABLE: program_santri (Master programs)
-- ================================================
CREATE TABLE IF NOT EXISTS program_santri (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_program VARCHAR(200) NOT NULL,
  kode_program VARCHAR(50) UNIQUE NOT NULL,
  
  -- Kategori & tingkat
  kategori VARCHAR(50) NOT NULL CHECK (kategori IN ('Pondok', 'TPQ', 'Madin', 'Mahasiswa', 'Umum')),
  tingkat VARCHAR(50), -- 'Dasar', 'Menengah', 'Tinggi'
  jenjang VARCHAR(50), -- 'SD', 'SMP', 'SMA', 'Mahasiswa', 'Umum'
  
  -- Status & kapasitas
  is_active BOOLEAN DEFAULT TRUE,
  kapasitas_maksimal INTEGER,
  jumlah_peserta_saat_ini INTEGER DEFAULT 0,
  
  -- Deskripsi & syarat
  deskripsi TEXT,
  syarat_masuk TEXT,
  fasilitas TEXT,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 2. TABLE: komponen_biaya_program (Komponen biaya per program)
-- ================================================
CREATE TABLE IF NOT EXISTS komponen_biaya_program (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES program_santri(id) ON DELETE CASCADE,
  
  -- Komponen
  nama_komponen VARCHAR(100) NOT NULL, -- 'Pendidikan Formal', 'Asrama', 'Konsumsi', dll
  kode_komponen VARCHAR(50) NOT NULL,
  
  -- Tarif
  tarif_per_bulan DECIMAL(15,2) NOT NULL CHECK (tarif_per_bulan >= 0),
  is_wajib BOOLEAN DEFAULT TRUE, -- Apakah komponen ini wajib atau opsional
  
  -- Kategori untuk keuangan
  kategori_keuangan VARCHAR(100), -- Link ke kategori di keuangan
  
  deskripsi TEXT,
  urutan INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(program_id, kode_komponen)
);

-- ================================================
-- 3. ENHANCE santri TABLE (Add program & status fields)
-- ================================================
ALTER TABLE santri 
  ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES program_santri(id),
  ADD COLUMN IF NOT EXISTS status_santri VARCHAR(50) DEFAULT 'Reguler',
  ADD COLUMN IF NOT EXISTS tipe_pembayaran VARCHAR(50) DEFAULT 'Bayar Sendiri' 
    CHECK (tipe_pembayaran IN ('Bayar Sendiri', 'Subsidi Penuh', 'Subsidi Sebagian', 'Beasiswa'));

-- Add index
CREATE INDEX IF NOT EXISTS idx_santri_program ON santri(program_id);
CREATE INDEX IF NOT EXISTS idx_santri_status ON santri(status_santri);

-- ================================================
-- 4. TABLE: riwayat_status_santri (History of status changes)
-- ================================================
CREATE TABLE IF NOT EXISTS riwayat_status_santri (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  
  -- Status changes
  program_lama_id UUID REFERENCES program_santri(id),
  program_baru_id UUID REFERENCES program_santri(id),
  
  status_lama VARCHAR(50),
  status_baru VARCHAR(50) NOT NULL,
  
  tipe_pembayaran_lama VARCHAR(50),
  tipe_pembayaran_baru VARCHAR(50) NOT NULL,
  
  -- Change info
  tanggal_perubahan DATE DEFAULT CURRENT_DATE,
  alasan_perubahan TEXT NOT NULL,
  keputusan_nomor VARCHAR(100), -- Nomor SK/surat keputusan
  
  -- Audit
  diubah_oleh UUID REFERENCES auth.users(id),
  catatan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_riwayat_status_santri ON riwayat_status_santri(santri_id);
CREATE INDEX idx_riwayat_status_tanggal ON riwayat_status_santri(tanggal_perubahan);

-- ================================================
-- 5. INDEXES
-- ================================================
CREATE INDEX idx_program_santri_kategori ON program_santri(kategori);
CREATE INDEX idx_program_santri_kode ON program_santri(kode_program);
CREATE INDEX idx_program_santri_active ON program_santri(is_active);

CREATE INDEX idx_komponen_biaya_program ON komponen_biaya_program(program_id);

-- ================================================
-- 6. RLS POLICIES
-- ================================================
ALTER TABLE program_santri ENABLE ROW LEVEL SECURITY;
ALTER TABLE komponen_biaya_program ENABLE ROW LEVEL SECURITY;
ALTER TABLE riwayat_status_santri ENABLE ROW LEVEL SECURITY;

-- Program Santri
CREATE POLICY "Authenticated users can view program_santri"
  ON program_santri FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage program_santri"
  ON program_santri FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Komponen Biaya
CREATE POLICY "Authenticated users can view komponen_biaya_program"
  ON komponen_biaya_program FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage komponen_biaya_program"
  ON komponen_biaya_program FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Riwayat Status
CREATE POLICY "Authenticated users can view riwayat_status_santri"
  ON riwayat_status_santri FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage riwayat_status_santri"
  ON riwayat_status_santri FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ================================================
-- 7. TRIGGERS
-- ================================================
CREATE TRIGGER update_program_santri_updated_at
  BEFORE UPDATE ON program_santri
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_komponen_biaya_program_updated_at
  BEFORE UPDATE ON komponen_biaya_program
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- 8. HELPER FUNCTIONS
-- ================================================

-- Function: Get total tarif program
CREATE OR REPLACE FUNCTION get_total_tarif_program(p_program_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_total DECIMAL;
BEGIN
  SELECT COALESCE(SUM(tarif_per_bulan), 0)
  INTO v_total
  FROM komponen_biaya_program
  WHERE program_id = p_program_id AND is_wajib = TRUE;
  
  RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update jumlah peserta program (trigger)
CREATE OR REPLACE FUNCTION update_jumlah_peserta_program()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.program_id IS NOT NULL THEN
    UPDATE program_santri 
    SET jumlah_peserta_saat_ini = jumlah_peserta_saat_ini + 1
    WHERE id = NEW.program_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.program_id IS NOT NULL AND NEW.program_id != OLD.program_id THEN
      -- Kurangi dari program lama
      UPDATE program_santri 
      SET jumlah_peserta_saat_ini = GREATEST(0, jumlah_peserta_saat_ini - 1)
      WHERE id = OLD.program_id;
    END IF;
    IF NEW.program_id IS NOT NULL AND NEW.program_id != OLD.program_id THEN
      -- Tambah ke program baru
      UPDATE program_santri 
      SET jumlah_peserta_saat_ini = jumlah_peserta_saat_ini + 1
      WHERE id = NEW.program_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.program_id IS NOT NULL THEN
    UPDATE program_santri 
    SET jumlah_peserta_saat_ini = GREATEST(0, jumlah_peserta_saat_ini - 1)
    WHERE id = OLD.program_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to santri table
DROP TRIGGER IF EXISTS trigger_update_jumlah_peserta ON santri;
CREATE TRIGGER trigger_update_jumlah_peserta
  AFTER INSERT OR UPDATE OR DELETE ON santri
  FOR EACH ROW
  EXECUTE FUNCTION update_jumlah_peserta_program();

-- ================================================
-- 9. DEFAULT DATA
-- ================================================

-- Insert default programs
INSERT INTO program_santri (nama_program, kode_program, kategori, jenjang, deskripsi, kapasitas_maksimal) VALUES
('Santri Mukim (SD/SMP/SMA)', 'SANTRI-MUKIM', 'Pondok', 'SD-SMA', 'Program santri mukim dengan fasilitas lengkap: asrama, konsumsi 3x, pendidikan formal dan internal', 50),
('Santri Non-Mukim TPQ', 'TPQ-NON-MUKIM', 'TPQ', 'Umum', 'Program TPQ untuk santri non-mukim dengan SPP bulanan', 100),
('Mahasantri Mukim', 'MAHASANTRI-MUKIM', 'Mahasiswa', 'Mahasiswa', 'Program untuk mahasiswa yang mondok sambil kuliah', 20),
('Santri Non-Mukim Madin', 'MADIN-NON-MUKIM', 'Madin', 'Umum', 'Program Madrasah Diniyah untuk santri non-mukim', 50)
ON CONFLICT (kode_program) DO NOTHING;

-- Get program IDs for komponen setup
DO $$
DECLARE
  v_santri_mukim_id UUID;
  v_tpq_id UUID;
  v_mahasantri_id UUID;
  v_madin_id UUID;
BEGIN
  -- Get program IDs
  SELECT id INTO v_santri_mukim_id FROM program_santri WHERE kode_program = 'SANTRI-MUKIM';
  SELECT id INTO v_tpq_id FROM program_santri WHERE kode_program = 'TPQ-NON-MUKIM';
  SELECT id INTO v_mahasantri_id FROM program_santri WHERE kode_program = 'MAHASANTRI-MUKIM';
  SELECT id INTO v_madin_id FROM program_santri WHERE kode_program = 'MADIN-NON-MUKIM';
  
  -- Komponen untuk Santri Mukim
  IF v_santri_mukim_id IS NOT NULL THEN
    INSERT INTO komponen_biaya_program (program_id, nama_komponen, kode_komponen, tarif_per_bulan, is_wajib, urutan) VALUES
    (v_santri_mukim_id, 'Pendidikan Formal', 'PENDIDIKAN_FORMAL', 500000, TRUE, 1),
    (v_santri_mukim_id, 'Asrama & Konsumsi', 'ASRAMA_KONSUMSI', 800000, TRUE, 2),
    (v_santri_mukim_id, 'Pendidikan Internal (TPQ/Madin)', 'PENDIDIKAN_INTERNAL', 100000, TRUE, 3),
    (v_santri_mukim_id, 'Laundry & Lain-lain', 'LAINNYA', 100000, FALSE, 4)
    ON CONFLICT (program_id, kode_komponen) DO NOTHING;
  END IF;
  
  -- Komponen untuk TPQ Non-Mukim
  IF v_tpq_id IS NOT NULL THEN
    INSERT INTO komponen_biaya_program (program_id, nama_komponen, kode_komponen, tarif_per_bulan, is_wajib, urutan) VALUES
    (v_tpq_id, 'SPP TPQ', 'SPP_TPQ', 25000, TRUE, 1)
    ON CONFLICT (program_id, kode_komponen) DO NOTHING;
  END IF;
  
  -- Komponen untuk Mahasantri Mukim
  IF v_mahasantri_id IS NOT NULL THEN
    INSERT INTO komponen_biaya_program (program_id, nama_komponen, kode_komponen, tarif_per_bulan, is_wajib, urutan) VALUES
    (v_mahasantri_id, 'Pendidikan (Kuliah)', 'PENDIDIKAN_KULIAH', 1000000, TRUE, 1),
    (v_mahasantri_id, 'Asrama', 'ASRAMA', 500000, TRUE, 2),
    (v_mahasantri_id, 'Konsumsi', 'KONSUMSI', 600000, TRUE, 3),
    (v_mahasantri_id, 'Pendidikan Internal', 'PENDIDIKAN_INTERNAL', 150000, TRUE, 4),
    (v_mahasantri_id, 'Fasilitas', 'FASILITAS', 150000, FALSE, 5),
    (v_mahasantri_id, 'Laundry & Lain-lain', 'LAINNYA', 100000, FALSE, 6)
    ON CONFLICT (program_id, kode_komponen) DO NOTHING;
  END IF;
  
  -- Komponen untuk Madin Non-Mukim
  IF v_madin_id IS NOT NULL THEN
    INSERT INTO komponen_biaya_program (program_id, nama_komponen, kode_komponen, tarif_per_bulan, is_wajib, urutan) VALUES
    (v_madin_id, 'SPP Madin', 'SPP_MADIN', 50000, TRUE, 1)
    ON CONFLICT (program_id, kode_komponen) DO NOTHING;
  END IF;
END $$;

-- ================================================
-- 10. COMMENTS
-- ================================================
COMMENT ON TABLE program_santri IS 'Master program santri dengan tarif komponen terstruktur';
COMMENT ON TABLE komponen_biaya_program IS 'Komponen biaya per program (pendidikan, asrama, konsumsi, dll)';
COMMENT ON TABLE riwayat_status_santri IS 'History perubahan status dan program santri';

COMMENT ON COLUMN santri.program_id IS 'Link ke program yang diikuti santri';
COMMENT ON COLUMN santri.status_santri IS 'Status: Reguler, Binaan Mukim, Binaan Non-Mukim, Mahasantri, dll';
COMMENT ON COLUMN santri.tipe_pembayaran IS 'Tipe: Bayar Sendiri, Subsidi Penuh, Subsidi Sebagian, Beasiswa';

COMMENT ON FUNCTION get_total_tarif_program IS 'Get total tarif bulanan program (sum komponen wajib)';

