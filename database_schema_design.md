# EventConnect Database Schema Design

## 📋 Complete Database Architecture

### **Core Entities & Relationships**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     profiles    │    │     events      │    │   categories    │
│                 │    │                 │    │                 │
│ id (uuid) ◄─────┼────┼─► organizer_id  │    │ id (uuid)       │
│ email           │    │ id (uuid)       │    │ name            │
│ username        │    │ title           │    │ description     │
│ name            │    │ description     │    │ color           │
│ role            │    │ date            │    │ icon            │
│ avatar_url      │    │ time            │    │                 │
│ bio             │    │ location        │    └─────────────────┘
│ created_at      │    │ category_id     │            │
│ updated_at      │    │ status          │            │
└─────────────────┘    │ approved_by     │            │
         │             │ approved_at      │            │
         │             │ created_at       │            │
         │             └─────────────────┘            │
         │                      │                     │
         │                      │                     │
         ▼                      ▼                     ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   friendships   │    │ event_attendees │    │ event_categories│
│                 │    │                 │    │                 │
│ user_id         │    │ event_id        │    │ event_id        │
│ friend_id       │    │ user_id         │    │ category_id     │
│ status          │    │ status          │    └─────────────────┘
│ created_at      │    │ joined_at       │
└─────────────────┘    └─────────────────┘
```

## 🗂️ Complete Table Definitions

### **1. profiles** - User Profiles & Roles
```sql
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
  interests text[],
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

-- Indexes
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_organization_name ON profiles(organization_name);
CREATE INDEX idx_profiles_created_at ON profiles(created_at);
```

### **2. events** - Event Listings with Approval Workflow
```sql
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

-- Indexes
CREATE INDEX idx_events_organizer_id ON events(organizer_id);
CREATE INDEX idx_events_category_id ON events(category_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_location ON events USING gin(to_tsvector('english', location));
CREATE INDEX idx_events_tags ON events USING gin(tags);
CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_events_featured ON events(featured) WHERE featured = true;
CREATE INDEX idx_events_published ON events(published_at) WHERE published_at IS NOT NULL;
```

### **3. categories** - Event Categories
```sql
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

-- Indexes
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_active ON categories(is_active);
```

### **4. event_attendees** - Event Signups & Attendance
```sql
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

-- Indexes
CREATE INDEX idx_event_attendees_event_id ON event_attendees(event_id);
CREATE INDEX idx_event_attendees_user_id ON event_attendees(user_id);
CREATE INDEX idx_event_attendees_status ON event_attendees(status);
CREATE INDEX idx_event_attendees_registration_date ON event_attendees(registration_date);
```

### **5. event_likes** - Event Likes/Favorites
```sql
CREATE TABLE event_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),

  UNIQUE(event_id, user_id)
);

-- Indexes
CREATE INDEX idx_event_likes_event_id ON event_likes(event_id);
CREATE INDEX idx_event_likes_user_id ON event_likes(user_id);
CREATE INDEX idx_event_likes_created_at ON event_likes(created_at);
```

### **6. event_bookmarks** - Saved Events
```sql
CREATE TABLE event_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  collection_name text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),

  UNIQUE(event_id, user_id)
);

-- Indexes
CREATE INDEX idx_event_bookmarks_event_id ON event_bookmarks(event_id);
CREATE INDEX idx_event_bookmarks_user_id ON event_bookmarks(user_id);
```

### **7. event_comments** - Event Discussions
```sql
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

-- Indexes
CREATE INDEX idx_event_comments_event_id ON event_comments(event_id);
CREATE INDEX idx_event_comments_user_id ON event_comments(user_id);
CREATE INDEX idx_event_comments_parent_id ON event_comments(parent_id);
CREATE INDEX idx_event_comments_created_at ON event_comments(created_at);
```

### **8. friendships** - User Relationships
```sql
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

-- Indexes
CREATE INDEX idx_friendships_user_id ON friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX idx_friendships_status ON friendships(status);
```

### **9. chats** - Conversation Threads
```sql
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

-- Indexes
CREATE INDEX idx_chats_created_by ON chats(created_by);
CREATE INDEX idx_chats_event_id ON chats(event_id);
CREATE INDEX idx_chats_type ON chats(type);
CREATE INDEX idx_chats_last_message_at ON chats(last_message_at);
```

### **10. chat_participants** - Chat Members
```sql
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

-- Indexes
CREATE INDEX idx_chat_participants_chat_id ON chat_participants(chat_id);
CREATE INDEX idx_chat_participants_user_id ON chat_participants(user_id);
```

### **11. messages** - Chat Messages with Encryption
```sql
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

-- Indexes
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_reply_to_id ON messages(reply_to_id);
CREATE INDEX idx_messages_read_by ON messages USING gin(read_by);
```

### **12. notifications** - System Notifications
```sql
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

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_expires_at ON notifications(expires_at);
```

### **13. admin_approvals** - Event Approval Audit Trail
```sql
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

-- Indexes
CREATE INDEX idx_admin_approvals_event_id ON admin_approvals(event_id);
CREATE INDEX idx_admin_approvals_admin_id ON admin_approvals(admin_id);
CREATE INDEX idx_admin_approvals_action ON admin_approvals(action);
CREATE INDEX idx_admin_approvals_created_at ON admin_approvals(created_at);
```

### **14. api_imports** - External API Import Tracking
```sql
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

-- Indexes
CREATE INDEX idx_api_imports_source ON api_imports(source);
CREATE INDEX idx_api_imports_imported_by ON api_imports(imported_by);
CREATE INDEX idx_api_imports_status ON api_imports(status);
CREATE INDEX idx_api_imports_created_at ON api_imports(created_at);
```

### **15. event_analytics** - Event Performance Metrics
```sql
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

-- Indexes
CREATE INDEX idx_event_analytics_event_id ON event_analytics(event_id);
CREATE INDEX idx_event_analytics_date ON event_analytics(date);
```

### **16. system_settings** - Application Configuration
```sql
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

-- Indexes
CREATE INDEX idx_system_settings_key ON system_settings(key);
CREATE INDEX idx_system_settings_category ON system_settings(category);
```

## 🔗 Entity Relationship Diagram (ERD)

```
profiles (1) ──── (∞) event_attendees (∞) ──── (1) events
    │                      │                           │
    │                      │                           │
    │                      │                           │
    ├── (∞) friendships (∞)┼───── (1) profiles        ├── (1) categories
    │                      │                           │
    │                      │                           │
    ├── (∞) event_likes (∞)┼───── (1) events          ├── (∞) event_categories
    │                      │                           │
    │                      │                           │
    ├── (∞) event_bookmarks│                           ├── (∞) admin_approvals
    │                      │                           │
    │                      │                           │
    ├── (∞) event_comments │                           ├── (∞) event_analytics
    │                      │                           │
    │                      │                           │
    ├── (∞) chat_participants (∞) ──── (1) chats ──── (∞) messages
    │                      │
    │                      │
    └── (∞) notifications  │
                           │
                           └── (∞) api_imports
```

## 🔐 Row Level Security (RLS) Policies

### **Profiles Policies**
```sql
-- Users can view all profiles
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Only admins can change roles
CREATE POLICY "Only admins can change roles" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### **Events Policies**
```sql
-- Public can view approved events
CREATE POLICY "Approved events are viewable by everyone" ON events
  FOR SELECT USING (status = 'approved');

-- Organizers can view their own events
CREATE POLICY "Organizers can view own events" ON events
  FOR SELECT USING (organizer_id = auth.uid());

-- Admins can view all events
CREATE POLICY "Admins can view all events" ON events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Organizers can create events
CREATE POLICY "Organizers can create events" ON events
  FOR INSERT WITH CHECK (organizer_id = auth.uid());

-- Organizers can update their own events
CREATE POLICY "Organizers can update own events" ON events
  FOR UPDATE USING (organizer_id = auth.uid());

-- Admins can update any event
CREATE POLICY "Admins can update any event" ON events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

## ⚡ Database Functions & Triggers

### **Auto-update Timestamps**
```sql
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
```

### **Event Statistics Function**
```sql
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
```

### **Update Event Counters Trigger**
```sql
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
```

## 📊 Performance Optimizations

### **Additional Indexes**
```sql
-- Composite indexes for common queries
CREATE INDEX idx_events_organizer_status ON events(organizer_id, status);
CREATE INDEX idx_events_date_status ON events(date, status);
CREATE INDEX idx_events_category_date ON events(category_id, date);
CREATE INDEX idx_event_attendees_event_status ON event_attendees(event_id, status);
CREATE INDEX idx_messages_chat_created ON messages(chat_id, created_at DESC);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);

-- Partial indexes for active data
CREATE INDEX idx_events_active ON events(id) WHERE status = 'approved' AND date >= CURRENT_DATE;
CREATE INDEX idx_notifications_unread ON notifications(id) WHERE is_read = false;
```

### **Materialized Views for Analytics**
```sql
CREATE MATERIALIZED VIEW event_popularity AS
SELECT
  e.id,
  e.title,
  e.organizer_id,
  p.name as organizer_name,
  e.date,
  e.current_attendees,
  e.view_count,
  e.like_count,
  e.comment_count,
  e.share_count,
  (e.view_count + e.like_count * 2 + e.comment_count * 3 + e.share_count * 4 + e.current_attendees * 5) as popularity_score
FROM events e
JOIN profiles p ON e.organizer_id = p.id
WHERE e.status = 'approved' AND e.date >= CURRENT_DATE
ORDER BY popularity_score DESC;

-- Refresh the view daily
CREATE OR REPLACE FUNCTION refresh_event_popularity()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY event_popularity;
END;
$$ LANGUAGE plpgsql;
```

## 🔄 Migration Strategy

### **Complete Migration Script**
```sql
-- 001_initial_schema.sql
-- Run this to create the complete database schema

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create all tables (as defined above)
-- ... (all CREATE TABLE statements)

-- Create all indexes
-- ... (all CREATE INDEX statements)

-- Create triggers
-- ... (all CREATE TRIGGER statements)

-- Create functions
-- ... (all CREATE FUNCTION statements)

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
-- ... enable RLS on all tables

-- Create all policies
-- ... (all CREATE POLICY statements)

-- Insert default data
INSERT INTO categories (name, slug, description, icon, color) VALUES
  ('Music', 'music', 'Concerts, festivals, and musical events', 'music', '#FF6B6B'),
  ('Sports', 'sports', 'Sports events and competitions', 'trophy', '#4ECDC4'),
  ('Arts', 'arts', 'Theater, exhibitions, and cultural events', 'palette', '#45B7D1'),
  ('Technology', 'technology', 'Tech meetups, conferences, and workshops', 'cpu', '#96CEB4'),
  ('Education', 'education', 'Workshops, courses, and learning events', 'graduation-cap', '#FFEAA7'),
  ('Food', 'food', 'Food festivals, cooking classes, and tastings', 'utensils', '#DDA0DD'),
  ('Business', 'business', 'Networking, conferences, and professional events', 'briefcase', '#98D8C8'),
  ('Health', 'health', 'Wellness, fitness, and health-related events', 'heart', '#F7DC6F');

-- Insert system settings
INSERT INTO system_settings (key, value, description, category) VALUES
  ('site_name', '"EventConnect"', 'Site name displayed in header', 'general'),
  ('max_events_per_organizer', '50', 'Maximum events an organizer can create', 'limits'),
  ('event_approval_required', 'true', 'Whether events require admin approval', 'features'),
  ('tampere_api_enabled', 'true', 'Enable Tampere City Hall API integration', 'integrations');
```

This comprehensive database schema provides a solid foundation for the EventConnect platform with proper relationships, security policies, performance optimizations, and scalability features.