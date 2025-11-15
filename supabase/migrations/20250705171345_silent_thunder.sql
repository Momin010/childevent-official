/*
  # Enhanced Messaging System

  1. Message Status Tracking
    - Add delivery status tracking (sent, delivered, read)
    - Add message type support for images/audio
    - Add file attachments support

  2. Notifications
    - Add notification preferences
    - Add push notification tokens

  3. Security
    - Update RLS policies for new features
    - Add proper indexes for performance
*/

-- Add message status and media support
ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT 'sent' CHECK (delivery_status IN ('sending', 'sent', 'delivered', 'read'));
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_url text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_name text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_size bigint;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS thumbnail_url text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS duration integer; -- for audio/video files

-- Update message_type to include more types
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_message_type_check 
  CHECK (message_type IN ('text', 'image', 'audio', 'video', 'file', 'location'));

-- Add notification preferences to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{"messages": true, "friend_requests": true, "events": true, "push_enabled": true}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS device_type text; -- 'ios', 'android', 'web'

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('message', 'friend_request', 'event_reminder', 'event_update')),
  title text NOT NULL,
  body text NOT NULL,
  data jsonb DEFAULT '{}',
  read boolean DEFAULT false,
  sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create message_read_receipts table for detailed read tracking
CREATE TABLE IF NOT EXISTS message_read_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  read_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_delivery_status ON messages(delivery_status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_message ON message_read_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_message_read_receipts_user ON message_read_receipts(user_id);

-- Enable RLS on new tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_read_receipts ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view their notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Allow system to create notifications

CREATE POLICY "Users can update their notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Message read receipts policies
CREATE POLICY "Users can view read receipts for their messages"
  ON message_read_receipts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM messages 
      WHERE messages.id = message_read_receipts.message_id 
      AND (messages.sender_id = auth.uid() OR messages.receiver_id = auth.uid())
    )
  );

CREATE POLICY "Users can create read receipts"
  ON message_read_receipts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to update message delivery status
CREATE OR REPLACE FUNCTION update_message_delivery_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When a message is inserted, set status to 'sent'
  IF TG_OP = 'INSERT' THEN
    NEW.delivery_status = 'sent';
    
    -- Create notification for receiver
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      NEW.receiver_id,
      'message',
      (SELECT name FROM profiles WHERE id = NEW.sender_id),
      CASE 
        WHEN NEW.message_type = 'text' THEN LEFT(NEW.content, 50)
        WHEN NEW.message_type = 'image' THEN '📷 Photo'
        WHEN NEW.message_type = 'audio' THEN '🎵 Audio message'
        WHEN NEW.message_type = 'video' THEN '🎥 Video'
        ELSE '📎 File'
      END,
      jsonb_build_object(
        'chat_id', NEW.chat_id,
        'message_id', NEW.id,
        'sender_id', NEW.sender_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to mark messages as delivered when user comes online
CREATE OR REPLACE FUNCTION mark_messages_delivered()
RETURNS TRIGGER AS $$
BEGIN
  -- When user comes online, mark their undelivered messages as delivered
  IF NEW.is_online = true AND (OLD.is_online = false OR OLD.is_online IS NULL) THEN
    UPDATE messages 
    SET delivery_status = 'delivered'
    WHERE receiver_id = NEW.id 
    AND delivery_status = 'sent';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle read receipts
CREATE OR REPLACE FUNCTION handle_message_read()
RETURNS TRIGGER AS $$
BEGIN
  -- Update message status to 'read'
  UPDATE messages 
  SET delivery_status = 'read', is_read = true
  WHERE id = NEW.message_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER message_delivery_status_trigger
  BEFORE INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_message_delivery_status();

CREATE TRIGGER user_online_status_trigger
  AFTER UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION mark_messages_delivered();

CREATE TRIGGER message_read_receipt_trigger
  AFTER INSERT ON message_read_receipts
  FOR EACH ROW EXECUTE FUNCTION handle_message_read();

-- Function to clean up old notifications (optional)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications 
  WHERE created_at < NOW() - INTERVAL '30 days'
  AND read = true;
END;
$$ LANGUAGE plpgsql;