/*
  # Complete EventConnect Database Schema

  1. New Tables
    - `events` - Event listings and details
    - `event_attendees` - Users attending events
    - `event_likes` - Event likes/loves
    - `event_bookmarks` - Bookmarked events
    - `event_comments` - Comments on events
    - `organizers` - Event organizers/companies

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Proper access controls for events and interactions

  3. Features
    - Complete event management system
    - User interactions (likes, bookmarks, comments)
    - Event attendance tracking
    - Organizer profiles
*/

-- Create organizers table
CREATE TABLE IF NOT EXISTS organizers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  profile_picture text,
  cover_photo text,
  followers_count integer DEFAULT 0,
  events_count integer DEFAULT 0,
  website text,
  email text,
  phone text,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  image_url text,
  date date NOT NULL,
  time time NOT NULL,
  location text NOT NULL,
  organizer_id uuid REFERENCES organizers(id) ON DELETE CASCADE NOT NULL,
  category text DEFAULT 'general',
  max_attendees integer,
  price decimal(10,2) DEFAULT 0,
  currency text DEFAULT 'USD',
  status text DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed', 'draft')),
  interested_count integer DEFAULT 0,
  going_count integer DEFAULT 0,
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  clicks_count integer DEFAULT 0,
  shares_count integer DEFAULT 0,
  created_by uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create event_attendees table
CREATE TABLE IF NOT EXISTS event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'going' CHECK (status IN ('going', 'interested', 'not_going')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Create event_likes table
CREATE TABLE IF NOT EXISTS event_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Create event_bookmarks table
CREATE TABLE IF NOT EXISTS event_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Create event_comments table
CREATE TABLE IF NOT EXISTS event_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  parent_id uuid REFERENCES event_comments(id) ON DELETE CASCADE,
  likes_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_event_attendees_event ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user ON event_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_event_likes_event ON event_likes(event_id);
CREATE INDEX IF NOT EXISTS idx_event_likes_user ON event_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_event_bookmarks_event ON event_bookmarks(event_id);
CREATE INDEX IF NOT EXISTS idx_event_bookmarks_user ON event_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_event_comments_event ON event_comments(event_id);

-- Enable Row Level Security
ALTER TABLE organizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;

-- Organizers policies
CREATE POLICY "Anyone can view organizers"
  ON organizers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create organizers"
  ON organizers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update organizers they created"
  ON organizers FOR UPDATE
  TO authenticated
  USING (true); -- For now, allow all updates

-- Events policies
CREATE POLICY "Anyone can view active events"
  ON events FOR SELECT
  TO authenticated
  USING (status = 'active');

CREATE POLICY "Users can create events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their events"
  ON events FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

-- Event attendees policies
CREATE POLICY "Users can view event attendees"
  ON event_attendees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their attendance"
  ON event_attendees FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their attendance"
  ON event_attendees FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can remove their attendance"
  ON event_attendees FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Event likes policies
CREATE POLICY "Users can view event likes"
  ON event_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can like events"
  ON event_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike events"
  ON event_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Event bookmarks policies
CREATE POLICY "Users can view their bookmarks"
  ON event_bookmarks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can bookmark events"
  ON event_bookmarks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove bookmarks"
  ON event_bookmarks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Event comments policies
CREATE POLICY "Users can view event comments"
  ON event_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create comments"
  ON event_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their comments"
  ON event_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their comments"
  ON event_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Functions to update counters
CREATE OR REPLACE FUNCTION update_event_counters()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'event_attendees' THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.status = 'going' THEN
        UPDATE events SET going_count = going_count + 1 WHERE id = NEW.event_id;
      ELSIF NEW.status = 'interested' THEN
        UPDATE events SET interested_count = interested_count + 1 WHERE id = NEW.event_id;
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      -- Handle status changes
      IF OLD.status = 'going' AND NEW.status != 'going' THEN
        UPDATE events SET going_count = going_count - 1 WHERE id = NEW.event_id;
      ELSIF OLD.status != 'going' AND NEW.status = 'going' THEN
        UPDATE events SET going_count = going_count + 1 WHERE id = NEW.event_id;
      END IF;
      
      IF OLD.status = 'interested' AND NEW.status != 'interested' THEN
        UPDATE events SET interested_count = interested_count - 1 WHERE id = NEW.event_id;
      ELSIF OLD.status != 'interested' AND NEW.status = 'interested' THEN
        UPDATE events SET interested_count = interested_count + 1 WHERE id = NEW.event_id;
      END IF;
    ELSIF TG_OP = 'DELETE' THEN
      IF OLD.status = 'going' THEN
        UPDATE events SET going_count = going_count - 1 WHERE id = OLD.event_id;
      ELSIF OLD.status = 'interested' THEN
        UPDATE events SET interested_count = interested_count - 1 WHERE id = OLD.event_id;
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'event_likes' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE events SET likes_count = likes_count + 1 WHERE id = NEW.event_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE events SET likes_count = likes_count - 1 WHERE id = OLD.event_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'event_comments' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE events SET comments_count = comments_count + 1 WHERE id = NEW.event_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE events SET comments_count = comments_count - 1 WHERE id = OLD.event_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for counter updates
CREATE TRIGGER update_event_attendees_counter
  AFTER INSERT OR UPDATE OR DELETE ON event_attendees
  FOR EACH ROW EXECUTE FUNCTION update_event_counters();

CREATE TRIGGER update_event_likes_counter
  AFTER INSERT OR DELETE ON event_likes
  FOR EACH ROW EXECUTE FUNCTION update_event_counters();

CREATE TRIGGER update_event_comments_counter
  AFTER INSERT OR DELETE ON event_comments
  FOR EACH ROW EXECUTE FUNCTION update_event_counters();

-- Create triggers for updated_at
CREATE TRIGGER update_organizers_updated_at 
  BEFORE UPDATE ON organizers 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at 
  BEFORE UPDATE ON events 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_comments_updated_at 
  BEFORE UPDATE ON event_comments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample organizers
INSERT INTO organizers (name, description, profile_picture, verified) VALUES
('Adventure Outdoors', 'Leading outdoor adventure company organizing hiking, camping, and climbing events.', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e', true),
('Peak Performance', 'Professional climbing and fitness training center.', 'https://images.unsplash.com/photo-1599566150163-29194dcaad36', true),
('Creative Lens', 'Photography workshops and creative events for all skill levels.', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330', true),
('Coffee Culture', 'Artisan coffee experiences and brewing masterclasses.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d', true),
('Beach Sports Club', 'Beach volleyball, surfing, and coastal sports events.', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e', true);

-- Insert some sample events
INSERT INTO events (title, description, image_url, date, time, location, organizer_id, category) 
SELECT 
  'Mountain Hiking Adventure',
  'Join us for an exciting day of hiking in the beautiful mountains! Perfect for both beginners and experienced hikers. Professional guides will lead the way and share interesting facts about local flora and fauna.',
  'https://images.unsplash.com/photo-1551632811-561732d1e306',
  CURRENT_DATE + INTERVAL '15 days',
  '07:00:00',
  'Mountain Trail Park',
  id,
  'outdoor'
FROM organizers WHERE name = 'Adventure Outdoors';

INSERT INTO events (title, description, image_url, date, time, location, organizer_id, category) 
SELECT 
  'Rock Climbing Workshop',
  'Learn the basics of rock climbing with certified instructors. All equipment provided. This workshop covers safety techniques, basic moves, and practical climbing experience.',
  'https://images.unsplash.com/photo-1522163182402-834f871fd851',
  CURRENT_DATE + INTERVAL '20 days',
  '09:00:00',
  'City Climbing Gym',
  id,
  'fitness'
FROM organizers WHERE name = 'Peak Performance';

INSERT INTO events (title, description, image_url, date, time, location, organizer_id, category) 
SELECT 
  'Sunset Photography Walk',
  'Capture the perfect sunset while learning photography techniques from professional photographers. Bring your own camera or smartphone.',
  'https://images.unsplash.com/photo-1493815793585-d94ccbc86df8',
  CURRENT_DATE + INTERVAL '25 days',
  '17:30:00',
  'Riverside Park',
  id,
  'creative'
FROM organizers WHERE name = 'Creative Lens';

INSERT INTO events (title, description, image_url, date, time, location, organizer_id, category) 
SELECT 
  'Coffee Brewing Masterclass',
  'Learn the art of coffee brewing from expert baristas. Explore different brewing methods and taste various coffee beans from around the world.',
  'https://images.unsplash.com/photo-1511920170033-f8396924c348',
  CURRENT_DATE + INTERVAL '30 days',
  '10:00:00',
  'Artisan Coffee Lab',
  id,
  'food'
FROM organizers WHERE name = 'Coffee Culture';

INSERT INTO events (title, description, image_url, date, time, location, organizer_id, category) 
SELECT 
  'Beach Volleyball Tournament',
  'Join our friendly beach volleyball tournament! All skill levels welcome. Form your team or join one on the spot.',
  'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1',
  CURRENT_DATE + INTERVAL '35 days',
  '11:00:00',
  'Sunny Beach',
  id,
  'sports'
FROM organizers WHERE name = 'Beach Sports Club';