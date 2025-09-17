-- Add upload status tracking column to leads table
-- This will help track which leads were successfully uploaded vs failed

-- Add upload_status column to track the detailed status of each lead after upload attempts
ALTER TABLE leads ADD COLUMN IF NOT EXISTS upload_status TEXT DEFAULT NULL;

-- Create index for better performance on upload status queries
CREATE INDEX IF NOT EXISTS idx_leads_upload_status ON leads(upload_status);

-- Add comment to document what this field contains
COMMENT ON COLUMN leads.upload_status IS 'Status after upload attempt: uploaded, skipped, blocklisted, invalid_email, duplicate, or null if never uploaded';

-- Update existing leads that have campaign_status = 'sent' to have upload_status = 'uploaded'
UPDATE leads
SET upload_status = 'uploaded'
WHERE campaign_status = 'sent'
  AND campaign IS NOT NULL
  AND campaign != '';

-- Update existing leads that have campaign_status = 'new' but have a campaign assigned
-- This indicates they were processed but not successfully uploaded
UPDATE leads
SET upload_status = 'failed'
WHERE campaign_status = 'new'
  AND campaign IS NOT NULL
  AND campaign != ''
  AND upload_status IS NULL;

-- Verify the setup
SELECT 'Leads with upload_status = uploaded:' as status, COUNT(*) as count FROM leads WHERE upload_status = 'uploaded';
SELECT 'Leads with upload_status = failed:' as status, COUNT(*) as count FROM leads WHERE upload_status = 'failed';
SELECT 'Leads with no upload_status:' as status, COUNT(*) as count FROM leads WHERE upload_status IS NULL;
