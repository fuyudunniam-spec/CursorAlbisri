-- RECREATE DATABASE SCHEMA FROM SCRATCH
-- Jalankan di Supabase SQL Editor jika semua gagal

-- 1. Drop existing tables (HATI-HATI: ini akan hapus semua data!)
-- Uncomment jika ingin start fresh
/*
DROP TABLE IF EXISTS pengajuan_beasiswa CASCADE;
DROP TABLE IF EXISTS santri_programs CASCADE;
DROP TABLE IF EXISTS santri_wali CASCADE;
DROP TABLE IF EXISTS santri CASCADE;
DROP TABLE IF EXISTS program_beasiswa CASCADE;
*/

-- 2. Create santri table
CREATE TABLE IF NOT EXISTS santri (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nis VARCHAR(20) UNIQUE NOT NULL,
  nama_lengkap VARCHAR(255) NOT NULL,
  tempat_lahir VARCHAR(255),
  tanggal_lahir DATE,
  jenis_kelamin VARCHAR(20) CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan')),
  agama VARCHAR(50) DEFAULT 'Islam',
  status_anak VARCHAR(50),
  no_whatsapp VARCHAR(20),
  alamat TEXT,
  foto_profil TEXT,
  kategori VARCHAR(50),
  angkatan VARCHAR(10),
  tanggal_masuk DATE,
  status_santri VARCHAR(50) DEFAULT 'Aktif',
  tipe_pembayaran VARCHAR(50) DEFAULT 'Bayar Sendiri',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create santri_wali table
CREATE TABLE IF NOT EXISTS santri_wali (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  nama_lengkap VARCHAR(255) NOT NULL,
  hubungan_keluarga VARCHAR(50),
  no_whatsapp VARCHAR(20),
  email VARCHAR(255),
  alamat TEXT,
  pekerjaan VARCHAR(255),
  penghasilan_bulanan DECIMAL(15,2),
  is_utama BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create program_beasiswa table
CREATE TABLE IF NOT EXISTS program_beasiswa (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nama_program VARCHAR(255) NOT NULL,
  tipe_beasiswa VARCHAR(50),
  deskripsi TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create santri_programs table (simplified)
CREATE TABLE IF NOT EXISTS santri_programs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  nama_program VARCHAR(255), -- Made nullable
  kelas_program VARCHAR(100),
  rombel VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create pengajuan_beasiswa table
CREATE TABLE IF NOT EXISTS pengajuan_beasiswa (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  program_beasiswa_id UUID REFERENCES program_beasiswa(id) ON DELETE SET NULL,
  status_pengajuan VARCHAR(50) NOT NULL DEFAULT 'Menunggu Verifikasi',
  status_anak VARCHAR(50),
  alasan_pengajuan TEXT NOT NULL,
  data_kesehatan JSONB,
  tanggal_pengajuan TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  tanggal_review TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  catatan_reviewer TEXT,
  tanggal_keputusan TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  alasan_penolakan TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

-- 7. Add constraints
ALTER TABLE pengajuan_beasiswa 
ADD CONSTRAINT pengajuan_beasiswa_status_check 
CHECK (status_pengajuan IN (
  'Menunggu Verifikasi', 
  'Dalam Review', 
  'Diterima', 
  'Ditolak', 
  'Dibatalkan'
));

-- 8. Create indexes
CREATE INDEX IF NOT EXISTS idx_santri_nis ON santri(nis);
CREATE INDEX IF NOT EXISTS idx_santri_wali_santri_id ON santri_wali(santri_id);
CREATE INDEX IF NOT EXISTS idx_santri_programs_santri_id ON santri_programs(santri_id);
CREATE INDEX IF NOT EXISTS idx_pengajuan_beasiswa_santri_id ON pengajuan_beasiswa(santri_id);
CREATE INDEX IF NOT EXISTS idx_pengajuan_beasiswa_status ON pengajuan_beasiswa(status_pengajuan);

-- 9. Enable RLS (permissive for development)
ALTER TABLE santri ENABLE ROW LEVEL SECURITY;
ALTER TABLE santri_wali ENABLE ROW LEVEL SECURITY;
ALTER TABLE santri_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_beasiswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengajuan_beasiswa ENABLE ROW LEVEL SECURITY;

-- 10. Create permissive policies
CREATE POLICY "Enable all operations for santri" ON santri FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for santri_wali" ON santri_wali FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for santri_programs" ON santri_programs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for program_beasiswa" ON program_beasiswa FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for pengajuan_beasiswa" ON pengajuan_beasiswa FOR ALL USING (true) WITH CHECK (true);

-- 11. Insert sample data
INSERT INTO program_beasiswa (nama_program, tipe_beasiswa, is_active)
VALUES 
  ('Beasiswa Yatim Piatu', 'Penuh', true),
  ('Beasiswa Prestasi', 'Sebagian', true),
  ('Beasiswa Dhuafa', 'Penuh', true)
ON CONFLICT DO NOTHING;

INSERT INTO santri (
  nis, nama_lengkap, tempat_lahir, tanggal_lahir, jenis_kelamin, 
  agama, status_anak, no_whatsapp, alamat, kategori, 
  angkatan, tanggal_masuk, status_santri, tipe_pembayaran
)
VALUES 
  ('NIS2501001', 'Zabadi', 'Jakarta', '2010-05-15', 'Laki-laki', 
   'Islam', 'Anak Kandung', '+6281234567890', 'Jl. Merdeka No. 123, Jakarta Pusat', 'Santri Reguler', 
   '2025', '2025-01-01', 'Aktif', 'Bayar Sendiri')
ON CONFLICT (nis) DO NOTHING;

INSERT INTO santri_wali (santri_id, nama_lengkap, hubungan_keluarga, no_whatsapp, is_utama)
SELECT s.id, 'Budi Santoso', 'Ayah', '+6281234567892', true
FROM santri s WHERE s.nis = 'NIS2501001'
ON CONFLICT DO NOTHING;

INSERT INTO santri_programs (santri_id, nama_program, kelas_program, rombel)
SELECT s.id, 'TPQ Reguler', 'Kelas 1', 'A'
FROM santri s WHERE s.nis = 'NIS2501001'
ON CONFLICT DO NOTHING;

-- 12. Verify data
SELECT 
  s.id, s.nis, s.nama_lengkap, s.kategori,
  sw.nama_lengkap as wali_nama,
  sp.nama_program, sp.kelas_program,
  pb.nama_program as beasiswa_program
FROM santri s
LEFT JOIN santri_wali sw ON s.id = sw.santri_id AND sw.is_utama = true
LEFT JOIN santri_programs sp ON s.id = sp.santri_id
LEFT JOIN pengajuan_beasiswa p ON s.id = p.santri_id
LEFT JOIN program_beasiswa pb ON p.program_beasiswa_id = pb.id
ORDER BY s.created_at DESC;
