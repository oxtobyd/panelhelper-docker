import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Users, Search, ArrowUpDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

interface Panel {
  id: number;
  panel_name: string;
  panel_date: string;
  venue_name: string;
  candidate_count: string;
  adviser_count: string;
  panel_type: string;
  calculated_season: string;
  panel_secretary?: string;
}

interface SeasonStats {
  panel: number;
  carousel: number;
}

export function PanelList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [showFutureOnly, setShowFutureOnly] = useState(false);
  const [showNeedingAdvisers, setShowNeedingAdvisers] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [sortField, setSortField] = useState<keyof Panel>('panel_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const { data: panels, isLoading, error } = useQuery({
    queryKey: ['panels'],
    queryFn: async () => {
      const response = await fetch('/api/panels');
      if (!response.ok) {
        throw new Error('Failed to fetch panels');
      }
      return response.json();
    },
  });

  // Set default season on initial load
  useEffect(() => {
    if (panels && panels.length > 0 && !selectedSeason) {
      const today = new Date();
      const month = today.getMonth() + 1; // 1-12
      const year = today.getFullYear();
      const currentSeason = month >= 9 
        ? `${year}/${year + 1}`
        : `${year - 1}/${year}`;
      
      if (panels.some((p: Panel) => p.calculated_season === currentSeason)) {
        setSelectedSeason(currentSeason);
      }
    }
  }, [panels, selectedSeason]);

  const filteredPanels = React.useMemo(() => {
    if (!panels) return [];
    
    return panels.filter((panel: Panel) => {
      const matchesSearch = !searchTerm || 
        (panel.panel_name && panel.panel_name.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesType = !selectedType || 
        (panel.panel_type && panel.panel_type.toUpperCase() === selectedType.toUpperCase());
      const matchesSeason = !selectedSeason || panel.calculated_season === selectedSeason;
      
      // Future panels filter
      const matchesFuture = !showFutureOnly || 
        new Date(panel.panel_date) > new Date();
      
      // Needing advisers filter
      const adviserCount = parseInt(panel.adviser_count) || 0;
      const requiredAdvisers = panel.panel_type?.toUpperCase() === 'PANEL' ? 8 : 6;
      const needsAdvisers = adviserCount < requiredAdvisers;
      const matchesNeedingAdvisers = !showNeedingAdvisers || needsAdvisers;

      return matchesSearch && matchesType && matchesSeason && matchesFuture && matchesNeedingAdvisers;
    }).sort((a: Panel, b: Panel) => {
      const aValue = a[sortField]?.toString() || '';
      const bValue = b[sortField]?.toString() || '';
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });
  }, [panels, searchTerm, selectedType, selectedSeason, showFutureOnly, showNeedingAdvisers, sortField, sortDirection]);

  const uniqueSeasons = React.useMemo(() => {
    if (!panels) return [];
    return [...new Set(panels.map((p: Panel) => p.calculated_season))]
      .filter(Boolean)
      .sort()
      .reverse();
  }, [panels]);

  const seasonStats = React.useMemo(() => {
    if (!panels) return null;
    
    // Group panels by season and count candidates
    const statsBySeason = panels.reduce((acc, panel) => {
      const season = panel.calculated_season;
      if (!season || season === '/') return acc;
      
      if (!acc[season]) {
        acc[season] = { panel: 0, carousel: 0 };
      }
      
      const candidateCount = parseInt(panel.candidate_count) || 0;
      if (panel.panel_type?.toUpperCase() === 'PANEL') acc[season].panel += candidateCount;
      if (panel.panel_type?.toUpperCase() === 'CAROUSEL') acc[season].carousel += candidateCount;
      return acc;
    }, {} as Record<string, SeasonStats>);
    
    // Sort seasons in reverse chronological order
    return Object.entries(statsBySeason)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([season, stats]) => ({ season, ...stats }));
  }, [panels]);

  const handleSort = (field: keyof Panel) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Error loading panels. Please try again later.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search panels..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="PANEL">Panel</option>
              <option value="CAROUSEL">Carousel</option>
            </select>
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Seasons</option>
              {uniqueSeasons.map((season) => (
                <option key={season} value={season}>
                  {season}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="futureOnly"
                checked={showFutureOnly}
                onChange={(e) => setShowFutureOnly(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="futureOnly" className="text-sm text-gray-700">
                Future Only
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="needingAdvisers"
                checked={showNeedingAdvisers}
                onChange={(e) => setShowNeedingAdvisers(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="needingAdvisers" className="text-sm text-gray-700">
                Needs Advisers
              </label>
            </div>
          </div>
        </div>
      </div>

      {seasonStats && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-4">Season Statistics - Attendance</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {seasonStats.map(({ season, panel, carousel }) => (
              <div key={season} className="p-3 border rounded-lg">
                <h3 className="text-sm font-medium mb-1.5">Season {season}</h3>
                <div className="space-y-1.5">
                  <div>
                    <span className="text-gray-500 text-sm">Panel:</span>
                    <span className="ml-1.5 text-green-600 font-medium">{panel}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 text-sm">Carousel:</span>
                    <span className="ml-1.5 text-indigo-600 font-medium">{carousel}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!filteredPanels?.length ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
          No panels found matching your criteria.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('panel_name')}>
                    <div className="flex items-center gap-2">
                      Name
                      <ArrowUpDown size={14} className="text-gray-400" />
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Venue
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('panel_date')}>
                    <div className="flex items-center gap-2">
                      Date
                      <ArrowUpDown size={14} className="text-gray-400" />
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Season
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Candidates
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Advisers
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Panel Secretary
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPanels.map((panel: Panel) => (
                  <tr key={panel.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link to={`/panels/${panel.id}`} className="text-blue-600 hover:text-blue-800">
                        {panel.panel_name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {panel.venue_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(panel.panel_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {panel.calculated_season}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {panel.candidate_count || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {panel.adviser_count || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{panel.panel_secretary || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        panel.panel_type?.toUpperCase() === 'PANEL' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        {panel.panel_type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}