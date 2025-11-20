-- =====================================================
-- SANTRI: Prefixed 8-char ID (KKYYNNNN) + Safe Backfill
-- Date: 2025-10-28
-- Notes:
-- - Format: [KodeKategori 2][Angkatan 2][Seq 4]
-- - KodeKategori: BM, BN, RG, MH
-- - Seq resets per (kategori_kode, angkatan)
-- - ID is immutable once set
-- =====================================================

-- 1) Ensure column and constraints
ALTER TABLE santri
  ADD COLUMN IF NOT EXISTS id_santri VARCHAR(8);

-- Add unique constraint if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'santri' AND constraint_name = 'santri_id_santri_key'
  ) THEN
    ALTER TABLE santri ADD CONSTRAINT santri_id_santri_key UNIQUE (id_santri);
  END IF;
END $$;

-- Optional: format check (only A-Z0-9, length 8)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'santri_id_santri_format_check'
  ) THEN
    ALTER TABLE santri
      ADD CONSTRAINT santri_id_santri_format_check
      CHECK (id_santri IS NULL OR (id_santri ~ '^[A-Z0-9]{8}$'));
  END IF;
END $$;

-- 2) Helper to normalize category to code
CREATE OR REPLACE FUNCTION fn_kode_kategori(p_kategori TEXT)
RETURNS TEXT AS $$
DECLARE
  v_norm TEXT := TRIM(LOWER(COALESCE(p_kategori, '')));
BEGIN
  -- Map various forms to canonical codes
  IF v_norm IN ('binaan mukim', 'santri binaan mukim', 'mukim', 'binaan-mukim') THEN
    RETURN 'BM';
  ELSIF v_norm IN ('binaan non-mukim', 'santri binaan non-mukim', 'non-mukim', 'binaan non mukim') THEN
    RETURN 'BN';
  ELSIF v_norm IN ('reguler', 'santri reguler', 'regular') THEN
    RETURN 'RG';
  ELSIF v_norm IN ('mahasantri', 'mahasiswa', 'mahasantri reguler', 'mahasantri beasiswa') THEN
    RETURN 'MH';
  END IF;
  -- Default fallback if unknown
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3) Helper to build ID string
CREATE OR REPLACE FUNCTION fn_gen_id_santri(p_kode TEXT, p_angkatan TEXT, p_seq INT)
RETURNS TEXT AS $$
DECLARE
  v_yy TEXT;
BEGIN
  IF p_kode IS NULL OR p_angkatan IS NULL OR LENGTH(p_angkatan) < 2 OR p_seq IS NULL THEN
    RETURN NULL;
  END IF;
  v_yy := RIGHT(p_angkatan, 2);
  RETURN CONCAT(p_kode, v_yy, LPAD(p_seq::TEXT, 4, '0'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4) Trigger: set ID on INSERT; never regenerate on UPDATE
CREATE OR REPLACE FUNCTION trg_set_id_santri()
RETURNS TRIGGER AS $$
DECLARE
  v_kode TEXT;
  v_seq INT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.id_santri IS NOT NULL THEN
      RETURN NEW; -- respect provided (though UI should not send it)
    END IF;
    v_kode := fn_kode_kategori(NEW.kategori);
    IF v_kode IS NOT NULL AND NEW.angkatan IS NOT NULL THEN
      SELECT COALESCE(MAX(CAST(SUBSTRING(id_santri FROM 5 FOR 4) AS INT)), 0) + 1
        INTO v_seq
      FROM santri
      WHERE id_santri IS NOT NULL
        AND SUBSTRING(id_santri FROM 1 FOR 2) = v_kode
        AND SUBSTRING(id_santri FROM 3 FOR 2) = RIGHT(NEW.angkatan, 2);

      NEW.id_santri := fn_gen_id_santri(v_kode, NEW.angkatan, v_seq);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Immutable: only fill if still NULL
    IF NEW.id_santri IS NULL THEN
      v_kode := fn_kode_kategori(NEW.kategori);
      IF v_kode IS NOT NULL AND NEW.angkatan IS NOT NULL THEN
        SELECT COALESCE(MAX(CAST(SUBSTRING(id_santri FROM 5 FOR 4) AS INT)), 0) + 1
          INTO v_seq
        FROM santri
        WHERE id_santri IS NOT NULL
          AND SUBSTRING(id_santri FROM 1 FOR 2) = v_kode
          AND SUBSTRING(id_santri FROM 3 FOR 2) = RIGHT(NEW.angkatan, 2);

        NEW.id_santri := fn_gen_id_santri(v_kode, NEW.angkatan, v_seq);
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_id_santri'
  ) THEN
    DROP TRIGGER set_id_santri ON santri;
  END IF;
END $$;

CREATE TRIGGER set_id_santri
BEFORE INSERT OR UPDATE ON santri
FOR EACH ROW
EXECUTE FUNCTION trg_set_id_santri();

-- 5) Backfill for existing rows (only those with angkatan and mappable kategori, and id_santri IS NULL)
WITH base AS (
  SELECT 
    id,
    fn_kode_kategori(kategori) AS kode,
    angkatan,
    created_at
  FROM santri
  WHERE id_santri IS NULL
), ranked AS (
  SELECT
    id,
    kode,
    angkatan,
    ROW_NUMBER() OVER (
      PARTITION BY kode, RIGHT(angkatan, 2)
      ORDER BY created_at, id
    ) AS seq
  FROM base
  WHERE kode IS NOT NULL AND angkatan IS NOT NULL
)
UPDATE santri s
SET id_santri = fn_gen_id_santri(r.kode, r.angkatan, r.seq)
FROM ranked r
WHERE s.id = r.id
  AND s.id_santri IS NULL;

-- 6) Report rows that could not be assigned (missing kategori/angkatan or unmapped kategori)
-- SELECT id, nama_lengkap, kategori, angkatan FROM santri WHERE id_santri IS NULL;

-- End of migration

