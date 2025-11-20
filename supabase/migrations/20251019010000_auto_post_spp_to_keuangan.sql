-- Migration: Auto-post SPP payments to Keuangan (Kas Utama)
-- This creates automatic posting of SPP payments to the main cash account

-- Add columns to pembayaran_santri if not exist
ALTER TABLE pembayaran_santri 
ADD COLUMN IF NOT EXISTS keuangan_id uuid REFERENCES keuangan(id),
ADD COLUMN IF NOT EXISTS posted_to_finance_at timestamptz;

-- Add columns to transaksi_inventaris if not exist
ALTER TABLE transaksi_inventaris 
ADD COLUMN IF NOT EXISTS keuangan_id uuid REFERENCES keuangan(id),
ADD COLUMN IF NOT EXISTS posted_to_finance_at timestamptz;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_pembayaran_santri_keuangan ON pembayaran_santri(keuangan_id);
CREATE INDEX IF NOT EXISTS idx_transaksi_inventaris_keuangan ON transaksi_inventaris(keuangan_id);

-- Create function to auto-post SPP payments
CREATE OR REPLACE FUNCTION auto_post_spp_to_keuangan()
RETURNS TRIGGER AS $$
DECLARE
  v_akun_kas_id uuid;
  v_keuangan_id uuid;
  v_santri_name text;
  v_santri_id_santri text;
BEGIN
  -- Get default akun kas (Kas Utama)
  SELECT id INTO v_akun_kas_id 
  FROM akun_kas 
  WHERE is_default = true AND status = 'aktif' 
  LIMIT 1;
  
  -- Get santri details for description
  SELECT nama_lengkap, id_santri INTO v_santri_name, v_santri_id_santri
  FROM santri
  WHERE id = NEW.santri_id;
  
  -- Insert into keuangan
  INSERT INTO keuangan (
    tanggal,
    jenis_transaksi,
    kategori,
    jumlah,
    deskripsi,
    akun_kas_id,
    status,
    source_module,
    source_id,
    auto_posted,
    created_at,
    updated_at
  ) VALUES (
    NEW.tanggal_bayar,
    'Pemasukan',
    'Pembayaran SPP',
    NEW.jumlah_bayar,
    'Pembayaran SPP - ' || COALESCE(v_santri_id_santri, v_santri_name),
    v_akun_kas_id,
    'posted',
    'pembayaran_spp',
    NEW.id::text,
    true,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_keuangan_id;
  
  -- Update pembayaran_santri with keuangan_id
  NEW.keuangan_id := v_keuangan_id;
  NEW.posted_to_finance_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-posting
DROP TRIGGER IF EXISTS trigger_auto_post_spp ON pembayaran_santri;
CREATE TRIGGER trigger_auto_post_spp
  BEFORE INSERT ON pembayaran_santri
  FOR EACH ROW
  EXECUTE FUNCTION auto_post_spp_to_keuangan();

-- Create cascade delete function
CREATE OR REPLACE FUNCTION delete_keuangan_on_spp_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete related keuangan entry if it exists
  IF OLD.keuangan_id IS NOT NULL THEN
    DELETE FROM keuangan WHERE id = OLD.keuangan_id;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create cascade delete trigger
DROP TRIGGER IF EXISTS trigger_delete_keuangan_on_spp_delete ON pembayaran_santri;
CREATE TRIGGER trigger_delete_keuangan_on_spp_delete
  AFTER DELETE ON pembayaran_santri
  FOR EACH ROW
  EXECUTE FUNCTION delete_keuangan_on_spp_delete();

-- Update v_riwayat_pemasukan view to include SPP payments
CREATE OR REPLACE VIEW v_riwayat_pemasukan AS
SELECT 
  'donasi' as source_type,
  d.id::text as source_id,
  d.donation_date as tanggal,
  d.cash_amount as jumlah,
  'Donasi dari ' || d.donor_name as deskripsi,
  'Donasi' as kategori,
  d.created_at
FROM donations d
WHERE d.donation_type = 'cash' AND d.keuangan_id IS NOT NULL

UNION ALL

SELECT 
  'inventaris' as source_type,
  i.id::text as source_id,
  i.updated_at::date as tanggal,
  COALESCE(ti.jumlah * ti.harga_satuan, 0) as jumlah,
  'Penjualan ' || i.nama_barang as deskripsi,
  'Penjualan Inventaris' as kategori,
  i.updated_at as created_at
FROM inventaris i
LEFT JOIN transaksi_inventaris ti ON ti.item_id = i.id
WHERE i.status_penjualan = 'Terjual' AND i.keuangan_id IS NOT NULL

UNION ALL

SELECT 
  'transaksi_inventaris' as source_type,
  ti.id::text as source_id,
  ti.tanggal as tanggal,
  ti.jumlah * ti.harga_satuan as jumlah,
  'Penjualan Inventaris - ' || COALESCE(i.nama_barang, 'Item') as deskripsi,
  'Penjualan Inventaris' as kategori,
  ti.created_at
FROM transaksi_inventaris ti
LEFT JOIN inventaris i ON i.id = ti.item_id
WHERE ti.keuangan_id IS NOT NULL

UNION ALL

SELECT 
  'pembayaran_spp' as source_type,
  ps.id::text as source_id,
  ps.tanggal_bayar as tanggal,
  ps.jumlah_bayar as jumlah,
  'Pembayaran SPP - ' || COALESCE(s.nama_lengkap, 'Santri') as deskripsi,
  'Pembayaran SPP' as kategori,
  ps.created_at
FROM pembayaran_santri ps
LEFT JOIN santri s ON s.id = ps.santri_id
WHERE ps.keuangan_id IS NOT NULL

ORDER BY tanggal DESC;

-- Add comments
COMMENT ON FUNCTION auto_post_spp_to_keuangan() IS 
  'Auto-post SPP payments to keuangan (Kas Utama) for unified financial tracking';

COMMENT ON FUNCTION delete_keuangan_on_spp_delete() IS 
  'Cascade delete keuangan entries when SPP payment is deleted';

COMMENT ON VIEW v_riwayat_pemasukan IS 
  'Unified view of all income sources: donations, inventory sales, and SPP payments';
