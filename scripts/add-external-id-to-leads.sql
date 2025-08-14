-- Add external_id field to leads table for Google Maps place_id tracking
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);

-- Add index for better performance when checking duplicates
CREATE INDEX IF NOT EXISTS idx_leads_external_id ON leads(external_id);

-- Add source field to track where leads came from
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual'; 