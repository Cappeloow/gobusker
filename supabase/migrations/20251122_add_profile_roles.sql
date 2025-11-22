-- Create profile role system enums and columns
-- Migration: Add role-based profile system to GoBusker

-- Create enums
CREATE TYPE IF NOT EXISTS profile_role_enum AS ENUM ('eventmaker', 'busker', 'viewer');
CREATE TYPE IF NOT EXISTS performance_type_enum AS ENUM ('music', 'comedy', 'magic', 'art', 'other');

-- Add role column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role profile_role_enum DEFAULT 'busker';

-- Add busker-specific columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS stage_name TEXT,
ADD COLUMN IF NOT EXISTS performance_type performance_type_enum,
ADD COLUMN IF NOT EXISTS genres TEXT[],
ADD COLUMN IF NOT EXISTS instruments TEXT[];

-- Add eventmaker-specific columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS organization_name TEXT,
ADD COLUMN IF NOT EXISTS contact_info TEXT,
ADD COLUMN IF NOT EXISTS event_types TEXT[];

-- Add viewer-specific columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS location TEXT;

-- Ensure social_links is JSONB
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{"instagram": "", "youtube": "", "spotify": "", "website": ""}'::jsonb;

-- Make role NOT NULL
ALTER TABLE profiles ALTER COLUMN role SET NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

-- Create event_collaborators table if it doesn't exist
CREATE TYPE IF NOT EXISTS collaboration_status_enum AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE IF NOT EXISTS event_status_enum AS ENUM ('scheduled', 'ongoing', 'completed', 'cancelled');

-- Add status to events if it doesn't exist
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS status event_status_enum DEFAULT 'scheduled';

-- Create collaborators table
CREATE TABLE IF NOT EXISTS event_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  collaborator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status collaboration_status_enum DEFAULT 'pending',
  role TEXT,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(event_id, collaborator_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_events_profile_id ON events(profile_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_event_collaborators_event_id ON event_collaborators(event_id);
CREATE INDEX IF NOT EXISTS idx_event_collaborators_collaborator_id ON event_collaborators(collaborator_id);
CREATE INDEX IF NOT EXISTS idx_event_collaborators_status ON event_collaborators(status);

-- Enable RLS on event_collaborators
ALTER TABLE event_collaborators ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY IF NOT EXISTS "Users can view their collaborations"
  ON event_collaborators
  FOR SELECT
  USING (
    auth.uid() = (SELECT profile_id FROM events WHERE id = event_id) OR
    auth.uid() = collaborator_id
  );

CREATE POLICY IF NOT EXISTS "Eventmakers can invite collaborators"
  ON event_collaborators
  FOR INSERT
  WITH CHECK (
    auth.uid() = (SELECT profile_id FROM events WHERE id = event_id)
  );

CREATE POLICY IF NOT EXISTS "Collaborators can update their status"
  ON event_collaborators
  FOR UPDATE
  USING (auth.uid() = collaborator_id);

CREATE POLICY IF NOT EXISTS "Eventmakers can remove collaborators"
  ON event_collaborators
  FOR DELETE
  USING (
    auth.uid() = (SELECT profile_id FROM events WHERE id = event_id)
  );
