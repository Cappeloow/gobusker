-- Add event type and performer slots to events table
-- Event types: solo_performance, open_mic, venue_booking

-- Add new columns to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS event_type VARCHAR(50) DEFAULT 'solo_performance',
ADD COLUMN IF NOT EXISTS max_performers INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS accepting_requests BOOLEAN DEFAULT false;

-- Create event_requests table for performer applications
CREATE TABLE IF NOT EXISTS event_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  requester_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate requests from same profile to same event
  UNIQUE(event_id, requester_profile_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_event_requests_event_id ON event_requests(event_id);
CREATE INDEX IF NOT EXISTS idx_event_requests_requester_profile_id ON event_requests(requester_profile_id);
CREATE INDEX IF NOT EXISTS idx_event_requests_status ON event_requests(status);

-- Enable RLS on event_requests
ALTER TABLE event_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view accepted requests (public performers list)
CREATE POLICY "Anyone can view accepted requests"
  ON event_requests
  FOR SELECT
  USING (status = 'accepted');

-- Policy: Event owners can view all requests for their events
CREATE POLICY "Event owners can view all requests for their events"
  ON event_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN profile_members pm ON pm.profile_id = e.profile_id
      WHERE e.id = event_requests.event_id
      AND pm.user_id = auth.uid()
    )
  );

-- Policy: Requesters can view their own requests
CREATE POLICY "Requesters can view their own requests"
  ON event_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profile_members pm
      WHERE pm.profile_id = event_requests.requester_profile_id
      AND pm.user_id = auth.uid()
    )
  );

-- Policy: Authenticated users can create requests for events accepting requests
CREATE POLICY "Users can create requests for open events"
  ON event_requests
  FOR INSERT
  WITH CHECK (
    -- User must own the requester profile
    EXISTS (
      SELECT 1 FROM profile_members pm
      WHERE pm.profile_id = event_requests.requester_profile_id
      AND pm.user_id = auth.uid()
    )
    -- Event must be accepting requests
    AND EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_requests.event_id
      AND e.accepting_requests = true
    )
  );

-- Policy: Event owners can update request status
CREATE POLICY "Event owners can update request status"
  ON event_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN profile_members pm ON pm.profile_id = e.profile_id
      WHERE e.id = event_requests.event_id
      AND pm.user_id = auth.uid()
    )
  );

-- Policy: Requesters can delete their own pending requests
CREATE POLICY "Requesters can delete their own pending requests"
  ON event_requests
  FOR DELETE
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM profile_members pm
      WHERE pm.profile_id = event_requests.requester_profile_id
      AND pm.user_id = auth.uid()
    )
  );

-- Update existing events to have default event_type
UPDATE events SET event_type = 'solo_performance' WHERE event_type IS NULL;
