import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Building, Briefcase, Globe, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { createUserProfile } from '../lib/auth';
import { useToast } from '../hooks/useToast';

export const OrganizerOnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [step, setStep] = useState(1);
  const [userData, setUserData] = useState({
    organizationName: '',
    industry: '',
    website: '',
    role: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const industries = [
    'Technology', 'Healthcare', 'Education', 'Finance', 'Retail',
    'Manufacturing', 'Real Estate', 'Hospitality', 'Entertainment',
    'Non-Profit', 'Government', 'Consulting', 'Marketing', 'Other'
  ];

  const handleNext = async () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // Validate and submit
      if (!userData.organizationName.trim()) {
        showError('Validation Error', 'Please enter your organization name');
        return;
      }

      if (!userData.industry) {
        showError('Validation Error', 'Please select an industry');
        return;
      }

      if (!userData.role.trim()) {
        showError('Validation Error', 'Please enter your role');
        return;
      }

      setIsLoading(true);
      try {
        // Get user ID from session
        const { data: { session } } = await import('../lib/auth').then(m => m.getCurrentSession().then(s => ({ data: { session: s } })));
        if (!session?.user) {
          showError('Session Error', 'Please sign in again');
          navigate('/orglogin');
          return;
        }

        const username = await import('../lib/auth').then(m => m.generateUniqueUsername(userData.organizationName));
        const profileData = {
          username,
          name: userData.organizationName,
          email: session.user.email || '',
          organization_name: userData.organizationName,
          industry: userData.industry,
          website: userData.website || '',
          role: userData.role,
          is_organizer: true,
        };

        await createUserProfile(session.user.id, profileData);
        success('Welcome to EventConnect!', 'Your organizer profile has been created successfully.');

        // Navigate to organizer home - the app will handle loading the updated user state
        navigate('/org/home');
      } catch (err: any) {
        showError('Profile Creation Failed', err.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <Building className="w-12 h-12 text-yellow-500 mx-auto" />
            <h2 className="text-2xl font-bold text-center">Organization Name</h2>
            <input
              type="text"
              value={userData.organizationName}
              onChange={(e) => setUserData({ ...userData, organizationName: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              placeholder="Enter your organization name"
            />
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <Briefcase className="w-12 h-12 text-yellow-500 mx-auto" />
            <h2 className="text-2xl font-bold text-center">Industry</h2>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {industries.map((industry) => (
                <button
                  key={industry}
                  onClick={() => setUserData({ ...userData, industry })}
                  className={`py-2 px-4 rounded-lg ${
                    userData.industry === industry
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {industry}
                </button>
              ))}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <Globe className="w-12 h-12 text-yellow-500 mx-auto" />
            <h2 className="text-2xl font-bold text-center">Website (Optional)</h2>
            <input
              type="url"
              value={userData.website}
              onChange={(e) => setUserData({ ...userData, website: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              placeholder="https://yourwebsite.com"
            />
            <p className="text-sm text-gray-500 text-center">You can skip this step</p>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <User className="w-12 h-12 text-yellow-500 mx-auto" />
            <h2 className="text-2xl font-bold text-center">Your Role</h2>
            <input
              type="text"
              value={userData.role}
              onChange={(e) => setUserData({ ...userData, role: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              placeholder="e.g. Event Coordinator, Manager, Director"
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg space-y-8">
        <div className="relative h-2 bg-gray-200 rounded-full">
          <div
            className="absolute h-full bg-yellow-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        {renderStep()}
        <button
          onClick={handleNext}
          disabled={
            isLoading ||
            (step === 1 && !userData.organizationName) ||
            (step === 2 && !userData.industry) ||
            (step === 4 && !userData.role)
          }
          className="w-full py-3 bg-yellow-500 text-white rounded-lg flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-yellow-600 transition-colors"
        >
          <span>{step === totalSteps ? 'Complete' : 'Next'}</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};