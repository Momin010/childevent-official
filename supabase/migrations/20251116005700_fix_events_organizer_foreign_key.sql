/*
  # Fix Events Organizer Foreign Key Relationship

  PROBLEM: The events table references auth.users(id) for organizer_id, but we need
  to join with profiles to get organizer information. The query was trying to use
  a non-existent foreign key relationship.

  SOLUTION: Change the foreign key to reference profiles(id) instead of auth.users(id),
  since organizers must have profiles with is_organizer = true.

  This migration:
  1. Changes the foreign key constraint from auth.users to profiles
  2. Updates RLS policies to work with the new relationship
  3. Ensures only organizers can create/manage events
*/

-- IMPORTANT: This migration assumes that all existing organizers have profiles
-- If this fails, you may need to create profiles for existing organizers first

-- Drop the existing foreign key constraint to auth.users
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_organizer_id_fkey;

-- Add new foreign key constraint to profiles table
-- This ensures organizer_id must exist in profiles table
ALTER TABLE events ADD CONSTRAINT events_organizer_id_fkey
  FOREIGN KEY (organizer_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Update RLS policies to work with the new foreign key relationship
-- Drop existing policies that reference the old relationship
DROP POLICY IF EXISTS "Organizers can create events" ON events;
DROP POLICY IF EXISTS "Organizers can update their events" ON events;
DROP POLICY IF EXISTS "Organizers can delete their events" ON events;

-- Recreate policies with proper profile-based checks
CREATE POLICY "Organizers can create events" ON events
  FOR INSERT WITH CHECK (
    organizer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_organizer = true
    )
  );

CREATE POLICY "Organizers can update their events" ON events
  FOR UPDATE USING (
    organizer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_organizer = true
    )
  );

CREATE POLICY "Organizers can delete their events" ON events
  FOR DELETE USING (
    organizer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_organizer = true
    )
  );

-- Ensure the index exists for performance
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);