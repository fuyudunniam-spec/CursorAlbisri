-- ================================================
-- MODUL DONASI: Comprehensive Donation Management
-- ================================================
-- Supports: cash, in_kind, pledge
-- Features: Semi-automatic item mapping, batch/expiry tracking,
--           integration with Inventaris and Keuangan
-- ================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- 1. DONATIONS TABLE (Header)
-- ================================================
CREATE TABLE IF NOT EXISTS donations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Donation type
  donation_type VARCHAR(20) NOT NULL CHECK (donation_type IN ('cash', 'in_kind', 'pledge')),
  
  -- Donor information
  donor_name VARCHAR(200) NOT NULL,
  donor_email VARCHAR(200),
  donor_phone VARCHAR(50),
  donor_address TEXT,
  
  -- Donation details
  donation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  received_date DATE,
  
  -- For cash donations
  cash_amount DECIMAL(15, 2) CHECK (cash_amount >= 0),
  payment_method VARCHAR(50), -- 'Cash', 'Bank Transfer', 'Check', etc.
  
  -- Restrictions and notes
  is_restricted BOOLEAN DEFAULT FALSE,
  restricted_tag VARCHAR(100), -- e.g., 'Building Fund', 'Scholarship', etc.
  notes TEXT,
  hajat_doa TEXT, -- Special prayers/intentions
  
  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'posted', 'cancelled')),
  posted_to_stock_at TIMESTAMP WITH TIME ZONE,
  posted_to_finance_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit fields
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT cash_amount_required_for_cash CHECK (
    (donation_type = 'cash' AND cash_amount IS NOT NULL AND cash_amount > 0) OR
    (donation_type != 'cash')
  )
);

-- Indexes for performance
CREATE INDEX idx_donations_donation_type ON donations(donation_type);
CREATE INDEX idx_donations_status ON donations(status);
CREATE INDEX idx_donations_donation_date ON donations(donation_date DESC);
CREATE INDEX idx_donations_created_at ON donations(created_at DESC);

-- ================================================
-- 2. DONATION_ITEMS TABLE (Detail Items)
-- ================================================
CREATE TABLE IF NOT EXISTS donation_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  donation_id UUID NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
  
  -- Raw item information (as received)
  raw_item_name VARCHAR(200) NOT NULL,
  item_description TEXT,
  
  -- Quantity and unit
  quantity DECIMAL(15, 3) NOT NULL CHECK (quantity > 0),
  uom VARCHAR(50) NOT NULL, -- Unit of Measure (required)
  
  -- Estimated value
  estimated_value DECIMAL(15, 2) CHECK (estimated_value >= 0),
  
  -- Expiry tracking
  expiry_date DATE,
  
  -- Mapping to master items
  mapped_item_id UUID REFERENCES inventaris(id) ON DELETE SET NULL,
  mapping_status VARCHAR(20) DEFAULT 'unmapped' CHECK (mapping_status IN ('unmapped', 'suggested', 'mapped', 'new_item_created')),
  suggested_item_id UUID REFERENCES inventaris(id) ON DELETE SET NULL,
  
  -- Posting tracking
  is_posted_to_stock BOOLEAN DEFAULT FALSE,
  posted_at TIMESTAMP WITH TIME ZONE,
  batch_id UUID, -- Reference to receive_entries if batch tracking enabled
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT quantity_positive CHECK (quantity > 0)
);

-- Indexes
CREATE INDEX idx_donation_items_donation_id ON donation_items(donation_id);
CREATE INDEX idx_donation_items_mapped_item_id ON donation_items(mapped_item_id);
CREATE INDEX idx_donation_items_mapping_status ON donation_items(mapping_status);
CREATE INDEX idx_donation_items_is_posted ON donation_items(is_posted_to_stock);

-- ================================================
-- 3. ITEM_SUGGESTIONS TABLE (Mapping suggestions)
-- ================================================
CREATE TABLE IF NOT EXISTS donation_item_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  donation_item_id UUID NOT NULL REFERENCES donation_items(id) ON DELETE CASCADE,
  suggested_item_id UUID NOT NULL REFERENCES inventaris(id) ON DELETE CASCADE,
  similarity_score DECIMAL(5, 2), -- 0-100 score
  reason TEXT, -- Why this was suggested
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(donation_item_id, suggested_item_id)
);

-- ================================================
-- 4. RLS POLICIES
-- ================================================
-- Enable RLS
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_item_suggestions ENABLE ROW LEVEL SECURITY;

-- Donations policies
CREATE POLICY "Authenticated users can view all donations"
  ON donations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert donations"
  ON donations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update donations"
  ON donations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete donations"
  ON donations FOR DELETE
  TO authenticated
  USING (true);

-- Donation items policies
CREATE POLICY "Authenticated users can view all donation items"
  ON donation_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert donation items"
  ON donation_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update donation items"
  ON donation_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete donation items"
  ON donation_items FOR DELETE
  TO authenticated
  USING (true);

-- Suggestions policies
CREATE POLICY "Authenticated users can view suggestions"
  ON donation_item_suggestions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage suggestions"
  ON donation_item_suggestions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ================================================
-- 5. FUNCTIONS AND TRIGGERS
-- ================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_donations_updated_at
  BEFORE UPDATE ON donations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_donation_items_updated_at
  BEFORE UPDATE ON donation_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- 6. HELPER FUNCTION: Suggest Items
-- ================================================
-- This function suggests matching items from inventaris
-- based on name similarity
CREATE OR REPLACE FUNCTION suggest_items_for_donation(
  p_raw_name TEXT,
  p_limit INT DEFAULT 5
)
RETURNS TABLE (
  item_id UUID,
  item_name VARCHAR,
  item_category VARCHAR,
  item_uom VARCHAR,
  similarity_score INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.nama_barang,
    i.kategori,
    i.satuan,
    -- Simple similarity: check if raw_name contains item_name or vice versa
    CASE 
      WHEN LOWER(i.nama_barang) = LOWER(p_raw_name) THEN 100
      WHEN LOWER(i.nama_barang) LIKE '%' || LOWER(p_raw_name) || '%' THEN 80
      WHEN LOWER(p_raw_name) LIKE '%' || LOWER(i.nama_barang) || '%' THEN 70
      ELSE 50
    END AS similarity_score
  FROM inventaris i
  WHERE 
    LOWER(i.nama_barang) LIKE '%' || LOWER(p_raw_name) || '%' OR
    LOWER(p_raw_name) LIKE '%' || LOWER(i.nama_barang) || '%'
  ORDER BY similarity_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 7. HELPER FUNCTION: Post to Stock
-- ================================================
-- This function posts donation items to inventory
CREATE OR REPLACE FUNCTION post_donation_items_to_stock(
  p_donation_id UUID,
  p_default_location VARCHAR DEFAULT 'Gudang Utama',
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_item RECORD;
  v_posted_count INT := 0;
  v_error_count INT := 0;
  v_batch_id UUID;
  v_result JSON;
BEGIN
  -- Loop through all mapped items for this donation
  FOR v_item IN 
    SELECT * FROM donation_items 
    WHERE donation_id = p_donation_id 
      AND mapping_status = 'mapped' 
      AND mapped_item_id IS NOT NULL
      AND is_posted_to_stock = FALSE
  LOOP
    BEGIN
      -- Create batch entry if expiry date exists
      IF v_item.expiry_date IS NOT NULL THEN
        INSERT INTO receive_entries (item_id, expiry_date, qty)
        VALUES (v_item.mapped_item_id, v_item.expiry_date, v_item.quantity)
        RETURNING id INTO v_batch_id;
      ELSE
        v_batch_id := NULL;
      END IF;
      
      -- Create transaksi_inventaris (Masuk)
      INSERT INTO transaksi_inventaris (
        item_id,
        tipe,
        jumlah,
        tanggal,
        catatan,
        batch_id,
        created_by
      ) VALUES (
        v_item.mapped_item_id,
        'Masuk',
        v_item.quantity,
        CURRENT_DATE,
        'Donasi: ' || v_item.raw_item_name,
        v_batch_id,
        p_user_id
      );
      
      -- Update donation item status
      UPDATE donation_items
      SET 
        is_posted_to_stock = TRUE,
        posted_at = NOW(),
        batch_id = v_batch_id
      WHERE id = v_item.id;
      
      v_posted_count := v_posted_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
    END;
  END LOOP;
  
  -- Update donation status
  IF v_posted_count > 0 THEN
    UPDATE donations
    SET 
      status = 'posted',
      posted_to_stock_at = NOW()
    WHERE id = p_donation_id;
  END IF;
  
  -- Return result
  v_result := json_build_object(
    'success', TRUE,
    'posted_count', v_posted_count,
    'error_count', v_error_count
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 8. HELPER FUNCTION: Post to Finance
-- ================================================
-- This function creates journal entries for donations
CREATE OR REPLACE FUNCTION post_donation_to_finance(
  p_donation_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_donation RECORD;
  v_total_value DECIMAL(15, 2) := 0;
  v_result JSON;
BEGIN
  -- Get donation details
  SELECT * INTO v_donation FROM donations WHERE id = p_donation_id;
  
  -- Check if already posted
  IF v_donation.posted_to_finance_at IS NOT NULL THEN
    RETURN json_build_object('success', FALSE, 'message', 'Already posted to finance');
  END IF;
  
  -- Handle cash donations
  IF v_donation.donation_type = 'cash' THEN
    INSERT INTO keuangan (
      jenis_transaksi,
      kategori,
      jumlah,
      tanggal,
      deskripsi,
      referensi,
      created_by
    ) VALUES (
      'Pemasukan',
      'Donasi Tunai',
      v_donation.cash_amount,
      COALESCE(v_donation.received_date, v_donation.donation_date),
      'Donasi dari ' || v_donation.donor_name || COALESCE(' - ' || v_donation.notes, ''),
      'donation:' || p_donation_id,
      p_user_id
    );
  END IF;
  
  -- Handle in-kind donations (post when items are posted to stock)
  IF v_donation.donation_type = 'in_kind' AND v_donation.posted_to_stock_at IS NOT NULL THEN
    -- Calculate total estimated value
    SELECT COALESCE(SUM(estimated_value * quantity), 0) 
    INTO v_total_value
    FROM donation_items
    WHERE donation_id = p_donation_id AND is_posted_to_stock = TRUE;
    
    IF v_total_value > 0 THEN
      INSERT INTO keuangan (
        jenis_transaksi,
        kategori,
        jumlah,
        tanggal,
        deskripsi,
        referensi,
        created_by
      ) VALUES (
        'Pemasukan',
        'Donasi Barang',
        v_total_value,
        COALESCE(v_donation.received_date, v_donation.donation_date),
        'Donasi barang dari ' || v_donation.donor_name,
        'donation:' || p_donation_id,
        p_user_id
      );
    END IF;
  END IF;
  
  -- Update donation
  UPDATE donations
  SET posted_to_finance_at = NOW()
  WHERE id = p_donation_id;
  
  v_result := json_build_object(
    'success', TRUE,
    'donation_type', v_donation.donation_type,
    'amount', COALESCE(v_donation.cash_amount, v_total_value)
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 9. COMMENTS
-- ================================================
COMMENT ON TABLE donations IS 'Header table for all donations (cash, in_kind, pledge)';
COMMENT ON TABLE donation_items IS 'Detail items for in-kind donations with mapping to inventaris';
COMMENT ON TABLE donation_item_suggestions IS 'AI/system suggested mappings for donation items';
COMMENT ON COLUMN donations.donation_type IS 'Type: cash, in_kind, or pledge';
COMMENT ON COLUMN donations.is_restricted IS 'Whether donation has specific purpose/restriction';
COMMENT ON COLUMN donation_items.mapping_status IS 'Status: unmapped, suggested, mapped, new_item_created';
COMMENT ON FUNCTION suggest_items_for_donation IS 'Suggests matching items from inventaris based on name similarity';
COMMENT ON FUNCTION post_donation_items_to_stock IS 'Posts donation items to inventory with batch/expiry tracking';
COMMENT ON FUNCTION post_donation_to_finance IS 'Creates journal entries for donations (anti-duplication with posted_to_finance_at)';

