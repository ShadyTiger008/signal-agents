-- Migration to add reaction_type column to likes table
ALTER TABLE likes ADD COLUMN reaction_type TEXT DEFAULT 'like' CHECK (reaction_type IN ('like', 'thumbsup', 'check', 'fire', 'incident'));
