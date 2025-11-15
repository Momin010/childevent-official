import React, { useState, useRef } from 'react';
import { Play, Pause, Download, FileText, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

interface MediaMessageProps {
  message: {
    messageType: 'image' | 'audio' | 'video' | 'file' | 'location';
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    thumbnailUrl?: string;
    duration?: number;
    content: string;
  };
  isOwn: boolean;
}

export const MediaMessage: React.FC<MediaMessageProps> = ({ message, isOwn }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (message.messageType === 'audio' && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } else if (message.messageType === 'video' && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (message.messageType === 'audio' && audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    } else if (message.messageType === 'video' && videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleDownload = () => {
    if (message.fileUrl) {
      const link = document.createElement('a');
      link.href = message.fileUrl;
      link.download = message.fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const renderContent = () => {
    switch (message.messageType) {
      case 'image':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative max-w-xs"
          >
            <img
              src={message.fileUrl || message.thumbnailUrl}
              alt="Shared image"
              className="rounded-lg max-w-full h-auto"
              loading="lazy"
            />
            {message.content && (
              <div className="mt-2 text-sm">
                {message.content}
              </div>
            )}
          </motion.div>
        );

      case 'audio':
        return (
          <motion.div
            initial={{ opacity: 0, x: isOwn ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-3 bg-gray-100 rounded-lg p-3 min-w-[200px]"
          >
            <button
              onClick={handlePlayPause}
              className="flex-shrink-0 w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
            
            <div className="flex-1">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Audio Message</span>
                <span>{formatDuration(message.duration || 0)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div
                  className="bg-blue-500 h-1 rounded-full transition-all duration-100"
                  style={{
                    width: `${message.duration ? (currentTime / message.duration) * 100 : 0}%`
                  }}
                />
              </div>
            </div>

            <audio
              ref={audioRef}
              src={message.fileUrl}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
              preload="metadata"
            />
          </motion.div>
        );

      case 'video':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative max-w-xs"
          >
            <video
              ref={videoRef}
              src={message.fileUrl}
              poster={message.thumbnailUrl}
              className="rounded-lg max-w-full h-auto"
              controls
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />
            {message.content && (
              <div className="mt-2 text-sm">
                {message.content}
              </div>
            )}
          </motion.div>
        );

      case 'file':
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-3 bg-gray-100 rounded-lg p-3 min-w-[200px]"
          >
            <div className="flex-shrink-0 w-10 h-10 bg-gray-300 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-gray-600" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {message.fileName || 'File'}
              </p>
              <p className="text-xs text-gray-500">
                {message.fileSize ? formatFileSize(message.fileSize) : 'Unknown size'}
              </p>
            </div>

            <button
              onClick={handleDownload}
              className="flex-shrink-0 p-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
          </motion.div>
        );

      case 'location':
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-3 bg-gray-100 rounded-lg p-3 min-w-[200px]"
          >
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-red-500" />
            </div>
            
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Location</p>
              <p className="text-xs text-gray-500">{message.content}</p>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
        {renderContent()}
      </div>
    </div>
  );
};