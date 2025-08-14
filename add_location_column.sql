-- Add location column to store coordinates
ALTER TABLE leads ADD COLUMN location TEXT;
 
-- Add a comment to document what this field contains
COMMENT ON COLUMN leads.location IS 'Coordinates in format "latitude, longitude" from Google Maps'; 