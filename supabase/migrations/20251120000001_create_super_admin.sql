-- Create Super Admin with Unrestricted Access
-- Migration: 20251120000001_create_super_admin

-- Create a super admin user ID (you'll need to replace this with an actual user ID)
-- For now, we'll use a placeholder - you'll need to get the actual UUID from auth.users
-- after creating the admin user account

-- First, let's create a function that checks if a user is a super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    -- List of super admin user IDs (add your admin user IDs here)
    -- You'll need to replace these with actual UUIDs from your auth.users table
    RETURN user_uuid IN (
        '00000000-0000-0000-0000-000000000000'::UUID  -- Placeholder - replace with real admin UUID
        -- Add more admin UUIDs here as needed
        -- 'admin-uuid-1',
        -- 'admin-uuid-2'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a security definer function to check admin status without recursion
CREATE OR REPLACE FUNCTION is_admin_user(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    -- Direct query to avoid RLS recursion
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = user_uuid AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_super_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_user(UUID) TO authenticated;

-- Create policies that allow super admins to bypass all restrictions
-- Also add admin permissions for regular admin operations

-- PROFILES TABLE - Super Admin Full Access
DROP POLICY IF EXISTS "super_admin_profiles_full_access" ON profiles;
CREATE POLICY "super_admin_profiles_full_access"
ON profiles
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Regular Admin permissions for profiles
DROP POLICY IF EXISTS "admin_profiles_access" ON profiles;
CREATE POLICY "admin_profiles_access"
ON profiles
FOR ALL
TO authenticated
USING (is_admin_user())
WITH CHECK (is_admin_user());

-- EVENTS TABLE - Super Admin Full Access
DROP POLICY IF EXISTS "super_admin_events_full_access" ON events;
CREATE POLICY "super_admin_events_full_access"
ON events
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Regular Admin permissions for events
DROP POLICY IF EXISTS "admin_events_access" ON events;
CREATE POLICY "admin_events_access"
ON events
FOR ALL
TO authenticated
USING (is_admin_user())
WITH CHECK (true);  -- Allow any organizer_id for admins

-- CATEGORIES TABLE - Super Admin Full Access
DROP POLICY IF EXISTS "super_admin_categories_full_access" ON categories;
CREATE POLICY "super_admin_categories_full_access"
ON categories
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Regular Admin permissions for categories
DROP POLICY IF EXISTS "admin_categories_access" ON categories;
CREATE POLICY "admin_categories_access"
ON categories
FOR ALL
TO authenticated
USING (is_admin_user())
WITH CHECK (is_admin_user());

-- EVENT_ATTENDEES TABLE - Super Admin Full Access
DROP POLICY IF EXISTS "super_admin_event_attendees_full_access" ON event_attendees;
CREATE POLICY "super_admin_event_attendees_full_access"
ON event_attendees
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Regular Admin permissions for event_attendees
DROP POLICY IF EXISTS "admin_event_attendees_access" ON event_attendees;
CREATE POLICY "admin_event_attendees_access"
ON event_attendees
FOR ALL
TO authenticated
USING (is_admin_user())
WITH CHECK (is_admin_user());

-- EVENT_COMMENTS TABLE - Super Admin Full Access
DROP POLICY IF EXISTS "super_admin_event_comments_full_access" ON event_comments;
CREATE POLICY "super_admin_event_comments_full_access"
ON event_comments
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- EVENT_LIKES TABLE - Super Admin Full Access
DROP POLICY IF EXISTS "super_admin_event_likes_full_access" ON event_likes;
CREATE POLICY "super_admin_event_likes_full_access"
ON event_likes
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- EVENT_BOOKMARKS TABLE - Super Admin Full Access
DROP POLICY IF EXISTS "super_admin_event_bookmarks_full_access" ON event_bookmarks;
CREATE POLICY "super_admin_event_bookmarks_full_access"
ON event_bookmarks
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- FRIENDSHIPS TABLE - Super Admin Full Access
DROP POLICY IF EXISTS "super_admin_friendships_full_access" ON friendships;
CREATE POLICY "super_admin_friendships_full_access"
ON friendships
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- CHATS TABLE - Super Admin Full Access
DROP POLICY IF EXISTS "super_admin_chats_full_access" ON chats;
CREATE POLICY "super_admin_chats_full_access"
ON chats
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- CHAT_PARTICIPANTS TABLE - Super Admin Full Access
DROP POLICY IF EXISTS "super_admin_chat_participants_full_access" ON chat_participants;
CREATE POLICY "super_admin_chat_participants_full_access"
ON chat_participants
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- MESSAGES TABLE - Super Admin Full Access
DROP POLICY IF EXISTS "super_admin_messages_full_access" ON messages;
CREATE POLICY "super_admin_messages_full_access"
ON messages
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- NOTIFICATIONS TABLE - Super Admin Full Access
DROP POLICY IF EXISTS "super_admin_notifications_full_access" ON notifications;
CREATE POLICY "super_admin_notifications_full_access"
ON notifications
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- ADMIN_APPROVALS TABLE - Super Admin Full Access
DROP POLICY IF EXISTS "super_admin_admin_approvals_full_access" ON admin_approvals;
CREATE POLICY "super_admin_admin_approvals_full_access"
ON admin_approvals
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- API_IMPORTS TABLE - Super Admin Full Access
DROP POLICY IF EXISTS "super_admin_api_imports_full_access" ON api_imports;
CREATE POLICY "super_admin_api_imports_full_access"
ON api_imports
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- EVENT_ANALYTICS TABLE - Super Admin Full Access
DROP POLICY IF EXISTS "super_admin_event_analytics_full_access" ON event_analytics;
CREATE POLICY "super_admin_event_analytics_full_access"
ON event_analytics
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- SYSTEM SETTINGS - Super Admin Full Access
DROP POLICY IF EXISTS "super_admin_system_settings_full_access" ON system_settings;
CREATE POLICY "super_admin_system_settings_full_access"
ON system_settings
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Create a helper function for super admin operations
CREATE OR REPLACE FUNCTION super_admin_query(query_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
BEGIN
    -- Only allow super admins to execute arbitrary queries
    IF NOT is_super_admin() THEN
        RETURN jsonb_build_object('error', 'Access denied: Super admin privileges required');
    END IF;

    -- Execute the query (USE WITH EXTREME CAUTION!)
    -- This allows super admins to run any SQL query
    EXECUTE query_text INTO result;

    RETURN jsonb_build_object('success', true, 'result', result);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- Grant execute permission for the helper function
GRANT EXECUTE ON FUNCTION super_admin_query(TEXT) TO authenticated;

-- Create a view for super admins to see all data
CREATE OR REPLACE VIEW super_admin_all_data AS
SELECT
    'profiles' as table_name,
    COUNT(*) as record_count
FROM profiles

UNION ALL

SELECT
    'events' as table_name,
    COUNT(*) as record_count
FROM events

UNION ALL

SELECT
    'categories' as table_name,
    COUNT(*) as record_count
FROM categories

UNION ALL

SELECT
    'event_attendees' as table_name,
    COUNT(*) as record_count
FROM event_attendees

UNION ALL

SELECT
    'event_comments' as table_name,
    COUNT(*) as record_count
FROM event_comments

UNION ALL

SELECT
    'chats' as table_name,
    COUNT(*) as record_count
FROM chats

UNION ALL

SELECT
    'messages' as table_name,
    COUNT(*) as record_count
FROM messages;

-- Grant access to the view
GRANT SELECT ON super_admin_all_data TO authenticated;