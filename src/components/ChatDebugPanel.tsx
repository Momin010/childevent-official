import React, { useState } from 'react';
import { Bug, ChevronDown, ChevronUp } from 'lucide-react';
import { getUserFriends } from '../lib/friends';
import { getUserChats, getChatMessages } from '../lib/chat';
import type { User } from '../types';

interface ChatDebugPanelProps {
  user: User;
}

export const ChatDebugPanel: React.FC<ChatDebugPanelProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const [chats, friends] = await Promise.all([
        getUserChats(user.id),
        getUserFriends(user.id)
      ]);

      let chatMessages = [];
      if (chats.length > 0) {
        const firstChat = chats[0];
        const otherParticipant = firstChat.participants.find(p => p !== user.id) || '';
        chatMessages = await getChatMessages(firstChat.id, user.id, otherParticipant);
      }

      setDebugInfo({
        userId: user.id,
        username: user.username,
        chatsCount: chats.length,
        friendsCount: friends.length,
        chats: chats.map(chat => ({
          id: chat.id,
          participants: chat.participants,
          lastActivity: chat.lastActivity,
          unreadCount: chat.unreadCount
        })),
        friends: friends.map(friend => ({
          id: friend.id,
          name: friend.name,
          status: friend.status,
          isOnline: friend.isOnline
        })),
        messagesInFirstChat: chatMessages.length,
        sampleMessages: chatMessages.slice(-3).map(msg => ({
          id: msg.id,
          content: msg.content,
          senderId: msg.senderId,
          timestamp: msg.timestamp
        }))
      });
    } catch (error) {
      setDebugInfo({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-20 right-4 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-purple-500 text-white p-3 rounded-full shadow-lg hover:bg-purple-600 transition-colors"
          title="Chat Debug Panel"
        >
          <Bug className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-xl max-w-md w-80">
      <div className="flex items-center justify-between p-3 border-b bg-purple-50">
        <div className="flex items-center space-x-2">
          <Bug className="w-4 h-4 text-purple-600" />
          <span className="font-medium text-purple-800">Chat Debug</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
      
      <div className="p-3 max-h-96 overflow-y-auto">
        <button
          onClick={runDiagnostics}
          disabled={loading}
          className="w-full bg-purple-500 text-white py-2 px-4 rounded mb-3 hover:bg-purple-600 disabled:opacity-50"
        >
          {loading ? 'Running...' : 'Run Diagnostics'}
        </button>

        {debugInfo && (
          <div className="space-y-2 text-sm">
            {debugInfo.error ? (
              <div className="bg-red-50 border border-red-200 rounded p-2">
                <strong className="text-red-800">Error:</strong>
                <div className="text-red-600">{debugInfo.error}</div>
              </div>
            ) : (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded p-2">
                  <strong>User Info:</strong>
                  <div>ID: {debugInfo.userId}</div>
                  <div>Username: {debugInfo.username}</div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded p-2">
                  <strong>Chat Status:</strong>
                  <div>Chats: {debugInfo.chatsCount}</div>
                  <div>Friends: {debugInfo.friendsCount}</div>
                  <div>Messages in first chat: {debugInfo.messagesInFirstChat}</div>
                </div>

                {debugInfo.chats.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                    <strong>First Chat:</strong>
                    <div>ID: {debugInfo.chats[0].id}</div>
                    <div>Participants: {debugInfo.chats[0].participants.join(', ')}</div>
                    <div>Unread: {debugInfo.chats[0].unreadCount}</div>
                  </div>
                )}

                {debugInfo.friends.length > 0 && (
                  <div className="bg-purple-50 border border-purple-200 rounded p-2">
                    <strong>Friends:</strong>
                    {debugInfo.friends.map((friend: any) => (
                      <div key={friend.id} className="text-xs">
                        {friend.name} ({friend.status}) {friend.isOnline ? '🟢' : '🔴'}
                      </div>
                    ))}
                  </div>
                )}

                {debugInfo.sampleMessages.length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded p-2">
                    <strong>Recent Messages:</strong>
                    {debugInfo.sampleMessages.map((msg: any) => (
                      <div key={msg.id} className="text-xs border-b border-gray-200 py-1">
                        <div className="font-medium">{msg.senderId === debugInfo.userId ? 'You' : 'Other'}:</div>
                        <div>{msg.content}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
