-- Fix campaigns table for Instantly integration
-- Copy and paste this entire block into Supabase SQL Editor and click RUN

-- Drop existing table if it has wrong structure
DROP TABLE IF EXISTS campaigns;

-- Create campaigns table with proper structure for Instantly integration
CREATE TABLE campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  instantly_id VARCHAR(255) UNIQUE,
  status VARCHAR(50) DEFAULT 'Unknown',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  description TEXT,
  target_audience TEXT
);

-- Create indexes for better performance
CREATE INDEX idx_campaigns_instantly_id ON campaigns(instantly_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_created_at ON campaigns(created_at);

-- Add comments for documentation
COMMENT ON TABLE campaigns IS 'Email campaigns synced from Instantly.ai';
COMMENT ON COLUMN campaigns.instantly_id IS 'Unique identifier from Instantly.ai for campaign sync';
COMMENT ON COLUMN campaigns.status IS 'Campaign status: Live, Deleted, or Unknown';

-- Insert a sample campaign to test
INSERT INTO campaigns (name, instantly_id, status, description) 
VALUES ('Sample Campaign', 'sample-123', 'Live', 'Test campaign for structure verification'); 