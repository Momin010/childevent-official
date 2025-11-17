# ChildEvent Platform - Database Rebuild & API Integration Implementation Plan

## Executive Summary

This document outlines the comprehensive implementation plan for rebuilding the ChildEvent platform database, implementing an admin event approval system, and integrating the Tampere City Hall events API. The plan covers database schema redesign, backend modifications, frontend updates, and API integration with a focus on clean architecture and maintainable code.

## Current System Analysis

### Database Schema Overview
Based on migration files analysis:

**Existing Tables:**
- `profiles` - User profiles with organizer fields
- `chats` - Chat conversations
- `messages` - Individual messages with encryption
- `friendships` - User relationships
- `friend_requests` - Pending friend requests
- `events` - Event data with organizer relationships
- `event_attendees` - Event signups
- `event_comments` - Event discussions
- `event_likes` - Event likes
- `event_bookmarks` - Saved events

**Current Issues:**
- No event approval workflow
- Events table lacks status management
- Admin functionality is placeholder
- No API integration for external event sources

### Application Architecture

**Frontend Stack:**
- React 18 with TypeScript
- React Router for navigation
- Zustand for state management
- Tailwind CSS for styling
- Framer Motion for animations
- Supabase for backend

**Backend:**
- Supabase PostgreSQL database
- Row Level Security (RLS) policies
- Real-time subscriptions for chat
- File storage for media

**Key Components:**
- `UserApp` - Main user interface
- `OrganizerApp` - Organizer dashboard
- `AdminPanel` - Administrative functions (currently placeholder)
- `EventCard` - Event display component
- `EventFeed` - Event listing

## Phase 1: Database Schema Redesign & Migration

### 1.1 Current Schema Analysis

**Tables to Preserve:**
- `profiles` - Core user data
- `chats`, `messages` - Chat functionality (working well)
- `friendships`, `friend_requests` - Social features

**Tables to Modify:**
- `events` - Add approval status, admin tracking
- `event_attendees`, `event_comments`, `event_likes`, `event_bookmarks` - Update policies

**New Tables:**
- `admin_approvals` - Audit trail for approvals
- `api_imports` - Track external API imports

### 1.2 New Database Schema Design

#### Events Table Enhancement
```sql
ALTER TABLE events ADD COLUMN status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'archived'));
ALTER TABLE events ADD COLUMN approved_by uuid REFERENCES auth.users(id);
ALTER TABLE events ADD COLUMN approved_at timestamp with time zone;
ALTER TABLE events ADD COLUMN imported_from text; -- 'manual', 'tampere_api', etc.
ALTER TABLE events ADD COLUMN external_id text; -- For API tracking
```

#### Admin Approvals Table
```sql
CREATE TABLE admin_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  admin_id uuid REFERENCES auth.users(id) NOT NULL,
  action text NOT NULL CHECK (action IN ('approved', 'denied')),
  reason text,
  created_at timestamp with time zone DEFAULT now()
);
```

#### API Imports Table
```sql
CREATE TABLE api_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL, -- 'tampere_city_hall'
  imported_at timestamp with time zone DEFAULT now(),
  total_events integer DEFAULT 0,
  successful_imports integer DEFAULT 0,
  failed_imports integer DEFAULT 0,
  raw_data jsonb -- Store original API response for debugging
);
```

### 1.3 Migration Strategy

**Step 1: Backup Current Data**
```sql
-- Create backup tables before dropping
CREATE TABLE events_backup AS SELECT * FROM events;
CREATE TABLE profiles_backup AS SELECT * FROM profiles;
-- ... backup all tables
```

**Step 2: Drop Tables in Correct Order**
```sql
-- Drop in reverse dependency order
DROP TABLE IF EXISTS event_bookmarks;
DROP TABLE IF EXISTS event_likes;
DROP TABLE IF EXISTS event_comments;
DROP TABLE IF EXISTS event_attendees;
DROP TABLE IF EXISTS events;
-- Keep chat-related tables
```

**Step 3: Recreate Schema**
- Run all existing migrations in order
- Apply new schema enhancements
- Update RLS policies for approval workflow

**Step 4: Data Migration**
```sql
-- Migrate existing events as 'approved' status
INSERT INTO events (
  id, title, description, image_url, date, time, location,
  category, max_attendees, price, tags, organizer_id,
  created_at, updated_at, status, approved_at
)
SELECT
  id, title, description, image_url, date, time, location,
  category, max_attendees, price, tags, organizer_id,
  created_at, updated_at, 'approved', created_at
FROM events_backup;
```

## Phase 2: Admin Event Approval System

### 2.1 Backend Implementation

#### RLS Policy Updates
```sql
-- Events policies for approval workflow
CREATE POLICY "Users can view approved events" ON events
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Organizers can view their own events" ON events
  FOR SELECT USING (organizer_id = auth.uid());

CREATE POLICY "Admins can view all events" ON events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update event status" ON events
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

#### Admin Functions
```typescript
// lib/admin.ts
export const approveEvent = async (eventId: string, adminId: string, reason?: string) => {
  const { data, error } = await supabase
    .from('events')
    .update({
      status: 'approved',
      approved_by: adminId,
      approved_at: new Date().toISOString()
    })
    .eq('id', eventId)
    .select()
    .single();

  if (error) throw error;

  // Log approval
  await supabase
    .from('admin_approvals')
    .insert({
      event_id: eventId,
      admin_id: adminId,
      action: 'approved',
      reason
    });

  return data;
};

export const denyEvent = async (eventId: string, adminId: string, reason: string) => {
  const { data, error } = await supabase
    .from('events')
    .update({
      status: 'denied',
      approved_by: adminId,
      approved_at: new Date().toISOString()
    })
    .eq('id', eventId)
    .select()
    .single();

  if (error) throw error;

  // Log denial
  await supabase
    .from('admin_approvals')
    .insert({
      event_id: eventId,
      admin_id: adminId,
      action: 'denied',
      reason
    });

  return data;
};

export const getPendingEvents = async () => {
  const { data, error } = await supabase
    .from('events_with_profiles')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};
```

### 2.2 Frontend Admin Panel Implementation

#### AdminPanel Component Redesign
```typescript
// components/AdminPanel.tsx
import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, Filter } from 'lucide-react';
import { getPendingEvents, approveEvent, denyEvent } from '../lib/admin';
import { Event } from '../types';

export const AdminPanel: React.FC = () => {
  const [pendingEvents, setPendingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'denied'>('pending');

  useEffect(() => {
    loadPendingEvents();
  }, []);

  const loadPendingEvents = async () => {
    try {
      const events = await getPendingEvents();
      setPendingEvents(events);
    } catch (error) {
      console.error('Error loading pending events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (eventId: string) => {
    try {
      await approveEvent(eventId, 'admin-user-id'); // Get from auth context
      setPendingEvents(prev => prev.filter(e => e.id !== eventId));
    } catch (error) {
      console.error('Error approving event:', error);
    }
  };

  const handleDeny = async (eventId: string, reason: string) => {
    try {
      await denyEvent(eventId, 'admin-user-id', reason);
      setPendingEvents(prev => prev.filter(e => e.id !== eventId));
    } catch (error) {
      console.error('Error denying event:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Event Moderation</h1>
          <p className="text-gray-600">Review and approve pending events</p>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'pending' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            Pending ({pendingEvents.length})
          </button>
          {/* Other filter buttons */}
        </div>
      </div>

      {/* Events Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        {loading ? (
          <div className="text-center py-12">Loading events...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingEvents.map(event => (
              <EventModerationCard
                key={event.id}
                event={event}
                onApprove={handleApprove}
                onDeny={handleDeny}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
```

#### Event Moderation Card Component
```typescript
interface EventModerationCardProps {
  event: Event;
  onApprove: (eventId: string) => void;
  onDeny: (eventId: string, reason: string) => void;
}

const EventModerationCard: React.FC<EventModerationCardProps> = ({
  event,
  onApprove,
  onDeny
}) => {
  const [denyReason, setDenyReason] = useState('');
  const [showDenyForm, setShowDenyForm] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <img
        src={event.imageUrl}
        alt={event.title}
        className="w-full h-48 object-cover"
      />
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2">{event.title}</h3>
        <p className="text-gray-600 text-sm mb-2">{event.description}</p>
        <div className="text-sm text-gray-500 mb-4">
          <p>Organizer: {event.organizer.name}</p>
          <p>Date: {event.date} at {event.time}</p>
          <p>Location: {event.location}</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onApprove(event.id)}
            className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Approve
          </button>
          <button
            onClick={() => setShowDenyForm(true)}
            className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 flex items-center justify-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            Deny
          </button>
        </div>

        {showDenyForm && (
          <div className="mt-4 p-3 bg-red-50 rounded-lg">
            <textarea
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
              placeholder="Reason for denial..."
              className="w-full p-2 border rounded"
              rows={3}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  onDeny(event.id, denyReason);
                  setShowDenyForm(false);
                  setDenyReason('');
                }}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Confirm Deny
              </button>
              <button
                onClick={() => setShowDenyForm(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
```

## Phase 3: Tampere City Hall API Integration

### 3.1 API Service Implementation

#### API Client Setup
```typescript
// lib/tampereApi.ts
interface TampereEventRaw {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location?: string;
  url?: string;
  imageUrl?: string;
  // Other fields from API
}

interface TampereApiResponse {
  events: TampereEventRaw[];
  total: number;
  // Other metadata
}

class TampereApiClient {
  private baseUrl = 'https://tapahtumat.tampere.fi/api/collection/634844c32f41a024ee51a234/content';
  private cookies = 'id1_634844c32f41a024ee51a234=s%3Afac4ef23db4d771934f13cf3d9d4af8f56fb6b8fe1663244ba15a92adc787302.5Mo44gppIvmO8x6dKxY1gkgKN%2F8ur6ER7dDd7RhTM54; id2_634844c32f41a024ee51a234=s%3A7d98edec2d9539a3061e6702a0a9964fa49b39d24164c2a8604d6a5a5858a814.SsRqlkNhGDc89giQIUeXYXJXFdsrTodOi4v0X5PHxF4';

  async fetchEvents(limit: number = 20): Promise<TampereApiResponse> {
    const params = new URLSearchParams({
      areas: '',
      country: 'FI',
      hashtagsForContentSelection: '',
      lang: 'fi',
      mode: 'event',
      sort: 'countViews',
      strictLang: 'true'
    });

    const url = `${this.baseUrl}?${params}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'en-US,en;q=0.9',
        'priority': 'u=1, i',
        'referer': 'https://tapahtumat.tampere.fi/fi-FI',
        'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
      },
      // Note: Cookies are handled via headers in this implementation
      // In production, consider using a proxy or proper cookie handling
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      events: data.events?.slice(0, limit) || [],
      total: data.total || 0
    };
  }
}

export const tampereApi = new TampereApiClient();
```

### 3.2 Data Parser Implementation

#### Event Parser Class
```typescript
// lib/tampereParser.ts
import { Event } from '../types';

interface ParsedEvent {
  title: string;
  description: string;
  startDate: Date;
  endDate?: Date;
  location: string;
  url?: string;
  imageUrl: string;
  externalId: string;
}

class TampereEventParser {
  parse(rawEvent: TampereEventRaw): ParsedEvent | null {
    try {
      // Extract title
      const title = this.extractTitle(rawEvent);
      if (!title) return null;

      // Extract dates
      const startDate = this.parseDate(rawEvent.startDate);
      const endDate = rawEvent.endDate ? this.parseDate(rawEvent.endDate) : undefined;

      // Extract location
      const location = this.extractLocation(rawEvent);

      // Extract description
      const description = this.extractDescription(rawEvent);

      // Extract URL
      const url = this.extractUrl(rawEvent);

      // Generate image URL (fallback to default)
      const imageUrl = this.extractImageUrl(rawEvent);

      return {
        title,
        description,
        startDate,
        endDate,
        location,
        url,
        imageUrl,
        externalId: rawEvent.id
      };
    } catch (error) {
      console.error('Error parsing event:', rawEvent, error);
      return null;
    }
  }

  private extractTitle(event: TampereEventRaw): string | null {
    // Try different title fields
    return event.title?.trim() ||
           event.name?.trim() ||
           event.eventTitle?.trim() ||
           null;
  }

  private parseDate(dateStr: string): Date | null {
    try {
      // Handle various date formats from API
      // Example: "2025-10-23T21:00:00.000Z"
      if (dateStr.includes('T')) {
        return new Date(dateStr);
      }

      // Handle other formats as needed
      return new Date(dateStr);
    } catch (error) {
      console.error('Error parsing date:', dateStr);
      return null;
    }
  }

  private extractLocation(event: TampereEventRaw): string {
    // Try different location fields
    const location = event.location ||
                    event.venue ||
                    event.address ||
                    event.place;

    return location || 'Tampere, Finland'; // Default fallback
  }

  private extractDescription(event: TampereEventRaw): string {
    // Combine various description fields
    const descriptions = [
      event.description,
      event.summary,
      event.details,
      event.content
    ].filter(Boolean);

    return descriptions.join(' ').trim() || 'Event description not available';
  }

  private extractUrl(event: TampereEventRaw): string | undefined {
    return event.url || event.website || event.link;
  }

  private extractImageUrl(event: TampereEventRaw): string {
    // Use provided image or fallback
    return event.imageUrl ||
           event.image ||
           event.photo ||
           'https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=1000'; // Default event image
  }

  parseMultiple(rawEvents: TampereEventRaw[]): ParsedEvent[] {
    return rawEvents
      .map(event => this.parse(event))
      .filter((event): event is ParsedEvent => event !== null);
  }
}

export const tampereParser = new TampereEventParser();
```

### 3.3 Import Service Implementation

#### Admin Import Functions
```typescript
// lib/adminImport.ts
import { tampereApi } from './tampereApi';
import { tampereParser } from './tampereParser';
import { supabase } from './supabase';
import { Event } from '../types';

interface ImportResult {
  totalFetched: number;
  successfullyParsed: number;
  successfullyImported: number;
  failedImports: number;
  errors: string[];
}

export const importTampereEvents = async (adminId: string): Promise<ImportResult> => {
  const result: ImportResult = {
    totalFetched: 0,
    successfullyParsed: 0,
    successfullyImported: 0,
    failedImports: 0,
    errors: []
  };

  try {
    // Fetch events from API
    const apiResponse = await tampereApi.fetchEvents(20);
    result.totalFetched = apiResponse.events.length;

    // Parse events
    const parsedEvents = tampereParser.parseMultiple(apiResponse.events);
    result.successfullyParsed = parsedEvents.length;

    // Create import log
    const { data: importLog, error: logError } = await supabase
      .from('api_imports')
      .insert({
        source: 'tampere_city_hall',
        total_events: result.totalFetched,
        raw_data: apiResponse
      })
      .select()
      .single();

    if (logError) throw logError;

    // Import each parsed event
    for (const parsedEvent of parsedEvents) {
      try {
        // Check if event already exists
        const { data: existingEvent } = await supabase
          .from('events')
          .select('id')
          .eq('external_id', parsedEvent.externalId)
          .eq('imported_from', 'tampere_api')
          .maybeSingle();

        if (existingEvent) {
          // Skip duplicate
          continue;
        }

        // Create event record
        const eventData = {
          title: parsedEvent.title,
          description: parsedEvent.description,
          image_url: parsedEvent.imageUrl,
          date: parsedEvent.startDate.toISOString().split('T')[0], // YYYY-MM-DD
          time: parsedEvent.startDate.toTimeString().split(' ')[0], // HH:MM:SS
          location: parsedEvent.location,
          category: 'External Event',
          max_attendees: null,
          price: 0,
          tags: ['tampere', 'city-event'],
          organizer_id: adminId, // Use admin as organizer for imported events
          status: 'pending',
          imported_from: 'tampere_api',
          external_id: parsedEvent.externalId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: insertError } = await supabase
          .from('events')
          .insert(eventData);

        if (insertError) throw insertError;

        result.successfullyImported++;
      } catch (error) {
        console.error('Error importing event:', parsedEvent, error);
        result.errors.push(`Failed to import "${parsedEvent.title}": ${error}`);
        result.failedImports++;
      }
    }

    // Update import log with results
    await supabase
      .from('api_imports')
      .update({
        successful_imports: result.successfullyImported,
        failed_imports: result.failedImports
      })
      .eq('id', importLog.id);

  } catch (error) {
    console.error('Error during import:', error);
    result.errors.push(`Import failed: ${error}`);
  }

  return result;
};
```

### 3.4 Admin Import UI

#### Import Component
```typescript
// components/AdminEventImport.tsx
import React, { useState } from 'react';
import { Download, AlertCircle, CheckCircle } from 'lucide-react';
import { importTampereEvents } from '../lib/adminImport';

export const AdminEventImport: React.FC = () => {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleImport = async () => {
    setImporting(true);
    try {
      const importResult = await importTampereEvents('admin-user-id'); // Get from auth
      setResult(importResult);
    } catch (error) {
      console.error('Import error:', error);
      setResult({
        totalFetched: 0,
        successfullyParsed: 0,
        successfullyImported: 0,
        failedImports: 0,
        errors: [`Import failed: ${error}`]
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Import Events from Tampere City Hall</h3>
          <p className="text-gray-600 text-sm">
            Fetch and import up to 20 events from the official Tampere events API
          </p>
        </div>
        <button
          onClick={handleImport}
          disabled={importing}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          {importing ? 'Importing...' : 'Import Events'}
        </button>
      </div>

      {result && (
        <div className="border-t pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{result.totalFetched}</div>
              <div className="text-sm text-gray-600">Fetched</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{result.successfullyParsed}</div>
              <div className="text-sm text-gray-600">Parsed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{result.successfullyImported}</div>
              <div className="text-sm text-gray-600">Imported</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{result.failedImports}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <span className="font-medium text-red-800">Import Errors</span>
              </div>
              <ul className="text-sm text-red-700 space-y-1">
                {result.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {result.successfullyImported > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                <span className="font-medium text-green-800">
                  Successfully imported {result.successfullyImported} events!
                  They are now pending admin approval.
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

## Phase 4: Type System Updates

### 4.1 Event Type Extensions

```typescript
// types.ts
export interface Event {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  date: string;
  time: string;
  location: string;
  organizer: {
    name: string;
    id: string;
    profilePicture?: string;
    followers: number;
    events: number;
  };
  interestedCount: number;
  goingCount: number;
  likes: number;
  comments: Comment[];
  attendees: {
    userId: string;
    name: string;
    profilePicture?: string;
  }[];
  isBookmarked?: boolean;
  isLoved?: boolean;
  clicks: number;
  createdAt: string;
  // New approval fields
  status?: 'pending' | 'approved' | 'denied' | 'archived';
  approvedBy?: string;
  approvedAt?: string;
  importedFrom?: string;
  externalId?: string;
}

export interface AdminApproval {
  id: string;
  eventId: string;
  adminId: string;
  action: 'approved' | 'denied';
  reason?: string;
  createdAt: string;
}

export interface ApiImport {
  id: string;
  source: string;
  importedAt: string;
  totalEvents: number;
  successfulImports: number;
  failedImports: number;
  rawData?: any;
}
```

### 4.2 Admin Store Updates

```typescript
// store/adminStore.ts
import { create } from 'zustand';
import { Event, AdminApproval, ApiImport } from '../types';

interface AdminState {
  pendingEvents: Event[];
  approvals: AdminApproval[];
  imports: ApiImport[];
  loading: boolean;
  error: string | null;

  // Actions
  setPendingEvents: (events: Event[]) => void;
  setApprovals: (approvals: AdminApproval[]) => void;
  setImports: (imports: ApiImport[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Admin actions
  approveEvent: (eventId: string, reason?: string) => Promise<void>;
  denyEvent: (eventId: string, reason: string) => Promise<void>;
  importEvents: () => Promise<void>;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  pendingEvents: [],
  approvals: [],
  imports: [],
  loading: false,
  error: null,

  setPendingEvents: (pendingEvents) => set({ pendingEvents }),
  setApprovals: (approvals) => set({ approvals }),
  setImports: (imports) => set({ imports }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  approveEvent: async (eventId: string, reason?: string) => {
    try {
      set({ loading: true });
      // Implementation in next section
    } catch (error) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  denyEvent: async (eventId: string, reason: string) => {
    // Implementation
  },

  importEvents: async () => {
    // Implementation
  }
}));
```

## Phase 5: Testing & Quality Assurance

### 5.1 Unit Tests

#### Parser Tests
```typescript
// tests/tampereParser.test.ts
import { tampereParser } from '../lib/tampereParser';

describe('TampereEventParser', () => {
  it('should parse valid event data', () => {
    const rawEvent = {
      id: '123',
      title: 'Test Event',
      description: 'A test event',
      startDate: '2025-10-23T21:00:00.000Z',
      location: 'Test Venue',
      url: 'https://example.com'
    };

    const parsed = tampereParser.parse(rawEvent);

    expect(parsed).toEqual({
      title: 'Test Event',
      description: 'A test event',
      startDate: new Date('2025-10-23T21:00:00.000Z'),
      location: 'Test Venue',
      url: 'https://example.com',
      imageUrl: expect.any(String),
      externalId: '123'
    });
  });

  it('should handle missing fields gracefully', () => {
    const rawEvent = {
      id: '123',
      title: 'Test Event'
    };

    const parsed = tampereParser.parse(rawEvent);

    expect(parsed?.title).toBe('Test Event');
    expect(parsed?.location).toBe('Tampere, Finland');
    expect(parsed?.description).toBe('Event description not available');
  });

  it('should return null for invalid events', () => {
    const rawEvent = {
      id: '123'
      // Missing title
    };

    const parsed = tampereParser.parse(rawEvent);
    expect(parsed).toBeNull();
  });
});
```

#### Admin Function Tests
```typescript
// tests/admin.test.ts
import { approveEvent, denyEvent } from '../lib/admin';

describe('Admin Functions', () => {
  it('should approve an event', async () => {
    const eventId = 'test-event-id';
    const adminId = 'admin-id';

    const result = await approveEvent(eventId, adminId, 'Looks good!');

    expect(result.status).toBe('approved');
    expect(result.approved_by).toBe(adminId);
    expect(result.approved_at).toBeDefined();
  });

  it('should deny an event with reason', async () => {
    const eventId = 'test-event-id';
    const adminId = 'admin-id';
    const reason = 'Inappropriate content';

    const result = await denyEvent(eventId, adminId, reason);

    expect(result.status).toBe('denied');
    expect(result.approved_by).toBe(adminId);
  });
});
```

### 5.2 Integration Tests

#### API Integration Test
```typescript
// tests/apiIntegration.test.ts
import { tampereApi } from '../lib/tampereApi';
import { importTampereEvents } from '../lib/adminImport';

describe('API Integration', () => {
  it('should fetch events from Tampere API', async () => {
    const response = await tampereApi.fetchEvents(5);

    expect(response.events).toBeDefined();
    expect(Array.isArray(response.events)).toBe(true);
    expect(response.events.length).toBeLessThanOrEqual(5);
  });

  it('should import events successfully', async () => {
    const result = await importTampereEvents('admin-id');

    expect(result.totalFetched).toBeGreaterThan(0);
    expect(result.successfullyParsed).toBeGreaterThan(0);
    expect(result.errors).toBeDefined();
  });
});
```

### 5.3 End-to-End Testing

#### Complete Workflow Test
```typescript
// tests/e2e/workflow.test.ts
describe('Complete Event Approval Workflow', () => {
  it('should import, approve, and display events', async () => {
    // 1. Import events from API
    const importResult = await importTampereEvents('admin-id');
    expect(importResult.successfullyImported).toBeGreaterThan(0);

    // 2. Get pending events
    const pendingEvents = await getPendingEvents();
    expect(pendingEvents.length).toBeGreaterThan(0);

    // 3. Approve an event
    const eventToApprove = pendingEvents[0];
    await approveEvent(eventToApprove.id, 'admin-id');

    // 4. Verify event is now approved
    const approvedEvent = await getEventById(eventToApprove.id);
    expect(approvedEvent.status).toBe('approved');

    // 5. Verify approved event appears in public feed
    const publicEvents = await getEvents();
    const foundEvent = publicEvents.find(e => e.id === eventToApprove.id);
    expect(foundEvent).toBeDefined();
    expect(foundEvent?.status).toBe('approved');
  });
});
```

## Phase 6: Deployment & Monitoring

### 6.1 Database Migration Deployment

**Pre-deployment Checklist:**
- [ ] Backup production database
- [ ] Test migration on staging environment
- [ ] Verify all existing data is preserved
- [ ] Test RLS policies work correctly
- [ ] Confirm admin access to new tables

**Migration Script:**
```bash
# Run migration
supabase db push

# Verify schema
supabase db diff

# Seed initial admin user if needed
supabase db reset --linked
```

### 6.2 Application Deployment

**Build Process:**
```bash
# Install dependencies
npm ci

# Run tests
npm test

# Build production bundle
npm run build

# Deploy to hosting platform
npm run deploy
```

### 6.3 Monitoring Setup

#### Error Tracking
```typescript
// lib/errorTracking.ts
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

#### Analytics
```typescript
// lib/analytics.ts
import { Analytics } from '@vercel/analytics/react';

export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  // Track admin actions
  if (eventName.startsWith('admin_')) {
    console.log('Admin action:', eventName, properties);
    // Send to analytics service
  }
};
```

### 6.4 Performance Monitoring

**Database Performance:**
- Monitor query execution times
- Set up alerts for slow queries
- Track API import performance

**Application Performance:**
- Monitor page load times
- Track API response times
- Set up error boundaries and reporting

## Phase 7: Documentation & Training

### 7.1 Admin User Guide

**Event Moderation Process:**
1. Log in to admin panel
2. Review pending events
3. Click "Approve" or "Deny" with reason
4. Monitor approval metrics

**API Import Process:**
1. Navigate to "Import Events" section
2. Click "Import from Tampere API"
3. Review import results
4. Moderate imported events

### 7.2 Developer Documentation

**API Integration:**
- Document Tampere API endpoints
- Provide parser customization guide
- Include error handling patterns

**Database Schema:**
- Document all table relationships
- Explain RLS policies
- Provide migration examples

## Risk Assessment & Mitigation

### Technical Risks

**API Dependency:**
- Risk: Tampere API changes or becomes unavailable
- Mitigation: Implement caching, fallback to manual entry, monitor API health

**Data Quality:**
- Risk: Imported events have poor quality data
- Mitigation: Implement data validation, admin review process, quality scoring

**Performance:**
- Risk: Large event imports slow down the system
- Mitigation: Implement pagination, background processing, rate limiting

### Business Risks

**Content Moderation:**
- Risk: Inappropriate content gets approved
- Mitigation: Implement content filters, admin training, appeal process

**Data Privacy:**
- Risk: External API data contains sensitive information
- Mitigation: Review data handling, implement data sanitization, GDPR compliance

## Success Metrics

### Key Performance Indicators

**Admin Efficiency:**
- Average time to review an event
- Approval/denial ratio
- Number of events processed per day

**API Integration:**
- Import success rate
- Data quality score
- Time to import events

**User Experience:**
- Number of events from external sources
- User engagement with imported events
- System uptime and performance

### Monitoring Dashboard

**Admin Dashboard Metrics:**
- Pending events queue length
- Approval processing time
- Import success rates
- Error rates and types

**System Health:**
- API response times
- Database query performance
- Error rates
- User activity metrics

## Conclusion

This implementation plan provides a comprehensive roadmap for rebuilding the ChildEvent platform database, implementing admin event approval functionality, and integrating the Tampere City Hall events API. The phased approach ensures minimal disruption to existing functionality while adding powerful new capabilities.

Key benefits of this implementation:
- Clean, maintainable database schema
- Robust admin moderation system
- Automated event import from trusted sources
- Enhanced data quality and user experience
- Scalable architecture for future growth

The plan includes thorough testing, monitoring, and documentation to ensure successful deployment and long-term maintainability.