-- Add contact tracking fields to cold_calling_leads table
-- These fields will help track outreach activities and call notes

-- Add the new columns
ALTER TABLE cold_calling_leads 
ADD COLUMN IF NOT EXISTS contacted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS first_contacted_date TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- Create indexes for better performance on filtering
CREATE INDEX IF NOT EXISTS idx_cold_calling_leads_contacted ON cold_calling_leads(contacted);
CREATE INDEX IF NOT EXISTS idx_cold_calling_leads_first_contacted_date ON cold_calling_leads(first_contacted_date);

-- Add comments to explain the new fields
COMMENT ON COLUMN cold_calling_leads.contacted IS 'Whether this lead has been contacted via phone call';
COMMENT ON COLUMN cold_calling_leads.first_contacted_date IS 'Timestamp when the lead was first contacted (auto-populated)';
COMMENT ON COLUMN cold_calling_leads.notes IS 'Call notes, follow-up information, and other relevant details';

-- Optional: Add a trigger to automatically set first_contacted_date when contacted is set to true
-- (This can also be handled in the application code)
CREATE OR REPLACE FUNCTION set_first_contacted_date()
RETURNS TRIGGER AS $$
BEGIN
    -- If contacted is being set to true and first_contacted_date is not already set
    IF NEW.contacted = TRUE AND OLD.contacted = FALSE AND NEW.first_contacted_date IS NULL THEN
        NEW.first_contacted_date = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_set_first_contacted_date ON cold_calling_leads;
CREATE TRIGGER trigger_set_first_contacted_date
    BEFORE UPDATE ON cold_calling_leads
    FOR EACH ROW
    EXECUTE FUNCTION set_first_contacted_date();
