-- ================================================
-- DONOR PROFILES & TRACKING SYSTEM
-- ================================================
-- Track donor statistics, tier, badges, and consistency
-- for better donor relationship management
-- ================================================

-- ================================================
-- 1. DONOR_PROFILES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS donor_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Donor Information
  donor_name VARCHAR(200) UNIQUE NOT NULL,
  donor_phone VARCHAR(50),
  donor_email VARCHAR(200),
  donor_address TEXT,
  
  -- Donation Statistics
  first_donation_date DATE,
  last_donation_date DATE,
  total_donations_count INTEGER DEFAULT 0,
  total_cash_amount DECIMAL(15, 2) DEFAULT 0,
  total_goods_value DECIMAL(15, 2) DEFAULT 0,
  total_goods_count INTEGER DEFAULT 0,
  
  -- Consistency Tracking
  consecutive_months INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  current_streak_active BOOLEAN DEFAULT true,
  last_donation_month VARCHAR(7), -- Format: YYYY-MM
  
  -- Tier & Badges
  donor_tier VARCHAR(20) DEFAULT 'Bronze', -- Diamond, Platinum, Gold, Silver, Bronze
  badges JSONB DEFAULT '[]'::jsonb, -- Array of badge codes
  tier_updated_at TIMESTAMP WITH TIME ZONE,
  
  -- Recency & Status
  days_since_last_donation INTEGER,
  donor_status VARCHAR(20) DEFAULT 'Active', -- Active, Recent, Lapsed, Inactive
  
  -- Additional Info
  special_notes TEXT,
  preferred_contact_method VARCHAR(20),
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_donor_profiles_tier ON donor_profiles(donor_tier);
CREATE INDEX idx_donor_profiles_status ON donor_profiles(donor_status);
CREATE INDEX idx_donor_profiles_name ON donor_profiles(donor_name);
CREATE INDEX idx_donor_profiles_last_donation ON donor_profiles(last_donation_date DESC);
CREATE INDEX idx_donor_profiles_consecutive ON donor_profiles(consecutive_months DESC);

-- ================================================
-- 2. FUNCTION: Calculate Donor Tier
-- ================================================
CREATE OR REPLACE FUNCTION calculate_donor_tier(
  p_total_cash DECIMAL,
  p_total_count INTEGER,
  p_consecutive_months INTEGER
)
RETURNS VARCHAR AS $$
DECLARE
  v_tier VARCHAR(20);
BEGIN
  -- Diamond: 10M+, 12+ months consecutive, high frequency
  IF p_total_cash >= 10000000 AND p_consecutive_months >= 12 AND p_total_count >= 24 THEN
    v_tier := 'Diamond';
  
  -- Platinum: 5M+, 6+ months consecutive
  ELSIF p_total_cash >= 5000000 AND p_consecutive_months >= 6 AND p_total_count >= 12 THEN
    v_tier := 'Platinum';
  
  -- Gold: 2M+, 3+ months consecutive
  ELSIF p_total_cash >= 2000000 AND p_consecutive_months >= 3 AND p_total_count >= 6 THEN
    v_tier := 'Gold';
  
  -- Silver: 500K+, 5+ donations
  ELSIF p_total_cash >= 500000 AND p_total_count >= 5 THEN
    v_tier := 'Silver';
  
  -- Bronze: Default
  ELSE
    v_tier := 'Bronze';
  END IF;
  
  RETURN v_tier;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 3. FUNCTION: Assign Badges
-- ================================================
CREATE OR REPLACE FUNCTION assign_donor_badges(
  p_consecutive_months INTEGER,
  p_longest_streak INTEGER,
  p_total_count INTEGER,
  p_first_donation_date DATE,
  p_single_max_donation DECIMAL,
  p_goods_count INTEGER,
  p_food_count INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_badges JSONB := '[]'::jsonb;
  v_years_since_first NUMERIC;
BEGIN
  -- CONSISTENT_SUPPORTER: 6+ months consecutive
  IF p_consecutive_months >= 6 THEN
    v_badges := v_badges || '["CONSISTENT_SUPPORTER"]'::jsonb;
  END IF;
  
  -- RELIABLE_PARTNER: 12+ months consecutive
  IF p_consecutive_months >= 12 THEN
    v_badges := v_badges || '["RELIABLE_PARTNER"]'::jsonb;
  END IF;
  
  -- FOUNDING_SUPPORTER: Donor since > 1 year
  v_years_since_first := EXTRACT(YEAR FROM AGE(CURRENT_DATE, p_first_donation_date));
  IF v_years_since_first >= 1 THEN
    v_badges := v_badges || '["FOUNDING_SUPPORTER"]'::jsonb;
  END IF;
  
  -- MAJOR_CONTRIBUTOR: Single donation > 5M
  IF p_single_max_donation >= 5000000 THEN
    v_badges := v_badges || '["MAJOR_CONTRIBUTOR"]'::jsonb;
  END IF;
  
  -- FOOD_HERO: Frequent food donations (10+)
  IF p_food_count >= 10 THEN
    v_badges := v_badges || '["FOOD_HERO"]'::jsonb;
  END IF;
  
  -- ASSET_SUPPORTER: Frequent asset donations (10+)
  IF p_goods_count >= 10 THEN
    v_badges := v_badges || '["ASSET_SUPPORTER"]'::jsonb;
  END IF;
  
  -- STREAK_MASTER: Longest streak 18+ months
  IF p_longest_streak >= 18 THEN
    v_badges := v_badges || '["STREAK_MASTER"]'::jsonb;
  END IF;
  
  RETURN v_badges;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 4. FUNCTION: Update Donor Profile
-- ================================================
CREATE OR REPLACE FUNCTION update_donor_profile_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_profile_id UUID;
  v_current_month VARCHAR(7);
  v_last_month VARCHAR(7);
  v_consecutive_months INTEGER := 0;
  v_total_cash DECIMAL;
  v_total_count INTEGER;
  v_total_goods_value DECIMAL;
  v_total_goods_count INTEGER;
  v_first_date DATE;
  v_last_date DATE;
  v_new_tier VARCHAR(20);
  v_new_badges JSONB;
  v_single_max DECIMAL;
  v_food_count INTEGER;
  v_goods_count INTEGER;
  v_longest_streak INTEGER;
BEGIN
  -- Only process received donations
  IF NEW.status NOT IN ('received', 'posted') THEN
    RETURN NEW;
  END IF;
  
  v_current_month := TO_CHAR(NEW.donation_date, 'YYYY-MM');
  
  -- Insert or update basic donor info
  INSERT INTO donor_profiles (
    donor_name, 
    donor_phone, 
    donor_address,
    first_donation_date,
    last_donation_date,
    last_donation_month
  )
  VALUES (
    NEW.donor_name, 
    NEW.donor_phone, 
    NEW.donor_address,
    NEW.donation_date,
    NEW.donation_date,
    v_current_month
  )
  ON CONFLICT (donor_name) 
  DO UPDATE SET 
    donor_phone = COALESCE(EXCLUDED.donor_phone, donor_profiles.donor_phone),
    donor_address = COALESCE(EXCLUDED.donor_address, donor_profiles.donor_address),
    last_donation_date = GREATEST(donor_profiles.last_donation_date, EXCLUDED.last_donation_date),
    updated_at = NOW()
  RETURNING id, last_donation_month INTO v_profile_id, v_last_month;
  
  -- Calculate statistics from donations table
  SELECT 
    COUNT(*),
    COALESCE(SUM(CASE WHEN donation_type = 'cash' THEN cash_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN donation_type = 'in_kind' THEN 1 ELSE 0 END), 0),
    MIN(donation_date),
    MAX(donation_date),
    MAX(CASE WHEN donation_type = 'cash' THEN cash_amount ELSE 0 END)
  INTO 
    v_total_count,
    v_total_cash,
    v_total_goods_count,
    v_first_date,
    v_last_date,
    v_single_max
  FROM donations
  WHERE donor_name = NEW.donor_name
    AND status IN ('received', 'posted');
  
  -- Calculate goods value from donation_items (if table exists)
  BEGIN
    SELECT COALESCE(SUM(estimated_value * quantity), 0)
    INTO v_total_goods_value
    FROM donation_items di
    JOIN donations d ON di.donation_id = d.id
    WHERE d.donor_name = NEW.donor_name
      AND d.status IN ('received', 'posted');
  EXCEPTION WHEN OTHERS THEN
    v_total_goods_value := 0;
  END;
  
  -- Calculate food vs goods count (simplified)
  v_food_count := v_total_goods_count; -- Placeholder
  v_goods_count := v_total_goods_count; -- Placeholder
  
  -- Calculate consecutive months (simplified approach)
  -- Check if current donation is in a new month
  IF v_last_month IS NULL OR v_last_month != v_current_month THEN
    -- Get distinct months with donations
    SELECT COUNT(DISTINCT TO_CHAR(donation_date, 'YYYY-MM'))
    INTO v_consecutive_months
    FROM donations
    WHERE donor_name = NEW.donor_name
      AND status IN ('received', 'posted')
      AND donation_date >= (CURRENT_DATE - INTERVAL '12 months');
  END IF;
  
  v_longest_streak := GREATEST(v_consecutive_months, COALESCE((SELECT longest_streak FROM donor_profiles WHERE id = v_profile_id), 0));
  
  -- Calculate tier
  v_new_tier := calculate_donor_tier(v_total_cash, v_total_count, v_consecutive_months);
  
  -- Assign badges
  v_new_badges := assign_donor_badges(
    v_consecutive_months,
    v_longest_streak,
    v_total_count,
    v_first_date,
    v_single_max,
    v_goods_count,
    v_food_count
  );
  
  -- Update profile with calculated values
  UPDATE donor_profiles SET
    first_donation_date = v_first_date,
    last_donation_date = v_last_date,
    last_donation_month = v_current_month,
    total_donations_count = v_total_count,
    total_cash_amount = v_total_cash,
    total_goods_value = v_total_goods_value,
    total_goods_count = v_total_goods_count,
    consecutive_months = v_consecutive_months,
    longest_streak = v_longest_streak,
    donor_tier = v_new_tier,
    badges = v_new_badges,
    tier_updated_at = NOW(),
    days_since_last_donation = 0,
    donor_status = 'Active',
    updated_at = NOW()
  WHERE id = v_profile_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 5. TRIGGER: Auto-update donor profile on donation
-- ================================================
DROP TRIGGER IF EXISTS trg_update_donor_profile ON donations;
CREATE TRIGGER trg_update_donor_profile
  AFTER INSERT OR UPDATE ON donations
  FOR EACH ROW
  EXECUTE FUNCTION update_donor_profile_stats();

-- ================================================
-- 6. FUNCTION: Update Days Since Last Donation (Daily Job)
-- ================================================
CREATE OR REPLACE FUNCTION update_donor_recency()
RETURNS void AS $$
BEGIN
  UPDATE donor_profiles
  SET 
    days_since_last_donation = EXTRACT(DAY FROM (CURRENT_DATE - last_donation_date))::INTEGER,
    donor_status = CASE
      WHEN EXTRACT(DAY FROM (CURRENT_DATE - last_donation_date)) < 30 THEN 'Active'
      WHEN EXTRACT(DAY FROM (CURRENT_DATE - last_donation_date)) BETWEEN 30 AND 60 THEN 'Recent'
      WHEN EXTRACT(DAY FROM (CURRENT_DATE - last_donation_date)) BETWEEN 60 AND 90 THEN 'Lapsed'
      ELSE 'Inactive'
    END,
    updated_at = NOW()
  WHERE last_donation_date IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 7. RLS POLICIES
-- ================================================
ALTER TABLE donor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view donor profiles"
  ON donor_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update donor profiles"
  ON donor_profiles FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "System can insert donor profiles"
  ON donor_profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ================================================
-- 8. INITIAL DATA MIGRATION
-- ================================================
-- Populate donor_profiles from existing donations
INSERT INTO donor_profiles (
  donor_name,
  donor_phone,
  donor_address,
  first_donation_date,
  last_donation_date
)
SELECT DISTINCT ON (donor_name)
  donor_name,
  donor_phone,
  donor_address,
  MIN(donation_date) OVER (PARTITION BY donor_name),
  MAX(donation_date) OVER (PARTITION BY donor_name)
FROM donations
WHERE status IN ('received', 'posted')
ON CONFLICT (donor_name) DO NOTHING;

-- Trigger recalculation for all existing donors
DO $$
DECLARE
  v_donor RECORD;
BEGIN
  FOR v_donor IN SELECT DISTINCT donor_name FROM donations WHERE status IN ('received', 'posted')
  LOOP
    -- This will trigger the update function
    UPDATE donations 
    SET updated_at = NOW() 
    WHERE donor_name = v_donor.donor_name 
    AND id = (SELECT id FROM donations WHERE donor_name = v_donor.donor_name LIMIT 1);
  END LOOP;
END $$;

-- ================================================
-- 9. HELPER VIEWS
-- ================================================

-- View: Top Donors
CREATE OR REPLACE VIEW v_top_donors AS
SELECT 
  id,
  donor_name,
  donor_tier,
  total_cash_amount,
  total_donations_count,
  consecutive_months,
  badges,
  donor_status,
  last_donation_date,
  days_since_last_donation
FROM donor_profiles
ORDER BY 
  CASE donor_tier
    WHEN 'Diamond' THEN 1
    WHEN 'Platinum' THEN 2
    WHEN 'Gold' THEN 3
    WHEN 'Silver' THEN 4
    ELSE 5
  END,
  total_cash_amount DESC,
  consecutive_months DESC;

-- View: At-Risk Donors (Major donors who haven't donated recently)
CREATE OR REPLACE VIEW v_at_risk_donors AS
SELECT 
  id,
  donor_name,
  donor_tier,
  total_cash_amount,
  last_donation_date,
  days_since_last_donation,
  donor_status
FROM donor_profiles
WHERE donor_tier IN ('Gold', 'Platinum', 'Diamond')
  AND days_since_last_donation >= 60
ORDER BY total_cash_amount DESC;

-- ================================================
-- 10. COMMENTS
-- ================================================
COMMENT ON TABLE donor_profiles IS 'Donor relationship management - tracks statistics, tier, badges, and consistency';
COMMENT ON COLUMN donor_profiles.donor_tier IS 'Tier: Diamond, Platinum, Gold, Silver, Bronze based on contribution and consistency';
COMMENT ON COLUMN donor_profiles.badges IS 'Array of badge codes (CONSISTENT_SUPPORTER, RELIABLE_PARTNER, FOUNDING_SUPPORTER, etc.)';
COMMENT ON COLUMN donor_profiles.consecutive_months IS 'Number of consecutive months with donations';
COMMENT ON COLUMN donor_profiles.donor_status IS 'Recency status: Active (<30 days), Recent (30-60), Lapsed (60-90), Inactive (>90)';
COMMENT ON FUNCTION calculate_donor_tier IS 'Calculate donor tier based on total contribution, count, and consistency';
COMMENT ON FUNCTION assign_donor_badges IS 'Assign badges based on donor behavior and milestones';
COMMENT ON FUNCTION update_donor_profile_stats IS 'Trigger function to auto-update donor profile on new donation';
COMMENT ON FUNCTION update_donor_recency IS 'Daily job to update days_since_last_donation and donor_status';

