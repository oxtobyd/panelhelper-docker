import React from 'react';
import VenueLocations from './VenueLocations';

export default function SettingsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="bg-white rounded-lg shadow">
        <VenueLocations />
      </div>
    </div>
  );
}
