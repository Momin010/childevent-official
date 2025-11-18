import React, { useState, useEffect } from 'react';
import { Search, X, Filter, Calendar, MapPin, User, Building } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Event } from '../types';

interface SearchBarProps {
  events: Event[];
  onFilteredEvents: (filteredEvents: Event[]) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  events,
  onFilteredEvents,
  placeholder = "Search events by name, organizer, location, or date..."
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: '',
    location: '',
    organizer: '',
    category: ''
  });

  // Filter events based on search query and filters
  useEffect(() => {
    let filtered = events;

    // Text search across multiple fields
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query) ||
        event.location.toLowerCase().includes(query) ||
        event.organizer.name.toLowerCase().includes(query) ||
        event.date.includes(query) ||
        event.time.includes(query)
      );
    }

    // Apply filters
    if (filters.dateRange) {
      const today = new Date();
      const filterDate = new Date(filters.dateRange);

      switch (filters.dateRange) {
        case 'today':
          filtered = filtered.filter(event => {
            const eventDate = new Date(event.date);
            return eventDate.toDateString() === today.toDateString();
          });
          break;
        case 'tomorrow':
          const tomorrow = new Date(today);
          tomorrow.setDate(today.getDate() + 1);
          filtered = filtered.filter(event => {
            const eventDate = new Date(event.date);
            return eventDate.toDateString() === tomorrow.toDateString();
          });
          break;
        case 'week':
          const weekFromNow = new Date(today);
          weekFromNow.setDate(today.getDate() + 7);
          filtered = filtered.filter(event => {
            const eventDate = new Date(event.date);
            return eventDate >= today && eventDate <= weekFromNow;
          });
          break;
        case 'month':
          const monthFromNow = new Date(today);
          monthFromNow.setMonth(today.getMonth() + 1);
          filtered = filtered.filter(event => {
            const eventDate = new Date(event.date);
            return eventDate >= today && eventDate <= monthFromNow;
          });
          break;
        default:
          // Specific date
          filtered = filtered.filter(event => event.date === filters.dateRange);
      }
    }

    if (filters.location) {
      filtered = filtered.filter(event =>
        event.location.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    if (filters.organizer) {
      filtered = filtered.filter(event =>
        event.organizer.name.toLowerCase().includes(filters.organizer.toLowerCase())
      );
    }

    // Sort by date (upcoming first)
    filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    onFilteredEvents(filtered);
  }, [events, searchQuery, filters, onFilteredEvents]);

  const clearSearch = () => {
    setSearchQuery('');
    setFilters({
      dateRange: '',
      location: '',
      organizer: '',
      category: ''
    });
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-6">
      {/* Search Input */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative"
      >
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-12 pr-24 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm"
            onFocus={() => setIsExpanded(true)}
          />

          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
            {searchQuery && (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                onClick={clearSearch}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleFilters}
              className={`p-2 rounded-lg transition-colors ${
                showFilters ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-400'
              }`}
            >
              <Filter className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-4 p-4 bg-white rounded-xl shadow-sm border border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Advanced Filters</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Date Range */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    Date Range
                  </label>
                  <select
                    value={filters.dateRange}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All dates</option>
                    <option value="today">Today</option>
                    <option value="tomorrow">Tomorrow</option>
                    <option value="week">This week</option>
                    <option value="month">This month</option>
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    <MapPin className="w-3 h-3 inline mr-1" />
                    Location
                  </label>
                  <input
                    type="text"
                    value={filters.location}
                    onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="City, venue..."
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Organizer */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    <User className="w-3 h-3 inline mr-1" />
                    Organizer
                  </label>
                  <input
                    type="text"
                    value={filters.organizer}
                    onChange={(e) => setFilters(prev => ({ ...prev, organizer: e.target.value }))}
                    placeholder="Organization name..."
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Category/Type */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    <Building className="w-3 h-3 inline mr-1" />
                    Category
                  </label>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All categories</option>
                    <option value="sports">Sports & Fitness</option>
                    <option value="music">Music & Arts</option>
                    <option value="food">Food & Drink</option>
                    <option value="education">Education</option>
                    <option value="networking">Networking</option>
                    <option value="family">Family Friendly</option>
                    <option value="outdoor">Outdoor Activities</option>
                  </select>
                </div>
              </div>

              {/* Clear Filters */}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={clearSearch}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Results Summary */}
      {searchQuery && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-sm text-gray-600"
        >
          Search results for "{searchQuery}"
        </motion.div>
      )}
    </div>
  );
};