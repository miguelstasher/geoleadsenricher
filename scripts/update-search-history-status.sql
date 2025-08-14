-- Update search_history table to support 'in_process' status
ALTER TABLE search_history 
DROP CONSTRAINT IF EXISTS search_history_status_check;

ALTER TABLE search_history 
ADD CONSTRAINT search_history_status_check 
CHECK (status IN ('pending', 'in_process', 'completed', 'failed'));

-- Add a column to track processing progress
ALTER TABLE search_history 
ADD COLUMN IF NOT EXISTS processed_count INTEGER DEFAULT 0;

-- Add a column to track when processing started
ALTER TABLE search_history 
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP WITH TIME ZONE; 