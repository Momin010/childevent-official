import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { User, Event, Chat, Message, Friend, FriendSuggestion } from '../types';

interface AppState {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  
  // UI state
  activeTab: string;
  theme: string;
  isLoading: boolean;
  error: string | null;
  
  // Data state
  events: Event[];
  chats: Chat[];
  friends: Friend[];
  unreadMessages: number;
  
  // Actions
  setUser: (user: User | null) => void;
  setAuthLoading: (loading: boolean) => void;
  setActiveTab: (tab: string) => void;
  setTheme: (theme: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setEvents: (events: Event[]) => void;
  setChats: (chats: Chat[]) => void;
  setFriends: (friends: Friend[]) => void;
  setUnreadMessages: (count: number) => void;
  clearError: () => void;
  reset: () => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        isAuthenticated: false,
        authLoading: true,
        activeTab: 'home',
        theme: 'light',
        isLoading: false,
        error: null,
        events: [],
        chats: [],
        friends: [],
        unreadMessages: 0,

        // Actions
        setUser: (user) => set({ user, isAuthenticated: !!user }),
        setAuthLoading: (authLoading) => set({ authLoading }),
        setActiveTab: (activeTab) => set({ activeTab }),
        setTheme: (theme) => set({ theme }),
        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),
        setEvents: (events) => set({ events }),
        setChats: (chats) => set({ chats }),
        setFriends: (friends) => set({ friends }),
        setUnreadMessages: (unreadMessages) => set({ unreadMessages }),
        clearError: () => set({ error: null }),
        reset: () => set({
          user: null,
          isAuthenticated: false,
          activeTab: 'home',
          events: [],
          chats: [],
          friends: [],
          unreadMessages: 0,
          error: null
        }),
      }),
      {
        name: 'app-storage',
        partialize: (state) => ({ 
          theme: state.theme,
          activeTab: state.activeTab 
        }),
      }
    ),
    { name: 'app-store' }
  )
);