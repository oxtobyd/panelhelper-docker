import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Edit2, Save, X } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface PanelNoteProps {
  panelId: string;
}

export function PanelNote({ panelId }: PanelNoteProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const queryClient = useQueryClient();

  const { data: note } = useQuery({
    queryKey: ['panel-note', panelId],
    queryFn: async () => {
      const response = await fetch(`/api/panels/${panelId}/note`);
      if (!response.ok) throw new Error('Failed to fetch note');
      return response.json();
    },
  });

  const updateNote = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`/api/panels/${panelId}/note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) throw new Error('Failed to update note');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel-note', panelId] });
      setIsEditing(false);
    },
  });

  const handleEdit = () => {
    setEditContent(note?.content || '');
    setIsEditing(true);
  };

  const handleSave = () => {
    updateNote.mutate(editContent);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditContent('');
  };

  if (!note) return null;

  return (
    <div className="bg-white rounded-lg shadow-md mb-6">
      <div className="p-4 border-b flex justify-between items-center">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center text-gray-700 font-medium"
        >
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          <span className="ml-2">Panel Notes</span>
        </button>
        {!isEditing && (
          <button
            onClick={handleEdit}
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <Edit2 size={16} className="mr-1" />
            Edit
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="p-4">
          {isEditing ? (
            <div className="space-y-4">
              <ReactQuill
                value={editContent}
                onChange={setEditContent}
                className="bg-white"
                theme="snow"
                modules={{
                  toolbar: [
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['link'],
                    ['clean']
                  ]
                }}
              />
              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={handleCancel}
                  className="flex items-center px-3 py-2 border rounded-md hover:bg-gray-50"
                >
                  <X size={16} className="mr-1" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Save size={16} className="mr-1" />
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div 
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: note.content }}
            />
          )}
        </div>
      )}
    </div>
  );
} 