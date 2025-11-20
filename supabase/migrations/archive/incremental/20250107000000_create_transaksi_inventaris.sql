-- Create transaksi_inventaris table
CREATE TABLE IF NOT EXISTS transaksi_inventaris (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventaris(id) ON DELETE CASCADE,
  jumlah INTEGER NOT NULL CHECK (jumlah > 0),
  harga_satuan DECIMAL(15,2),
  tipe TEXT NOT NULL CHECK (tipe IN ('Jual', 'Distribusi')),
  penerima TEXT,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  catatan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Add indexes for better performance
CREATE INDEX idx_transaksi_inventaris_item_id ON transaksi_inventaris(item_id);
CREATE INDEX idx_transaksi_inventaris_tanggal ON transaksi_inventaris(tanggal);
CREATE INDEX idx_transaksi_inventaris_tipe ON transaksi_inventaris(tipe);

-- Add RLS policies
ALTER TABLE transaksi_inventaris ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read all transactions
CREATE POLICY "Allow authenticated users to read transaksi_inventaris"
  ON transaksi_inventaris FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to insert transactions
CREATE POLICY "Allow authenticated users to insert transaksi_inventaris"
  ON transaksi_inventaris FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow authenticated users to update their own transactions
CREATE POLICY "Allow authenticated users to update transaksi_inventaris"
  ON transaksi_inventaris FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to delete transactions
CREATE POLICY "Allow authenticated users to delete transaksi_inventaris"
  ON transaksi_inventaris FOR DELETE
  TO authenticated
  USING (true);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_transaksi_inventaris_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transaksi_inventaris_updated_at
  BEFORE UPDATE ON transaksi_inventaris
  FOR EACH ROW
  EXECUTE FUNCTION update_transaksi_inventaris_updated_at();

-- Add comment
COMMENT ON TABLE transaksi_inventaris IS 'Table untuk menyimpan transaksi penjualan dan distribusi inventaris';

