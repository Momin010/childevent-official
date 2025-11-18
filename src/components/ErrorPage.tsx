import React from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Wifi,
  Shield,
  RefreshCw,
  Home,
  Bug,
  ChevronLeft,
  Copy,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface ErrorPageProps {
  title?: string;
  message?: string;
  error?: Error | string;
  statusCode?: number;
  icon?: React.ReactNode;
  showDebugInfo?: boolean;
  showHomeButton?: boolean;
  showRetryButton?: boolean;
  onRetry?: () => void;
  debugInfo?: Record<string, any>;
}

export const ErrorPage: React.FC<ErrorPageProps> = ({
  title = "Something went wrong",
  message = "We're sorry, but something unexpected happened. Please try again.",
  error,
  statusCode,
  icon,
  showDebugInfo = false,
  showHomeButton = true,
  showRetryButton = false,
  onRetry,
  debugInfo = {}
}) => {
  const navigate = useNavigate();

  // Determine default icon based on error type
  const getDefaultIcon = () => {
    if (statusCode === 404) return <Home className="w-16 h-16 text-gray-400" />;
    if (statusCode === 403 || statusCode === 401) return <Shield className="w-16 h-16 text-red-400" />;
    if (statusCode >= 500) return <AlertTriangle className="w-16 h-16 text-orange-400" />;
    if (!navigator.onLine) return <Wifi className="w-16 h-16 text-blue-400" />;
    return <AlertTriangle className="w-16 h-16 text-gray-400" />;
  };

  const displayIcon = icon || getDefaultIcon();

  const handleCopyDebugInfo = () => {
    const debugText = JSON.stringify({
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      statusCode,
      error: error?.toString(),
      ...debugInfo
    }, null, 2);

    navigator.clipboard.writeText(debugText);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="flex justify-center mb-6"
        >
          {displayIcon}
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-bold text-gray-900 mb-4"
        >
          {title}
        </motion.h1>

        {/* Message */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-gray-600 mb-6 leading-relaxed"
        >
          {message}
        </motion.p>

        {/* Status Code */}
        {statusCode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 mb-6"
          >
            Error Code: {statusCode}
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col gap-3"
        >
          {showRetryButton && onRetry && (
            <button
              onClick={onRetry}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          )}

          {showHomeButton && (
            <button
              onClick={() => navigate('/')}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              <Home className="w-4 h-4" />
              Go Home
            </button>
          )}

          <button
            onClick={() => navigate(-1)}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Go Back
          </button>
        </motion.div>

        {/* Debug Information */}
        {showDebugInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ delay: 0.7 }}
            className="mt-8 pt-6 border-t border-gray-200"
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <Bug className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-600">Debug Information</span>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-left text-xs font-mono text-gray-600 mb-4 max-h-32 overflow-y-auto">
              <div><strong>Timestamp:</strong> {new Date().toISOString()}</div>
              <div><strong>URL:</strong> {window.location.href}</div>
              <div><strong>User Agent:</strong> {navigator.userAgent}</div>
              {statusCode && <div><strong>Status Code:</strong> {statusCode}</div>}
              {error && <div><strong>Error:</strong> {error.toString()}</div>}
              {Object.keys(debugInfo).length > 0 && (
                <div><strong>Additional Info:</strong> {JSON.stringify(debugInfo, null, 2)}</div>
              )}
            </div>

            <button
              onClick={handleCopyDebugInfo}
              className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors mx-auto"
            >
              <Copy className="w-4 h-4" />
              Copy Debug Info
            </button>
          </motion.div>
        )}

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 pt-6 border-t border-gray-200"
        >
          <p className="text-xs text-gray-500 mb-2">
            If this problem persists, please contact support
          </p>
          <a
            href="mailto:support@eventconnect.com"
            className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600"
          >
            support@eventconnect.com
            <ExternalLink className="w-3 h-3" />
          </a>
        </motion.div>
      </motion.div>
    </div>
  );
};

// Pre-configured error page components for common scenarios

export const NotFoundPage: React.FC = () => (
  <ErrorPage
    title="Page Not Found"
    message="The page you're looking for doesn't exist or has been moved."
    statusCode={404}
    showHomeButton={true}
    showDebugInfo={false}
  />
);

export const ServerErrorPage: React.FC<{ error?: Error }> = ({ error }) => (
  <ErrorPage
    title="Server Error"
    message="We're experiencing technical difficulties. Our team has been notified."
    statusCode={500}
    error={error}
    showRetryButton={true}
    showHomeButton={true}
    showDebugInfo={true}
  />
);

export const NetworkErrorPage: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <ErrorPage
    title="Connection Lost"
    message="Please check your internet connection and try again."
    icon={<Wifi className="w-16 h-16 text-blue-400" />}
    showRetryButton={true}
    onRetry={onRetry}
    showHomeButton={true}
    showDebugInfo={false}
  />
);

export const PermissionDeniedPage: React.FC = () => (
  <ErrorPage
    title="Access Denied"
    message="You don't have permission to access this resource."
    statusCode={403}
    showHomeButton={true}
    showDebugInfo={false}
  />
);