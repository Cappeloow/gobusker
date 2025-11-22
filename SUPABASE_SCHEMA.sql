-- GoBusker Supabase Schema
-- Complete database structure supporting role-based profiles and event management

-- ==========================================
-- ENUMS
-- ==========================================

-- Profile role types
CREATE TYPE profile_role_enum AS ENUM ('eventmaker', 'busker', 'viewer');

-- Performance types for buskers
CREATE TYPE performance_type_enum AS ENUM ('music', 'comedy', 'magic', 'art', 'other');

-- Profile types (individual/band)
CREATE TYPE profile_type_enum AS ENUM ('individual', 'band');

-- Event status
CREATE TYPE event_status_enum AS ENUM ('scheduled', 'ongoing', 'completed', 'cancelled');

-- Collaboration status
CREATE TYPE collaboration_status_enum AS ENUM ('pending', 'accepted', 'rejected');

-- ==========================================
-- PROFILES TABLE
-- ==========================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic Info
  name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  
  -- Role-based fields
  role profile_role_enum NOT NULL DEFAULT 'viewer',
  profile_type profile_type_enum DEFAULT 'individual',
  
  -- For Buskers
  stage_name TEXT,
  performance_type performance_type_enum,
  genres TEXT[], -- Array of genres
  instruments TEXT[], -- Array of instruments
  social_links JSONB DEFAULT '{"instagram": "", "youtube": "", "spotify": "", "website": ""}',
  
  -- For Eventmakers
  organization_name TEXT,
  contact_info TEXT,
  event_types TEXT[], -- Array of event types they host
  
  -- For Viewers
  location TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- ==========================================
-- EVENTS TABLE
-- ==========================================

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organizer
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Event Details
  title TEXT NOT NULL,
  description TEXT,
  status event_status_enum DEFAULT 'scheduled',
  category TEXT,
  subcategory TEXT,
  
  -- Location
  place_name TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Timing
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events
CREATE POLICY "Public events are viewable by everyone" ON events
  FOR SELECT USING (true);

CREATE POLICY "Users can insert events" ON events
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own events" ON events
  FOR UPDATE USING (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own events" ON events
  FOR DELETE USING (auth.uid() = profile_id);

-- ==========================================
-- COLLABORATORS TABLE
-- ==========================================

CREATE TABLE event_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  collaborator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Collaboration details
  status collaboration_status_enum DEFAULT 'pending',
  role TEXT, -- e.g., "performer", "co-host", "vendor"
  
  -- Metadata
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(event_id, collaborator_id)
);

-- Enable RLS on collaborators
ALTER TABLE event_collaborators ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collaborators
CREATE POLICY "Users can view collaborations for their events" ON event_collaborators
  FOR SELECT USING (
    auth.uid() = (SELECT profile_id FROM events WHERE id = event_id) OR
    auth.uid() = collaborator_id
  );

CREATE POLICY "Eventmakers can invite collaborators" ON event_collaborators
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT profile_id FROM events WHERE id = event_id)
  );

CREATE POLICY "Collaborators can update their own status" ON event_collaborators
  FOR UPDATE USING (auth.uid() = collaborator_id);

CREATE POLICY "Eventmakers can remove collaborators" ON event_collaborators
  FOR DELETE USING (
    auth.uid() = (SELECT profile_id FROM events WHERE id = event_id)
  );

-- ==========================================
-- INDEXES
-- ==========================================

-- Profile indexes
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_created_at ON profiles(created_at);

-- Event indexes
CREATE INDEX idx_events_profile_id ON events(profile_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_location ON events USING GIST (
  ll_to_earth(latitude, longitude)
); -- For geographic queries (requires PostGIS or earthdistance extension)

-- Collaborator indexes
CREATE INDEX idx_event_collaborators_event_id ON event_collaborators(event_id);
CREATE INDEX idx_event_collaborators_collaborator_id ON event_collaborators(collaborator_id);
CREATE INDEX idx_event_collaborators_status ON event_collaborators(status);

-- ==========================================
-- VIEWS (Optional but useful)
-- ==========================================

-- View: Upcoming events by location (within a radius)
CREATE VIEW upcoming_events_near_location AS
SELECT 
  e.id,
  e.title,
  e.description,
  e.place_name,
  e.latitude,
  e.longitude,
  e.start_time,
  e.end_time,
  p.name as organizer_name,
  p.avatar_url as organizer_avatar,
  p.role as organizer_role,
  (
    SELECT COUNT(*) FROM event_collaborators 
    WHERE event_id = e.id AND status = 'accepted'
  ) as accepted_collaborators_count
FROM events e
JOIN profiles p ON e.profile_id = p.id
WHERE e.status = 'scheduled' AND e.start_time > NOW()
ORDER BY e.start_time ASC;

-- View: Busker performance opportunities
CREATE VIEW busker_opportunities AS
SELECT 
  e.id as event_id,
  e.title,
  e.description,
  e.start_time,
  e.end_time,
  p.name as organizer_name,
  p.organization_name,
  p.event_types
FROM events e
JOIN profiles p ON e.profile_id = p.id
WHERE p.role = 'eventmaker' AND e.status = 'scheduled'
ORDER BY e.start_time ASC;

-- ==========================================
-- TRIGGERS (Optional - for automatic updated_at)
-- ==========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger for events
CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- SAMPLE DATA (Optional - remove in production)
-- ==========================================

-- These are example inserts to test the structure
-- You would need real auth.users IDs to make these work

/*
INSERT INTO profiles (id, name, role, avatar_url, bio) VALUES
('USER_ID_1', 'John Smith', 'eventmaker', null, 'I organize street festivals'),
('USER_ID_2', 'Jane Musician', 'busker', null, 'Jazz guitarist and vocalist'),
('USER_ID_3', 'Event Viewer', 'viewer', null, 'I love live music');

INSERT INTO events (profile_id, title, description, category, place_name, latitude, longitude, start_time, end_time) VALUES
('USER_ID_1', 'Summer Street Festival', 'A vibrant street festival', 'festival', 'Downtown Park', 40.7128, -74.0060, NOW() + INTERVAL '1 week', NOW() + INTERVAL '1 week 4 hours');
*/

-- ==========================================
-- NOTES
-- ==========================================

/*

IMPORTANT: Geographic queries using the location index require PostGIS extension:
  CREATE EXTENSION IF NOT EXISTS postgis;

OR use earthdistance:
  CREATE EXTENSION IF NOT EXISTS earthdistance;
  CREATE EXTENSION IF NOT EXISTS cube;

Then you can use queries like:
  SELECT * FROM events 
  WHERE earth_distance(ll_to_earth(latitude, longitude), ll_to_earth(40.7128, -74.0060)) < 5000; -- 5km radius

For role-based access control:
- Viewers: Can see all events and profiles, but limited interactions
- Buskers: Can see events, respond to collaborations, manage own profile
- Eventmakers: Can create events, invite collaborators, manage own events

The social_links is stored as JSONB for flexible schema (can add new platforms without migration).

Arrays (genres, instruments, event_types) are used for flexible categorization.

*/
