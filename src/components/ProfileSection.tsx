import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { Camera, Users, Calendar, Bookmark, Heart, Edit, Plus, LogOut, MessageCircle } from 'lucide-react';
import { FriendSuggestionsModal } from './FriendSuggestionsModal';
import type { User, Event } from '../types';
import { signOut, setupTestUserFriendshipAndChat } from '../lib/auth';

interface ProfileSectionProps {
  user: User;
  bookedEvents: Event[];
  attendedEvents: Event[];
  onUpdateProfile: (updates: Partial<User>) => void;
  onSignOut: () => void;
}

export const ProfileSection: React.FC<ProfileSectionProps> = ({
  user,
  bookedEvents,
  attendedEvents,
  onUpdateProfile,
  onSignOut,
}) => {
  const [isFriendModalOpen, setIsFriendModalOpen] = useState(false);

  const handleSetupTestChat = async () => {
    try {
      // Set up test chat between tester1 and tester2
      const user1Id = '550e8400-e29b-41d4-a716-446655440001'; // tester1
      const user2Id = '550e8400-e29b-41d4-a716-446655440002'; // tester2

      await setupTestUserFriendshipAndChat(user1Id, user2Id);
      alert('Test chat setup complete! You can now test messaging between tester1 and tester2.');
    } catch (error) {
      console.error('Error setting up test chat:', error);
      alert('Error setting up test chat. Check console for details.');
    }
  };

  const onDropProfilePicture = useCallback((acceptedFiles: File[]) => {
    // In a real app, you would upload this to a server
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        onUpdateProfile({ profilePicture: e.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  }, [onUpdateProfile]);

  const onDropCoverPhoto = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        onUpdateProfile({ coverPhoto: e.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  }, [onUpdateProfile]);

  const { getRootProps: getProfilePicProps, getInputProps: getProfilePicInputProps } = useDropzone({
    onDrop: onDropProfilePicture,
    accept: { 'image/*': [] },
    maxFiles: 1,
  });

  const { getRootProps: getCoverProps, getInputProps: getCoverInputProps } = useDropzone({
    onDrop: onDropCoverPhoto,
    accept: { 'image/*': [] },
    maxFiles: 1,
  });

  const handleSignOut = async () => {
    try {
      await signOut();
      onSignOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="bg-white min-h-screen pb-16">
      {/* Cover Photo */}
      <div
        {...getCoverProps()}
        className="relative h-64 bg-gray-200 cursor-pointer group"
      >
        {user.coverPhoto ? (
          <img
            src={user.coverPhoto}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Camera className="w-8 h-8 text-gray-400" />
          </div>
        )}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
          <input {...getCoverInputProps()} />
          <Camera className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-all duration-200" />
        </div>
      </div>

      {/* Profile Picture and Actions */}
      <div className="max-w-5xl mx-auto px-4 relative">
        <div className="flex justify-between items-start mt-4">
          <div
            {...getProfilePicProps()}
            className="absolute -top-16 left-4 w-32 h-32 rounded-full border-4 border-white bg-gray-200 cursor-pointer group overflow-hidden"
          >
            {user.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={user.name}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Users className="w-12 h-12 text-gray-400" />
              </div>
            )}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
              <input {...getProfilePicInputProps()} />
              <Camera className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-all duration-200" />
            </div>
          </div>

          <div className="flex space-x-4 mt-4">
            <button
              type="button"
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-500 text-white rounded-lg flex items-center space-x-2 hover:bg-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* User Info */}
        <div className="pt-20 pb-4 border-b">
          <div>
            <h1 className="text-3xl font-bold">{user.name}</h1>
            <p className="text-gray-600">{user.bio || 'No bio yet'}</p>
          </div>

          <div className="flex space-x-4 mt-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-gray-500" />
              <span>{user.friends.length} Friends</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <span>{bookedEvents.length} Upcoming Events</span>
            </div>
          </div>
        </div>

        {/* Friends Section */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Friends</h2>
            <button 
              onClick={() => setIsFriendModalOpen(true)}
              className="text-blue-500 hover:text-blue-600 flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Add Friends</span>
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {user.friends.map((friend) => (
              <motion.div
                key={friend.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-50 rounded-lg p-4 flex items-center space-x-3"
              >
                <img
                  src={friend.profilePicture || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e'}
                  alt={friend.name}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <p className="font-medium">{friend.name}</p>
                  <p className="text-sm text-gray-500">
                    {friend.isOnline ? 'Online' : friend.status}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Events Sections */}
        <div className="mt-8 space-y-8">
          {/* Upcoming Events */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Upcoming Events</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bookedEvents.map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-lg shadow p-4"
                >
                  <img
                    src={event.imageUrl}
                    alt={event.title}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                  />
                  <h3 className="font-semibold">{event.title}</h3>
                  <p className="text-gray-600">{event.date} at {event.time}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Past Events */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Past Events</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {attendedEvents.map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-lg shadow p-4"
                >
                  <img
                    src={event.imageUrl}
                    alt={event.title}
                    className="w-full h-48 object-cover rounded-lg mb-4 opacity-75"
                  />
                  <h3 className="font-semibold">{event.title}</h3>
                  <p className="text-gray-600">{event.date} at {event.time}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Saved Events */}
          <div className="flex space-x-4 mt-6">
            <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              <Bookmark className="w-5 h-5" />
              <span>Bookmarked Events</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              <Heart className="w-5 h-5" />
              <span>Loved Events</span>
            </button>
          </div>
        </div>
      </div>

      {/* Friend Suggestions Modal */}
      <FriendSuggestionsModal
        isOpen={isFriendModalOpen}
        onClose={() => setIsFriendModalOpen(false)}
        currentUserId={user.id}
      />
    </div>
  );
};