-- Add saldo column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS saldo DECIMAL(10, 2) DEFAULT 0.00;

-- Create index for quick saldo lookups
CREATE INDEX IF NOT EXISTS idx_profiles_saldo ON profiles(saldo DESC);

-- Add a comment to explain the column
COMMENT ON COLUMN profiles.saldo IS 'Accumulated balance from tips and sales that the artist can view or withdraw';
