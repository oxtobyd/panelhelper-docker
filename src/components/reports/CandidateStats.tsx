import React, { useEffect, useState } from 'react';
import { CandidateAgeDistribution } from './CandidateAgeDistribution';

interface CandidateStatsProps {
  season: string;
  onDioceseDataLoad?: (data: DioceseStats[]) => void;
}

interface DioceseStats {
  diocese_name: string;
  total_candidates: number;
}

interface GenderStats {
  gender: string;
  count: number;
}

interface Stats {
  byGender: GenderStats[];
  byDiocese: DioceseStats[];
  byAge: { range: string; count: number }[];
  totalCandidates: number;
}

export const CandidateStats: React.FC<CandidateStatsProps> = ({ season, onDioceseDataLoad }) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const genderLabels: Record<string, string> = {
    'M': 'Male',
    'F': 'Female',
    'Not Specified': 'Not Specified'
  };

  const genderColors: Record<string, { bg: string; text: string }> = {
    'M': { bg: 'bg-blue-500', text: 'text-blue-600' },
    'F': { bg: 'bg-purple-500', text: 'text-purple-600' },
    'Not Specified': { bg: 'bg-gray-400', text: 'text-gray-600' }
  };

  const ageColors: Record<string, { bg: string; text: string }> = {
    '18-24': { bg: 'bg-red-500', text: 'text-red-600' },
    '25-34': { bg: 'bg-orange-500', text: 'text-orange-600' },
    '35-44': { bg: 'bg-yellow-500', text: 'text-yellow-600' },
    '45-54': { bg: 'bg-green-500', text: 'text-green-600' },
    '55-64': { bg: 'bg-blue-500', text: 'text-blue-600' },
    '65+': { bg: 'bg-indigo-500', text: 'text-indigo-600' }
  };

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const url = season
          ? `/api/reports/candidate-stats?season=${season}`
          : '/api/reports/candidate-stats';
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch candidate stats: ${response.statusText}`);
        }
        const data = await response.json();
        if (!data || !data.byGender) {
          throw new Error('Invalid data format received from server');
        }
        console.log('Gender data:', data.byGender);
        console.log('Gender data details:', JSON.stringify(data.byGender, null, 2));
        setStats(data);
        if (onDioceseDataLoad) {
          onDioceseDataLoad(data.byDiocese);
        }
      } catch (error) {
        console.error('Error fetching candidate stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [season, onDioceseDataLoad]);

  if (loading || !stats) {
    return <div>Loading...</div>;
  }

  const totalCandidates = stats.byGender.reduce((sum, stat) => sum + stat.count, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Gender Distribution</h3>
          <div className="space-y-4">
            {stats.byGender.map((stat) => {
              const percentage = ((stat.count / totalCandidates) * 100).toFixed(1);
              const genderKey = stat.gender || 'Not Specified';
              console.log('Processing gender:', genderKey);
              const colors = genderColors[genderKey];
              const label = genderLabels[genderKey] || genderKey;
              
              return (
                <div key={genderKey} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">
                      {label}
                    </span>
                    <span className={`text-sm font-bold ${colors?.text || 'text-gray-700'}`}>
                      {stat.count} ({percentage}%)
                    </span>
                  </div>
                  <div className="relative">
                    <div className="overflow-hidden h-2 text-xs flex rounded-full bg-gray-100">
                      <div
                        style={{ width: `${percentage}%` }}
                        className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${colors?.bg || 'bg-gray-200'} transition-all duration-500`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">Total Candidates</span>
              <span className="font-semibold text-gray-900">{totalCandidates}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Age Distribution</h3>
          {stats.byAge && (
            <div className="space-y-4">
              {stats.byAge.map(d => {
                const percentageRaw = (Number(d.count) / totalCandidates) * 100;
                const percentage = percentageRaw.toFixed(1);
                const colors = ageColors[d.range] || { bg: 'bg-gray-100', text: 'text-gray-700' };
                return (
                  <div key={d.range} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">
                        {d.range}
                      </span>
                      <span className={`text-sm font-bold ${colors.text}`}>
                        {d.count} ({percentage}%)
                      </span>
                    </div>
                    <div className="relative">
                      <div className="overflow-hidden h-2 text-xs flex rounded-full bg-gray-100">
                        <div
                          style={{ width: `${percentageRaw}%` }}
                          className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${colors.bg} transition-all duration-500`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
