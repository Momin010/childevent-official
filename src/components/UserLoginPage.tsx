import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { signIn, signUp, getCurrentSession, getUserProfile } from '../lib/auth';
import { useToast } from '../hooks/useToast';
import type { LoginCredentials, SignUpCredentials } from '../lib/auth';

export const UserLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      const session = await getCurrentSession();
      if (session?.user) {
        const profile = await getUserProfile(session.user.id);
        if (profile && !profile.is_organizer) {
          navigate('/userhome');
        }
      }
    };
    checkSession();
  }, [navigate]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!formData.email.includes('@')) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (mode === 'signup' && !formData.username) {
      newErrors.username = 'Username is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      if (mode === 'signin') {
        const { user: authUser } = await signIn({
          email: formData.email,
          password: formData.password,
          rememberMe: formData.rememberMe,
        });

        if (authUser) {
          const profile = await getUserProfile(authUser.id);
          if (profile) {
            if (profile.is_organizer) {
              showError('Access Denied', 'This account is registered as an organizer. Please use the organizer login.');
              return;
            }
            success('Welcome back!', 'You have successfully signed in.');
            navigate('/userhome');
          } else {
            navigate('/useronboarding');
          }
        }
      } else {
        const { user: authUser } = await signUp({
          email: formData.email,
          password: formData.password,
          username: formData.username,
        });

        if (authUser) {
          navigate('/useronboarding');
          success('Account Created', 'Please complete your profile to continue.');
        }
      }
    } catch (err: any) {
      showError('Authentication Failed', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <motion.button
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        onClick={() => navigate('/')}
        className="p-4 text-gray-600 hover:text-gray-800 flex items-center"
      >
        <ArrowLeft className="w-6 h-6 mr-2" />
        Back
      </motion.button>

      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full max-w-sm"
        >
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-3xl font-bold text-gray-900 mb-8 text-center"
          >
            {mode === 'signin' ? 'Welcome Back!' : 'Create Account'}
          </motion.h1>

          <motion.form
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {mode === 'signup' && (
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                    errors.username ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your username"
                />
                {errors.username && (
                  <p className="mt-1 text-sm text-red-500">{errors.username}</p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            {mode === 'signin' && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rememberMe"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
            )}

            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                mode === 'signin' ? 'Sign In' : 'Sign Up'
              )}
            </motion.button>
          </motion.form>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="mt-6 text-center"
          >
            <button
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              className="text-blue-500 hover:text-blue-600 text-sm"
            >
              {mode === 'signin'
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"
              }
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};