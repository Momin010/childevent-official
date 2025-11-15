import React from 'react';
import { Home, Calendar, User, MessageCircle, Menu, X } from 'lucide-react';

interface ResponsiveNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  unreadMessages?: number;
}

export const ResponsiveNavigation: React.FC<ResponsiveNavigationProps> = ({
  activeTab,
  onTabChange,
  unreadMessages = 0,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'calendar', icon: Calendar, label: 'Calendar' },
    { id: 'chat', icon: MessageCircle, label: 'Chat', badge: unreadMessages },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  // Desktop sidebar
  const Sidebar = () => (
    <div className="hidden md:flex fixed left-0 top-0 h-full w-16 bg-white border-r border-gray-200 flex-col items-center py-4 space-y-4">
      {tabs.map(({ id, icon: Icon, label, badge }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          className={`flex flex-col items-center p-3 rounded-lg relative group ${
            activeTab === id
              ? 'text-blue-500 bg-blue-50'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
          title={label}
        >
          <div className="relative">
            <Icon className="w-6 h-6" />
            {badge && badge > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-3 h-3 flex items-center justify-center">
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );

  // Mobile bottom navigation
  const MobileNav = () => (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-1">
      <div className="flex justify-around items-center max-w-lg mx-auto">
        {tabs.map(({ id, icon: Icon, label, badge }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`flex flex-col items-center p-1 relative ${
              activeTab === id
                ? 'text-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="relative">
              <Icon className="w-6 h-6" />
              {badge && badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-3 h-3 flex items-center justify-center">
                </span>
              )}
            </div>
            <span className="text-xs mt-1">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <Sidebar />
      <MobileNav />
    </>
  );
};