-- Migration 0003: Add reposts table and repost_count to posts

-- 1. Add repost_count column to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS repost_count INT DEFAULT 0 CHECK (repost_count >= 0);

-- 2. Create reposts table
CREATE TABLE IF NOT EXISTS reposts (
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (profile_id, post_id)
);

-- 3. Indexes for efficient queries
CREATE INDEX IF NOT EXISTS reposts_post_id_idx ON reposts (post_id);
CREATE INDEX IF NOT EXISTS reposts_profile_id_idx ON reposts (profile_id);
CREATE INDEX IF NOT EXISTS reposts_created_at_idx ON reposts (created_at DESC);

-- 4. Trigger function to auto-sync repost_count on posts
CREATE OR REPLACE FUNCTION handle_repost_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE posts SET repost_count = repost_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE posts SET repost_count = GREATEST(0, repost_count - 1) WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_repost_change
AFTER INSERT OR DELETE ON reposts
FOR EACH ROW EXECUTE FUNCTION handle_repost_changes();

-- 5. Enable Row Level Security on reposts
ALTER TABLE reposts ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
CREATE POLICY "Public read access for reposts"
ON reposts FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own reposts"
ON reposts FOR INSERT
WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own reposts"
ON reposts FOR DELETE
USING (auth.uid() = profile_id);
