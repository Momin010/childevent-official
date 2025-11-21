import React, { useState } from 'react';
import { Upload, CheckCircle, XCircle, AlertTriangle, Database, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { createEvent } from '../lib/events';
import type { Event } from '../types';

interface EventPreview extends Partial<Event> {
  validationErrors?: string[];
  isValid?: boolean;
}

export const AdminEventHub: React.FC = () => {
  const [jsonInput, setJsonInput] = useState('');
  const [parsedEvents, setParsedEvents] = useState<EventPreview[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [creationResults, setCreationResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  const validateEvent = (event: any): EventPreview => {
    const errors: string[] = [];
    const validatedEvent: EventPreview = { ...event };

    // Required fields validation
    if (!event.title || typeof event.title !== 'string') {
      errors.push('Title is required and must be a string');
    }

    if (!event.description || typeof event.description !== 'string') {
      errors.push('Description is required and must be a string');
    }

    if (!event.date || typeof event.date !== 'string') {
      errors.push('Date is required and must be a string (ISO format recommended)');
    } else {
      // Try to parse date
      const date = new Date(event.date);
      if (isNaN(date.getTime())) {
        errors.push('Date must be a valid date string');
      }
    }

    if (!event.time || typeof event.time !== 'string') {
      errors.push('Time is required and must be a string');
    }

    if (!event.location || typeof event.location !== 'string') {
      errors.push('Location is required and must be a string');
    }

    if (!event.imageUrl || typeof event.imageUrl !== 'string') {
      errors.push('Image URL is required and must be a string');
    }

    // Organizer validation
    if (!event.organizer || typeof event.organizer !== 'object') {
      errors.push('Organizer is required and must be an object');
    } else {
      if (!event.organizer.name || typeof event.organizer.name !== 'string') {
        errors.push('Organizer name is required');
      }
      if (!event.organizer.id || typeof event.organizer.id !== 'string') {
        errors.push('Organizer ID is required');
      }
    }

    // Optional numeric fields with defaults
    validatedEvent.interestedCount = typeof event.interestedCount === 'number' ? event.interestedCount : 0;
    validatedEvent.goingCount = typeof event.goingCount === 'number' ? event.goingCount : 0;
    validatedEvent.likes = typeof event.likes === 'number' ? event.likes : 0;
    validatedEvent.clicks = typeof event.clicks === 'number' ? event.clicks : 0;

    validatedEvent.comments = Array.isArray(event.comments) ? event.comments : [];
    validatedEvent.attendees = Array.isArray(event.attendees) ? event.attendees : [];

    validatedEvent.validationErrors = errors;
    validatedEvent.isValid = errors.length === 0;

    return validatedEvent;
  };

  const handleValidateJson = () => {
    setIsValidating(true);
    setValidationMessage('');
    setParsedEvents([]);

    try {
      const parsed = JSON.parse(jsonInput);

      if (!Array.isArray(parsed)) {
        setValidationMessage('❌ JSON must be an array of events');
        setIsValidating(false);
        return;
      }

      if (parsed.length === 0) {
        setValidationMessage('⚠️ Array is empty');
        setIsValidating(false);
        return;
      }

      const validatedEvents = parsed.map(validateEvent);
      setParsedEvents(validatedEvents);

      const validCount = validatedEvents.filter(e => e.isValid).length;
      const invalidCount = validatedEvents.length - validCount;

      if (invalidCount === 0) {
        setValidationMessage(`✅ All ${validCount} events are valid and ready for import!`);
      } else if (validCount === 0) {
        setValidationMessage(`❌ All ${invalidCount} events have validation errors`);
      } else {
        setValidationMessage(`⚠️ ${validCount} valid, ${invalidCount} invalid events. Fix errors before importing.`);
      }

    } catch (error) {
      setValidationMessage('❌ Invalid JSON format');
    }

    setIsValidating(false);
  };

  const handleCreateEvents = async () => {
    const validEvents = parsedEvents.filter(e => e.isValid);
    if (validEvents.length === 0) return;

    setIsCreating(true);
    setCreationResults(null);

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const event of validEvents) {
      try {
        // For admin-created events, use the organizer ID from JSON if it exists,
        // otherwise use the admin's own ID as organizer
        let organizerId = event.organizer!.id;

        // Check if the organizer exists in profiles, if not, use admin's ID
        try {
          const { data: organizerProfile, error: orgCheckError } = await import('../lib/supabase').then(m => m.supabase)
            .from('profiles')
            .select('id')
            .eq('id', organizerId)
            .single();

          if (orgCheckError || !organizerProfile) {
            // Organizer doesn't exist, use admin's ID instead
            const { data: { user } } = await import('../lib/supabase').then(m => m.supabase.auth.getUser());
            organizerId = user?.id || organizerId;
          }
        } catch (checkError) {
          // If check fails, use admin's ID
          const { data: { user } } = await import('../lib/supabase').then(m => m.supabase.auth.getUser());
          organizerId = user?.id || organizerId;
        }

        // Transform event data to match createEvent expectations
        const eventData = {
          title: event.title!,
          description: event.description!,
          imageUrl: event.imageUrl!,
          date: event.date!,
          time: event.time!,
          location: event.location!,
          category: 'General', // Default category
          maxAttendees: 100, // Default max attendees
          price: 0, // Default free event
          tags: [], // Default empty tags
          organizerId: organizerId,
        };

        await createEvent(eventData);
        successCount++;
      } catch (error: any) {
        failedCount++;
        errors.push(`${event.title}: ${error.message}`);
      }
    }

    setCreationResults({ success: successCount, failed: failedCount, errors });
    setIsCreating(false);

    // Clear successful events from preview
    if (successCount > 0) {
      setParsedEvents(prev => prev.filter(e => !e.isValid));
    }
  };

  const clearAll = () => {
    setJsonInput('');
    setParsedEvents([]);
    setValidationMessage('');
    setCreationResults(null);
  };

  const validEventsCount = parsedEvents.filter(e => e.isValid).length;
  const invalidEventsCount = parsedEvents.filter(e => !e.isValid).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Database className="w-6 h-6 text-blue-600 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Event Hub</h3>
            <p className="text-sm text-gray-500">Import events from JSON data</p>
          </div>
        </div>
        <button
          onClick={clearAll}
          className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Clear All
        </button>
      </div>

      {/* JSON Input */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">JSON Event Data</h4>
            <div className="flex space-x-2">
              <button
                onClick={handleValidateJson}
                disabled={!jsonInput.trim() || isValidating}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <FileText className="w-4 h-4 mr-1" />
                {isValidating ? 'Validating...' : 'Validate'}
              </button>
            </div>
          </div>
        </div>
        <div className="p-4">
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder={`Paste your events JSON here. Example format:

[
  {
    "title": "Summer Music Festival",
    "description": "A fantastic outdoor music event",
    "date": "2025-07-15",
    "time": "18:00",
    "location": "Central Park, New York",
    "imageUrl": "https://example.com/image.jpg",
    "organizer": {
      "name": "Music Events Inc",
      "id": "org-123",
      "followers": 1500,
      "events": 25
    },
    "interestedCount": 120,
    "goingCount": 85,
    "likes": 200,
    "clicks": 500
  }
]`}
            className="w-full h-64 p-3 border border-gray-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Validation Message */}
      {validationMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg ${
            validationMessage.includes('✅')
              ? 'bg-green-50 border border-green-200 text-green-800'
              : validationMessage.includes('❌') || validationMessage.includes('⚠️')
              ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
              : 'bg-blue-50 border border-blue-200 text-blue-800'
          }`}
        >
          {validationMessage}
        </motion.div>
      )}

      {/* Event Preview */}
      {parsedEvents.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h4 className="text-sm font-medium text-gray-900">Event Preview</h4>
                <div className="flex items-center space-x-4 text-xs">
                  <span className="flex items-center text-green-600">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    {validEventsCount} Valid
                  </span>
                  {invalidEventsCount > 0 && (
                    <span className="flex items-center text-red-600">
                      <XCircle className="w-4 h-4 mr-1" />
                      {invalidEventsCount} Invalid
                    </span>
                  )}
                </div>
              </div>
              {validEventsCount > 0 && (
                <button
                  onClick={handleCreateEvents}
                  disabled={isCreating}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isCreating ? 'Creating...' : `Create ${validEventsCount} Events`}
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {parsedEvents.map((event, index) => (
              <div key={index} className={`p-4 border-b border-gray-100 ${!event.isValid ? 'bg-red-50' : 'bg-green-50'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      {event.isValid ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <h5 className="font-medium text-gray-900">{event.title || 'Untitled Event'}</h5>
                    </div>

                    {event.date && event.time && (
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(event.date).toLocaleDateString()} at {event.time}
                      </p>
                    )}

                    {event.location && (
                      <p className="text-sm text-gray-600">{event.location}</p>
                    )}

                    {event.organizer?.name && (
                      <p className="text-sm text-gray-600">By: {event.organizer.name}</p>
                    )}
                  </div>

                  {!event.isValid && event.validationErrors && (
                    <div className="ml-4">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <div className="mt-2 space-y-1">
                        {event.validationErrors.map((error, errorIndex) => (
                          <p key={errorIndex} className="text-xs text-red-600">{error}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Creation Results */}
      {creationResults && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
        >
          <h4 className="text-sm font-medium text-gray-900 mb-3">Import Results</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-600">✅ Successfully created: {creationResults.success}</span>
            </div>
            {creationResults.failed > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-red-600">❌ Failed: {creationResults.failed}</span>
              </div>
            )}
            {creationResults.errors.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-medium text-gray-900 mb-2">Error Details:</p>
                <div className="bg-red-50 border border-red-200 rounded p-3 max-h-32 overflow-y-auto">
                  {creationResults.errors.map((error, index) => (
                    <p key={index} className="text-xs text-red-700">{error}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};