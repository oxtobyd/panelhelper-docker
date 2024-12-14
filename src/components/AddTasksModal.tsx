import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckSquare } from 'lucide-react';
import { Modal } from './common/Modal';

interface TaskTemplate {
  id: number;
  title: string;
  description: string;
  default_days_offset: number;
  order_index: number;
}

interface TaskCategory {
  category_id: number;
  category_name: string;
  tasks: TaskTemplate[];
}

interface Props {
  panelId: string;
  panelType: 'Panel' | 'Carousel';
  onClose: () => void;
}

export function AddTasksModal({ panelId, panelType, onClose }: Props) {
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery<TaskCategory[]>({
    queryKey: ['taskTemplates', panelType],
    queryFn: async () => {
      if (!panelType) throw new Error('Invalid panel type');
      const response = await fetch(`/api/tasks/templates/${panelType}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch task templates');
      }
      return response.json();
    },
  });

  const addTasksMutation = useMutation({
    mutationFn: async (templateIds: number[]) => {
      const response = await fetch(`/api/tasks/panel/${panelId}/from-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateIds }),
      });
      if (!response.ok) throw new Error('Failed to add tasks');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel', panelId] });
      onClose();
    },
  });

  const allTaskIds = templates?.flatMap(category => 
    category.tasks.map(task => task.id)
  ) || [];

  const handleSelectAll = (selected: boolean) => {
    setSelectedTasks(selected ? allTaskIds : []);
  };

  const handleSelectCategory = (category: TaskCategory, selected: boolean) => {
    const categoryTaskIds = category.tasks.map(task => task.id);
    if (selected) {
      setSelectedTasks([...new Set([...selectedTasks, ...categoryTaskIds])]);
    } else {
      setSelectedTasks(selectedTasks.filter(id => !categoryTaskIds.includes(id)));
    }
  };

  const isCategorySelected = (category: TaskCategory) => {
    return category.tasks.every(task => selectedTasks.includes(task.id));
  };

  const areAllTasksSelected = allTaskIds.length > 0 && 
    allTaskIds.every(id => selectedTasks.includes(id));

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Add Tasks from Template"
    >
      <div className="overflow-y-auto max-h-[60vh] p-4">
        {/* Select All Checkbox */}
        <label className="flex items-center mb-6 p-3 bg-gray-50 rounded">
          <input
            type="checkbox"
            className="mr-2"
            checked={areAllTasksSelected}
            onChange={(e) => handleSelectAll(e.target.checked)}
          />
          <span className="font-medium">Select All Tasks</span>
          <span className="ml-2 text-sm text-gray-600">
            ({allTaskIds.length} tasks)
          </span>
        </label>

        {templates?.map((category) => (
          <div key={category.category_name} className="mb-6">
            <label className="flex items-center mb-3">
              <input
                type="checkbox"
                className="mr-2"
                checked={isCategorySelected(category)}
                onChange={(e) => handleSelectCategory(category, e.target.checked)}
              />
              <h3 className="font-medium">{category.category_name}</h3>
              <span className="ml-2 text-sm text-gray-600">
                ({category.tasks.length} tasks)
              </span>
            </label>
            <div className="space-y-2 ml-6">
              {category.tasks.map((task) => (
                <label
                  key={task.id}
                  className="flex items-start p-3 border rounded hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="mt-1 mr-3"
                    checked={selectedTasks.includes(task.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTasks([...selectedTasks, task.id]);
                      } else {
                        setSelectedTasks(selectedTasks.filter(id => id !== task.id));
                      }
                    }}
                  />
                  <div>
                    <div className="font-medium">{task.title}</div>
                    <div className="text-sm text-gray-600">{task.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
        <button
          onClick={() => addTasksMutation.mutate(selectedTasks)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          disabled={selectedTasks.length === 0}
        >
          Add {selectedTasks.length} Tasks
        </button>
      </div>
    </Modal>
  );
}