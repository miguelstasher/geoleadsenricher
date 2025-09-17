-- =====================================================
-- Simple Fix: Connect Existing User to Auth and Update Lead Ownership
-- =====================================================

-- Step 1: See what we currently have
SELECT 'Current user_profiles:' as info;
SELECT id, email, first_name, last_name, role, auth_id FROM user_profiles;

SELECT 'Current auth users:' as info;
SELECT id, email, raw_user_meta_data FROM auth.users WHERE email = 'miguel@stasher.com';

-- Step 2: Update the existing miguel@stasher.com record to connect to auth
UPDATE user_profiles 
SET auth_id = 'f3218bc6-acf0-4912-b246-2fa98d0b34d8',
    role = 'admin',
    is_active = true
WHERE email = 'miguel@stasher.com';

-- Step 3: Get the user_profiles ID for miguel@stasher.com
SELECT 'Miguel user_profiles ID:' as info;
SELECT id, email, auth_id FROM user_profiles WHERE email = 'miguel@stasher.com';

-- Step 4: Update all leads to be owned by miguel@stasher.com
-- First see current ownership
SELECT 'Current lead ownership:' as info;
SELECT record_owner, COUNT(*) as lead_count FROM leads GROUP BY record_owner;

-- Update all leads to miguel@stasher.com's user_profiles ID
UPDATE leads 
SET record_owner = (
  SELECT id::text FROM user_profiles WHERE email = 'miguel@stasher.com' LIMIT 1
)
WHERE record_owner IS NULL 
   OR record_owner = '00000000-0000-0000-0000-000000000001'
   OR record_owner = 'miguel@citystasher.com';

-- Step 5: Clean up old records
DELETE FROM user_profiles 
WHERE email = 'miguel@citystasher.com' 
  AND id = '00000000-0000-0000-0000-000000000001';

-- Step 6: Final verification
SELECT 'Final results:' as info;
SELECT 'User profiles:' as section;
SELECT id, email, first_name, last_name, role, auth_id FROM user_profiles;

SELECT 'Lead ownership:' as section;
SELECT record_owner, COUNT(*) as lead_count FROM leads GROUP BY record_owner;
