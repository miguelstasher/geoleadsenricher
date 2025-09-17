-- =====================================================
-- Set miguel@stasher.com as Admin User
-- =====================================================

-- Update the user's metadata to set role as admin
-- This will update the auth.users table user_metadata
-- Note: You'll need to run this manually or use Supabase dashboard

-- To set miguel@stasher.com as admin, go to:
-- Supabase Dashboard > Authentication > Users > Find miguel@stasher.com > Edit User
-- In the "User Metadata" section, add:
-- {
--   "first_name": "Miguel",
--   "last_name": "Elias", 
--   "role": "admin"
-- }

-- OR run this SQL to find the user ID and update via SQL:
-- SELECT id, email, user_metadata FROM auth.users WHERE email = 'miguel@stasher.com';

-- Then update the metadata (replace 'your-user-id-here' with actual ID):
-- UPDATE auth.users 
-- SET user_metadata = user_metadata || '{"role": "admin"}'::jsonb
-- WHERE email = 'miguel@stasher.com';

-- Verify the update:
SELECT id, email, user_metadata FROM auth.users WHERE email = 'miguel@stasher.com';
