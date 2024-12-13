import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Calendar, AlertCircle, CheckCircle2, Search, User, Users, ChevronDown, ChevronRight } from 'lucide-react';
import { format, isToday, isTomorrow, isThisWeek, isPast, startOfMonth, endOfMonth } from 'date-fns';

interface Task {
  id: number;
  title: string;
  description: string;
  due_date: string;
  completed: boolean;
  task_type: 'PANEL' | 'CAROUSEL';
  panel_name?: string;
}

interface Panel {
  id: number;
  panel_name: string;
  panel_date: string;
  panel_type: 'Panel' | 'Carousel';
  venue_name: string;
  panel_secretary: string;
  secretary_email: string;
  candidates: Array<{ id: number; name: string; email: string; }>;
  advisers: Array<{ id: number; name: string; email: string; }>;
  tasks: Task[];
}

const isThisMonth = (date: Date) => {
  const now = new Date();
  return date >= startOfMonth(now) && date <= endOfMonth(now);
};

const groupTasksByTimeframe = (tasks: Task[]) => {
  const overdue: Task[] = [];
  const today: Task[] = [];
  const tomorrow: Task[] = [];
  const thisWeek: Task[] = [];
  const thisMonth: Task[] = [];
  const later: Task[] = [];

  tasks.forEach(task => {
    if (task.completed) return;
    const dueDate = new Date(task.due_date);
    
    if (isPast(dueDate) && !isToday(dueDate)) {
      overdue.push(task);
    } else if (isToday(dueDate)) {
      today.push(task);
    } else if (isTomorrow(dueDate)) {
      tomorrow.push(task);
    } else if (isThisWeek(dueDate)) {
      thisWeek.push(task);
    } else if (isThisMonth(dueDate)) {
      thisMonth.push(task);
    } else {
      later.push(task);
    }
  });

  // Sort each group by due date
  const sortByDate = (a: Task, b: Task) => 
    new Date(a.due_date).getTime() - new Date(b.due_date).getTime();

  return {
    overdue: overdue.sort(sortByDate),
    today: today.sort(sortByDate),
    tomorrow: tomorrow.sort(sortByDate),
    thisWeek: thisWeek.sort(sortByDate),
    thisMonth: thisMonth.sort(sortByDate),
    later: later.sort(sortByDate)
  };
};

export function Dashboard() {
  const [secretaryFilter, setSecretaryFilter] = useState('David Oxtoby');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'overdue' | 'today' | 'tomorrow' | 'thisWeek' | 'thisMonth' | 'later'>('today');
  
  const { data: panels, isLoading, error, refetch } = useQuery<Panel[]>({
    queryKey: ['dashboardPanels'],
    queryFn: async () => {
      console.log('Fetching panels...');
      const response = await fetch('/api/panels/with-tasks');
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Failed to fetch panels');
      }
      const data = await response.json();
      console.log('Fetched panels:', data);
      return data;
    },
  });

  const secretaries = useMemo(() => {
    if (!panels) return [];
    return [...new Set(panels.map(p => p.panel_secretary))].filter(Boolean).sort();
  }, [panels]);

  const filteredPanels = useMemo(() => {
    if (!panels) return [];
    const now = new Date();
    const nineDaysAgo = new Date(now);
    nineDaysAgo.setDate(now.getDate() - 9);
    
    return panels
      .filter(panel => {
        const matchesSecretary = !secretaryFilter || panel.panel_secretary === secretaryFilter;
        const panelDate = new Date(panel.panel_date);
        // Include panels from last 9 days and future panels
        const isRecentOrUpcoming = panelDate >= nineDaysAgo;
        return matchesSecretary && isRecentOrUpcoming;
      })
      .sort((a, b) => new Date(a.panel_date).getTime() - new Date(b.panel_date).getTime());
  }, [panels, secretaryFilter]);

  if (isLoading) {
    return <div>Loading dashboard...</div>;
  }

  if (error) {
    return <div>Error loading dashboard: {(error as Error).message}</div>;
  }

  // Calculate total tasks and overdue tasks
  const allTasks = filteredPanels.flatMap(panel => 
    panel.tasks.map(task => ({
      ...task,
      panel_name: panel.panel_name
    }))
  );
  const taskGroups = groupTasksByTimeframe(allTasks);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <select
              value={secretaryFilter}
              onChange={(e) => setSecretaryFilter(e.target.value)}
              className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All Secretaries</option>
              {secretaries.map(secretary => (
                <option key={secretary} value={secretary}>
                  {secretary}
                </option>
              ))}
            </select>
          </div>
          {secretaryFilter && (
            <div className="flex gap-2">
              <a
                href={`https://helper.oxtobyhome.co.uk/api/calendar/tasks/${encodeURIComponent(secretaryFilter)}.ics`}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 px-3 py-1 border rounded-md"
                title="Download calendar"
              >
                <Calendar className="w-4 h-4" />
                Download
              </a>
              <a
                href={`webcal://helper.oxtobyhome.co.uk/api/calendar/tasks/${encodeURIComponent(secretaryFilter)}.ics`}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 px-3 py-1 border rounded-md"
                title="Subscribe to calendar"
              >
                <Calendar className="w-4 h-4" />
                Subscribe
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Task Overview Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <div className="flex">
            <TabButton
              active={selectedTimeframe === 'overdue'}
              onClick={() => setSelectedTimeframe('overdue')}
              count={taskGroups.overdue.length}
              className="text-red-600"
            >
              Overdue
            </TabButton>
            <TabButton
              active={selectedTimeframe === 'today'}
              onClick={() => setSelectedTimeframe('today')}
              count={taskGroups.today.length}
            >
              Today
            </TabButton>
            <TabButton
              active={selectedTimeframe === 'tomorrow'}
              onClick={() => setSelectedTimeframe('tomorrow')}
              count={taskGroups.tomorrow.length}
            >
              Tomorrow
            </TabButton>
            <TabButton
              active={selectedTimeframe === 'thisWeek'}
              onClick={() => setSelectedTimeframe('thisWeek')}
              count={taskGroups.thisWeek.length}
            >
              This Week
            </TabButton>
            <TabButton
              active={selectedTimeframe === 'thisMonth'}
              onClick={() => setSelectedTimeframe('thisMonth')}
              count={taskGroups.thisMonth.length}
            >
              This Month
            </TabButton>
            <TabButton
              active={selectedTimeframe === 'later'}
              onClick={() => setSelectedTimeframe('later')}
              count={taskGroups.later.length}
            >
              Later
            </TabButton>
          </div>
        </div>

        <div className="p-4">
          <div className="space-y-2">
            {taskGroups[selectedTimeframe].map(task => (
              <div 
                key={task.id} 
                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg group"
              >
                <button 
                  onClick={async (e) => {
                    e.preventDefault();
                    try {
                      const response = await fetch(`/api/tasks/${task.id}/toggle-complete`, {
                        method: 'PATCH',
                      });
                      
                      if (!response.ok) {
                        throw new Error('Failed to toggle task');
                      }
                      
                      // Refetch the panels data to update the UI
                      refetch();
                    } catch (error) {
                      console.error('Error toggling task:', error);
                    }
                  }}
                  className="flex-shrink-0"
                >
                  {task.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                  )}
                </button>
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium truncate ${task.completed ? 'line-through text-gray-400' : ''}`}>
                      {task.title} <span className="text-xs text-gray-500">({task.panel_name})</span>
                    </span>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {format(new Date(task.due_date), 'MMM d')}
                    </span>
                  </div>
                  {task.description && (
                    <p className={`text-sm truncate ${task.completed ? 'text-gray-400' : 'text-gray-600'}`}>
                      {task.description}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 text-sm text-gray-500">
                  {task.panel_name}
                </div>
              </div>
            ))}
            {taskGroups[selectedTimeframe].length === 0 && (
              <div className="text-center text-gray-500 py-4">
                No tasks for this timeframe
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panels Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Upcoming Panels
          </h2>
          <div className="space-y-4">
            {filteredPanels.filter(p => p.panel_type === 'Panel').map(panel => (
              <PanelCard key={panel.id} panel={panel} refetch={refetch} />
            ))}
          </div>
        </div>

        {/* Carousels Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            Upcoming Carousels
          </h2>
          <div className="space-y-4">
            {filteredPanels.filter(p => p.panel_type === 'Carousel').map(panel => (
              <PanelCard key={panel.id} panel={panel} refetch={refetch} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PanelCard({ panel, refetch }: { panel: Panel; refetch: () => Promise<void> }) {
  const toggleTaskComplete = async (taskId: number) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/toggle-complete`, {
        method: 'PATCH',
      });
      
      if (!response.ok) {
        throw new Error('Failed to toggle task');
      }
      
      // Refetch the panels data to update the UI
      refetch();
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  // Calculate progress percentage
  const progressPercentage = panel.total_tasks > 0 
    ? Math.round((panel.completed_tasks / panel.total_tasks) * 100)
    : 0;

  return (
    <div className="block border rounded-lg p-4">
      <Link
        to={`/panels/${panel.id}`}
        className="block hover:text-blue-500 transition-colors"
      >
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium">{panel.panel_name}</h3>
            <p className="text-sm text-gray-500">
              {new Date(panel.panel_date).toLocaleDateString()}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              <User className="w-4 h-4 inline mr-1" />
              {panel.panel_secretary}
              {panel.secretary_email && (
                <span className="text-gray-400 ml-1">({panel.secretary_email})</span>
              )}
            </p>
            <div className="text-sm text-gray-600 mt-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>
                  {panel.candidate_count || 0} Candidates, {panel.adviser_count || 0} Advisers
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <CheckCircle2 className="w-4 h-4" />
              {panel.completed_tasks}/{panel.total_tasks}
            </div>
          </div>
        </div>
        <div className="mt-2 bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 rounded-full h-2 transition-all"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </Link>

      {/* Tasks List */}
      <div className="mt-4 space-y-2">
        {panel.tasks
          .sort((a, b) => {
            // First sort by completion status
            if (a.completed !== b.completed) {
              return a.completed ? 1 : -1;
            }
            // Then sort by due date
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          })
          .map(task => (
            <div key={task.id} className="flex items-start gap-2 text-sm">
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  toggleTaskComplete(task.id);
                }}
                className="mt-0.5 flex-shrink-0"
              >
                {task.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                )}
              </button>
              <span className={task.completed ? 'line-through text-gray-400' : ''}>
                {task.title}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

function TabButton({ 
  children, 
  active, 
  onClick, 
  count, 
  className = ''
}: { 
  children: React.ReactNode; 
  active: boolean; 
  onClick: () => void; 
  count: number;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2 border-b-2 
        ${active 
          ? 'border-blue-600 text-blue-600' 
          : 'border-transparent hover:border-gray-300'
        }
        ${className}
      `}
    >
      <span>{children}</span>
      {count > 0 && (
        <span className={`
          px-2 py-0.5 text-xs rounded-full
          ${active 
            ? 'bg-blue-100 text-blue-600' 
            : 'bg-gray-100 text-gray-600'
          }
        `}>
          {count}
        </span>
      )}
    </button>
  );
} 