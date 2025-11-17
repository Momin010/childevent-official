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
import { createEvent, getOrganizerEvents } from '../lib/events';
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
  const [organizerEvents, setOrganizerEvents] = useState<Event[]>([]);
  const {
    activeTab,
    setActiveTab,
    unreadMessages,
    setUnreadMessages,
  } = useAppStore();

  // Determine current page from route
  const pathParts = location.pathname.split('/');
  const lastPath = pathParts[pathParts.length - 1] || 'home';
  const currentPage = ['home', 'events', 'calendar', 'chat', 'profile'].includes(lastPath) ? lastPath : 'home';

  const { toasts, removeToast } = useToast();

  useEffect(() => {
    if (!user && !loading) {
      loadUser();
    } else if (user) {
      loadUnreadMessages();
      loadOrganizerEvents();
    }
  }, [user, loading]);

  const loadUser = async () => {
    try {
      setLoading(true);
      console.log('OrganizerApp loadUser - starting');
      const session = await getCurrentSession();
      console.log('OrganizerApp loadUser - session:', session);

      if (session?.user) {
        const profile = await getUserProfile(session.user.id);
        console.log('OrganizerApp loadUser - profile:', profile);

        if (profile && profile.is_organizer) {
          const userData = {
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
          };

          console.log('OrganizerApp loadUser - setting user:', userData);
          setUser(userData);
        } else {
          console.log('OrganizerApp loadUser - not an organizer or no profile');
          // Not an organizer, redirect to login
          navigate('/orglogin');
        }
      } else {
        console.log('OrganizerApp loadUser - no session');
        // No session, redirect to login
        navigate('/orglogin');
      }
    } catch (error) {
      console.error('Error loading organizer:', error);
      navigate('/orglogin');
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

  const loadOrganizerEvents = async () => {
    if (!user) return;
    try {
      const events = await getOrganizerEvents(user.id);
      setOrganizerEvents(events);
    } catch (error) {
      console.error('Error loading organizer events:', error);
    }
  };

  const handleEventCreated = async (eventData: any) => {
    if (!user) return;

    try {
      const newEvent = await createEvent({
        ...eventData,
        organizerId: user.id,
      });

      // Add the new event to the list
      setOrganizerEvents(prev => [newEvent, ...prev]);

      // Close the form
      setShowEventForm(false);
    } catch (error) {
      console.error('Error creating event:', error);
      throw error; // Let the form handle the error display
    }
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
        return (
          <OrganizerDashboard
            events={organizerEvents}
            onCreateEvent={() => setShowEventForm(true)}
          />
        );
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
            {organizerEvents.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No events created yet.</p>
                <p className="text-sm mt-2">Click "Create Event" to get started!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {organizerEvents.map(event => (
                  <div key={event.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                    <img
                      src={event.imageUrl}
                      alt={event.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2">{event.title}</h3>
                      <p className="text-gray-600 text-sm mb-2">{event.description}</p>
                      <div className="flex items-center text-sm text-gray-500 mb-2">
                        <span>{event.date} at {event.time}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <span>{event.location}</span>
                      </div>
                      <div className="mt-3 flex justify-between items-center">
                        <span className="text-sm text-gray-500">
                          {event.goingCount} attending
                        </span>
                        <span className="text-sm font-medium text-blue-600">
                          ${event.price || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'calendar':
        return (
          <CalendarSection
            events={organizerEvents}
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
            home: '/org/home',
            events: '/org/events',
            calendar: '/org/calendar',
            chat: '/org/chat',
            profile: '/org/profile'
          };
          navigate(routes[tab as keyof typeof routes] || '/org/home');
        }}
        unreadMessages={unreadMessages}
        isOrganizer={true}
      />
    </div>
  );
};