# Supabase Migration Guide

## Overview

This guide provides step-by-step instructions to update your Supabase database to support the new role-based profile system.

---

## Prerequisites

- Access to Supabase dashboard
- A Supabase project with existing profiles table
- Backup of your database (recommended)

---

## Step-by-Step Migration

### Step 1: Create Enums

Run these SQL commands in Supabase's SQL editor:

```sql
-- Create profile role enum
CREATE TYPE profile_role_enum AS ENUM ('eventmaker', 'busker', 'viewer');

-- Create performance type enum
CREATE TYPE performance_type_enum AS ENUM ('music', 'comedy', 'magic', 'art', 'other');

-- Create profile type enum (if not exists)
CREATE TYPE profile_type_enum AS ENUM ('individual', 'band');

-- Create event status enum (if not exists)
CREATE TYPE event_status_enum AS ENUM ('scheduled', 'ongoing', 'completed', 'cancelled');

-- Create collaboration status enum
CREATE TYPE collaboration_status_enum AS ENUM ('pending', 'accepted', 'rejected');
```

---

### Step 2: Add Role Column to Profiles

```sql
-- Add role column with default value
ALTER TABLE profiles 
ADD COLUMN role profile_role_enum DEFAULT 'busker';

-- Make it NOT NULL after adding default
ALTER TABLE profiles 
ALTER COLUMN role SET NOT NULL;
```

**Note:** Default is 'busker' to maintain backward compatibility with existing profiles.

---

### Step 3: Add Busker Fields

```sql
-- Add busker-specific fields
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS stage_name TEXT,
ADD COLUMN IF NOT EXISTS performance_type performance_type_enum,
ADD COLUMN IF NOT EXISTS genres TEXT[],
ADD COLUMN IF NOT EXISTS instruments TEXT[];
```

---

### Step 4: Add Eventmaker Fields

```sql
-- Add eventmaker-specific fields
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS organization_name TEXT,
ADD COLUMN IF NOT EXISTS contact_info TEXT,
ADD COLUMN IF NOT EXISTS event_types TEXT[];
```

---

### Step 5: Add Viewer Fields

```sql
-- Add viewer-specific fields
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS location TEXT;
```

---

### Step 6: Update Social Links to JSONB

If your `social_links` is not already JSONB:

```sql
-- If it's TEXT, convert it
ALTER TABLE profiles 
ALTER COLUMN social_links TYPE JSONB USING social_links::jsonb,
SET DEFAULT '{"instagram": "", "youtube": "", "spotify": "", "website": ""}'::jsonb;

-- If column doesn't exist, add it
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{"instagram": "", "youtube": "", "spotify": "", "website": ""}'::jsonb;
```

---

### Step 7: Ensure Updated_at Trigger

```sql
-- Create function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if not exists
CREATE TRIGGER IF NOT EXISTS update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

---

### Step 8: Add Indexes

```sql
-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);
```

---

### Step 9: Update Events Table (if exists)

```sql
-- Ensure events table has profile_id reference
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Add status column
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS status event_status_enum DEFAULT 'scheduled';

-- Update indexes
CREATE INDEX IF NOT EXISTS idx_events_profile_id ON events(profile_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
```

---

### Step 10: Create Collaborators Table

```sql
-- Create event collaborators table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_event_collaborators_event_id ON event_collaborators(event_id);
CREATE INDEX IF NOT EXISTS idx_event_collaborators_collaborator_id ON event_collaborators(collaborator_id);
CREATE INDEX IF NOT EXISTS idx_event_collaborators_status ON event_collaborators(status);

-- Enable RLS
ALTER TABLE event_collaborators ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their collaborations"
  ON event_collaborators
  FOR SELECT
  USING (
    auth.uid() = (SELECT profile_id FROM events WHERE id = event_id) OR
    auth.uid() = collaborator_id
  );

CREATE POLICY "Eventmakers can invite collaborators"
  ON event_collaborators
  FOR INSERT
  WITH CHECK (
    auth.uid() = (SELECT profile_id FROM events WHERE id = event_id)
  );

CREATE POLICY "Collaborators can update their status"
  ON event_collaborators
  FOR UPDATE
  USING (auth.uid() = collaborator_id);
```

---

### Step 11: Enable RLS (if not already enabled)

```sql
-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id);
```

---

## Verification

After running all migrations, verify the schema:

```sql
-- Check profiles table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- Check enum types exist
SELECT typname 
FROM pg_type 
WHERE typtype = 'e' 
AND typname IN ('profile_role_enum', 'performance_type_enum', 'collaboration_status_enum');

-- Check event_collaborators table exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'event_collaborators' 
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname 
FROM pg_indexes 
WHERE tablename IN ('profiles', 'events', 'event_collaborators');
```

---

## Data Updates (Optional)

If you want to categorize existing profiles by role:

```sql
-- This is optional - only if you have specific criteria for existing users

-- Set musicans/performers to 'busker'
UPDATE profiles 
SET role = 'busker' 
WHERE genres IS NOT NULL OR instruments IS NOT NULL;

-- Set eventmakers based on custom criteria
UPDATE profiles 
SET role = 'eventmaker' 
WHERE organization_name IS NOT NULL;

-- Keep rest as 'viewer' (default)
```

---

## Rollback Plan

If you need to rollback:

```sql
-- Drop new tables
DROP TABLE IF EXISTS event_collaborators;

-- Drop new columns (can only drop individual columns, not in one statement)
ALTER TABLE profiles DROP COLUMN IF EXISTS role;
ALTER TABLE profiles DROP COLUMN IF EXISTS stage_name;
ALTER TABLE profiles DROP COLUMN IF EXISTS performance_type;
ALTER TABLE profiles DROP COLUMN IF EXISTS genres;
ALTER TABLE profiles DROP COLUMN IF EXISTS instruments;
ALTER TABLE profiles DROP COLUMN IF EXISTS organization_name;
ALTER TABLE profiles DROP COLUMN IF EXISTS contact_info;
ALTER TABLE profiles DROP COLUMN IF EXISTS event_types;
ALTER TABLE profiles DROP COLUMN IF EXISTS location;

-- Drop enums
DROP TYPE IF EXISTS profile_role_enum;
DROP TYPE IF EXISTS performance_type_enum;
DROP TYPE IF EXISTS collaboration_status_enum;
```

---

## Troubleshooting

### Error: "column already exists"

This means the column was already added. You can safely skip that step.

### Error: "cannot drop enum in use"

Drop dependent columns first, then drop the enum.

### Error: "violates foreign key constraint"

Ensure all profile_ids in events exist in the profiles table before adding foreign keys.

---

## Frontend Environment Variables

No new environment variables needed. Ensure your `.env` file has:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_KEY=your_supabase_key
```

---

## Testing in Supabase Console

After migration, test with sample queries:

```sql
-- Insert test busker profile
INSERT INTO profiles (id, name, role, stage_name, performance_type, genres, instruments, avatar_url)
VALUES (
  gen_random_uuid(),
  'Test Busker',
  'busker',
  'Stage Name',
  'music',
  ARRAY['Jazz', 'Blues'],
  ARRAY['Guitar', 'Vocals'],
  NULL
);

-- Insert test eventmaker profile
INSERT INTO profiles (id, name, role, organization_name, contact_info, event_types)
VALUES (
  gen_random_uuid(),
  'Test Organizer',
  'eventmaker',
  'Test Events Inc',
  'contact@test.com',
  ARRAY['Concerts', 'Festivals']
);

-- Insert test viewer profile
INSERT INTO profiles (id, name, role, location)
VALUES (
  gen_random_uuid(),
  'Test Viewer',
  'viewer',
  'San Francisco, CA'
);

-- Query to verify
SELECT id, name, role, stage_name, organization_name, location 
FROM profiles 
WHERE role IN ('busker', 'eventmaker', 'viewer')
LIMIT 3;
```

---

## Notes

- **Backward Compatibility:** Existing profiles default to 'busker' role
- **No Data Loss:** Migration is additive (adds columns, doesn't remove data)
- **Performance:** Indexes added for optimal query performance
- **Security:** RLS policies ensure users can only see/modify their own data

---

## Next Steps

1. Run all SQL migrations in Supabase
2. Update frontend components (already done in CreateProfile.tsx)
3. Test profile creation with all three roles
4. Deploy updated frontend
5. Monitor for any issues

For questions, refer to the main documentation in `PROFILE_SYSTEM.md`.
