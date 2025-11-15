import { supabase } from './supabase';

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

// Request notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

// Show browser notification
export const showNotification = (title: string, options: NotificationOptions = {}) => {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      ...options,
    });

    // Auto close after 5 seconds
    setTimeout(() => notification.close(), 5000);

    return notification;
  }
};

// Get user notifications
export const getUserNotifications = async (userId: string): Promise<Notification[]> => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return data.map(notification => ({
      id: notification.id,
      userId: notification.user_id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      read: notification.read,
      sent: notification.sent,
      createdAt: notification.created_at,
    }));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) throw error;
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
  }
};

// Subscribe to new notifications
export const subscribeToNotifications = (userId: string, callback: (notification: Notification) => void) => {
  return supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        const notification = payload.new as any;
        callback({
          id: notification.id,
          userId: notification.user_id,
          type: notification.type,
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          read: notification.read,
          sent: notification.sent,
          createdAt: notification.created_at,
        });

        // Show browser notification
        showNotification(notification.title, {
          body: notification.body,
          tag: notification.id,
        });
      }
    )
    .subscribe();
};

// Update notification preferences
export const updateNotificationPreferences = async (
  userId: string, 
  preferences: Record<string, boolean>
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ notification_preferences: preferences })
      .eq('id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating notification preferences:', error);
  }
};

// Register push token
export const registerPushToken = async (
  userId: string, 
  token: string, 
  deviceType: 'ios' | 'android' | 'web'
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        push_token: token,
        device_type: deviceType 
      })
      .eq('id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Error registering push token:', error);
  }
};