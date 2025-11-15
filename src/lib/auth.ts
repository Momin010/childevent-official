import { z } from 'zod';
import { supabase } from './supabase';

// Validation schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().optional(),
});

export const signUpSchema = loginSchema.extend({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export type LoginCredentials = z.infer<typeof loginSchema>;
export type SignUpCredentials = z.infer<typeof signUpSchema>;

// Error messages
export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  USER_NOT_FOUND: 'No user found with this email',
  EMAIL_IN_USE: 'This email is already in use',
  WEAK_PASSWORD: 'Password is too weak',
  NETWORK_ERROR: 'Network error. Please try again',
  UNKNOWN: 'An unexpected error occurred',
  NOT_CONFIGURED: 'Please connect to Supabase to continue',
  GOOGLE_SIGNIN_FAILED: 'Google sign-in failed. Please try again.',
} as const;

// Test user mappings
const TEST_USER_IDS = {
  'tester1': '550e8400-e29b-41d4-a716-446655440001',
  'tester2': '550e8400-e29b-41d4-a716-446655440002',
} as const;

// Enhanced error handling
const handleAuthError = (error: any): string => {
  console.error('Auth error:', error);
  
  if (!error) return AUTH_ERRORS.UNKNOWN;
  
  const message = error.message || error.toString();
  
  if (message.includes('Invalid login credentials')) {
    return AUTH_ERRORS.INVALID_CREDENTIALS;
  }
  if (message.includes('already registered')) {
    return AUTH_ERRORS.EMAIL_IN_USE;
  }
  if (message.includes('Failed to fetch') || message.includes('network')) {
    return AUTH_ERRORS.NETWORK_ERROR;
  }
  if (message.includes('weak password')) {
    return AUTH_ERRORS.WEAK_PASSWORD;
  }
  
  return message || AUTH_ERRORS.UNKNOWN;
};

// Sign in with email/password
export const signIn = async ({ email, password, rememberMe }: LoginCredentials) => {
  try {
    if (!supabase) {
      throw new Error(AUTH_ERRORS.NOT_CONFIGURED);
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(handleAuthError(error));
    }

    // Store remember me preference
    if (rememberMe) {
      localStorage.setItem('rememberMe', 'true');
    }

    return data;
  } catch (err: any) {
    throw new Error(handleAuthError(err));
  }
};

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    if (!supabase) {
      throw new Error(AUTH_ERRORS.NOT_CONFIGURED);
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      throw new Error(handleAuthError(error));
    }

    return data;
  } catch (err: any) {
    throw new Error(handleAuthError(err));
  }
};

// Sign up
export const signUp = async ({ email, password, username }: SignUpCredentials) => {
  try {
    if (!supabase) {
      throw new Error(AUTH_ERRORS.NOT_CONFIGURED);
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    });

    if (error) {
      throw new Error(handleAuthError(error));
    }

    return data;
  } catch (error: any) {
    throw new Error(handleAuthError(error));
  }
};

// Sign out
export const signOut = async () => {
  try {
    if (!supabase) {
      throw new Error(AUTH_ERRORS.NOT_CONFIGURED);
    }

    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    localStorage.removeItem('rememberMe');
    sessionStorage.clear();
  } catch (error) {
    throw new Error(handleAuthError(error));
  }
};

// Get current session
export const getCurrentSession = async () => {
  try {
    if (!supabase) {
      throw new Error(AUTH_ERRORS.NOT_CONFIGURED);
    }

    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  } catch (error) {
    throw new Error(handleAuthError(error));
  }
};

// Listen to auth state change
export const onAuthStateChange = (callback: (session: any) => void) => {
  if (!supabase) {
    throw new Error(AUTH_ERRORS.NOT_CONFIGURED);
  }

  return supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event);
    callback(session);
  });
};

// Create or update user profile with test user handling
export const createUserProfile = async (userId: string, profileData: any) => {
  try {
    if (!supabase) {
      throw new Error(AUTH_ERRORS.NOT_CONFIGURED);
    }

    // Check if this is a test user and use the predefined ID
    let actualUserId = userId;
    if (profileData.username && profileData.username in TEST_USER_IDS) {
      actualUserId = TEST_USER_IDS[profileData.username as keyof typeof TEST_USER_IDS];
      
      // For test users, also set up the friendship and chat data
      await setupTestUserData(profileData.username, actualUserId);
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: actualUserId,
        ...profileData,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw new Error(handleAuthError(error));
  }
};

// Setup test user data
const setupTestUserData = async (username: string, userId: string) => {
  try {
    const otherTestUser = username === 'tester1' ? 'tester2' : 'tester1';
    const otherUserId = TEST_USER_IDS[otherTestUser as keyof typeof TEST_USER_IDS];
    
    // Check if other test user exists
    const { data: otherUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', otherUserId)
      .single();

    if (otherUser) {
      // Both users exist, set up friendship and chat
      await setupTestUserFriendshipAndChat(userId, otherUserId);
    }
  } catch (error) {
    console.log('Other test user not found yet');
  }
};

// Setup friendship and chat for test users
export const setupTestUserFriendshipAndChat = async (user1Id: string, user2Id: string) => {
  try {
    console.log('Setting up test data for users:', user1Id, user2Id);

    // First, ensure both test user profiles exist
    await supabase
      .from('profiles')
      .upsert([
        {
          id: user1Id,
          username: 'tester1',
          name: 'Test User 1',
          age: 28,
          is_parent: true,
          number_of_children: 2,
          hobbies: ['reading', 'hiking'],
          bio: 'Test user for development',
          profile_picture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e',
          email: 'tester1@example.com',
          is_online: true,
          last_seen: new Date().toISOString(),
          created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: user2Id,
          username: 'tester2',
          name: 'Test User 2',
          age: 32,
          is_parent: true,
          number_of_children: 1,
          hobbies: ['cooking', 'photography'],
          bio: 'Another test user for development',
          profile_picture: 'https://images.unsplash.com/photo-1494790108755-2616b612b786',
          email: 'tester2@example.com',
          is_online: false,
          last_seen: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]);

    // Create friendships
    await supabase
      .from('friendships')
      .upsert([
        {
          user_id: user1Id,
          friend_id: user2Id,
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          user_id: user2Id,
          friend_id: user1Id,
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]);

    // Create chat
    const testChatId = '123e4567-e89b-12d3-a456-426614174000';
    await supabase
      .from('chats')
      .upsert({
        id: testChatId,
        participants: [user1Id, user2Id].sort(),
        is_group: false,
        last_activity: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        unread_count: 0,
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      });

    // Create initial messages
    const messages = [
      {
        id: '111e4567-e89b-12d3-a456-426614174001',
        chat_id: testChatId,
        sender_id: TEST_USER_IDS.tester1,
        receiver_id: TEST_USER_IDS.tester2,
        content: 'Hey there! 👋',
        encrypted_content: 'encrypted_content_placeholder',
        message_type: 'text',
        delivery_status: 'read',
        is_read: true,
        timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '222e4567-e89b-12d3-a456-426614174002',
        chat_id: testChatId,
        sender_id: TEST_USER_IDS.tester2,
        receiver_id: TEST_USER_IDS.tester1,
        content: 'Hi! How are you doing?',
        encrypted_content: 'encrypted_content_placeholder',
        message_type: 'text',
        delivery_status: 'read',
        is_read: true,
        timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString()
      },
      {
        id: '333e4567-e89b-12d3-a456-426614174003',
        chat_id: testChatId,
        sender_id: TEST_USER_IDS.tester1,
        receiver_id: TEST_USER_IDS.tester2,
        content: 'Great! Ready to test the messaging system?',
        encrypted_content: 'encrypted_content_placeholder',
        message_type: 'text',
        delivery_status: 'read',
        is_read: true,
        timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString()
      }
    ];

    await supabase.from('messages').upsert(messages);

    // Update chat with last message
    await supabase
      .from('chats')
      .update({
        last_message_id: '333e4567-e89b-12d3-a456-426614174003',
        last_activity: new Date(Date.now() - 60 * 60 * 1000).toISOString()
      })
      .eq('id', testChatId);

    // Create read receipts
    const readReceipts = [
      {
        message_id: '111e4567-e89b-12d3-a456-426614174001',
        user_id: TEST_USER_IDS.tester2,
        read_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 60 * 1000).toISOString()
      },
      {
        message_id: '222e4567-e89b-12d3-a456-426614174002',
        user_id: TEST_USER_IDS.tester1,
        read_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 6 * 60 * 1000).toISOString()
      },
      {
        message_id: '333e4567-e89b-12d3-a456-426614174003',
        user_id: TEST_USER_IDS.tester2,
        read_at: new Date(Date.now() - 55 * 60 * 1000).toISOString()
      }
    ];

    await supabase.from('message_read_receipts').upsert(readReceipts);

  } catch (error) {
    console.error('Error setting up test user data:', error);
  }
};

// Get user profile
export const getUserProfile = async (userId: string) => {
  try {
    if (!supabase) {
      throw new Error(AUTH_ERRORS.NOT_CONFIGURED);
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw new Error(handleAuthError(error));
  }
};

// Get user profile by username
export const getUserProfileByUsername = async (username: string) => {
  try {
    if (!supabase) {
      throw new Error(AUTH_ERRORS.NOT_CONFIGURED);
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw new Error(handleAuthError(error));
  }
};