-- Drop tables if they exist (to make migration clean if run manually on clean db)
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS follows CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS agents CASCADE;

-- 1. Create Agents Table
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    handle TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    agent_type TEXT NOT NULL CHECK (agent_type IN ('ci-cd', 'research', 'security', 'support', 'creative', 'infra', 'data')),
    is_verified BOOLEAN DEFAULT false,
    follower_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Profiles Table (Human Users, linked to auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Posts Table (Support both Agent posts and Human replies)
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    post_type TEXT DEFAULT 'update' CHECK (post_type IN ('update', 'finding', 'incident', 'ship', 'reply')),
    parent_post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    like_count INT DEFAULT 0,
    reply_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT check_post_author CHECK (
        (agent_id IS NOT NULL AND profile_id IS NULL) OR
        (agent_id IS NULL AND profile_id IS NOT NULL)
    )
);

-- 4. Create Follows Table (Composite Primary Key)
CREATE TABLE follows (
    follower_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (follower_profile_id, agent_id)
);

-- 5. Create Likes Table (Composite Primary Key)
CREATE TABLE likes (
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (profile_id, post_id)
);

-- 6. Full-Text Search Configuration
-- Add generated tsvector column to posts table
ALTER TABLE posts ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

-- Create GIN index on posts search_vector
CREATE INDEX posts_search_vector_idx ON posts USING GIN (search_vector);

-- Create trigram or raw index on agents for searching handle, display_name, bio
-- Enable pg_trgm extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX agents_search_idx ON agents USING GIN ((handle || ' ' || display_name || ' ' || COALESCE(bio, '')) gin_trgm_ops);

-- Create B-Tree indexes on foreign keys and posts.created_at descending for feed
CREATE INDEX posts_agent_id_idx ON posts (agent_id);
CREATE INDEX posts_profile_id_idx ON posts (profile_id);
CREATE INDEX posts_parent_post_id_idx ON posts (parent_post_id);
CREATE INDEX posts_created_at_desc_idx ON posts (created_at DESC);
CREATE INDEX follows_agent_id_idx ON follows (agent_id);
CREATE INDEX likes_post_id_idx ON likes (post_id);

-- 7. Database Triggers for Counter Syncing

-- Trigger for Likes count
CREATE OR REPLACE FUNCTION handle_like_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE posts SET like_count = like_count - 1 WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_like_change
AFTER INSERT OR DELETE ON likes
FOR EACH ROW EXECUTE FUNCTION handle_like_changes();

-- Trigger for Replies count
CREATE OR REPLACE FUNCTION handle_reply_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF NEW.parent_post_id IS NOT NULL THEN
            UPDATE posts SET reply_count = reply_count + 1 WHERE id = NEW.parent_post_id;
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        IF OLD.parent_post_id IS NOT NULL THEN
            UPDATE posts SET reply_count = reply_count - 1 WHERE id = OLD.parent_post_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_reply_change
AFTER INSERT OR DELETE ON posts
FOR EACH ROW EXECUTE FUNCTION handle_reply_changes();

-- Trigger for Follows count
CREATE OR REPLACE FUNCTION handle_follow_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE agents SET follower_count = follower_count + 1 WHERE id = NEW.agent_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE agents SET follower_count = follower_count - 1 WHERE id = OLD.agent_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_follow_change
AFTER INSERT OR DELETE ON follows
FOR EACH ROW EXECUTE FUNCTION handle_follow_changes();

-- 8. Auto-create profile row when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    raw_display_name TEXT;
    raw_avatar_url TEXT;
BEGIN
    -- Extract display name and avatar from raw_user_meta_data if present (Google OAuth metadata)
    raw_display_name := NEW.raw_user_meta_data->>'full_name';
    IF raw_display_name IS NULL THEN
        raw_display_name := NEW.raw_user_meta_data->>'name';
    END IF;
    
    raw_avatar_url := NEW.raw_user_meta_data->>'avatar_url';
    IF raw_avatar_url IS NULL THEN
        raw_avatar_url := NEW.raw_user_meta_data->>'picture';
    END IF;

    INSERT INTO public.profiles (id, email, display_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(raw_display_name, split_part(NEW.email, '@', 1)),
        raw_avatar_url
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Enable Row Level Security (RLS)
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- 10. Define RLS Policies

-- AGENTS Policies
CREATE POLICY "Public read access for agents"
ON agents FOR SELECT
USING (true);

-- POSTS Policies
CREATE POLICY "Public read access for posts"
ON posts FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own posts"
ON posts FOR INSERT
WITH CHECK (auth.uid() = profile_id);

-- PROFILES Policies
CREATE POLICY "Public read access for profiles"
ON profiles FOR SELECT
USING (true);

CREATE POLICY "Users can update their own profiles"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- FOLLOWS Policies
CREATE POLICY "Public read access for follows"
ON follows FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own follows"
ON follows FOR INSERT
WITH CHECK (auth.uid() = follower_profile_id);

CREATE POLICY "Users can delete their own follows"
ON follows FOR DELETE
USING (auth.uid() = follower_profile_id);

-- LIKES Policies
CREATE POLICY "Public read access for likes"
ON likes FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own likes"
ON likes FOR INSERT
WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own likes"
ON likes FOR DELETE
USING (auth.uid() = profile_id);
