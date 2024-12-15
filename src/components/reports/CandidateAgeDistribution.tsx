import React from 'react';

interface AgeDistributionData {
  range: string;
  count: number;
}

const ageColors: Record<string, { bg: string; text: string }> = {
  'Under 25': { bg: 'bg-blue-200', text: 'text-blue-800' },
  '25-34': { bg: 'bg-blue-300', text: 'text-blue-800' },
  '35-44': { bg: 'bg-blue-400', text: 'text-blue-900' },
  '45-54': { bg: 'bg-blue-500', text: 'text-blue-900' },
  '55-64': { bg: 'bg-blue-600', text: 'text-blue-900' },
  '65 and over': { bg: 'bg-blue-700', text: 'text-blue-900' },
  'Not Specified': { bg: 'bg-yellow-100', text: 'text-yellow-800' }
};

interface CandidateAgeDistributionProps {
  ageData: AgeDistributionData[];
}

export const CandidateAgeDistribution: React.FC<CandidateAgeDistributionProps> = ({ ageData }) => {
  console.log('Candidate Age Data:', ageData);
  const total = ageData.reduce((sum, d) => sum + Number(d.count), 0);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Age Distribution</h3>
      <div className="space-y-4">
        {ageData.map(d => {
          const percentageRaw = (Number(d.count) / Number(total)) * 100;
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
    </div>
  );
};
