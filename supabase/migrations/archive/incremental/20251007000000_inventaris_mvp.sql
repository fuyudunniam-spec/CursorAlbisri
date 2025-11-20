-- Extend transaksi_inventaris to support IN/OUT/ADJUST and add min_stock on inventaris

-- 1) Add min_stock to inventaris for low-stock alerts
ALTER TABLE IF EXISTS inventaris
ADD COLUMN IF NOT EXISTS min_stock INTEGER DEFAULT 10 CHECK (min_stock >= 0);

COMMENT ON COLUMN inventaris.min_stock IS 'Batas minimum stok untuk alert UI';

-- 2) Ensure transaksi types cover Masuk, Keluar, Stocktake (Adjust)
-- Add enum-like constraint values
ALTER TABLE IF EXISTS transaksi_inventaris
  DROP CONSTRAINT IF EXISTS transaksi_inventaris_tipe_check;

ALTER TABLE IF EXISTS transaksi_inventaris
  ADD CONSTRAINT transaksi_inventaris_tipe_check
  CHECK (tipe IN ('Masuk', 'Keluar', 'Stocktake'));

-- Optional fields for stocktake reference value
ALTER TABLE IF EXISTS transaksi_inventaris
  ADD COLUMN IF NOT EXISTS before_qty INTEGER,
  ADD COLUMN IF NOT EXISTS after_qty INTEGER;

-- 3) Create stock maintenance function (idempotent)
CREATE OR REPLACE FUNCTION public.apply_transaksi_to_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_qty INTEGER;
BEGIN
  -- Get current qty from inventaris
  SELECT jumlah INTO current_qty FROM inventaris WHERE id = NEW.item_id FOR UPDATE;

  IF TG_OP = 'INSERT' THEN
    IF NEW.tipe = 'Masuk' THEN
      UPDATE inventaris SET jumlah = COALESCE(current_qty, 0) + NEW.jumlah, updated_at = NOW() WHERE id = NEW.item_id;
    ELSIF NEW.tipe = 'Keluar' THEN
      UPDATE inventaris SET jumlah = GREATEST(COALESCE(current_qty, 0) - NEW.jumlah, 0), updated_at = NOW() WHERE id = NEW.item_id;
    ELSIF NEW.tipe = 'Stocktake' THEN
      -- Stocktake sets quantity to after_qty if provided; otherwise fallback to current logic
      IF NEW.after_qty IS NOT NULL THEN
        UPDATE inventaris SET jumlah = GREATEST(NEW.after_qty, 0), updated_at = NOW() WHERE id = NEW.item_id;
      ELSE
        -- If after_qty missing, treat as no-op to be safe
        NULL;
      END IF;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Recalculate delta between old and new rows to keep stock consistent
    IF NEW.item_id <> OLD.item_id THEN
      -- revert effect from OLD to old item
      IF OLD.tipe = 'Masuk' THEN
        UPDATE inventaris SET jumlah = GREATEST(COALESCE(jumlah,0) - OLD.jumlah, 0), updated_at = NOW() WHERE id = OLD.item_id;
      ELSIF OLD.tipe = 'Keluar' THEN
        UPDATE inventaris SET jumlah = COALESCE(jumlah,0) + OLD.jumlah, updated_at = NOW() WHERE id = OLD.item_id;
      ELSIF OLD.tipe = 'Stocktake' AND OLD.after_qty IS NOT NULL AND OLD.before_qty IS NOT NULL THEN
        UPDATE inventaris SET jumlah = GREATEST(OLD.before_qty, 0), updated_at = NOW() WHERE id = OLD.item_id;
      END IF;

      -- apply effect of NEW to new item
      IF NEW.tipe = 'Masuk' THEN
        UPDATE inventaris SET jumlah = COALESCE(jumlah,0) + NEW.jumlah, updated_at = NOW() WHERE id = NEW.item_id;
      ELSIF NEW.tipe = 'Keluar' THEN
        UPDATE inventaris SET jumlah = GREATEST(COALESCE(jumlah,0) - NEW.jumlah, 0), updated_at = NOW() WHERE id = NEW.item_id;
      ELSIF NEW.tipe = 'Stocktake' AND NEW.after_qty IS NOT NULL THEN
        UPDATE inventaris SET jumlah = GREATEST(NEW.after_qty, 0), updated_at = NOW() WHERE id = NEW.item_id;
      END IF;
    ELSE
      -- Same item, adjust by delta
      IF NEW.tipe IN ('Masuk','Keluar') THEN
        -- Remove old effect then apply new
        IF OLD.tipe = 'Masuk' THEN
          UPDATE inventaris SET jumlah = GREATEST(COALESCE(jumlah,0) - OLD.jumlah, 0), updated_at = NOW() WHERE id = NEW.item_id;
        ELSIF OLD.tipe = 'Keluar' THEN
          UPDATE inventaris SET jumlah = COALESCE(jumlah,0) + OLD.jumlah, updated_at = NOW() WHERE id = NEW.item_id;
        ELSIF OLD.tipe = 'Stocktake' AND OLD.before_qty IS NOT NULL THEN
          UPDATE inventaris SET jumlah = GREATEST(OLD.before_qty, 0), updated_at = NOW() WHERE id = NEW.item_id;
        END IF;

        IF NEW.tipe = 'Masuk' THEN
          UPDATE inventaris SET jumlah = COALESCE(jumlah,0) + NEW.jumlah, updated_at = NOW() WHERE id = NEW.item_id;
        ELSE
          UPDATE inventaris SET jumlah = GREATEST(COALESCE(jumlah,0) - NEW.jumlah, 0), updated_at = NOW() WHERE id = NEW.item_id;
        END IF;
      ELSE
        -- Stocktake overwrite with after_qty
        IF NEW.after_qty IS NOT NULL THEN
          UPDATE inventaris SET jumlah = GREATEST(NEW.after_qty, 0), updated_at = NOW() WHERE id = NEW.item_id;
        END IF;
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- Rollback the effect
    IF OLD.tipe = 'Masuk' THEN
      UPDATE inventaris SET jumlah = GREATEST(COALESCE(jumlah,0) - OLD.jumlah, 0), updated_at = NOW() WHERE id = OLD.item_id;
    ELSIF OLD.tipe = 'Keluar' THEN
      UPDATE inventaris SET jumlah = COALESCE(jumlah,0) + OLD.jumlah, updated_at = NOW() WHERE id = OLD.item_id;
    ELSIF OLD.tipe = 'Stocktake' AND OLD.before_qty IS NOT NULL THEN
      UPDATE inventaris SET jumlah = GREATEST(OLD.before_qty, 0), updated_at = NOW() WHERE id = OLD.item_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 4) Create triggers on transaksi_inventaris
DROP TRIGGER IF EXISTS transaksi_inventaris_apply_insert ON transaksi_inventaris;
DROP TRIGGER IF EXISTS transaksi_inventaris_apply_update ON transaksi_inventaris;
DROP TRIGGER IF EXISTS transaksi_inventaris_apply_delete ON transaksi_inventaris;

CREATE TRIGGER transaksi_inventaris_apply_insert
AFTER INSERT ON transaksi_inventaris
FOR EACH ROW
EXECUTE FUNCTION public.apply_transaksi_to_stock();

CREATE TRIGGER transaksi_inventaris_apply_update
AFTER UPDATE ON transaksi_inventaris
FOR EACH ROW
EXECUTE FUNCTION public.apply_transaksi_to_stock();

CREATE TRIGGER transaksi_inventaris_apply_delete
AFTER DELETE ON transaksi_inventaris
FOR EACH ROW
EXECUTE FUNCTION public.apply_transaksi_to_stock();

-- 5) RLS stays permissive per previous migration; no changes here


