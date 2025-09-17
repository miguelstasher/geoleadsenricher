-- Create settings table for storing API keys and other configuration
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert the existing Instantly API key
INSERT INTO settings (key, value) 
VALUES ('api_keys', '{"hunter":"","snov":"","instantly":"PNcaUGkSra0wdz3b6NEM3p7zzqj3S","googleMaps":""}')
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = NOW();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
