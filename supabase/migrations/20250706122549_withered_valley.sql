/*
  # Setup Test Users for Messaging

  1. Create test data that works with the existing auth system
  2. Set up friendship and chat between test users
  3. Add initial message history for testing

  Note: This creates the data structure but the actual user profiles will be created
  when users sign up with the test usernames through the normal auth flow.
*/

-- First, let's create a function to handle test user setup
CREATE OR REPLACE FUNCTION setup_test_user_data()
RETURNS void AS $$
DECLARE
  test_user_1_id uuid := '550e8400-e29b-41d4-a716-446655440001';
  test_user_2_id uuid := '550e8400-e29b-41d4-a716-446655440002';
  test_chat_id uuid := '123e4567-e89b-12d3-a456-426614174000';
BEGIN
  -- We'll create the friendship and chat structure that will be activated
  -- when the actual users sign up with the test usernames
  
  -- Create a placeholder chat (will be linked when users exist)
  INSERT INTO chats (id, participants, is_group, last_activity, unread_count, created_at)
  VALUES (
    test_chat_id,
    ARRAY[test_user_1_id, test_user_2_id],
    false,
    now() - INTERVAL '1 hour',
    0,
    now() - INTERVAL '7 days'
  )
  ON CONFLICT (id) DO UPDATE SET
    last_activity = EXCLUDED.last_activity;

END;
$$ LANGUAGE plpgsql;

-- Execute the setup function
SELECT setup_test_user_data();

-- Drop the function as it's no longer needed
DROP FUNCTION setup_test_user_data();

-- Create a function that will be triggered when test users sign up
CREATE OR REPLACE FUNCTION handle_test_user_signup()
RETURNS TRIGGER AS $$
DECLARE
  test_user_1_id uuid := '550e8400-e29b-41d4-a716-446655440001';
  test_user_2_id uuid := '550e8400-e29b-41d4-a716-446655440002';
  test_chat_id uuid := '123e4567-e89b-12d3-a456-426614174000';
  other_test_user_id uuid;
BEGIN
  -- Check if this is one of our test users
  IF NEW.username = 'tester1' THEN
    -- Update the profile ID to match our test user ID
    UPDATE profiles SET id = test_user_1_id WHERE id = NEW.id;
    NEW.id := test_user_1_id;
    other_test_user_id := test_user_2_id;
  ELSIF NEW.username = 'tester2' THEN
    -- Update the profile ID to match our test user ID
    UPDATE profiles SET id = test_user_2_id WHERE id = NEW.id;
    NEW.id := test_user_2_id;
    other_test_user_id := test_user_1_id;
  ELSE
    -- Not a test user, proceed normally
    RETURN NEW;
  END IF;

  -- Check if the other test user exists
  IF EXISTS (SELECT 1 FROM profiles WHERE id = other_test_user_id) THEN
    -- Both test users exist, set up their friendship and chat
    
    -- Create friendship between test users
    INSERT INTO friendships (user_id, friend_id, created_at)
    VALUES 
      (NEW.id, other_test_user_id, now() - INTERVAL '7 days'),
      (other_test_user_id, NEW.id, now() - INTERVAL '7 days')
    ON CONFLICT (user_id, friend_id) DO NOTHING;

    -- Insert initial messages
    INSERT INTO messages (id, chat_id, sender_id, receiver_id, content, encrypted_content, message_type, delivery_status, is_read, timestamp)
    VALUES 
      (
        '111e4567-e89b-12d3-a456-426614174001',
        test_chat_id,
        test_user_1_id,
        test_user_2_id,
        'Hey there! 👋',
        'encrypted_content_placeholder',
        'text',
        'read',
        true,
        now() - INTERVAL '6 days'
      ),
      (
        '222e4567-e89b-12d3-a456-426614174002',
        test_chat_id,
        test_user_2_id,
        test_user_1_id,
        'Hi! How are you doing?',
        'encrypted_content_placeholder',
        'text',
        'read',
        true,
        now() - INTERVAL '6 days' + INTERVAL '5 minutes'
      ),
      (
        '333e4567-e89b-12d3-a456-426614174003',
        test_chat_id,
        test_user_1_id,
        test_user_2_id,
        'Great! Ready to test the messaging system?',
        'encrypted_content_placeholder',
        'text',
        'read',
        true,
        now() - INTERVAL '1 hour'
      )
    ON CONFLICT (id) DO NOTHING;

    -- Update chat with last message
    UPDATE chats 
    SET last_message_id = '333e4567-e89b-12d3-a456-426614174003',
        last_activity = now() - INTERVAL '1 hour'
    WHERE id = test_chat_id;

    -- Create read receipts for the messages
    INSERT INTO message_read_receipts (message_id, user_id, read_at)
    VALUES 
      ('111e4567-e89b-12d3-a456-426614174001', test_user_2_id, now() - INTERVAL '6 days' + INTERVAL '1 minute'),
      ('222e4567-e89b-12d3-a456-426614174002', test_user_1_id, now() - INTERVAL '6 days' + INTERVAL '6 minutes'),
      ('333e4567-e89b-12d3-a456-426614174003', test_user_2_id, now() - INTERVAL '55 minutes')
    ON CONFLICT (message_id, user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for test user setup
CREATE TRIGGER test_user_setup_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_test_user_signup();