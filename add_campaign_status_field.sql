-- Add campaign_status field to leads table
ALTER TABLE leads ADD COLUMN campaign_status TEXT DEFAULT 'new';

-- Update existing leads that have campaigns assigned to 'new' status
UPDATE leads 
SET campaign_status = 'new' 
WHERE campaign IS NOT NULL AND campaign != '';

-- Create index for better performance on campaign status queries
CREATE INDEX IF NOT EXISTS idx_leads_campaign_status ON leads(campaign, campaign_status); 