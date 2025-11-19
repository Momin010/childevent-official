import React from 'react';
import { supabase } from './supabase';

// Types for recommendation system
export interface UserInteraction {
  eventId: string;
  type: 'view' | 'click' | 'bookmark' | 'like' | 'signup' | 'attend';
  duration?: number;
  metadata?: Record<string, any>;
}

export interface Recommendation {
  eventId: string;
  score: number;
  reason: string;
}

export interface SearchBehavior {
  query?: string;
  filters?: Record<string, any>;
  resultsCount?: number;
  clickedEventIds?: string[];
}

// Track user interactions with events
export const trackEventInteraction = async (
  userId: string,
  interaction: UserInteraction
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('user_event_interactions')
      .upsert({
        user_id: userId,
        event_id: interaction.eventId,
        interaction_type: interaction.type,
        duration_seconds: interaction.duration,
        metadata: interaction.metadata,
        timestamp: new Date().toISOString()
      }, {
        onConflict: 'user_id,event_id,interaction_type,DATE(timestamp)'
      });

    if (error) throw error;
  } catch (error) {
    console.error('Failed to track event interaction:', error);
  }
};

// Track search behavior
export const trackSearchBehavior = async (
  userId: string,
  searchData: SearchBehavior
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('user_search_behavior')
      .insert({
        user_id: userId,
        search_query: searchData.query,
        filters_used: searchData.filters,
        results_count: searchData.resultsCount,
        clicked_event_ids: searchData.clickedEventIds,
        timestamp: new Date().toISOString()
      });

    if (error) throw error;
  } catch (error) {
    console.error('Failed to track search behavior:', error);
  }
};

// Start user session tracking
export const startUserSession = async (userId: string): Promise<string | null> => {
  try {
    const deviceInfo = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    const { data, error } = await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        session_start: new Date().toISOString(),
        device_info: deviceInfo,
        pages_viewed: [window.location.pathname],
        events_viewed: []
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Failed to start user session:', error);
    return null;
  }
};

// Update user session
export const updateUserSession = async (
  sessionId: string,
  updates: {
    pagesViewed?: string[];
    eventsViewed?: string[];
    totalTimeSeconds?: number;
  }
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('user_sessions')
      .update({
        pages_viewed: updates.pagesViewed,
        events_viewed: updates.eventsViewed,
        total_time_seconds: updates.totalTimeSeconds
      })
      .eq('id', sessionId);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to update user session:', error);
  }
};

// End user session
export const endUserSession = async (sessionId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('user_sessions')
      .update({
        session_end: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to end user session:', error);
  }
};

// Get personalized recommendations for a user
export const getPersonalizedRecommendations = async (
  userId: string,
  limit: number = 10
): Promise<Recommendation[]> => {
  try {
    // First check cache
    const { data: cached, error: cacheError } = await supabase
      .from('user_recommendations')
      .select('recommended_event_id, recommendation_score, recommendation_reason')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .order('recommendation_score', { ascending: false })
      .limit(limit);

    if (!cacheError && cached && cached.length > 0) {
      return cached.map(item => ({
        eventId: item.recommended_event_id,
        score: item.recommendation_score,
        reason: item.recommendation_reason
      }));
    }

    // If no cache, get fresh recommendations using the database function
    const { data, error } = await supabase
      .rpc('get_user_recommendations', {
        p_user_id: userId,
        p_limit: limit
      });

    if (error) throw error;

    // Cache the results
    if (data && data.length > 0) {
      const cacheData = data.map(rec => ({
        user_id: userId,
        recommended_event_id: rec.recommended_event_id,
        recommendation_score: rec.score,
        recommendation_reason: rec.reason
      }));

      await supabase
        .from('user_recommendations')
        .upsert(cacheData, {
          onConflict: 'user_id,recommended_event_id'
        });
    }

    return data || [];
  } catch (error) {
    console.error('Failed to get recommendations:', error);
    return [];
  }
};

// Get similar events (content-based recommendations)
export const getSimilarEvents = async (
  eventId: string,
  limit: number = 5
): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('event_similarities')
      .select('similar_event_id')
      .eq('event_id', eventId)
      .order('similarity_score', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data?.map(item => item.similar_event_id) || [];
  } catch (error) {
    console.error('Failed to get similar events:', error);
    return [];
  }
};

// Collaborative filtering: events liked by similar users
export const getCollaborativeRecommendations = async (
  userId: string,
  limit: number = 10
): Promise<Recommendation[]> => {
  try {
    // For now, return empty array - collaborative filtering needs more complex implementation
    // This would require finding similar users based on interaction patterns
    // and then recommending events they liked that the current user hasn't seen
    return [];
  } catch (error) {
    console.error('Failed to get collaborative recommendations:', error);
    return [];
  }
};

// Helper function to get events user has already interacted with
const getUserInteractedEvents = async (userId: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('user_event_interactions')
      .select('event_id')
      .eq('user_id', userId);

    if (error) throw error;
    return data?.map(item => item.event_id) || [];
  } catch (error) {
    console.error('Failed to get user interacted events:', error);
    return [];
  }
};

// Hook for tracking event views with duration
export const useEventViewTracking = (userId: string | null, eventId: string | null) => {
  const [viewStartTime, setViewStartTime] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (userId && eventId) {
      setViewStartTime(Date.now());

      // Track initial view
      trackEventInteraction(userId, {
        eventId,
        type: 'view'
      });

      // Track duration on unmount
      return () => {
        if (viewStartTime) {
          const duration = Math.floor((Date.now() - viewStartTime) / 1000);
          trackEventInteraction(userId, {
            eventId,
            type: 'view',
            duration
          });
        }
      };
    }
  }, [userId, eventId, viewStartTime]);

  return {
    trackClick: () => {
      if (userId && eventId) {
        trackEventInteraction(userId, { eventId, type: 'click' });
      }
    },
    trackBookmark: () => {
      if (userId && eventId) {
        trackEventInteraction(userId, { eventId, type: 'bookmark' });
      }
    },
    trackLike: () => {
      if (userId && eventId) {
        trackEventInteraction(userId, { eventId, type: 'like' });
      }
    },
    trackSignup: () => {
      if (userId && eventId) {
        trackEventInteraction(userId, { eventId, type: 'signup' });
      }
    }
  };
};
