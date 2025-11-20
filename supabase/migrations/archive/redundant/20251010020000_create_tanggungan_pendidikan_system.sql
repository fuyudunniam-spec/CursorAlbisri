-- ================================================
-- SISTEM TANGGUNGAN PENDIDIKAN & PROGRAM INTERNAL
-- ================================================
-- Purpose: Tracking biaya pendidikan formal + program internal (TPQ/Madin)
-- Features: Tanggungan pendidikan, beasiswa eksternal, program internal, gaji guru
-- Created: October 10, 2025
-- ================================================

-- ================================================
-- 1. TABLE: tanggungan_pendidikan_santri
-- ================================================
CREATE TABLE IF NOT EXISTS tanggungan_pendidikan_santri (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  
  -- Jenis & klasifikasi
  jenis_tanggungan VARCHAR(50) NOT NULL, 
  -- 'SPP Bulanan', 'Registrasi', 'Buku', 'Seragam', 'Magang', 'Study Tour', 'Liburan', dll
  
  tipe_biaya VARCHAR(20) NOT NULL CHECK (tipe_biaya IN ('Rutin Bulanan', 'Tahun Ajaran Baru', 'Insidental')),
  
  -- Periode
  periode VARCHAR(50) NOT NULL,
  tahun_ajaran VARCHAR(20),
  bulan INTEGER CHECK (bulan BETWEEN 1 AND 12),
  tahun INTEGER,
  
  -- Detail sekolah
  jenjang VARCHAR(20), -- 'SD', 'SMP', 'SMA', 'Kuliah'
  nama_sekolah VARCHAR(200),
  kelas VARCHAR(50),
  
  -- Finansial
  nominal DECIMAL(15,2) NOT NULL CHECK (nominal >= 0),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'dibayar', 'ditunda', 'cancelled')),
  tanggal_bayar DATE,
  tanggal_jatuh_tempo DATE,
  
  -- Payment method
  metode_pembayaran VARCHAR(50), -- Tunai, Transfer, dll
  akun_kas VARCHAR(100),
  
  -- Links
  keuangan_id UUID REFERENCES keuangan(id), -- Auto-create di keuangan ketika dibayar
  
  -- Metadata
  bukti_pembayaran TEXT,
  catatan TEXT,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 2. TABLE: beasiswa_eksternal (Beasiswa dari sekolah/pihak luar)
-- ================================================
CREATE TABLE IF NOT EXISTS beasiswa_eksternal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  
  nama_program VARCHAR(200) NOT NULL,
  sumber VARCHAR(200) NOT NULL, -- Nama sekolah/lembaga
  jenjang VARCHAR(20), -- 'SD', 'SMP', 'SMA'
  
  -- Periode & nominal
  periode_aktif VARCHAR(20), -- 'Tahunan', 'Semester', 'Bulanan'
  tahun_ajaran VARCHAR(20),
  nominal DECIMAL(15,2) NOT NULL CHECK (nominal >= 0),
  
  -- Status
  status VARCHAR(20) DEFAULT 'aktif' CHECK (status IN ('aktif', 'selesai', 'dicabut')),
  tanggal_mulai DATE,
  tanggal_selesai DATE,
  tanggal_terima DATE, -- Kapan uangnya masuk ke yayasan
  
  -- Link ke keuangan (PEMASUKAN)
  keuangan_id UUID REFERENCES keuangan(id),
  akun_kas VARCHAR(100),
  
  catatan TEXT,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 3. TABLE: program_pendidikan_internal (TPQ, Madin, dll)
-- ================================================
CREATE TABLE IF NOT EXISTS program_pendidikan_internal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_program VARCHAR(200) NOT NULL,
  jenis VARCHAR(50) NOT NULL CHECK (jenis IN ('TPQ', 'Madin', 'Tahfidz', 'Bahasa Arab', 'Bahasa Inggris', 'Lainnya')),
  target_peserta VARCHAR(50), -- 'Mukim', 'Non-Mukim', 'Campuran'
  
  -- Tarif untuk peserta
  tarif_standar DECIMAL(15,2) DEFAULT 0 CHECK (tarif_standar >= 0),
  is_gratis BOOLEAN DEFAULT FALSE,
  
  -- Operational
  jumlah_kelas INTEGER DEFAULT 1,
  jadwal TEXT,
  hari_pertemuan VARCHAR(100), -- 'Senin, Rabu, Jumat' or 'Senin-Jumat'
  
  -- Biaya guru (jika ada)
  biaya_guru_per_pertemuan DECIMAL(15,2) DEFAULT 0 CHECK (biaya_guru_per_pertemuan >= 0),
  
  -- Status
  status VARCHAR(20) DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif', 'selesai')),
  kapasitas_maksimal INTEGER,
  jumlah_peserta_saat_ini INTEGER DEFAULT 0,
  
  deskripsi TEXT,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 4. TABLE: peserta_program_internal
-- ================================================
CREATE TABLE IF NOT EXISTS peserta_program_internal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES program_pendidikan_internal(id) ON DELETE CASCADE,
  
  -- Peserta bisa santri atau non-santri
  santri_id UUID REFERENCES santri(id) ON DELETE CASCADE,
  nama_peserta VARCHAR(200), -- Filled jika non-santri
  nomor_telepon VARCHAR(20),
  alamat TEXT,
  
  -- Tarif (bisa custom per peserta)
  tarif_per_bulan DECIMAL(15,2) DEFAULT 0 CHECK (tarif_per_bulan >= 0),
  is_gratis BOOLEAN DEFAULT FALSE,
  
  -- Status
  status VARCHAR(20) DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif', 'lulus', 'keluar')),
  tanggal_masuk DATE DEFAULT CURRENT_DATE,
  tanggal_keluar DATE,
  
  catatan TEXT,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 5. TABLE: pembayaran_program_internal
-- ================================================
CREATE TABLE IF NOT EXISTS pembayaran_program_internal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  peserta_id UUID NOT NULL REFERENCES peserta_program_internal(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES program_pendidikan_internal(id),
  
  periode VARCHAR(50) NOT NULL,
  bulan INTEGER CHECK (bulan BETWEEN 1 AND 12),
  tahun INTEGER NOT NULL,
  
  jumlah_tagihan DECIMAL(15,2) NOT NULL CHECK (jumlah_tagihan >= 0),
  jumlah_bayar DECIMAL(15,2) DEFAULT 0 CHECK (jumlah_bayar >= 0),
  sisa_tagihan DECIMAL(15,2) GENERATED ALWAYS AS (jumlah_tagihan - jumlah_bayar) STORED,
  
  status VARCHAR(20) DEFAULT 'belum_bayar' CHECK (status IN ('belum_bayar', 'lunas', 'sebagian')),
  tanggal_bayar DATE,
  tanggal_jatuh_tempo DATE,
  
  -- Link ke keuangan (PEMASUKAN)
  keuangan_id UUID REFERENCES keuangan(id),
  akun_kas VARCHAR(100),
  
  metode_bayar VARCHAR(50),
  catatan TEXT,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 6. TABLE: pengeluaran_guru_internal
-- ================================================
CREATE TABLE IF NOT EXISTS pengeluaran_guru_internal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES program_pendidikan_internal(id),
  
  nama_guru VARCHAR(200) NOT NULL,
  guru_id UUID, -- Jika punya tabel guru/staff (soft reference)
  
  bulan INTEGER NOT NULL CHECK (bulan BETWEEN 1 AND 12),
  tahun INTEGER NOT NULL,
  periode VARCHAR(50),
  
  jumlah_pertemuan INTEGER NOT NULL CHECK (jumlah_pertemuan >= 0),
  biaya_per_pertemuan DECIMAL(15,2) NOT NULL CHECK (biaya_per_pertemuan >= 0),
  total_bayar DECIMAL(15,2) GENERATED ALWAYS AS (jumlah_pertemuan * biaya_per_pertemuan) STORED,
  
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'dibayar', 'ditunda')),
  tanggal_bayar DATE,
  
  -- Link ke keuangan (PENGELUARAN)
  keuangan_id UUID REFERENCES keuangan(id),
  akun_kas VARCHAR(100),
  
  catatan TEXT,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 7. INDEXES
-- ================================================
-- Tanggungan Pendidikan
CREATE INDEX idx_tanggungan_pendidikan_santri ON tanggungan_pendidikan_santri(santri_id);
CREATE INDEX idx_tanggungan_pendidikan_status ON tanggungan_pendidikan_santri(status);
CREATE INDEX idx_tanggungan_pendidikan_periode ON tanggungan_pendidikan_santri(periode);
CREATE INDEX idx_tanggungan_pendidikan_tipe ON tanggungan_pendidikan_santri(tipe_biaya);
CREATE INDEX idx_tanggungan_pendidikan_jenjang ON tanggungan_pendidikan_santri(jenjang);

-- Beasiswa Eksternal
CREATE INDEX idx_beasiswa_eksternal_santri ON beasiswa_eksternal(santri_id);
CREATE INDEX idx_beasiswa_eksternal_status ON beasiswa_eksternal(status);

-- Program Internal
CREATE INDEX idx_program_internal_jenis ON program_pendidikan_internal(jenis);
CREATE INDEX idx_program_internal_status ON program_pendidikan_internal(status);

CREATE INDEX idx_peserta_program_internal ON peserta_program_internal(program_id);
CREATE INDEX idx_peserta_program_santri ON peserta_program_internal(santri_id);
CREATE INDEX idx_peserta_program_status ON peserta_program_internal(status);

CREATE INDEX idx_pembayaran_program_internal ON pembayaran_program_internal(peserta_id);
CREATE INDEX idx_pembayaran_program_periode ON pembayaran_program_internal(periode);
CREATE INDEX idx_pembayaran_program_status ON pembayaran_program_internal(status);

CREATE INDEX idx_pengeluaran_guru_program ON pengeluaran_guru_internal(program_id);
CREATE INDEX idx_pengeluaran_guru_periode ON pengeluaran_guru_internal(bulan, tahun);
CREATE INDEX idx_pengeluaran_guru_status ON pengeluaran_guru_internal(status);

-- ================================================
-- 8. RLS POLICIES
-- ================================================
ALTER TABLE tanggungan_pendidikan_santri ENABLE ROW LEVEL SECURITY;
ALTER TABLE beasiswa_eksternal ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_pendidikan_internal ENABLE ROW LEVEL SECURITY;
ALTER TABLE peserta_program_internal ENABLE ROW LEVEL SECURITY;
ALTER TABLE pembayaran_program_internal ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengeluaran_guru_internal ENABLE ROW LEVEL SECURITY;

-- Tanggungan Pendidikan
CREATE POLICY "Authenticated users can view tanggungan_pendidikan_santri"
  ON tanggungan_pendidikan_santri FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage tanggungan_pendidikan_santri"
  ON tanggungan_pendidikan_santri FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Beasiswa Eksternal
CREATE POLICY "Authenticated users can view beasiswa_eksternal"
  ON beasiswa_eksternal FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage beasiswa_eksternal"
  ON beasiswa_eksternal FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Program Internal
CREATE POLICY "Authenticated users can view program_pendidikan_internal"
  ON program_pendidikan_internal FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage program_pendidikan_internal"
  ON program_pendidikan_internal FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view peserta_program_internal"
  ON peserta_program_internal FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage peserta_program_internal"
  ON peserta_program_internal FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view pembayaran_program_internal"
  ON pembayaran_program_internal FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage pembayaran_program_internal"
  ON pembayaran_program_internal FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view pengeluaran_guru_internal"
  ON pengeluaran_guru_internal FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage pengeluaran_guru_internal"
  ON pengeluaran_guru_internal FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ================================================
-- 9. TRIGGERS
-- ================================================
CREATE TRIGGER update_tanggungan_pendidikan_updated_at
  BEFORE UPDATE ON tanggungan_pendidikan_santri
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_beasiswa_eksternal_updated_at
  BEFORE UPDATE ON beasiswa_eksternal
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_program_pendidikan_internal_updated_at
  BEFORE UPDATE ON program_pendidikan_internal
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_peserta_program_internal_updated_at
  BEFORE UPDATE ON peserta_program_internal
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pembayaran_program_internal_updated_at
  BEFORE UPDATE ON pembayaran_program_internal
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pengeluaran_guru_internal_updated_at
  BEFORE UPDATE ON pengeluaran_guru_internal
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- 10. HELPER FUNCTIONS
-- ================================================

-- Function: Bayar tanggungan pendidikan (create entry di keuangan)
CREATE OR REPLACE FUNCTION bayar_tanggungan_pendidikan(
  p_tanggungan_id UUID,
  p_tanggal_bayar DATE,
  p_metode_pembayaran VARCHAR,
  p_akun_kas VARCHAR DEFAULT 'Kas Utama',
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_tanggungan RECORD;
  v_santri RECORD;
  v_keuangan_id UUID;
  v_result JSON;
BEGIN
  -- Get tanggungan
  SELECT * INTO v_tanggungan FROM tanggungan_pendidikan_santri WHERE id = p_tanggungan_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', FALSE, 'message', 'Tanggungan tidak ditemukan');
  END IF;
  
  IF v_tanggungan.status = 'dibayar' THEN
    RETURN json_build_object('success', FALSE, 'message', 'Tanggungan sudah dibayar');
  END IF;
  
  -- Get santri
  SELECT * INTO v_santri FROM santri WHERE id = v_tanggungan.santri_id;
  
  -- Create entry in keuangan (PENGELUARAN)
  INSERT INTO keuangan (
    jenis_transaksi,
    kategori,
    sub_kategori,
    jumlah,
    tanggal,
    deskripsi,
    penerima_pembayar,
    referensi,
    metode_pembayaran,
    akun_kas,
    status,
    created_by
  ) VALUES (
    'Pengeluaran',
    'Subsidi Pendidikan Santri',
    v_tanggungan.jenis_tanggungan,
    v_tanggungan.nominal,
    p_tanggal_bayar,
    v_tanggungan.jenis_tanggungan || ' - ' || v_santri.nama_lengkap || ' - ' || COALESCE(v_tanggungan.nama_sekolah, v_tanggungan.jenjang) || ' - ' || v_tanggungan.periode,
    COALESCE(v_tanggungan.nama_sekolah, 'Sekolah ' || v_santri.nama_lengkap),
    'tanggungan_pendidikan:' || p_tanggungan_id,
    p_metode_pembayaran,
    p_akun_kas,
    'posted',
    p_user_id
  )
  RETURNING id INTO v_keuangan_id;
  
  -- Update tanggungan
  UPDATE tanggungan_pendidikan_santri
  SET 
    status = 'dibayar',
    tanggal_bayar = p_tanggal_bayar,
    metode_pembayaran = p_metode_pembayaran,
    akun_kas = p_akun_kas,
    keuangan_id = v_keuangan_id,
    updated_at = NOW()
  WHERE id = p_tanggungan_id;
  
  v_result := json_build_object(
    'success', TRUE,
    'tanggungan_id', p_tanggungan_id,
    'keuangan_id', v_keuangan_id,
    'nominal', v_tanggungan.nominal,
    'santri', v_santri.nama_lengkap
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Catat pembayaran program internal (create entry di keuangan as PEMASUKAN)
CREATE OR REPLACE FUNCTION catat_pembayaran_program_internal(
  p_pembayaran_id UUID,
  p_tanggal_bayar DATE,
  p_jumlah_bayar DECIMAL,
  p_metode VARCHAR,
  p_akun_kas VARCHAR DEFAULT 'Kas Utama',
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_pembayaran RECORD;
  v_peserta RECORD;
  v_program RECORD;
  v_keuangan_id UUID;
  v_result JSON;
BEGIN
  -- Get pembayaran
  SELECT * INTO v_pembayaran FROM pembayaran_program_internal WHERE id = p_pembayaran_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', FALSE, 'message', 'Pembayaran tidak ditemukan');
  END IF;
  
  -- Get peserta & program
  SELECT * INTO v_peserta FROM peserta_program_internal WHERE id = v_pembayaran.peserta_id;
  SELECT * INTO v_program FROM program_pendidikan_internal WHERE id = v_pembayaran.program_id;
  
  -- Create entry in keuangan (PEMASUKAN)
  INSERT INTO keuangan (
    jenis_transaksi,
    kategori,
    sub_kategori,
    jumlah,
    tanggal,
    deskripsi,
    penerima_pembayar,
    referensi,
    metode_pembayaran,
    akun_kas,
    status,
    created_by
  ) VALUES (
    'Pemasukan',
    'SPP Program Internal',
    v_program.jenis,
    p_jumlah_bayar,
    p_tanggal_bayar,
    'Pembayaran ' || v_program.nama_program || ' - ' || COALESCE(v_peserta.nama_peserta, 'Santri') || ' - ' || v_pembayaran.periode,
    COALESCE(v_peserta.nama_peserta, 'Santri'),
    'pembayaran_program_internal:' || p_pembayaran_id,
    p_metode,
    p_akun_kas,
    'posted',
    p_user_id
  )
  RETURNING id INTO v_keuangan_id;
  
  -- Update pembayaran
  UPDATE pembayaran_program_internal
  SET 
    jumlah_bayar = jumlah_bayar + p_jumlah_bayar,
    status = CASE 
      WHEN (jumlah_bayar + p_jumlah_bayar) >= jumlah_tagihan THEN 'lunas'
      WHEN (jumlah_bayar + p_jumlah_bayar) > 0 THEN 'sebagian'
      ELSE 'belum_bayar'
    END,
    tanggal_bayar = CASE WHEN keuangan_id IS NULL THEN p_tanggal_bayar ELSE tanggal_bayar END,
    keuangan_id = CASE WHEN keuangan_id IS NULL THEN v_keuangan_id ELSE keuangan_id END,
    akun_kas = p_akun_kas,
    metode_bayar = p_metode,
    updated_at = NOW()
  WHERE id = p_pembayaran_id;
  
  v_result := json_build_object(
    'success', TRUE,
    'pembayaran_id', p_pembayaran_id,
    'keuangan_id', v_keuangan_id,
    'jumlah_bayar', p_jumlah_bayar,
    'peserta', COALESCE(v_peserta.nama_peserta, 'Santri'),
    'program', v_program.nama_program
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Bayar gaji guru internal (create entry di keuangan as PENGELUARAN)
CREATE OR REPLACE FUNCTION bayar_gaji_guru_internal(
  p_pengeluaran_id UUID,
  p_tanggal_bayar DATE,
  p_akun_kas VARCHAR DEFAULT 'Kas Utama',
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_pengeluaran RECORD;
  v_program RECORD;
  v_keuangan_id UUID;
  v_result JSON;
BEGIN
  -- Get pengeluaran
  SELECT * INTO v_pengeluaran FROM pengeluaran_guru_internal WHERE id = p_pengeluaran_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', FALSE, 'message', 'Pengeluaran tidak ditemukan');
  END IF;
  
  IF v_pengeluaran.status = 'dibayar' THEN
    RETURN json_build_object('success', FALSE, 'message', 'Gaji sudah dibayar');
  END IF;
  
  -- Get program
  SELECT * INTO v_program FROM program_pendidikan_internal WHERE id = v_pengeluaran.program_id;
  
  -- Create entry in keuangan (PENGELUARAN)
  INSERT INTO keuangan (
    jenis_transaksi,
    kategori,
    sub_kategori,
    jumlah,
    tanggal,
    deskripsi,
    penerima_pembayar,
    referensi,
    akun_kas,
    status,
    created_by
  ) VALUES (
    'Pengeluaran',
    'Gaji Guru Internal',
    v_program.jenis,
    v_pengeluaran.total_bayar,
    p_tanggal_bayar,
    'Gaji ' || v_pengeluaran.nama_guru || ' - ' || v_program.nama_program || ' - ' || v_pengeluaran.periode || ' (' || v_pengeluaran.jumlah_pertemuan || ' pertemuan)',
    v_pengeluaran.nama_guru,
    'gaji_guru_internal:' || p_pengeluaran_id,
    p_akun_kas,
    'posted',
    p_user_id
  )
  RETURNING id INTO v_keuangan_id;
  
  -- Update pengeluaran
  UPDATE pengeluaran_guru_internal
  SET 
    status = 'dibayar',
    tanggal_bayar = p_tanggal_bayar,
    keuangan_id = v_keuangan_id,
    akun_kas = p_akun_kas,
    updated_at = NOW()
  WHERE id = p_pengeluaran_id;
  
  v_result := json_build_object(
    'success', TRUE,
    'pengeluaran_id', p_pengeluaran_id,
    'keuangan_id', v_keuangan_id,
    'nominal', v_pengeluaran.total_bayar,
    'guru', v_pengeluaran.nama_guru,
    'program', v_program.nama_program
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 11. DEFAULT DATA
-- ================================================

-- Insert default program pendidikan internal
INSERT INTO program_pendidikan_internal (nama_program, jenis, target_peserta, tarif_standar, hari_pertemuan, biaya_guru_per_pertemuan, jumlah_kelas) VALUES
('TPQ Sore Non-Mukim', 'TPQ', 'Non-Mukim', 25000, 'Senin-Jumat', 0, 1),
('Madrasah Diniyah', 'Madin', 'Campuran', 0, 'Senin, Selasa, Rabu', 50000, 4),
('TPQ Mukim', 'TPQ', 'Mukim', 0, 'Senin-Jumat', 0, 1)
ON CONFLICT DO NOTHING;

-- ================================================
-- 12. COMMENTS
-- ================================================
COMMENT ON TABLE tanggungan_pendidikan_santri IS 'Biaya pendidikan formal yang ditanggung yayasan (SPP, buku, dll)';
COMMENT ON TABLE beasiswa_eksternal IS 'Beasiswa yang diterima santri dari sekolah/pihak luar (PEMASUKAN)';
COMMENT ON TABLE program_pendidikan_internal IS 'Program pendidikan internal pesantren (TPQ, Madin, dll)';
COMMENT ON TABLE peserta_program_internal IS 'Peserta program internal (bisa santri atau non-santri)';
COMMENT ON TABLE pembayaran_program_internal IS 'Pembayaran SPP program internal (PEMASUKAN)';
COMMENT ON TABLE pengeluaran_guru_internal IS 'Gaji guru program internal (PENGELUARAN)';

COMMENT ON FUNCTION bayar_tanggungan_pendidikan IS 'Bayar tanggungan pendidikan dan auto-create entry di keuangan';
COMMENT ON FUNCTION catat_pembayaran_program_internal IS 'Catat pembayaran program internal dan auto-create entry di keuangan as PEMASUKAN';
COMMENT ON FUNCTION bayar_gaji_guru_internal IS 'Bayar gaji guru internal dan auto-create entry di keuangan as PENGELUARAN';

