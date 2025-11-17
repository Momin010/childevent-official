-- Add enhanced onboarding fields and profile image fields to profiles table
-- Migration: 20251117000000_add_enhanced_onboarding_fields

-- Add profile image fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_picture text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_photo text;

-- Add enhanced onboarding preference fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS event_types jsonb DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS activity_preferences jsonb DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS dietary_restrictions jsonb DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accessibility_needs jsonb DEFAULT '[]'::jsonb;

-- Add hobbies field (if not already exists)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hobbies jsonb DEFAULT '[]'::jsonb;

-- Create indexes for the new jsonb fields for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_event_types ON profiles USING gin(event_types);
CREATE INDEX IF NOT EXISTS idx_profiles_activity_preferences ON profiles USING gin(activity_preferences);
CREATE INDEX IF NOT EXISTS idx_profiles_dietary_restrictions ON profiles USING gin(dietary_restrictions);
CREATE INDEX IF NOT EXISTS idx_profiles_accessibility_needs ON profiles USING gin(accessibility_needs);
CREATE INDEX IF NOT EXISTS idx_profiles_hobbies ON profiles USING gin(hobbies);

-- Update the updated_at trigger to include the new columns
-- (The existing trigger should handle this automatically)