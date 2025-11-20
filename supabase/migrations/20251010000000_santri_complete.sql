-- =====================================================
-- SANTRI MODULE - COMPLETE MIGRATION
-- =====================================================
-- Description: Complete santri system with programs, documents, enhancements
-- Date: 2025-10-10
-- Features: Enhanced santri table, programs, documents, status tracking
-- =====================================================

-- =====================================================
-- 1. PROGRAM SANTRI SYSTEM
-- =====================================================

-- Master programs table
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
  total_tarif_per_bulan DECIMAL DEFAULT 0,
  
  -- Deskripsi & syarat
  deskripsi TEXT,
  syarat_masuk TEXT,
  fasilitas TEXT,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Komponen biaya per program
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

-- =====================================================
-- 2. ENHANCED SANTRI TABLE
-- =====================================================

-- Add new columns to santri table
ALTER TABLE santri 
  ADD COLUMN IF NOT EXISTS kategori VARCHAR(50) CHECK (kategori IN (
    'Santri Binaan Mukim',
    'Santri Binaan Non-Mukim', 
    'Mahasantri Reguler',
    'Mahasantri Beasiswa',
    'Santri TPO'
  )),
  ADD COLUMN IF NOT EXISTS angkatan TEXT,
  ADD COLUMN IF NOT EXISTS status_anak TEXT,
  ADD COLUMN IF NOT EXISTS no_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS foto_profil TEXT,
  ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES program_santri(id),
  ADD COLUMN IF NOT EXISTS status_santri VARCHAR(50) DEFAULT 'Reguler',
  ADD COLUMN IF NOT EXISTS tipe_pembayaran VARCHAR(50) DEFAULT 'Bayar Sendiri' 
    CHECK (tipe_pembayaran IN ('Bayar Sendiri', 'Subsidi Penuh', 'Subsidi Sebagian', 'Beasiswa'));

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_santri_kategori ON santri(kategori);
CREATE INDEX IF NOT EXISTS idx_santri_angkatan ON santri(angkatan);
CREATE INDEX IF NOT EXISTS idx_santri_program ON santri(program_id);
CREATE INDEX IF NOT EXISTS idx_santri_status ON santri(status_santri);
CREATE INDEX IF NOT EXISTS idx_santri_tipe_pembayaran ON santri(tipe_pembayaran);

-- =====================================================
-- 3. DOKUMEN SANTRI SYSTEM
-- =====================================================

-- Dokumen santri table
CREATE TABLE IF NOT EXISTS dokumen_santri (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  
  -- Document info
  nama_dokumen VARCHAR(200) NOT NULL,
  jenis_dokumen VARCHAR(100) NOT NULL CHECK (jenis_dokumen IN (
    'KTP', 'KK', 'Akta Kelahiran', 'Ijazah', 'Transkrip', 
    'Foto', 'Surat Keterangan', 'Dokumen Lainnya'
  )),
  
  -- File info
  nama_file VARCHAR(255) NOT NULL,
  ukuran_file BIGINT,
  tipe_file VARCHAR(100),
  path_file TEXT NOT NULL,
  
  -- Status & verification
  status_verifikasi VARCHAR(50) DEFAULT 'Belum Diverifikasi' 
    CHECK (status_verifikasi IN ('Belum Diverifikasi', 'Diverifikasi', 'Ditolak')),
  tanggal_verifikasi TIMESTAMPTZ,
  verifikasi_oleh UUID REFERENCES auth.users(id),
  catatan_verifikasi TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Dokumen audit log
CREATE TABLE IF NOT EXISTS dokumen_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dokumen_id UUID NOT NULL REFERENCES dokumen_santri(id) ON DELETE CASCADE,
  
  -- Action info
  action VARCHAR(50) NOT NULL CHECK (action IN ('Upload', 'Update', 'Delete', 'Verify', 'Reject')),
  old_status VARCHAR(50),
  new_status VARCHAR(50),
  
  -- User info
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  
  -- Details
  keterangan TEXT,
  ip_address INET,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. STATUS TRACKING SYSTEM
-- =====================================================

-- Riwayat status santri
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

-- Santri programs (many-to-many relationship)
CREATE TABLE IF NOT EXISTS santri_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES program_santri(id) ON DELETE CASCADE,
  
  -- Program specific info
  tanggal_mulai DATE DEFAULT CURRENT_DATE,
  tanggal_selesai DATE,
  status VARCHAR(50) DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Selesai', 'Dikeluarkan')),
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  
  UNIQUE(santri_id, program_id)
);

-- Santri riwayat kelas
CREATE TABLE IF NOT EXISTS santri_riwayat_kelas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  
  -- Kelas info
  kelas_lama VARCHAR(100),
  kelas_baru VARCHAR(100) NOT NULL,
  rombel_lama VARCHAR(100),
  rombel_baru VARCHAR(100),
  
  -- Change info
  tanggal_perubahan DATE DEFAULT CURRENT_DATE,
  alasan_perubahan TEXT,
  
  -- Audit
  diubah_oleh UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. INDEXES
-- =====================================================

-- Program santri indexes
CREATE INDEX IF NOT EXISTS idx_program_santri_kategori ON program_santri(kategori);
CREATE INDEX IF NOT EXISTS idx_program_santri_kode ON program_santri(kode_program);
CREATE INDEX IF NOT EXISTS idx_program_santri_active ON program_santri(is_active);

-- Komponen biaya indexes
CREATE INDEX IF NOT EXISTS idx_komponen_biaya_program ON komponen_biaya_program(program_id);

-- Dokumen santri indexes
CREATE INDEX IF NOT EXISTS idx_dokumen_santri_santri ON dokumen_santri(santri_id);
CREATE INDEX IF NOT EXISTS idx_dokumen_santri_jenis ON dokumen_santri(jenis_dokumen);
CREATE INDEX IF NOT EXISTS idx_dokumen_santri_status ON dokumen_santri(status_verifikasi);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_dokumen_audit_log_dokumen ON dokumen_audit_log(dokumen_id);
CREATE INDEX IF NOT EXISTS idx_dokumen_audit_log_action ON dokumen_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_dokumen_audit_log_tanggal ON dokumen_audit_log(created_at);

-- Status tracking indexes
CREATE INDEX IF NOT EXISTS idx_riwayat_status_santri ON riwayat_status_santri(santri_id);
CREATE INDEX IF NOT EXISTS idx_riwayat_status_tanggal ON riwayat_status_santri(tanggal_perubahan);
CREATE INDEX IF NOT EXISTS idx_santri_programs_santri ON santri_programs(santri_id);
CREATE INDEX IF NOT EXISTS idx_santri_programs_program ON santri_programs(program_id);
CREATE INDEX IF NOT EXISTS idx_santri_riwayat_kelas ON santri_riwayat_kelas(santri_id);

-- =====================================================
-- 6. RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE program_santri ENABLE ROW LEVEL SECURITY;
ALTER TABLE komponen_biaya_program ENABLE ROW LEVEL SECURITY;
ALTER TABLE dokumen_santri ENABLE ROW LEVEL SECURITY;
ALTER TABLE dokumen_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE riwayat_status_santri ENABLE ROW LEVEL SECURITY;
ALTER TABLE santri_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE santri_riwayat_kelas ENABLE ROW LEVEL SECURITY;

-- Program Santri policies
CREATE POLICY "Authenticated users can view program_santri"
  ON program_santri FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage program_santri"
  ON program_santri FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Komponen Biaya policies
CREATE POLICY "Authenticated users can view komponen_biaya_program"
  ON komponen_biaya_program FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage komponen_biaya_program"
  ON komponen_biaya_program FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Dokumen Santri policies
CREATE POLICY "Authenticated users can view dokumen_santri"
  ON dokumen_santri FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage dokumen_santri"
  ON dokumen_santri FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Audit Log policies (read-only for most users)
CREATE POLICY "Authenticated users can view dokumen_audit_log"
  ON dokumen_audit_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert dokumen_audit_log"
  ON dokumen_audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- Status tracking policies
CREATE POLICY "Authenticated users can view riwayat_status_santri"
  ON riwayat_status_santri FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage riwayat_status_santri"
  ON riwayat_status_santri FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view santri_programs"
  ON santri_programs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage santri_programs"
  ON santri_programs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view santri_riwayat_kelas"
  ON santri_riwayat_kelas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage santri_riwayat_kelas"
  ON santri_riwayat_kelas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- 7. TRIGGERS
-- =====================================================

-- Update triggers
CREATE TRIGGER update_program_santri_updated_at
  BEFORE UPDATE ON program_santri
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_komponen_biaya_program_updated_at
  BEFORE UPDATE ON komponen_biaya_program
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dokumen_santri_updated_at
  BEFORE UPDATE ON dokumen_santri
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_santri_programs_updated_at
  BEFORE UPDATE ON santri_programs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

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

-- Function: Update jumlah peserta program
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

-- Function: Log dokumen changes
CREATE OR REPLACE FUNCTION log_dokumen_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO dokumen_audit_log (dokumen_id, action, new_status, user_id, keterangan)
    VALUES (NEW.id, 'Upload', NEW.status_verifikasi, NEW.created_by, 'Dokumen diupload');
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status_verifikasi != NEW.status_verifikasi THEN
      INSERT INTO dokumen_audit_log (dokumen_id, action, old_status, new_status, user_id, keterangan)
      VALUES (NEW.id, 'Verify', OLD.status_verifikasi, NEW.status_verifikasi, NEW.updated_by, 
              CASE 
                WHEN NEW.status_verifikasi = 'Diverifikasi' THEN 'Dokumen diverifikasi'
                WHEN NEW.status_verifikasi = 'Ditolak' THEN 'Dokumen ditolak'
                ELSE 'Status dokumen diubah'
              END);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO dokumen_audit_log (dokumen_id, action, old_status, user_id, keterangan)
    VALUES (OLD.id, 'Delete', OLD.status_verifikasi, OLD.updated_by, 'Dokumen dihapus');
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to dokumen_santri table
DROP TRIGGER IF EXISTS trigger_log_dokumen_changes ON dokumen_santri;
CREATE TRIGGER trigger_log_dokumen_changes
  AFTER INSERT OR UPDATE OR DELETE ON dokumen_santri
  FOR EACH ROW
  EXECUTE FUNCTION log_dokumen_changes();

-- =====================================================
-- 9. DEFAULT DATA
-- =====================================================

-- Insert default programs
INSERT INTO program_santri (nama_program, kode_program, kategori, jenjang, deskripsi, kapasitas_maksimal, total_tarif_per_bulan) VALUES
('Santri Mukim (SD/SMP/SMA)', 'SANTRI-MUKIM', 'Pondok', 'SD-SMA', 'Program santri mukim dengan fasilitas lengkap: asrama, konsumsi 3x, pendidikan formal dan internal', 50, 500000),
('Santri Non-Mukim TPQ', 'TPQ-NON-MUKIM', 'TPQ', 'Umum', 'Program TPQ untuk santri non-mukim dengan SPP bulanan', 100, 100000),
('Mahasantri Mukim', 'MAHASANTRI-MUKIM', 'Mahasiswa', 'Mahasiswa', 'Program untuk mahasiswa yang mondok sambil kuliah', 20, 750000),
('Santri Non-Mukim Madin', 'MADIN-NON-MUKIM', 'Madin', 'Umum', 'Program Madrasah Diniyah untuk santri non-mukim', 50, 150000)
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

-- =====================================================
-- 10. COMMENTS
-- =====================================================
COMMENT ON TABLE program_santri IS 'Master program santri dengan tarif komponen terstruktur';
COMMENT ON TABLE komponen_biaya_program IS 'Komponen biaya per program (pendidikan, asrama, konsumsi, dll)';
COMMENT ON TABLE dokumen_santri IS 'Dokumen santri dengan sistem verifikasi';
COMMENT ON TABLE dokumen_audit_log IS 'Audit trail untuk perubahan dokumen santri';
COMMENT ON TABLE riwayat_status_santri IS 'History perubahan status dan program santri';
COMMENT ON TABLE santri_programs IS 'Relasi many-to-many santri dan program';
COMMENT ON TABLE santri_riwayat_kelas IS 'History perubahan kelas santri';

COMMENT ON COLUMN santri.program_id IS 'Link ke program yang diikuti santri';
COMMENT ON COLUMN santri.status_santri IS 'Status: Reguler, Binaan Mukim, Binaan Non-Mukim, Mahasantri, dll';
COMMENT ON COLUMN santri.tipe_pembayaran IS 'Tipe: Bayar Sendiri, Subsidi Penuh, Subsidi Sebagian, Beasiswa';
COMMENT ON COLUMN santri.kategori IS 'Kategori santri untuk klasifikasi';
COMMENT ON COLUMN santri.angkatan IS 'Angkatan masuk santri';
COMMENT ON COLUMN santri.no_whatsapp IS 'Nomor WhatsApp santri';
COMMENT ON COLUMN santri.foto_profil IS 'Path foto profil santri';

COMMENT ON FUNCTION get_total_tarif_program IS 'Get total tarif bulanan program (sum komponen wajib)';
COMMENT ON FUNCTION update_jumlah_peserta_program IS 'Update jumlah peserta program otomatis';
COMMENT ON FUNCTION log_dokumen_changes IS 'Log semua perubahan dokumen santri';

-- =====================================================
-- SANTRI MODULE COMPLETE
-- =====================================================
