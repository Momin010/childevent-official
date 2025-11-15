import { supabase } from './supabase';
import type { Friend, FriendSuggestion, Contact } from '../types';

// Send friend request
export const sendFriendRequest = async (fromUserId: string, toUserId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('friend_requests')
      .insert({
        from_user_id: fromUserId,
        to_user_id: toUserId,
        status: 'pending',
        created_at: new Date().toISOString()
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error sending friend request:', error);
    throw error;
  }
};

// Accept friend request
export const acceptFriendRequest = async (requestId: string): Promise<void> => {
  try {
    // Update request status
    const { error: updateError } = await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (updateError) throw updateError;

    // Get request details to create friendship
    const { data: request, error: fetchError } = await supabase
      .from('friend_requests')
      .select('from_user_id, to_user_id')
      .eq('id', requestId)
      .single();

    if (fetchError) throw fetchError;

    // Create friendship entries for both users
    const { error: friendshipError } = await supabase
      .from('friendships')
      .insert([
        {
          user_id: request.from_user_id,
          friend_id: request.to_user_id,
          created_at: new Date().toISOString()
        },
        {
          user_id: request.to_user_id,
          friend_id: request.from_user_id,
          created_at: new Date().toISOString()
        }
      ]);

    if (friendshipError) throw friendshipError;
  } catch (error) {
    console.error('Error accepting friend request:', error);
    throw error;
  }
};

// Get user's friends
export const getUserFriends = async (userId: string): Promise<Friend[]> => {
  try {
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        friend_id,
        profiles!friendships_friend_id_fkey (
          id,
          username,
          name,
          profile_picture,
          last_seen,
          is_online
        )
      `)
      .eq('user_id', userId);

    if (error) throw error;

    return data.map(friendship => ({
      id: friendship.profiles.id,
      name: friendship.profiles.name || friendship.profiles.username,
      profilePicture: friendship.profiles.profile_picture,
      status: 'friend' as const,
      lastSeen: friendship.profiles.last_seen,
      isOnline: friendship.profiles.is_online
    }));
  } catch (error) {
    console.error('Error getting user friends:', error);
    return [];
  }
};

// Get friendship status between two users
export const getFriendshipStatus = async (currentUserId: string, targetUserId: string): Promise<string> => {
  try {
    // Check if they are already friends
    const { data: friendship, error: friendshipError } = await supabase
      .from('friendships')
      .select('id')
      .eq('user_id', currentUserId)
      .eq('friend_id', targetUserId)
      .maybeSingle();

    if (friendshipError) {
      console.error('Friendship check error:', friendshipError);
      return 'none';
    }

    if (friendship) {
      return 'friends';
    }

    // Check for pending friend requests (sent by current user)
    const { data: sentRequest, error: sentError } = await supabase
      .from('friend_requests')
      .select('id')
      .eq('from_user_id', currentUserId)
      .eq('to_user_id', targetUserId)
      .eq('status', 'pending')
      .maybeSingle();

    if (sentError) {
      console.error('Sent request check error:', sentError);
      return 'none';
    }

    if (sentRequest) {
      return 'pending_sent';
    }

    // Check for pending friend requests (received by current user)
    const { data: receivedRequest, error: receivedError } = await supabase
      .from('friend_requests')
      .select('id')
      .eq('from_user_id', targetUserId)
      .eq('to_user_id', currentUserId)
      .eq('status', 'pending')
      .maybeSingle();

    if (receivedError) {
      console.error('Received request check error:', receivedError);
      return 'none';
    }

    if (receivedRequest) {
      return 'pending_received';
    }

    return 'none';
  } catch (error) {
    console.error('Error getting friendship status:', error);
    return 'none';
  }
};

// Generate friend suggestions from actual users
export const getFriendSuggestions = async (userId: string): Promise<FriendSuggestion[]> => {
  try {
    // Get users who are not already friends and not the current user
    const { data: suggestions, error } = await supabase
      .from('profiles')
      .select('id, username, name, profile_picture, phone_number, email')
      .neq('id', userId)
      .limit(20);

    if (error) throw error;

    // Filter out existing friends and pending requests
    const filteredSuggestions: FriendSuggestion[] = [];
    
    for (const user of suggestions) {
      const status = await getFriendshipStatus(userId, user.id);
      if (status === 'none') {
        filteredSuggestions.push({
          id: user.id,
          name: user.name || user.username,
          profilePicture: user.profile_picture,
          mutualFriends: 0, // Could be calculated with a more complex query
          source: 'community',
          phoneNumber: user.phone_number,
          email: user.email
        });
      }
    }

    return filteredSuggestions;
  } catch (error) {
    console.error('Error getting friend suggestions:', error);
    return [];
  }
};

// Import contacts (returns empty array - real implementation would use device contacts)
export const importContacts = async (): Promise<Contact[]> => {
  // In a real app, this would integrate with device contacts API
  // For now, return empty array since we're removing mock data
  return [];
};