import React, { useState } from 'react';
import { Shield, Terminal, Database, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';

export const SuperAdminPanel: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState('');

  const executeQuery = async () => {
    if (!query.trim()) return;

    setIsExecuting(true);
    setError('');
    setResults(null);

    try {
      // Use the super_admin_query function
      const { data, error } = await supabase.rpc('super_admin_query', {
        query_text: query
      });

      if (error) throw error;

      if (data?.error) {
        setError(data.error);
      } else {
        setResults(data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsExecuting(false);
    }
  };

  const sampleQueries = [
    {
      name: 'View All Users',
      query: 'SELECT id, email, created_at FROM auth.users LIMIT 10;'
    },
    {
      name: 'Count All Profiles',
      query: 'SELECT COUNT(*) as total_profiles FROM profiles;'
    },
    {
      name: 'View Recent Events',
      query: 'SELECT title, date, organizer_id FROM events ORDER BY created_at DESC LIMIT 5;'
    },
    {
      name: 'System Stats',
      query: `SELECT
        (SELECT COUNT(*) FROM profiles) as profiles,
        (SELECT COUNT(*) FROM events) as events,
        (SELECT COUNT(*) FROM auth.users) as users;`
    },
    {
      name: 'Delete User (CAUTION!)',
      query: '-- REPLACE user_id_here with actual UUID\n-- DELETE FROM profiles WHERE id = \'user_id_here\';'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Shield className="w-8 h-8 text-red-600 mr-3" />
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Super Admin Panel</h3>
            <p className="text-sm text-gray-500">Unrestricted database access - USE WITH EXTREME CAUTION</p>
          </div>
        </div>
      </div>

      {/* Warning Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-red-50 border border-red-200 rounded-lg p-4"
      >
        <div className="flex items-start">
          <AlertTriangle className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-red-800 mb-2">⚠️ DANGER ZONE</h4>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• You have unrestricted access to ALL database tables</li>
              <li>• DELETE operations cannot be undone</li>
              <li>• Malformed queries can break your application</li>
              <li>• Always backup data before destructive operations</li>
              <li>• Test queries on development environment first</li>
            </ul>
          </div>
        </div>
      </motion.div>

      {/* Query Input */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Terminal className="w-5 h-5 text-gray-600 mr-2" />
              <h4 className="text-sm font-medium text-gray-900">SQL Query Executor</h4>
            </div>
            <button
              onClick={executeQuery}
              disabled={!query.trim() || isExecuting}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <Database className="w-4 h-4 mr-2" />
              {isExecuting ? 'Executing...' : 'Execute Query'}
            </button>
          </div>
        </div>
        <div className="p-4">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your SQL query here...

Example queries:
SELECT * FROM profiles LIMIT 5;
UPDATE profiles SET is_organizer = true WHERE id = 'user-uuid';
DELETE FROM events WHERE id = 'event-uuid';"
            className="w-full h-48 p-3 border border-gray-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
        </div>
      </div>

      {/* Sample Queries */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-900">Sample Queries</h4>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sampleQueries.map((sample, index) => (
              <button
                key={index}
                onClick={() => setQuery(sample.query)}
                className="p-3 text-left border border-gray-200 rounded-md hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                <div className="font-medium text-sm text-gray-900 mb-1">{sample.name}</div>
                <div className="text-xs text-gray-500 font-mono truncate">{sample.query}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-lg p-4"
        >
          <div className="flex items-center">
            <XCircle className="w-5 h-5 text-red-500 mr-2" />
            <div>
              <p className="font-medium text-red-800">Query Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Results Display */}
      {results && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200"
        >
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              <h4 className="text-sm font-medium text-gray-900">Query Results</h4>
            </div>
          </div>
          <div className="p-4">
            <pre className="text-sm bg-gray-50 p-3 rounded-md overflow-x-auto">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        </motion.div>
      )}

      {/* Quick Stats */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-900">Quick Database Stats</h4>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">?</div>
              <div className="text-sm text-gray-600">Total Users</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">?</div>
              <div className="text-sm text-gray-600">Total Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">?</div>
              <div className="text-sm text-gray-600">Total Profiles</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">?</div>
              <div className="text-sm text-gray-600">Active Sessions</div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3 text-center">
            Use the query executor above to get real statistics
          </p>
        </div>
      </div>
    </div>
  );
};