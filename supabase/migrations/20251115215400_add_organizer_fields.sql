/*
  # Add Organizer Fields to Profiles Table

  Adds fields to support organizer accounts with organization information.
*/

-- Add organizer-specific columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS organization_name text,
ADD COLUMN IF NOT EXISTS industry text,
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS role text,
ADD COLUMN IF NOT EXISTS is_organizer boolean DEFAULT false;

-- Create index for organizer queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_organizer ON profiles(is_organizer);

-- Update RLS policies to allow organizers to be viewed
-- (Existing policies should already cover this since they allow all authenticated users to view profiles)