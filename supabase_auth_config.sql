-- =====================================================
-- Supabase Auth Configuration for GeoLeads
-- =====================================================

-- Run this in your Supabase SQL Editor to configure auth settings

-- 1. Disable email confirmation for faster testing (OPTIONAL - for development only)
-- Go to Authentication > Settings in Supabase Dashboard and set:
-- - "Enable email confirmations" = OFF (for testing)
-- - "Enable email confirmations" = ON (for production)

-- 2. Create a function to auto-create user profiles when users sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    auth_id,
    first_name,
    last_name,
    email,
    role,
    is_active,
    created_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email,
    'user',
    true,
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create trigger to automatically create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Create test user credentials (run this after configuring auth)
-- Email: miguel@geoleads.com
-- Password: geoleads123
-- This will be created via the signup form

-- 5. Update RLS policies for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT USING (auth_id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth_id = auth.uid());

-- Allow service role to insert profiles (for the trigger)
CREATE POLICY "Service role can insert profiles" ON user_profiles
  FOR INSERT WITH CHECK (true);

-- 6. Comments
COMMENT ON FUNCTION handle_new_user() IS 'Automatically creates user profile when auth user signs up';
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Creates user profile automatically on signup';
