-- Create analytics tables for user behavior tracking and AI training data

-- User sessions table
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  device_info JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Page view analytics
CREATE TABLE page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT REFERENCES user_sessions(session_id) ON DELETE CASCADE,
  page_path TEXT NOT NULL,
  page_title TEXT,
  time_spent_seconds INTEGER,
  referrer TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  viewport_size JSONB,
  scroll_depth DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Search analytics
CREATE TABLE search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT REFERENCES user_sessions(session_id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  filters_used JSONB,
  results_count INTEGER DEFAULT 0,
  clicked_result_id UUID,
  search_duration_ms INTEGER,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  successful BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event interaction tracking
CREATE TABLE event_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'like', 'bookmark', 'signup', 'share', 'comment', 'unlike', 'unbookmark')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB, -- Additional context (position in feed, search query, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User journey tracking
CREATE TABLE user_journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT REFERENCES user_sessions(session_id) ON DELETE CASCADE,
  journey_path JSONB, -- Array of page visits with timestamps
  conversion_events JSONB, -- Key actions (signup, event_registration, etc.)
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  total_time_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI training data aggregation (daily summaries)
CREATE TABLE analytics_daily_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  total_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  total_page_views INTEGER DEFAULT 0,
  total_searches INTEGER DEFAULT 0,
  total_event_interactions INTEGER DEFAULT 0,
  popular_searches JSONB,
  popular_pages JSONB,
  popular_events JSONB,
  user_demographics JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX idx_user_sessions_start_time ON user_sessions(start_time);

CREATE INDEX idx_page_views_user_id ON page_views(user_id);
CREATE INDEX idx_page_views_session_id ON page_views(session_id);
CREATE INDEX idx_page_views_timestamp ON page_views(timestamp);
CREATE INDEX idx_page_views_page_path ON page_views(page_path);

CREATE INDEX idx_search_queries_user_id ON search_queries(user_id);
CREATE INDEX idx_search_queries_session_id ON search_queries(session_id);
CREATE INDEX idx_search_queries_timestamp ON search_queries(timestamp);
CREATE INDEX idx_search_queries_query_text ON search_queries(query_text);

CREATE INDEX idx_event_interactions_user_id ON event_interactions(user_id);
CREATE INDEX idx_event_interactions_event_id ON event_interactions(event_id);
CREATE INDEX idx_event_interactions_type ON event_interactions(interaction_type);
CREATE INDEX idx_event_interactions_timestamp ON event_interactions(timestamp);

CREATE INDEX idx_user_journeys_user_id ON user_journeys(user_id);
CREATE INDEX idx_user_journeys_session_id ON user_journeys(session_id);

CREATE INDEX idx_analytics_daily_summary_date ON analytics_daily_summary(date);

-- Row Level Security (RLS) policies
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily_summary ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own sessions" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own page views" ON page_views
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own searches" ON search_queries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own interactions" ON event_interactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own journeys" ON user_journeys
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can see all data
CREATE POLICY "Admins can view all sessions" ON user_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all page views" ON page_views
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all searches" ON search_queries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all interactions" ON event_interactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all journeys" ON user_journeys
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can view daily summaries" ON analytics_daily_summary
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Organizers can see data related to their events
CREATE POLICY "Organizers can view event interactions for their events" ON event_interactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN events e ON e.organizer_id = p.organizer_id
      WHERE p.id = auth.uid()
      AND p.role = 'organizer'
      AND e.id = event_interactions.event_id
    )
  );

-- Allow inserts for authenticated users (for tracking)
CREATE POLICY "Authenticated users can insert sessions" ON user_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert page views" ON page_views
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert searches" ON search_queries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert interactions" ON event_interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert journeys" ON user_journeys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Functions for analytics aggregation
CREATE OR REPLACE FUNCTION get_daily_analytics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_users', COUNT(DISTINCT user_id),
    'total_sessions', COUNT(DISTINCT session_id),
    'total_page_views', COUNT(*),
    'avg_session_duration', AVG(EXTRACT(EPOCH FROM (end_time - start_time))),
    'popular_pages', (
      SELECT jsonb_agg(jsonb_build_object('path', page_path, 'views', view_count))
      FROM (
        SELECT page_path, COUNT(*) as view_count
        FROM page_views
        WHERE DATE(timestamp) = target_date
        GROUP BY page_path
        ORDER BY view_count DESC
        LIMIT 10
      ) popular
    ),
    'popular_searches', (
      SELECT jsonb_agg(jsonb_build_object('query', query_text, 'count', search_count))
      FROM (
        SELECT query_text, COUNT(*) as search_count
        FROM search_queries
        WHERE DATE(timestamp) = target_date
        GROUP BY query_text
        ORDER BY search_count DESC
        LIMIT 10
      ) searches
    )
  ) INTO result
  FROM user_sessions
  WHERE DATE(start_time) = target_date;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;