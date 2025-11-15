import React, { useEffect, useState } from 'react';
import { getCurrentSession, getUserProfile } from '../lib/auth';
import { useAppStore } from '../store/appStore';
import { LoadingSpinner } from './LoadingSpinner';

export const AuthCallback: React.FC = () => {
  const { setUser, setAuthLoading } = useAppStore();
  const [callbackHandled, setCallbackHandled] = useState(false);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const session = await getCurrentSession();
        if (session?.user) {
          try {
            const profile = await getUserProfile(session.user.id);
            if (profile) {
              // User has completed profile
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
              // Redirect to main app
              window.location.href = '/';
            } else {
              // User needs to complete onboarding - redirect to main app which will handle onboarding
              window.location.href = '/';
            }
          } catch (error) {
            // Profile doesn't exist, redirect to main app which will handle onboarding
            window.location.href = '/';
          }
        } else {
          // No session, redirect to welcome
          window.location.href = '/';
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        window.location.href = '/';
      } finally {
        setAuthLoading(false);
      }
    };

    if (!callbackHandled) {
      setCallbackHandled(true);
      handleAuthCallback();
    }
  }, [callbackHandled, setUser, setAuthLoading]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner size="lg" text="Completing sign in..." />
    </div>
  );
};