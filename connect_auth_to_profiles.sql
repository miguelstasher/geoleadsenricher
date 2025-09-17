-- =====================================================
-- Connect Authentication to User Profiles & Fix Lead Ownership
-- =====================================================

-- Step 1: Get the authenticated user's ID (miguel@stasher.com)
-- First, let's see what we have:
SELECT 'Current auth users:' as info;
SELECT id, email, raw_user_meta_data FROM auth.users WHERE email = 'miguel@stasher.com';

SELECT 'Current user_profiles:' as info;
SELECT * FROM user_profiles;

-- Step 2: Create/Update user_profiles record for authenticated user
-- Insert miguel@stasher.com into user_profiles table connected to auth
INSERT INTO user_profiles (
  auth_id,
  first_name,
  last_name,
  email,
  role,
  is_active,
  created_at
)
SELECT 
  id as auth_id,
  COALESCE(raw_user_meta_data->>'first_name', 'Miguel') as first_name,
  COALESCE(raw_user_meta_data->>'last_name', 'Elias') as last_name,
  email,
  COALESCE(raw_user_meta_data->>'role', 'admin') as role,
  true as is_active,
  NOW() as created_at
FROM auth.users 
WHERE email = 'miguel@stasher.com'
ON CONFLICT (auth_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- Step 3: Get the new user_profiles ID for miguel@stasher.com
-- We'll use this to update lead ownership
SELECT 'New user_profiles record:' as info;
SELECT up.id as user_profiles_id, up.email, au.id as auth_id 
FROM user_profiles up 
JOIN auth.users au ON up.auth_id = au.id 
WHERE au.email = 'miguel@stasher.com';

-- Step 4: Update all leads to be owned by miguel@stasher.com
-- First, let's see what leads exist and their current ownership
SELECT 'Current lead ownership:' as info;
SELECT COUNT(*) as total_leads, record_owner, COUNT(*) as count 
FROM leads 
GROUP BY record_owner;

-- Update all leads to be owned by the authenticated miguel@stasher.com
UPDATE leads 
SET record_owner = (
  SELECT up.id::text 
  FROM user_profiles up 
  JOIN auth.users au ON up.auth_id = au.id 
  WHERE au.email = 'miguel@stasher.com'
  LIMIT 1
)
WHERE record_owner IS NULL 
   OR record_owner = '00000000-0000-0000-0000-000000000001'
   OR record_owner = 'miguel@citystasher.com';

-- Step 5: Clean up - Remove the old miguel@citystasher.com record
DELETE FROM user_profiles 
WHERE email = 'miguel@citystasher.com' 
  AND id = '00000000-0000-0000-0000-000000000001';

-- Step 6: Verify the results
SELECT 'Final verification:' as info;
SELECT 'User profiles:' as section;
SELECT id, email, first_name, last_name, role, auth_id FROM user_profiles;

SELECT 'Lead ownership after update:' as section;
SELECT COUNT(*) as total_leads, record_owner 
FROM leads 
GROUP BY record_owner;

SELECT 'Auth users:' as section;
SELECT id, email, raw_user_meta_data FROM auth.users;
