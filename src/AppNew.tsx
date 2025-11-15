import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ChoicePage } from './components/ChoicePage';
import { UserLoginPage } from './components/UserLoginPage';
import { OrganizerLoginPage } from './components/OrganizerLoginPage';
import { UserOnboardingPage } from './components/UserOnboardingPage';
import { OrganizerOnboardingPage } from './components/OrganizerOnboardingPage';
import { UserApp } from './components/UserApp';
import { OrganizerApp } from './components/OrganizerApp';
import { AuthCallback } from './components/AuthCallback';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/Toast';
import { isSupabaseConfigured } from './lib/supabase';
import { useToast } from './hooks/useToast';

function App() {
  const { toasts, removeToast } = useToast();

  // Check if Supabase is configured
  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Configuration Required</h1>
          <p className="text-gray-600 mb-4">
            Please connect to Supabase to continue. Click the "Connect to Supabase" button in the top right corner of the editor.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen">
          {/* Toast Container */}
          <ToastContainer toasts={toasts} onClose={removeToast} />

          <Routes>
            {/* Root choice page */}
            <Route path="/" element={<ChoicePage />} />

            {/* User routes */}
            <Route path="/userlogin" element={<UserLoginPage />} />
            <Route path="/useronboarding" element={<UserOnboardingPage />} />
            <Route path="/userhome" element={<UserApp />} />

            {/* Organizer routes */}
            <Route path="/orglogin" element={<OrganizerLoginPage />} />
            <Route path="/orgonboarding" element={<OrganizerOnboardingPage />} />
            <Route path="/orghome" element={<OrganizerApp />} />

            {/* Auth callback */}
            <Route path="/auth/callback" element={<AuthCallback />} />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;