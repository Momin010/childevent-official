import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, MapPin, Calendar, Clock, Heart, Share2, UserPlus } from 'lucide-react';
import type { Event, User } from '../types';

interface EventDetailsModalProps {
  event: Event;
  isOpen: boolean;
  onClose: () => void;
  onShare: (event: Event) => void;
  onFollow: (organizerId: string) => void;
  onSignUp: (eventId: string) => void;
  currentUser: User;
}

export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  event,
  isOpen,
  onClose,
  onShare,
  onFollow,
  onSignUp,
  currentUser,
}) => {
  const isAttending = event.attendees.some(attendee => attendee.userId === currentUser.id);
  const isFollowing = currentUser.following.includes(event.organizer.id);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header Image */}
            <div className="relative h-64">
              <img
                src={event.imageUrl}
                alt={event.title}
                className="w-full h-full object-cover"
              />
              <button
                onClick={onClose}
                className="absolute top-4 right-4 bg-white rounded-full p-2"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {/* Event Title and Actions */}
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold">{event.title}</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => onShare(event)}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-full">
                    <Heart className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Event Details */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Calendar className="w-5 h-5" />
                  <span>{event.date}</span>
                  <Clock className="w-5 h-5 ml-4" />
                  <span>{event.time}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <MapPin className="w-5 h-5" />
                  <span>{event.location}</span>
                </div>
                <p className="text-gray-700">{event.description}</p>
              </div>

              {/* Organizer */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-6">
                <div className="flex items-center space-x-3">
                  <img
                    src={event.organizer.profilePicture || 'https://via.placeholder.com/40'}
                    alt={event.organizer.name}
                    className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <p className="font-semibold">{event.organizer.name}</p>
                    <p className="text-sm text-gray-500">
                      {event.organizer.followers} followers • {event.organizer.events} events
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onFollow(event.organizer.id)}
                  className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
                    isFollowing
                      ? 'bg-gray-200 text-gray-700'
                      : 'bg-blue-500 text-white'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isFollowing ? 'Following' : 'Follow'}</span>
                </button>
              </div>

              {/* Attendees */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Who's Going</h3>
                <div className="flex items-center space-x-2 mb-4">
                  <Users className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-600">
                    {event.goingCount} people are going
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {event.attendees.map(attendee => (
                    <div
                      key={attendee.userId}
                      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50"
                    >
                      <img
                        src={attendee.profilePicture || 'https://via.placeholder.com/32'}
                        alt={attendee.name}
                        className="w-8 h-8 rounded-full"
                      />
                      <span className="font-medium">{attendee.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sign Up Button */}
              <button
                onClick={() => onSignUp(event.id)}
                className={`w-full py-3 rounded-lg font-semibold ${
                  isAttending
                    ? 'bg-gray-200 text-gray-700'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {isAttending ? "You're Going" : "Sign Up"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};