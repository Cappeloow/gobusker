-- Add member information columns to profile_members table
ALTER TABLE profile_members 
ADD COLUMN IF NOT EXISTS alias TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS specialty TEXT;

-- Add comment explaining the columns
COMMENT ON COLUMN profile_members.alias IS 'Display name/stage name for this member in this profile';
COMMENT ON COLUMN profile_members.description IS 'Short bio or description of the member';
COMMENT ON COLUMN profile_members.specialty IS 'Instrument, role, or specialty (e.g., "Guitarist", "Vocalist", "Manager")';
