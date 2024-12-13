import React, { useEffect, useState } from 'react';

interface DemographicData {
  age_ranges: { range: string; count: number }[];
  gender: { gender: string; count: number }[];
}

interface AdviserDemographicsProps {
  season?: string;
}

const genderLabels: Record<string, string> = {
  'M': 'Male',
  'F': 'Female',
  'O': 'Other',
  'P': 'Prefer not to say',
  'Not Specified': 'Not Specified'
};

const genderColors: Record<string, { bg: string; text: string }> = {
  'M': { bg: 'bg-blue-100', text: 'text-blue-700' },
  'F': { bg: 'bg-purple-100', text: 'text-purple-700' },
  'O': { bg: 'bg-green-100', text: 'text-green-700' },
  'P': { bg: 'bg-gray-100', text: 'text-gray-700' },
  'Not Specified': { bg: 'bg-yellow-50', text: 'text-yellow-600' }
};

const ageColors: Record<string, { bg: string; text: string }> = {
  'Under 35': { bg: 'bg-blue-50', text: 'text-blue-600' },
  '35-44': { bg: 'bg-blue-100', text: 'text-blue-700' },
  '45-54': { bg: 'bg-blue-200', text: 'text-blue-800' },
  '55-64': { bg: 'bg-blue-300', text: 'text-blue-900' },
  '65 and over': { bg: 'bg-blue-400', text: 'text-blue-950' },
  'Not Specified': { bg: 'bg-yellow-50', text: 'text-yellow-600' }
};

export const AdviserDemographics = ({ season }: AdviserDemographicsProps) => {
  const [data, setData] = useState<DemographicData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const url = season 
          ? `/api/reports/adviser-demographics?season=${encodeURIComponent(season)}`
          : '/api/reports/adviser-demographics';
        const response = await fetch(url);
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Error fetching adviser demographics:', error);
      }
    };

    fetchData();
  }, [season]);

  if (!data) return null;

  const total = data.gender.reduce((sum, g) => sum + g.count, 0);
  const totalByAge = data.age_ranges.reduce((sum, a) => sum + a.count, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-200">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Adviser Gender Distribution</h3>
          <p className="text-sm text-gray-500 mt-1">Total: {total} advisers</p>
        </div>
        <div className="space-y-4">
          {data.gender.map(g => {
            const percentage = (g.count / total) * 100;
            const colors = genderColors[g.gender] || { bg: 'bg-gray-100', text: 'text-gray-700' };
            return (
              <div key={g.gender} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">
                    {genderLabels[g.gender] || g.gender}
                  </span>
                  <span className={`text-sm font-bold ${colors.text}`}>
                    {g.count} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="relative">
                  <div className="overflow-hidden h-2 text-xs flex rounded-full bg-gray-100">
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
      <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-200">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Adviser Age Distribution</h3>
          <p className="text-sm text-gray-500 mt-1">Total: {totalByAge} advisers</p>
        </div>
        <div className="space-y-4">
          {data.age_ranges.map(a => {
            const percentage = (a.count / totalByAge) * 100;
            const colors = ageColors[a.range] || { bg: 'bg-blue-100', text: 'text-blue-700' };
            return (
              <div key={a.range} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">
                    {a.range}
                  </span>
                  <span className={`text-sm font-bold ${colors.text}`}>
                    {a.count} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="relative">
                  <div className="overflow-hidden h-2 text-xs flex rounded-full bg-gray-100">
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
    </div>
  );
};
