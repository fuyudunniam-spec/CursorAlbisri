-- INSERT PROGRAM BEASISWA - FINAL VERSION
-- Berdasarkan schema migration: 20251009020000_create_beasiswa_module.sql
-- Jalankan di Supabase SQL Editor

-- Kolom yang WAJIB (NOT NULL):
-- 1. nama_program
-- 2. jenis (CHECK: 'Binaan', 'Prestasi', 'Prestasi Akademik', 'Prestasi Non-Akademik', 'Yatim', 'Dhuafa')
-- 3. nominal_per_periode
-- 4. periode_aktif (CHECK: 'Bulanan', 'Semester', 'Tahunan')
-- 5. tanggal_mulai

INSERT INTO program_beasiswa (
  nama_program, 
  jenis, 
  nominal_per_periode,
  periode_aktif,
  tanggal_mulai,
  status,
  kriteria,
  deskripsi
)
VALUES 
  (
    'Beasiswa Yatim Piatu', 
    'Yatim', 
    1000000, 
    'Bulanan',
    CURRENT_DATE,
    'aktif',
    'Anak yatim atau yatim piatu dengan kondisi ekonomi lemah',
    'Program beasiswa penuh untuk santri yatim piatu'
  ),
  (
    'Beasiswa Prestasi Akademik', 
    'Prestasi Akademik', 
    500000, 
    'Semester',
    CURRENT_DATE,
    'aktif',
    'Santri dengan nilai rata-rata minimal 85',
    'Beasiswa untuk santri berprestasi di bidang akademik'
  ),
  (
    'Beasiswa Dhuafa', 
    'Dhuafa', 
    800000, 
    'Bulanan',
    CURRENT_DATE,
    'aktif',
    'Keluarga dengan penghasilan di bawah UMR',
    'Program beasiswa untuk santri dari keluarga kurang mampu'
  );

-- Verify data
SELECT 
  id,
  nama_program, 
  jenis,
  nominal_per_periode,
  periode_aktif,
  status,
  tanggal_mulai
FROM program_beasiswa 
WHERE status = 'aktif'
ORDER BY nama_program;
