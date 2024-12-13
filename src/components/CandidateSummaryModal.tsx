interface CandidateSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: Array<{
    attendee_name: string;
    notes: string;
    disabilities: string;
  }>;
}

export function CandidateSummaryModal({ isOpen, onClose, candidates }: CandidateSummaryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Candidate Summary</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              ×
            </button>
          </div>
          
          <div className="space-y-6">
            {candidates.map((candidate) => (
              <div key={candidate.attendee_name} className="border-b pb-4">
                <h3 className="font-semibold mb-2">{candidate.attendee_name}</h3>
                
                {candidate.notes && (
                  <div className="mb-2">
                    <div className="text-sm font-medium text-gray-500">Notes</div>
                    <div className="mt-1">{candidate.notes}</div>
                  </div>
                )}
                
                {candidate.disabilities && (
                  <div>
                    <div className="text-sm font-medium text-gray-500">Disabilities</div>
                    <div className="mt-1">{candidate.disabilities}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 