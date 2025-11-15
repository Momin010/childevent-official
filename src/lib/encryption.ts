import CryptoJS from 'crypto-js';

// Generate a unique encryption key for each chat
export const generateChatKey = (userId1: string, userId2: string): string => {
  const sortedIds = [userId1, userId2].sort();
  return CryptoJS.SHA256(sortedIds.join('-')).toString();
};

// Encrypt message content
export const encryptMessage = (message: string, chatKey: string): string => {
  try {
    const encrypted = CryptoJS.AES.encrypt(message, chatKey).toString();
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    return message; // Fallback to unencrypted if encryption fails
  }
};

// Decrypt message content
export const decryptMessage = (encryptedMessage: string, chatKey: string): string => {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedMessage, chatKey);
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    return encryptedMessage; // Fallback to encrypted text if decryption fails
  }
};

// Generate a secure random key
export const generateSecureKey = (): string => {
  return CryptoJS.lib.WordArray.random(256/8).toString();
};