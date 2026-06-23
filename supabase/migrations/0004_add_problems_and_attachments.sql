-- Add attachment_url to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- Create problems table to store reported issues
CREATE TABLE IF NOT EXISTS problems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    attachment_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS) on problems
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;

-- Allow anyone to report a problem (anonymous or authenticated)
CREATE POLICY "Allow anyone to insert problems"
ON problems FOR INSERT
WITH CHECK (true);

-- Allow authenticated users to read problems (optional, for admin/auditing)
CREATE POLICY "Allow authenticated users to select problems"
ON problems FOR SELECT
USING (auth.role() = 'authenticated');
