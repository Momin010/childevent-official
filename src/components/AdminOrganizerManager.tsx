import React, { useState } from 'react';
import { Building2, UserPlus, CheckCircle, XCircle, AlertTriangle, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';

interface OrganizerFormData {
  email: string;
  username: string;
  organizationName: string;
  industry: string;
  website: string;
  roleInOrganization: string;
  name: string;
  bio: string;
  phone: string;
  location: string;
}

export const AdminOrganizerManager: React.FC = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [creationResult, setCreationResult] = useState<{ success: boolean; message: string; organizerId?: string } | null>(null);
  const [formData, setFormData] = useState<OrganizerFormData>({
    email: '',
    username: '',
    organizationName: '',
    industry: '',
    website: '',
    roleInOrganization: '',
    name: '',
    bio: '',
    phone: '',
    location: '',
  });

  const industries = [
    'Technology',
    'Healthcare',
    'Education',
    'Entertainment',
    'Sports',
    'Arts & Culture',
    'Food & Beverage',
    'Retail',
    'Manufacturing',
    'Finance',
    'Real Estate',
    'Non-Profit',
    'Government',
    'Other'
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];

    if (!formData.email.trim()) errors.push('Email is required');
    if (!formData.email.includes('@')) errors.push('Valid email is required');
    if (!formData.username.trim()) errors.push('Username is required');
    if (!formData.organizationName.trim()) errors.push('Organization name is required');
    if (!formData.name.trim()) errors.push('Contact person name is required');
    if (!formData.industry) errors.push('Industry is required');

    // Check if username or email already exists
    // We'll handle this in the async function

    return errors;
  };

  const handleCreateOrganizer = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setCreationResult({
        success: false,
        message: `Validation errors: ${validationErrors.join(', ')}`
      });
      return;
    }

    setIsCreating(true);
    setCreationResult(null);

    try {
      // Check if username or email already exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id, username, email')
        .or(`username.eq.${formData.username},email.eq.${formData.email}`)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingProfile) {
        const conflictField = existingProfile.username === formData.username ? 'username' : 'email';
        setCreationResult({
          success: false,
          message: `A profile with this ${conflictField} already exists`
        });
        setIsCreating(false);
        return;
      }

      // Create the organizer profile
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          email: formData.email,
          username: formData.username,
          name: formData.name,
          role: 'organizer',
          organization_name: formData.organizationName,
          industry: formData.industry,
          website: formData.website || null,
          role_in_organization: formData.roleInOrganization || null,
          bio: formData.bio || null,
          phone: formData.phone || null,
          location: formData.location || null,
          organizer_verified: false, // Admin can verify later
          total_events_created: 0,
          total_attendees_served: 0,
        })
        .select()
        .single();

      if (error) throw error;

      setCreationResult({
        success: true,
        message: `Organizer "${formData.organizationName}" created successfully!`,
        organizerId: data.id
      });

      // Reset form
      setFormData({
        email: '',
        username: '',
        organizationName: '',
        industry: '',
        website: '',
        roleInOrganization: '',
        name: '',
        bio: '',
        phone: '',
        location: '',
      });

    } catch (error: any) {
      console.error('Error creating organizer:', error);
      setCreationResult({
        success: false,
        message: `Failed to create organizer: ${error.message}`
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Building2 className="w-6 h-6 text-blue-600 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Organizer Manager</h3>
            <p className="text-sm text-gray-500">Create and manage organizer accounts</p>
          </div>
        </div>
      </div>

      {/* Creation Result */}
      {creationResult && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg ${
            creationResult.success
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center">
            {creationResult.success ? (
              <CheckCircle className="w-5 h-5 mr-2" />
            ) : (
              <XCircle className="w-5 h-5 mr-2" />
            )}
            <div>
              <p className="font-medium">{creationResult.success ? 'Success!' : 'Error'}</p>
              <p className="text-sm">{creationResult.message}</p>
              {creationResult.organizerId && (
                <p className="text-xs mt-1 font-mono">ID: {creationResult.organizerId}</p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Organizer Creation Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center">
            <UserPlus className="w-5 h-5 text-green-600 mr-2" />
            <h4 className="text-lg font-semibold text-gray-900">Create New Organizer</h4>
          </div>
        </div>

        <form onSubmit={handleCreateOrganizer} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="organizer@company.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username *
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="company_org"
                required
              />
            </div>
          </div>

          {/* Organization Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organization Name *
              </label>
              <input
                type="text"
                name="organizationName"
                value={formData.organizationName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Company Name Inc."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industry *
              </label>
              <select
                name="industry"
                value={formData.industry}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select Industry</option>
                {industries.map(industry => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website
              </label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role in Organization
              </label>
              <input
                type="text"
                name="roleInOrganization"
                value={formData.roleInOrganization}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Event Coordinator"
              />
            </div>
          </div>

          {/* Contact Person Details */}
          <div className="border-t border-gray-200 pt-6">
            <h5 className="text-md font-semibold text-gray-900 mb-4">Contact Person Details</h5>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+358 123 456 789"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Tampere, Finland"
              />
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio / Description
              </label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Brief description of the organization and their event expertise..."
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={isCreating}
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isCreating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Creating Organizer...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5 mr-2" />
                  Create Organizer Account
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Important Notes */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertTriangle className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
          <div>
            <h5 className="text-sm font-medium text-blue-900 mb-1">Important Notes</h5>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Created organizers will not have login access initially</li>
              <li>• They can be verified later through the admin panel</li>
              <li>• Username and email must be unique across all users</li>
              <li>• Organizers can create events once their accounts are set up</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};