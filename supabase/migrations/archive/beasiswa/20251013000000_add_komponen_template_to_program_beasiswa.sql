-- =====================================================================
-- ADD KOMPONEN TEMPLATE TO PROGRAM BEASISWA
-- =====================================================================
-- Purpose: Menambahkan field komponen_template untuk mendefinisikan
--          breakdown beasiswa berbasis komponen (pelayanan/barang/uang)
-- Date: Oktober 2025
-- =====================================================================

-- Add new columns to program_beasiswa
ALTER TABLE program_beasiswa
  ADD COLUMN IF NOT EXISTS komponen_template JSONB DEFAULT '{
    "bundling": [],
    "uang_saku_enabled": false,
    "uang_saku_nominal": 0
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS transparansi_mode VARCHAR(20) DEFAULT 'komponen' 
    CHECK (transparansi_mode IN ('nominal', 'komponen', 'hybrid'));

-- Add comments
COMMENT ON COLUMN program_beasiswa.komponen_template IS 'Template komponen beasiswa: bundling (array of {kategori, persentase_cover, bentuk, keterangan}), uang_saku_enabled, uang_saku_nominal';
COMMENT ON COLUMN program_beasiswa.transparansi_mode IS 'Mode display: nominal (hanya angka), komponen (detail breakdown), hybrid (keduanya)';

-- =====================================================================
-- UPDATE EXISTING DATA WITH DEFAULT KOMPONEN
-- =====================================================================

-- Update Beasiswa Yatim - 100%
UPDATE program_beasiswa
SET 
  komponen_template = jsonb_build_object(
    'bundling', jsonb_build_array(
      jsonb_build_object(
        'kategori', 'Pendidikan',
        'persentase_cover', 100,
        'bentuk', 'pelayanan',
        'keterangan', 'SPP, buku, seragam, dan kegiatan belajar'
      ),
      jsonb_build_object(
        'kategori', 'Asrama',
        'persentase_cover', 100,
        'bentuk', 'pelayanan',
        'keterangan', 'Penginapan, listrik, air, maintenance'
      ),
      jsonb_build_object(
        'kategori', 'Konsumsi',
        'persentase_cover', 100,
        'bentuk', 'barang',
        'keterangan', 'Makan 3x sehari dengan menu bergizi'
      ),
      jsonb_build_object(
        'kategori', 'Kesehatan',
        'persentase_cover', 100,
        'bentuk', 'pelayanan',
        'keterangan', 'Medical check-up dan obat-obatan'
      )
    ),
    'uang_saku_enabled', true,
    'uang_saku_nominal', 150000
  ),
  transparansi_mode = 'komponen',
  deskripsi = COALESCE(deskripsi, '') || E'\n\n✅ Komponen yang di-cover:\n- Pendidikan (SPP, buku, seragam) 100%\n- Asrama (penginapan, utilitas) 100%\n- Konsumsi (makan 3x sehari) 100%\n- Kesehatan (medical & obat) 100%\n- Uang saku Rp 150.000/bulan\n\n📌 Catatan: Beasiswa diberikan dalam bentuk pelayanan langsung, bukan pencairan tunai.'
WHERE nama_program LIKE '%Yatim%' AND jenis = 'Yatim';

-- Update Beasiswa Piatu - 100%
UPDATE program_beasiswa
SET 
  komponen_template = jsonb_build_object(
    'bundling', jsonb_build_array(
      jsonb_build_object(
        'kategori', 'Pendidikan',
        'persentase_cover', 100,
        'bentuk', 'pelayanan',
        'keterangan', 'SPP, buku, seragam, dan kegiatan belajar'
      ),
      jsonb_build_object(
        'kategori', 'Asrama',
        'persentase_cover', 100,
        'bentuk', 'pelayanan',
        'keterangan', 'Penginapan, listrik, air, maintenance'
      ),
      jsonb_build_object(
        'kategori', 'Konsumsi',
        'persentase_cover', 100,
        'bentuk', 'barang',
        'keterangan', 'Makan 3x sehari dengan menu bergizi'
      ),
      jsonb_build_object(
        'kategori', 'Kesehatan',
        'persentase_cover', 100,
        'bentuk', 'pelayanan',
        'keterangan', 'Medical check-up dan obat-obatan'
      )
    ),
    'uang_saku_enabled', true,
    'uang_saku_nominal', 150000
  ),
  transparansi_mode = 'komponen'
WHERE nama_program LIKE '%Piatu%' AND jenis = 'Yatim';

-- Update Beasiswa Yatim Piatu - 100%
UPDATE program_beasiswa
SET 
  komponen_template = jsonb_build_object(
    'bundling', jsonb_build_array(
      jsonb_build_object(
        'kategori', 'Pendidikan',
        'persentase_cover', 100,
        'bentuk', 'pelayanan',
        'keterangan', 'SPP, buku, seragam, dan kegiatan belajar'
      ),
      jsonb_build_object(
        'kategori', 'Asrama',
        'persentase_cover', 100,
        'bentuk', 'pelayanan',
        'keterangan', 'Penginapan premium dengan fasilitas lebih baik'
      ),
      jsonb_build_object(
        'kategori', 'Konsumsi',
        'persentase_cover', 100,
        'bentuk', 'barang',
        'keterangan', 'Makan 3x sehari dengan menu premium'
      ),
      jsonb_build_object(
        'kategori', 'Kesehatan',
        'persentase_cover', 100,
        'bentuk', 'pelayanan',
        'keterangan', 'Medical check-up dan obat-obatan'
      ),
      jsonb_build_object(
        'kategori', 'Lainnya',
        'persentase_cover', 100,
        'bentuk', 'pelayanan',
        'keterangan', 'Bimbingan khusus dan pendampingan psikologis'
      )
    ),
    'uang_saku_enabled', true,
    'uang_saku_nominal', 200000
  ),
  transparansi_mode = 'komponen'
WHERE nama_program LIKE '%Yatim Piatu%' AND jenis = 'Yatim';

-- Update Beasiswa Dhuafa - Disesuaikan
UPDATE program_beasiswa
SET 
  komponen_template = jsonb_build_object(
    'bundling', jsonb_build_array(
      jsonb_build_object(
        'kategori', 'Pendidikan',
        'persentase_cover', 100,
        'bentuk', 'pelayanan',
        'keterangan', 'SPP ditanggung penuh'
      ),
      jsonb_build_object(
        'kategori', 'Asrama',
        'persentase_cover', 50,
        'bentuk', 'pelayanan',
        'keterangan', 'Subsidi 50% biaya asrama'
      ),
      jsonb_build_object(
        'kategori', 'Konsumsi',
        'persentase_cover', 75,
        'bentuk', 'barang',
        'keterangan', 'Subsidi 75% biaya makan'
      )
    ),
    'uang_saku_enabled', false,
    'uang_saku_nominal', 0
  ),
  transparansi_mode = 'hybrid',
  deskripsi = COALESCE(deskripsi, '') || E'\n\n✅ Komponen yang di-cover:\n- Pendidikan (SPP) 100%\n- Asrama 50%\n- Konsumsi 75%\n\n📌 Catatan: Sisanya dibayar mandiri oleh keluarga.'
WHERE nama_program LIKE '%Dhuafa%' AND jenis = 'Dhuafa';

-- =====================================================================
-- CREATE INDEX FOR JSONB QUERIES
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_program_beasiswa_komponen_template 
  ON program_beasiswa USING gin(komponen_template);

-- =====================================================================
-- VERIFICATION QUERY
-- =====================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '✅ KOMPONEN TEMPLATE ADDED TO PROGRAM BEASISWA';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 New Columns:';
  RAISE NOTICE '   - komponen_template (JSONB)';
  RAISE NOTICE '   - transparansi_mode (VARCHAR)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Updated Programs:';
  RAISE NOTICE '   - Beasiswa Yatim: 4 komponen + uang saku';
  RAISE NOTICE '   - Beasiswa Piatu: 4 komponen + uang saku';
  RAISE NOTICE '   - Beasiswa Yatim Piatu: 5 komponen + uang saku';
  RAISE NOTICE '   - Beasiswa Dhuafa: 3 komponen (partial coverage)';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================';
END $$;

-- Show updated programs
SELECT 
  nama_program,
  jenis,
  nominal_per_periode,
  transparansi_mode,
  jsonb_array_length(komponen_template->'bundling') as jumlah_komponen,
  (komponen_template->>'uang_saku_enabled')::boolean as uang_saku,
  (komponen_template->>'uang_saku_nominal')::integer as nominal_uang_saku
FROM program_beasiswa
WHERE jenis IN ('Yatim', 'Dhuafa')
ORDER BY nama_program;

