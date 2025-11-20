-- Cleanup Duplicate Keuangan Entries Migration
-- This migration cleans up existing duplicate entries in the keuangan table

-- Create temporary table to identify duplicates
CREATE TEMP TABLE duplicate_keuangan AS
SELECT 
  kategori,
  deskripsi,
  tanggal,
  jumlah,
  array_agg(id ORDER BY created_at) as ids,
  COUNT(*) as duplicate_count
FROM keuangan
WHERE kategori = 'Penjualan Inventaris'
  AND deskripsi LIKE 'Auto-post dari penjualan%'
GROUP BY kategori, deskripsi, tanggal, jumlah
HAVING COUNT(*) > 1;

-- Log what will be deleted
DO $$
DECLARE
  v_total_duplicates INTEGER;
  v_total_entries INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_duplicates FROM duplicate_keuangan;
  SELECT SUM(duplicate_count - 1) INTO v_total_entries FROM duplicate_keuangan;
  
  RAISE NOTICE 'Found % duplicate groups with % total duplicate entries to delete', v_total_duplicates, v_total_entries;
END $$;

-- Delete duplicates, keep the first one (oldest)
DELETE FROM keuangan
WHERE id IN (
  SELECT unnest(ids[2:]) -- Keep first, delete rest
  FROM duplicate_keuangan
);

-- Log what was deleted
DO $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % duplicate keuangan entries', v_deleted_count;
END $$;

-- Create monitoring function for duplicate detection
CREATE OR REPLACE FUNCTION get_duplicate_keuangan_summary()
RETURNS TABLE (
  kategori TEXT,
  deskripsi TEXT,
  tanggal DATE,
  jumlah NUMERIC,
  duplicate_count BIGINT,
  ids UUID[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    k.kategori,
    k.deskripsi,
    k.tanggal::DATE,
    k.jumlah,
    COUNT(*)::BIGINT as duplicate_count,
    array_agg(k.id) as ids
  FROM keuangan k
  WHERE k.kategori IN ('Penjualan Inventaris', 'Donasi')
    AND k.referensi IS NOT NULL
  GROUP BY k.kategori, k.deskripsi, k.tanggal::DATE, k.jumlah
  HAVING COUNT(*) > 1
  ORDER BY duplicate_count DESC, k.tanggal DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_duplicate_keuangan_summary() TO authenticated;

-- Create alert function for double entry detection
CREATE OR REPLACE FUNCTION create_double_entry_alert(
  p_transaction_type VARCHAR(50),
  p_transaction_id VARCHAR(100),
  p_amount NUMERIC,
  p_description TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_alert_id UUID;
BEGIN
  -- Insert alert into a hypothetical alerts table (if it exists)
  -- For now, just log the alert
  RAISE WARNING 'DOUBLE ENTRY ALERT: % transaction % with amount % - %', 
    p_transaction_type, p_transaction_id, p_amount, p_description;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_double_entry_alert(VARCHAR, VARCHAR, NUMERIC, TEXT) TO authenticated;

-- Update existing keuangan entries to have proper status
UPDATE keuangan 
SET status = 'posted' 
WHERE status = 'draft' 
  AND kategori = 'Penjualan Inventaris'
  AND deskripsi LIKE 'Auto-post dari penjualan%';

-- Log the update
DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % keuangan entries from draft to posted status', v_updated_count;
END $$;
