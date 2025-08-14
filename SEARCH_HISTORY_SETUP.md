# Search History Feature Setup

## Overview
The search history feature allows users to track and review all Google Maps searches performed in the Extract Leads section. Each search is automatically saved to Supabase with complete details and results.

## Database Setup

### 1. Create the Database Table
Run the following SQL script in your Supabase SQL editor:

```sql
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
```

## Features

### 1. Automatic Search Saving
- Every search performed in `/leads/extract` is automatically saved to Supabase
- Includes all search parameters, results, and metadata
- Fallback to localStorage if Supabase is unavailable

### 2. Search History Page (`/leads/history`)
- View all past searches in a clean, organized table
- Filter by search method (city/coordinates)
- Filter by creator (team member)
- Search by city, country, creator, or category
- View detailed results for each search
- Delete individual search records

### 3. Data Stored for Each Search
- **Search Method**: City or Coordinates
- **Location**: City/Country or Coordinates with radius
- **Categories**: Selected business categories
- **Results**: Complete business data found
- **Metadata**: Currency, creator, timestamp
- **Status**: Completed, pending, or failed

## Usage

### Performing a Search
1. Go to `/leads/extract`
2. Fill out the search form (method, location, categories, etc.)
3. Click "Start Search"
4. Search is automatically saved when results are returned

### Viewing Search History
1. Click "View search history" button on the Extract Leads page
2. Or navigate directly to `/leads/history`
3. Use filters and search to find specific searches
4. Click "View Results" to see the businesses found in that search
5. Click "Delete" to remove a search from history

## Technical Details

### Files Modified/Created
- `src/app/leads/history/page.tsx` - New search history page
- `src/app/leads/extract/page.tsx` - Updated to save to Supabase
- `scripts/create-search-history-table.sql` - Database setup script

### Database Schema
The `search_history` table stores:
- Search parameters and filters used
- Complete results as JSONB
- Timestamps with timezone support
- Status tracking for search completion
- Indexes for optimal query performance

### Error Handling
- Graceful fallback to localStorage if Supabase is unavailable
- User-friendly error messages
- Retry functionality for failed operations

## Next Steps
- Consider adding export functionality for search history
- Implement search result comparison between different searches
- Add analytics on most searched categories/locations
- Set up automated cleanup of old search records 