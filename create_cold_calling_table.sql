-- Create cold_calling_leads table for leads without websites but with phone numbers
-- This table is optimized for cold calling workflows

CREATE TABLE IF NOT EXISTS cold_calling_leads (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    country TEXT,
    city TEXT,
    poi TEXT,
    business_type TEXT,
    location TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    record_owner TEXT,
    last_modified TIMESTAMPTZ DEFAULT NOW(),
    currency TEXT,
    
    -- Add indexes for common queries
    CONSTRAINT cold_calling_leads_phone_check CHECK (phone IS NOT NULL AND phone != '')
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cold_calling_leads_phone ON cold_calling_leads(phone);
CREATE INDEX IF NOT EXISTS idx_cold_calling_leads_country ON cold_calling_leads(country);
CREATE INDEX IF NOT EXISTS idx_cold_calling_leads_business_type ON cold_calling_leads(business_type);
CREATE INDEX IF NOT EXISTS idx_cold_calling_leads_record_owner ON cold_calling_leads(record_owner);
CREATE INDEX IF NOT EXISTS idx_cold_calling_leads_created_at ON cold_calling_leads(created_at);

-- Add RLS (Row Level Security) if needed
-- ALTER TABLE cold_calling_leads ENABLE ROW LEVEL SECURITY;

-- Add comment to table
COMMENT ON TABLE cold_calling_leads IS 'Leads without websites but with phone numbers - optimized for cold calling workflows';
COMMENT ON COLUMN cold_calling_leads.phone IS 'Phone number - required for cold calling';
COMMENT ON COLUMN cold_calling_leads.poi IS 'Point of Interest - additional context for cold calling';
