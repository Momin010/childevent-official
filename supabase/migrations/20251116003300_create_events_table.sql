/*
  # Create Events Table

  Creates a table to store events created by organizers.
  Includes all necessary fields for event management and analytics.
*/

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  image_url text DEFAULT 'https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=1000',
  date date NOT NULL,
  time time NOT NULL,
  location text NOT NULL,
  category text,
  max_attendees integer,
  price decimal(10,2) DEFAULT 0,
  tags text[] DEFAULT '{}',
  organizer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Analytics fields
  views_count integer DEFAULT 0,
  signups_count integer DEFAULT 0,
  shares_count integer DEFAULT 0,
  likes_count integer DEFAULT 0,
  clicks_count integer DEFAULT 0
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);

-- Create or replace updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Ensure any existing trigger is removed before creating (idempotent)
DROP TRIGGER IF EXISTS update_events_updated_at ON events;

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view all events
CREATE POLICY IF NOT EXISTS "Users can view all events" ON events
    FOR SELECT USING (true);

-- Only organizers can create events
CREATE POLICY IF NOT EXISTS "Organizers can create events" ON events
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_organizer = true
        )
    );

-- Only event organizers can update their events
CREATE POLICY IF NOT EXISTS "Organizers can update their events" ON events
    FOR UPDATE USING (organizer_id = auth.uid());

-- Only event organizers can delete their events
CREATE POLICY IF NOT EXISTS "Organizers can delete their events" ON events
    FOR DELETE USING (organizer_id = auth.uid());

-- Create event_attendees table for tracking who signed up for events
CREATE TABLE IF NOT EXISTS event_attendees (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  signed_up_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  status text DEFAULT 'attending' CHECK (status IN ('attending', 'interested', 'cancelled')),

  UNIQUE(event_id, user_id)
);

-- Indexes for event_attendees
CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user_id ON event_attendees(user_id);

-- Enable RLS for event_attendees
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_attendees
CREATE POLICY IF NOT EXISTS "Users can view event attendees" ON event_attendees
    FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Users can sign up for events" ON event_attendees
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can update their event attendance" ON event_attendees
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can cancel their event attendance" ON event_attendees
    FOR DELETE USING (user_id = auth.uid());

-- Create event_comments table for event discussions
CREATE TABLE IF NOT EXISTS event_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  likes_count integer DEFAULT 0
);

-- Indexes for event_comments
CREATE INDEX IF NOT EXISTS idx_event_comments_event_id ON event_comments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_comments_user_id ON event_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_event_comments_created_at ON event_comments(created_at);

-- Enable RLS for event_comments
ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_comments
CREATE POLICY IF NOT EXISTS "Users can view event comments" ON event_comments
    FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Users can create comments" ON event_comments
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can update their comments" ON event_comments
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can delete their comments" ON event_comments
    FOR DELETE USING (user_id = auth.uid());

-- Ensure any existing trigger is removed before creating (idempotent)
DROP TRIGGER IF EXISTS update_event_comments_updated_at ON event_comments;

-- Create trigger for event_comments updated_at
CREATE TRIGGER update_event_comments_updated_at
    BEFORE UPDATE ON event_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create event_likes table for tracking event likes
CREATE TABLE IF NOT EXISTS event_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,

  UNIQUE(event_id, user_id)
);

-- Indexes for event_likes
CREATE INDEX IF NOT EXISTS idx_event_likes_event_id ON event_likes(event_id);
CREATE INDEX IF NOT EXISTS idx_event_likes_user_id ON event_likes(user_id);

-- Enable RLS for event_likes
ALTER TABLE event_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_likes
CREATE POLICY IF NOT EXISTS "Users can view event likes" ON event_likes
    FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Users can like events" ON event_likes
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can unlike events" ON event_likes
    FOR DELETE USING (user_id = auth.uid());

-- Create event_bookmarks table for tracking saved events
CREATE TABLE IF NOT EXISTS event_bookmarks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,

  UNIQUE(event_id, user_id)
);

-- Indexes for event_bookmarks
CREATE INDEX IF NOT EXISTS idx_event_bookmarks_event_id ON event_bookmarks(event_id);
CREATE INDEX IF NOT EXISTS idx_event_bookmarks_user_id ON event_bookmarks(user_id);

-- Enable RLS for event_bookmarks
ALTER TABLE event_bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_bookmarks
CREATE POLICY IF NOT EXISTS "Users can view their bookmarks" ON event_bookmarks
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can bookmark events" ON event_bookmarks
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can remove bookmarks" ON event_bookmarks
    FOR DELETE USING (user_id = auth.uid());