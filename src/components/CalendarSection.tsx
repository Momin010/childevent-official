import React, { useState } from 'react';
import Calendar from 'react-calendar';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { MapPin, Users, Clock } from 'lucide-react';
import type { Event } from '../types';

interface CalendarSectionProps {
  events: Event[];
  onEventClick: (event: Event) => void;
  userRole?: 'user' | 'organizer';
}

export const CalendarSection: React.FC<CalendarSectionProps> = ({
  events,
  onEventClick,
  userRole = 'user',
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const getEventsForDate = (date: Date) => {
    return events.filter(
      (event) => format(new Date(event.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  const selectedEvents = getEventsForDate(selectedDate);

  const tileClassName = ({ date }: { date: Date }) => {
    const hasEvents = events.some(
      (e) => format(new Date(e.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
    return hasEvents ? 'has-events' : '';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="max-w-6xl mx-auto p-4">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Calendar */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-6">
              {userRole === 'organizer' ? 'Event Management Calendar' : 'Your Event Calendar'}
            </h2>
            <Calendar
              onChange={setSelectedDate}
              value={selectedDate}
              tileClassName={tileClassName}
              className="w-full"
            />
          </div>

          {/* Events for Selected Date */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-6">
              {userRole === 'organizer' ? 'Your Events' : 'Events'} for {format(selectedDate, 'MMMM d, yyyy')}
            </h2>

            {selectedEvents.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  {userRole === 'organizer'
                    ? 'No events scheduled for this date.'
                    : 'No events you\'re attending on this date.'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedEvents.map((event) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200 cursor-pointer"
                    onClick={() => onEventClick(event)}
                  >
                    <div className="flex">
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="w-32 h-32 object-cover"
                      />
                      <div className="p-4 flex-1">
                        <h3 className="font-semibold text-lg mb-2">{event.title}</h3>
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-2" />
                            <span>{event.time}</span>
                          </div>
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-2" />
                            <span>{event.location}</span>
                          </div>
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-2" />
                            <span>{event.goingCount} attending</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};