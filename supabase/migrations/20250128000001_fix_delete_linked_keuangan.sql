-- =====================================================
-- FIX DELETE LINKED KEUANGAN ERROR
-- =====================================================
-- Description: Fix error when deleting inventory transactions due to circular dependency between triggers
-- Date: 2025-01-28
-- Issue: prevent_delete_linked_keuangan blocks cascade delete from transaksi_inventaris
-- Solution: Allow deletion of auto_posted entries (system-generated) while protecting manual entries
-- =====================================================

-- =====================================================
-- 1. UPDATE PREVENT DELETE FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION prevent_delete_linked_keuangan()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow deletion if entry was auto-posted (system generated)
  -- This allows cascade deletes from source modules while protecting manual entries
  IF OLD.auto_posted = TRUE THEN
    RETURN OLD;
  END IF;
  
  -- Cegah hapus transaksi keuangan yang ter-link ke modul sumber
  -- hanya untuk entry manual (bukan auto-posted)
  IF OLD.source_module IS NOT NULL AND OLD.source_id IS NOT NULL THEN
    RAISE EXCEPTION 'Tidak dapat menghapus transaksi keuangan yang terhubung ke %. Hapus dari modul sumber terlebih dahulu.', OLD.source_module;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. ADD COMMENTS
-- =====================================================

COMMENT ON FUNCTION prevent_delete_linked_keuangan IS 'Prevent deletion of manually created linked keuangan entries, but allow deletion of auto-posted system entries';

-- =====================================================
-- 3. VERIFICATION QUERIES (for testing)
-- =====================================================

-- Check function was updated correctly
-- SELECT prosrc FROM pg_proc WHERE proname = 'prevent_delete_linked_keuangan';

-- Check auto_posted entries that should be deletable
-- SELECT id, referensi, auto_posted, source_module FROM keuangan WHERE auto_posted = TRUE LIMIT 5;

-- =====================================================
-- FIX COMPLETE
-- =====================================================
