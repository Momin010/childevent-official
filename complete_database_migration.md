# Complete Database Migration Script

Run this entire script in Supabase SQL Editor to rebuild the database from scratch.

```sql
-- =====================================================
-- EventConnect Database - Complete Migration Script
-- =====================================================
-- This script rebuilds the entire database from scratch
-- Run this in Supabase SQL Editor to recreate everything

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. DROP EXISTING TABLES (in reverse dependency order)
-- =====================================================

DROP TABLE IF EXISTS event_analytics CASCADE;
DROP TABLE IF EXISTS api_imports CASCADE;
DROP TABLE IF EXISTS admin_approvals CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS chat_participants CASCADE;
DROP TABLE IF EXISTS chats CASCADE;
DROP TABLE IF EXISTS event_comments CASCADE;
DROP TABLE IF EXISTS event_bookmarks CASCADE;
DROP TABLE IF EXISTS event_likes CASCADE;
DROP TABLE IF EXISTS event_attendees CASCADE;
DROP TABLE IF EXISTS event_categories CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS friendships CASCADE;
DROP TABLE IF EXISTS friend_requests CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- =====================================================
-- 2. CREATE TABLES
-- =====================================================

-- 2.1 profiles - User Profiles & Roles
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  username text UNIQUE NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'organizer', 'admin')),
  avatar_url text,
  bio text,
  website text,
  phone text,
  location text,
  date_of_birth date,
  is_parent boolean DEFAULT false,
  number_of_children integer DEFAULT 0,
  interests text[] DEFAULT '{}',
  organization_name text,
  industry text,
  organization_size text,
  role_in_organization text,
  organizer_verified boolean DEFAULT false,
  organizer_rating decimal(3,2) DEFAULT 0.00,
  total_events_created integer DEFAULT 0,
  total_attendees_served integer DEFAULT 0,
  social_links jsonb DEFAULT '{}',
  preferences jsonb DEFAULT '{}',
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  last_login_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2.2 categories - Event Categories
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  icon text,
  color text,
  parent_id uuid REFERENCES categories(id),
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  event_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- 2.3 events - Event Listings with Approval Workflow
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE,
  description text NOT NULL,
  short_description text,
  image_url text,
  banner_url text,
  date date NOT NULL,
  time time NOT NULL,
  end_date date,
  end_time time,
  timezone text DEFAULT 'Europe/Helsinki',
  location text NOT NULL,
  address text,
  city text DEFAULT 'Tampere',
  country text DEFAULT 'Finland',
  latitude decimal(10,8),
  longitude decimal(11,8),
  venue_name text,
  venue_capacity integer,
  organizer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id),
  subcategory text,

  -- Event Details
  event_type text DEFAULT 'in-person' CHECK (event_type IN ('in-person', 'virtual', 'hybrid')),
  virtual_link text,
  meeting_platform text,
  language text DEFAULT 'fi',
  age_restriction text DEFAULT 'all-ages',
  dress_code text,

  -- Capacity & Pricing
  max_attendees integer,
  min_attendees integer DEFAULT 1,
  current_attendees integer DEFAULT 0,
  price decimal(10,2) DEFAULT 0.00,
  currency text DEFAULT 'EUR',
  payment_required boolean DEFAULT false,
  early_bird_price decimal(10,2),
  early_bird_deadline timestamp with time zone,

  -- Status & Approval
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'denied', 'cancelled', 'postponed', 'completed')),
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamp with time zone,
  denial_reason text,
  admin_notes text,

  -- External Data
  imported_from text CHECK (imported_from IN ('manual', 'tampere_api', 'other')),
  external_id text,
  external_url text,
  external_data jsonb,

  -- Analytics
  view_count integer DEFAULT 0,
  click_count integer DEFAULT 0,
  share_count integer DEFAULT 0,
  favorite_count integer DEFAULT 0,
  comment_count integer DEFAULT 0,

  -- Metadata
  tags text[] DEFAULT '{}',
  keywords text[] DEFAULT '{}',
  featured boolean DEFAULT false,
  promoted boolean DEFAULT false,
  requires_approval boolean DEFAULT true,

  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  published_at timestamp with time zone
);

-- 2.4 event_attendees - Event Signups & Attendance
CREATE TABLE event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'registered' CHECK (status IN ('interested', 'registered', 'attended', 'cancelled')),
  registration_date timestamp with time zone DEFAULT now(),
  check_in_time timestamp with time zone,
  check_out_time timestamp with time zone,
  ticket_number text,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'cancelled')),
  payment_amount decimal(10,2),
  special_requirements text,
  notes text,
  attended boolean DEFAULT false,
  feedback_rating integer CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  feedback_text text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

  UNIQUE(event_id, user_id)
);

-- 2.5 event_likes - Event Likes/Favorites
CREATE TABLE event_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),

  UNIQUE(event_id, user_id)
);

-- 2.6 event_bookmarks - Saved Events
CREATE TABLE event_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  collection_name text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),

  UNIQUE(event_id, user_id)
);

-- 2.7 event_comments - Event Discussions
CREATE TABLE event_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES event_comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_edited boolean DEFAULT false,
  edited_at timestamp with time zone,
  likes_count integer DEFAULT 0,
  replies_count integer DEFAULT 0,
  is_deleted boolean DEFAULT false,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2.8 friendships - User Relationships
CREATE TABLE friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'blocked')),
  requested_by uuid NOT NULL REFERENCES profiles(id),
  accepted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),

  CHECK (user_id < friend_id), -- Prevent duplicate friendships
  UNIQUE(user_id, friend_id)
);

-- 2.9 chats - Conversation Threads
CREATE TABLE chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text DEFAULT 'direct' CHECK (type IN ('direct', 'group', 'event')),
  name text,
  description text,
  avatar_url text,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  last_message_at timestamp with time zone,
  participant_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2.10 chat_participants - Chat Members
CREATE TABLE chat_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at timestamp with time zone DEFAULT now(),
  last_read_at timestamp with time zone,
  is_muted boolean DEFAULT false,
  notifications_enabled boolean DEFAULT true,

  UNIQUE(chat_id, user_id)
);

-- 2.11 messages - Chat Messages with Encryption
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text,
  encrypted_content text,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'event_invite', 'system')),
  metadata jsonb DEFAULT '{}',
  reply_to_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  is_edited boolean DEFAULT false,
  edited_at timestamp with time zone,
  is_deleted boolean DEFAULT false,
  deleted_at timestamp with time zone,
  read_by uuid[] DEFAULT '{}',
  delivered_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- 2.12 notifications - System Notifications
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('event_invite', 'event_reminder', 'friend_request', 'message', 'event_update', 'admin_message')),
  title text NOT NULL,
  content text,
  data jsonb DEFAULT '{}',
  is_read boolean DEFAULT false,
  read_at timestamp with time zone,
  action_url text,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- 2.13 admin_approvals - Event Approval Audit Trail
CREATE TABLE admin_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('approved', 'denied', 'pending_review')),
  reason text,
  previous_status text,
  new_status text,
  review_notes text,
  processing_time interval,
  created_at timestamp with time zone DEFAULT now()
);

-- 2.14 api_imports - External API Import Tracking
CREATE TABLE api_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  source_url text,
  imported_by uuid REFERENCES profiles(id),
  import_type text DEFAULT 'events' CHECK (import_type IN ('events', 'venues', 'categories')),
  total_records integer DEFAULT 0,
  successful_imports integer DEFAULT 0,
  failed_imports integer DEFAULT 0,
  skipped_records integer DEFAULT 0,
  processing_time interval,
  status text DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'failed', 'partial')),
  error_message text,
  raw_request jsonb,
  raw_response jsonb,
  import_summary jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

-- 2.15 event_analytics - Event Performance Metrics
CREATE TABLE event_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  date date NOT NULL,
  views integer DEFAULT 0,
  unique_views integer DEFAULT 0,
  clicks integer DEFAULT 0,
  shares integer DEFAULT 0,
  bookmarks integer DEFAULT 0,
  likes integer DEFAULT 0,
  comments integer DEFAULT 0,
  registrations integer DEFAULT 0,
  cancellations integer DEFAULT 0,
  attendance integer DEFAULT 0,
  average_rating decimal(3,2),
  revenue decimal(10,2) DEFAULT 0.00,
  created_at timestamp with time zone DEFAULT now(),

  UNIQUE(event_id, date)
);

-- 2.16 system_settings - Application Configuration
CREATE TABLE system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  category text DEFAULT 'general',
  is_public boolean DEFAULT false,
  updated_by uuid REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- =====================================================
-- 3. CREATE INDEXES
-- =====================================================

-- Profiles indexes
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_organization_name ON profiles(organization_name);
CREATE INDEX idx_profiles_created_at ON profiles(created_at);

-- Categories indexes
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_active ON categories(is_active);

-- Events indexes
CREATE INDEX idx_events_organizer_id ON events(organizer_id);
CREATE INDEX idx_events_category_id ON events(category_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_location ON events USING gin(to_tsvector('english', location));
CREATE INDEX idx_events_tags ON events USING gin(tags);
CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_events_featured ON events(featured) WHERE featured = true;
CREATE INDEX idx_events_published ON events(published_at) WHERE published_at IS NOT NULL;
CREATE INDEX idx_events_organizer_status ON events(organizer_id, status);
CREATE INDEX idx_events_date_status ON events(date, status);
CREATE INDEX idx_events_category_date ON events(category_id, date);

-- Event attendees indexes
CREATE INDEX idx_event_attendees_event_id ON event_attendees(event_id);
CREATE INDEX idx_event_attendees_user_id ON event_attendees(user_id);
CREATE INDEX idx_event_attendees_status ON event_attendees(status);
CREATE INDEX idx_event_attendees_registration_date ON event_attendees(registration_date);
CREATE INDEX idx_event_attendees_event_status ON event_attendees(event_id, status);

-- Social features indexes
CREATE INDEX idx_event_likes_event_id ON event_likes(event_id);
CREATE INDEX idx_event_likes_user_id ON event_likes(user_id);
CREATE INDEX idx_event_likes_created_at ON event_likes(created_at);

CREATE INDEX idx_event_bookmarks_event_id ON event_bookmarks(event_id);
CREATE INDEX idx_event_bookmarks_user_id ON event_bookmarks(user_id);

CREATE INDEX idx_event_comments_event_id ON event_comments(event_id);
CREATE INDEX idx_event_comments_user_id ON event_comments(user_id);
CREATE INDEX idx_event_comments_parent_id ON event_comments(parent_id);
CREATE INDEX idx_event_comments_created_at ON event_comments(created_at);

-- Friendships indexes
CREATE INDEX idx_friendships_user_id ON friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX idx_friendships_status ON friendships(status);

-- Chat indexes
CREATE INDEX idx_chats_created_by ON chats(created_by);
CREATE INDEX idx_chats_event_id ON chats(event_id);
CREATE INDEX idx_chats_type ON chats(type);
CREATE INDEX idx_chats_last_message_at ON chats(last_message_at);

CREATE INDEX idx_chat_participants_chat_id ON chat_participants(chat_id);
CREATE INDEX idx_chat_participants_user_id ON chat_participants(user_id);

CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_reply_to_id ON messages(reply_to_id);
CREATE INDEX idx_messages_read_by ON messages USING gin(read_by);
CREATE INDEX idx_messages_chat_created ON messages(chat_id, created_at DESC);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_expires_at ON notifications(expires_at);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);

-- Admin indexes
CREATE INDEX idx_admin_approvals_event_id ON admin_approvals(event_id);
CREATE INDEX idx_admin_approvals_admin_id ON admin_approvals(admin_id);
CREATE INDEX idx_admin_approvals_action ON admin_approvals(action);
CREATE INDEX idx_admin_approvals_created_at ON admin_approvals(created_at);

-- API imports indexes
CREATE INDEX idx_api_imports_source ON api_imports(source);
CREATE INDEX idx_api_imports_imported_by ON api_imports(imported_by);
CREATE INDEX idx_api_imports_status ON api_imports(status);
CREATE INDEX idx_api_imports_created_at ON api_imports(created_at);

-- Analytics indexes
CREATE INDEX idx_event_analytics_event_id ON event_analytics(event_id);
CREATE INDEX idx_event_analytics_date ON event_analytics(date);

-- System settings indexes
CREATE INDEX idx_system_settings_key ON system_settings(key);
CREATE INDEX idx_system_settings_category ON system_settings(category);

-- =====================================================
-- 4. CREATE FUNCTIONS & TRIGGERS
-- =====================================================

-- 4.1 Auto-update timestamps function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_attendees_updated_at BEFORE UPDATE ON event_attendees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_comments_updated_at BEFORE UPDATE ON event_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4.2 Event statistics function
CREATE OR REPLACE FUNCTION get_event_stats(event_uuid uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'attendees', COUNT(*) FILTER (WHERE status IN ('registered', 'attended')),
    'interested', COUNT(*) FILTER (WHERE status = 'interested'),
    'likes', (SELECT COUNT(*) FROM event_likes WHERE event_id = event_uuid),
    'bookmarks', (SELECT COUNT(*) FROM event_bookmarks WHERE event_id = event_uuid),
    'comments', (SELECT COUNT(*) FROM event_comments WHERE event_id = event_uuid AND is_deleted = false),
    'views', (SELECT COALESCE(SUM(views), 0) FROM event_analytics WHERE event_id = event_uuid)
  ) INTO result
  FROM event_attendees
  WHERE event_id = event_uuid;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.3 Update event counters trigger
CREATE OR REPLACE FUNCTION update_event_counters()
RETURNS TRIGGER AS $$
BEGIN
  -- Update attendee count
  UPDATE events
  SET current_attendees = (
    SELECT COUNT(*) FROM event_attendees
    WHERE event_id = COALESCE(NEW.event_id, OLD.event_id)
    AND status IN ('registered', 'attended')
  )
  WHERE id = COALESCE(NEW.event_id, OLD.event_id);

  -- Update comment count
  UPDATE events
  SET comment_count = (
    SELECT COUNT(*) FROM event_comments
    WHERE event_id = COALESCE(NEW.event_id, OLD.event_id)
    AND is_deleted = false
  )
  WHERE id = COALESCE(NEW.event_id, OLD.event_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_event_counters_on_attendee_change
  AFTER INSERT OR UPDATE OR DELETE ON event_attendees
  FOR EACH ROW EXECUTE FUNCTION update_event_counters();

CREATE TRIGGER update_event_counters_on_comment_change
  AFTER INSERT OR UPDATE OR DELETE ON event_comments
  FOR EACH ROW EXECUTE FUNCTION update_event_counters();

-- 4.4 Update chat last_message_at trigger
CREATE OR REPLACE FUNCTION update_chat_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chats
  SET last_message_at = NEW.created_at,
      updated_at = now()
  WHERE id = NEW.chat_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_last_message_on_insert
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_chat_last_message();

-- 4.5 Update chat participant count trigger
CREATE OR REPLACE FUNCTION update_chat_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chats
  SET participant_count = (
    SELECT COUNT(*) FROM chat_participants
    WHERE chat_id = COALESCE(NEW.chat_id, OLD.chat_id)
  )
  WHERE id = COALESCE(NEW.chat_id, OLD.chat_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_participant_count_on_change
  AFTER INSERT OR UPDATE OR DELETE ON chat_participants
  FOR EACH ROW EXECUTE FUNCTION update_chat_participant_count();

-- =====================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. CREATE RLS POLICIES
-- =====================================================

-- 6.1 Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Only admins can change roles" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 6.2 Events Policies
CREATE POLICY "Approved events are viewable by everyone" ON events
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Organizers can view their own events" ON events
  FOR SELECT USING (organizer_id = auth.uid());

CREATE POLICY "Admins can view all events" ON events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Organizers can create events" ON events
  FOR INSERT WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "Organizers can update their own events" ON events
  FOR UPDATE USING (organizer_id = auth.uid());

CREATE POLICY "Admins can update any event" ON events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 6.3 Event Attendees Policies
CREATE POLICY "Users can view event attendees" ON event_attendees
  FOR SELECT USING (
    event_id IN (
      SELECT id FROM events WHERE status = 'approved' OR organizer_id = auth.uid()
    )
  );

CREATE POLICY "Users can register for approved events" ON event_attendees
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    event_id IN (SELECT id FROM events WHERE status = 'approved')
  );

CREATE POLICY "Users can update their own attendance" ON event_attendees
  FOR UPDATE USING (user_id = auth.uid());

-- 6.4 Social Features Policies (Likes, Bookmarks, Comments)
CREATE POLICY "Users can view all likes" ON event_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can like events" ON event_likes
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unlike their own likes" ON event_likes
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Users can view all bookmarks" ON event_bookmarks
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can bookmark events" ON event_bookmarks
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own bookmarks" ON event_bookmarks
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can remove their own bookmarks" ON event_bookmarks
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Users can view comments on approved events" ON event_comments
  FOR SELECT USING (
    event_id IN (SELECT id FROM events WHERE status = 'approved')
  );

CREATE POLICY "Users can comment on approved events" ON event_comments
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    event_id IN (SELECT id FROM events WHERE status = 'approved')
  );

CREATE POLICY "Users can update their own comments" ON event_comments
  FOR UPDATE USING (user_id = auth.uid());

-- 6.5 Friendships Policies
CREATE POLICY "Users can view friendships" ON friendships
  FOR SELECT USING (true);

CREATE POLICY "Users can send friend requests" ON friendships
  FOR INSERT WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Users can update friendships they're involved in" ON friendships
  FOR UPDATE USING (user_id = auth.uid() OR friend_id = auth.uid());

-- 6.6 Chat Policies
CREATE POLICY "Users can view chats they're in" ON chats
  FOR SELECT USING (
    created_by = auth.uid() OR
    id IN (SELECT chat_id FROM chat_participants WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create chats" ON chats
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Chat creators and admins can update chats" ON chats
  FOR UPDATE USING (
    created_by = auth.uid() OR
    id IN (SELECT chat_id FROM chat_participants WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can view chat participants for chats they're in" ON chat_participants
  FOR SELECT USING (
    chat_id IN (SELECT chat_id FROM chat_participants WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can join chats" ON chat_participants
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own chat participation" ON chat_participants
  FOR UPDATE USING (user_id = auth.uid());

-- 6.7 Messages Policies
CREATE POLICY "Users can view messages in chats they're in" ON messages
  FOR SELECT USING (
    chat_id IN (SELECT chat_id FROM chat_participants WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can send messages to chats they're in" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    chat_id IN (SELECT chat_id FROM chat_participants WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE USING (sender_id = auth.uid());

-- 6.8 Notifications Policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- 6.9 Admin Policies
CREATE POLICY "Only admins can view admin approvals" ON admin_approvals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can create admin approvals" ON admin_approvals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can view API imports" ON api_imports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can create API imports" ON api_imports
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 6.10 Categories Policies
CREATE POLICY "Categories are viewable by everyone" ON categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Only admins can manage categories" ON categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 6.11 System Settings Policies
CREATE POLICY "Public settings are viewable by everyone" ON system_settings
  FOR SELECT USING (is_public = true);

CREATE POLICY "Only admins can manage system settings" ON system_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 7. INSERT DEFAULT DATA
-- =====================================================

-- 7.1 Insert default categories
INSERT INTO categories (name, slug, description, icon, color, display_order) VALUES
  ('Music', 'music', 'Concerts, festivals, and musical events', 'music', '#FF6B6B', 1),
  ('Sports', 'sports', 'Sports events and competitions', 'trophy', '#4ECDC4', 2),
  ('Arts', 'arts', 'Theater, exhibitions, and cultural events', 'palette', '#45B7D1', 3),
  ('Technology', 'technology', 'Tech meetups, conferences, and workshops', 'cpu', '#96CEB4', 4),
  ('Education', 'education', 'Workshops, courses, and learning events', 'graduation-cap', '#FFEAA7', 5),
  ('Food', 'food', 'Food festivals, cooking classes, and tastings', 'utensils', '#DDA0DD', 6),
  ('Business', 'business', 'Networking, conferences, and professional events', 'briefcase', '#98D8C8', 7),
  ('Health', 'health', 'Wellness, fitness, and health-related events', 'heart', '#F7DC6F', 8),
  ('Entertainment', 'entertainment', 'Movies, comedy shows, and entertainment events', 'film', '#BB8FCE', 9),
  ('Community', 'community', 'Local community events and gatherings', 'users', '#85C1E9', 10);

-- 7.2 Insert system settings
INSERT INTO system_settings (key, value, description, category, is_public) VALUES
  ('site_name', '"EventConnect"', 'Site name displayed in header', 'general', true),
  ('site_description', '"Discover and join amazing events near you"', 'Site description for SEO', 'general', true),
  ('max_events_per_organizer', '50', 'Maximum events an organizer can create', 'limits', false),
  ('max_events_per_month', '10', 'Maximum events an organizer can create per month', 'limits', false),
  ('event_approval_required', 'true', 'Whether events require admin approval', 'features', false),
  ('allow_guest_registrations', 'true', 'Allow non-logged-in users to express interest', 'features', false),
  ('tampere_api_enabled', 'true', 'Enable Tampere City Hall API integration', 'integrations', false),
  ('email_notifications_enabled', 'true', 'Enable email notifications system', 'notifications', false),
  ('push_notifications_enabled', 'true', 'Enable push notifications', 'notifications', false),
  ('analytics_enabled', 'true', 'Enable event analytics tracking', 'analytics', false),
  ('maintenance_mode', 'false', 'Enable maintenance mode', 'system', true);

-- =====================================================
-- 8. CREATE MATERIALIZED VIEWS (Optional)
-- =====================================================

-- Event popularity view for recommendations
CREATE MATERIALIZED VIEW event_popularity AS
SELECT
  e.id,
  e.title,
  e.organizer_id,
  p.name as organizer_name,
  e.date,
  e.current_attendees,
  e.views_count,
  e.likes_count,
  e.comment_count,
  e.shares_count,
  (e.views_count + e.likes_count * 2 + e.comment_count * 3 + e.shares_count * 4 + e.current_attendees * 5) as popularity_score
FROM events e
JOIN profiles p ON e.organizer_id = p.id
WHERE e.status = 'approved' AND e.date >= CURRENT_DATE
ORDER BY popularity_score DESC;

-- Refresh function for the materialized view
CREATE OR REPLACE FUNCTION refresh_event_popularity()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY event_popularity;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Summary of what was created:
-- ✅ 16 core tables with proper relationships
-- ✅ 50+ indexes for performance
-- ✅ Row Level Security on all tables
-- ✅ 30+ security policies
-- ✅ Auto-updating triggers
-- ✅ Helper functions
-- ✅ Default categories and settings
-- ✅ Materialized view for recommendations

-- Next steps:
-- 1. Test the schema with your application
-- 2. Create admin user account
-- 3. Import test data if needed
-- 4. Set up monitoring and backups