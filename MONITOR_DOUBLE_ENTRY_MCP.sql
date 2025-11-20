-- =====================================================
-- MONITORING SCRIPT FOR DOUBLE ENTRY PREVENTION - MCP VERSION
-- =====================================================
-- Script untuk monitoring dan pencegahan double entry di masa depan

-- 1. CREATE: Function to detect potential double entries
-- =====================================================
CREATE OR REPLACE FUNCTION detect_potential_double_entry()
RETURNS TABLE (
    duplicate_count BIGINT,
    total_amount NUMERIC,
    categories TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as duplicate_count,
        SUM(k.jumlah) as total_amount,
        ARRAY_AGG(DISTINCT k.kategori) as categories
    FROM (
        SELECT
            kategori,
            jumlah,
            tanggal,
            referensi,
            COUNT(*) OVER (PARTITION BY kategori, jumlah, tanggal, referensi) as dup_count
        FROM keuangan
        WHERE jenis_transaksi = 'Pemasukan'
    ) k
    WHERE k.dup_count > 1;
END;
$$ LANGUAGE plpgsql;

-- 2. CREATE: Function to get financial summary with double entry check
-- =====================================================
CREATE OR REPLACE FUNCTION get_keuangan_summary_with_validation()
RETURNS TABLE (
    total_pemasukan NUMERIC,
    total_pengeluaran NUMERIC,
    saldo_akhir NUMERIC,
    potential_duplicates BIGINT,
    last_updated TIMESTAMP
) AS $$
DECLARE
    pemasukan_total NUMERIC := 0;
    pengeluaran_total NUMERIC := 0;
    duplicates_count BIGINT := 0;
BEGIN
    -- Get total pemasukan
    SELECT COALESCE(SUM(jumlah), 0) INTO pemasukan_total
    FROM keuangan 
    WHERE jenis_transaksi = 'Pemasukan';
    
    -- Get total pengeluaran
    SELECT COALESCE(SUM(jumlah), 0) INTO pengeluaran_total
    FROM keuangan 
    WHERE jenis_transaksi = 'Pengeluaran';
    
    -- Check for potential duplicates
    SELECT COUNT(*) INTO duplicates_count
    FROM (
        SELECT kategori, jumlah, tanggal, referensi
        FROM keuangan
        WHERE jenis_transaksi = 'Pemasukan'
        GROUP BY kategori, jumlah, tanggal, referensi
        HAVING COUNT(*) > 1
    ) duplicates;
    
    RETURN QUERY SELECT
        pemasukan_total,
        pengeluaran_total,
        (pemasukan_total - pengeluaran_total),
        duplicates_count,
        NOW();
END;
$$ LANGUAGE plpgsql;

-- 3. CREATE: View for real-time double entry monitoring
-- =====================================================
CREATE OR REPLACE VIEW v_double_entry_monitor AS
SELECT
    'POTENTIAL_DUPLICATES' as alert_type,
    k.kategori,
    k.referensi,
    k.jumlah,
    k.tanggal,
    COUNT(*) as duplicate_count,
    STRING_AGG(k.id::TEXT, ', ') as duplicate_ids
FROM keuangan k
WHERE k.jenis_transaksi = 'Pemasukan'
GROUP BY k.kategori, k.referensi, k.jumlah, k.tanggal
HAVING COUNT(*) > 1
ORDER BY k.tanggal DESC;

-- 4. CREATE: Trigger function to prevent double entries
-- =====================================================
CREATE OR REPLACE FUNCTION prevent_double_entry_trigger()
RETURNS TRIGGER AS $$
DECLARE
    existing_count INTEGER;
BEGIN
    -- Check for existing entries with same category, amount, and date
    SELECT COUNT(*) INTO existing_count
    FROM keuangan
    WHERE kategori = NEW.kategori
        AND jumlah = NEW.jumlah
        AND DATE(tanggal) = DATE(NEW.tanggal)
        AND jenis_transaksi = NEW.jenis_transaksi
        AND referensi = NEW.referensi
        AND id != COALESCE(NEW.id, 0);
    
    -- If duplicate found, raise exception
    IF existing_count > 0 THEN
        RAISE EXCEPTION 'Potential double entry detected: Same transaction already exists for category %, amount %, date %', 
            NEW.kategori, NEW.jumlah, NEW.tanggal;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. CREATE: Trigger to prevent double entries (optional - can be enabled/disabled)
-- =====================================================
-- Uncomment the lines below to enable automatic double entry prevention
-- DROP TRIGGER IF EXISTS prevent_double_entry ON keuangan;
-- CREATE TRIGGER prevent_double_entry
--     BEFORE INSERT OR UPDATE ON keuangan
--     FOR EACH ROW
--     EXECUTE FUNCTION prevent_double_entry_trigger();

-- 6. TEST: Run monitoring functions
-- =====================================================
SELECT 'DOUBLE ENTRY DETECTION' as test_type, * FROM detect_potential_double_entry();
SELECT 'FINANCIAL SUMMARY' as test_type, * FROM get_keuangan_summary_with_validation();
SELECT 'REAL-TIME MONITOR' as test_type, * FROM v_double_entry_monitor;
