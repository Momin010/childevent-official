import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Users, MapPin, ArrowLeft } from 'lucide-react';
import type { Event } from '../types';

interface OrganizerProfileProps {
  organizer: {
    id: string;
    name: string;
    profilePicture?: string;
    followers: number;
    events: number;
    description?: string;
  };
  organizerEvents: Event[];
  isFollowing: boolean;
  onFollow: (organizerId: string) => void;
  onBack: () => void;
}

export const OrganizerProfile: React.FC<OrganizerProfileProps> = ({
  organizer,
  organizerEvents,
  isFollowing,
  onFollow,
  onBack,
}) => {
  return (
    <div className="min-h-screen bg-white pb-16">
      <div className="max-w-4xl mx-auto p-4">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Events
        </button>

        {/* Organizer Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <img
                src={organizer.profilePicture || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e'}
                alt={organizer.name}
                className="w-20 h-20 rounded-full object-cover"
              />
              <div>
                <h1 className="text-2xl font-bold">{organizer.name}</h1>
                <div className="flex items-center space-x-4 text-gray-600 mt-2">
                  <span>{organizer.events} Events</span>
                  <span>•</span>
                  <span>{organizer.followers} Followers</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => onFollow(organizer.id)}
              className={`px-6 py-2 rounded-lg font-semibold transition-all duration-200 ${
                isFollowing
                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          </div>
          {organizer.description && (
            <p className="mt-4 text-gray-700">{organizer.description}</p>
          )}
        </div>

        {/* Events Grid */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Events by {organizer.name}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {organizerEvents.map(event => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200"
              >
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2">{event.title}</h3>
                  <div className="space-y-2 text-gray-600">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>{event.date} at {event.time}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4" />
                      <span>{event.location}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4" />
                      <span>{event.goingCount} attending</span>
                    </div>
                  </div>
                  <p className="mt-2 text-gray-700 line-clamp-2">{event.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};