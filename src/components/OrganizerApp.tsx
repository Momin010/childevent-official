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
import type { User } from '../types';

interface OrganizerAppProps {
  user?: User;
  onSignOut: () => void;
}

export const OrganizerApp: React.FC<OrganizerAppProps> = ({ user: initialUser, onSignOut }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(initialUser || null);
  const [loading, setLoading] = useState(!initialUser);
  const {
    activeTab,
    setActiveTab,
    unreadMessages,
    setUnreadMessages,
  } = useAppStore();

  // Determine current page from route
  const currentPage = location.pathname.replace('/org', '') || 'home';

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

  const renderContent = () => {
    switch (currentPage) {
      case 'home':
        return <OrganizerDashboard />;
      case 'events':
        return <div className="p-6"><h2 className="text-2xl font-bold mb-4">My Events</h2><p>Event management coming soon...</p></div>;
      case 'calendar':
        return <div className="p-6"><h2 className="text-2xl font-bold mb-4">Event Calendar</h2><p>Calendar view coming soon...</p></div>;
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
          navigate(`/org${tab === 'home' ? '' : tab}`);
        }}
        unreadMessages={unreadMessages}
        isOrganizer={true}
      />
    </div>
  );
};