import React, { useState, useEffect } from 'react';
import { ResponsiveNavigation } from './ResponsiveNavigation';
import { OrganizerDashboard } from './OrganizerDashboard';
import { ProfileSection } from './ProfileSection';
import { ChatSection } from './ChatSection';
import { LoadingSpinner } from './LoadingSpinner';
import { ToastContainer } from './Toast';
import { getUnreadMessageCount } from '../lib/chat';
import { useAppStore } from '../store/appStore';
import { useToast } from '../hooks/useToast';
import type { User } from '../types';

interface OrganizerAppProps {
  user: User;
  onSignOut: () => void;
}

export const OrganizerApp: React.FC<OrganizerAppProps> = ({ user, onSignOut }) => {
  const {
    activeTab,
    setActiveTab,
    unreadMessages,
    setUnreadMessages,
  } = useAppStore();

  const { toasts, removeToast } = useToast();

  useEffect(() => {
    loadUnreadMessages();
  }, []);

  const loadUnreadMessages = async () => {
    try {
      const count = await getUnreadMessageCount(user.id);
      setUnreadMessages(count);
    } catch (error) {
      console.error('Error loading unread messages:', error);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <OrganizerDashboard />;
      case 'chat':
        return <ChatSection user={user} />;
      case 'profile':
        return (
          <ProfileSection
            user={user}
            bookedEvents={[]} // Organizers might have different event logic
            attendedEvents={[]}
            onUpdateProfile={(updates) => {/* Handle profile updates */}}
            onSignOut={onSignOut}
          />
        );
      default:
        return <OrganizerDashboard />;
    }
  };

  return (
    <div className="min-h-screen">
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Main Content */}
      <div className="md:ml-16">
        {renderContent()}
      </div>

      <ResponsiveNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unreadMessages={unreadMessages}
      />
    </div>
  );
};