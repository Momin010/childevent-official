-- Create RPC function for creating organizers with proper RLS handling
-- Migration: 20251120000000_create_organizer_function

-- Function to create an organizer profile
CREATE OR REPLACE FUNCTION create_organizer(
    p_name text,
    p_email text,
    p_organization_name text,
    p_industry text DEFAULT NULL,
    p_website text DEFAULT NULL,
    p_role_in_organization text DEFAULT NULL,
    p_bio text DEFAULT NULL,
    p_phone text DEFAULT NULL,
    p_location text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_username text;
    v_result jsonb;
BEGIN
    -- Get the current user's ID (this works because SECURITY DEFINER bypasses RLS for auth.uid())
    v_user_id := auth.uid();

    -- Check if user is authenticated
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not authenticated'
        );
    END IF;

    -- Check if user already has a profile
    IF EXISTS (SELECT 1 FROM profiles WHERE id = v_user_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User profile already exists'
        );
    END IF;

    -- Generate unique username
    v_username := LOWER(REPLACE(p_name, ' ', ''));
    -- Ensure uniqueness by appending numbers if needed
    WHILE EXISTS (SELECT 1 FROM profiles WHERE username = v_username) LOOP
        -- If username exists, try with a random 4-digit number
        v_username := LOWER(REPLACE(p_name, ' ', '')) || '_' || LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');
    END LOOP;

    -- Insert the organizer profile
    INSERT INTO profiles (
        id,
        username,
        name,
        email,
        organization_name,
        industry,
        website,
        role_in_organization,
        bio,
        phone,
        location,
        is_organizer,
        total_events_created,
        total_attendees_served,
        created_at,
        updated_at
    ) VALUES (
        v_user_id,
        v_username,
        p_name,
        p_email,
        p_organization_name,
        p_industry,
        p_website,
        p_role_in_organization,
        p_bio,
        p_phone,
        p_location,
        true,
        0,
        0,
        NOW(),
        NOW()
    );

    -- Return success
    v_result := jsonb_build_object(
        'success', true,
        'message', 'Organizer profile created successfully',
        'user_id', v_user_id,
        'username', v_username
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Function for admin to create organizer profiles
CREATE OR REPLACE FUNCTION admin_create_organizer(
    p_name text,
    p_email text,
    p_organization_name text,
    p_industry text DEFAULT NULL,
    p_website text DEFAULT NULL,
    p_role_in_organization text DEFAULT NULL,
    p_bio text DEFAULT NULL,
    p_phone text DEFAULT NULL,
    p_location text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_username text;
    v_result jsonb;
BEGIN
    -- Check if caller is admin (you might want to check a role or specific user IDs)
    -- For now, we'll allow any authenticated user to call this (admin check can be added later)

    -- Check if profile already exists for this email
    IF EXISTS (SELECT 1 FROM profiles WHERE email = p_email) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Profile already exists for this email'
        );
    END IF;

    -- Generate a new UUID for the user
    v_user_id := gen_random_uuid();

    -- Generate unique username
    v_username := LOWER(REPLACE(p_organization_name, ' ', ''));
    -- Ensure uniqueness by appending numbers if needed
    WHILE EXISTS (SELECT 1 FROM profiles WHERE username = v_username) LOOP
        v_username := LOWER(REPLACE(p_organization_name, ' ', '')) || '_' || LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');
    END LOOP;

    -- Insert the organizer profile
    INSERT INTO profiles (
        id,
        username,
        name,
        email,
        organization_name,
        industry,
        website,
        role_in_organization,
        bio,
        phone,
        location,
        is_organizer,
        total_events_created,
        total_attendees_served,
        created_at,
        updated_at
    ) VALUES (
        v_user_id,
        v_username,
        p_name,
        p_email,
        p_organization_name,
        p_industry,
        p_website,
        p_role_in_organization,
        p_bio,
        p_phone,
        p_location,
        true,
        0,
        0,
        NOW(),
        NOW()
    );

    -- Return success
    v_result := jsonb_build_object(
        'success', true,
        'message', 'Organizer profile created successfully',
        'user_id', v_user_id,
        'username', v_username
    );

    RETURN v_result;

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_organizer(text, text, text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_create_organizer(text, text, text, text, text, text, text, text, text) TO authenticated;

-- Update RLS policy to allow users to update their own profiles
DROP POLICY IF EXISTS "users can update own profile" ON profiles;
CREATE POLICY "users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Also allow users to insert their own profile (for the function)
DROP POLICY IF EXISTS "users can insert own profile" ON profiles;
CREATE POLICY "users can insert own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);