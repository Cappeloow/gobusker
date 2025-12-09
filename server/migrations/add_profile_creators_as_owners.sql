-- ==========================================
-- MIGRATION: Add profile creators as owners to profile_members
-- ==========================================
-- This ensures profile creators can manage their profiles

-- Add any profile creators who aren't already in profile_members as owners
INSERT INTO profile_members (profile_id, user_id, revenue_share, role)
SELECT p.id, p.user_id, 100, 'owner'
FROM profiles p
WHERE p.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM profile_members pm 
    WHERE pm.profile_id = p.id 
    AND pm.user_id = p.user_id
  )
ON CONFLICT (profile_id, user_id) DO NOTHING;

-- Verify the insert worked
SELECT COUNT(*) as "Profiles added as owners" 
FROM profile_members 
WHERE role = 'owner';
