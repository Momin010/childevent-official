import React from 'react';
import { format } from 'date-fns';
import { Heart, MessageCircle, Share2, Bookmark, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Event } from '../types';

interface EventCardProps {
  event: Event;
  onClick: () => void;
  onLike: (eventId: string) => void;
  onBookmark: (eventId: string) => void;
  onComment: (eventId: string) => void;
  onShare: (eventId: string) => void;
  onOrganizerClick: (organizerId: string) => void;
  isBookmarked: boolean;
  isLoved: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onClick,
  onLike,
  onBookmark,
  onComment,
  onShare,
  onOrganizerClick,
  isBookmarked,
  isLoved,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-xl shadow-sm overflow-hidden mb-4 hover:shadow-md transition-shadow duration-200"
    >
      <div className="relative cursor-pointer" onClick={onClick}>
        <img
          src={event.imageUrl}
          alt={event.title}
          className="w-full h-64 object-cover"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
          <h3 className="text-xl font-semibold text-white">{event.title}</h3>
          <p className="text-white/90 text-sm">
            {format(new Date(event.date), 'MMM d, yyyy')} at {event.time}
          </p>
        </div>
      </div>

      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-gray-600 text-sm">{event.location}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOrganizerClick(event.organizer.id);
              }}
              className="text-blue-500 hover:text-blue-600 text-sm mt-1 flex items-center space-x-2"
            >
              <img
                src={event.organizer.profilePicture || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e'}
                alt={event.organizer.name}
                className="w-6 h-6 rounded-full"
              />
              <span>by {event.organizer.name}</span>
            </button>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              onBookmark(event.id);
            }}
            className={`text-gray-500 hover:text-blue-500 transition-colors duration-200 ${
              isBookmarked ? 'text-blue-500' : ''
            }`}
          >
            <Bookmark className="w-5 h-5" />
          </motion.button>
        </div>

        <p className="text-gray-700 mb-4 line-clamp-2">{event.description}</p>

        <div className="flex items-center text-sm text-gray-500 mb-4">
          <Users className="w-4 h-4 mr-1" />
          <span>{event.goingCount} going</span>
          <span className="mx-2">•</span>
          <span>{event.interestedCount} interested</span>
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              onLike(event.id);
            }}
            className={`flex items-center text-gray-500 hover:text-red-500 transition-colors duration-200 ${
              isLoved ? 'text-red-500' : ''
            }`}
          >
            <Heart className="w-5 h-5 mr-1" />
            <span>{event.likes}</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              onComment(event.id);
            }}
            className="flex items-center text-gray-500 hover:text-blue-500 transition-colors duration-200"
          >
            <MessageCircle className="w-5 h-5 mr-1" />
            <span>{event.comments.length}</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              onShare(event.id);
            }}
            className="flex items-center text-gray-500 hover:text-blue-500 transition-colors duration-200"
          >
            <Share2 className="w-5 h-5 mr-1" />
            <span>Share</span>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};