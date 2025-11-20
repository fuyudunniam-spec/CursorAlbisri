-- ================================================
-- DEBUG AND FIX SALDO FUNCTIONS
-- ================================================
-- Purpose: Create debugging and repair functions for account balances
-- Features: Balance verification, discrepancy detection, auto-fix functions
-- ================================================

-- ================================================
-- 1. DEBUG FUNCTIONS
-- ================================================

-- Function: Get detailed balance calculation for an account
CREATE OR REPLACE FUNCTION debug_akun_kas_balance(p_akun_kas_id UUID)
RETURNS TABLE(
  account_id UUID,
  account_nama VARCHAR,
  saldo_awal DECIMAL,
  total_pemasukan DECIMAL,
  total_pengeluaran DECIMAL,
  calculated_balance DECIMAL,
  stored_balance DECIMAL,
  discrepancy DECIMAL,
  transaction_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH balance_calc AS (
    SELECT 
      ak.id,
      ak.nama,
      ak.saldo_awal,
      COALESCE(SUM(CASE WHEN k.jenis_transaksi = 'Pemasukan' AND k.status = 'posted' THEN k.jumlah ELSE 0 END), 0) as total_pemasukan,
      COALESCE(SUM(CASE WHEN k.jenis_transaksi = 'Pengeluaran' AND k.status = 'posted' THEN k.jumlah ELSE 0 END), 0) as total_pengeluaran,
      ak.saldo_saat_ini,
      COUNT(k.id) as transaction_count
    FROM akun_kas ak
    LEFT JOIN keuangan k ON k.akun_kas_id = ak.id
    WHERE ak.id = p_akun_kas_id
    GROUP BY ak.id, ak.nama, ak.saldo_awal, ak.saldo_saat_ini
  )
  SELECT 
    bc.id,
    bc.nama,
    bc.saldo_awal,
    bc.total_pemasukan,
    bc.total_pengeluaran,
    (bc.saldo_awal + bc.total_pemasukan - bc.total_pengeluaran) as calculated_balance,
    bc.saldo_saat_ini as stored_balance,
    (bc.saldo_saat_ini - (bc.saldo_awal + bc.total_pemasukan - bc.total_pengeluaran)) as discrepancy,
    bc.transaction_count
  FROM balance_calc bc;
END;
$$ LANGUAGE plpgsql;

-- Function: Get all accounts with balance discrepancies
CREATE OR REPLACE FUNCTION debug_all_balance_discrepancies()
RETURNS TABLE(
  account_id UUID,
  account_nama VARCHAR,
  calculated_balance DECIMAL,
  stored_balance DECIMAL,
  discrepancy DECIMAL,
  transaction_count BIGINT,
  last_transaction_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH balance_calc AS (
    SELECT 
      ak.id,
      ak.nama,
      ak.saldo_awal,
      COALESCE(SUM(CASE WHEN k.jenis_transaksi = 'Pemasukan' AND k.status = 'posted' THEN k.jumlah ELSE 0 END), 0) as total_pemasukan,
      COALESCE(SUM(CASE WHEN k.jenis_transaksi = 'Pengeluaran' AND k.status = 'posted' THEN k.jumlah ELSE 0 END), 0) as total_pengeluaran,
      ak.saldo_saat_ini,
      COUNT(k.id) as transaction_count,
      MAX(k.created_at) as last_transaction_date
    FROM akun_kas ak
    LEFT JOIN keuangan k ON k.akun_kas_id = ak.id
    WHERE ak.status = 'aktif'
    GROUP BY ak.id, ak.nama, ak.saldo_awal, ak.saldo_saat_ini
  )
  SELECT 
    bc.id,
    bc.nama,
    (bc.saldo_awal + bc.total_pemasukan - bc.total_pengeluaran) as calculated_balance,
    bc.saldo_saat_ini as stored_balance,
    (bc.saldo_saat_ini - (bc.saldo_awal + bc.total_pemasukan - bc.total_pengeluaran)) as discrepancy,
    bc.transaction_count,
    bc.last_transaction_date
  FROM balance_calc bc
  WHERE ABS(bc.saldo_saat_ini - (bc.saldo_awal + bc.total_pemasukan - bc.total_pengeluaran)) > 0.01
  ORDER BY ABS(discrepancy) DESC;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 2. FIX FUNCTIONS
-- ================================================

-- Function: Fix balance for a specific account
CREATE OR REPLACE FUNCTION fix_akun_kas_balance(p_akun_kas_id UUID)
RETURNS TABLE(
  account_id UUID,
  old_balance DECIMAL,
  new_balance DECIMAL,
  fixed BOOLEAN
) AS $$
DECLARE
  v_old_balance DECIMAL;
  v_new_balance DECIMAL;
  v_calculated_balance DECIMAL;
BEGIN
  -- Get current stored balance
  SELECT saldo_saat_ini INTO v_old_balance
  FROM akun_kas
  WHERE id = p_akun_kas_id;
  
  -- Calculate correct balance
  SELECT calculate_saldo_akun_kas(p_akun_kas_id) INTO v_calculated_balance;
  
  -- Update balance if different
  IF ABS(v_old_balance - v_calculated_balance) > 0.01 THEN
    UPDATE akun_kas
    SET saldo_saat_ini = v_calculated_balance,
        updated_at = NOW()
    WHERE id = p_akun_kas_id;
    
    v_new_balance := v_calculated_balance;
  ELSE
    v_new_balance := v_old_balance;
  END IF;
  
  RETURN QUERY
  SELECT 
    p_akun_kas_id,
    v_old_balance,
    v_new_balance,
    (ABS(v_old_balance - v_new_balance) > 0.01) as fixed;
END;
$$ LANGUAGE plpgsql;

-- Function: Fix all account balances
CREATE OR REPLACE FUNCTION fix_all_akun_kas_balances()
RETURNS TABLE(
  account_id UUID,
  account_nama VARCHAR,
  old_balance DECIMAL,
  new_balance DECIMAL,
  fixed BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH accounts_to_fix AS (
    SELECT ak.id, ak.nama, ak.saldo_saat_ini
    FROM akun_kas ak
    WHERE ak.status = 'aktif'
  ),
  fixed_accounts AS (
    SELECT 
      atf.id,
      atf.nama,
      atf.saldo_saat_ini as old_balance,
      calculate_saldo_akun_kas(atf.id) as calculated_balance
    FROM accounts_to_fix atf
  )
  UPDATE akun_kas
  SET saldo_saat_ini = fa.calculated_balance,
      updated_at = NOW()
  FROM fixed_accounts fa
  WHERE akun_kas.id = fa.id
    AND ABS(akun_kas.saldo_saat_ini - fa.calculated_balance) > 0.01
  RETURNING 
    akun_kas.id,
    akun_kas.nama,
    fa.old_balance,
    akun_kas.saldo_saat_ini as new_balance,
    true as fixed;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 3. VERIFICATION FUNCTIONS
-- ================================================

-- Function: Verify all balances are correct
CREATE OR REPLACE FUNCTION verify_all_balances()
RETURNS TABLE(
  total_accounts BIGINT,
  correct_balances BIGINT,
  incorrect_balances BIGINT,
  total_discrepancy DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH balance_check AS (
    SELECT 
      COUNT(*) as total_accounts,
      COUNT(CASE WHEN ABS(ak.saldo_saat_ini - calculate_saldo_akun_kas(ak.id)) <= 0.01 THEN 1 END) as correct_balances,
      COUNT(CASE WHEN ABS(ak.saldo_saat_ini - calculate_saldo_akun_kas(ak.id)) > 0.01 THEN 1 END) as incorrect_balances,
      SUM(ABS(ak.saldo_saat_ini - calculate_saldo_akun_kas(ak.id))) as total_discrepancy
    FROM akun_kas ak
    WHERE ak.status = 'aktif'
  )
  SELECT * FROM balance_check;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 4. MAINTENANCE FUNCTIONS
-- ================================================

-- Function: Recalculate all balances (force refresh)
CREATE OR REPLACE FUNCTION recalculate_all_balances()
RETURNS void AS $$
BEGIN
  UPDATE akun_kas
  SET saldo_saat_ini = calculate_saldo_akun_kas(id),
      updated_at = NOW()
  WHERE status = 'aktif';
END;
$$ LANGUAGE plpgsql;

-- Function: Get balance history for an account
CREATE OR REPLACE FUNCTION get_balance_history(p_akun_kas_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE(
  date DATE,
  running_balance DECIMAL,
  daily_pemasukan DECIMAL,
  daily_pengeluaran DECIMAL,
  transaction_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_transactions AS (
    SELECT 
      k.tanggal::DATE as date,
      SUM(CASE WHEN k.jenis_transaksi = 'Pemasukan' AND k.status = 'posted' THEN k.jumlah ELSE 0 END) as daily_pemasukan,
      SUM(CASE WHEN k.jenis_transaksi = 'Pengeluaran' AND k.status = 'posted' THEN k.jumlah ELSE 0 END) as daily_pengeluaran,
      COUNT(k.id) as transaction_count
    FROM keuangan k
    WHERE k.akun_kas_id = p_akun_kas_id
      AND k.tanggal >= CURRENT_DATE - INTERVAL '1 day' * p_days
    GROUP BY k.tanggal::DATE
  ),
  balance_calc AS (
    SELECT 
      dt.date,
      dt.daily_pemasukan,
      dt.daily_pengeluaran,
      dt.transaction_count,
      SUM(dt.daily_pemasukan - dt.daily_pengeluaran) OVER (
        ORDER BY dt.date 
        ROWS UNBOUNDED PRECEDING
      ) as running_balance
    FROM daily_transactions dt
  )
  SELECT 
    bc.date,
    (ak.saldo_awal + bc.running_balance) as running_balance,
    bc.daily_pemasukan,
    bc.daily_pengeluaran,
    bc.transaction_count
  FROM balance_calc bc
  CROSS JOIN akun_kas ak
  WHERE ak.id = p_akun_kas_id
  ORDER BY bc.date;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 5. COMMENTS
-- ================================================
COMMENT ON FUNCTION debug_akun_kas_balance IS 'Debug balance calculation for specific account';
COMMENT ON FUNCTION debug_all_balance_discrepancies IS 'Find all accounts with balance discrepancies';
COMMENT ON FUNCTION fix_akun_kas_balance IS 'Fix balance for specific account';
COMMENT ON FUNCTION fix_all_akun_kas_balances IS 'Fix all account balances';
COMMENT ON FUNCTION verify_all_balances IS 'Verify all balances are correct';
COMMENT ON FUNCTION recalculate_all_balances IS 'Force recalculate all balances';
COMMENT ON FUNCTION get_balance_history IS 'Get balance history for account';
