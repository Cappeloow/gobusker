-- ==========================================
-- FIX: Update RLS policy for profile_members
-- ==========================================
-- This allows users to view members of profiles they own OR are members of

-- Drop the old problematic policy
DROP POLICY IF EXISTS "Users can view their profile members" ON profile_members;

-- Create the new, fixed policy
CREATE POLICY "Users can view their profile members" ON profile_members
  FOR SELECT USING (
    -- User owns the profile
    auth.uid() = (SELECT user_id FROM profiles WHERE id = profile_members.profile_id)
    OR
    -- User is a member of the profile
    auth.uid() IN (
      SELECT user_id FROM profile_members WHERE profile_id = profile_members.profile_id
    )
  );

-- Also need to fix the management policy
DROP POLICY IF EXISTS "Users can manage their profile members" ON profile_members;

CREATE POLICY "Owners can manage their profile members" ON profile_members
  FOR ALL USING (
    -- Only owners (user_id from profiles table) can manage
    auth.uid() = (SELECT user_id FROM profiles WHERE id = profile_members.profile_id)
    OR
    -- Or admins in the profile_members table
    auth.uid() IN (
      SELECT pm.user_id FROM profile_members pm 
      WHERE pm.profile_id = profile_members.profile_id AND pm.role IN ('owner', 'admin')
    )
  );
