import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Save, Loader2 } from 'lucide-react';

interface CandidateRecord {
  id?: number;
  candidate_id: number;
  dbs_check_complete: boolean;
  dbs_check_date: string | null;
  notes: string;
  baptised: boolean;
  confirmed: boolean;
  c4_received: 'Yes' | 'No' | 'N/A';
  overseas_check: 'Yes' | 'No' | 'N/A';
  references_up_to_date: boolean;
  previous_panel: boolean;
  bnp_member: boolean;
  disabilities: string;
  ddo_named_on_report: string;
  ddo_email: string;
}

interface AdditionalFocus {
  order_of_ministry: string;
  focus_of_ministry: string;
  additional_desired_focus: string;
}

interface Props {
  candidateId: number;
  candidateName: string;
  onClose: () => void;
}

export function CandidateRecordModal({ candidateId, candidateName, onClose }: Props) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<CandidateRecord>({
    candidate_id: candidateId,
    dbs_check_complete: false,
    dbs_check_date: null,
    notes: '',
    baptised: false,
    confirmed: false,
    c4_received: 'N/A',
    overseas_check: 'N/A',
    references_up_to_date: false,
    previous_panel: false,
    bnp_member: false,
    disabilities: '',
    ddo_named_on_report: '',
    ddo_email: ''
  });

  const { data: additionalFocus, isLoading: focusLoading } = useQuery<AdditionalFocus>({
    queryKey: ['additionalFocus', candidateId],
    queryFn: async () => {
      const response = await fetch(`/api/candidates/${parseInt(candidateId)}/additional-focus`);
      if (!response.ok) {
        throw new Error('Failed to fetch additional focus data');
      }
      return response.json();
    },
  });

  const { data: record, isLoading } = useQuery({
    queryKey: ['candidateRecord', candidateId],
    queryFn: async () => {
      const response = await fetch(`/api/candidates/${candidateId}/record`);
      if (response.status === 404) {
        return formData;
      }
      if (!response.ok) {
        throw new Error('Failed to fetch record');
      }
      return response.json();
    },
    retry: false,
  });

  useEffect(() => {
    if (record) {
      setFormData(record);
    }
  }, [record]);

  const saveMutation = useMutation({
    mutationFn: async (data: CandidateRecord) => {
      const response = await fetch(`/api/candidates/${candidateId}/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to save record');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['candidateRecord', candidateId]);
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting form data:', formData);
    console.log('ddo_email value:', formData.ddo_email);
    saveMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{candidateName}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        {focusLoading ? (
          <div>Loading focus data...</div>
        ) : (
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Focus Information</h3>
            <p><strong>Order of Ministry:</strong> {additionalFocus?.order_of_ministry || 'N/A'}</p>
            <p><strong>Focus of Ministry:</strong> {additionalFocus?.focus_of_ministry || 'N/A'}</p>
            <p><strong>Additional Desired Focus:</strong> {additionalFocus?.additional_desired_focus || 'N/A'}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.dbs_check_complete}
                onChange={(e) => setFormData({
                  ...formData,
                  dbs_check_complete: e.target.checked,
                })}
                className="rounded border-gray-300"
              />
              <span>DBS Check Complete</span>
            </label>
          </div>

          {formData.dbs_check_complete && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                DBS Check Date
              </label>
              <input
                type="date"
                value={formData.dbs_check_date || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  dbs_check_date: e.target.value,
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              />
            </div>
          )}

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.baptised}
                onChange={(e) => setFormData({
                  ...formData,
                  baptised: e.target.checked,
                })}
                className="rounded border-gray-300"
              />
              <span>Baptised</span>
            </label>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.confirmed}
                onChange={(e) => setFormData({
                  ...formData,
                  confirmed: e.target.checked,
                })}
                className="rounded border-gray-300"
              />
              <span>Confirmed</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              C4 Received
            </label>
            <select
              value={formData.c4_received}
              onChange={(e) => setFormData({
                ...formData,
                c4_received: e.target.value as 'Yes' | 'No' | 'N/A',
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
              <option value="N/A">N/A</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Overseas Check
            </label>
            <select
              value={formData.overseas_check}
              onChange={(e) => setFormData({
                ...formData,
                overseas_check: e.target.value as 'Yes' | 'No' | 'N/A',
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
              <option value="N/A">N/A</option>
            </select>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.references_up_to_date}
                onChange={(e) => setFormData({
                  ...formData,
                  references_up_to_date: e.target.checked,
                })}
                className="rounded border-gray-300"
              />
              <span>References Up-to-Date</span>
            </label>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.previous_panel}
                onChange={(e) => setFormData({
                  ...formData,
                  previous_panel: e.target.checked,
                })}
                className="rounded border-gray-300"
              />
              <span>Previous Panel</span>
            </label>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.bnp_member}
                onChange={(e) => setFormData({
                  ...formData,
                  bnp_member: e.target.checked,
                })}
                className="rounded border-gray-300"
              />
              <span>BNP Member</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Disabilities
            </label>
            <textarea
              value={formData.disabilities}
              onChange={(e) => setFormData({
                ...formData,
                disabilities: e.target.value,
              })}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              DDO Named on Report
            </label>
            <input
              type="text"
              value={formData.ddo_named_on_report}
              onChange={(e) => setFormData({
                ...formData,
                ddo_named_on_report: e.target.value,
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              DDO Email
            </label>
            <input
              type="text"
              value={formData.ddo_email}
              onChange={(e) => setFormData({
                ...formData,
                ddo_email: e.target.value,
              })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({
                ...formData,
                notes: e.target.value,
              })}
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMutation.isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
            >
              {saveMutation.isLoading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 