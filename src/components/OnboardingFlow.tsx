import React, { useState } from 'react';
import { ChevronRight, PartyPopper, Users, Heart, User } from 'lucide-react';

interface OnboardingFlowProps {
  onComplete: (userData: {
    name: string;
    age: number;
    isParent: boolean;
    numberOfChildren: number;
    hobbies: string[];
  }) => void;
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [userData, setUserData] = useState({
    name: '',
    age: '',
    isParent: false,
    numberOfChildren: 0,
    hobbies: [] as string[],
  });

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // Convert age to number and ensure it's valid
      const age = parseInt(userData.age, 10);
      if (isNaN(age)) {
        alert('Please enter a valid age');
        return;
      }
      
      // Validate required fields
      if (!userData.name.trim()) {
        alert('Please enter your name');
        return;
      }
      
      if (userData.hobbies.length === 0) {
        alert('Please select at least one hobby');
        return;
      }

      // Call onComplete with the validated data
      onComplete({
        ...userData,
        age,
      });
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <User className="w-12 h-12 text-blue-500 mx-auto" />
            <h2 className="text-2xl font-bold text-center">What's your name?</h2>
            <input
              type="text"
              value={userData.name}
              onChange={(e) => setUserData({ ...userData, name: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your name"
            />
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <PartyPopper className="w-12 h-12 text-blue-500 mx-auto" />
            <h2 className="text-2xl font-bold text-center">How old are you?</h2>
            <input
              type="number"
              value={userData.age}
              onChange={(e) => setUserData({ ...userData, age: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your age"
              min="13"
              max="120"
            />
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <Users className="w-12 h-12 text-blue-500 mx-auto" />
            <h2 className="text-2xl font-bold text-center">Are you a parent?</h2>
            <div className="space-y-4">
              <button
                onClick={() => setUserData({ ...userData, isParent: true })}
                className={`w-full py-3 rounded-lg ${
                  userData.isParent
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                Yes
              </button>
              <button
                onClick={() => setUserData({ ...userData, isParent: false, numberOfChildren: 0 })}
                className={`w-full py-3 rounded-lg ${
                  userData.isParent === false
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                No
              </button>
              {userData.isParent && (
                <input
                  type="number"
                  value={userData.numberOfChildren}
                  onChange={(e) =>
                    setUserData({
                      ...userData,
                      numberOfChildren: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Number of children"
                  min="1"
                  max="20"
                />
              )}
            </div>
          </div>
        );
      case 4:
        const hobbies = [
          'Hiking',
          'Camping',
          'Cycling',
          'Rock Climbing',
          'Kayaking',
          'Scuba Diving',
          'Surfing',
          'Skiing',
          'Fishing',
          'Photography',
          'Soccer',
          'Basketball',
          'Volleyball',
          'Tennis',
          'Yoga',
          'Dancing',
          'Painting',
          'Pottery',
          'Music',
          'Cooking',
          'Gaming',
          'Reading',
          'Writing',
          'Technology',
          'Science'
        ];
        return (
          <div className="space-y-4">
            <Heart className="w-12 h-12 text-blue-500 mx-auto" />
            <h2 className="text-2xl font-bold text-center">
              What are your hobbies?
            </h2>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {hobbies.map((hobby) => (
                <button
                  key={hobby}
                  onClick={() =>
                    setUserData({
                      ...userData,
                      hobbies: userData.hobbies.includes(hobby)
                        ? userData.hobbies.filter((h) => h !== hobby)
                        : [...userData.hobbies, hobby],
                    })
                  }
                  className={`py-2 px-4 rounded-lg ${
                    userData.hobbies.includes(hobby)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {hobby}
                </button>
              ))}
            </div>
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
            className="absolute h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        {renderStep()}
        <button
          onClick={handleNext}
          disabled={
            (step === 1 && !userData.name) ||
            (step === 2 && !userData.age) ||
            (step === 4 && userData.hobbies.length === 0)
          }
          className="w-full py-3 bg-blue-500 text-white rounded-lg flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
        >
          <span>{step === totalSteps ? 'Complete' : 'Next'}</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export { OnboardingFlow };