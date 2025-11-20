import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, User, PartyPopper, Users, Heart, MapPin, Calendar, Settings, Bell, Utensils, Accessibility } from 'lucide-react';
import { motion } from 'framer-motion';
import { createUserProfile } from '../lib/auth';
import { useToast } from '../hooks/useToast';

export const UserOnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [step, setStep] = useState(1);
  const [userData, setUserData] = useState({
    name: '',
    age: '',
    isParent: false,
    numberOfChildren: 0,
    childrenAges: [] as number[],
    hobbies: [] as string[],
    location: '',
    preferredEventTypes: [] as string[],
    activityPreferences: {
      indoor: false,
      outdoor: false,
      smallGroup: false,
      largeGroup: false,
      familyFriendly: false,
      adultsOnly: false,
    },
    dietaryRestrictions: [] as string[],
    accessibilityNeeds: [] as string[],
    notificationPreferences: {
      emailReminders: true,
      emailUpdates: true,
      pushReminders: true,
      pushUpdates: false,
    },
  });
  const [isLoading, setIsLoading] = useState(false);

  const totalSteps = 11;
  const progress = (step / totalSteps) * 100;

  const hobbies = [
    'Hiking', 'Camping', 'Cycling', 'Rock Climbing', 'Kayaking',
    'Scuba Diving', 'Surfing', 'Skiing', 'Fishing', 'Photography',
    'Soccer', 'Basketball', 'Volleyball', 'Tennis', 'Yoga',
    'Dancing', 'Painting', 'Pottery', 'Music', 'Cooking',
    'Gaming', 'Reading', 'Writing', 'Technology', 'Science'
  ];

  const handleNext = async () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // Validate and submit
      const age = parseInt(userData.age, 10);
      if (isNaN(age)) {
        showError('Validation Error', 'Please enter a valid age');
        return;
      }

      if (!userData.name.trim()) {
        showError('Validation Error', 'Please enter your name');
        return;
      }

      if (userData.hobbies.length === 0) {
        showError('Validation Error', 'Please select at least one hobby');
        return;
      }

      // Validate children ages if parent
      if (userData.isParent && userData.childrenAges.some(age => age > 0 && (age < 1 || age > 18))) {
        showError('Validation Error', 'Please enter valid ages for children (1-18 years)');
        return;
      }

      setIsLoading(true);
      try {
        // Get user ID from session
        const { data: { session } } = await import('../lib/auth').then(m => m.getCurrentSession().then(s => ({ data: { session: s } })));
        if (!session?.user) {
          showError('Session Error', 'Please sign in again');
          navigate('/userlogin');
          return;
        }

        const username = await import('../lib/auth').then(m => m.generateUniqueUsername(userData.name));
        const profileData = {
          username,
          name: userData.name,
          age,
          is_parent: userData.isParent,
          number_of_children: userData.numberOfChildren,
          hobbies: userData.hobbies,
          email: session.user.email || '',
          location: userData.location || null,
          interests: userData.preferredEventTypes,
          preferences: {
            activityPreferences: userData.activityPreferences,
            dietaryRestrictions: userData.dietaryRestrictions,
            accessibilityNeeds: userData.accessibilityNeeds,
            notificationPreferences: userData.notificationPreferences,
          },
          email_notifications: userData.notificationPreferences.emailReminders || userData.notificationPreferences.emailUpdates,
          push_notifications: userData.notificationPreferences.pushReminders || userData.notificationPreferences.pushUpdates,
        };

        await createUserProfile(session.user.id, profileData);
        success('Welcome to EventConnect!', 'Your profile has been created successfully.');
        navigate('/user/home');
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
                  userData.isParent ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Yes
              </button>
              <button
                onClick={() => setUserData({ ...userData, isParent: false, numberOfChildren: 0, childrenAges: [] })}
                className={`w-full py-3 rounded-lg ${
                  userData.isParent === false ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                No
              </button>
              {userData.isParent && (
                <div className="space-y-2">
                  <input
                    type="number"
                    value={userData.numberOfChildren}
                    onChange={(e) => {
                      const count = parseInt(e.target.value, 10) || 0;
                      setUserData({
                        ...userData,
                        numberOfChildren: count,
                        childrenAges: count > 0 ? Array(count).fill(0) : [],
                      });
                    }}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Number of children"
                    min="1"
                    max="20"
                  />
                  {userData.childrenAges.map((age, index) => (
                    <input
                      key={index}
                      type="number"
                      value={age || ''}
                      onChange={(e) => {
                        const newAges = [...userData.childrenAges];
                        newAges[index] = parseInt(e.target.value, 10) || 0;
                        setUserData({ ...userData, childrenAges: newAges });
                      }}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={`Child ${index + 1} age`}
                      min="0"
                      max="18"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <Heart className="w-12 h-12 text-blue-500 mx-auto" />
            <h2 className="text-2xl font-bold text-center">What are your hobbies?</h2>
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
      case 5:
        return (
          <div className="space-y-4">
            <MapPin className="w-12 h-12 text-blue-500 mx-auto" />
            <h2 className="text-2xl font-bold text-center">Where are you located?</h2>
            <input
              type="text"
              value={userData.location}
              onChange={(e) => setUserData({ ...userData, location: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="City, Country (e.g., Helsinki, Finland)"
            />
            <p className="text-sm text-gray-500 text-center">This helps us show you local events</p>
          </div>
        );
      case 6:
        return (
          <div className="space-y-4">
            <Calendar className="w-12 h-12 text-blue-500 mx-auto" />
            <h2 className="text-2xl font-bold text-center">What types of events interest you?</h2>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {[
                'Music Concerts', 'Sports Events', 'Art Exhibitions', 'Theater Shows',
                'Workshops', 'Festivals', 'Networking', 'Educational', 'Food Events',
                'Outdoor Activities', 'Family Events', 'Cultural Events'
              ].map((eventType) => (
                <button
                  key={eventType}
                  onClick={() =>
                    setUserData({
                      ...userData,
                      preferredEventTypes: userData.preferredEventTypes.includes(eventType)
                        ? userData.preferredEventTypes.filter((t) => t !== eventType)
                        : [...userData.preferredEventTypes, eventType],
                    })
                  }
                  className={`py-2 px-4 rounded-lg ${
                    userData.preferredEventTypes.includes(eventType)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {eventType}
                </button>
              ))}
            </div>
          </div>
        );
      case 7:
        return (
          <div className="space-y-4">
            <Settings className="w-12 h-12 text-blue-500 mx-auto" />
            <h2 className="text-2xl font-bold text-center">Your activity preferences</h2>
            <div className="space-y-3">
              {[
                { key: 'indoor', label: 'Indoor activities' },
                { key: 'outdoor', label: 'Outdoor activities' },
                { key: 'smallGroup', label: 'Small group events (1-20 people)' },
                { key: 'largeGroup', label: 'Large group events (20+ people)' },
                { key: 'familyFriendly', label: 'Family-friendly events' },
                { key: 'adultsOnly', label: 'Adults-only events' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() =>
                    setUserData({
                      ...userData,
                      activityPreferences: {
                        ...userData.activityPreferences,
                        [key]: !userData.activityPreferences[key as keyof typeof userData.activityPreferences],
                      },
                    })
                  }
                  className={`w-full py-3 px-4 rounded-lg text-left ${
                    userData.activityPreferences[key as keyof typeof userData.activityPreferences]
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        );
      case 8:
        return (
          <div className="space-y-4">
            <Utensils className="w-12 h-12 text-blue-500 mx-auto" />
            <h2 className="text-2xl font-bold text-center">Any dietary restrictions?</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                'Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free',
                'Nut allergy', 'Shellfish allergy', 'Kosher', 'Halal'
              ].map((restriction) => (
                <button
                  key={restriction}
                  onClick={() =>
                    setUserData({
                      ...userData,
                      dietaryRestrictions: userData.dietaryRestrictions.includes(restriction)
                        ? userData.dietaryRestrictions.filter((r) => r !== restriction)
                        : [...userData.dietaryRestrictions, restriction],
                    })
                  }
                  className={`py-2 px-4 rounded-lg ${
                    userData.dietaryRestrictions.includes(restriction)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {restriction}
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-500 text-center">Skip if none apply</p>
          </div>
        );
      case 9:
        return (
          <div className="space-y-4">
            <Accessibility className="w-12 h-12 text-blue-500 mx-auto" />
            <h2 className="text-2xl font-bold text-center">Accessibility needs?</h2>
            <div className="grid grid-cols-1 gap-2">
              {[
                'Wheelchair accessible', 'Sign language interpreter', 'Audio description',
                'Braille materials', 'Quiet space available', 'Service animals welcome'
              ].map((need) => (
                <button
                  key={need}
                  onClick={() =>
                    setUserData({
                      ...userData,
                      accessibilityNeeds: userData.accessibilityNeeds.includes(need)
                        ? userData.accessibilityNeeds.filter((n) => n !== need)
                        : [...userData.accessibilityNeeds, need],
                    })
                  }
                  className={`py-3 px-4 rounded-lg text-left ${
                    userData.accessibilityNeeds.includes(need)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {need}
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-500 text-center">Skip if none apply</p>
          </div>
        );
      case 10:
        return (
          <div className="space-y-4">
            <Bell className="w-12 h-12 text-blue-500 mx-auto" />
            <h2 className="text-2xl font-bold text-center">Notification preferences</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold">Email notifications:</h3>
                <div className="space-y-2 ml-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={userData.notificationPreferences.emailReminders}
                      onChange={(e) => setUserData({
                        ...userData,
                        notificationPreferences: {
                          ...userData.notificationPreferences,
                          emailReminders: e.target.checked,
                        },
                      })}
                      className="mr-2"
                    />
                    Event reminders
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={userData.notificationPreferences.emailUpdates}
                      onChange={(e) => setUserData({
                        ...userData,
                        notificationPreferences: {
                          ...userData.notificationPreferences,
                          emailUpdates: e.target.checked,
                        },
                      })}
                      className="mr-2"
                    />
                    Event updates and news
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Push notifications:</h3>
                <div className="space-y-2 ml-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={userData.notificationPreferences.pushReminders}
                      onChange={(e) => setUserData({
                        ...userData,
                        notificationPreferences: {
                          ...userData.notificationPreferences,
                          pushReminders: e.target.checked,
                        },
                      })}
                      className="mr-2"
                    />
                    Event reminders
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={userData.notificationPreferences.pushUpdates}
                      onChange={(e) => setUserData({
                        ...userData,
                        notificationPreferences: {
                          ...userData.notificationPreferences,
                          pushUpdates: e.target.checked,
                        },
                      })}
                      className="mr-2"
                    />
                    Event updates and news
                  </label>
                </div>
              </div>
            </div>
          </div>
        );
      case 11:
        return (
          <div className="space-y-4">
            <Heart className="w-12 h-12 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold text-center text-green-600">You're all set!</h2>
            <p className="text-center text-gray-600">
              Based on your preferences, we'll recommend the perfect events for you and your family.
            </p>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-700">
                🎯 Personalized recommendations<br/>
                📍 Local event discovery<br/>
                👨‍👩‍👧‍👦 Family-friendly options<br/>
                🔔 Smart notifications
              </p>
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
            isLoading ||
            (step === 1 && !userData.name.trim()) ||
            (step === 2 && !userData.age) ||
            (step === 3 && userData.isParent && userData.numberOfChildren > 0 && userData.childrenAges.some(age => age === 0)) ||
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