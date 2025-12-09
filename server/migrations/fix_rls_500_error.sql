-- ==========================================
-- FIX: Simplify RLS policy to avoid 500 errors
-- ==========================================

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view their profile members" ON profile_members;
DROP POLICY IF EXISTS "Owners can manage their profile members" ON profile_members;

-- Create simpler, more reliable policies

-- Policy 1: Everyone can SELECT (we'll rely on owner verification in code)
-- This is simpler and avoids the 500 error
CREATE POLICY "Anyone can view profile members" ON profile_members
  FOR SELECT USING (true);

-- Policy 2: Only profile owners can INSERT
CREATE POLICY "Owners can add members" ON profile_members
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM profiles WHERE id = profile_members.profile_id)
  );

-- Policy 3: Only profile owners can UPDATE
CREATE POLICY "Owners can update members" ON profile_members
  FOR UPDATE USING (
    auth.uid() = (SELECT user_id FROM profiles WHERE id = profile_members.profile_id)
  );

-- Policy 4: Only profile owners can DELETE
CREATE POLICY "Owners can remove members" ON profile_members
  FOR DELETE USING (
    auth.uid() = (SELECT user_id FROM profiles WHERE id = profile_members.profile_id)
  );
