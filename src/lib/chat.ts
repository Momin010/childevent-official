import { supabase } from './supabase';
import { encryptMessage, decryptMessage, generateChatKey } from './encryption';
import type { Message, Chat } from '../types';

// Create or get existing chat between two users
export const createOrGetChat = async (userId1: string, userId2: string): Promise<string> => {
  try {
    const sortedIds = [userId1, userId2].sort();
    
    // Check if chat already exists
    const { data: existingChat, error: fetchError } = await supabase
      .from('chats')
      .select('id')
      .contains('participants', sortedIds)
      .eq('is_group', false)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching existing chat:', fetchError);
    }

    if (existingChat) {
      return existingChat.id;
    }

    // Create new chat
    const { data: newChat, error: createError } = await supabase
      .from('chats')
      .insert({
        participants: sortedIds,
        is_group: false,
        last_activity: new Date().toISOString(),
        unread_count: 0
      })
      .select('id')
      .single();

    if (createError) throw createError;
    return newChat.id;
  } catch (error) {
    console.error('Error creating/getting chat:', error);
    throw error;
  }
};

// Send a message with media support
export const sendMessage = async (
  chatId: string,
  senderId: string,
  receiverId: string,
  content: string,
  messageType: 'text' | 'image' | 'audio' | 'video' | 'file' = 'text',
  fileUrl?: string,
  fileName?: string,
  fileSize?: number,
  thumbnailUrl?: string,
  duration?: number
): Promise<Message> => {
  try {
    const chatKey = generateChatKey(senderId, receiverId);
    const encryptedContent = encryptMessage(content, chatKey);
    
    const messageData = {
      chat_id: chatId,
      sender_id: senderId,
      receiver_id: receiverId,
      content: content,
      encrypted_content: encryptedContent,
      timestamp: new Date().toISOString(),
      is_read: false,
      message_type: messageType,
      delivery_status: 'sending',
      file_url: fileUrl,
      file_name: fileName,
      file_size: fileSize,
      thumbnail_url: thumbnailUrl,
      duration: duration
    };

    const { data, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    if (error) throw error;

    // Update chat's last activity
    await supabase
      .from('chats')
      .update({ 
        last_activity: new Date().toISOString(),
        last_message_id: data.id
      })
      .eq('id', chatId);

    return {
      id: data.id,
      chatId: data.chat_id,
      senderId: data.sender_id,
      receiverId: data.receiver_id,
      content: data.content,
      encryptedContent: data.encrypted_content,
      timestamp: data.timestamp,
      isRead: data.is_read,
      messageType: data.message_type,
      deliveryStatus: data.delivery_status,
      fileUrl: data.file_url,
      fileName: data.file_name,
      fileSize: data.file_size,
      thumbnailUrl: data.thumbnail_url,
      duration: data.duration,
      replyTo: data.reply_to
    };
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Upload file for message
export const uploadMessageFile = async (
  file: File,
  chatId: string,
  messageType: 'image' | 'audio' | 'video' | 'file'
): Promise<{ fileUrl: string; thumbnailUrl?: string }> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${chatId}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('message-files')
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('message-files')
      .getPublicUrl(fileName);

    // Generate thumbnail for images and videos
    let thumbnailUrl: string | undefined;
    if (messageType === 'image' || messageType === 'video') {
      // In a real app, you'd generate thumbnails server-side
      // For now, use the same URL for images
      thumbnailUrl = messageType === 'image' ? publicUrl : undefined;
    }

    return { fileUrl: publicUrl, thumbnailUrl };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

// Get messages for a chat with delivery status
export const getChatMessages = async (chatId: string, senderId: string, receiverId: string): Promise<Message[]> => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('timestamp', { ascending: true });

    if (error) throw error;

    const chatKey = generateChatKey(senderId, receiverId);
    
    return data.map(msg => ({
      id: msg.id,
      chatId: msg.chat_id,
      senderId: msg.sender_id,
      receiverId: msg.receiver_id,
      content: msg.content, // Use plain content for now
      encryptedContent: msg.encrypted_content,
      timestamp: msg.timestamp,
      isRead: msg.is_read,
      messageType: msg.message_type,
      deliveryStatus: msg.delivery_status,
      fileUrl: msg.file_url,
      fileName: msg.file_name,
      fileSize: msg.file_size,
      thumbnailUrl: msg.thumbnail_url,
      duration: msg.duration,
      replyTo: msg.reply_to
    }));
  } catch (error) {
    console.error('Error getting messages:', error);
    return [];
  }
};

// Mark message as read and create read receipt
export const markMessageAsRead = async (messageId: string, userId: string): Promise<void> => {
  try {
    // Create read receipt
    await supabase
      .from('message_read_receipts')
      .upsert({
        message_id: messageId,
        user_id: userId,
        read_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error marking message as read:', error);
  }
};

// Mark messages as read
export const markMessagesAsRead = async (chatId: string, userId: string): Promise<void> => {
  try {
    // Get unread messages in this chat
    const { data: unreadMessages, error: fetchError } = await supabase
      .from('messages')
      .select('id')
      .eq('chat_id', chatId)
      .eq('receiver_id', userId)
      .eq('is_read', false);

    if (fetchError) throw fetchError;

    // Create read receipts for all unread messages
    if (unreadMessages && unreadMessages.length > 0) {
      const readReceipts = unreadMessages.map(msg => ({
        message_id: msg.id,
        user_id: userId,
        read_at: new Date().toISOString()
      }));

      await supabase
        .from('message_read_receipts')
        .upsert(readReceipts);
    }
  } catch (error) {
    console.error('Error marking messages as read:', error);
  }
};

// Get user's chats
export const getUserChats = async (userId: string): Promise<Chat[]> => {
  try {
    const { data, error } = await supabase
      .from('chats')
      .select(`
        *,
        messages!chats_last_message_id_fkey (
          id,
          content,
          timestamp,
          sender_id,
          message_type,
          delivery_status
        )
      `)
      .contains('participants', [userId])
      .order('last_activity', { ascending: false });

    if (error) throw error;

    return data.map(chat => ({
      id: chat.id,
      participants: chat.participants,
      lastMessage: chat.messages ? {
        id: chat.messages.id,
        chatId: chat.id,
        senderId: chat.messages.sender_id,
        receiverId: '',
        content: chat.messages.content,
        encryptedContent: '',
        timestamp: chat.messages.timestamp,
        isRead: false,
        messageType: chat.messages.message_type,
        deliveryStatus: chat.messages.delivery_status
      } : undefined,
      lastActivity: chat.last_activity,
      isGroup: chat.is_group,
      groupName: chat.group_name,
      groupImage: chat.group_image,
      unreadCount: chat.unread_count || 0
    }));
  } catch (error) {
    console.error('Error getting user chats:', error);
    return [];
  }
};

// Subscribe to new messages in real-time
export const subscribeToMessages = (chatId: string, callback: (message: Message) => void) => {
  const channelName = chatId === '*' ? 'messages:all' : `messages:${chatId}`;
  const filter = chatId === '*' ? {} : { filter: `chat_id=eq.${chatId}` };

  console.log('🔌 Creating WebSocket subscription for:', channelName);

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        ...filter
      },
      (payload) => {
        console.log('🚀 WebSocket message received:', payload);
        const msg = payload.new;
        callback({
          id: msg.id,
          chatId: msg.chat_id,
          senderId: msg.sender_id,
          receiverId: msg.receiver_id,
          content: msg.content,
          encryptedContent: msg.encrypted_content,
          timestamp: msg.timestamp,
          isRead: msg.is_read,
          messageType: msg.message_type,
          deliveryStatus: msg.delivery_status,
          fileUrl: msg.file_url,
          fileName: msg.file_name,
          fileSize: msg.file_size,
          thumbnailUrl: msg.thumbnail_url,
          duration: msg.duration,
          replyTo: msg.reply_to
        });
      }
    )
    .subscribe((status) => {
      console.log('📡 WebSocket subscription status:', status);
    });

  return channel;
};

// Subscribe to message status updates
export const subscribeToMessageStatus = (chatId: string, callback: (messageId: string, status: string) => void) => {
  return supabase
    .channel(`message_status:${chatId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`
      },
      (payload) => {
        const msg = payload.new;
        callback(msg.id, msg.delivery_status);
      }
    )
    .subscribe();
};

// Get unread message count for a user
export const getUnreadMessageCount = async (userId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

// Update user online status
export const updateUserOnlineStatus = async (userId: string, isOnline: boolean): Promise<void> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        is_online: isOnline,
        last_seen: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating online status:', error);
  }
};