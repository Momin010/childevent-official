-- Add comprehensive enhanced onboarding fields and profile system fields to profiles table
-- Migration: 20251117000000_add_enhanced_onboarding_fields

-- Add role and email fields (if missing)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'organizer', 'admin'));

-- Add notification preferences
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_notifications boolean DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_notifications boolean DEFAULT true;

-- Add location and additional profile fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;

-- Add organizer-specific fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organization_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role_in_organization text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_organizer boolean DEFAULT false;

-- Add enhanced onboarding preference fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS event_types jsonb DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS activity_preferences jsonb DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dietary_restrictions jsonb DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accessibility_needs jsonb DEFAULT '[]'::jsonb;

-- Ensure hobbies is jsonb (convert if needed)
DO $$
BEGIN
  -- Check if hobbies column exists and is not jsonb
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'hobbies' AND data_type != 'jsonb'
  ) THEN
    -- Convert text[] to jsonb
    ALTER TABLE profiles ALTER COLUMN hobbies TYPE jsonb USING array_to_json(hobbies);
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'hobbies'
  ) THEN
    -- Add hobbies column if it doesn't exist
    ALTER TABLE profiles ADD COLUMN hobbies jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add analytics and tracking fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_at timestamp with time zone;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_organizer ON profiles(is_organizer);
CREATE INDEX IF NOT EXISTS idx_profiles_event_types ON profiles USING gin(event_types);
CREATE INDEX IF NOT EXISTS idx_profiles_activity_preferences ON profiles USING gin(activity_preferences);
CREATE INDEX IF NOT EXISTS idx_profiles_dietary_restrictions ON profiles USING gin(dietary_restrictions);
CREATE INDEX IF NOT EXISTS idx_profiles_accessibility_needs ON profiles USING gin(accessibility_needs);
CREATE INDEX IF NOT EXISTS idx_profiles_hobbies ON profiles USING gin(hobbies);

-- Update the updated_at trigger to include the new columns
-- (The existing trigger should handle this automatically)