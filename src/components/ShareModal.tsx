import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Link, Facebook, Twitter, Apple as WhatsApp, Mail } from 'lucide-react';
import {
  FacebookShareButton,
  TwitterShareButton,
  WhatsappShareButton,
  EmailShareButton,
} from 'react-share';
import type { Event } from '../types';

interface ShareModalProps {
  event: Event;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  event,
  isOpen,
  onClose,
}) => {
  const shareUrl = `https://eventconnect.com/events/${event.id}`;
  const title = `Check out ${event.title} on EventConnect!`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-xl max-w-sm w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-xl font-semibold">Share Event</h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Copy Link */}
              <button
                onClick={copyLink}
                className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100"
              >
                <Link className="w-6 h-6" />
                <span>Copy Link</span>
              </button>

              {/* Social Share Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <FacebookShareButton url={shareUrl} quote={title}>
                  <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 w-full">
                    <Facebook className="w-6 h-6 text-blue-600" />
                    <span>Facebook</span>
                  </div>
                </FacebookShareButton>

                <TwitterShareButton url={shareUrl} title={title}>
                  <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 w-full">
                    <Twitter className="w-6 h-6 text-blue-400" />
                    <span>Twitter</span>
                  </div>
                </TwitterShareButton>

                <WhatsappShareButton url={shareUrl} title={title}>
                  <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 w-full">
                    <WhatsApp className="w-6 h-6 text-green-500" />
                    <span>WhatsApp</span>
                  </div>
                </WhatsappShareButton>

                <EmailShareButton url={shareUrl} subject={title}>
                  <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 w-full">
                    <Mail className="w-6 h-6 text-gray-600" />
                    <span>Email</span>
                  </div>
                </EmailShareButton>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};