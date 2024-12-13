import React, { useEffect, useState } from 'react';

interface ProgressionStats {
  summary: {
    avg_days: number;
    median_days: number;
    min_days: number;
    max_days: number;
    total_candidates: number;
  };
  outliers: {
    total_records: number;
    filtered_too_short: number;
    filtered_too_long: number;
  };
  distribution: Array<{
    time_range: string;
    count: number;
    percentage: number;
  }>;
}

export const ProgressionStats: React.FC = () => {
  const [stats, setStats] = useState<ProgressionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/reports/progression-times');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Error fetching progression stats:', error);
        setError('Failed to load progression statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">Candidate Progression Times</h3>
        <p className="text-sm text-gray-500 mb-6">
          Analysis of time between first carousel and first panel attendance for each candidate. Only includes candidates who attended both types of events, with the progression time filtered to between 6 weeks and 2 years. Note: Total records may differ from overall attendance as we only count each candidate's first progression.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Summary Statistics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-semibold mb-4">Summary Statistics</h4>
          <div className="space-y-3">
            <div>
              <span className="text-gray-600">Average Time:</span>
              <span className="ml-2 font-medium">{Math.round(stats.summary.avg_days)} days</span>
              <span className="text-gray-500 text-sm ml-2">({Math.round(stats.summary.avg_days/30.44)} months)</span>
            </div>
            <div>
              <span className="text-gray-600">Median Time:</span>
              <span className="ml-2 font-medium">{Math.round(stats.summary.median_days)} days</span>
              <span className="text-gray-500 text-sm ml-2">({Math.round(stats.summary.median_days/30.44)} months)</span>
            </div>
            <div>
              <span className="text-gray-600">Range:</span>
              <span className="ml-2 font-medium">{stats.summary.min_days} - {stats.summary.max_days} days</span>
            </div>
            <div>
              <span className="text-gray-600">Total Valid Progressions:</span>
              <span className="ml-2 font-medium">{stats.summary.total_candidates}</span>
            </div>
          </div>
        </div>

        {/* Filtered Records */}
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-semibold mb-4">Data Quality</h4>
          <div className="space-y-3">
            <div>
              <span className="text-gray-600">Total Records:</span>
              <span className="ml-2 font-medium">{stats.outliers.total_records}</span>
            </div>
            <div>
              <span className="text-gray-600">Filtered Out:</span>
              <div className="ml-4 text-sm">
                <div>
                  <span className="text-gray-500">Too Short (&lt;6 weeks):</span>
                  <span className="ml-2 font-medium">{stats.outliers.filtered_too_short}</span>
                </div>
                <div>
                  <span className="text-gray-500">Too Long (&gt;2 years):</span>
                  <span className="ml-2 font-medium">{stats.outliers.filtered_too_long}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-lg font-semibold mb-4">Time Distribution</h4>
        <div className="space-y-4">
          {stats.distribution.map((item) => (
            <div key={item.time_range} className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block text-gray-600">
                    {item.time_range}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold inline-block text-gray-600">
                    {item.count} candidates ({item.percentage}%)
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                <div
                  style={{ width: `${item.percentage}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
