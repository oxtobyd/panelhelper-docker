import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';

interface PrintItem {
  id: number;
  item_name: string;
  adviser_printed: boolean;
  candidate_printed: boolean;
  sides_printed: number;
}

const DEFAULT_PRINT_ITEMS = [
  { item_name: 'Interview TimeTable', sides_printed: 0 },
  { item_name: 'Panel TimeTable', sides_printed: 0 },
  { item_name: 'Worship Rota', sides_printed: 0 },
  { item_name: 'Worship Resources', sides_printed: 0 },
  { item_name: 'Adviser Report Checklist', sides_printed: 0 },
  { item_name: 'GE Spiders (MFA/PFA)', sides_printed: 0 },
  { item_name: 'GE & Additional Info', sides_printed: 0 },
  { item_name: 'GE MFA Notes on Facilitating', sides_printed: 0 },
  { item_name: 'GE Provisional Bandings', sides_printed: 0 },
  { item_name: 'GE Notes on Written Reflection', sides_printed: 0 },
  { item_name: 'Interviewing Crib Sheet', sides_printed: 0 },
  { item_name: '4 R\'s', sides_printed: 0 },
  { item_name: 'Report Writing Notes', sides_printed: 0 },
  { item_name: 'Bandings', sides_printed: 0 },
  { item_name: 'Lanyards', sides_printed: 0 },
  { item_name: 'Moderation Sheets', sides_printed: 0 },
];

interface Props {
  panelId: string;
  onClose: () => void;
}

export function PrintingChecklistModal({ panelId, onClose }: Props) {
  const queryClient = useQueryClient();

  const initializePrintItemsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/panels/${panelId}/print-items/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: DEFAULT_PRINT_ITEMS })
      });
      if (!response.ok) throw new Error('Failed to initialize print items');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['print-items', panelId]);
    }
  });

  const { data: printItems } = useQuery({
    queryKey: ['print-items', panelId],
    queryFn: async () => {
      const response = await fetch(`/api/panels/${panelId}/print-items`);
      if (!response.ok) throw new Error('Failed to fetch print items');
      const data = await response.json();
      if (data.length === 0) {
        await initializePrintItemsMutation.mutateAsync();
        return DEFAULT_PRINT_ITEMS.map(item => ({
          ...item,
          adviser_printed: false,
          candidate_printed: false
        }));
      }
      return data;
    }
  });

  const updateCheckboxMutation = useMutation({
    mutationFn: async ({ itemId, type, value }: { itemId: number, type: 'adviser' | 'candidate', value: boolean }) => {
      const response = await fetch(`/api/panels/${panelId}/print-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [`${type}_printed`]: value
        })
      });
      if (!response.ok) throw new Error('Failed to update print item');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['print-items', panelId]);
    }
  });

  const updateSidesMutation = useMutation({
    mutationFn: async ({ itemId, sides }: { itemId: number, sides: number }) => {
      const response = await fetch(`/api/panels/${panelId}/print-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sides_printed: sides
        })
      });
      if (!response.ok) throw new Error('Failed to update sides printed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['print-items', panelId]);
    }
  });

  const handleSidesPrintedChange = (itemId: number, sides: number) => {
    if (sides >= 0) {
      updateSidesMutation.mutate({ itemId, sides });
    }
  };

  const totalPages = printItems?.reduce((acc: number, item: PrintItem) => 
    acc + (item.sides_printed || 0) * 
    ((item.adviser_printed ? 1 : 0) + (item.candidate_printed ? 1 : 0)), 0
  ) || 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[800px] max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Printing & Clipboards Checklist</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X size={24} />
          </button>
        </div>

        <div className="grid grid-cols-[1fr,auto,auto,auto] gap-4 mb-4">
          <div className="font-semibold text-lg">Item</div>
          <div className="font-semibold text-lg text-center px-8">Adviser</div>
          <div className="font-semibold text-lg text-center px-8">Candidate</div>
          <div className="font-semibold text-lg text-center px-8">Sides</div>
        </div>

        <div className="space-y-2">
          {printItems?.map((item: PrintItem, index: number) => (
            <div key={index} className="grid grid-cols-[1fr,auto,auto,auto] gap-4 items-center py-2 hover:bg-gray-50">
              <div className="flex items-center">
                <span>{item.item_name}</span>
              </div>
              <div className="text-center px-8">
                <input
                  type="checkbox"
                  checked={item.adviser_printed}
                  onChange={(e) => updateCheckboxMutation.mutate({
                    itemId: item.id,
                    type: 'adviser',
                    value: e.target.checked
                  })}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
              <div className="text-center px-8">
                <input
                  type="checkbox"
                  checked={item.candidate_printed}
                  onChange={(e) => updateCheckboxMutation.mutate({
                    itemId: item.id,
                    type: 'candidate',
                    value: e.target.checked
                  })}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
              <div className="text-center px-8">
                <input
                  type="number"
                  min="0"
                  value={item.sides_printed}
                  onChange={(e) => handleSidesPrintedChange(item.id, parseInt(e.target.value) || 0)}
                  className="w-16 text-center border rounded"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t">
          <div className="text-right text-lg text-gray-600">
            Total Pages to Print: {totalPages}
          </div>
        </div>
      </div>
    </div>
  );
} 