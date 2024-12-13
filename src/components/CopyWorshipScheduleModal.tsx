import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';

interface Props {
  onClose: () => void;
  onCopy: (sourceId: string) => void;
  currentPanelId: string;
}

export function CopyWorshipScheduleModal({ onClose, onCopy, currentPanelId }: Props) {
  const { data: panels, isLoading } = useQuery({
    queryKey: ['panels-with-worship-schedule'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/panels/with-worship-schedule');
        console.log('Response status:', response.status);
        
        const text = await response.text();
        console.log('Raw response:', text);
        
        if (!response.ok) {
          console.error('Error response:', text);
          throw new Error(`Failed to fetch panels: ${text}`);
        }
        
        const data = JSON.parse(text);
        console.log('Parsed data:', data);
        return data;
      } catch (error) {
        console.error('Fetch error:', error);
        throw error;
      }
    },
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Copy Worship Schedule</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          <p className="text-gray-600">Select a panel to copy the worship schedule from:</p>
          
          {isLoading ? (
            <div className="text-center py-4 text-gray-500">Loading panels...</div>
          ) : panels?.length === 0 ? (
            <div className="text-center py-4 text-gray-500">No panels with worship schedules found</div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {panels
                ?.filter(p => p.id !== currentPanelId)
                .map((panel) => (
                  <button
                    key={panel.id}
                    onClick={() => onCopy(panel.id)}
                    className="w-full text-left p-3 hover:bg-gray-50 border rounded-lg mb-2 flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium">{panel.panel_name}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(panel.panel_date).toLocaleDateString()}
                      </div>
                    </div>
                  </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 