import React, { useEffect, useState } from 'react';

interface VenueData {
  venue: string;
  total_events: number;
  cancelled_events: number;
  completed_events: number;
  panel_types: string;
  avg_candidates: number;
  avg_utilization: number;
  total_candidates: number;
  total_attendance: number;
  total_capacity: number;
}

interface VenueStatsProps {
  season: string;
}

export const VenueStats: React.FC<VenueStatsProps> = ({ season }) => {
  const [venues, setVenues] = useState<VenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVenueStats = async () => {
      try {
        const url = season
          ? `/api/reports/venue-stats?season=${season}`
          : '/api/reports/venue-stats';
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setVenues(data);
        setError(null);
      } catch (error) {
        console.error('Error fetching venue stats:', error);
        setError('Failed to load venue statistics. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchVenueStats();
  }, [season]);

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  // Get the total candidates from the first venue row since it's the same for all
  const totalCandidates = venues.length > 0 ? Number(venues[0].total_candidates) : 0;
  const totalAttendance = venues.reduce((sum, v) => sum + Number(v.total_attendance), 0);
  const totalCapacity = venues.reduce((sum, v) => sum + Number(v.total_capacity), 0);
  const overallUtilization = totalCapacity > 0 ? Math.round((totalAttendance / totalCapacity) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-lg border border-gray-100">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Venue
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Events
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cancelled
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Avg. Candidates
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Utilization
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Panel Types
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {venues.map((venue) => (
              <tr key={venue.venue} className="hover:bg-gray-50/50">
                <td className="px-3 py-3 text-sm text-gray-900">
                  {venue.venue}
                </td>
                <td className="px-3 py-3 text-sm text-gray-900 text-right font-medium">
                  {venue.completed_events}
                  <span className="text-xs text-gray-500 ml-1">
                    /{venue.total_events}
                  </span>
                </td>
                <td className="px-3 py-3 text-sm text-right">
                  {venue.cancelled_events > 0 ? (
                    <span className="text-red-600 font-medium">
                      {venue.cancelled_events}
                    </span>
                  ) : (
                    <span className="text-gray-400">0</span>
                  )}
                </td>
                <td className="px-3 py-3 text-sm text-gray-900 text-right">
                  {venue.avg_candidates}
                </td>
                <td className="px-3 py-3 text-sm text-right">
                  <span 
                    className={`font-medium ${
                      venue.avg_utilization >= 90 ? 'text-green-600' :
                      venue.avg_utilization >= 75 ? 'text-blue-600' :
                      venue.avg_utilization >= 50 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}
                  >
                    {venue.avg_utilization}%
                  </span>
                </td>
                <td className="px-3 py-3 text-sm text-gray-600">
                  {venue.panel_types}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50/50 rounded-lg p-4 border border-gray-100">
          <div className="text-sm text-gray-600">Total Candidates</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">
            {totalCandidates}
          </div>
        </div>
        <div className="bg-gray-50/50 rounded-lg p-4 border border-gray-100">
          <div className="text-sm text-gray-600">Overall Utilization</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">
            {overallUtilization}%
          </div>
        </div>
      </div>
    </div>
  );
};
