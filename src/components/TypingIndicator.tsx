import React from 'react';
import { motion } from 'framer-motion';

interface TypingIndicatorProps {
  userName: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ userName }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center space-x-2 p-3 text-gray-500 text-sm"
    >
      <div className="flex space-x-1">
        <motion.div
          className="w-2 h-2 bg-gray-400 rounded-full"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0 }}
        />
        <motion.div
          className="w-2 h-2 bg-gray-400 rounded-full"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
        />
        <motion.div
          className="w-2 h-2 bg-gray-400 rounded-full"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
        />
      </div>
      <span>{userName} is typing...</span>
    </motion.div>
  );
};