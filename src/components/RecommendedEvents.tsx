import React, { useState, useEffect } from 'react';
import { Sparkles, Clock, Users, MapPin, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { getPersonalizedRecommendations, getCollaborativeRecommendations, trackEventInteraction } from '../lib/recommendations';
import { getEventById } from '../lib/events';
import { useAppStore } from '../store/appStore';
import { EventCard } from './EventCard';
import type { Event } from '../types';

interface RecommendedEventsProps {
  onEventClick: (event: Event) => void;
  onLike: (eventId: string) => void;
  onBookmark: (eventId: string) => void;
  onShare: (event: Event) => void;
  onOrganizerClick: (organizerId: string) => void;
  bookmarkedEvents: string[];
  lovedEvents: string[];
}

export const RecommendedEvents: React.FC<RecommendedEventsProps> = ({
  onEventClick,
  onLike,
  onBookmark,
  onShare,
  onOrganizerClick,
  bookmarkedEvents,
  lovedEvents,
}) => {
  const { user } = useAppStore();
  const [recommendations, setRecommendations] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [recommendationReasons, setRecommendationReasons] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user?.id) {
      loadRecommendations();
    }
  }, [user?.id]);

  const loadRecommendations = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Get personalized recommendations
      const personalRecs = await getPersonalizedRecommendations(user.id, 8);

      // Get collaborative recommendations as backup
      const collabRecs = await getCollaborativeRecommendations(user.id, 4);

      // Combine and deduplicate
      const allRecIds = [...new Set([
        ...personalRecs.map(r => r.eventId),
        ...collabRecs.map(r => r.eventId)
      ])];

      // Fetch event details
      const eventPromises = allRecIds.map(id => getEventById(id));
      const events = await Promise.all(eventPromises);
      const validEvents = events.filter(event => event !== null) as Event[];

      // Create reason mapping
      const reasons: Record<string, string> = {};
      personalRecs.forEach(rec => {
        reasons[rec.eventId] = getReasonText(rec.reason);
      });
      collabRecs.forEach(rec => {
        if (!reasons[rec.eventId]) {
          reasons[rec.eventId] = getReasonText(rec.reason);
        }
      });

      setRecommendations(validEvents);
      setRecommendationReasons(reasons);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getReasonText = (reason: string): string => {
    switch (reason) {
      case 'high_affinity_based_on_behavior':
        return 'Based on your interests';
      case 'matches_your_hobbies':
        return 'Matches your hobbies';
      case 'family_friendly':
        return 'Perfect for families';
      case 'age_appropriate':
        return 'Great for your age group';
      case 'liked_by_similar_users':
        return 'Popular with similar users';
      case 'trending_near_you':
        return 'Trending in your area';
      default:
        return 'Recommended for you';
    }
  };

  const handleEventClick = (event: Event) => {
    // Track the click
    if (user?.id) {
      trackEventInteraction(user.id, {
        eventId: event.id,
        type: 'click'
      });
    }
    onEventClick(event);
  };

  if (loading) {
    return (
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Sparkles className="w-6 h-6 text-purple-500 mr-2" />
          <h2 className="text-xl font-bold text-gray-900">Recommended for You</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-md p-4 animate-pulse">
              <div className="h-32 bg-gray-200 rounded mb-3"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null; // Don't show section if no recommendations
  }

  return (
    <div className="mb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center mb-6"
      >
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-full mr-3">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Recommended for You</h2>
          <p className="text-gray-600 text-sm">Personalized event suggestions based on your interests</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {recommendations.map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative"
          >
            <EventCard
              event={event}
              onClick={() => handleEventClick(event)}
              onLike={() => onLike(event.id)}
              onBookmark={() => onBookmark(event.id)}
              onShare={() => onShare(event)}
              onOrganizerClick={onOrganizerClick}
              isBookmarked={bookmarkedEvents.includes(event.id)}
              isLoved={lovedEvents.includes(event.id)}
            />

            {/* Recommendation reason badge */}
            <div className="absolute top-2 left-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full font-medium shadow-lg">
              {recommendationReasons[event.id] || 'Recommended'}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recommendation insights */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100"
      >
        <div className="flex items-start">
          <div className="bg-purple-100 p-2 rounded-full mr-3">
            <Heart className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">How we personalize your recommendations</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600">
              <div className="flex items-center">
                <Users className="w-4 h-4 text-purple-500 mr-2" />
                <span>Your interests & hobbies</span>
              </div>
              <div className="flex items-center">
                <Clock className="w-4 h-4 text-purple-500 mr-2" />
                <span>Events you engage with</span>
              </div>
              <div className="flex items-center">
                <MapPin className="w-4 h-4 text-purple-500 mr-2" />
                <span>Location preferences</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};