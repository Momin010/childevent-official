import React from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Users, Calendar, Heart, Share2, TrendingUp, Activity } from 'lucide-react';
import type { Analytics } from '../types';

interface AdminDashboardProps {
  analytics: Analytics;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ analytics }) => {
  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              title: 'Total Users',
              value: analytics.newSignups.reduce((acc, curr) => acc + curr.count, 0),
              icon: Users,
              color: 'bg-blue-500',
            },
            {
              title: 'Active Today',
              value: analytics.userActivity[analytics.userActivity.length - 1]?.activeUsers || 0,
              icon: Activity,
              color: 'bg-green-500',
            },
            {
              title: 'Events Created',
              value: analytics.userActivity.reduce((acc, curr) => acc + curr.eventCreations, 0),
              icon: Calendar,
              color: 'bg-purple-500',
            },
            {
              title: 'Total Interactions',
              value: analytics.eventEngagement.reduce(
                (acc, curr) => acc + curr.clicks + curr.signups + curr.shares + curr.likes,
                0
              ),
              icon: TrendingUp,
              color: 'bg-yellow-500',
            },
          ].map((stat) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow p-6"
            >
              <div className="flex items-center">
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* User Growth Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <h2 className="text-lg font-semibold mb-4">User Growth</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.newSignups}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#0088FE"
                  strokeWidth={2}
                  name="New Signups"
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <h2 className="text-lg font-semibold mb-4">Daily Active Users</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.userActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="activeUsers"
                  stroke="#00C49F"
                  strokeWidth={2}
                  name="Active Users"
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Event Engagement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow p-6 mb-8"
        >
          <h2 className="text-lg font-semibold mb-4">Event Engagement</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={analytics.eventEngagement}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="eventTitle" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="clicks" fill="#0088FE" name="Clicks" />
              <Bar dataKey="signups" fill="#00C49F" name="Signups" />
              <Bar dataKey="shares" fill="#FFBB28" name="Shares" />
              <Bar dataKey="likes" fill="#FF8042" name="Likes" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* User Activity Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <h2 className="text-lg font-semibold mb-4">Activity Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Event Views', value: analytics.eventEngagement.reduce((acc, curr) => acc + curr.clicks, 0) },
                    { name: 'Event Signups', value: analytics.eventEngagement.reduce((acc, curr) => acc + curr.signups, 0) },
                    { name: 'Shares', value: analytics.eventEngagement.reduce((acc, curr) => acc + curr.shares, 0) },
                    { name: 'Likes', value: analytics.eventEngagement.reduce((acc, curr) => acc + curr.likes, 0) },
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow p-6 lg:col-span-2"
          >
            <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {analytics.userActivity.slice(-5).map((activity, index) => (
                <div key={activity.date} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Activity className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">{activity.date}</p>
                      <p className="text-sm text-gray-500">
                        {activity.activeUsers} active users, {activity.eventSignups} new signups
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      +{activity.eventCreations} events
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};