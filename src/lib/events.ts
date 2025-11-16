import { supabase } from './supabase';
import type { Event } from '../types';

// Get all events
export const getEvents = async (): Promise<Event[]> => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        organizers (
          id,
          name,
          profile_picture,
          followers_count,
          events_count
        )
      `)
      .eq('status', 'active')
      .order('date', { ascending: true });

    if (error) throw error;

    return data.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      imageUrl: event.image_url,
      date: event.date,
      time: event.time,
      location: event.location,
      organizer: {
        id: event.organizers.id,
        name: event.organizers.name,
        profilePicture: event.organizers.profile_picture,
        followers: event.organizers.followers_count || 0,
        events: event.organizers.events_count || 0,
      },
      interestedCount: event.interested_count || 0,
      goingCount: event.going_count || 0,
      likes: event.likes_count || 0,
      comments: [], // Will be loaded separately if needed
      attendees: [], // Will be loaded separately if needed
      isBookmarked: false, // Will be set based on user data
      isLoved: false, // Will be set based on user data
      clicks: event.clicks_count || 0,
      createdAt: event.created_at,
    }));
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
};

// Get user's bookmarked events
export const getUserBookmarkedEvents = async (userId: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('event_bookmarks')
      .select('event_id')
      .eq('user_id', userId);

    if (error) throw error;
    return data.map(bookmark => bookmark.event_id);
  } catch (error) {
    console.error('Error fetching bookmarked events:', error);
    return [];
  }
};

// Get user's liked events
export const getUserLikedEvents = async (userId: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('event_likes')
      .select('event_id')
      .eq('user_id', userId);

    if (error) throw error;
    return data.map(like => like.event_id);
  } catch (error) {
    console.error('Error fetching liked events:', error);
    return [];
  }
};

// Get user's attending events
export const getUserAttendingEvents = async (userId: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('event_attendees')
      .select('event_id')
      .eq('user_id', userId)
      .eq('status', 'going');

    if (error) throw error;
    return data.map(attendee => attendee.event_id);
  } catch (error) {
    console.error('Error fetching attending events:', error);
    return [];
  }
};

// Toggle event bookmark
export const toggleEventBookmark = async (eventId: string, userId: string): Promise<boolean> => {
  try {
    // Check if already bookmarked
    const { data: existing, error: checkError } = await supabase
      .from('event_bookmarks')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
      // Remove bookmark
      const { error: deleteError } = await supabase
        .from('event_bookmarks')
        .delete()
        .eq('id', existing.id);

      if (deleteError) throw deleteError;
      return false;
    } else {
      // Add bookmark
      const { error: insertError } = await supabase
        .from('event_bookmarks')
        .insert({
          event_id: eventId,
          user_id: userId
        });

      if (insertError) throw insertError;
      return true;
    }
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    throw error;
  }
};

// Toggle event like
export const toggleEventLike = async (eventId: string, userId: string): Promise<boolean> => {
  try {
    // Check if already liked
    const { data: existing, error: checkError } = await supabase
      .from('event_likes')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
      // Remove like
      const { error: deleteError } = await supabase
        .from('event_likes')
        .delete()
        .eq('id', existing.id);

      if (deleteError) throw deleteError;
      return false;
    } else {
      // Add like
      const { error: insertError } = await supabase
        .from('event_likes')
        .insert({
          event_id: eventId,
          user_id: userId
        });

      if (insertError) throw insertError;
      return true;
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    throw error;
  }
};

// Sign up for event
export const signUpForEvent = async (eventId: string, userId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('event_attendees')
      .upsert({
        event_id: eventId,
        user_id: userId,
        status: 'going'
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error signing up for event:', error);
    throw error;
  }
};

// Get event attendees
export const getEventAttendees = async (eventId: string) => {
  try {
    const { data, error } = await supabase
      .from('event_attendees')
      .select(`
        user_id,
        profiles (
          id,
          name,
          profile_picture
        )
      `)
      .eq('event_id', eventId)
      .eq('status', 'going');

    if (error) throw error;

    return data.map(attendee => ({
      userId: attendee.profiles.id,
      name: attendee.profiles.name,
      profilePicture: attendee.profiles.profile_picture
    }));
  } catch (error) {
    console.error('Error fetching event attendees:', error);
    return [];
  }
};

// Create new event
export const createEvent = async (eventData: {
  title: string;
  description: string;
  imageUrl: string;
  date: string;
  time: string;
  location: string;
  category?: string;
  maxAttendees?: number;
  price: number;
  tags: string[];
  organizerId: string;
}): Promise<Event> => {
  try {
    const { data, error } = await supabase
      .from('events')
      .insert({
        title: eventData.title,
        description: eventData.description,
        image_url: eventData.imageUrl,
        date: eventData.date,
        time: eventData.time,
        location: eventData.location,
        category: eventData.category,
        max_attendees: eventData.maxAttendees,
        price: eventData.price,
        tags: eventData.tags,
        organizer_id: eventData.organizerId,
      })
      .select()
      .single();

    if (error) throw error;

    // Get organizer profile for the response
    const { data: organizerData, error: orgError } = await supabase
      .from('profiles')
      .select('id, name, profile_picture')
      .eq('id', eventData.organizerId)
      .single();

    if (orgError) throw orgError;

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      imageUrl: data.image_url,
      date: data.date,
      time: data.time,
      location: data.location,
      organizer: {
        id: organizerData.id,
        name: organizerData.name,
        profilePicture: organizerData.profile_picture,
        followers: 0, // Will be calculated separately
        events: 0, // Will be calculated separately
      },
      interestedCount: 0,
      goingCount: 0,
      likes: 0,
      comments: [],
      attendees: [],
      isBookmarked: false,
      isLoved: false,
      clicks: 0,
      createdAt: data.created_at,
    };
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
};

// Get events created by a specific organizer
export const getOrganizerEvents = async (organizerId: string): Promise<Event[]> => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        profiles!events_organizer_id_fkey (
          id,
          name,
          profile_picture
        )
      `)
      .eq('organizer_id', organizerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      imageUrl: event.image_url,
      date: event.date,
      time: event.time,
      location: event.location,
      organizer: {
        id: event.profiles.id,
        name: event.profiles.name,
        profilePicture: event.profiles.profile_picture,
        followers: 0, // Will be calculated separately
        events: 0, // Will be calculated separately
      },
      interestedCount: event.signups_count || 0,
      goingCount: event.signups_count || 0, // Using signups as going count
      likes: event.likes_count || 0,
      comments: [], // Will be loaded separately if needed
      attendees: [], // Will be loaded separately if needed
      isBookmarked: false, // Will be set based on user data
      isLoved: false, // Will be set based on user data
      clicks: event.clicks_count || 0,
      createdAt: event.created_at,
    }));
  } catch (error) {
    console.error('Error fetching organizer events:', error);
    return [];
  }
};

// Increment event clicks
export const incrementEventClicks = async (eventId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('events')
      .update({ clicks_count: supabase.sql`clicks_count + 1` })
      .eq('id', eventId);

    if (error) throw error;
  } catch (error) {
    console.error('Error incrementing event clicks:', error);
  }
};