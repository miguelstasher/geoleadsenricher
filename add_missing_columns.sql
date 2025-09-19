-- Add missing latitude and longitude columns to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leads_latitude ON leads(latitude);
CREATE INDEX IF NOT EXISTS idx_leads_longitude ON leads(longitude);
CREATE INDEX IF NOT EXISTS idx_leads_location ON leads(latitude, longitude);

-- Add comments
COMMENT ON COLUMN leads.latitude IS 'Latitude coordinate from Google Maps';
COMMENT ON COLUMN leads.longitude IS 'Longitude coordinate from Google Maps';
