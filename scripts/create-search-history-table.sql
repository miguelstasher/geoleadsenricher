-- Create search_history table for storing Google Maps search results
CREATE TABLE IF NOT EXISTS search_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  search_method VARCHAR(20) NOT NULL CHECK (search_method IN ('city', 'coordinates')),
  
  -- Location data
  city VARCHAR(100),
  country VARCHAR(100),
  coordinates VARCHAR(50),
  radius INTEGER,
  
  -- Search parameters
  categories TEXT[], -- Array of selected categories
  other_categories TEXT,
  selected_group VARCHAR(100),
  
  -- Metadata
  currency VARCHAR(10),
  created_by VARCHAR(100),
  total_results INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Search results (JSON array of found businesses)
  results JSONB,
  
  -- Search status
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_created_by ON search_history(created_by);
CREATE INDEX IF NOT EXISTS idx_search_history_search_method ON search_history(search_method);
CREATE INDEX IF NOT EXISTS idx_search_history_city_country ON search_history(city, country);

-- Add RLS (Row Level Security) if needed
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now (you can restrict this later)
CREATE POLICY "Allow all operations on search_history" ON search_history
  FOR ALL USING (true) WITH CHECK (true); 