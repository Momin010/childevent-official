import React, { useState, useEffect } from 'react';
import { OnboardingFlow } from './components/OnboardingFlow';
import { ResponsiveNavigation } from './components/ResponsiveNavigation';
import { EventFeed } from './components/EventFeed';
import { WelcomePage } from './components/WelcomePage';
import { AuthForm } from './components/AuthForm';
import { CalendarSection } from './components/CalendarSection';
import { ProfileSection } from './components/ProfileSection';
import { ChatSection } from './components/ChatSection';
import { EventDetailsModal } from './components/EventDetailsModal';
import { ShareModal } from './components/ShareModal';
import { OrganizerProfile } from './components/OrganizerProfile';
import { AdminDashboard } from './components/AdminDashboard';
import { OrganizerDashboard } from './components/OrganizerDashboard';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/Toast';
import { AuthCallback } from './components/AuthCallback';
import { signIn, signUp, getCurrentSession, onAuthStateChange, getUserProfile, createUserProfile, getUserProfileByUsername, setupTestUserFriendshipAndChat } from './lib/auth';
import { getUnreadMessageCount } from './lib/chat';
import { getEvents, getUserBookmarkedEvents, getUserLikedEvents, getUserAttendingEvents, toggleEventBookmark, toggleEventLike, signUpForEvent, incrementEventClicks } from './lib/events';
import { isSupabaseConfigured } from './lib/supabase';
import { useAppStore } from './store/appStore';
import { useToast } from './hooks/useToast';
import type { User, Event, AuthUser, Analytics, Theme, Chat } from './types';

function App() {
  const {
    user,
    isAuthenticated,
    authLoading,
    activeTab,
    isLoading,
    error,
    unreadMessages,
    setUser,
    setAuthLoading,
    setActiveTab,
    setLoading,
    setError,
    setUnreadMessages,
    clearError,
  } = useAppStore();

  const [authMode, setAuthMode] = useState<'welcome' | 'signin' | 'signup' | 'organizer-signin' | 'organizer-signup' | 'onboarding' | 'feed'>('welcome');
  const [isOrganizerOnboarding, setIsOrganizerOnboarding] = useState(() => {
    // Check localStorage for persisted organizer onboarding state
    return localStorage.getItem('isOrganizerOnboarding') === 'true';
  });

  // Custom setter that also updates localStorage
  const setIsOrganizerOnboardingWithStorage = (value: boolean | ((prev: boolean) => boolean)) => {
    const newValue = typeof value === 'function' ? value(isOrganizerOnboarding) : value;
    setIsOrganizerOnboarding(newValue);
    localStorage.setItem('isOrganizerOnboarding', newValue.toString());
  };
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedOrganizer, setSelectedOrganizer] = useState<string | null>(null);
  const [pendingUserData, setPendingUserData] = useState<any>(null);
  const { toasts, removeToast, success, error: showError } = useToast();

  // Initialize with empty events array - will be loaded from database
  const [events, setEvents] = useState<Event[]>([]);
  const [userBookmarks, setUserBookmarks] = useState<string[]>([]);
  const [userLikes, setUserLikes] = useState<string[]>([]);
  const [userAttending, setUserAttending] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      loadUnreadMessages();
      loadEvents();
      loadUserEventData();
    }
  }, [user]);

  useEffect(() => {
    if (error) {
      showError('Error', error);
      clearError();
    }
  }, [error, showError, clearError]);

  const loadUnreadMessages = async () => {
    if (!user) return;
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
    if (!user) return;
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


  // Check if Supabase is configured
  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Configuration Required</h1>
          <p className="text-gray-600 mb-4">
            Please connect to Supabase to continue. Click the "Connect to Supabase" button in the top right corner of the editor.
          </p>
        </div>
      </div>
    );
  }

  // Mock analytics data for admin dashboard
  const [analytics] = useState<Analytics>({
    newSignups: [
      { date: '2024-03-01', count: 12 },
      { date: '2024-03-02', count: 15 },
      { date: '2024-03-03', count: 8 },
      { date: '2024-03-04', count: 20 },
      { date: '2024-03-05', count: 18 },
    ],
    logins: [
      { date: '2024-03-01', count: 45 },
      { date: '2024-03-02', count: 52 },
      { date: '2024-03-03', count: 48 },
      { date: '2024-03-04', count: 55 },
      { date: '2024-03-05', count: 60 },
    ],
    eventEngagement: [],
    userActivity: [
      { date: '2024-03-01', activeUsers: 78, eventCreations: 3, eventSignups: 25 },
      { date: '2024-03-02', activeUsers: 85, eventCreations: 4, eventSignups: 32 },
      { date: '2024-03-03', activeUsers: 92, eventCreations: 5, eventSignups: 28 },
      { date: '2024-03-04', activeUsers: 88, eventCreations: 4, eventSignups: 35 },
      { date: '2024-03-05', activeUsers: 95, eventCreations: 6, eventSignups: 40 },
    ],
  });

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        setAuthLoading(true);
        const session = await getCurrentSession();
        if (session?.user) {
          try {
            // Check if this is a test user by username
            const username = session.user.user_metadata?.username;
            let profile = null;
            
            if (username && (username === 'tester1' || username === 'tester2')) {
              profile = await getUserProfileByUsername(username);
            } else {
              profile = await getUserProfile(session.user.id);
            }
            
            if (profile) {
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
            } else {
              // User needs to complete onboarding
              setPendingUserData({
                id: session.user.id,
                username: session.user.email || '',
                email: session.user.email || '',
                role: 'user',
              });
              setAuthMode('onboarding');
            }
          } catch (error) {
            // Profile doesn't exist, redirect to onboarding
            setPendingUserData({
              id: session.user.id,
              username: session.user.email || '',
              email: session.user.email || '',
              role: 'user',
            });
            setAuthMode('onboarding');
          }
        }
      } catch (error) {
        console.error('Session check error:', error);
        setError('Failed to check authentication status');
      } finally {
        setAuthLoading(false);
      }
    };

    checkSession();

    // Subscribe to auth state changes
    const { data: { subscription } } = onAuthStateChange((session) => {
      if (!session) {
        setUser(null);
        setAuthMode('welcome');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setAuthLoading, setError]);

  const handleSignIn = async ({ email, password, rememberMe }: { email: string; password: string; rememberMe?: boolean }) => {
    try {
      setLoading(true);

      // Check for test organizer credentials
      if (email === 'momin00010@gmail.com' && password === 'Momin00010!') {
        // Create a mock organizer user
        setUser({
          id: 'test-organizer-123',
          username: 'Momin00010',
          name: 'Test Organizer',
          organizationName: 'Test Organization',
          industry: 'Technology',
          website: 'https://testorg.com',
          roleInOrganization: 'Event Coordinator',
          friends: [],
          bookedEvents: [],
          attendedEvents: [],
          bookmarkedEvents: [],
          lovedEvents: [],
          following: [],
          role: 'organizer',
          lastLogin: new Date().toISOString(),
          theme: 'light',
        });
        success('Welcome back!', 'Test organizer account loaded successfully.');
        return;
      }

      const { user: authUser } = await signIn({ email, password, rememberMe });

      if (authUser) {
        try {
          // Check if this is a test user by username
          const username = authUser.user_metadata?.username;
          let profile = null;

          if (username && (username === 'tester1' || username === 'tester2')) {
            profile = await getUserProfileByUsername(username);
          } else {
            profile = await getUserProfile(authUser.id);
          }

          if (profile) {
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
            success('Welcome back!', 'You have successfully signed in.');
          } else {
            // User needs to complete onboarding
            setPendingUserData({
              id: authUser.id,
              username: authUser.email || '',
              email: authUser.email || '',
              role: isOrganizerOnboarding ? 'organizer' : 'user',
            });
            setAuthMode('onboarding');
          }
        } catch (error) {
          // Profile doesn't exist, redirect to onboarding
          setPendingUserData({
            id: authUser.id,
            username: authUser.email || '',
            email: authUser.email || '',
            role: isOrganizerOnboarding ? 'organizer' : 'user',
          });
          setAuthMode('onboarding');
        }
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async ({ email, password, username }: { email: string; password: string; username: string }) => {
    try {
      setLoading(true);

      // Check for test organizer credentials
      if (email === 'momin00010@gmail.com' && password === 'Momin00010!') {
        // Create a mock organizer user
        setUser({
          id: 'test-organizer-123',
          username: 'Momin00010',
          name: 'Test Organizer',
          organizationName: 'Test Organization',
          industry: 'Technology',
          website: 'https://testorg.com',
          roleInOrganization: 'Event Coordinator',
          friends: [],
          bookedEvents: [],
          attendedEvents: [],
          bookmarkedEvents: [],
          lovedEvents: [],
          following: [],
          role: 'organizer',
          lastLogin: new Date().toISOString(),
          theme: 'light',
        });
        success('Welcome!', 'Test organizer account loaded successfully.');
        return;
      }

      // For test users, check if profile already exists
      if (username === 'tester1' || username === 'tester2') {
        try {
          const existingProfile = await getUserProfileByUsername(username);
          if (existingProfile) {
            setUser({
              id: existingProfile.id,
              username: existingProfile.username,
              name: existingProfile.name,
              age: existingProfile.age,
              isParent: existingProfile.is_parent,
              numberOfChildren: existingProfile.number_of_children,
              hobbies: existingProfile.hobbies,
              profilePicture: existingProfile.profile_picture,
              coverPhoto: existingProfile.cover_photo,
              bio: existingProfile.bio,
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
            success('Welcome back!', 'Test user profile loaded successfully.');
            return;
          }
        } catch (error) {
          console.log('Test user profile not found, proceeding with signup');
        }
      }

      const { user: authUser } = await signUp({ email, password, username });

      if (authUser) {
        setPendingUserData({
          id: authUser.id,
          username: authUser.email || '',
          email: authUser.email || '',
          role: isOrganizerOnboarding ? 'organizer' : 'user',
        });
        setAuthMode('onboarding');
        success('Account Created', 'Please complete your profile to continue.');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    setUser(null);
    setAuthMode('welcome');
    setActiveTab('home');
    setPendingUserData(null);
    setEvents([]);
    setUserBookmarks([]);
    setUserLikes([]);
    setUserAttending([]);
    success('Signed Out', 'You have been successfully signed out.');
  };

  const handleWelcomeOrganizerSignUpClick = () => {
    setAuthMode('organizer-signup');
  };

  const handleWelcomeOrganizerSignInClick = () => {
    setAuthMode('organizer-signin');
  };

  const handleOnboardingComplete = async (userData: any) => {
    if (pendingUserData) {
      try {
        setLoading(true);

        if (isOrganizerOnboarding) {
          // Handle organizer onboarding
          const profileData = {
            username: pendingUserData.username,
            name: userData.organizationName || pendingUserData.username,
            email: pendingUserData.email,
            organization_name: userData.organizationName,
            industry: userData.industry,
            website: userData.website,
            role: userData.role,
            is_organizer: true,
          };

          await createUserProfile(pendingUserData.id, profileData);

          const completeUser: User = {
            id: pendingUserData.id,
            username: pendingUserData.username,
            name: userData.organizationName || pendingUserData.username,
            organizationName: userData.organizationName,
            industry: userData.industry,
            website: userData.website,
            roleInOrganization: userData.role,
            friends: [],
            bookedEvents: [],
            attendedEvents: [],
            bookmarkedEvents: [],
            lovedEvents: [],
            following: [],
            role: 'organizer',
            lastLogin: new Date().toISOString(),
            theme: 'light',
          };

          setUser(completeUser);
          setPendingUserData(null);
          setIsOrganizerOnboardingWithStorage(false);
          success('Welcome to EventConnect!', 'Your organizer profile has been created successfully.');
        } else {
          // Handle regular user onboarding
          const profileData = {
            username: pendingUserData.username,
            name: userData.name,
            age: userData.age,
            is_parent: userData.isParent,
            number_of_children: userData.numberOfChildren,
            hobbies: userData.hobbies,
            email: pendingUserData.email,
          };

          await createUserProfile(pendingUserData.id, profileData);

          const completeUser: User = {
            id: pendingUserData.id,
            username: pendingUserData.username,
            ...userData,
            friends: [],
            bookedEvents: [],
            attendedEvents: [],
            bookmarkedEvents: [],
            lovedEvents: [],
            following: [],
            role: pendingUserData.role,
            lastLogin: new Date().toISOString(),
            theme: 'light',
          };

          setUser(completeUser);
          setPendingUserData(null);
          success('Welcome to EventConnect!', 'Your profile has been created successfully.');
        }
      } catch (error: any) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
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
    if (user) {
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
    }
  };

  const handleLike = async (eventId: string) => {
    if (user) {
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
    }
  };

  const handleSignUpForEvent = async (eventId: string) => {
    if (user) {
      try {
        await signUpForEvent(eventId, user.id);
        setUserAttending(prev => [...prev, eventId]);
        // Reload events to get updated attendance counts
        await loadEvents();
        success('Event Booked', 'You have successfully signed up for this event!');
      } catch (error) {
        console.error('Error signing up for event:', error);
        showError('Error', 'Failed to sign up for event');
      }
    }
  };

  const handleFollowOrganizer = (organizerId: string) => {
    if (user) {
      setUser({
        ...user,
        following: user.following.includes(organizerId)
          ? user.following.filter(id => id !== organizerId)
          : [...user.following, organizerId]
      });
    }
  };

  const handleOrganizerClick = (organizerId: string) => {
    setSelectedOrganizer(organizerId);
    setActiveTab('organizer');
  };

  const handleComment = (eventId: string) => {
    console.log('Comment on event:', eventId);
  };

  const renderContent = () => {
    if (user?.role === 'organizer' && activeTab === 'home') {
      return <OrganizerDashboard />;
    }

    if (user?.role === 'admin' && activeTab === 'home') {
      return <AdminDashboard analytics={analytics} />;
    }

    if (selectedOrganizer) {
      const organizer = events.find(event => event.organizer.id === selectedOrganizer)?.organizer;
      const organizerEvents = events.filter(event => event.organizer.id === selectedOrganizer);
      
      if (organizer) {
        return (
          <OrganizerProfile
            organizer={organizer}
            organizerEvents={organizerEvents}
            isFollowing={user?.following.includes(organizer.id) || false}
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
        return user ? <ChatSection user={user} /> : null;
      case 'profile':
        if (user) {
          return (
            <ProfileSection
              user={user}
              bookedEvents={events.filter(event => userAttending.includes(event.id))}
              attendedEvents={[]} // Past events would be filtered by date
              onUpdateProfile={(updates) => setUser({ ...user, ...updates })}
              onSignOut={handleSignOut}
            />
          );
        }
        return null;
      default:
        return null;
    }
  };

  // Handle OAuth callback
  if (window.location.pathname === '/auth/callback') {
    return <AuthCallback />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6">
              <LoadingSpinner size="lg" text="Please wait..." />
            </div>
          </div>
        )}

        {/* Toast Container */}
        <ToastContainer toasts={toasts} onClose={removeToast} />

        {/* Main Content */}
        {user ? (
          <>
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

          </>
        ) : (
          <>
            {/* Auth Flow */}
            {authMode === 'welcome' && (
              <WelcomePage
                onSignUpClick={() => setAuthMode('signup')}
                onSignInClick={() => setAuthMode('signin')}
                onOrganizerSignUpClick={handleWelcomeOrganizerSignUpClick}
                onOrganizerSignInClick={handleWelcomeOrganizerSignInClick}
              />
            )}
            {authMode === 'signin' && (
              <AuthForm
                mode="signin"
                onSubmit={handleSignIn}
                onBack={() => setAuthMode('welcome')}
                error={error}
              />
            )}
            {authMode === 'signup' && (
              <AuthForm
                mode="signup"
                onSubmit={handleSignUp}
                onBack={() => setAuthMode('welcome')}
                error={error}
              />
            )}
            {authMode === 'organizer-signup' && (
              <AuthForm
                mode="organizer-signup"
                onSubmit={(credentials) => {
                  setIsOrganizerOnboardingWithStorage(true);
                  return handleSignUp(credentials);
                }}
                onBack={() => setAuthMode('welcome')}
                error={error}
              />
            )}
            {authMode === 'organizer-signin' && (
              <AuthForm
                mode="organizer-signin"
                onSubmit={(credentials) => {
                  setIsOrganizerOnboardingWithStorage(true);
                  return handleSignIn(credentials);
                }}
                onBack={() => setAuthMode('welcome')}
                error={error}
              />
            )}
            {authMode === 'onboarding' && (
              <OnboardingFlow
                onComplete={handleOnboardingComplete}
                isOrganizer={isOrganizerOnboarding}
              />
            )}
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;