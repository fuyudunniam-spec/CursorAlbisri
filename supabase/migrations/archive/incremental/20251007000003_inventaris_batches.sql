-- Lightweight batches/receive entries per penerimaan

-- 1) Create table for batch entries
CREATE TABLE IF NOT EXISTS receive_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventaris(id) ON DELETE CASCADE,
  expiry_date DATE,
  qty INTEGER NOT NULL CHECK (qty > 0),
  tx_id UUID, -- optional link to transaksi_inventaris
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_receive_entries_item ON receive_entries(item_id);
CREATE INDEX IF NOT EXISTS idx_receive_entries_expiry ON receive_entries(expiry_date);

-- 2) Link from transaksi_inventaris to receive_entries for Masuk
ALTER TABLE IF EXISTS transaksi_inventaris
  ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES receive_entries(id);

-- 3) RLS
ALTER TABLE receive_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read receive_entries" ON receive_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert receive_entries" ON receive_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update receive_entries" ON receive_entries FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete receive_entries" ON receive_entries FOR DELETE TO authenticated USING (true);


