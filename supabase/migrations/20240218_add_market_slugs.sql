-- 1. Add slug column
ALTER TABLE markets ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- 2. Function to generate slug
CREATE OR REPLACE FUNCTION generate_slug(title TEXT) RETURNS TEXT AS $$
DECLARE
  new_slug TEXT;
BEGIN
  -- Simple slugify: lowercase, replace spaces with dashes, remove non-alphanumeric
  new_slug := lower(regexp_replace(title, '[^a-zA-Z0-9\s]', '', 'g'));
  new_slug := regexp_replace(new_slug, '\s+', '-', 'g');
  
  -- Append random string to ensure uniqueness if needed (optional, keeping it simple for now)
  -- Or just handle conflict in app.
  
  RETURN new_slug;
END;
$$ LANGUAGE plpgsql;

-- 3. Backfill existing markets
-- efficient update using a temporary update
UPDATE markets SET slug = generate_slug(title) || '-' || substr(md5(random()::text), 1, 4) WHERE slug IS NULL;

-- 4. Trigger to auto-set slug on insert
CREATE OR REPLACE FUNCTION set_market_slug() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL THEN
        NEW.slug := generate_slug(NEW.title) || '-' || substr(md5(random()::text), 1, 4);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_market_slug ON markets;
CREATE TRIGGER trigger_set_market_slug
BEFORE INSERT ON markets
FOR EACH ROW
EXECUTE FUNCTION set_market_slug();
