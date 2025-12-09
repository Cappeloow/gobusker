-- ==========================================
-- MIGRATION: Create profile_invites table for band member management
-- ==========================================

-- Step 1: Create invites table
CREATE TABLE IF NOT EXISTS profile_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  invitee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  revenue_share DECIMAL(5,2) NOT NULL DEFAULT 100.00, -- Percentage (0-100)
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'cancelled'
  invite_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, invitee_email, status) -- Only one active invite per email per profile
);

-- Step 2: Enable RLS on profile_invites
ALTER TABLE profile_invites ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policies for profile_invites
-- Inviters can see invites they sent
CREATE POLICY "Users can view invites they sent" ON profile_invites
  FOR SELECT USING (auth.uid() = inviter_id);

-- Profile members (owners/admins) can view pending invites for their profile
CREATE POLICY "Profile members can view pending invites" ON profile_invites
  FOR SELECT USING (
    auth.uid() IN (
      SELECT pm.user_id FROM profile_members pm 
      WHERE pm.profile_id = profile_invites.profile_id AND pm.role IN ('owner', 'admin')
    )
  );

-- Invitees can view invites sent to them
CREATE POLICY "Invitees can view their invites" ON profile_invites
  FOR SELECT USING (
    auth.email() = invitee_email OR (invitee_id IS NOT NULL AND auth.uid() = invitee_id)
  );

-- Only owners/admins can create invites
CREATE POLICY "Owners can create invites" ON profile_invites
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT pm.user_id FROM profile_members pm 
      WHERE pm.profile_id = profile_invites.profile_id AND pm.role IN ('owner', 'admin')
    )
  );

-- Only owners/admins can update/cancel invites
CREATE POLICY "Owners can manage invites" ON profile_invites
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT pm.user_id FROM profile_members pm 
      WHERE pm.profile_id = profile_invites.profile_id AND pm.role IN ('owner', 'admin')
    )
  );

-- Invitees can accept their own invites
CREATE POLICY "Invitees can accept invites" ON profile_invites
  FOR UPDATE USING (
    (auth.email() = invitee_email OR (invitee_id IS NOT NULL AND auth.uid() = invitee_id))
    AND status = 'pending'
  );

-- Step 4: Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_profile_invites_profile_id ON profile_invites(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_invites_inviter_id ON profile_invites(inviter_id);
CREATE INDEX IF NOT EXISTS idx_profile_invites_invitee_email ON profile_invites(invitee_email);
CREATE INDEX IF NOT EXISTS idx_profile_invites_status ON profile_invites(status);
CREATE INDEX IF NOT EXISTS idx_profile_invites_token ON profile_invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_profile_invites_expires ON profile_invites(expires_at);

-- Step 5: Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_profile_invites_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_profile_invites_updated_at
BEFORE UPDATE ON profile_invites
FOR EACH ROW
EXECUTE FUNCTION update_profile_invites_timestamp();

-- ROLLBACK:
-- DROP TRIGGER IF EXISTS trigger_profile_invites_updated_at ON profile_invites;
-- DROP FUNCTION IF EXISTS update_profile_invites_timestamp();
-- DROP INDEX IF EXISTS idx_profile_invites_expires;
-- DROP INDEX IF EXISTS idx_profile_invites_token;
-- DROP INDEX IF EXISTS idx_profile_invites_status;
-- DROP INDEX IF EXISTS idx_profile_invites_invitee_email;
-- DROP INDEX IF EXISTS idx_profile_invites_inviter_id;
-- DROP INDEX IF EXISTS idx_profile_invites_profile_id;
-- DROP TABLE IF EXISTS profile_invites;
