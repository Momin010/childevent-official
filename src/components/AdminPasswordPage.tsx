import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const ADMIN_PASSWORD = 'X9kL2mP8qR5tV7wY3zA1bN6cD4eF0gH!jK@lM#nO$pQ%rS&tU*vW+xY-zA=B?C>D<E[F]G^H_I`J~K|L:M;"N<O.P/Q+R,S-T.U/V0W1X2Y3Z4';

export const AdminPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate processing delay for security
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (password === ADMIN_PASSWORD) {
      // Store admin access in session storage
      sessionStorage.setItem('adminAuthenticated', 'true');
      navigate('/adminpanel');
    } else {
      setError('Invalid admin password. Access denied.');
      setPassword('');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-900 flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        {/* Security Header */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="text-center mb-8"
        >
          <div className="bg-red-100 rounded-full p-4 inline-block mb-4">
            <Shield className="w-12 h-12 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Admin Access</h1>
          <p className="text-red-100 text-sm">Restricted Area - Authorized Personnel Only</p>
        </motion.div>

        {/* Password Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-2xl p-8"
        >
          <div className="flex items-center mb-6">
            <Lock className="w-5 h-5 text-red-500 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Enter Admin Password</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Secure Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 font-mono text-sm"
                  placeholder="Enter admin password..."
                  autoComplete="off"
                  spellCheck="false"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg"
              >
                <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </motion.div>
            )}

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full bg-red-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Verifying...
                </div>
              ) : (
                'Access Admin Panel'
              )}
            </motion.button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              This area is restricted to authorized administrators only.
              Unauthorized access attempts are logged and monitored.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};