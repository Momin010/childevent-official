import React, { useState } from 'react';
import Calendar from 'react-calendar';
import { motion } from 'framer-motion';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { MapPin, Users, Clock, Calendar as CalendarIcon } from 'lucide-react';
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
  const [selectedDateRange, setSelectedDateRange] = useState<[Date, Date] | null>(null);
  const [viewMode, setViewMode] = useState<'single' | 'range'>('single');

  const getEventsForDateRange = (dateRange: [Date, Date] | null) => {
    if (!dateRange) return [];

    try {
      return events.filter((event) => {
        const eventDate = startOfDay(new Date(event.date));
        return isWithinInterval(eventDate, {
          start: startOfDay(dateRange[0]),
          end: endOfDay(dateRange[1])
        });
      });
    } catch (error) {
      console.error('Error filtering events by date range:', error);
      return [];
    }
  };

  const selectedEvents = getEventsForDateRange(selectedDateRange);

  const handleCalendarChange = (value: Date | [Date, Date] | null) => {
    if (value === null) {
      setSelectedDateRange(null);
    } else if (Array.isArray(value)) {
      // Already a date range
      setSelectedDateRange(value);
    } else {
      // Single date - convert to range [date, date]
      setSelectedDateRange([value, value]);
    }
  };

  const tileClassName = ({ date }: { date: Date }) => {
    let classes = '';

    // Check if date has events
    const hasEvents = events.some(
      (e) => format(new Date(e.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
    if (hasEvents) classes += 'has-events ';

    // Check if date is in selected range
    if (selectedDateRange) {
      const dateStart = startOfDay(date);
      const rangeStart = startOfDay(selectedDateRange[0]);
      const rangeEnd = endOfDay(selectedDateRange[1]);

      if (isWithinInterval(dateStart, { start: rangeStart, end: rangeEnd })) {
        classes += 'selected-range ';
      }
    }

    return classes.trim();
  };

  const clearSelection = () => {
    setSelectedDateRange(null);
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'single' ? 'range' : 'single');
    setSelectedDateRange(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="max-w-6xl mx-auto p-4">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Calendar */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold">
                {userRole === 'organizer' ? 'Event Management Calendar' : 'Your Event Calendar'}
              </h2>
              {selectedDateRange && (
                <button
                  onClick={clearSelection}
                  className="text-sm text-blue-500 hover:text-blue-700"
                >
                  Clear Selection
                </button>
              )}
            </div>

            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {selectedDateRange ? (
                  <div className="flex items-center">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    <span>
                      {Array.isArray(selectedDateRange)
                        ? `Selected: ${format(selectedDateRange[0], 'MMM d')} - ${format(selectedDateRange[1], 'MMM d, yyyy')}`
                        : `Selected: ${format(selectedDateRange, 'MMMM d, yyyy')}`
                      }
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    <span>Click dates to select range</span>
                  </div>
                )}
              </div>
              <button
                onClick={toggleViewMode}
                className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
              >
                {viewMode === 'single' ? 'Range Mode' : 'Single Mode'}
              </button>
            </div>

            <Calendar
              onChange={handleCalendarChange}
              value={selectedDateRange}
              selectRange={viewMode === 'range'}
              tileClassName={tileClassName}
              className="w-full"
            />
          </div>

          {/* Events for Selected Date Range */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-6">
              {userRole === 'organizer' ? 'Your Events' : 'Events'}
              {selectedDateRange ? (
                <span className="block text-lg font-normal text-gray-600 mt-1">
                  {format(selectedDateRange[0], 'MMM d')} - {format(selectedDateRange[1], 'MMM d, yyyy')}
                </span>
              ) : (
                <span className="block text-lg font-normal text-gray-600 mt-1">
                  Select dates to view events
                </span>
              )}
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