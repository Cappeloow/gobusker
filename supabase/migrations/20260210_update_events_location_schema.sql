-- Update events table to use separate location columns instead of jsonb
-- This matches the intended schema from SUPABASE_SCHEMA.sql

-- First, add the new columns
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS place_name TEXT;

-- Migrate existing location data from jsonb to separate columns
-- This handles events that might have location data in jsonb format
UPDATE events 
SET 
  latitude = CASE 
    WHEN location->>'latitude' IS NOT NULL 
    THEN (location->>'latitude')::DECIMAL(10, 8)
    ELSE NULL 
  END,
  longitude = CASE 
    WHEN location->>'longitude' IS NOT NULL 
    THEN (location->>'longitude')::DECIMAL(11, 8)
    ELSE NULL 
  END,
  place_name = location->>'place_name'
WHERE location IS NOT NULL;

-- Make location jsonb nullable since we're transitioning to separate columns
ALTER TABLE events ALTER COLUMN location DROP NOT NULL;

-- Add event type columns that are missing from initial schema
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'solo_performance',
ADD COLUMN IF NOT EXISTS max_performers INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS accepting_requests BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- Update status column to match enum values
UPDATE events SET status = 'scheduled' WHERE status = 'upcoming';

-- Add index for location-based queries
CREATE INDEX IF NOT EXISTS idx_events_location ON events (latitude, longitude);

-- Add comment to clarify the transition
COMMENT ON COLUMN events.location IS 'Legacy jsonb location field - use latitude, longitude, place_name instead';