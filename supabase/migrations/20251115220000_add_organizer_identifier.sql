/*
  # Add Special Identifier for Organizers

  Adds a unique identifier field for organizers to distinguish them from regular users.
*/

-- Add organizer identifier field
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS organizer_id text UNIQUE;

-- Create index for organizer ID lookups
CREATE INDEX IF NOT EXISTS idx_profiles_organizer_id ON profiles(organizer_id);

-- Function to generate unique organizer ID
CREATE OR REPLACE FUNCTION generate_organizer_id()
RETURNS text AS $$
DECLARE
  new_id text;
  counter integer := 0;
BEGIN
  LOOP
    -- Generate ID like ORG-20241115-001
    new_id := 'ORG-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || lpad(counter::text, 3, '0');

    -- Check if this ID already exists
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE organizer_id = new_id) THEN
      RETURN new_id;
    END IF;

    counter := counter + 1;

    -- Prevent infinite loop
    IF counter > 999 THEN
      RAISE EXCEPTION 'Unable to generate unique organizer ID';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate organizer ID when is_organizer becomes true
CREATE OR REPLACE FUNCTION set_organizer_id()
RETURNS trigger AS $$
BEGIN
  -- If is_organizer is being set to true and organizer_id is null
  IF NEW.is_organizer = true AND (OLD.is_organizer = false OR OLD.is_organizer IS NULL) AND NEW.organizer_id IS NULL THEN
    NEW.organizer_id := generate_organizer_id();
  END IF;

  -- If is_organizer is being set to false, clear organizer_id
  IF NEW.is_organizer = false AND OLD.is_organizer = true THEN
    NEW.organizer_id := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_set_organizer_id ON profiles;
CREATE TRIGGER trigger_set_organizer_id
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_organizer_id();

-- Also set organizer_id for existing organizers
UPDATE profiles
SET organizer_id = generate_organizer_id()
WHERE is_organizer = true AND organizer_id IS NULL;