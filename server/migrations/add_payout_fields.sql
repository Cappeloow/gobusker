-- Add Stripe Connect fields to profiles table for automatic payouts
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_connect_status TEXT DEFAULT 'not_connected'; -- not_connected | pending | connected
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payout_email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_account_token TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payout_method TEXT DEFAULT 'stripe'; -- stripe | bank_transfer

-- Add payout tracking to withdrawals table
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS payout_method TEXT DEFAULT 'stripe'; -- stripe | manual
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS stripe_payout_id TEXT;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS payout_error TEXT;

-- Create index for stripe connect status
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_connect ON profiles(stripe_connect_status);
