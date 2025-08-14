-- Add missing columns to campaigns table for Instantly integration
-- Run this in your Supabase SQL Editor

-- Add instantly_id column to store the Instantly campaign ID
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS instantly_id VARCHAR(255) UNIQUE;

-- Add status column to track Live/Deleted status
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Unknown';

-- Create an index on instantly_id for better performance
CREATE INDEX IF NOT EXISTS idx_campaigns_instantly_id 
ON campaigns(instantly_id);

-- Update existing campaigns to have a default status
UPDATE campaigns 
SET status = 'Unknown' 
WHERE status IS NULL;

-- Add a comment to document the table structure
COMMENT ON COLUMN campaigns.instantly_id IS 'Unique identifier from Instantly.ai for campaign sync';
COMMENT ON COLUMN campaigns.status IS 'Campaign status: Live, Deleted, or Unknown'; 