import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface VenueLocation {
  venue_name: string;
  panel_count: number;
  position: [number, number];
}

interface Props {
  season?: string;
}

export const VenueMap: React.FC<Props> = ({ season }) => {
  const [venues, setVenues] = useState<VenueLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        setLoading(true);
        const url = season 
          ? `/api/reports/venue-locations?season=${season}`
          : '/api/reports/venue-locations';
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch venue data');
        const data = await response.json();
        setVenues(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading venue data');
      } finally {
        setLoading(false);
      }
    };

    fetchVenues();
  }, [season]);

  // Center the map on roughly the middle of England
  const centerPosition: [number, number] = [52.5, -1.5];
  const maxCount = Math.max(...venues.map(v => v.panel_count));

  if (loading) return <div>Loading venue map...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (venues.length === 0) return <div>No venue data available</div>;

  return (
    <div style={{ height: '400px', width: '100%' }}>
      <MapContainer
        center={centerPosition}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {venues.map((venue) => (
          <CircleMarker
            key={venue.venue_name}
            center={venue.position}
            radius={Math.sqrt(venue.panel_count / maxCount) * 20}
            fillColor="#0088cc"
            fillOpacity={0.6}
            stroke={true}
            color="#0088cc"
            weight={1}
          >
            <Popup>
              <strong>{venue.venue_name}</strong>
              <br />
              {venue.panel_count} panels
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
};
