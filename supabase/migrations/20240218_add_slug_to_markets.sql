-- Add slug column to markets table
ALTER TABLE markets ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Create index for faster lookup
CREATE INDEX IF NOT EXISTS idx_markets_slug ON markets(slug);

-- Update existing markets to have a slug (fallback to ID if empty, or title-based)
-- For now, we can just leave them null or set them to ID if needed, but the code handles ID lookup too.
