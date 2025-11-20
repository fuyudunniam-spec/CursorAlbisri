-- =====================================================
-- AKADEMIK CORE TABLES (Madin/TPQ/Tahfid/Tahsin)
-- =====================================================
-- Description: Simple class master & membership, Madin attendance,
--              daily setoran (TPQ/Tahfid/Tahsin), and perizinan
-- Date: 2025-11-05
-- =====================================================

-- Enable extensions if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1) MASTER KELAS
-- =====================================================
CREATE TABLE IF NOT EXISTS kelas_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_kelas VARCHAR(150) NOT NULL,                 -- e.g., "Madin I'dad", "TPQ Iqra 3", "Tahfid Juz 30 A"
  program VARCHAR(20) NOT NULL CHECK (program IN ('Madin', 'TPQ', 'Tahfid', 'Tahsin')),
  rombel VARCHAR(20),                               -- e.g., A/B/C
  tingkat VARCHAR(50),                              -- e.g., I'dad, Dasar, Menengah
  tahun_ajaran VARCHAR(20) DEFAULT '2024/2025',
  semester VARCHAR(20) DEFAULT 'Ganjil',
  status VARCHAR(20) DEFAULT 'Aktif' CHECK (status IN ('Aktif','Non-Aktif')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE kelas_master IS 'Master kelas untuk Madin/TPQ/Tahfid/Tahsin.';

CREATE INDEX IF NOT EXISTS idx_kelas_master_program ON kelas_master(program);
CREATE INDEX IF NOT EXISTS idx_kelas_master_status ON kelas_master(status);

-- =====================================================
-- 2) ANGGOTA KELAS (PLOATING SEDERHANA)
-- =====================================================
CREATE TABLE IF NOT EXISTS kelas_anggota (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kelas_id UUID NOT NULL REFERENCES kelas_master(id) ON DELETE CASCADE,
  santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  tanggal_mulai DATE DEFAULT CURRENT_DATE,
  tanggal_selesai DATE,
  status VARCHAR(20) DEFAULT 'Aktif' CHECK (status IN ('Aktif','Non-Aktif')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE kelas_anggota IS 'Keanggotaan santri pada kelas_master.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_kelas_anggota_aktif 
  ON kelas_anggota(kelas_id, santri_id) 
  WHERE status = 'Aktif';

CREATE INDEX IF NOT EXISTS idx_kelas_anggota_santri ON kelas_anggota(santri_id);

-- =====================================================
-- 3) ABSENSI MADIN (MENGIKUTI PLOATING KELAS)
-- =====================================================
CREATE TABLE IF NOT EXISTS absensi_madin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  kelas_id UUID NOT NULL REFERENCES kelas_master(id) ON DELETE CASCADE,
  tanggal DATE NOT NULL,
  status VARCHAR(10) NOT NULL CHECK (status IN ('Hadir','Izin','Sakit','Dispen','Alfa')),
  telat BOOLEAN DEFAULT FALSE,
  materi TEXT,
  pengajar_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE absensi_madin IS 'Absensi harian Madin berdasarkan keanggotaan kelas.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_absensi_madin_harian 
  ON absensi_madin(santri_id, kelas_id, tanggal);

CREATE INDEX IF NOT EXISTS idx_absensi_madin_tanggal ON absensi_madin(tanggal);

-- =====================================================
-- 4) SETORAN HARIAN (TPQ/TAHFID/TAHSIN)
-- =====================================================
CREATE TABLE IF NOT EXISTS setoran_harian (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  program VARCHAR(10) NOT NULL CHECK (program IN ('TPQ','Tahfid','Tahsin')),
  tanggal_setor DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(12) NOT NULL DEFAULT 'Sudah Setor' CHECK (status IN ('Sudah Setor','Tidak Setor','Izin','Sakit')),

  -- Detail fleksibel: Iqra' / Qur'an / Hafalan
  iqra_halaman_awal INT,
  iqra_halaman_akhir INT,
  surat VARCHAR(100),
  ayat_awal INT,
  ayat_akhir INT,
  juz INT,

  nilai_kelancaran INT CHECK (nilai_kelancaran BETWEEN 0 AND 100),
  nilai_tajwid INT CHECK (nilai_tajwid BETWEEN 0 AND 100),
  catatan TEXT,

  pengurus_id UUID REFERENCES auth.users(id),
  perizinan_id UUID, -- soft link, optional

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE setoran_harian IS 'Setoran harian TPQ/Tahfid/Tahsin yang diinput pengurus.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_setoran_harian_santri_program_tanggal 
  ON setoran_harian(santri_id, program, tanggal_setor);

CREATE INDEX IF NOT EXISTS idx_setoran_harian_program_tanggal 
  ON setoran_harian(program, tanggal_setor);

-- =====================================================
-- 5) PERIZINAN SANTRI (IZIN/SAKIT/DISPEN)
-- =====================================================
CREATE TABLE IF NOT EXISTS perizinan_santri (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  jenis VARCHAR(20) NOT NULL CHECK (jenis IN ('Izin','Sakit','Dispen','Libur Kolektif')),
  kategori VARCHAR(20) NOT NULL CHECK (kategori IN ('Harian','Partial-Jam')),
  tanggal_mulai DATE NOT NULL,
  tanggal_selesai DATE NOT NULL,
  jam_mulai TIME,
  jam_selesai TIME,
  alasan TEXT,
  lampiran_url TEXT,
  status VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','auto')),
  diajukan_oleh UUID REFERENCES auth.users(id),
  disetujui_oleh UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE perizinan_santri IS 'Perizinan santri yang meng-exempt absensi/setoran pada periode tertentu.';

CREATE INDEX IF NOT EXISTS idx_perizinan_santri_santri ON perizinan_santri(santri_id);
CREATE INDEX IF NOT EXISTS idx_perizinan_santri_status ON perizinan_santri(status);
CREATE INDEX IF NOT EXISTS idx_perizinan_santri_tanggal ON perizinan_santri(tanggal_mulai, tanggal_selesai);

-- =====================================================
-- 6) RLS (SIMPLE OPEN FOR AUTHENTICATED; TIGHTEN LATER IF NEEDED)
-- =====================================================
ALTER TABLE kelas_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE kelas_anggota ENABLE ROW LEVEL SECURITY;
ALTER TABLE absensi_madin ENABLE ROW LEVEL SECURITY;
ALTER TABLE setoran_harian ENABLE ROW LEVEL SECURITY;
ALTER TABLE perizinan_santri ENABLE ROW LEVEL SECURITY;

-- For now: allow all authenticated users; can be refined per role later
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kelas_master'
  ) THEN
    CREATE POLICY "auth_all_kelas_master" ON kelas_master FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'kelas_anggota'
  ) THEN
    CREATE POLICY "auth_all_kelas_anggota" ON kelas_anggota FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'absensi_madin'
  ) THEN
    CREATE POLICY "auth_all_absensi_madin" ON absensi_madin FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'setoran_harian'
  ) THEN
    CREATE POLICY "auth_all_setoran_harian" ON setoran_harian FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'perizinan_santri'
  ) THEN
    CREATE POLICY "auth_all_perizinan_santri" ON perizinan_santri FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- =====================================================
-- 7) HELPER VIEWS (OPTIONAL SIMPLE VIEWS)
-- =====================================================
-- Santri yang belum setor hari ini (contoh untuk Tahfid/Tahsin, exclude perizinan approved)
-- NOTE: Expect perizinan_santri.status='approved' to exempt
CREATE OR REPLACE VIEW v_belum_setor_hari_ini AS
SELECT s.id AS santri_id,
       s.nama_lengkap,
       p.program::text AS program,
       CURRENT_DATE AS tanggal
FROM santri s
CROSS JOIN (VALUES ('Tahfid'),('Tahsin')) AS p(program)
LEFT JOIN setoran_harian sh
  ON sh.santri_id = s.id AND sh.program = p.program AND sh.tanggal_setor = CURRENT_DATE
LEFT JOIN perizinan_santri pr
  ON pr.santri_id = s.id
 AND pr.status = 'approved'
 AND CURRENT_DATE BETWEEN pr.tanggal_mulai AND pr.tanggal_selesai
WHERE sh.id IS NULL
  AND pr.id IS NULL
  AND s.kategori ILIKE '%Binaan Mukim%';

COMMENT ON VIEW v_belum_setor_hari_ini IS 'Daftar santri binaan mukim yang belum setor Tahfid/Tahsin hari ini tanpa perizinan aktif.';

-- =====================================================
-- END
-- =====================================================


