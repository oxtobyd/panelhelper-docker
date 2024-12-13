import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Plus, X, Save } from 'lucide-react';

interface TaskTemplate {
  id: number;
  title: string;
  description: string;
  default_days_offset: number;
  order_index: number;
  duration: number;
}

interface Category {
  category_id: number;
  category_name: string;
  category_type: 'PANEL' | 'CAROUSEL';
  templates: TaskTemplate[];
}

export function TaskTemplateManager() {
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState<Partial<TaskTemplate> | null>(null);
  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ['taskTemplates'],
    queryFn: async () => {
      const response = await fetch('/api/tasks/templates');
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async (template: TaskTemplate) => {
      const response = await fetch(`/api/tasks/templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      });
      if (!response.ok) throw new Error('Failed to update template');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskTemplates'] });
      setEditingTemplate(null);
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      const response = await fetch(`/api/tasks/templates/${templateId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete template');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskTemplates'] });
    },
  });

  const addTemplateMutation = useMutation({
    mutationFn: async (template: Omit<TaskTemplate, 'id'>) => {
      const response = await fetch('/api/tasks/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      });
      if (!response.ok) throw new Error('Failed to add template');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskTemplates'] });
      setNewTemplate(null);
    },
  });

  if (isLoading) return <div>Loading templates...</div>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Task Template Manager</h1>
      
      {categories?.map((category) => (
        <div key={category.category_id} className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {category.category_name} 
              <span className="ml-2 text-sm text-gray-500">({category.category_type})</span>
            </h2>
            <button
              onClick={() => setNewTemplate({ category_id: category.category_id })}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              <Plus size={16} />
              Add Template
            </button>
          </div>

          <div className="space-y-4">
            {category.templates.map((template) => (
              <div key={template.id} className="border rounded-lg p-4">
                {editingTemplate?.id === template.id ? (
                  <EditTemplateForm
                    template={editingTemplate}
                    onSave={(updatedTemplate) => {
                      updateTemplateMutation.mutate(updatedTemplate);
                    }}
                    onCancel={() => setEditingTemplate(null)}
                  />
                ) : (
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{template.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Due: {template.default_days_offset} days from panel date
                        <span className="ml-2">| Duration: {template.duration || 1} day(s)</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingTemplate(template)}
                        className="p-1 text-gray-500 hover:text-blue-600"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this template?')) {
                            deleteTemplateMutation.mutate(template.id);
                          }
                        }}
                        className="p-1 text-gray-500 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {newTemplate?.category_id === category.category_id && (
              <div className="border rounded-lg p-4">
                <EditTemplateForm
                  template={{
                    id: 0,
                    title: '',
                    description: '',
                    default_days_offset: 0,
                    order_index: category.templates.length,
                    duration: 1,
                    ...newTemplate,
                  }}
                  onSave={(template) => {
                    addTemplateMutation.mutate(template);
                  }}
                  onCancel={() => setNewTemplate(null)}
                  isNew
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

interface EditTemplateFormProps {
  template: TaskTemplate;
  onSave: (template: TaskTemplate) => void;
  onCancel: () => void;
  isNew?: boolean;
}

function EditTemplateForm({ template, onSave, onCancel, isNew = false }: EditTemplateFormProps) {
  const [formData, setFormData] = useState(template);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(formData);
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700">Title</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          rows={3}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Days from panel date</label>
        <input
          type="number"
          value={formData.default_days_offset}
          onChange={(e) => setFormData({ ...formData, default_days_offset: parseInt(e.target.value) })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Duration (days)</label>
        <input
          type="number"
          value={formData.duration || 1}
          onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 1 })}
          min="1"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {isNew ? 'Add Template' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
} 