import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useQuery } from '@tanstack/react-query';
import type { LatLngTuple } from 'leaflet';

// Fix Leaflet CSS
import L from 'leaflet';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface DioceseStats {
  diocese_name: string;
  total_candidates: number;
  panel_count: number;
  carousel_count: number;
}

interface Props {
  dioceseStats: DioceseStats[];
  season?: string;
}

const Legend: React.FC<{ grades: [number, string][] }> = ({ grades }) => {
  return (
    <div className="absolute bottom-8 right-8 bg-white p-4 rounded-lg shadow-md z-[1000]">
      <h4 className="text-sm font-medium mb-2">Candidates per Diocese</h4>
      {grades.map(([threshold, color], i) => (
        <div key={i} className="flex items-center mb-1">
          <div
            className="w-6 h-6 mr-2 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm">
            {i === 0 ? `${threshold}+` :
             i === grades.length - 1 ? `0-${grades[i-1][0]}` :
             `${threshold}-${grades[i-1][0]}`}
          </span>
        </div>
      ))}
    </div>
  );
};

export const DioceseCandidateHeatMap: React.FC<Props> = ({ dioceseStats }) => {
  const position: LatLngTuple = [52.5, -1.5]; // Center of England

  const { data: dioceseCenters } = useQuery({
    queryKey: ['dioceseBoundaries'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/reports/diocese-boundaries', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch diocese boundaries');
      const data = await response.json();
      // Extract center points from boundaries
      return data.features.map((feature: any) => ({
        name: feature.properties.name,
        center: getCenterPoint(feature.geometry.coordinates[0])
      }));
    }
  });

  const getCenterPoint = (coordinates: number[][]): LatLngTuple => {
    const lats = coordinates.map(coord => coord[1]);
    const lngs = coordinates.map(coord => coord[0]);
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    return [centerLat, centerLng];
  };

  const grades: [number, string][] = [
    [100, '#006d32'], // Dark green
    [50, '#26a641'],  // Medium green
    [20, '#39d353'],  // Light green
    [0, '#d3f8d3']    // Very light green
  ];

  const getColor = (total: number) => {
    for (const [threshold, color] of grades) {
      if (total >= threshold) return color;
    }
    return grades[grades.length - 1][1];
  };

  const getRadius = (total: number) => {
    // Base radius of 10, grows with square root of total to prevent huge circles
    return Math.max(10, Math.sqrt(total) * 5);
  };

  if (!dioceseCenters) return <div>Loading map data...</div>;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Diocese Distribution Map</h3>
      <div className="relative" style={{ height: '500px' }}>
        <MapContainer
          center={position}
          zoom={6}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {dioceseCenters.map((diocese: any) => {
            const stats = dioceseStats.find(d => d.diocese_name === diocese.name);
            const total = stats?.total_candidates || 0;
            
            return (
              <CircleMarker
                key={diocese.name}
                center={diocese.center as LatLngTuple}
                radius={getRadius(total)}
                fillColor={getColor(total)}
                color="white"
                weight={2}
                opacity={1}
                fillOpacity={0.7}
              >
                <Popup>
                  <div className="p-2">
                    <strong>{diocese.name}</strong><br/>
                    Total Candidates: {total}<br/>
                    Panel: {stats?.panel_count || 0}<br/>
                    Carousel: {stats?.carousel_count || 0}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
        <Legend grades={grades} />
      </div>
    </div>
  );
};
