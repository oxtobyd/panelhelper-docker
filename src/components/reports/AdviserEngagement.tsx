import React, { useEffect, useState } from 'react';

interface SeasonData {
    season: string;
    panel_count: number;
    carousel_count: number;
}

interface AdviserData {
    id: number;
    adviser_name: string;
    seasons: SeasonData[];
}

export const AdviserEngagement: React.FC = () => {
    const [data, setData] = useState<AdviserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch('/api/reports/adviser-engagement');
                if (!response.ok) {
                    throw new Error('Failed to fetch adviser engagement data');
                }
                const result = await response.json();
                if (!Array.isArray(result)) {
                    throw new Error('Invalid data format received');
                }
                setData(result);
            } catch (error) {
                console.error('Error fetching adviser engagement:', error);
                setError(error instanceof Error ? error.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return <div className="animate-pulse bg-gray-100 rounded-lg h-64"></div>;
    }

    if (error) {
        return (
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Adviser Engagement</h3>
                <div className="text-red-500">Error: {error}</div>
            </div>
        );
    }

    if (!data.length) {
        return (
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Adviser Engagement</h3>
                <div className="text-gray-500">No adviser engagement data available.</div>
            </div>
        );
    }

    // Get unique seasons from the first adviser's data
    const seasons = data[0]?.seasons.map(s => s.season) || [];

    return (
        <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Adviser Engagement</h3>
            
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead>
                        <tr>
                            <th className="text-left text-sm font-medium text-gray-500 pb-4">Adviser</th>
                            {seasons.map(season => (
                                <th key={season} className="text-center text-sm font-medium text-gray-500 pb-4" colSpan={3}>
                                    <div className="flex items-center justify-between px-4">
                                        <span>Season {season}</span>
                                        {seasons.indexOf(season) < seasons.length - 1 && (
                                            <span className="text-gray-400">+/-</span>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.map((adviser) => (
                            <tr key={adviser.id}>
                                <td className="py-4 text-sm font-medium text-gray-900">
                                    {adviser.adviser_name}
                                </td>
                                {adviser.seasons.map((season, index) => {
                                    const nextSeason = adviser.seasons[index + 1];
                                    const totalChange = nextSeason
                                        ? (season.panel_count + season.carousel_count) - 
                                          (nextSeason.panel_count + nextSeason.carousel_count)
                                        : 0;

                                    return (
                                        <React.Fragment key={`${adviser.id}-${season.season}`}>
                                            <td className="py-4 text-center px-2">
                                                {season.panel_count > 0 ? (
                                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700">
                                                        {season.panel_count}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-400">
                                                        —
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 text-center px-2">
                                                {season.carousel_count > 0 ? (
                                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700">
                                                        {season.carousel_count}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-400">
                                                        —
                                                    </span>
                                                )}
                                            </td>
                                            {index < adviser.seasons.length - 1 && (
                                                <td className="py-4 text-center px-2">
                                                    <div className="inline-flex items-center">
                                                        <span className={`
                                                            inline-flex items-center justify-center rounded-full px-2 py-1
                                                            ${totalChange > 0 
                                                                ? 'bg-green-100 text-green-700' 
                                                                : totalChange < 0 
                                                                    ? 'bg-red-100 text-red-700'
                                                                    : 'bg-gray-100 text-gray-500'
                                                            }
                                                        `}>
                                                            {totalChange > 0 ? '↑' : totalChange < 0 ? '↓' : '='}{Math.abs(totalChange)}
                                                        </span>
                                                        <span className="text-gray-400 ml-1">→</span>
                                                    </div>
                                                </td>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
