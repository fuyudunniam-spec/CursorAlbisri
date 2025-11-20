-- =====================================================================
-- SETUP PROGRAM BEASISWA - 4 KATEGORI
-- =====================================================================
-- Purpose: Setup program beasiswa sesuai kategori yayasan
-- Kategori: Yatim, Piatu, Yatim Piatu, Dhuafa
-- Date: Oktober 2025
-- =====================================================================

DO $$ 
DECLARE
  v_yatim_id UUID;
  v_piatu_id UUID;
  v_yatim_piatu_id UUID;
  v_dhuafa_id UUID;
BEGIN
  RAISE NOTICE 'Starting setup program beasiswa...';

  -- ===================================================================
  -- 1. BEASISWA YATIM (Coverage: 100%)
  -- ===================================================================
  INSERT INTO program_beasiswa (
    nama_program,
    jenis,
    sumber_dana,
    nominal_per_periode,
    periode_aktif,
    kriteria,
    max_penerima,
    status,
    tanggal_mulai,
    deskripsi
  ) VALUES (
    'Beasiswa Yatim - 100%',
    'Yatim',
    'Dana Umum Yayasan',
    1300000, -- Base: SD Mukim
    'Bulanan',
    'Anak yang ayahnya sudah meninggal dunia. Dibuktikan dengan Akta Kematian Ayah.',
    50,
    'aktif',
    '2025-01-01',
    'Beasiswa penuh untuk anak yatim yang membutuhkan. Coverage 100% dari biaya program.'
  ) ON CONFLICT (nama_program) DO UPDATE
    SET deskripsi = EXCLUDED.deskripsi,
        nominal_per_periode = EXCLUDED.nominal_per_periode,
        updated_at = NOW()
  RETURNING id INTO v_yatim_id;

  -- ===================================================================
  -- 2. BEASISWA PIATU (Coverage: 100%)
  -- ===================================================================
  INSERT INTO program_beasiswa (
    nama_program,
    jenis,
    sumber_dana,
    nominal_per_periode,
    periode_aktif,
    kriteria,
    max_penerima,
    status,
    tanggal_mulai,
    deskripsi
  ) VALUES (
    'Beasiswa Piatu - 100%',
    'Yatim',  -- Using existing enum value
    'Dana Umum Yayasan',
    1300000,
    'Bulanan',
    'Anak yang ibunya sudah meninggal dunia. Dibuktikan dengan Akta Kematian Ibu.',
    30,
    'aktif',
    '2025-01-01',
    'Beasiswa penuh untuk anak piatu yang membutuhkan. Coverage 100% dari biaya program.'
  ) ON CONFLICT (nama_program) DO UPDATE
    SET deskripsi = EXCLUDED.deskripsi,
        nominal_per_periode = EXCLUDED.nominal_per_periode,
        updated_at = NOW()
  RETURNING id INTO v_piatu_id;

  -- ===================================================================
  -- 3. BEASISWA YATIM PIATU (Coverage: 100% + Prioritas)
  -- ===================================================================
  INSERT INTO program_beasiswa (
    nama_program,
    jenis,
    sumber_dana,
    nominal_per_periode,
    periode_aktif,
    kriteria,
    max_penerima,
    status,
    tanggal_mulai,
    deskripsi
  ) VALUES (
    'Beasiswa Yatim Piatu - 100%',
    'Yatim',  -- Using existing enum value
    'Dana Umum Yayasan',
    1950000, -- Higher base untuk prioritas
    'Bulanan',
    'Anak yang kedua orang tuanya (ayah dan ibu) sudah meninggal dunia. Prioritas tertinggi.',
    20,
    'aktif',
    '2025-01-01',
    'Beasiswa penuh untuk anak yatim piatu dengan prioritas tertinggi. Coverage 100% dari biaya program + benefit tambahan.'
  ) ON CONFLICT (nama_program) DO UPDATE
    SET deskripsi = EXCLUDED.deskripsi,
        nominal_per_periode = EXCLUDED.nominal_per_periode,
        updated_at = NOW()
  RETURNING id INTO v_yatim_piatu_id;

  -- ===================================================================
  -- 4. BEASISWA DHUAFA (Coverage: 50% - 100%, disesuaikan)
  -- ===================================================================
  INSERT INTO program_beasiswa (
    nama_program,
    jenis,
    sumber_dana,
    nominal_per_periode,
    periode_aktif,
    kriteria,
    max_penerima,
    status,
    tanggal_mulai,
    deskripsi
  ) VALUES (
    'Beasiswa Dhuafa - Disesuaikan',
    'Dhuafa',
    'Dana Umum Yayasan',
    975000, -- 75% dari base (rata-rata)
    'Bulanan',
    'Keluarga tidak mampu (kedua orang tua masih hidup). Dibuktikan dengan SKTM dan slip gaji.',
    100,
    'aktif',
    '2025-01-01',
    'Beasiswa untuk keluarga dhuafa (tidak mampu). Coverage 50%-100% disesuaikan dengan kondisi ekonomi keluarga.'
  ) ON CONFLICT (nama_program) DO UPDATE
    SET deskripsi = EXCLUDED.deskripsi,
        nominal_per_periode = EXCLUDED.nominal_per_periode,
        updated_at = NOW()
  RETURNING id INTO v_dhuafa_id;

  RAISE NOTICE '';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '✅ PROGRAM BEASISWA CREATED!';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 PROGRAMS:';
  RAISE NOTICE '   1. Beasiswa Yatim        : Rp 1.300.000/bulan (100%%)';
  RAISE NOTICE '   2. Beasiswa Piatu        : Rp 1.300.000/bulan (100%%)';
  RAISE NOTICE '   3. Beasiswa Yatim Piatu  : Rp 1.950.000/bulan (100%% + Priority)';
  RAISE NOTICE '   4. Beasiswa Dhuafa       : Rp 975.000/bulan (50-100%%, adjustable)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Max Penerima:';
  RAISE NOTICE '   • Yatim: 50 santri';
  RAISE NOTICE '   • Piatu: 30 santri';
  RAISE NOTICE '   • Yatim Piatu: 20 santri';
  RAISE NOTICE '   • Dhuafa: 100 santri';
  RAISE NOTICE '';
  RAISE NOTICE '💰 Estimasi Budget Bulanan (Jika Penuh):';
  RAISE NOTICE '   • Yatim: Rp %', (1300000 * 50);
  RAISE NOTICE '   • Piatu: Rp %', (1300000 * 30);
  RAISE NOTICE '   • Yatim Piatu: Rp %', (1950000 * 20);
  RAISE NOTICE '   • Dhuafa: Rp %', (975000 * 100);
  RAISE NOTICE '   • TOTAL: Rp %', (1300000 * 50) + (1300000 * 30) + (1950000 * 20) + (975000 * 100);
  RAISE NOTICE '========================================================';
END $$;

-- =====================================================================
-- Update existing check constraint if needed
-- =====================================================================

-- Check if Dhuafa is in the constraint
DO $$
BEGIN
  -- Try to add Dhuafa to jenis if not already there
  -- This is safe - will only add if constraint allows modification
  ALTER TABLE program_beasiswa DROP CONSTRAINT IF EXISTS program_beasiswa_jenis_check;
  
  ALTER TABLE program_beasiswa ADD CONSTRAINT program_beasiswa_jenis_check
    CHECK (jenis IN ('Binaan', 'Prestasi', 'Prestasi Akademik', 'Prestasi Non-Akademik', 'Yatim', 'Dhuafa'));
    
  RAISE NOTICE 'Constraint updated to include Dhuafa';
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Constraint already correct or error: %', SQLERRM;
END $$;

-- =====================================================================
-- SUMMARY & VERIFICATION
-- =====================================================================

-- Show created programs
SELECT 
  nama_program,
  jenis,
  nominal_per_periode,
  max_penerima,
  status,
  nominal_per_periode * max_penerima as budget_maksimal
FROM program_beasiswa
WHERE jenis IN ('Yatim', 'Dhuafa')
ORDER BY 
  CASE jenis
    WHEN 'Yatim' THEN 1
    WHEN 'Dhuafa' THEN 2
    ELSE 3
  END,
  nama_program;

COMMENT ON SCHEMA public IS 'Program Beasiswa 4 Kategori Setup - 2025-10-12';

