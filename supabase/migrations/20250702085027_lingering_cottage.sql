/*
  # Chat System Database Schema

  1. New Tables
    - `profiles` - User profiles with additional chat-related fields
    - `chats` - Chat conversations between users
    - `messages` - Individual messages within chats
    - `friendships` - Friend relationships between users
    - `friend_requests` - Pending friend requests

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for chat participants to access messages

  3. Features
    - Real-time messaging with encryption support
    - Friend system with requests and suggestions
    - Group chat support (for future expansion)
    - Message read status tracking
*/

-- Create profiles table for user data
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  name text NOT NULL,
  profile_picture text,
  cover_photo text,
  bio text,
  age integer,
  is_parent boolean DEFAULT false,
  number_of_children integer DEFAULT 0,
  hobbies text[] DEFAULT '{}',
  phone_number text,
  email text,
  last_seen timestamptz DEFAULT now(),
  is_online boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create chats table
CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participants uuid[] NOT NULL,
  is_group boolean DEFAULT false,
  group_name text,
  group_image text,
  last_message_id uuid,
  last_activity timestamptz DEFAULT now(),
  unread_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  encrypted_content text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
  reply_to uuid REFERENCES messages(id),
  is_read boolean DEFAULT false,
  timestamp timestamptz DEFAULT now()
);

-- Create friendships table
CREATE TABLE IF NOT EXISTS friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  friend_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Create friend_requests table
CREATE TABLE IF NOT EXISTS friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(from_user_id, to_user_id)
);

-- Add foreign key constraint for last_message_id
ALTER TABLE chats ADD CONSTRAINT chats_last_message_id_fkey 
  FOREIGN KEY (last_message_id) REFERENCES messages(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chats_participants ON chats USING GIN(participants);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_to_user ON friend_requests(to_user_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Chats policies
CREATE POLICY "Users can view their chats"
  ON chats FOR SELECT
  TO authenticated
  USING (auth.uid() = ANY(participants));

CREATE POLICY "Users can create chats"
  ON chats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = ANY(participants));

CREATE POLICY "Users can update their chats"
  ON chats FOR UPDATE
  TO authenticated
  USING (auth.uid() = ANY(participants));

-- Messages policies
CREATE POLICY "Users can view messages in their chats"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats 
      WHERE chats.id = messages.chat_id 
      AND auth.uid() = ANY(chats.participants)
    )
  );

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Friendships policies
CREATE POLICY "Users can view friendships"
  ON friendships FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friendships"
  ON friendships FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their friendships"
  ON friendships FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Friend requests policies
CREATE POLICY "Users can view their friend requests"
  ON friend_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can send friend requests"
  ON friend_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update friend requests"
  ON friend_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = to_user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_friend_requests_updated_at 
  BEFORE UPDATE ON friend_requests 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();