-- Add event invites table for direct performer invitations
-- This allows event owners to invite specific performers to their events

CREATE TABLE IF NOT EXISTS event_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  invited_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  inviter_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate invites to same profile for same event
  UNIQUE(event_id, invited_profile_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_event_invites_event_id ON event_invites(event_id);
CREATE INDEX IF NOT EXISTS idx_event_invites_invited_profile_id ON event_invites(invited_profile_id);
CREATE INDEX IF NOT EXISTS idx_event_invites_status ON event_invites(status);

-- Enable RLS on event_invites
ALTER TABLE event_invites ENABLE ROW LEVEL SECURITY;

-- Policy: Event owners can view all invites for their events
CREATE POLICY "Event owners can view invites for their events"
  ON event_invites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN profile_members pm ON pm.profile_id = e.profile_id
      WHERE e.id = event_invites.event_id
      AND pm.user_id = auth.uid()
    )
  );

-- Policy: Invited users can view their invites
CREATE POLICY "Invited users can view their invites"
  ON event_invites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profile_members pm
      WHERE pm.profile_id = event_invites.invited_profile_id
      AND pm.user_id = auth.uid()
    )
  );

-- Policy: Anyone can view accepted invites (public performers list)
CREATE POLICY "Anyone can view accepted invites"
  ON event_invites
  FOR SELECT
  USING (status = 'accepted');

-- Policy: Event owners can create invites for their events
CREATE POLICY "Event owners can create invites"
  ON event_invites
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e
      JOIN profile_members pm ON pm.profile_id = e.profile_id
      WHERE e.id = event_invites.event_id
      AND pm.user_id = auth.uid()
    )
  );

-- Policy: Invited users can update invite status (accept/reject)
CREATE POLICY "Invited users can respond to invites"
  ON event_invites
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profile_members pm
      WHERE pm.profile_id = event_invites.invited_profile_id
      AND pm.user_id = auth.uid()
    )
  );

-- Policy: Event owners can delete pending invites
CREATE POLICY "Event owners can delete pending invites"
  ON event_invites
  FOR DELETE
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM events e
      JOIN profile_members pm ON pm.profile_id = e.profile_id
      WHERE e.id = event_invites.event_id
      AND pm.user_id = auth.uid()
    )
  );
