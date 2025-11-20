import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Calendar, BarChart3, Settings, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { AdminEventHub } from './AdminEventHub';

export const AdminPanel: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if admin is authenticated
    const isAuthenticated = sessionStorage.getItem('adminAuthenticated');
    if (!isAuthenticated) {
      navigate('/admin');
    }
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('adminAuthenticated');
    navigate('/');
  };

  const adminStats = [
    { label: 'Total Users', value: '1,234', icon: Users, color: 'blue' },
    { label: 'Active Events', value: '89', icon: Calendar, color: 'green' },
    { label: 'Total Organizers', value: '45', icon: Shield, color: 'purple' },
    { label: 'System Health', value: '98%', icon: BarChart3, color: 'orange' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-red-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">EventConnect Administration Panel</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm p-6 mb-8"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome to the Admin Panel</h2>
          <p className="text-gray-600">
            This is a placeholder admin dashboard. Full admin functionality will be implemented here,
            including user management, event moderation, analytics, and system configuration.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {adminStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-lg shadow-sm p-6"
            >
              <div className="flex items-center">
                <div className={`p-3 rounded-lg bg-${stat.color}-100 mr-4`}>
                  <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Placeholder Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Management */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-lg shadow-sm p-6"
          >
            <div className="flex items-center mb-4">
              <Users className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
            </div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
            </div>
            <p className="text-sm text-gray-500 mt-4">Coming Soon: User accounts, roles, and permissions management</p>
          </motion.div>

          {/* Event Hub */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-lg shadow-sm p-6"
          >
            <AdminEventHub />
          </motion.div>

          {/* Analytics */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-lg shadow-sm p-6"
          >
            <div className="flex items-center mb-4">
              <BarChart3 className="w-5 h-5 text-purple-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Analytics & Reports</h3>
            </div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
            </div>
            <p className="text-sm text-gray-500 mt-4">Coming Soon: Usage statistics, performance metrics, and insights</p>
          </motion.div>

          {/* System Settings */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-white rounded-lg shadow-sm p-6"
          >
            <div className="flex items-center mb-4">
              <Settings className="w-5 h-5 text-orange-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">System Settings</h3>
            </div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-4/5"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/5"></div>
            </div>
            <p className="text-sm text-gray-500 mt-4">Coming Soon: Configuration, maintenance, and system administration</p>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-12 text-center text-gray-500"
        >
          <p>EventConnect Admin Panel - Version 1.0.0</p>
          <p className="text-sm mt-2">Secure administrative access granted</p>
        </motion.div>
      </div>
    </div>
  );
};