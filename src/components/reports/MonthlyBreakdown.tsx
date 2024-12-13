import React, { useEffect, useState } from 'react';

interface MonthlyData {
  month: number;
  panel_count: number;
  carousel_count: number;
}

interface MonthlyStats {
  academic_year: string;
  monthly_data: MonthlyData[];
}

const monthNames = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];

const MonthlyBreakdown: React.FC = () => {
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMonthlyStats = async () => {
      try {
        const response = await fetch('/api/reports/monthly-stats');
        if (!response.ok) {
          throw new Error('Failed to fetch monthly stats');
        }
        const data = await response.json();
        setMonthlyStats(data);
      } catch (error) {
        console.error('Error fetching monthly stats:', error);
        setError('Failed to load monthly statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyStats();
  }, []);

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-100">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr className="bg-gray-50/50">
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Season
            </th>
            {monthNames.map((month) => (
              <th key={month} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                {month}
              </th>
            ))}
            <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {monthlyStats.map((yearData) => {
            const yearTotals = {
              panels: 0,
              carousels: 0,
            };

            // Create a map of month data for easy lookup
            const monthMap = new Map(
              yearData.monthly_data.map(data => [data.month, data])
            );

            return (
              <React.Fragment key={yearData.academic_year}>
                {/* Panel Row */}
                <tr className="bg-green-50/50">
                  <td className="px-3 py-2 text-sm text-gray-900">
                    {yearData.academic_year}
                  </td>
                  {monthNames.map((_, index) => {
                    const monthNum = ((index + 9) % 12) || 12; // Convert to academic year months
                    const monthData = monthMap.get(monthNum);
                    const count = monthData?.panel_count || 0;
                    yearTotals.panels += count;
                    return (
                      <td key={monthNum} className="px-3 py-2 text-sm text-center text-gray-900">
                        {count ? (
                          <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full bg-green-100 text-green-800">
                            {count}
                          </span>
                        ) : '—'}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-sm text-center font-semibold text-green-600">
                    {yearTotals.panels}
                  </td>
                </tr>
                {/* Carousel Row */}
                <tr className="bg-blue-50/50">
                  <td className="px-3 py-2 text-sm text-gray-900"></td>
                  {monthNames.map((_, index) => {
                    const monthNum = ((index + 9) % 12) || 12;
                    const monthData = monthMap.get(monthNum);
                    const count = monthData?.carousel_count || 0;
                    yearTotals.carousels += count;
                    return (
                      <td key={monthNum} className="px-3 py-2 text-sm text-center text-gray-900">
                        {count ? (
                          <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                            {count}
                          </span>
                        ) : '—'}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-sm text-center font-semibold text-blue-600">
                    {yearTotals.carousels}
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export { MonthlyBreakdown };
