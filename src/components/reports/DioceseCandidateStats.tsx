import React from 'react';

interface DioceseStats {
    diocese_name: string;
    season: string;
    panel_count: number;
    carousel_count: number;
    total_count: number;
    panel_change: number;
    carousel_change: number;
    total_change: number;
}

interface DioceseCandidateStatsProps {
    dioceseStats: DioceseStats[];
}

export const DioceseCandidateStats: React.FC<DioceseCandidateStatsProps> = ({ dioceseStats }) => {
    // Group stats by season
    const seasons = Array.from(new Set(dioceseStats.map(stat => stat.season))).sort().reverse();
    const dioceses = Array.from(new Set(dioceseStats.map(stat => stat.diocese_name))).sort();

    return (
        <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Diocese Distribution</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                        <tr className="bg-gray-50/50">
                            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Diocese
                            </th>
                            {seasons.map(season => (
                                <React.Fragment key={season}>
                                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" colSpan={3}>
                                        Season {season}
                                    </th>
                                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        +/-
                                    </th>
                                </React.Fragment>
                            ))}
                        </tr>
                        <tr className="bg-gray-50/50">
                            <th></th>
                            {seasons.map(season => (
                                <React.Fragment key={season}>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Panel</th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Carousel</th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Total</th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500"></th>
                                </React.Fragment>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {dioceses.map(diocese => (
                            <tr key={diocese} className="hover:bg-gray-50/50">
                                <td className="px-3 py-3 text-sm text-gray-900">
                                    {diocese || '-'}
                                </td>
                                {seasons.map(season => {
                                    const stats = dioceseStats.find(s => s.diocese_name === diocese && s.season === season) || {
                                        panel_count: 0,
                                        carousel_count: 0,
                                        total_count: 0,
                                        total_change: 0
                                    };
                                    
                                    return (
                                        <React.Fragment key={season}>
                                            <td className="px-3 py-3 text-sm text-center">
                                                <span className="bg-green-50 text-green-700 px-2 py-1 rounded">
                                                    {stats.panel_count || '—'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-sm text-center">
                                                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                                    {stats.carousel_count || '—'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-sm text-center font-medium">
                                                {Number(stats.panel_count || 0) + Number(stats.carousel_count || 0) || '—'}
                                            </td>
                                            <td className="px-3 py-3 text-sm text-center">
                                                {stats.total_change ? (
                                                    <span className={`inline-flex items-center px-2 py-1 rounded ${
                                                        stats.total_change > 0 
                                                            ? 'bg-green-50 text-green-700' 
                                                            : stats.total_change < 0 
                                                                ? 'bg-red-50 text-red-700'
                                                                : 'bg-gray-50 text-gray-700'
                                                    }`}>
                                                        {stats.total_change > 0 ? '↑' : stats.total_change < 0 ? '↓' : '='} {Math.abs(stats.total_change)}
                                                    </span>
                                                ) : '→'}
                                            </td>
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
