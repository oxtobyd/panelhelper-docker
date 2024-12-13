import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Calendar, Users, MapPin } from 'lucide-react';

interface AnalyticsData {
  panelsByType: {
    type: string;
    count: number;
  }[];
  panelsByMonth: {
    month: string;
    panels: number;
    candidates: number;
  }[];
  venueUtilization: {
    venue: string;
    count: number;
  }[];
  taskCompletion: {
    status: string;
    count: number;
  }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export function Analytics() {
  const { data, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ['analytics'],
    queryFn: async () => {
      const response = await fetch('/api/analytics');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch analytics');
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">
          Error loading analytics: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold mb-6">Panel Analytics</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <SummaryCard
          title="Total Panels"
          value={data?.panelsByType.reduce((acc, curr) => acc + curr.count, 0) || 0}
          icon={<Calendar className="w-6 h-6" />}
        />
        <SummaryCard
          title="Total Candidates"
          value={data?.panelsByMonth.reduce((acc, curr) => acc + curr.candidates, 0) || 0}
          icon={<Users className="w-6 h-6" />}
        />
        <SummaryCard
          title="Venues Used"
          value={data?.venueUtilization.length || 0}
          icon={<MapPin className="w-6 h-6" />}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel Distribution */}
        <ChartCard title="Panel Distribution by Type">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data?.panelsByType}
                dataKey="count"
                nameKey="type"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {data?.panelsByType.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Monthly Trends */}
        <ChartCard title="Monthly Panel & Candidate Trends">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data?.panelsByMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="panels" fill="#0088FE" name="Panels" />
              <Bar dataKey="candidates" fill="#00C49F" name="Candidates" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Venue Utilization */}
        <ChartCard title="Venue Utilization">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data?.venueUtilization} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="venue" type="category" width={150} />
              <Tooltip />
              <Bar dataKey="count" fill="#FFBB28" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Task Completion Status */}
        <ChartCard title="Task Completion Status">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data?.taskCompletion}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
              >
                {data?.taskCompletion.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className="text-blue-600">{icon}</div>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
} 