import React, { useState, useEffect } from 'react';
import { ResponsiveNavigation } from './ResponsiveNavigation';
import { EventFeed } from './EventFeed';
import { CalendarSection } from './CalendarSection';
import { ProfileSection } from './ProfileSection';
import { ChatSection } from './ChatSection';
import { EventDetailsModal } from './EventDetailsModal';
import { ShareModal } from './ShareModal';
import { OrganizerProfile } from './OrganizerProfile';
import { LoadingSpinner } from './LoadingSpinner';
import { ToastContainer } from './Toast';
import { getUnreadMessageCount } from '../lib/chat';
import { getEvents, getUserBookmarkedEvents, getUserLikedEvents, getUserAttendingEvents, toggleEventBookmark, toggleEventLike, signUpForEvent, incrementEventClicks } from '../lib/events';
import { getCurrentSession, getUserProfile } from '../lib/auth';
import { useAppStore } from '../store/appStore';
import { useToast } from '../hooks/useToast';
import type { User, Event } from '../types';

interface UserAppProps {
  user?: User;
  onSignOut: () => void;
}

export const UserApp: React.FC<UserAppProps> = ({ user: initialUser, onSignOut }) => {
  const [user, setUser] = useState<User | null>(initialUser || null);
  const [loading, setLoading] = useState(!initialUser);
  const {
    activeTab,
    setActiveTab,
    unreadMessages,
    setUnreadMessages,
  } = useAppStore();

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedOrganizer, setSelectedOrganizer] = useState<string | null>(null);
  const { toasts, removeToast } = useToast();

  // Initialize with empty events array - will be loaded from database
  const [events, setEvents] = useState<Event[]>([]);
  const [userBookmarks, setUserBookmarks] = useState<string[]>([]);
  const [userLikes, setUserLikes] = useState<string[]>([]);
  const [userAttending, setUserAttending] = useState<string[]>([]);

  useEffect(() => {
    if (!user && !loading) {
      loadUser();
    } else if (user) {
      loadUnreadMessages();
      loadEvents();
      loadUserEventData();
    }
  }, [user, loading]);

  const loadUser = async () => {
    try {
      setLoading(true);
      const session = await getCurrentSession();
      if (session?.user) {
        const profile = await getUserProfile(session.user.id);
        if (profile && !profile.is_organizer) {
          setUser({
            id: profile.id,
            username: profile.username,
            name: profile.name,
            age: profile.age,
            isParent: profile.is_parent,
            numberOfChildren: profile.number_of_children,
            hobbies: profile.hobbies,
            profilePicture: profile.profile_picture,
            coverPhoto: profile.cover_photo,
            bio: profile.bio,
            friends: [],
            bookedEvents: [],
            attendedEvents: [],
            bookmarkedEvents: [],
            lovedEvents: [],
            following: [],
            role: 'user',
            lastLogin: new Date().toISOString(),
            theme: 'light',
          });
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
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

  const loadEvents = async () => {
    try {
      const eventsData = await getEvents();
      setEvents(eventsData);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const loadUserEventData = async () => {
    try {
      const [bookmarks, likes, attending] = await Promise.all([
        getUserBookmarkedEvents(user.id),
        getUserLikedEvents(user.id),
        getUserAttendingEvents(user.id)
      ]);

      setUserBookmarks(bookmarks);
      setUserLikes(likes);
      setUserAttending(attending);
    } catch (error) {
      console.error('Error loading user event data:', error);
    }
  };

  const handleEventClick = async (event: Event) => {
    // Increment click count
    await incrementEventClicks(event.id);

    setSelectedEvent(event);
    setIsEventModalOpen(true);
  };

  const handleShare = (event: Event) => {
    setSelectedEvent(event);
    setIsShareModalOpen(true);
  };

  const handleBookmark = async (eventId: string) => {
    try {
      const isBookmarked = await toggleEventBookmark(eventId, user.id);
      if (isBookmarked) {
        setUserBookmarks(prev => [...prev, eventId]);
      } else {
        setUserBookmarks(prev => prev.filter(id => id !== eventId));
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  const handleLike = async (eventId: string) => {
    try {
      const isLiked = await toggleEventLike(eventId, user.id);
      if (isLiked) {
        setUserLikes(prev => [...prev, eventId]);
      } else {
        setUserLikes(prev => prev.filter(id => id !== eventId));
      }
      // Reload events to get updated like counts
      await loadEvents();
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleSignUpForEvent = async (eventId: string) => {
    try {
      await signUpForEvent(eventId, user.id);
      setUserAttending(prev => [...prev, eventId]);
      // Reload events to get updated attendance counts
      await loadEvents();
    } catch (error) {
      console.error('Error signing up for event:', error);
    }
  };

  const handleFollowOrganizer = (organizerId: string) => {
    // This would update following status in a real app
    console.log('Follow organizer:', organizerId);
  };

  const handleOrganizerClick = (organizerId: string) => {
    setSelectedOrganizer(organizerId);
    setActiveTab('organizer');
  };

  const handleComment = (eventId: string) => {
    console.log('Comment on event:', eventId);
  };

  const renderContent = () => {
    if (selectedOrganizer) {
      const organizer = events.find(event => event.organizer.id === selectedOrganizer)?.organizer;
      const organizerEvents = events.filter(event => event.organizer.id === selectedOrganizer);

      if (organizer) {
        return (
          <OrganizerProfile
            organizer={organizer}
            organizerEvents={organizerEvents}
            isFollowing={user.following?.includes(organizer.id) || false}
            onFollow={handleFollowOrganizer}
            onBack={() => setSelectedOrganizer(null)}
          />
        );
      }
    }

    switch (activeTab) {
      case 'home':
        return (
          <EventFeed
            events={events}
            onEventClick={handleEventClick}
            onLike={handleLike}
            onBookmark={handleBookmark}
            onComment={handleComment}
            onShare={handleShare}
            onOrganizerClick={handleOrganizerClick}
            bookmarkedEvents={userBookmarks}
            lovedEvents={userLikes}
          />
        );
      case 'calendar':
        return (
          <CalendarSection
            events={events.filter(event => userAttending.includes(event.id))}
            onEventClick={handleEventClick}
          />
        );
      case 'chat':
        return <ChatSection user={user} />;
      case 'profile':
        return (
          <ProfileSection
            user={user}
            bookedEvents={events.filter(event => userAttending.includes(event.id))}
            attendedEvents={[]} // Past events would be filtered by date
            onUpdateProfile={(updates) => {/* Handle profile updates */}}
            onSignOut={onSignOut}
          />
        );
      default:
        return (
          <EventFeed
            events={events}
            onEventClick={handleEventClick}
            onLike={handleLike}
            onBookmark={handleBookmark}
            onComment={handleComment}
            onShare={handleShare}
            onOrganizerClick={handleOrganizerClick}
            bookmarkedEvents={userBookmarks}
            lovedEvents={userLikes}
          />
        );
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
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setSelectedOrganizer(null);
        }}
        unreadMessages={unreadMessages}
      />

      {selectedEvent && (
        <>
          <EventDetailsModal
            event={selectedEvent}
            isOpen={isEventModalOpen}
            onClose={() => setIsEventModalOpen(false)}
            onShare={handleShare}
            onFollow={handleFollowOrganizer}
            onSignUp={handleSignUpForEvent}
            currentUser={user}
          />
          <ShareModal
            event={selectedEvent}
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
          />
        </>
      )}
    </div>
  );
};