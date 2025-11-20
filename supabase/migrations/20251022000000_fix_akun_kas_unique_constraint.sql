-- ================================================
-- FIX AKUN KAS UNIQUE CONSTRAINT
-- ================================================
-- Purpose: Allow reuse of nama and kode for deleted accounts
-- Features: Partial unique constraints, restore deleted accounts
-- ================================================

-- ================================================
-- 1. DROP EXISTING UNIQUE CONSTRAINTS
-- ================================================

-- Drop existing unique constraints
ALTER TABLE akun_kas DROP CONSTRAINT IF EXISTS akun_kas_nama_key;
ALTER TABLE akun_kas DROP CONSTRAINT IF EXISTS akun_kas_kode_key;

-- ================================================
-- 2. CREATE PARTIAL UNIQUE CONSTRAINTS
-- ================================================

-- Create partial unique constraint for nama (only for active accounts)
CREATE UNIQUE INDEX akun_kas_nama_unique_active 
ON akun_kas(nama) 
WHERE status = 'aktif';

-- Create partial unique constraint for kode (only for active accounts)
CREATE UNIQUE INDEX akun_kas_kode_unique_active 
ON akun_kas(kode) 
WHERE status = 'aktif';

-- ================================================
-- 3. UPDATE AKUN KAS SERVICE LOGIC
-- ================================================

-- Function: Check if account with same name exists (deleted)
CREATE OR REPLACE FUNCTION check_deleted_account_exists(
  p_nama VARCHAR(100),
  p_kode VARCHAR(20)
)
RETURNS TABLE(
  account_id UUID,
  account_nama VARCHAR(100),
  account_kode VARCHAR(20),
  account_status VARCHAR(20)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ak.id,
    ak.nama,
    ak.kode,
    ak.status
  FROM akun_kas ak
  WHERE ak.nama = p_nama 
    AND ak.kode = p_kode
    AND ak.status IN ('ditutup', 'suspended');
END;
$$ LANGUAGE plpgsql;

-- Function: Restore deleted account
CREATE OR REPLACE FUNCTION restore_deleted_account(
  p_account_id UUID,
  p_new_data JSONB
)
RETURNS akun_kas AS $$
DECLARE
  result akun_kas;
BEGIN
  UPDATE akun_kas
  SET 
    nama = COALESCE((p_new_data->>'nama')::VARCHAR(100), nama),
    kode = COALESCE((p_new_data->>'kode')::VARCHAR(20), kode),
    tipe = COALESCE((p_new_data->>'tipe')::VARCHAR(20), tipe),
    nomor_rekening = COALESCE((p_new_data->>'nomor_rekening')::VARCHAR(50), nomor_rekening),
    nama_bank = COALESCE((p_new_data->>'nama_bank')::VARCHAR(100), nama_bank),
    atas_nama = COALESCE((p_new_data->>'atas_nama')::VARCHAR(100), atas_nama),
    saldo_awal = COALESCE((p_new_data->>'saldo_awal')::DECIMAL(15,2), saldo_awal),
    saldo_saat_ini = COALESCE((p_new_data->>'saldo_awal')::DECIMAL(15,2), saldo_awal),
    is_default = COALESCE((p_new_data->>'is_default')::BOOLEAN, is_default),
    status = 'aktif',
    updated_at = NOW()
  WHERE id = p_account_id
  RETURNING * INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 4. COMMENTS
-- ================================================
COMMENT ON INDEX akun_kas_nama_unique_active IS 'Ensures nama is unique only among active accounts';
COMMENT ON INDEX akun_kas_kode_unique_active IS 'Ensures kode is unique only among active accounts';
COMMENT ON FUNCTION check_deleted_account_exists IS 'Check if deleted account with same name/kode exists';
COMMENT ON FUNCTION restore_deleted_account IS 'Restore deleted account with new data';
