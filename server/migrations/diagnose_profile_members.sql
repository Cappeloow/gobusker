-- ==========================================
-- DIAGNOSTIC QUERY - Check profile_members table
-- ==========================================

-- 1. Check if profile_members table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'profile_members'
) as "Table Exists";

-- 2. Count total members
SELECT COUNT(*) as "Total Members" FROM profile_members;

-- 3. Show all members with profile names
SELECT 
  pm.id,
  pm.profile_id,
  p.name as "Profile Name",
  pm.user_id,
  pm.revenue_share,
  pm.role,
  pm.created_at
FROM profile_members pm
LEFT JOIN profiles p ON pm.profile_id = p.id
ORDER BY pm.created_at DESC;

-- 4. Show members filtered by YOUR user_id (replace with your actual user_id)
-- First, let's find your user_id from auth.users
SELECT 
  u.id,
  u.email,
  COUNT(pm.id) as "Member Records"
FROM auth.users u
LEFT JOIN profile_members pm ON u.id = pm.user_id
WHERE u.email = 'cappew1996@gmail.com'
GROUP BY u.id, u.email;

-- 5. Check your profiles
SELECT 
  p.id,
  p.name,
  p.user_id,
  COUNT(pm.id) as "Members in this profile"
FROM profiles p
LEFT JOIN profile_members pm ON p.id = pm.profile_id
WHERE p.user_id = (SELECT id FROM auth.users WHERE email = 'cappew1996@gmail.com')
GROUP BY p.id, p.name, p.user_id;

-- 6. Check if the migration was applied (show profile_members with user info)
SELECT 
  pm.profile_id,
  p.name as "Profile",
  u.email as "Member Email",
  pm.revenue_share,
  pm.role
FROM profile_members pm
JOIN profiles p ON pm.profile_id = p.id
JOIN auth.users u ON pm.user_id = u.id
WHERE u.email = 'cappew1996@gmail.com'
ORDER BY p.name;
