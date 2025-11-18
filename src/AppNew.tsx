import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ChoicePage } from './components/ChoicePage';
import { UserLoginPage } from './components/UserLoginPage';
import { OrganizerLoginPage } from './components/OrganizerLoginPage';
import { UserOnboardingPage } from './components/UserOnboardingPage';
import { OrganizerOnboardingPage } from './components/OrganizerOnboardingPage';
import { UserApp } from './components/UserApp';
import { OrganizerApp } from './components/OrganizerApp';
import { AuthCallback } from './components/AuthCallback';
import { AdminPasswordPage } from './components/AdminPasswordPage';
import { AdminPanel } from './components/AdminPanel';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ErrorPage, NotFoundPage, ServerErrorPage, NetworkErrorPage, PermissionDeniedPage } from './components/ErrorPage';
import { ToastContainer } from './components/Toast';
import { isSupabaseConfigured } from './lib/supabase';
import { getCurrentSession, getUserProfile, signOut, onAuthStateChange } from './lib/auth';
import { useAppStore } from './store/appStore';
import { useToast } from './hooks/useToast';
import type { User } from './types';

function App() {
  const { toasts, removeToast } = useToast();
  const { user, setUser, authLoading, setAuthLoading, reset } = useAppStore();
  const authCheckRef = useRef(false);

  // Loading screen component
  const LoadingScreen = () => (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner size="lg" text="Loading..." />
    </div>
  );


  // Auth state listener
  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.id);

      if (event === "SIGNED_OUT") {
        setUser(null);
        setAuthLoading(false);
        return;
      }

      if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
        // Re-check auth status when session changes
        if (session?.user) {
          setAuthLoading(true);
          try {
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
            } else {
              setUser(null);
            }
          } catch (error) {
            console.error('Auth listener profile fetch error:', error);
            setUser(null);
          } finally {
            setAuthLoading(false);
          }
        } else {
          setUser(null);
          setAuthLoading(false);
        }
        return;
      }

      // For other events, just ensure loading is false
      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);



  const handleSignOut = async () => {
    try {
      await signOut();
      // Complete reset of all app state
      reset();
      // Reset auth check ref to prevent conflicts
      authCheckRef.current = false;
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
              path="/user/*"
              element={
                authLoading ? (
                  <LoadingScreen />
                ) : user && user.role === 'user' ? (
                  <UserApp onSignOut={handleSignOut} />
                ) : (
                  <Navigate to="/userlogin" replace />
                )
              }
            />

            {/* Organizer routes */}
            <Route path="/orglogin" element={<OrganizerLoginPage />} />
            <Route path="/orgonboarding" element={<OrganizerOnboardingPage />} />
            <Route
              path="/org/*"
              element={
                authLoading ? (
                  <LoadingScreen />
                ) : user && user.role === 'organizer' ? (
                  <OrganizerApp onSignOut={handleSignOut} />
                ) : (
                  <Navigate to="/orglogin" replace />
                )
              }
            />

            {/* Auth callback */}
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Admin routes */}
            <Route path="/admin" element={<AdminPasswordPage />} />
            <Route path="/adminpanel" element={<AdminPanel />} />

            {/* Error routes */}
            <Route path="/error" element={<ErrorPage />} />
            <Route path="/error/network" element={<NetworkErrorPage />} />
            <Route path="/error/403" element={<PermissionDeniedPage />} />
            <Route path="/error/500" element={<ServerErrorPage />} />

            {/* 404 catch-all route */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;