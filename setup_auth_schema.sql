-- =====================================================
-- GeoLeads Authentication & User Ownership Schema
-- =====================================================

-- 1. Enable Supabase Auth (if not already enabled)
-- This is usually done in the Supabase dashboard, but we'll add it here for completeness

-- 2. Update user_profiles table to sync with auth.users
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create unique index on auth_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_auth_id ON user_profiles(auth_id);

-- 3. Add user ownership to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS owned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS shared_with UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS duplicate_of UUID REFERENCES leads(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS duplicate_count INTEGER DEFAULT 0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leads_created_by ON leads(created_by);
CREATE INDEX IF NOT EXISTS idx_leads_owned_by ON leads(owned_by);
CREATE INDEX IF NOT EXISTS idx_leads_is_duplicate ON leads(is_duplicate);
CREATE INDEX IF NOT EXISTS idx_leads_duplicate_of ON leads(duplicate_of);

-- 4. Add user ownership to cold_calling_leads table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cold_calling_leads') THEN
        ALTER TABLE cold_calling_leads 
        ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS owned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS shared_with UUID[] DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS duplicate_of UUID REFERENCES cold_calling_leads(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS duplicate_count INTEGER DEFAULT 0;

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_cold_calling_leads_created_by ON cold_calling_leads(created_by);
        CREATE INDEX IF NOT EXISTS idx_cold_calling_leads_owned_by ON cold_calling_leads(owned_by);
        CREATE INDEX IF NOT EXISTS idx_cold_calling_leads_is_duplicate ON cold_calling_leads(is_duplicate);
    END IF;
END $$;

-- 5. Add user ownership to campaigns table
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS owned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS shared_with UUID[] DEFAULT '{}';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_campaigns_owned_by ON campaigns(owned_by);

-- 6. Create function to automatically sync auth.users with user_profiles
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (
        auth_id,
        id,
        first_name,
        last_name,
        email,
        photo_url,
        role,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        NEW.id::text,
        COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        NEW.email,
        NEW.raw_user_meta_data->>'avatar_url',
        'user',
        NOW(),
        NOW()
    )
    ON CONFLICT (auth_id) DO UPDATE SET
        first_name = COALESCE(NEW.raw_user_meta_data->>'first_name', user_profiles.first_name),
        last_name = COALESCE(NEW.raw_user_meta_data->>'last_name', user_profiles.last_name),
        email = NEW.email,
        photo_url = COALESCE(NEW.raw_user_meta_data->>'avatar_url', user_profiles.photo_url),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 8. Create function to detect duplicates
CREATE OR REPLACE FUNCTION detect_lead_duplicates()
RETURNS TRIGGER AS $$
DECLARE
    existing_lead_id UUID;
    duplicate_count INTEGER;
BEGIN
    -- Check for duplicates based on email, phone, or website
    SELECT id INTO existing_lead_id
    FROM leads 
    WHERE (
        (NEW.email IS NOT NULL AND email = NEW.email) OR
        (NEW.phone IS NOT NULL AND phone = NEW.phone) OR
        (NEW.website IS NOT NULL AND website = NEW.website)
    )
    AND id != NEW.id
    AND is_duplicate = false
    LIMIT 1;

    IF existing_lead_id IS NOT NULL THEN
        -- Mark the new lead as duplicate
        NEW.is_duplicate = true;
        NEW.duplicate_of = existing_lead_id;
        
        -- Update duplicate count on the original lead
        UPDATE leads 
        SET duplicate_count = duplicate_count + 1 
        WHERE id = existing_lead_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger for duplicate detection
DROP TRIGGER IF EXISTS check_lead_duplicates ON leads;
CREATE TRIGGER check_lead_duplicates
    BEFORE INSERT OR UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION detect_lead_duplicates();

-- 10. Create view for user statistics
CREATE OR REPLACE VIEW user_lead_stats AS
SELECT 
    u.id as user_id,
    u.first_name,
    u.last_name,
    u.email,
    COUNT(l.id) as total_leads,
    COUNT(CASE WHEN l.is_duplicate = false THEN 1 END) as unique_leads,
    COUNT(CASE WHEN l.is_duplicate = true THEN 1 END) as duplicate_leads,
    COUNT(CASE WHEN l.email_status = 'verified' THEN 1 END) as verified_leads,
    COUNT(CASE WHEN l.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as leads_last_30_days
FROM user_profiles u
LEFT JOIN leads l ON l.created_by = u.auth_id
WHERE u.is_active = true
GROUP BY u.id, u.first_name, u.last_name, u.email;

-- 11. Create RLS (Row Level Security) policies
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own leads + shared leads
CREATE POLICY "Users can view own and shared leads" ON leads
    FOR SELECT USING (
        auth.uid() = created_by OR 
        auth.uid() = owned_by OR 
        auth.uid() = ANY(shared_with) OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE auth_id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Users can insert leads (they become the creator/owner)
CREATE POLICY "Users can insert leads" ON leads
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update their own leads
CREATE POLICY "Users can update own leads" ON leads
    FOR UPDATE USING (
        auth.uid() = created_by OR 
        auth.uid() = owned_by OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE auth_id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Users can delete their own leads
CREATE POLICY "Users can delete own leads" ON leads
    FOR DELETE USING (
        auth.uid() = created_by OR 
        auth.uid() = owned_by OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE auth_id = auth.uid() AND role = 'admin'
        )
    );

-- Similar policies for campaigns
CREATE POLICY "Users can view own and shared campaigns" ON campaigns
    FOR SELECT USING (
        auth.uid() = created_by OR 
        auth.uid() = owned_by OR 
        auth.uid() = ANY(shared_with) OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE auth_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can insert campaigns" ON campaigns
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own campaigns" ON campaigns
    FOR UPDATE USING (
        auth.uid() = created_by OR 
        auth.uid() = owned_by OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE auth_id = auth.uid() AND role = 'admin'
        )
    );

-- Policy for user profiles
CREATE POLICY "Users can view all profiles" ON user_profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = auth_id);

-- 12. Add comments for documentation
COMMENT ON COLUMN leads.created_by IS 'User who created/extracted this lead';
COMMENT ON COLUMN leads.owned_by IS 'User who currently owns this lead';
COMMENT ON COLUMN leads.shared_with IS 'Array of user IDs who have access to this lead';
COMMENT ON COLUMN leads.is_duplicate IS 'Whether this lead is a duplicate of another';
COMMENT ON COLUMN leads.duplicate_of IS 'ID of the original lead if this is a duplicate';
COMMENT ON COLUMN leads.duplicate_count IS 'Number of duplicates found for this lead';

COMMENT ON TABLE user_lead_stats IS 'View showing lead statistics per user';

-- 13. Create function to share leads with other users
CREATE OR REPLACE FUNCTION share_lead_with_user(lead_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE leads 
    SET shared_with = array_append(shared_with, user_id)
    WHERE id = lead_id 
    AND NOT (user_id = ANY(shared_with))
    AND (auth.uid() = created_by OR auth.uid() = owned_by);
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Create function to transfer lead ownership
CREATE OR REPLACE FUNCTION transfer_lead_ownership(lead_id UUID, new_owner_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE leads 
    SET owned_by = new_owner_id
    WHERE id = lead_id 
    AND (auth.uid() = created_by OR auth.uid() = owned_by OR 
         EXISTS (SELECT 1 FROM user_profiles WHERE auth_id = auth.uid() AND role = 'admin'));
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
SELECT 'GeoLeads Authentication Schema Setup Complete! 🎉' as status;
