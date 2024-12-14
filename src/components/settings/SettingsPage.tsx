import React from 'react';
import VenueLocations from './VenueLocations';
import UserManagement from './UserManagement';
import { useAuth } from '../../contexts/AuthContext';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="space-y-8">
        <div className="bg-white rounded-lg shadow p-6">
          <VenueLocations />
        </div>
        {user?.role === 'admin' && (
          <div className="bg-white rounded-lg shadow p-6">
            <UserManagement />
          </div>
        )}
      </div>
    </div>
  );
}
