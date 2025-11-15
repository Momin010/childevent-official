import React from 'react';
import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';

interface MessageStatusProps {
  status: 'sending' | 'sent' | 'delivered' | 'read';
  className?: string;
}

export const MessageStatus: React.FC<MessageStatusProps> = ({ status, className = '' }) => {
  const getIcon = () => {
    switch (status) {
      case 'sending':
        return <Clock className={`w-3 h-3 text-gray-400 ${className}`} />;
      case 'sent':
        return <Check className={`w-3 h-3 text-gray-400 ${className}`} />;
      case 'delivered':
        return <CheckCheck className={`w-3 h-3 text-gray-400 ${className}`} />;
      case 'read':
        return <CheckCheck className={`w-3 h-3 text-blue-500 ${className}`} />;
      default:
        return <AlertCircle className={`w-3 h-3 text-red-400 ${className}`} />;
    }
  };

  return <span className="inline-flex items-center">{getIcon()}</span>;
};