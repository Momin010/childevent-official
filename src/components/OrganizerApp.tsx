import React, { useState, useEffect } from 'react';
import { ResponsiveNavigation } from './ResponsiveNavigation';
import { OrganizerDashboard } from './OrganizerDashboard';
import { ProfileSection } from './ProfileSection';
import { ChatSection } from './ChatSection';
import { LoadingSpinner } from './LoadingSpinner';
import { ToastContainer } from './Toast';
import { useLocation, useNavigate } from 'react-router-dom';
import { getUnreadMessageCount } from '../lib/chat';
import { getCurrentSession, getUserProfile } from '../lib/auth';
import { useAppStore } from '../store/appStore';
import { useToast } from '../hooks/useToast';
import { EventCreationForm } from './EventCreationForm';
import { CalendarSection } from './CalendarSection';
import type { User, Event } from '../types';

interface OrganizerAppProps {
  user?: User;
  onSignOut: () => void;
}

export const OrganizerApp: React.FC<OrganizerAppProps> = ({ user: initialUser, onSignOut }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(initialUser || null);
  const [loading, setLoading] = useState(!initialUser);
  const [showEventForm, setShowEventForm] = useState(false);
  const {
    activeTab,
    setActiveTab,
    unreadMessages,
    setUnreadMessages,
  } = useAppStore();

  // Determine current page from route
  const routeToPageMap = {
    '/orghome': 'home',
    '/orgevents': 'events',
    '/orgcalendar': 'calendar',
    '/orgchat': 'chat',
    '/orgprofile': 'profile'
  };
  const currentPage = routeToPageMap[location.pathname as keyof typeof routeToPageMap] || 'home';

  const { toasts, removeToast } = useToast();

  useEffect(() => {
    if (!user && !loading) {
      loadUser();
    } else if (user) {
      loadUnreadMessages();
    }
  }, [user, loading]);

  const loadUser = async () => {
    try {
      setLoading(true);
      const session = await getCurrentSession();
      if (session?.user) {
        const profile = await getUserProfile(session.user.id);
        if (profile && profile.is_organizer) {
          setUser({
            id: profile.id,
            username: profile.username,
            name: profile.name,
            organizationName: profile.organization_name,
            industry: profile.industry,
            website: profile.website,
            roleInOrganization: profile.role,
            friends: [],
            bookedEvents: [],
            attendedEvents: [],
            bookmarkedEvents: [],
            lovedEvents: [],
            following: [],
            role: 'organizer',
            organizerId: profile.organizer_id,
            lastLogin: new Date().toISOString(),
            theme: 'light',
          });
        }
      }
    } catch (error) {
      console.error('Error loading organizer:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadMessages = async () => {
    try {
      const count = await getUnreadMessageCount(user.id);
      setUnreadMessages(count);
    } catch (error) {
      console.error('Error loading unread messages:', error);
    }
  };

  const handleEventCreated = async (eventData: any) => {
    // TODO: Implement event creation API call
    console.log('Creating event:', eventData);
    // For now, just close the form
    setShowEventForm(false);
  };

  const renderContent = () => {
    if (showEventForm) {
      return (
        <EventCreationForm
          onEventCreated={handleEventCreated}
          onCancel={() => setShowEventForm(false)}
          organizer={{
            id: user?.id || '',
            name: user?.organizationName || user?.name || '',
            profilePicture: user?.profilePicture,
          }}
        />
      );
    }

    switch (currentPage) {
      case 'home':
        return <OrganizerDashboard />;
      case 'events':
        return (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">My Events</h2>
              <button
                onClick={() => setShowEventForm(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center gap-2"
              >
                <span>+</span>
                Create Event
              </button>
            </div>
            <div className="text-center py-12 text-gray-500">
              <p>No events created yet.</p>
              <p className="text-sm mt-2">Click "Create Event" to get started!</p>
            </div>
          </div>
        );
      case 'calendar':
        return (
          <CalendarSection
            events={[]} // TODO: Pass events created by this organizer
            onEventClick={(event) => console.log('Event clicked:', event)}
            userRole="organizer"
          />
        );
      case 'chat':
        return user ? <ChatSection user={user} /> : null;
      case 'profile':
        return (
          <ProfileSection
            user={user}
            bookedEvents={[]} // Organizers might have different event logic
            attendedEvents={[]}
            onUpdateProfile={(updates) => {/* Handle profile updates */}}
            onSignOut={onSignOut}
          />
        );
      default:
        return <OrganizerDashboard />;
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Main Content */}
      <div className="md:ml-16">
        {renderContent()}
      </div>

      <ResponsiveNavigation
        activeTab={currentPage}
        onTabChange={(tab) => {
          const routes = {
            home: '/orghome',
            events: '/orgevents',
            calendar: '/orgcalendar',
            chat: '/orgchat',
            profile: '/orgprofile'
          };
          navigate(routes[tab as keyof typeof routes] || '/orghome');
        }}
        unreadMessages={unreadMessages}
        isOrganizer={true}
      />
    </div>
  );
};