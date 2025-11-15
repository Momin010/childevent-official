export interface User {
  id: string;
  username: string;
  name: string;
  age?: number;
  isParent?: boolean;
  numberOfChildren?: number;
  hobbies?: string[];
  organizationName?: string;
  industry?: string;
  website?: string;
  roleInOrganization?: string;
  profilePicture?: string;
  coverPhoto?: string;
  bio?: string;
  friends: Friend[];
  bookedEvents: string[];
  attendedEvents: string[];
  bookmarkedEvents: string[];
  lovedEvents: string[];
  following: string[];
  role: 'user' | 'admin' | 'organizer';
  lastLogin: string;
  theme: Theme['id'];
  contacts?: Contact[];
  notificationPreferences?: Record<string, boolean>;
}

export interface Friend {
  id: string;
  name: string;
  profilePicture?: string;
  status: 'friend' | 'pending' | 'requested';
  lastSeen?: string;
  isOnline?: boolean;
}

export interface Contact {
  id: string;
  name: string;
  phoneNumber?: string;
  email?: string;
  profilePicture?: string;
  isAppUser?: boolean;
  userId?: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  receiverId: string;
  content: string;
  encryptedContent: string;
  timestamp: string;
  isRead: boolean;
  messageType: 'text' | 'image' | 'audio' | 'video' | 'file' | 'location';
  deliveryStatus?: 'sending' | 'sent' | 'delivered' | 'read';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  thumbnailUrl?: string;
  duration?: number; // for audio/video in seconds
  replyTo?: string;
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: Message;
  lastActivity: string;
  isGroup: boolean;
  groupName?: string;
  groupImage?: string;
  unreadCount: number;
}

export interface FriendSuggestion {
  id: string;
  name: string;
  profilePicture?: string;
  mutualFriends: number;
  source: 'contacts' | 'community' | 'events' | 'mutual';
  phoneNumber?: string;
  email?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  date: string;
  time: string;
  location: string;
  organizer: {
    name: string;
    id: string;
    profilePicture?: string;
    followers: number;
    events: number;
  };
  interestedCount: number;
  goingCount: number;
  likes: number;
  comments: Comment[];
  attendees: {
    userId: string;
    name: string;
    profilePicture?: string;
  }[];
  isBookmarked?: boolean;
  isLoved?: boolean;
  clicks: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  profilePicture?: string;
  text: string;
  timestamp: string;
  likes: number;
}

export interface AuthUser {
  id: string;
  username: string;
  password: string;
  role: 'user' | 'admin';
  lastLogin: string;
}

export interface CalendarEvent {
  date: Date;
  events: Event[];
}

export interface Analytics {
  newSignups: {
    date: string;
    count: number;
  }[];
  logins: {
    date: string;
    count: number;
  }[];
  eventEngagement: {
    eventId: string;
    eventTitle: string;
    clicks: number;
    signups: number;
    shares: number;
    likes: number;
  }[];
  userActivity: {
    date: string;
    activeUsers: number;
    eventCreations: number;
    eventSignups: number;
  }[];
}

export interface Theme {
  id: 'light' | 'dark' | 'gradient';
  name: string;
}

export interface ThemeConfig {
  background: string;
  text: string;
  primary: string;
  secondary: string;
  accent: string;
  buttonText: string;
  buttonBackground: string;
  buttonHover: string;
  cardBackground: string;
  borderColor: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'message' | 'friend_request' | 'event_reminder' | 'event_update';
  title: string;
  body: string;
  data: Record<string, any>;
  read: boolean;
  sent: boolean;
  createdAt: string;
}