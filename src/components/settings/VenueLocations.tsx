import React, { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';

interface VenueLocation {
  id: number;
  venue_name: string;
  latitude: number;
  longitude: number;
}

interface EditModalProps {
  venue?: VenueLocation;
  onClose: () => void;
  onSave: (venue: Omit<VenueLocation, 'id'>) => void;
}

function EditModal({ venue, onClose, onSave }: EditModalProps) {
  const [formData, setFormData] = useState({
    venue_name: venue?.venue_name || '',
    latitude: venue?.latitude || 0,
    longitude: venue?.longitude || 0,
  });
  const [venueNames, setVenueNames] = useState<string[]>([]);
  const [postcode, setPostcode] = useState('');
  const [lookupError, setLookupError] = useState('');

  useEffect(() => {
    const fetchVenueNames = async () => {
      try {
        const response = await fetch('/api/venues/names');
        if (response.ok) {
          const names = await response.json();
          setVenueNames(names);
        }
      } catch (error) {
        console.error('Error fetching venue names:', error);
      }
    };

    fetchVenueNames();
  }, []);

  const handlePostcodeLookup = async () => {
    setLookupError('');
    try {
      const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`);
      const data = await response.json();
      
      if (response.ok && data.result) {
        setFormData({
          ...formData,
          latitude: data.result.latitude,
          longitude: data.result.longitude
        });
      } else {
        setLookupError('Invalid postcode');
      }
    } catch (error) {
      console.error('Error looking up postcode:', error);
      setLookupError('Error looking up postcode');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {venue ? 'Edit Venue Location' : 'Add Venue Location'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Venue Name</label>
            {venue ? (
              <input
                type="text"
                value={formData.venue_name}
                readOnly
                className="w-full p-2 border rounded bg-gray-50"
              />
            ) : (
              <select
                value={formData.venue_name}
                onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })}
                className="w-full p-2 border rounded"
                required
              >
                <option value="">Select a venue</option>
                {venueNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Postcode Lookup</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                placeholder="Enter postcode"
                className="flex-1 p-2 border rounded"
              />
              <button
                type="button"
                onClick={handlePostcodeLookup}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Lookup
              </button>
            </div>
            {lookupError && (
              <p className="text-red-500 text-sm mt-1">{lookupError}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Latitude</label>
            <input
              type="number"
              step="any"
              value={formData.latitude}
              onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Longitude</label>
            <input
              type="number"
              step="any"
              value={formData.longitude}
              onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
              className="w-full p-2 border rounded"
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function VenueLocations() {
  const [venues, setVenues] = useState<VenueLocation[]>([]);
  const [editingVenue, setEditingVenue] = useState<VenueLocation | undefined>();
  const [showModal, setShowModal] = useState(false);

  const fetchVenues = async () => {
    try {
      const response = await fetch('/api/venues/locations');
      if (response.ok) {
        const data = await response.json();
        setVenues(data);
      }
    } catch (error) {
      console.error('Error fetching venues:', error);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, []);

  const handleSave = async (venueData: Omit<VenueLocation, 'id'>) => {
    try {
      const response = await fetch('/api/venues/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(venueData),
      });
      
      if (response.ok) {
        setShowModal(false);
        fetchVenues();
      }
    } catch (error) {
      console.error('Error saving venue:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this venue location?')) return;
    
    try {
      const response = await fetch(`/api/venues/locations/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        fetchVenues();
      }
    } catch (error) {
      console.error('Error deleting venue:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Venue Locations</h2>
        <button
          onClick={() => {
            setEditingVenue(undefined);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          <Plus className="w-4 h-4" />
          Add Venue
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Venue Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Latitude</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Longitude</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {venues.map((venue) => (
              <tr key={venue.id}>
                <td className="px-6 py-4 whitespace-nowrap">{venue.venue_name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{venue.latitude}</td>
                <td className="px-6 py-4 whitespace-nowrap">{venue.longitude}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingVenue(venue);
                        setShowModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(venue.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <EditModal
          venue={editingVenue}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
