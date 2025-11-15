import React, { useState, useEffect } from 'react';
import { OnboardingFlow } from './components/OnboardingFlow';
import { UserApp } from './components/UserApp';
import { OrganizerApp } from './components/OrganizerApp';
import { WelcomePage } from './components/WelcomePage';
import { AuthForm } from './components/AuthForm';
import { AdminDashboard } from './components/AdminDashboard';
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
  const [pendingUserData, setPendingUserData] = useState<any>(null);
  const { toasts, removeToast, success, error: showError } = useToast();

  useEffect(() => {
    if (error) {
      showError('Error', error);
      clearError();
    }
  }, [error, showError, clearError]);


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
              role: profile.is_organizer ? 'organizer' : 'user',
              organizationName: profile.organization_name,
              industry: profile.industry,
              website: profile.website,
              roleInOrganization: profile.role,
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
            console.log('Profile data from database:', profile);
            console.log('is_organizer value:', profile.is_organizer);
            console.log('Setting user role to:', profile.is_organizer ? 'organizer' : 'user');

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
              role: profile.is_organizer ? 'organizer' : 'user',
              organizationName: profile.organization_name,
              industry: profile.industry,
              website: profile.website,
              roleInOrganization: profile.role,
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
              role: profile.is_organizer ? 'organizer' : 'user',
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
          user.role === 'organizer' ? (
            <OrganizerApp user={user} onSignOut={handleSignOut} />
          ) : (
            <UserApp user={user} onSignOut={handleSignOut} />
          )
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