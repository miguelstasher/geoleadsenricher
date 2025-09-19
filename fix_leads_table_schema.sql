-- Fix leads table schema issues

-- 1. Check current created_by column type
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'leads' 
AND column_name IN ('created_by', 'record_owner', 'latitude', 'longitude');

-- 2. If created_by is UUID type, change it to TEXT to accept names/emails
ALTER TABLE leads ALTER COLUMN created_by TYPE TEXT;
ALTER TABLE leads ALTER COLUMN record_owner TYPE TEXT;

-- 3. Ensure latitude/longitude columns exist and are correct type
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- 4. Update any existing NULL created_by records to a default value
UPDATE leads 
SET created_by = 'Oscar T'
WHERE created_by IS NULL OR created_by = '';

UPDATE leads 
SET record_owner = 'Oscar T'
WHERE record_owner IS NULL OR record_owner = '';

-- 5. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_created_by ON leads(created_by);
CREATE INDEX IF NOT EXISTS idx_leads_record_owner ON leads(record_owner);
CREATE INDEX IF NOT EXISTS idx_leads_coordinates ON leads(latitude, longitude);
