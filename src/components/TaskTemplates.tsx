import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckSquare, Plus } from 'lucide-react';
import { format } from 'date-fns';

interface TaskTemplate {
  id: number;
  title: string;
  description: string;
  default_days_offset: number;
  order_index: number;
}

interface TemplateCategory {
  category_name: string;
  tasks: TaskTemplate[];
}

export function TaskTemplates() {
  const [selectedType, setSelectedType] = useState<'PANEL' | 'CAROUSEL'>('PANEL');

  const { data: templates, isLoading } = useQuery({
    queryKey: ['taskTemplates', selectedType],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/templates/${selectedType}`);
      return response.json();
    },
  });

  if (isLoading) {
    return <div>Loading templates...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Task Templates</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedType('PANEL')}
            className={`px-4 py-2 rounded ${
              selectedType === 'PANEL'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Panel Templates
          </button>
          <button
            onClick={() => setSelectedType('CAROUSEL')}
            className={`px-4 py-2 rounded ${
              selectedType === 'CAROUSEL'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Carousel Templates
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {templates?.map((category: TemplateCategory) => (
          <div
            key={category.category_name}
            className="bg-white rounded-lg shadow-md p-6"
          >
            <h2 className="text-xl font-semibold mb-4">{category.category_name}</h2>
            <div className="space-y-4">
              {category.tasks.map((task: TaskTemplate) => (
                <div
                  key={task.id}
                  className="flex items-start p-4 border rounded hover:bg-gray-50"
                >
                  <CheckSquare className="w-5 h-5 mt-1 mr-3 text-blue-600" />
                  <div>
                    <h3 className="font-medium">{task.title}</h3>
                    <p className="text-gray-600 text-sm mt-1">{task.description}</p>
                    <p className="text-gray-500 text-sm mt-2">
                      Due: {task.default_days_offset === 0
                        ? 'On the day'
                        : `${Math.abs(task.default_days_offset)} days ${
                            task.default_days_offset > 0 ? 'after' : 'before'
                          }`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}