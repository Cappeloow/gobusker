-- ==========================================
-- MIGRATION: Move saldo from profiles to user_wallets
-- ==========================================
-- This migration creates a user_wallets table to track balance per user
-- All profiles for a user share the same wallet

-- Step 1: Create user_wallets table
CREATE TABLE IF NOT EXISTS user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  saldo DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Enable RLS on user_wallets
ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policies for user_wallets
CREATE POLICY "Users can view their own wallet" ON user_wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallet" ON user_wallets
  FOR UPDATE USING (auth.uid() = user_id);

-- Step 4: Migrate existing saldo data from profiles to user_wallets
-- For each unique user, create a wallet and sum their profile saldo
INSERT INTO user_wallets (user_id, saldo)
SELECT DISTINCT 
  p.user_id,
  COALESCE(SUM(p.saldo), 0) as total_saldo
FROM profiles p
GROUP BY p.user_id
ON CONFLICT (user_id) DO NOTHING;

-- Step 5: Add band_members array to profiles (for band identification)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS band_members TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Step 6: Add revenue_split for band members (e.g., [30, 35, 35])
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS revenue_split DECIMAL(3,1)[] DEFAULT ARRAY[]::DECIMAL(3,1)[];

-- Step 7: Create a profile_members junction table for band collaborations
CREATE TABLE IF NOT EXISTS profile_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  revenue_share DECIMAL(5,2) NOT NULL DEFAULT 100.00, -- Percentage (0-100)
  role TEXT DEFAULT 'member', -- 'owner', 'member', 'admin'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, user_id)
);

-- Step 8: Enable RLS on profile_members
ALTER TABLE profile_members ENABLE ROW LEVEL SECURITY;

-- Step 9: Create RLS policies for profile_members
CREATE POLICY "Users can view their profile members" ON profile_members
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM profile_members WHERE profile_id = profile_members.profile_id
    )
  );

CREATE POLICY "Users can manage their profile members" ON profile_members
  FOR ALL USING (
    auth.uid() IN (
      SELECT pm.user_id FROM profile_members pm 
      WHERE pm.profile_id = profile_members.profile_id AND pm.role IN ('owner', 'admin')
    )
  );

-- Step 10: Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_members_profile_id ON profile_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_members_user_id ON profile_members(user_id);

-- Step 11: Create trigger to update user_wallets when profiles change
CREATE OR REPLACE FUNCTION update_user_wallet_on_profile_change()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_wallets 
  SET saldo = (
    SELECT COALESCE(SUM(p.saldo), 0)
    FROM profiles p
    WHERE p.user_id = NEW.user_id
  ),
  updated_at = NOW()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic sync
DROP TRIGGER IF EXISTS trigger_update_wallet ON profiles;
CREATE TRIGGER trigger_update_wallet
AFTER UPDATE OF saldo ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_user_wallet_on_profile_change();

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================
-- Run these to verify the migration worked:

-- Check user_wallets table exists and has data
-- SELECT * FROM user_wallets LIMIT 5;

-- Check that data was migrated
-- SELECT u.id, w.saldo, COUNT(p.id) as profile_count
-- FROM user_wallets w
-- JOIN auth.users u ON w.user_id = u.id
-- LEFT JOIN profiles p ON u.id = p.user_id
-- GROUP BY u.id, w.saldo;

-- ==========================================
-- ROLLBACK (if something goes wrong)
-- ==========================================
-- Run these in reverse order to undo:

/*
-- Drop the trigger and function
DROP TRIGGER IF EXISTS trigger_update_wallet ON profiles;
DROP FUNCTION IF EXISTS update_user_wallet_on_profile_change();

-- Drop profile_members table
DROP TABLE IF EXISTS profile_members;

-- Remove new columns from profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS band_members;
ALTER TABLE profiles DROP COLUMN IF EXISTS revenue_split;

-- Drop user_wallets table
DROP TABLE IF EXISTS user_wallets;
*/
