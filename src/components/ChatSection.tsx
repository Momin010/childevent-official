import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Plus, 
  Send, 
  ArrowLeft, 
  Phone, 
  Video, 
  MoreVertical,
  Smile,
  Paperclip,
  Camera,
  MessageCircle,
  Mic,
  Image as ImageIcon,
  File
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import {
  getUserChats,
  getChatMessages,
  sendMessage,
  createOrGetChat,
  markMessagesAsRead,
  subscribeToMessages,
  subscribeToMessageStatus,
  uploadMessageFile,
  updateUserOnlineStatus
} from '../lib/chat';
import { supabase } from '../lib/supabase';
import { getUserFriends } from '../lib/friends';
import { requestNotificationPermission, subscribeToNotifications } from '../lib/notifications';
import { MessageStatus } from './MessageStatus';
import { MediaMessage } from './MediaMessage';
import type { User, Chat, Message, Friend } from '../types';

interface ChatSectionProps {
  user: User;
  onBack?: () => void;
}

export const ChatSection: React.FC<ChatSectionProps> = ({ user, onBack }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [messageStatuses, setMessageStatuses] = useState<Map<string, string>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Define callback functions first
  const loadChats = useCallback(async () => {
    try {
      const userChats = await getUserChats(user.id);
      setChats(userChats);
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user.id]);

  const loadFriends = useCallback(async () => {
    try {
      const userFriends = await getUserFriends(user.id);
      setFriends(userFriends);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  }, [user.id]);

  const loadMessages = useCallback(async (chatId: string) => {
    try {
      const otherParticipant = selectedChat?.participants.find(p => p !== user.id) || '';
      const chatMessages = await getChatMessages(chatId, user.id, otherParticipant);
      setMessages(chatMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, [selectedChat, user.id]);

  const setupNotifications = useCallback(async () => {
    const hasPermission = await requestNotificationPermission();
    if (hasPermission) {
      subscribeToNotifications(user.id, (notification) => {
        // Notification will be shown automatically by the subscription
        console.log('New notification:', notification);
      });
    }
  }, [user.id]);

  useEffect(() => {
    const initializeChat = async () => {
      await loadChats();
      await loadFriends();
      await setupNotifications();
      updateUserOnlineStatus(user.id, true);
    };

    initializeChat();

    // Update online status when user leaves
    return () => {
      updateUserOnlineStatus(user.id, false);
    };
  }, [user.id, loadChats, loadFriends, setupNotifications]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat.id);
      markMessagesAsRead(selectedChat.id, user.id);
    }
  }, [selectedChat, user.id, loadMessages]);

  // Global subscription for chat list updates
  useEffect(() => {
    const globalMessageSubscription = subscribeToMessages('*', (newMessage) => {
      // Only update if this user is involved in the message
      if (newMessage.senderId === user.id || newMessage.receiverId === user.id) {
        console.log('🔄 Updating chat list with new message');
        loadChats(); // Refresh chat list to show latest message
      }
    });

    return () => {
      globalMessageSubscription.unsubscribe();
    };
  }, [user.id, loadChats]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (selectedChat) {
      console.log('🚀 Setting up WebSocket subscriptions for chat:', selectedChat.id);

      // Test WebSocket connection first
      const testChannel = supabase.channel('test-connection')
        .subscribe((status) => {
          console.log('🔗 WebSocket connection status:', status);
        });

      const messageSubscription = subscribeToMessages(selectedChat.id, (newMessage) => {
        console.log('⚡ INSTANT MESSAGE RECEIVED via WebSocket:', newMessage);

        // Avoid duplicates - check if message already exists
        setMessages(prev => {
          const exists = prev.some(msg => msg.id === newMessage.id);
          if (exists) {
            console.log('📝 Message already exists, skipping');
            return prev;
          }
          console.log('✅ Adding new message to chat INSTANTLY');
          return [...prev, newMessage];
        });

        // Update chat list with latest message
        setChats(prev => prev.map(chat =>
          chat.id === selectedChat.id
            ? { ...chat, lastMessage: newMessage, lastActivity: newMessage.timestamp }
            : chat
        ));

        if (newMessage.senderId !== user.id) {
          markMessagesAsRead(selectedChat.id, user.id);
        }
      });

      const statusSubscription = subscribeToMessageStatus(selectedChat.id, (messageId, status) => {
        console.log('📊 Message status update via WebSocket:', messageId, status);
        setMessageStatuses(prev => new Map(prev.set(messageId, status)));
      });

      return () => {
        console.log('🔌 Cleaning up WebSocket subscriptions for chat:', selectedChat.id);
        testChannel.unsubscribe();
        messageSubscription.unsubscribe();
        statusSubscription.unsubscribe();
      };
    }
  }, [selectedChat, user.id]);



  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    const otherParticipant = selectedChat.participants.find(p => p !== user.id);
    if (!otherParticipant) return;

    const messageText = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX

    // Create optimistic message (shows instantly)
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      chatId: selectedChat.id,
      senderId: user.id,
      receiverId: otherParticipant,
      content: messageText,
      encryptedContent: messageText,
      timestamp: new Date().toISOString(),
      isRead: false,
      messageType: 'text',
      deliveryStatus: 'sending'
    };

    // Add message immediately (WhatsApp-style instant display)
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const actualMessage = await sendMessage(
        selectedChat.id,
        user.id,
        otherParticipant,
        messageText
      );

      // Replace optimistic message with real one
      setMessages(prev => prev.map(msg =>
        msg.id === optimisticMessage.id ? actualMessage : msg
      ));

      // Update chat in list
      setChats(prev => prev.map(chat =>
        chat.id === selectedChat.id
          ? { ...chat, lastMessage: actualMessage, lastActivity: actualMessage.timestamp }
          : chat
      ));
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove failed message
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      setNewMessage(messageText); // Restore message text
    }
  };

  const handleFileUpload = async (file: File, messageType: 'image' | 'audio' | 'video' | 'file') => {
    if (!selectedChat) return;

    const otherParticipant = selectedChat.participants.find(p => p !== user.id);
    if (!otherParticipant) return;

    try {
      const { fileUrl, thumbnailUrl } = await uploadMessageFile(file, selectedChat.id, messageType);
      
      const message = await sendMessage(
        selectedChat.id,
        user.id,
        otherParticipant,
        messageType === 'image' ? '📷 Photo' : 
        messageType === 'audio' ? '🎵 Audio message' :
        messageType === 'video' ? '🎥 Video' : file.name,
        messageType,
        fileUrl,
        file.name,
        file.size,
        thumbnailUrl
      );
      
      setMessages(prev => [...prev, message]);
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioFile = new File([audioBlob], 'audio-message.wav', { type: 'audio/wav' }) as File;
        await handleFileUpload(audioFile, 'audio');
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleStartChat = async (friendId: string) => {
    try {
      const chatId = await createOrGetChat(user.id, friendId);
      const newChat: Chat = {
        id: chatId,
        participants: [user.id, friendId],
        lastActivity: new Date().toISOString(),
        isGroup: false,
        unreadCount: 0
      };
      
      setSelectedChat(newChat);
      if (!chats.find(c => c.id === chatId)) {
        setChats(prev => [newChat, ...prev]);
      }
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM d');
    }
  };

  const getOtherParticipantName = (chat: Chat) => {
    const otherParticipantId = chat.participants.find(p => p !== user.id);
    const friend = friends.find(f => f.id === otherParticipantId);
    return friend?.name || 'Unknown User';
  };

  const getOtherParticipantAvatar = (chat: Chat) => {
    const otherParticipantId = chat.participants.find(p => p !== user.id);
    const friend = friends.find(f => f.id === otherParticipantId);
    return friend?.profilePicture || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e';
  };

  const filteredChats = chats.filter(chat =>
    getOtherParticipantName(chat).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !chats.some(chat => chat.participants.includes(friend.id))
  );

  console.log('🔥 Render - selectedChat:', selectedChat?.id);

  if (selectedChat) {
    console.log('🔥 Rendering individual chat view');
    return (
      <div className="flex flex-col h-screen bg-white pb-24">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSelectedChat(null)}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <img
              src={getOtherParticipantAvatar(selectedChat)}
              alt={getOtherParticipantName(selectedChat)}
              className="w-10 h-10 rounded-full"
            />
            <div>
              <h3 className="font-semibold">{getOtherParticipantName(selectedChat)}</h3>
              <p className="text-sm text-gray-500">Online</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <Phone className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <Video className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
          {messages.map((message, index) => {
            const isOwn = message.senderId === user.id;
            const showAvatar = index === 0 || messages[index - 1].senderId !== message.senderId;
            
            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-end space-x-2 max-w-xs ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {!isOwn && showAvatar && (
                    <img
                      src={getOtherParticipantAvatar(selectedChat)}
                      alt=""
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  {!isOwn && !showAvatar && <div className="w-8" />}
                  
                  <div className="space-y-1">
                    {message.messageType === 'text' ? (
                      <div className={`rounded-2xl px-4 py-2 ${
                        isOwn
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <p>{message.content}</p>
                      </div>
                    ) : message.messageType !== 'text' ? (
                      <MediaMessage message={message as any} isOwn={isOwn} />
                    ) : null}
                    
                    <div className={`flex items-center space-x-1 text-xs ${
                      isOwn ? 'justify-end' : 'justify-start'
                    }`}>
                      <span className={isOwn ? 'text-blue-100' : 'text-gray-500'}>
                        {formatMessageTime(message.timestamp)}
                      </span>
                      {isOwn && message.deliveryStatus && (
                        <MessageStatus status={message.deliveryStatus} />
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-200 bg-white fixed bottom-16 left-0 right-0 z-10">
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            
            <button 
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleFileUpload(file, 'image');
                };
                input.click();
              }}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            <div className="flex-1 relative">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="iMessage"
                className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full">
                <Smile className="w-5 h-5" />
              </button>
            </div>

            {newMessage.trim() ? (
              <button
                onClick={handleSendMessage}
                className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
              >
                <Send className="w-5 h-5" />
              </button>
            ) : (
              <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                className={`p-2 rounded-full transition-colors ${
                  isRecording 
                    ? 'bg-red-500 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="*/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const fileType = file.type.startsWith('image/') ? 'image' :
                            file.type.startsWith('audio/') ? 'audio' :
                            file.type.startsWith('video/') ? 'video' : 'file';
              handleFileUpload(file, fileType);
            }
          }}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white pb-16">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Messages</h1>
          <button className="p-2 hover:bg-gray-100 rounded-full">
            <Plus className="w-6 h-6" />
          </button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {/* Existing Chats */}
            {filteredChats.map((chat) => (
              <motion.div
                key={chat.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                onClick={(e) => {
                  console.log('🔥 Chat clicked!', chat.id);
                  console.log('🔥 Current selectedChat:', selectedChat?.id);
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedChat(chat);
                  console.log('🔥 After setSelectedChat');
                }}
              >
                <img
                  src={getOtherParticipantAvatar(chat)}
                  alt={getOtherParticipantName(chat)}
                  className="w-12 h-12 rounded-full mr-3"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{getOtherParticipantName(chat)}</h3>
                    <span className="text-sm text-gray-500">
                      {chat.lastMessage && formatMessageTime(chat.lastMessage.timestamp)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-gray-600 text-sm truncate">
                      {chat.lastMessage?.content || 'No messages yet'}
                    </p>
                    {chat.lastMessage?.deliveryStatus && (
                      <MessageStatus status={chat.lastMessage.deliveryStatus} />
                    )}
                  </div>
                </div>
                {chat.unreadCount > 0 && (
                  <div className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ml-2">
                    {chat.unreadCount}
                  </div>
                )}
              </motion.div>
            ))}

            {/* Friends to Start Chat With */}
            {searchQuery && filteredFriends.length > 0 && (
              <div className="p-4">
                <h3 className="text-sm font-semibold text-gray-500 mb-2">START NEW CHAT</h3>
                {filteredFriends.map((friend) => (
                  <motion.div
                    key={friend.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center p-3 hover:bg-gray-50 cursor-pointer rounded-lg"
                    onClick={() => handleStartChat(friend.id)}
                  >
                    <img
                      src={friend.profilePicture || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e'}
                      alt={friend.name}
                      className="w-10 h-10 rounded-full mr-3"
                    />
                    <div>
                      <h4 className="font-medium">{friend.name}</h4>
                      <p className="text-sm text-gray-500">
                        {friend.isOnline ? 'Online' : `Last seen ${friend.lastSeen || 'recently'}`}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {filteredChats.length === 0 && !searchQuery && (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <MessageCircle className="w-16 h-16 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
                <p className="text-center">Start a conversation with your friends!</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};