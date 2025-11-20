-- =====================================================================
-- SETUP BEASISWA TRANSPARAN - SIMULASI BIAYA SURABAYA
-- =====================================================================
-- Purpose: Setup program SD-SMA dengan komponen biaya realistis
-- Location: Surabaya, East Java
-- Date: Oktober 2025
-- =====================================================================

-- =====================================================================
-- 1. CREATE PROGRAMS (SD, SMP, SMA MUKIM)
-- =====================================================================

DO $$ 
DECLARE
  v_sd_id UUID;
  v_smp_id UUID;
  v_sma_id UUID;
BEGIN
  RAISE NOTICE 'Starting setup program SD-SMA Mukim Surabaya...';

  -- Program SD Mukim
  INSERT INTO program_santri (
    nama_program, 
    kode_program, 
    kategori,
    tingkat,
    jenjang, 
    deskripsi,
    kapasitas_maksimal,
    is_active
  ) VALUES (
    'Santri Mukim SD (Kelas 1-6)',
    'SD-MUKIM',
    'Pondok',
    'Dasar',
    'SD',
    'Program santri mukim jenjang Sekolah Dasar dengan fasilitas asrama, konsumsi 3x sehari, dan pendidikan formal + internal. Cocok untuk anak usia 6-12 tahun.',
    100,
    true
  ) ON CONFLICT (kode_program) DO UPDATE
    SET nama_program = EXCLUDED.nama_program,
        deskripsi = EXCLUDED.deskripsi,
        updated_at = NOW()
  RETURNING id INTO v_sd_id;

  -- Program SMP Mukim
  INSERT INTO program_santri (
    nama_program,
    kode_program,
    kategori,
    tingkat,
    jenjang,
    deskripsi,
    kapasitas_maksimal,
    is_active
  ) VALUES (
    'Santri Mukim SMP (Kelas 7-9)',
    'SMP-MUKIM',
    'Pondok',
    'Menengah',
    'SMP',
    'Program santri mukim jenjang Sekolah Menengah Pertama dengan fasilitas lengkap asrama, konsumsi, dan pendidikan berkualitas. Untuk remaja usia 12-15 tahun.',
    80,
    true
  ) ON CONFLICT (kode_program) DO UPDATE
    SET nama_program = EXCLUDED.nama_program,
        deskripsi = EXCLUDED.deskripsi,
        updated_at = NOW()
  RETURNING id INTO v_smp_id;

  -- Program SMA Mukim
  INSERT INTO program_santri (
    nama_program,
    kode_program,
    kategori,
    tingkat,
    jenjang,
    deskripsi,
    kapasitas_maksimal,
    is_active
  ) VALUES (
    'Santri Mukim SMA (Kelas 10-12)',
    'SMA-MUKIM',
    'Pondok',
    'Tinggi',
    'SMA',
    'Program santri mukim jenjang Sekolah Menengah Atas dengan fasilitas premium, persiapan kuliah, dan pembelajaran digital. Untuk remaja usia 15-18 tahun.',
    60,
    true
  ) ON CONFLICT (kode_program) DO UPDATE
    SET nama_program = EXCLUDED.nama_program,
        deskripsi = EXCLUDED.deskripsi,
        updated_at = NOW()
  RETURNING id INTO v_sma_id;

  RAISE NOTICE 'Programs created: SD=%, SMP=%, SMA=%', v_sd_id, v_smp_id, v_sma_id;

  -- ===================================================================
  -- 2. KOMPONEN BIAYA SD MUKIM (Est. Total: Rp 1.300.000/bulan)
  -- ===================================================================
  RAISE NOTICE 'Setting up SD Mukim components...';

  DELETE FROM komponen_biaya_program WHERE program_id = v_sd_id;

  INSERT INTO komponen_biaya_program (
    program_id, nama_komponen, kode_komponen, tarif_per_bulan, 
    is_wajib, urutan, deskripsi, kategori_keuangan
  ) VALUES
    -- Komponen Bulanan (yang ditagihkan tiap bulan)
    (v_sd_id, 'SPP Pendidikan Formal', 'SPP_FORMAL_SD', 400000, true, 1,
     'Biaya SPP sekolah formal SD per bulan (termasuk kegiatan belajar mengajar)', 'Pendidikan'),
    
    (v_sd_id, 'Asrama & Penginapan', 'ASRAMA_SD', 200000, true, 2,
     'Biaya penginapan asrama termasuk listrik, air, maintenance, dan keamanan', 'Asrama'),
    
    (v_sd_id, 'Konsumsi (Makan 3x Sehari)', 'KONSUMSI_SD', 500000, true, 3,
     'Makan pagi, siang, malam + snack sore (4 kali makan). Menu bergizi seimbang.', 'Konsumsi'),
    
    (v_sd_id, 'Pendidikan Internal (TPQ)', 'TPQ_SD', 75000, true, 4,
     'Pembelajaran Al-Quran (Tahfidz, Tahsin, Tajwid) dan dasar-dasar keagamaan', 'Pendidikan'),
    
    (v_sd_id, 'Kesehatan & Kebersihan', 'KESEHATAN_SD', 50000, true, 5,
     'Biaya UKS, obat-obatan dasar, kebersihan pribadi, dan pemeriksaan kesehatan rutin', 'Kesehatan'),
    
    (v_sd_id, 'Ekstrakurikuler', 'EKSKUL_SD', 50000, false, 6,
     'Kegiatan ekstrakurikuler: olahraga (futsal, badminton), seni (tilawah, rebana), pramuka', 'Kegiatan'),
    
    (v_sd_id, 'Laundry & Kebersihan', 'LAUNDRY_SD', 25000, false, 7,
     'Laundry pakaian 2x seminggu dan perlengkapan kebersihan kamar', 'Laundry')
    
  ON CONFLICT (program_id, kode_komponen) DO UPDATE
    SET tarif_per_bulan = EXCLUDED.tarif_per_bulan,
        nama_komponen = EXCLUDED.nama_komponen,
        deskripsi = EXCLUDED.deskripsi,
        updated_at = NOW();

  -- Total SD per bulan: 400k + 200k + 500k + 75k + 50k + 50k + 25k = 1.300.000

  -- ===================================================================
  -- 3. KOMPONEN BIAYA SMP MUKIM (Est. Total: Rp 1.600.000/bulan)
  -- ===================================================================
  RAISE NOTICE 'Setting up SMP Mukim components...';

  DELETE FROM komponen_biaya_program WHERE program_id = v_smp_id;

  INSERT INTO komponen_biaya_program (
    program_id, nama_komponen, kode_komponen, tarif_per_bulan,
    is_wajib, urutan, deskripsi, kategori_keuangan
  ) VALUES
    (v_smp_id, 'SPP Pendidikan Formal', 'SPP_FORMAL_SMP', 500000, true, 1,
     'Biaya SPP sekolah formal SMP per bulan dengan kurikulum nasional + muatan lokal', 'Pendidikan'),
    
    (v_smp_id, 'Asrama & Penginapan', 'ASRAMA_SMP', 250000, true, 2,
     'Biaya penginapan asrama dengan fasilitas kamar 4-6 orang, termasuk utilitas', 'Asrama'),
    
    (v_smp_id, 'Konsumsi (Makan 3x Sehari)', 'KONSUMSI_SMP', 600000, true, 3,
     'Makan dengan porsi remaja: sarapan, makan siang, malam + snack (menu bervariasi)', 'Konsumsi'),
    
    (v_smp_id, 'Pendidikan Internal (Madin)', 'MADIN_SMP', 100000, true, 4,
     'Madrasah Diniyah: Al-Quran, Fiqih, Hadits, Akhlaq, dan Bahasa Arab', 'Pendidikan'),
    
    (v_smp_id, 'Kesehatan & Kebersihan', 'KESEHATAN_SMP', 50000, true, 5,
     'Kesehatan dasar, obat-obatan, vitamin, dan check-up kesehatan berkala', 'Kesehatan'),
    
    (v_smp_id, 'Ekstrakurikuler', 'EKSKUL_SMP', 75000, false, 6,
     'Ekskul wajib (Pramuka) dan pilihan (Olahraga, Seni, Jurnalistik, OSIS)', 'Kegiatan'),
    
    (v_smp_id, 'Laundry & Kebersihan', 'LAUNDRY_SMP', 25000, false, 7,
     'Laundry 2x seminggu, sabun cuci, deterjen, dan peralatan kebersihan', 'Laundry')
    
  ON CONFLICT (program_id, kode_komponen) DO UPDATE
    SET tarif_per_bulan = EXCLUDED.tarif_per_bulan,
        nama_komponen = EXCLUDED.nama_komponen,
        deskripsi = EXCLUDED.deskripsi,
        updated_at = NOW();

  -- Total SMP per bulan: 500k + 250k + 600k + 100k + 50k + 75k + 25k = 1.600.000

  -- ===================================================================
  -- 4. KOMPONEN BIAYA SMA MUKIM (Est. Total: Rp 1.950.000/bulan)
  -- ===================================================================
  RAISE NOTICE 'Setting up SMA Mukim components...';

  DELETE FROM komponen_biaya_program WHERE program_id = v_sma_id;

  INSERT INTO komponen_biaya_program (
    program_id, nama_komponen, kode_komponen, tarif_per_bulan,
    is_wajib, urutan, deskripsi, kategori_keuangan
  ) VALUES
    (v_sma_id, 'SPP Pendidikan Formal', 'SPP_FORMAL_SMA', 600000, true, 1,
     'Biaya SPP SMA dengan program peminatan (IPA/IPS/Agama) dan persiapan UTBK', 'Pendidikan'),
    
    (v_sma_id, 'Asrama & Penginapan', 'ASRAMA_SMA', 300000, true, 2,
     'Asrama dengan fasilitas lebih baik, kamar 4 orang, wifi, dan ruang belajar', 'Asrama'),
    
    (v_sma_id, 'Konsumsi (Makan 3x Sehari)', 'KONSUMSI_SMA', 750000, true, 3,
     'Konsumsi dengan porsi dewasa dan menu bergizi tinggi untuk masa pertumbuhan', 'Konsumsi'),
    
    (v_sma_id, 'Pendidikan Internal (Madin)', 'MADIN_SMA', 125000, true, 4,
     'Pembelajaran kitab kuning, Ushul Fiqih, Tafsir, Hadits, dan Bahasa Arab tingkat lanjut', 'Pendidikan'),
    
    (v_sma_id, 'Internet & Pembelajaran Digital', 'INTERNET_SMA', 75000, true, 5,
     'Akses wifi untuk pembelajaran online, e-learning, dan riset akademik', 'Teknologi'),
    
    (v_sma_id, 'Kesehatan & Kebersihan', 'KESEHATAN_SMA', 50000, true, 6,
     'Asuransi kesehatan dasar, obat-obatan, vitamin, dan medical check-up', 'Kesehatan'),
    
    (v_sma_id, 'Ekstrakurikuler & Organisasi', 'EKSKUL_SMA', 50000, false, 7,
     'Kegiatan organisasi (OSIS, MPK), klub sains, bahasa, dan persiapan kompetisi', 'Kegiatan')
    
  ON CONFLICT (program_id, kode_komponen) DO UPDATE
    SET tarif_per_bulan = EXCLUDED.tarif_per_bulan,
        nama_komponen = EXCLUDED.nama_komponen,
        deskripsi = EXCLUDED.deskripsi,
        updated_at = NOW();

  -- Total SMA per bulan: 600k + 300k + 750k + 125k + 75k + 50k + 50k = 1.950.000

  RAISE NOTICE 'Component setup complete!';
  RAISE NOTICE '✅ SD Mukim: ~Rp 1.300.000/bulan';
  RAISE NOTICE '✅ SMP Mukim: ~Rp 1.600.000/bulan';
  RAISE NOTICE '✅ SMA Mukim: ~Rp 1.950.000/bulan';

END $$;

-- =====================================================================
-- 5. CREATE SANTRI_TABUNGAN TABLE (untuk reward prestasi)
-- =====================================================================

CREATE TABLE IF NOT EXISTS santri_tabungan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  
  -- Transaction details
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  jenis VARCHAR(30) NOT NULL CHECK (jenis IN (
    'Setoran',              -- Deposit manual
    'Penarikan',            -- Withdrawal
    'Reward Prestasi',      -- General reward
    'Reward Akademik',      -- Academic achievement
    'Reward Non-Akademik',  -- Non-academic (sports, art, etc)
    'Transfer Masuk',       -- Transfer in
    'Koreksi'              -- Correction
  )),
  
  nominal DECIMAL(15,2) NOT NULL CHECK (nominal > 0),
  
  -- Balance tracking (auto-calculated)
  saldo_sebelum DECIMAL(15,2) NOT NULL DEFAULT 0,
  saldo_sesudah DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  -- Reference tracking (for audit)
  referensi_id UUID,              -- Link to source record
  referensi_tabel VARCHAR(50),    -- Source table name
  referensi_keterangan TEXT,      -- Description of achievement/event
  
  -- Descriptions
  deskripsi TEXT NOT NULL,
  catatan TEXT,
  
  -- Admin tracking
  petugas_id UUID REFERENCES auth.users(id),
  petugas_nama VARCHAR(100),
  
  -- Bukti (optional)
  bukti_file TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_santri_tabungan_santri ON santri_tabungan(santri_id, tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_santri_tabungan_jenis ON santri_tabungan(jenis);
CREATE INDEX IF NOT EXISTS idx_santri_tabungan_tanggal ON santri_tabungan(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_santri_tabungan_referensi ON santri_tabungan(referensi_id, referensi_tabel);

-- RLS
ALTER TABLE santri_tabungan ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists, then create
DROP POLICY IF EXISTS "Allow authenticated all santri_tabungan" ON santri_tabungan;

CREATE POLICY "Allow authenticated all santri_tabungan"
  ON santri_tabungan FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE santri_tabungan IS 'Tabungan santri termasuk reward prestasi dengan full audit trail';
COMMENT ON COLUMN santri_tabungan.saldo_sebelum IS 'Saldo sebelum transaksi untuk audit';
COMMENT ON COLUMN santri_tabungan.saldo_sesudah IS 'Saldo setelah transaksi';
COMMENT ON COLUMN santri_tabungan.referensi_id IS 'Link ke record lain untuk traceability';

-- =====================================================================
-- 6. HELPER FUNCTIONS
-- =====================================================================

-- Function: Get beasiswa breakdown for santri (TRANSPARENCY)
CREATE OR REPLACE FUNCTION get_beasiswa_breakdown_santri(p_santri_id UUID)
RETURNS TABLE (
  -- Bundling
  total_bundling_bulanan DECIMAL,
  items_bundling JSON,
  
  -- Uang saku
  total_uang_saku_bulanan DECIMAL,
  
  -- Prestasi (dari tabungan)
  total_reward_prestasi DECIMAL,
  saldo_tabungan DECIMAL,
  
  -- Grand total
  grand_total_per_bulan DECIMAL,
  grand_total_per_tahun DECIMAL
) AS $$
DECLARE
  v_bundling DECIMAL := 0;
  v_uang_saku DECIMAL := 0;
  v_prestasi DECIMAL := 0;
  v_saldo DECIMAL := 0;
  v_items JSON;
BEGIN
  -- Calculate bundling dari komponen yang di-cover
  -- For now, calculate from santri's program
  SELECT 
    COALESCE(SUM(kb.tarif_per_bulan), 0),
    json_agg(json_build_object(
      'item', kb.nama_komponen,
      'kategori', kb.kategori_keuangan,
      'nilai', kb.tarif_per_bulan,
      'persentase', 100, -- Default 100% for now
      'nilai_final', kb.tarif_per_bulan,
      'deskripsi', kb.deskripsi,
      'is_wajib', kb.is_wajib
    ) ORDER BY kb.urutan)
  INTO v_bundling, v_items
  FROM santri_programs sp
  JOIN komponen_biaya_program kb ON kb.program_id = sp.program_id
  WHERE sp.santri_id = p_santri_id
    AND kb.is_wajib = true;

  -- Calculate uang saku from penerima_beasiswa
  SELECT COALESCE(SUM(pb.nominal_per_periode), 0)
  INTO v_uang_saku
  FROM penerima_beasiswa pb
  WHERE pb.santri_id = p_santri_id 
    AND pb.status = 'aktif';

  -- Calculate total reward prestasi from tabungan
  SELECT 
    COALESCE(SUM(CASE WHEN jenis LIKE 'Reward%' THEN nominal ELSE 0 END), 0),
    COALESCE(
      SUM(CASE 
        WHEN jenis IN ('Setoran', 'Reward Prestasi', 'Reward Akademik', 'Reward Non-Akademik', 'Transfer Masuk') 
        THEN nominal 
        ELSE -nominal 
      END), 
    0)
  INTO v_prestasi, v_saldo
  FROM santri_tabungan
  WHERE santri_id = p_santri_id;

  RETURN QUERY
  SELECT 
    v_bundling,
    v_items,
    v_uang_saku,
    v_prestasi,
    v_saldo,
    v_bundling + v_uang_saku,
    (v_bundling + v_uang_saku) * 12;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_beasiswa_breakdown_santri IS 
  'Get full breakdown beasiswa untuk transparansi: bundling + uang saku + prestasi';

-- Function: Create reward prestasi
CREATE OR REPLACE FUNCTION create_reward_prestasi(
  p_santri_id UUID,
  p_nominal DECIMAL,
  p_jenis VARCHAR DEFAULT 'Reward Prestasi',
  p_deskripsi TEXT DEFAULT NULL,
  p_referensi_id UUID DEFAULT NULL,
  p_referensi_tabel VARCHAR DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_saldo_lama DECIMAL;
  v_saldo_baru DECIMAL;
  v_tabungan_id UUID;
  v_santri_nama VARCHAR;
BEGIN
  -- Get santri name
  SELECT nama_lengkap INTO v_santri_nama 
  FROM santri WHERE id = p_santri_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', FALSE, 'message', 'Santri tidak ditemukan');
  END IF;
  
  -- Get saldo lama
  SELECT COALESCE(SUM(
    CASE 
      WHEN jenis IN ('Setoran', 'Reward Prestasi', 'Reward Akademik', 'Reward Non-Akademik', 'Transfer Masuk') 
      THEN nominal 
      ELSE -nominal 
    END
  ), 0)
  INTO v_saldo_lama
  FROM santri_tabungan
  WHERE santri_id = p_santri_id;
  
  v_saldo_baru := v_saldo_lama + p_nominal;
  
  -- Insert ke tabungan
  INSERT INTO santri_tabungan (
    santri_id,
    jenis,
    nominal,
    saldo_sebelum,
    saldo_sesudah,
    deskripsi,
    referensi_id,
    referensi_tabel,
    created_by
  ) VALUES (
    p_santri_id,
    p_jenis,
    p_nominal,
    v_saldo_lama,
    v_saldo_baru,
    COALESCE(p_deskripsi, 'Reward prestasi untuk ' || v_santri_nama),
    p_referensi_id,
    p_referensi_tabel,
    p_created_by
  )
  RETURNING id INTO v_tabungan_id;
  
  RETURN json_build_object(
    'success', TRUE,
    'tabungan_id', v_tabungan_id,
    'santri_nama', v_santri_nama,
    'nominal', p_nominal,
    'saldo_baru', v_saldo_baru,
    'message', 'Reward prestasi berhasil ditambahkan ke tabungan'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_reward_prestasi IS 
  'Create reward prestasi dan auto-update tabungan santri';

-- =====================================================================
-- 7. SUMMARY
-- =====================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '✅ SETUP BEASISWA TRANSPARAN COMPLETE!';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 PROGRAM CREATED:';
  RAISE NOTICE '   • Santri Mukim SD  : ~Rp 1.300.000/bulan';
  RAISE NOTICE '   • Santri Mukim SMP : ~Rp 1.600.000/bulan';
  RAISE NOTICE '   • Santri Mukim SMA : ~Rp 1.950.000/bulan';
  RAISE NOTICE '';
  RAISE NOTICE '📋 COMPONENTS:';
  RAISE NOTICE '   • Komponen biaya per program (7 items each)';
  RAISE NOTICE '   • Fully customizable tarif';
  RAISE NOTICE '   • Ready untuk beasiswa bundling';
  RAISE NOTICE '';
  RAISE NOTICE '💾 TABLES:';
  RAISE NOTICE '   • santri_tabungan (untuk reward prestasi)';
  RAISE NOTICE '   • Full audit trail enabled';
  RAISE NOTICE '';
  RAISE NOTICE '⚡ FUNCTIONS:';
  RAISE NOTICE '   • get_beasiswa_breakdown_santri()';
  RAISE NOTICE '   • create_reward_prestasi()';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 NEXT: Build UI untuk transparency!';
  RAISE NOTICE '========================================================';
END $$;

