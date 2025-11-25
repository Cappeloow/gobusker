-- Create tips table for the tip wall feature
CREATE TABLE IF NOT EXISTS tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  donor_name TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  message TEXT,
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  stripe_session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tips_profile_id ON tips(profile_id);
CREATE INDEX IF NOT EXISTS idx_tips_created_at ON tips(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tips_payment_status ON tips(payment_status);

-- Enable RLS
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read tips
CREATE POLICY "Tips are viewable by everyone" ON tips
  FOR SELECT
  USING (true);

-- Allow anyone to insert tips
CREATE POLICY "Anyone can create tips" ON tips
  FOR INSERT
  WITH CHECK (true);

-- Prevent updates and deletes
CREATE POLICY "Tips cannot be modified" ON tips
  FOR UPDATE
  USING (false);

CREATE POLICY "Tips cannot be deleted" ON tips
  FOR DELETE
  USING (false);
