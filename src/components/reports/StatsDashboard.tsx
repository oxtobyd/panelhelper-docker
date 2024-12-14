import React, { useEffect, useState } from 'react';
import { StatsCard } from './StatsCard';
import { SeasonSelector } from './SeasonSelector';
import { PanelOutcomes } from './PanelOutcomes';
import { CandidateStats } from './CandidateStats';
import { VenueStats } from './VenueStats';
import { AdviserDemographics } from './AdviserDemographics';
import { DioceseCandidateStats } from './DioceseCandidateStats';
import { MonthlyBreakdown } from './MonthlyBreakdown';
import { MonthlyAttendance } from './MonthlyAttendance';
import { BarChart3, Users, UserSquare2, Calendar, TrendingUp } from 'lucide-react';
import { AdviserEngagement } from './AdviserEngagement';
import { AdviserStats } from './AdviserStats';
import { VenueStatsBySeason } from './VenueStatsBySeason';
import { VenueMap } from './VenueMap';
import { ProgressionStats } from './ProgressionStats';
import { useQuery } from '@tanstack/react-query';

interface Stats {
  total_carousels: number;
  total_panels: number;
  active_advisers: number;
  candidate_breakdown: {
    total_unique: number;
    carousel_only: number;
    panel_only: number;
    both_types: number;
  };
  total_carousel_candidates: number;
  total_panel_candidates: number;
  progressed_to_panel: number;
  progression_rate: number;
  byGender: { gender: string; count: number }[];
  byAge: { range: string; count: number }[];
  byDiocese: { diocese_name: string; total_candidates: number }[];
}

interface OutcomeStats {
  outcome: string;
  count: number;
  average_score: number;
  min_score: number;
  max_score: number;
}

export const StatsDashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [seasons, setSeasons] = useState<string[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dioceseStats, setDioceseStats] = useState<{ diocese_name: string; total_candidates: number; }[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'candidates' | 'advisers' | 'venues'>('overview');

  const { data: outcomeStats } = useQuery<OutcomeStats[]>({
    queryKey: ['outcomeStats', selectedSeason],
    queryFn: async () => {
      const response = await fetch(`/api/reports/outcome-stats${selectedSeason ? `?season=${selectedSeason}` : ''}`);
      if (!response.ok) throw new Error('Failed to fetch outcome statistics');
      return response.json();
    }
  });

  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const response = await fetch('/api/reports/seasons');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setSeasons(data.map((s: { calculated_season: string }) => s.calculated_season));
        setError(null);
      } catch (error) {
        console.error('Error fetching seasons:', error);
        setError('Failed to load seasons. Please try again later.');
      }
    };
    fetchSeasons();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const url = selectedSeason
          ? `/api/reports/stats?season=${selectedSeason}`
          : '/api/reports/stats';
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setStats(data);
        setError(null);
      } catch (error) {
        console.error('Error fetching stats:', error);
        setError('Failed to load statistics. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [selectedSeason]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!stats) return null;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'candidates', label: 'Candidates', icon: UserSquare2 },
    { id: 'advisers', label: 'Advisers', icon: Users },
    { id: 'venues', label: 'Venues & Schedule', icon: Calendar },
  ];

  const outcomeColors: Record<string, string> = {
    'Recommended': '#22c55e',  // stronger green
    'Recommended with Preparation': '#4ade80',  // medium green
    'Not Yet Ready': '#3b82f6',  // vibrant blue
    'Advice Not to Proceed': '#ef4444',  // vibrant red
    'Conditionally Recommended': '#f97316'  // vibrant orange
  };

  return (
    <div className="space-y-8 p-8">
      <div className="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold">Statistics Dashboard</h2>
            <p className="mt-2 text-indigo-100">Track and analse panel performance metrics</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2">
            <SeasonSelector
              seasons={seasons}
              selectedSeason={selectedSeason}
              onSeasonChange={setSelectedSeason}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Candidates"
          value={stats.candidate_breakdown?.total_unique || 0}
          subtitle={`${stats.candidate_breakdown?.both_types || 0} attended S1 & S2`}
          icon={<UserSquare2 />}
        />
        <StatsCard
          title="Active Advisers"
          value={stats.active_advisers}
          icon={<Users />}
        />
        <StatsCard
          title="Total Events"
          value={Number(stats.total_carousels || 0) + Number(stats.total_panels || 0)}
          subtitle={`${stats.total_carousels} carousels, ${stats.total_panels} panels`}
          icon={<Calendar />}
        />
        <StatsCard
          title="Progression Rate"
          value={`${stats.progression_rate}%`}
          subtitle="In Season Progression"
          icon={<TrendingUp />}
        />
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`
                    group relative min-w-0 flex-1 overflow-hidden py-4 px-4 text-sm font-medium text-center
                    hover:bg-gray-50 focus:z-10 focus:outline-none
                    ${activeTab === tab.id 
                      ? 'text-indigo-600 border-b-2 border-indigo-600'
                      : 'text-gray-500 border-b-2 border-transparent hover:text-gray-700'
                    }
                  `}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <Icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Panels & Carousels by Month</h3>
                <p className="text-sm text-gray-500 mb-6">Monthly breakdown of panel and carousel events</p>
                <MonthlyBreakdown season={selectedSeason} />
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Monthly Attendance</h3>
                <p className="text-sm text-gray-500 mb-6">Candidate attendance at panels and carousels by month</p>
                <MonthlyAttendance season={selectedSeason} />
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Panel Outcomes</h3>
                <p className="text-sm text-gray-500 mb-6">Summary of panel decisions and recommendations</p>
                <PanelOutcomes season={selectedSeason} />
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Panel Outcome Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {outcomeStats?.map(stat => (
                    <div key={stat.outcome} className="bg-white rounded-lg shadow p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{stat.outcome}</h4>
                        <span className="text-sm text-gray-500">{stat.count} candidates</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">Average Score</span>
                          <span className="font-semibold">{stat.average_score}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-gray-500">
                          <span>Range</span>
                          <span>{stat.min_score} - {stat.max_score}</span>
                        </div>
                        <div className="relative pt-1">
                          <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                            <div
                              style={{
                                width: `${(stat.average_score / 7) * 100}%`,
                                backgroundColor: outcomeColors[stat.outcome] || '#6B7280'
                              }}
                              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'candidates' && (
            <div className="space-y-6">
              <CandidateStats 
                season={selectedSeason} 
                onDioceseDataLoad={setDioceseStats} 
              />
              <ProgressionStats />
              <DioceseCandidateStats dioceseStats={dioceseStats} />
            </div>
          )}

          {activeTab === 'advisers' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Adviser Statistics</h3>
                <p className="text-sm text-gray-500 mb-6">Comprehensive overview of adviser participation and demographics</p>
                <AdviserStats season={selectedSeason} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Adviser Demographics</h3>
                <p className="text-sm text-gray-500 mb-6">Detailed breakdown of adviser age and gender distribution</p>
                <AdviserDemographics season={selectedSeason} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Adviser Engagement</h3>
                <p className="text-sm text-gray-500 mb-6">Historical adviser participation across seasons</p>
                <AdviserEngagement />
              </div>
            </div>
          )}

          {activeTab === 'venues' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Venue Usage by Season</h3>
                <p className="text-sm text-gray-500 mb-6">Number of events held at each venue across seasons</p>
                <VenueStatsBySeason />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Venue Statistics</h3>
                <p className="text-sm text-gray-500 mb-6">Detailed venue utilisation and capacity metrics (Cancelled = 0 Candidates, though future Panels may become viable)</p>
                <VenueStats season={selectedSeason} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Venue Distribution</h3>
                <p className="text-sm text-gray-500 mb-6">Geographical distribution of panel venues</p>
                <VenueMap season={selectedSeason} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
