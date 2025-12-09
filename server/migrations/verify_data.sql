-- ==========================================
-- VERIFY: Check if data exists
-- ==========================================

-- 1. Check table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profile_members'
ORDER BY ordinal_position;

-- 2. Count all rows in profile_members
SELECT COUNT(*) as total_rows FROM profile_members;

-- 3. Show ALL data in profile_members
SELECT * FROM profile_members LIMIT 100;

-- 4. Check your user ID and profiles
SELECT 
  u.id as user_id,
  u.email,
  COUNT(p.id) as profile_count
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.user_id
WHERE u.email = 'cappew1996@gmail.com'
GROUP BY u.id, u.email;

-- 5. Show your profiles
SELECT id, name, user_id 
FROM profiles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'cappew1996@gmail.com');
