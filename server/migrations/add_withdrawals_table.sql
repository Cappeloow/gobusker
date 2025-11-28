-- Create withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, completed
  requested_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  notes TEXT,
  payout_method TEXT DEFAULT 'stripe',
  stripe_payout_id TEXT,
  payout_error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_withdrawals_profile_id ON withdrawals(profile_id);
CREATE INDEX idx_withdrawals_status ON withdrawals(status);

-- Enable RLS
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for withdrawals
-- Users can view their own withdrawal requests
CREATE POLICY "Users can view their own withdrawals"
  ON withdrawals
  FOR SELECT
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Users can create withdrawal requests
CREATE POLICY "Users can create withdrawal requests"
  ON withdrawals
  FOR INSERT
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Only service role can update withdrawals (for approval/rejection)
CREATE POLICY "Service role can update withdrawals"
  ON withdrawals
  FOR UPDATE
  USING (auth.role() = 'service_role');
