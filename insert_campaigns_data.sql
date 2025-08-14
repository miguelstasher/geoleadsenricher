-- Disable RLS for campaigns table to allow data insertion
ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;

-- Insert initial campaigns data
INSERT INTO campaigns (id, name, status, last_updated, description, target_audience) VALUES
('camp_123', 'Hotel Outreach - Q2', 'Active', '2023-04-01', 'Targeting hotel businesses for Q2 promotion', 'Hotel managers and owners'),
('camp_124', 'Cafe Owners - New Product', 'Active', '2023-03-15', 'Introducing new product to cafe owners', 'Cafe and restaurant owners'),
('camp_125', 'Office Space Promotion', 'Paused', '2023-02-28', 'Office space rental promotion campaign', 'Business owners looking for office space')
ON CONFLICT (id) DO NOTHING; 