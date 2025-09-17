-- =====================================================
-- Simplified Supabase Auth Configuration
-- =====================================================

-- 1. First, make sure user_profiles table has the auth columns
-- (This should already be done from previous setup)
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS auth_id UUID,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

-- 4. Create RLS policies
CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT USING (auth_id = auth.uid());

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth_id = auth.uid());

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth_id = auth.uid());

-- 5. Create a function that can be called manually to create user profiles
CREATE OR REPLACE FUNCTION create_user_profile(
  user_id UUID,
  user_email TEXT,
  first_name TEXT DEFAULT '',
  last_name TEXT DEFAULT ''
)
RETURNS void AS $$
BEGIN
  INSERT INTO user_profiles (
    auth_id,
    email,
    first_name,
    last_name,
    role,
    is_active,
    created_at
  ) VALUES (
    user_id,
    user_email,
    first_name,
    last_name,
    'user',
    true,
    NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Comments
COMMENT ON FUNCTION create_user_profile IS 'Manually creates user profile - call this function after user signup';

-- Instructions:
-- After a user signs up, you can manually create their profile by calling:
-- SELECT create_user_profile('user-uuid-here', 'email@example.com', 'FirstName', 'LastName');
