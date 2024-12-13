import { useState } from 'react';
import { format } from 'date-fns';
import { Clock, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { AddTasksModal } from './AddTasksModal';
import { useQueryClient } from '@tanstack/react-query';

interface Task {
  id: number;
  title: string;
  description: string;
  due_date: string;
  end_date: string;
  completed: boolean;
}

interface PanelTasksProps {
  tasks: Task[];
  panelId: string;
  panelType: string;
}

export function PanelTasks({ tasks, panelId, panelType }: PanelTasksProps) {
  const [showAddTasks, setShowAddTasks] = useState(false);
  const queryClient = useQueryClient();

  const toggleTaskComplete = async (taskId: number) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/toggle-complete`, {
        method: 'PATCH',
      });
      
      if (!response.ok) {
        throw new Error('Failed to toggle task');
      }
      
      // Refetch the panel data to update the UI
      queryClient.invalidateQueries(['panel', panelId]);
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => 
    new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Timeline/Tasks</h2>
        <button 
          onClick={() => setShowAddTasks(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          <Plus size={16} />
        </button>
      </div>

      {showAddTasks && (
        <AddTasksModal
          panelId={panelId}
          panelType={panelType}
          onClose={() => setShowAddTasks(false)}
        />
      )}

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-0 right-0 h-0.5 bg-gray-200 top-7" />

        {/* Tasks */}
        <div className="relative flex justify-between">
          {sortedTasks.map((task, index) => (
            <div 
              key={task.id} 
              className="relative flex flex-col items-center"
              style={{ width: `${100 / sortedTasks.length}%` }}
            >
              <button
                onClick={() => toggleTaskComplete(task.id)}
                className={`
                  w-4 h-4 rounded-full border-2 z-10 mb-2
                  ${task.completed 
                    ? 'bg-blue-600 border-blue-600' 
                    : 'bg-white border-gray-300 hover:border-blue-400'
                  }
                `}
              />

              {/* Task content */}
              <div className="flex flex-col items-center text-center">
                <span className="text-blue-600 text-sm font-medium mb-1">
                  {format(new Date(task.due_date), 'MMM d')}
                </span>
                <span className={`
                  text-sm font-medium mb-1
                  ${task.completed ? 'text-blue-600' : 'text-gray-600'}
                `}>
                  {task.title}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 