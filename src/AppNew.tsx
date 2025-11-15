import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ChoicePage } from './components/ChoicePage';
import { UserLoginPage } from './components/UserLoginPage';
import { OrganizerLoginPage } from './components/OrganizerLoginPage';
import { UserOnboardingPage } from './components/UserOnboardingPage';
import { OrganizerOnboardingPage } from './components/OrganizerOnboardingPage';
import { UserApp } from './components/UserApp';
import { OrganizerApp } from './components/OrganizerApp';
import { AuthCallback } from './components/AuthCallback';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/Toast';
import { isSupabaseConfigured } from './lib/supabase';
import { getCurrentSession, getUserProfile, signOut } from './lib/auth';
import { useToast } from './hooks/useToast';
import type { User } from './types';

function App() {
  const { toasts, removeToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const session = await getCurrentSession();
      if (session?.user) {
        const profile = await getUserProfile(session.user.id);
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
            role: profile.is_organizer ? 'organizer' : 'user',
            organizationName: profile.organization_name,
            industry: profile.industry,
            website: profile.website,
            roleInOrganization: profile.role,
            organizerId: profile.organizer_id,
            lastLogin: new Date().toISOString(),
            theme: 'light',
          });
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen">
          {/* Toast Container */}
          <ToastContainer toasts={toasts} onClose={removeToast} />

          <Routes>
            {/* Root choice page */}
            <Route path="/" element={<ChoicePage />} />

            {/* User routes */}
            <Route path="/userlogin" element={<UserLoginPage />} />
            <Route path="/useronboarding" element={<UserOnboardingPage />} />
            <Route
              path="/userhome"
              element={
                user && user.role === 'user' ? (
                  <UserApp user={user} onSignOut={handleSignOut} />
                ) : (
                  <Navigate to="/userlogin" replace />
                )
              }
            />

            {/* Organizer routes */}
            <Route path="/orglogin" element={<OrganizerLoginPage />} />
            <Route path="/orgonboarding" element={<OrganizerOnboardingPage />} />
            <Route
              path="/orghome"
              element={
                user && user.role === 'organizer' ? (
                  <OrganizerApp user={user} onSignOut={handleSignOut} />
                ) : (
                  <Navigate to="/orglogin" replace />
                )
              }
            />

            {/* Auth callback */}
            <Route path="/auth/callback" element={<AuthCallback />} />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;