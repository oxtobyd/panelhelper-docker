import React, { useEffect, useState } from 'react';

interface SeasonStats {
    season: string;
    events: number;
}

interface VenueStats {
    venue: string;
    seasons: SeasonStats[];
}

export const VenueStatsBySeason: React.FC = () => {
    const [stats, setStats] = useState<VenueStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch('/api/reports/venue-stats-by-season');
                if (!response.ok) {
                    throw new Error('Failed to fetch venue statistics');
                }
                const data = await response.json();
                setStats(data);
                setError(null);
            } catch (error) {
                console.error('Error fetching venue statistics:', error);
                setError('Failed to load venue statistics');
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return <div className="animate-pulse bg-gray-100 rounded-lg h-64"></div>;
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
            </div>
        );
    }

    // Get unique seasons from the first venue's data
    const seasons = stats[0]?.seasons.map(s => s.season) || [];

    // Filter out venues with no events across all seasons
    const activeVenues = stats.filter(venue => 
        venue.seasons.some(season => season.events > 0)
    );

    return (
        <div className="bg-white rounded-lg shadow-sm">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Venue
                            </th>
                            {seasons.map(season => (
                                <th key={season} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Season {season}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {activeVenues.map((venue) => (
                            <tr key={venue.venue} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {venue.venue}
                                </td>
                                {seasons.map(season => {
                                    const seasonStats = venue.seasons.find(s => s.season === season);
                                    return (
                                        <td key={season} className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                            <span className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full ${
                                                seasonStats?.events ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'
                                            }`}>
                                                {seasonStats?.events || '—'}
                                            </span>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                        <tr className="bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                Total Venues Used
                            </td>
                            {seasons.map(season => {
                                const venuesUsed = activeVenues.filter(venue => 
                                    venue.seasons.some(s => s.season === season && s.events > 0)
                                ).length;
                                return (
                                    <td key={season} className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium">
                                        {venuesUsed}
                                    </td>
                                );
                            })}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};
