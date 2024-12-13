import React, { useState, useEffect } from 'react';
import { Users, Award, School, UserSquare2 } from 'lucide-react';
import { AdviserDetailsModal } from './AdviserDetailsModal';

interface AdviserStats {
    total_advisers: number;
    flagged_active_advisers: number;
    engaged_advisers: number;
    incomplete_profiles: number;
    no_max_values: number;
    not_engaged: number;
    incomplete_profile_stats: { missing_fields_count: number; adviser_count: number }[];
    training_status: { status: string; count: number }[];
    formation_type: { type: string; count: number }[];
    adviser_type: { type: string; count: number }[];
    active_advisers: number;
}

interface Adviser {
    id: number;
    name: string;
    missing_fields: string[];
}

interface AdviserStatsProps {
    season?: string;
}

export const AdviserStats: React.FC<AdviserStatsProps> = ({ season }) => {
    const [stats, setStats] = useState<AdviserStats | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [selectedAdvisers, setSelectedAdvisers] = useState<Adviser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const url = season
                    ? `/api/reports/adviser-stats?season=${encodeURIComponent(season)}`
                    : '/api/reports/adviser-stats';
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error('Failed to fetch adviser statistics');
                }
                const data = await response.json();
                setStats(data);
                setError(null);
            } catch (error) {
                console.error('Error fetching adviser stats:', error);
                setError('Failed to load adviser statistics');
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [season]);

    const fetchAdviserDetails = async (fields: string[], missingFieldsCount?: number) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                fields: fields.join(','),
                ...(season && { season }),
                ...(missingFieldsCount !== undefined && { missingFieldsCount: missingFieldsCount.toString() })
            });
            const response = await fetch(`/api/reports/adviser-missing-fields?${params}`);
            if (!response.ok) {
                throw new Error('Failed to fetch adviser details');
            }
            const data = await response.json();
            setSelectedAdvisers(data || []);
        } catch (error) {
            console.error('Error fetching adviser details:', error);
            setSelectedAdvisers([]);
        }
        setLoading(false);
    };

    const handleStatClick = (title: string, fields: string[], missingFieldsCount?: number) => {
        setModalTitle(title);
        fetchAdviserDetails(fields, missingFieldsCount);
        setModalOpen(true);
    };

    const calculatePercentage = (value: number, total: number) => {
        return ((value / total) * 100).toFixed(1);
    };

    const StatCard = ({ title, value, subtitle, icon: Icon, color, bgColor, details, onClick }: { title: string; value: number | string; subtitle?: string; icon: React.ElementType; color: string; bgColor: string; details?: React.ReactNode; onClick?: () => void }) => (
        <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start justify-between">
                <div className="w-full">
                    <p className="text-xs font-medium text-gray-600">{title}</p>
                    <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
                    {subtitle && (
                        <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
                    )}
                    {details && (
                        <div className="mt-3 border-t pt-3">
                            {details}
                        </div>
                    )}
                </div>
                <div className={`p-2 rounded-lg ${bgColor}`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                </div>
            </div>
            {onClick && (
                <button onClick={onClick} className="absolute top-0 right-0 p-1.5 rounded-full hover:bg-gray-100 transition duration-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            )}
        </div>
    );

    const DistributionSection = ({ title, data, colorMap }: { title: string; data: { type: string; count: number }[] | { status: string; count: number }[]; colorMap: Record<string, string> }) => {
        return (
            <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow duration-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
                <div className="space-y-4">
                    {data.map((item) => {
                        const label = 'type' in item ? item.type : item.status;
                        const percentage = ((item.count / stats?.flagged_active_advisers) * 100).toFixed(1);
                        const colors = colorMap[label] || { bg: 'bg-gray-100', text: 'text-gray-600' };
                        return (
                            <div key={label} className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-600">
                                        {label}
                                    </span>
                                    <span className={`text-sm font-bold ${colors.text}`}>
                                        {item.count} ({percentage}%)
                                    </span>
                                </div>
                                <div className="relative pt-1">
                                    <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-100">
                                        <div
                                            style={{ width: `${percentage}%` }}
                                            className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${colors.bg} transition-all duration-500`}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const trainingColors: Record<string, { bg: string; text: string }> = {
        'Stage 1 Total': { bg: 'bg-emerald-500', text: 'text-emerald-700' },
        'Stage 2 Total': { bg: 'bg-blue-500', text: 'text-blue-700' },
        'Stage 1 Only': { bg: 'bg-green-500', text: 'text-green-700' },
        'No Training': { bg: 'bg-gray-400', text: 'text-gray-600' }
    };

    const formationColors: Record<string, { bg: string; text: string }> = {
        'Ministerial': { bg: 'bg-purple-500', text: 'text-purple-700' },
        'Personal': { bg: 'bg-indigo-500', text: 'text-indigo-700' },
        'Not Specified': { bg: 'bg-gray-400', text: 'text-gray-600' }
    };

    const typeColors: Record<string, { bg: string; text: string }> = {
        'Ordained': { bg: 'bg-amber-500', text: 'text-amber-700' },
        'Lay': { bg: 'bg-cyan-500', text: 'text-cyan-700' },
        'Not Specified': { bg: 'bg-gray-400', text: 'text-gray-600' }
    };

    if (loading) {
        return <div className="animate-pulse bg-gray-100 rounded-lg h-64"></div>;
    }

    if (error || !stats) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error || 'Failed to load adviser statistics'}
            </div>
        );
    }

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <StatCard
                    title="Total Advisers"
                    value={stats.total_advisers}
                    subtitle="Registered (includes flagged not active)"
                    icon={Users}
                    color="text-blue-700"
                    bgColor="bg-blue-100"
                />
                <StatCard
                    title="Flagged Active Advisers"
                    value={stats.flagged_active_advisers}
                    subtitle={`${Math.round((stats.flagged_active_advisers / stats.total_advisers) * 100)}% of total advisers`}
                    icon={UserSquare2}
                    color="text-green-700"
                    bgColor="bg-green-100"
                />
                <StatCard
                    title="Engaged Advisers"
                    value={stats.engaged_advisers}
                    subtitle={`${Math.round((stats.engaged_advisers / stats.flagged_active_advisers) * 100)}% of active advisers`}
                    icon={Award}
                    color="text-purple-700"
                    bgColor="bg-purple-100"
                />
                <StatCard
                    title="Incomplete Profiles"
                    value={stats.incomplete_profiles}
                    percentage={calculatePercentage(stats.incomplete_profiles, stats.active_advisers)}
                    icon={Users}
                    color="text-orange-700"
                    bgColor="bg-orange-100"
                    details={
                        <div className="mt-2 space-y-1">
                            {stats.incomplete_profile_stats.map(stat => (
                                <div
                                    key={stat.missing_fields_count}
                                    className="flex justify-between items-center cursor-pointer hover:bg-orange-50 p-1 rounded"
                                    onClick={() => handleStatClick(
                                        `Advisers Missing ${stat.missing_fields_count} Field${stat.missing_fields_count === 1 ? '' : 's'}`,
                                        ['Maximum Values', 'Training Status', 'Formation Type', 'Adviser Type', 'Gender'],
                                        stat.missing_fields_count
                                    )}
                                >
                                    <span className="text-gray-600">
                                        {stat.missing_fields_count === 1 ? '1 field missing' : `${stat.missing_fields_count} fields missing`}
                                    </span>
                                    <span className="font-medium text-orange-700">
                                        {stat.adviser_count} {stat.adviser_count === 1 ? 'adviser' : 'advisers'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    }
                />
                <StatCard
                    title="No Max Values"
                    value={stats.no_max_values}
                    icon={Award}
                    color="text-red-700"
                    bgColor="bg-red-100"
                    onClick={() => handleStatClick('Advisers Missing Maximum Values', ['Maximum Values'])}
                />
                <StatCard
                    title="Not Engaged"
                    value={stats.not_engaged}
                    subtitle={`${Math.round((stats.not_engaged / stats.flagged_active_advisers) * 100)}% of active advisers`}
                    icon={Users}
                    color="text-red-700"
                    bgColor="bg-red-100"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <DistributionSection
                    title="Training Status"
                    data={stats.training_status}
                    colorMap={trainingColors}
                />
                <DistributionSection
                    title="Formation Type"
                    data={stats.formation_type}
                    colorMap={formationColors}
                />
                <DistributionSection
                    title="Type"
                    data={stats.adviser_type}
                    colorMap={typeColors}
                />
            </div>

            <AdviserDetailsModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={modalTitle}
                advisers={selectedAdvisers}
            />
        </div>
    );
};
