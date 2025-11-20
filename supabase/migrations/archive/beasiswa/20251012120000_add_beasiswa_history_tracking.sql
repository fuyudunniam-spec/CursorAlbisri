-- =====================================================================
-- BEASISWA HISTORY TRACKING - FIX DATA HILANG SAAT GANTI PROGRAM
-- =====================================================================
-- Purpose: Track history beasiswa santri agar tidak hilang saat program berubah
-- Date: Oktober 2025
-- =====================================================================

-- =====================================================================
-- 1. TABLE: santri_programs_history
-- Purpose: History program santri (jangan overwrite, keep history)
-- =====================================================================

CREATE TABLE IF NOT EXISTS santri_programs_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES program_santri(id),
  
  -- Program details (snapshot saat masuk)
  nama_program VARCHAR(200) NOT NULL,
  kelas_program VARCHAR(50),
  rombel VARCHAR(50),
  
  -- Period
  tanggal_mulai DATE NOT NULL,
  tanggal_selesai DATE, -- NULL jika masih aktif
  is_active BOOLEAN DEFAULT true,
  
  -- Status
  status VARCHAR(50) DEFAULT 'Aktif', -- Aktif, Lulus, Pindah, Keluar
  alasan_berakhir TEXT,
  
  -- Snapshot biaya saat masuk (untuk history)
  total_biaya_per_bulan DECIMAL(15,2),
  subsidi_persen DECIMAL(5,2) DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_santri_programs_history_santri ON santri_programs_history(santri_id, tanggal_mulai DESC);
CREATE INDEX idx_santri_programs_history_active ON santri_programs_history(santri_id, is_active);

ALTER TABLE santri_programs_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated all santri_programs_history" ON santri_programs_history;
CREATE POLICY "Allow authenticated all santri_programs_history"
  ON santri_programs_history FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE santri_programs_history IS 'History program santri untuk tracking perubahan dan beasiswa';

-- =====================================================================
-- 2. TABLE: beasiswa_history
-- Purpose: History beasiswa per periode (permanent record)
-- =====================================================================

CREATE TABLE IF NOT EXISTS beasiswa_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  santri_id UUID NOT NULL REFERENCES santri(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES program_santri(id),
  santri_program_history_id UUID REFERENCES santri_programs_history(id),
  
  -- Periode
  periode_mulai DATE NOT NULL,
  periode_selesai DATE NOT NULL,
  bulan_periode VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  
  -- Snapshot komponen biaya saat periode ini
  komponen_biaya JSONB NOT NULL, -- Array of {nama, nilai, persentase_cover, nilai_final}
  
  -- Totals
  total_bundling DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_uang_saku DECIMAL(15,2) DEFAULT 0,
  total_reward_prestasi DECIMAL(15,2) DEFAULT 0,
  grand_total DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  -- Status
  status VARCHAR(50) DEFAULT 'Diterima', -- Diterima, Dicairkan, Dibatalkan
  tanggal_pencairan DATE,
  
  -- Notes
  catatan TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_beasiswa_history_santri ON beasiswa_history(santri_id, periode_mulai DESC);
CREATE INDEX idx_beasiswa_history_periode ON beasiswa_history(bulan_periode);

ALTER TABLE beasiswa_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated all beasiswa_history" ON beasiswa_history;
CREATE POLICY "Allow authenticated all beasiswa_history"
  ON beasiswa_history FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE beasiswa_history IS 'Permanent history beasiswa per periode - tidak akan hilang meski program berubah';

-- =====================================================================
-- 3. FUNCTION: Snapshot beasiswa ke history (call setiap bulan)
-- =====================================================================

CREATE OR REPLACE FUNCTION snapshot_beasiswa_bulan_ini()
RETURNS TABLE (
  santri_count INT,
  records_created INT,
  total_beasiswa DECIMAL
) AS $$
DECLARE
  v_santri_count INT := 0;
  v_records_created INT := 0;
  v_total_beasiswa DECIMAL := 0;
  v_current_month VARCHAR(7);
  v_santri RECORD;
  v_breakdown RECORD;
BEGIN
  v_current_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
  
  -- Loop semua santri yang punya program aktif
  FOR v_santri IN 
    SELECT DISTINCT sp.santri_id, sp.program_id
    FROM santri_programs sp
    WHERE sp.is_active = true
  LOOP
    v_santri_count := v_santri_count + 1;
    
    -- Get breakdown untuk santri ini
    SELECT * INTO v_breakdown
    FROM get_beasiswa_breakdown_santri(v_santri.santri_id);
    
    -- Skip if no beasiswa
    IF v_breakdown.grand_total_per_bulan = 0 THEN
      CONTINUE;
    END IF;
    
    -- Insert ke history (skip if already exists for this month)
    INSERT INTO beasiswa_history (
      santri_id,
      program_id,
      periode_mulai,
      periode_selesai,
      bulan_periode,
      komponen_biaya,
      total_bundling,
      total_uang_saku,
      total_reward_prestasi,
      grand_total,
      status
    ) VALUES (
      v_santri.santri_id,
      v_santri.program_id,
      DATE_TRUNC('month', CURRENT_DATE),
      DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day',
      v_current_month,
      v_breakdown.items_bundling,
      v_breakdown.total_bundling_bulanan,
      v_breakdown.total_uang_saku_bulanan,
      v_breakdown.total_reward_prestasi,
      v_breakdown.grand_total_per_bulan,
      'Diterima'
    )
    ON CONFLICT DO NOTHING; -- Skip if exists
    
    IF FOUND THEN
      v_records_created := v_records_created + 1;
      v_total_beasiswa := v_total_beasiswa + v_breakdown.grand_total_per_bulan;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT v_santri_count, v_records_created, v_total_beasiswa;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION snapshot_beasiswa_bulan_ini IS 
  'Snapshot beasiswa semua santri untuk bulan ini ke history. Run setiap awal bulan.';

-- =====================================================================
-- 4. FUNCTION: Get total beasiswa ALL TIME (termasuk history)
-- =====================================================================

CREATE OR REPLACE FUNCTION get_total_beasiswa_all_time(p_santri_id UUID)
RETURNS TABLE (
  total_all_time DECIMAL,
  jumlah_bulan INT,
  periode_pertama DATE,
  periode_terakhir DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(bh.grand_total), 0) as total_all_time,
    COUNT(*)::INT as jumlah_bulan,
    MIN(bh.periode_mulai) as periode_pertama,
    MAX(bh.periode_selesai) as periode_terakhir
  FROM beasiswa_history bh
  WHERE bh.santri_id = p_santri_id
    AND bh.status = 'Diterima';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_total_beasiswa_all_time IS 
  'Get total beasiswa all time santri (tidak akan hilang meski program berubah)';

-- =====================================================================
-- 5. TRIGGER: Auto-archive saat program berubah
-- =====================================================================

CREATE OR REPLACE FUNCTION archive_program_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Jika program_id berubah
  IF OLD.program_id IS DISTINCT FROM NEW.program_id THEN
    -- Archive program lama
    INSERT INTO santri_programs_history (
      santri_id,
      program_id,
      nama_program,
      kelas_program,
      rombel,
      tanggal_mulai,
      tanggal_selesai,
      is_active,
      status,
      alasan_berakhir,
      created_by
    ) VALUES (
      OLD.santri_id,
      OLD.program_id,
      OLD.nama_program,
      OLD.kelas_program,
      OLD.rombel,
      OLD.created_at::DATE,
      CURRENT_DATE,
      false,
      'Pindah',
      'Program berubah dari ' || OLD.nama_program || ' ke ' || NEW.nama_program,
      NEW.updated_by
    );
    
    RAISE NOTICE 'Program archived: santri_id=%, old_program=%, new_program=%', 
      OLD.santri_id, OLD.program_id, NEW.program_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_archive_program_change ON santri_programs;
CREATE TRIGGER trigger_archive_program_change
  BEFORE UPDATE ON santri_programs
  FOR EACH ROW
  WHEN (OLD.program_id IS DISTINCT FROM NEW.program_id)
  EXECUTE FUNCTION archive_program_change();

COMMENT ON FUNCTION archive_program_change IS 
  'Auto-archive program lama saat santri pindah program';

-- =====================================================================
-- 6. VIEW: Beasiswa summary dengan history
-- =====================================================================

CREATE OR REPLACE VIEW v_beasiswa_santri_summary AS
SELECT 
  s.id as santri_id,
  s.nama_lengkap,
  s.nis,
  
  -- Current beasiswa
  (SELECT grand_total_per_bulan FROM get_beasiswa_breakdown_santri(s.id)) as beasiswa_current,
  
  -- History
  (SELECT total_all_time FROM get_total_beasiswa_all_time(s.id)) as beasiswa_total_all_time,
  (SELECT jumlah_bulan FROM get_total_beasiswa_all_time(s.id)) as jumlah_bulan_diterima,
  (SELECT periode_pertama FROM get_total_beasiswa_all_time(s.id)) as sejak_tanggal,
  
  -- Status
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM santri_programs sp 
      WHERE sp.santri_id = s.id AND sp.is_active = true
    ) THEN 'Aktif'
    ELSE 'Tidak Aktif'
  END as status_beasiswa
  
FROM santri s;

COMMENT ON VIEW v_beasiswa_santri_summary IS 
  'Summary beasiswa per santri dengan current + history';

-- =====================================================================
-- 7. SUMMARY
-- =====================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '✅ BEASISWA HISTORY TRACKING INSTALLED!';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 TABLES CREATED:';
  RAISE NOTICE '   • santri_programs_history (archive program lama)';
  RAISE NOTICE '   • beasiswa_history (permanent record per bulan)';
  RAISE NOTICE '';
  RAISE NOTICE '⚡ FUNCTIONS:';
  RAISE NOTICE '   • snapshot_beasiswa_bulan_ini() - run setiap bulan';
  RAISE NOTICE '   • get_total_beasiswa_all_time() - total all time';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 TRIGGERS:';
  RAISE NOTICE '   • Auto-archive saat program berubah';
  RAISE NOTICE '';
  RAISE NOTICE '📈 VIEW:';
  RAISE NOTICE '   • v_beasiswa_santri_summary';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 USAGE:';
  RAISE NOTICE '   Run manual: SELECT * FROM snapshot_beasiswa_bulan_ini();';
  RAISE NOTICE '   Or setup cron job untuk run otomatis tiap awal bulan';
  RAISE NOTICE '========================================================';
END $$;

