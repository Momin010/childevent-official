import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2 } from 'lucide-react';
import { createUserProfile } from '../lib/auth';
import { useToast } from '../hooks/useToast';
import type { User } from '../types';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUpdate: (updates: Partial<User>) => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdate,
}) => {
  const [formData, setFormData] = useState({
    name: user.name,
    bio: user.bio || '',
    age: user.age,
    isParent: user.isParent,
    numberOfChildren: user.numberOfChildren,
    hobbies: user.hobbies,
  });
  const [isLoading, setIsLoading] = useState(false);
  const { success, error } = useToast();

  const hobbiesList = [
    'Hiking', 'Camping', 'Cycling', 'Rock Climbing', 'Kayaking', 'Scuba Diving',
    'Surfing', 'Skiing', 'Fishing', 'Photography', 'Soccer', 'Basketball',
    'Volleyball', 'Tennis', 'Yoga', 'Dancing', 'Painting', 'Pottery',
    'Music', 'Cooking', 'Gaming', 'Reading', 'Writing', 'Technology', 'Science'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await createUserProfile(user.id, formData);
      onUpdate(formData);
      success('Profile Updated', 'Your profile has been updated successfully.');
      onClose();
    } catch (err: any) {
      error('Update Failed', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleHobby = (hobby: string) => {
    setFormData(prev => ({
      ...prev,
      hobbies: prev.hobbies.includes(hobby)
        ? prev.hobbies.filter(h => h !== hobby)
        : [...prev.hobbies, hobby]
    }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-semibold">Edit Profile</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bio
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age
                </label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData(prev => ({ ...prev, age: parseInt(e.target.value) || 0 }))}
                  min="13"
                  max="120"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Are you a parent?
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={formData.isParent}
                      onChange={() => setFormData(prev => ({ ...prev, isParent: true }))}
                      className="mr-2"
                    />
                    Yes
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={!formData.isParent}
                      onChange={() => setFormData(prev => ({ ...prev, isParent: false, numberOfChildren: 0 }))}
                      className="mr-2"
                    />
                    No
                  </label>
                </div>
              </div>

              {formData.isParent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Children
                  </label>
                  <input
                    type="number"
                    value={formData.numberOfChildren}
                    onChange={(e) => setFormData(prev => ({ ...prev, numberOfChildren: parseInt(e.target.value) || 0 }))}
                    min="1"
                    max="20"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hobbies
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {hobbiesList.map((hobby) => (
                    <button
                      key={hobby}
                      type="button"
                      onClick={() => toggleHobby(hobby)}
                      className={`py-2 px-3 text-sm rounded-lg transition-colors ${
                        formData.hobbies.includes(hobby)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {hobby}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};