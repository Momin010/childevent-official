import React from 'react';
import { EventCard } from './EventCard';
import { Bookmark, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Event } from '../types';

interface EventFeedProps {
  events: Event[];
  onEventClick: (event: Event) => void;
  onLike: (eventId: string) => void;
  onBookmark: (eventId: string) => void;
  onComment: (eventId: string) => void;
  onShare: (event: Event) => void;
  onOrganizerClick: (organizerId: string) => void;
  bookmarkedEvents: string[];
  lovedEvents: string[];
}

export const EventFeed: React.FC<EventFeedProps> = ({
  events,
  onEventClick,
  onLike,
  onBookmark,
  onComment,
  onShare,
  onOrganizerClick,
  bookmarkedEvents,
  lovedEvents,
}) => {
  return (
    <div className="flex max-w-6xl mx-auto px-4 py-4 mb-16 gap-6">
      {/* Sidebar */}
      <div className="hidden md:block w-64 space-y-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center space-x-3 p-4 rounded-lg bg-white shadow-sm hover:shadow-md transition-all duration-200"
        >
          <Bookmark className="w-5 h-5 text-blue-500" />
          <span className="font-medium">Bookmarked Events ({bookmarkedEvents.length})</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center space-x-3 p-4 rounded-lg bg-white shadow-sm hover:shadow-md transition-all duration-200"
        >
          <Heart className="w-5 h-5 text-red-500" />
          <span className="font-medium">Loved Events ({lovedEvents.length})</span>
        </motion.button>
      </div>

      {/* Event Feed */}
      <div className="flex-1 max-w-lg mx-auto">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onClick={() => onEventClick(event)}
            onLike={onLike}
            onBookmark={onBookmark}
            onComment={onComment}
            onShare={onShare}
            onOrganizerClick={onOrganizerClick}
            isBookmarked={bookmarkedEvents.includes(event.id)}
            isLoved={lovedEvents.includes(event.id)}
          />
        ))}
      </div>
    </div>
  );
};