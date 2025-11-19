-- Create user interaction tracking tables for recommendation system

-- User event interactions (views, clicks, bookmarks, likes, sign-ups)
CREATE TABLE IF NOT EXISTS user_event_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'click', 'bookmark', 'like', 'signup', 'attend')),
    interaction_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_seconds INTEGER, -- Time spent viewing (for view interactions)
    metadata JSONB, -- Additional data like scroll depth, etc.

    -- UNIQUE constraint handled by index below
);

-- User search behavior
CREATE TABLE IF NOT EXISTS user_search_behavior (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    search_query TEXT,
    filters_used JSONB, -- {date_range, location, category, etc.}
    results_count INTEGER,
    clicked_event_ids UUID[] REFERENCES events(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User session tracking
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_end TIMESTAMP WITH TIME ZONE,
    pages_viewed TEXT[], -- Array of page paths
    events_viewed UUID[] REFERENCES events(id),
    total_time_seconds INTEGER,
    device_info JSONB -- {browser, os, screen_size, etc.}
);

-- Event similarity matrix (pre-computed recommendations)
CREATE TABLE IF NOT EXISTS event_similarities (
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    similar_event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    similarity_score DECIMAL(3,2) NOT NULL CHECK (similarity_score >= 0 AND similarity_score <= 1),
    similarity_reason TEXT, -- 'category', 'location', 'organizer', 'user_behavior'

    PRIMARY KEY (event_id, similar_event_id),
    CHECK (event_id != similar_event_id)
);

-- User recommendations cache
CREATE TABLE IF NOT EXISTS user_recommendations (
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recommended_event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    recommendation_score DECIMAL(5,4) NOT NULL,
    recommendation_reason TEXT, -- 'similar_users_liked', 'based_on_hobbies', 'location_based', etc.
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),

    PRIMARY KEY (user_id, recommended_event_id),
    CHECK (recommendation_score >= 0 AND recommendation_score <= 1)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_event_interactions_user_event ON user_event_interactions(user_id, event_id);
CREATE INDEX IF NOT EXISTS idx_user_event_interactions_timestamp ON user_event_interactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_event_interactions_type ON user_event_interactions(interaction_type);

CREATE INDEX IF NOT EXISTS idx_user_search_behavior_user ON user_search_behavior(user_id);
CREATE INDEX IF NOT EXISTS idx_user_search_behavior_timestamp ON user_search_behavior(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_start ON user_sessions(session_start DESC);

CREATE INDEX IF NOT EXISTS idx_event_similarities_event ON event_similarities(event_id);
CREATE INDEX IF NOT EXISTS idx_event_similarities_score ON event_similarities(similarity_score DESC);

CREATE INDEX IF NOT EXISTS idx_user_recommendations_user ON user_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_recommendations_expires ON user_recommendations(expires_at);

-- Create a generated column for the date
ALTER TABLE user_event_interactions ADD COLUMN IF NOT EXISTS interaction_date DATE GENERATED ALWAYS AS (interaction_timestamp::date) STORED;

-- Unique constraint for user interactions (one per user-event-type per day)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_event_interaction_daily
ON user_event_interactions(user_id, event_id, interaction_type, interaction_date);

-- RLS Policies
ALTER TABLE user_event_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_search_behavior ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_similarities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_recommendations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own interaction data
CREATE POLICY "Users can view own interactions" ON user_event_interactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interactions" ON user_event_interactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own search behavior" ON user_search_behavior
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search behavior" ON user_search_behavior
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own sessions" ON user_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON user_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Event similarities are public (read-only)
CREATE POLICY "Anyone can view event similarities" ON event_similarities
    FOR SELECT USING (true);

-- User recommendations are private
CREATE POLICY "Users can view own recommendations" ON user_recommendations
    FOR SELECT USING (auth.uid() = user_id);

-- Admin policies for analytics
CREATE POLICY "Admins can view all interactions" ON user_event_interactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can view all search behavior" ON user_search_behavior
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can view all sessions" ON user_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Functions for recommendation system

-- Function to calculate user-event affinity score
CREATE OR REPLACE FUNCTION calculate_user_event_affinity(
    p_user_id UUID,
    p_event_id UUID
) RETURNS DECIMAL(5,4) AS $$
DECLARE
    affinity_score DECIMAL(5,4) := 0;
    interaction_count INTEGER;
    total_interactions INTEGER;
    time_spent INTEGER;
    user_hobbies TEXT[];
    event_category TEXT;
BEGIN
    -- Get user's hobbies
    SELECT hobbies INTO user_hobbies
    FROM profiles WHERE id = p_user_id;

    -- Get event category
    SELECT category INTO event_category
    FROM events WHERE id = p_event_id;

    -- Count interactions with this event
    SELECT COUNT(*) INTO interaction_count
    FROM user_event_interactions
    WHERE user_id = p_user_id AND event_id = p_event_id;

    -- Total user interactions
    SELECT COUNT(*) INTO total_interactions
    FROM user_event_interactions WHERE user_id = p_user_id;

    -- Time spent on event
    SELECT COALESCE(SUM(duration_seconds), 0) INTO time_spent
    FROM user_event_interactions
    WHERE user_id = p_user_id AND event_id = p_event_id AND interaction_type = 'view';

    -- Base affinity from interactions (40% weight)
    IF total_interactions > 0 THEN
        affinity_score := affinity_score + (interaction_count::DECIMAL / total_interactions) * 0.4;
    END IF;

    -- Time spent affinity (30% weight)
    affinity_score := affinity_score + LEAST(time_spent::DECIMAL / 300, 1) * 0.3; -- Max 5 minutes = 1.0

    -- Hobby match affinity (30% weight)
    IF user_hobbies IS NOT NULL AND event_category IS NOT NULL THEN
        -- Simple hobby matching (could be improved with NLP)
        IF event_category = ANY(user_hobbies) THEN
            affinity_score := affinity_score + 0.3;
        ELSIF EXISTS (
            SELECT 1 FROM unnest(user_hobbies) AS hobby
            WHERE event_category ILIKE '%' || hobby || '%'
        ) THEN
            affinity_score := affinity_score + 0.15;
        END IF;
    END IF;

    RETURN LEAST(affinity_score, 1.0);
END;
$$ LANGUAGE plpgsql;

-- Function to get personalized recommendations for a user
CREATE OR REPLACE FUNCTION get_user_recommendations(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
    event_id UUID,
    score DECIMAL(5,4),
    reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH user_profile AS (
        SELECT hobbies, age, is_parent, number_of_children
        FROM profiles WHERE id = p_user_id
    ),
    user_interactions AS (
        SELECT DISTINCT event_id
        FROM user_event_interactions
        WHERE user_id = p_user_id
    ),
    candidate_events AS (
        SELECT
            e.id,
            e.category,
            e.location,
            e.age_min,
            e.age_max,
            e.family_friendly,
            calculate_user_event_affinity(p_user_id, e.id) as affinity_score
        FROM events e
        WHERE e.id NOT IN (SELECT event_id FROM user_interactions)
        AND e.status = 'active'
        AND e.event_date > NOW()
    ),
    scored_events AS (
        SELECT
            ce.id as event_id,
            ce.affinity_score as score,
            CASE
                WHEN ce.affinity_score > 0.5 THEN 'high_affinity_based_on_behavior'
                WHEN ce.category = ANY((SELECT hobbies FROM user_profile)) THEN 'matches_your_hobbies'
                WHEN ce.family_friendly AND (SELECT is_parent FROM user_profile) THEN 'family_friendly'
                WHEN ce.age_min <= (SELECT age FROM user_profile) AND ce.age_max >= (SELECT age FROM user_profile) THEN 'age_appropriate'
                ELSE 'trending_near_you'
            END as reason
        FROM candidate_events ce
        ORDER BY ce.affinity_score DESC
        LIMIT p_limit
    )
    SELECT * FROM scored_events;
END;
$$ LANGUAGE plpgsql;