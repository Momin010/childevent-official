import React, { useState, useRef, useCallback } from 'react';
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
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<Date | null>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<number | null>(null);
  const isLongPress = useRef(false);

  const getEventsForDateRange = (dateRange: [Date, Date] | null) => {
    if (!dateRange) return [];
    return events.filter((event) => {
      const eventDate = startOfDay(new Date(event.date));
      return isWithinInterval(eventDate, {
        start: startOfDay(dateRange[0]),
        end: endOfDay(dateRange[1])
      });
    });
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(
      (event) => format(new Date(event.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  const selectedEvents = selectedDateRange
    ? getEventsForDateRange(selectedDateRange)
    : [];

  // Touch/mouse gesture handlers
  const handleMouseDown = useCallback((date: Date) => {
    longPressTimer.current = window.setTimeout(() => {
      isLongPress.current = true;
      setIsSelecting(true);
      setSelectionStart(date);
      setSelectedDateRange([date, date]);
    }, 500); // 500ms for long press
  }, []);

  const handleMouseUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (!isLongPress.current) {
      // Regular click - select single date
      setSelectedDateRange(null);
      setIsSelecting(false);
    }
    isLongPress.current = false;
  }, []);

  const handleMouseEnter = useCallback((date: Date) => {
    if (isSelecting && selectionStart) {
      const start = selectionStart < date ? selectionStart : date;
      const end = selectionStart < date ? date : selectionStart;
      setSelectedDateRange([start, end]);
    }
  }, [isSelecting, selectionStart]);

  const handleTouchStart = useCallback((date: Date) => {
    longPressTimer.current = window.setTimeout(() => {
      isLongPress.current = true;
      setIsSelecting(true);
      setSelectionStart(date);
      setSelectedDateRange([date, date]);
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (!isLongPress.current) {
      setSelectedDateRange(null);
      setIsSelecting(false);
    }
    isLongPress.current = false;
  }, []);

  const handleTouchMove = useCallback((date: Date) => {
    if (isSelecting && selectionStart) {
      const start = selectionStart < date ? selectionStart : date;
      const end = selectionStart < date ? date : selectionStart;
      setSelectedDateRange([start, end]);
    }
  }, [isSelecting, selectionStart]);

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
    setIsSelecting(false);
    setSelectionStart(null);
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

            <div className="mb-4 text-sm text-gray-600">
              {selectedDateRange ? (
                <div className="flex items-center">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  <span>
                    Selected: {format(selectedDateRange[0], 'MMM d')} - {format(selectedDateRange[1], 'MMM d, yyyy')}
                  </span>
                </div>
              ) : (
                <div className="flex items-center">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  <span>Long press and drag to select date range</span>
                </div>
              )}
            </div>

            <Calendar
              tileClassName={tileClassName}
              className="w-full"
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseEnter={handleMouseEnter}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchMove}
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