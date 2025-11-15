import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentSession, getUserProfile } from '../lib/auth';
import { useAppStore } from '../store/appStore';
import { LoadingSpinner } from './LoadingSpinner';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { setUser, setAuthLoading } = useAppStore();

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
              navigate('/');
            } else {
              // User needs to complete onboarding
              navigate('/onboarding');
            }
          } catch (error) {
            // Profile doesn't exist, redirect to onboarding
            navigate('/onboarding');
          }
        } else {
          navigate('/welcome');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/welcome');
      } finally {
        setAuthLoading(false);
      }
    };

    handleAuthCallback();
  }, [navigate, setUser, setAuthLoading]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner size="lg" text="Completing sign in..." />
    </div>
  );
};