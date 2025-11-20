-- ================================================
-- SISTEM PENGAJUAN BEASISWA SANTRI
-- ================================================
-- Purpose: Sistem pengajuan beasiswa dengan workflow verifikasi & approval
-- Features: Pengajuan, verifikasi, approval, evaluasi berkala
-- Created: October 10, 2025
-- ================================================

-- ================================================
-- 1. TABLE: pengajuan_beasiswa_santri
-- ================================================
CREATE TABLE IF NOT EXISTS pengajuan_beasiswa_santri (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  
  -- Jenis beasiswa yang diajukan
  jenis_beasiswa VARCHAR(50) NOT NULL CHECK (jenis_beasiswa IN ('Yatim', 'Dhuafa', 'Prestasi Akademik', 'Prestasi Non-Akademik', 'Anak Guru/Karyawan', 'Kombinasi')),
  kombinasi_jenis TEXT[], -- Jika kombinasi, misal ['Yatim', 'Dhuafa']
  
  -- Persentase yang diajukan
  persentase_beasiswa INTEGER NOT NULL CHECK (persentase_beasiswa BETWEEN 0 AND 100),
  
  -- Komponen yang di-cover beasiswa (JSONB untuk flexibility)
  komponen_beasiswa JSONB, 
  -- Format: [{"kode": "PENDIDIKAN_FORMAL", "nama": "Pendidikan Formal", "tarif": 500000, "persentase": 75, "subsidi": 375000}, ...]
  
  nominal_per_bulan DECIMAL(15,2) NOT NULL CHECK (nominal_per_bulan >= 0),
  
  -- Pengajuan
  tanggal_pengajuan DATE DEFAULT CURRENT_DATE,
  periode_mulai DATE NOT NULL,
  periode_selesai DATE, -- NULL = permanen
  is_permanen BOOLEAN DEFAULT FALSE,
  
  -- Alasan & dokumen pendukung
  alasan_pengajuan TEXT NOT NULL,
  kondisi_ekonomi_keluarga TEXT,
  prestasi_santri TEXT,
  
  -- Kondisi keluarga
  pekerjaan_ayah VARCHAR(200),
  pekerjaan_ibu VARCHAR(200),
  penghasilan_bulanan DECIMAL(15,2),
  jumlah_tanggungan INTEGER,
  kondisi_rumah VARCHAR(100),
  
  -- Dokumen pendukung (array of file URLs)
  dokumen_ktp_ortu TEXT[],
  dokumen_kk TEXT[],
  dokumen_sktm TEXT[], -- Surat Keterangan Tidak Mampu
  dokumen_slip_gaji TEXT[],
  dokumen_kematian_ortu TEXT[],
  dokumen_prestasi TEXT[],
  dokumen_lainnya TEXT[],
  
  -- Workflow status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'diverifikasi', 'disetujui', 'ditolak', 'dicabut')),
  
  -- Verifikasi (Level 1)
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  hasil_verifikasi VARCHAR(50), -- 'Dokumen Valid', 'Sangat Membutuhkan', dll
  rekomendasi_verifikator VARCHAR(50), -- 'Disetujui', 'Disetujui dengan Penyesuaian', 'Ditolak'
  persentase_rekomendasi INTEGER,
  catatan_verifikasi TEXT,
  
  -- Approval (Level 2 - Pimpinan)
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  persentase_approved INTEGER, -- Persentase final yang disetujui (bisa beda dari pengajuan)
  nominal_approved DECIMAL(15,2), -- Nominal final
  komponen_approved JSONB, -- Komponen final yang disetujui
  nomor_sk VARCHAR(100), -- Nomor SK Beasiswa
  file_sk TEXT, -- Upload SK
  syarat_pertahankan TEXT, -- Syarat agar beasiswa tetap jalan
  catatan_approval TEXT,
  
  -- Rejection
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id),
  alasan_penolakan TEXT,
  
  -- Pencabutan
  dicabut_at TIMESTAMPTZ,
  dicabut_by UUID REFERENCES auth.users(id),
  alasan_pencabutan TEXT,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 2. TABLE: beasiswa_aktif_santri
-- ================================================
CREATE TABLE IF NOT EXISTS beasiswa_aktif_santri (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  pengajuan_id UUID NOT NULL REFERENCES pengajuan_beasiswa_santri(id),
  
  -- Detail beasiswa (from approved pengajuan)
  jenis_beasiswa VARCHAR(50) NOT NULL,
  persentase_beasiswa INTEGER NOT NULL CHECK (persentase_beasiswa BETWEEN 0 AND 100),
  
  -- Breakdown komponen & nominal
  komponen_beasiswa JSONB NOT NULL, -- Detail komponen yang di-cover
  nominal_per_bulan DECIMAL(15,2) NOT NULL CHECK (nominal_per_bulan >= 0),
  
  -- Periode aktif
  tanggal_mulai DATE NOT NULL,
  tanggal_selesai DATE,
  status VARCHAR(20) DEFAULT 'aktif' CHECK (status IN ('aktif', 'suspend', 'selesai', 'dicabut')),
  
  -- SK & Legal
  nomor_sk VARCHAR(100),
  file_sk TEXT,
  
  -- Syarat & monitoring
  syarat_pertahankan TEXT,
  periode_evaluasi VARCHAR(50) DEFAULT 'Semester', -- 'Semester', 'Tahunan'
  tanggal_evaluasi_terakhir DATE,
  tanggal_evaluasi_berikutnya DATE,
  
  -- Tracking pencairan
  total_sudah_diterima DECIMAL(15,2) DEFAULT 0 CHECK (total_sudah_diterima >= 0),
  
  -- Notes
  catatan TEXT,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 3. TABLE: evaluasi_beasiswa
-- ================================================
CREATE TABLE IF NOT EXISTS evaluasi_beasiswa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beasiswa_id UUID NOT NULL REFERENCES beasiswa_aktif_santri(id) ON DELETE CASCADE,
  santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  
  tanggal_evaluasi DATE DEFAULT CURRENT_DATE,
  periode_evaluasi VARCHAR(50) NOT NULL, -- 'Semester Ganjil 2025', 'Tahun 2025'
  
  -- Evaluasi kondisi
  kondisi_ekonomi_terkini TEXT,
  penghasilan_ortu_terkini DECIMAL(15,2),
  prestasi_terkini TEXT,
  kedisiplinan TEXT,
  nilai_monitoring VARCHAR(10),
  catatan_evaluasi TEXT,
  
  -- Keputusan
  keputusan VARCHAR(50) NOT NULL CHECK (keputusan IN ('Lanjut', 'Naik Persentase', 'Turun Persentase', 'Cabut', 'Ubah Komponen', 'Suspend Sementara')),
  
  persentase_lama INTEGER,
  persentase_baru INTEGER,
  nominal_lama DECIMAL(15,2),
  nominal_baru DECIMAL(15,2),
  komponen_baru JSONB, -- Jika ada perubahan komponen
  
  alasan_keputusan TEXT NOT NULL,
  tanggal_efektif DATE NOT NULL, -- Kapan keputusan berlaku
  
  -- Evaluator
  evaluator UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 4. TABLE: pencairan_beasiswa_bulanan (Link to existing pencairan_beasiswa)
-- ================================================
-- Note: Kita akan gunakan tabel pencairan_beasiswa yang sudah ada
-- Tambahkan kolom baru untuk link ke beasiswa_aktif (OPTIONAL - jika tabel ada)

-- Check if pencairan_beasiswa table exists, if yes, add column
DO $$ 
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'pencairan_beasiswa'
  ) THEN
    -- Add column if table exists
    ALTER TABLE pencairan_beasiswa 
      ADD COLUMN IF NOT EXISTS beasiswa_aktif_id UUID REFERENCES beasiswa_aktif_santri(id);
    
    -- Create index
    CREATE INDEX IF NOT EXISTS idx_pencairan_beasiswa_aktif ON pencairan_beasiswa(beasiswa_aktif_id);
    
    RAISE NOTICE 'Added beasiswa_aktif_id column to pencairan_beasiswa';
  ELSE
    RAISE NOTICE 'Table pencairan_beasiswa does not exist yet. Run beasiswa legacy migration first: 20251009020000_create_beasiswa_module.sql';
  END IF;
END $$;

-- ================================================
-- 5. INDEXES
-- ================================================
CREATE INDEX idx_pengajuan_beasiswa_santri ON pengajuan_beasiswa_santri(santri_id);
CREATE INDEX idx_pengajuan_beasiswa_status ON pengajuan_beasiswa_santri(status);
CREATE INDEX idx_pengajuan_beasiswa_tanggal ON pengajuan_beasiswa_santri(tanggal_pengajuan);
CREATE INDEX idx_pengajuan_beasiswa_jenis ON pengajuan_beasiswa_santri(jenis_beasiswa);

CREATE INDEX idx_beasiswa_aktif_santri ON beasiswa_aktif_santri(santri_id);
CREATE INDEX idx_beasiswa_aktif_status ON beasiswa_aktif_santri(status);
CREATE INDEX idx_beasiswa_aktif_pengajuan ON beasiswa_aktif_santri(pengajuan_id);
CREATE INDEX idx_beasiswa_aktif_evaluasi ON beasiswa_aktif_santri(tanggal_evaluasi_berikutnya);

CREATE INDEX idx_evaluasi_beasiswa_beasiswa ON evaluasi_beasiswa(beasiswa_id);
CREATE INDEX idx_evaluasi_beasiswa_santri ON evaluasi_beasiswa(santri_id);
CREATE INDEX idx_evaluasi_beasiswa_tanggal ON evaluasi_beasiswa(tanggal_evaluasi);

-- ================================================
-- 6. RLS POLICIES
-- ================================================
ALTER TABLE pengajuan_beasiswa_santri ENABLE ROW LEVEL SECURITY;
ALTER TABLE beasiswa_aktif_santri ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluasi_beasiswa ENABLE ROW LEVEL SECURITY;

-- Pengajuan Beasiswa
CREATE POLICY "Authenticated users can view pengajuan_beasiswa_santri"
  ON pengajuan_beasiswa_santri FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage pengajuan_beasiswa_santri"
  ON pengajuan_beasiswa_santri FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Beasiswa Aktif
CREATE POLICY "Authenticated users can view beasiswa_aktif_santri"
  ON beasiswa_aktif_santri FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage beasiswa_aktif_santri"
  ON beasiswa_aktif_santri FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Evaluasi Beasiswa
CREATE POLICY "Authenticated users can view evaluasi_beasiswa"
  ON evaluasi_beasiswa FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage evaluasi_beasiswa"
  ON evaluasi_beasiswa FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ================================================
-- 7. TRIGGERS
-- ================================================
CREATE TRIGGER update_pengajuan_beasiswa_updated_at
  BEFORE UPDATE ON pengajuan_beasiswa_santri
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_beasiswa_aktif_updated_at
  BEFORE UPDATE ON beasiswa_aktif_santri
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- 8. HELPER FUNCTIONS
-- ================================================

-- Function: Approve pengajuan dan buat beasiswa aktif
CREATE OR REPLACE FUNCTION approve_pengajuan_beasiswa(
  p_pengajuan_id UUID,
  p_persentase_approved INTEGER,
  p_nominal_approved DECIMAL,
  p_komponen_approved JSONB,
  p_nomor_sk VARCHAR,
  p_syarat_pertahankan TEXT,
  p_approved_by UUID,
  p_catatan TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_pengajuan RECORD;
  v_beasiswa_id UUID;
  v_result JSON;
BEGIN
  -- Get pengajuan
  SELECT * INTO v_pengajuan FROM pengajuan_beasiswa_santri WHERE id = p_pengajuan_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', FALSE, 'message', 'Pengajuan tidak ditemukan');
  END IF;
  
  IF v_pengajuan.status NOT IN ('pending', 'diverifikasi') THEN
    RETURN json_build_object('success', FALSE, 'message', 'Pengajuan tidak dapat diapprove (status: ' || v_pengajuan.status || ')');
  END IF;
  
  -- Update pengajuan status
  UPDATE pengajuan_beasiswa_santri
  SET 
    status = 'disetujui',
    approved_at = NOW(),
    approved_by = p_approved_by,
    persentase_approved = p_persentase_approved,
    nominal_approved = p_nominal_approved,
    komponen_approved = p_komponen_approved,
    nomor_sk = p_nomor_sk,
    syarat_pertahankan = p_syarat_pertahankan,
    catatan_approval = p_catatan,
    updated_at = NOW()
  WHERE id = p_pengajuan_id;
  
  -- Create beasiswa aktif
  INSERT INTO beasiswa_aktif_santri (
    santri_id,
    pengajuan_id,
    jenis_beasiswa,
    persentase_beasiswa,
    komponen_beasiswa,
    nominal_per_bulan,
    tanggal_mulai,
    tanggal_selesai,
    nomor_sk,
    syarat_pertahankan,
    status,
    created_by
  ) VALUES (
    v_pengajuan.santri_id,
    p_pengajuan_id,
    v_pengajuan.jenis_beasiswa,
    p_persentase_approved,
    p_komponen_approved,
    p_nominal_approved,
    v_pengajuan.periode_mulai,
    v_pengajuan.periode_selesai,
    p_nomor_sk,
    p_syarat_pertahankan,
    'aktif',
    p_approved_by
  )
  RETURNING id INTO v_beasiswa_id;
  
  -- Update santri tipe_pembayaran
  UPDATE santri
  SET tipe_pembayaran = CASE 
    WHEN p_persentase_approved = 100 THEN 'Subsidi Penuh'
    WHEN p_persentase_approved >= 50 THEN 'Subsidi Sebagian'
    ELSE 'Beasiswa'
  END
  WHERE id = v_pengajuan.santri_id;
  
  v_result := json_build_object(
    'success', TRUE,
    'pengajuan_id', p_pengajuan_id,
    'beasiswa_id', v_beasiswa_id,
    'santri_id', v_pengajuan.santri_id,
    'persentase', p_persentase_approved,
    'nominal', p_nominal_approved
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Reject pengajuan
CREATE OR REPLACE FUNCTION reject_pengajuan_beasiswa(
  p_pengajuan_id UUID,
  p_alasan_penolakan TEXT,
  p_rejected_by UUID
)
RETURNS JSON AS $$
DECLARE
  v_pengajuan RECORD;
BEGIN
  SELECT * INTO v_pengajuan FROM pengajuan_beasiswa_santri WHERE id = p_pengajuan_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', FALSE, 'message', 'Pengajuan tidak ditemukan');
  END IF;
  
  IF v_pengajuan.status NOT IN ('pending', 'diverifikasi') THEN
    RETURN json_build_object('success', FALSE, 'message', 'Pengajuan tidak dapat ditolak (status: ' || v_pengajuan.status || ')');
  END IF;
  
  UPDATE pengajuan_beasiswa_santri
  SET 
    status = 'ditolak',
    rejected_at = NOW(),
    rejected_by = p_rejected_by,
    alasan_penolakan = p_alasan_penolakan,
    updated_at = NOW()
  WHERE id = p_pengajuan_id;
  
  RETURN json_build_object(
    'success', TRUE,
    'pengajuan_id', p_pengajuan_id,
    'message', 'Pengajuan ditolak'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get summary beasiswa per santri
CREATE OR REPLACE FUNCTION get_beasiswa_summary_santri(p_santri_id UUID)
RETURNS JSON AS $$
DECLARE
  v_beasiswa RECORD;
  v_result JSON;
BEGIN
  SELECT 
    ba.id,
    ba.jenis_beasiswa,
    ba.persentase_beasiswa,
    ba.nominal_per_bulan,
    ba.status,
    ba.tanggal_mulai,
    ba.tanggal_selesai,
    ba.total_sudah_diterima,
    ba.komponen_beasiswa
  INTO v_beasiswa
  FROM beasiswa_aktif_santri ba
  WHERE ba.santri_id = p_santri_id AND ba.status = 'aktif'
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'has_beasiswa', FALSE,
      'message', 'Tidak ada beasiswa aktif'
    );
  END IF;
  
  v_result := json_build_object(
    'has_beasiswa', TRUE,
    'beasiswa_id', v_beasiswa.id,
    'jenis', v_beasiswa.jenis_beasiswa,
    'persentase', v_beasiswa.persentase_beasiswa,
    'nominal_per_bulan', v_beasiswa.nominal_per_bulan,
    'status', v_beasiswa.status,
    'tanggal_mulai', v_beasiswa.tanggal_mulai,
    'tanggal_selesai', v_beasiswa.tanggal_selesai,
    'total_diterima', v_beasiswa.total_sudah_diterima,
    'komponen', v_beasiswa.komponen_beasiswa
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get statistik pengajuan beasiswa
CREATE OR REPLACE FUNCTION get_statistik_pengajuan_beasiswa()
RETURNS TABLE (
  total_pending INTEGER,
  total_diverifikasi INTEGER,
  total_disetujui INTEGER,
  total_ditolak INTEGER,
  total_budget_per_bulan DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE status = 'pending')::INTEGER AS total_pending,
    COUNT(*) FILTER (WHERE status = 'diverifikasi')::INTEGER AS total_diverifikasi,
    COUNT(*) FILTER (WHERE status = 'disetujui')::INTEGER AS total_disetujui,
    COUNT(*) FILTER (WHERE status = 'ditolak')::INTEGER AS total_ditolak,
    COALESCE(SUM(nominal_approved) FILTER (WHERE status = 'disetujui'), 0) AS total_budget_per_bulan
  FROM pengajuan_beasiswa_santri;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 9. COMMENTS
-- ================================================
COMMENT ON TABLE pengajuan_beasiswa_santri IS 'Pengajuan beasiswa dengan workflow verifikasi & approval';
COMMENT ON TABLE beasiswa_aktif_santri IS 'Beasiswa yang sudah disetujui dan aktif berjalan';
COMMENT ON TABLE evaluasi_beasiswa IS 'Evaluasi berkala beasiswa (setiap semester/tahun)';

COMMENT ON COLUMN pengajuan_beasiswa_santri.komponen_beasiswa IS 'JSONB: Detail komponen yang diajukan dengan persentase masing-masing';
COMMENT ON COLUMN pengajuan_beasiswa_santri.status IS 'draft, pending, diverifikasi, disetujui, ditolak, dicabut';
COMMENT ON COLUMN beasiswa_aktif_santri.periode_evaluasi IS 'Semester, Tahunan - frekuensi evaluasi';

COMMENT ON FUNCTION approve_pengajuan_beasiswa IS 'Approve pengajuan dan create beasiswa aktif';
COMMENT ON FUNCTION reject_pengajuan_beasiswa IS 'Reject pengajuan beasiswa';
COMMENT ON FUNCTION get_beasiswa_summary_santri IS 'Get summary beasiswa aktif untuk santri';
COMMENT ON FUNCTION get_statistik_pengajuan_beasiswa IS 'Get statistik pengajuan beasiswa (pending, approved, dll)';

