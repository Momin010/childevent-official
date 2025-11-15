import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Users, Phone, Mail, Star } from 'lucide-react';
import { getFriendSuggestions, sendFriendRequest, importContacts, getFriendshipStatus } from '../lib/friends';
import type { FriendSuggestion, Contact } from '../types';

interface FriendSuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

export const FriendSuggestionsModal: React.FC<FriendSuggestionsModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
}) => {
  const [suggestions, setSuggestions] = useState<FriendSuggestion[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeTab, setActiveTab] = useState<'suggestions' | 'contacts'>('suggestions');
  const [isLoading, setIsLoading] = useState(true);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [friendshipStatuses, setFriendshipStatuses] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (isOpen) {
      loadSuggestions();
      loadContacts();
    }
  }, [isOpen, currentUserId]);

  const loadSuggestions = async () => {
    try {
      const friendSuggestions = await getFriendSuggestions(currentUserId);
      setSuggestions(friendSuggestions);
      
      // Load friendship statuses for suggestions
      const statusMap = new Map<string, string>();
      for (const suggestion of friendSuggestions) {
        const status = await getFriendshipStatus(currentUserId, suggestion.id);
        statusMap.set(suggestion.id, status);
      }
      setFriendshipStatuses(prev => new Map([...prev, ...statusMap]));
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadContacts = async () => {
    try {
      const userContacts = await importContacts();
      setContacts(userContacts);
      
      // Load friendship statuses for contacts that are app users
      const statusMap = new Map<string, string>();
      for (const contact of userContacts) {
        if (contact.isAppUser && contact.userId) {
          const status = await getFriendshipStatus(currentUserId, contact.userId);
          statusMap.set(contact.userId, status);
        }
      }
      setFriendshipStatuses(prev => new Map([...prev, ...statusMap]));
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const handleSendRequest = async (userId: string) => {
    try {
      await sendFriendRequest(currentUserId, userId);
      setSentRequests(prev => new Set([...prev, userId]));
      setFriendshipStatuses(prev => new Map([...prev, [userId, 'pending_sent']]));
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'contacts':
        return <Phone className="w-4 h-4" />;
      case 'community':
        return <Users className="w-4 h-4" />;
      case 'events':
        return <Star className="w-4 h-4" />;
      case 'mutual':
        return <Users className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'contacts':
        return 'From your contacts';
      case 'community':
        return 'From your community';
      case 'events':
        return 'From events';
      case 'mutual':
        return 'Mutual friends';
      default:
        return 'Suggested';
    }
  };

  const getButtonState = (userId: string) => {
    const status = friendshipStatuses.get(userId);
    const hasSentRequest = sentRequests.has(userId);
    
    if (hasSentRequest || status === 'pending_sent') {
      return { disabled: true, text: 'Sent', className: 'bg-gray-200 text-gray-500' };
    }
    
    if (status === 'friends') {
      return { disabled: true, text: 'Friends', className: 'bg-gray-200 text-gray-500' };
    }
    
    if (status === 'pending_received') {
      return { disabled: false, text: 'Accept', className: 'bg-green-500 text-white hover:bg-green-600' };
    }
    
    return { disabled: false, text: 'Add', className: 'bg-blue-500 text-white hover:bg-blue-600' };
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
            className="bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Add Friends</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('suggestions')}
                className={`flex-1 py-3 px-4 text-center ${
                  activeTab === 'suggestions'
                    ? 'border-b-2 border-blue-500 text-blue-500'
                    : 'text-gray-500'
                }`}
              >
                Suggestions
              </button>
              <button
                onClick={() => setActiveTab('contacts')}
                className={`flex-1 py-3 px-4 text-center ${
                  activeTab === 'contacts'
                    ? 'border-b-2 border-blue-500 text-blue-500'
                    : 'text-gray-500'
                }`}
              >
                Contacts
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-96">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <>
                  {activeTab === 'suggestions' && (
                    <div className="p-4 space-y-4">
                      {suggestions.map((suggestion) => {
                        const buttonState = getButtonState(suggestion.id);
                        return (
                          <motion.div
                            key={suggestion.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50"
                          >
                            <div className="flex items-center space-x-3">
                              <img
                                src={suggestion.profilePicture || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e'}
                                alt={suggestion.name}
                                className="w-12 h-12 rounded-full"
                              />
                              <div>
                                <h3 className="font-semibold">{suggestion.name}</h3>
                                <div className="flex items-center space-x-1 text-sm text-gray-500">
                                  {getSourceIcon(suggestion.source)}
                                  <span>{getSourceLabel(suggestion.source)}</span>
                                </div>
                                {suggestion.mutualFriends > 0 && (
                                  <p className="text-xs text-gray-400">
                                    {suggestion.mutualFriends} mutual friends
                                  </p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handleSendRequest(suggestion.id)}
                              disabled={buttonState.disabled}
                              className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${buttonState.className}`}
                            >
                              <UserPlus className="w-4 h-4" />
                              <span>{buttonState.text}</span>
                            </button>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}

                  {activeTab === 'contacts' && (
                    <div className="p-4 space-y-4">
                      {contacts.map((contact) => {
                        const buttonState = contact.userId ? getButtonState(contact.userId) : null;
                        return (
                          <motion.div
                            key={contact.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50"
                          >
                            <div className="flex items-center space-x-3">
                              <img
                                src={contact.profilePicture || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e'}
                                alt={contact.name}
                                className="w-12 h-12 rounded-full"
                              />
                              <div>
                                <h3 className="font-semibold">{contact.name}</h3>
                                <div className="flex items-center space-x-2 text-sm text-gray-500">
                                  {contact.phoneNumber && (
                                    <div className="flex items-center space-x-1">
                                      <Phone className="w-3 h-3" />
                                      <span>{contact.phoneNumber}</span>
                                    </div>
                                  )}
                                  {contact.email && (
                                    <div className="flex items-center space-x-1">
                                      <Mail className="w-3 h-3" />
                                      <span>{contact.email}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            {contact.isAppUser && buttonState ? (
                              <button
                                onClick={() => contact.userId && handleSendRequest(contact.userId)}
                                disabled={buttonState.disabled}
                                className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${buttonState.className}`}
                              >
                                <UserPlus className="w-4 h-4" />
                                <span>{buttonState.text}</span>
                              </button>
                            ) : (
                              <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                                Invite
                              </button>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};