import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { Camera, Users, Calendar, Bookmark, Heart, Edit, Plus, LogOut, MessageCircle, Loader2 } from 'lucide-react';
import { FriendSuggestionsModal } from './FriendSuggestionsModal';
import type { User, Event } from '../types';
import { signOut, setupTestUserFriendshipAndChat, updateUserProfile } from '../lib/auth';
import { uploadProfilePicture, uploadCoverPhoto, validateImageFile } from '../lib/storage';
import { useToast } from '../hooks/useToast';

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
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const { success, error: showError } = useToast();

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

  const onDropProfilePicture = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      showError('Upload Error', validation.error!);
      return;
    }

    setUploadingProfile(true);
    try {
      const result = await uploadProfilePicture(file, user.id);
      await updateUserProfile(user.id, { profile_picture: result.url });
      onUpdateProfile({ profilePicture: result.url });
      success('Profile picture updated successfully!');
    } catch (error: any) {
      showError('Upload Failed', error.message || 'Failed to upload profile picture');
    } finally {
      setUploadingProfile(false);
    }
  }, [user.id, onUpdateProfile, success, showError]);

  const onDropCoverPhoto = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      showError('Upload Error', validation.error!);
      return;
    }

    setUploadingCover(true);
    try {
      const result = await uploadCoverPhoto(file, user.id);
      await updateUserProfile(user.id, { cover_photo: result.url });
      onUpdateProfile({ coverPhoto: result.url });
      success('Cover photo updated successfully!');
    } catch (error: any) {
      showError('Upload Failed', error.message || 'Failed to upload cover photo');
    } finally {
      setUploadingCover(false);
    }
  }, [user.id, onUpdateProfile, success, showError]);

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
        {uploadingCover ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-300">
            <Loader2 className="w-8 h-8 text-gray-600 animate-spin" />
          </div>
        ) : user.coverPhoto ? (
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

      {/* Profile Picture */}
      <div className="max-w-5xl mx-auto px-4 relative">
        <div
          {...getProfilePicProps()}
          className="absolute -top-16 left-4 w-32 h-32 rounded-full border-4 border-white bg-gray-200 cursor-pointer group overflow-hidden"
        >
          {uploadingProfile ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-300">
              <Loader2 className="w-8 h-8 text-gray-600 animate-spin" />
            </div>
          ) : user.profilePicture ? (
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

        {/* User/Organizer Info */}
        <div className="pt-20 pb-4 border-b">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h1 className="text-3xl font-bold">
                {user.role === 'organizer' ? user.organizationName || user.name : user.name}
              </h1>
              <p className="text-gray-600">
                {user.role === 'organizer'
                  ? user.bio || `Event organizer • ${user.industry || 'Various industries'}`
                  : user.bio || 'No bio yet'
                }
              </p>

              {user.role === 'organizer' ? (
                <div className="flex space-x-4 mt-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <span>0 Events Created</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-gray-500" />
                    <span>0 Total Attendees</span>
                  </div>
                  {user.website && (
                    <div className="flex items-center space-x-2">
                      <span className="text-blue-500 hover:underline cursor-pointer">
                        {user.website}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
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
              )}
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-500 text-white rounded-lg flex items-center space-x-2 hover:bg-red-600 transition-colors ml-4"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Friends Section - Only for regular users */}
        {user.role !== 'organizer' && (
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
        )}

        {/* Organization Info - Only for organizers */}
        {user.role === 'organizer' && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-4">Organization Details</h2>
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                  <p className="text-gray-900">{user.industry || 'Not specified'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                  <p className="text-gray-900">{user.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <p className="text-gray-900">{user.roleInOrganization || 'Not specified'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <p className="text-gray-900">
                    {user.website ? (
                      <a href={user.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        {user.website}
                      </a>
                    ) : 'Not provided'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Events Sections */}
        <div className="mt-8 space-y-8">
          {user.role === 'organizer' ? (
            /* Organizer Events - Events they've created */
            <>
              <div>
                <h2 className="text-xl font-semibold mb-4">My Events</h2>
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No events created yet</p>
                  <p className="text-sm">Create your first event to see it here</p>
                </div>
              </div>

              {/* Organizer Analytics */}
              <div>
                <h2 className="text-xl font-semibold mb-4">Event Analytics</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg shadow p-4 text-center">
                    <div className="text-2xl font-bold text-blue-500 mb-1">0</div>
                    <div className="text-sm text-gray-600">Total Views</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4 text-center">
                    <div className="text-2xl font-bold text-green-500 mb-1">0</div>
                    <div className="text-sm text-gray-600">Sign-ups</div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-4 text-center">
                    <div className="text-2xl font-bold text-purple-500 mb-1">0</div>
                    <div className="text-sm text-gray-600">Shares</div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* User Events - Events they've signed up for */
            <>
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
                  {bookedEvents.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg mb-2">No upcoming events</p>
                      <p className="text-sm">Browse events and sign up for ones you like!</p>
                    </div>
                  )}
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
                  {attendedEvents.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg mb-2">No past events</p>
                      <p className="text-sm">Events you've attended will appear here</p>
                    </div>
                  )}
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
            </>
          )}
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