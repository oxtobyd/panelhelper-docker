import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, Users, CheckCircle2, XCircle, ChevronDown, ChevronUp, Mail } from 'lucide-react';
import { format, addDays, isWeekend } from 'date-fns';

interface DDOMeetingModalProps {
  candidateId: number;
  candidateName: string;
  ddoName: string;
  currentData: any;
  onClose: () => void;
  onSave: (data: any) => void;
}

function DDOMeetingModal({ 
  candidateId, 
  candidateName, 
  ddoName, 
  currentData, 
  onClose, 
  onSave 
}: DDOMeetingModalProps) {
  const [meetingData, setMeetingData] = useState({
    ddo_meeting_date: currentData?.ddo_meeting_date ? 
      format(new Date(currentData.ddo_meeting_date), "yyyy-MM-dd'T'HH:mm") : '',
    ddo_meeting_attendees: currentData?.ddo_meeting_attendees || [],
    ddo_meeting_notes: currentData?.ddo_meeting_notes || '',
    ddo_meeting_status: currentData?.ddo_meeting_status || 'pending'
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-bold mb-4">
          DDO Meeting - {candidateName}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">DDO</label>
            <input 
              type="text" 
              value={ddoName} 
              disabled 
              className="w-full px-3 py-2 bg-gray-50 border rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Date & Time</label>
            <input 
              type="datetime-local" 
              value={meetingData.ddo_meeting_date}
              onChange={(e) => setMeetingData({
                ...meetingData,
                ddo_meeting_date: e.target.value
              })}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Attendees</label>
            <input 
              type="text" 
              value={meetingData.ddo_meeting_attendees.join(', ')}
              onChange={(e) => setMeetingData({
                ...meetingData,
                ddo_meeting_attendees: e.target.value.split(',').map(s => s.trim())
              })}
              placeholder="Enter names separated by commas"
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea 
              value={meetingData.ddo_meeting_notes}
              onChange={(e) => setMeetingData({
                ...meetingData,
                ddo_meeting_notes: e.target.value
              })}
              rows={3}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select 
              value={meetingData.ddo_meeting_status}
              onChange={(e) => setMeetingData({
                ...meetingData,
                ddo_meeting_status: e.target.value
              })}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="pending">Pending</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(meetingData)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to add working days
const addWorkingDays = (date: Date, days: number): Date => {
  let currentDate = date;
  let remainingDays = days;

  while (remainingDays > 0) {
    currentDate = addDays(currentDate, 1);
    if (!isWeekend(currentDate)) {
      remainingDays--;
    }
  }

  return currentDate;
};

const generateInviteEmail = (meetings: any[], panelName: string, panelDate: string) => {
  const ddoEmails = meetings
    .filter(m => m.ddo_email)
    .map(m => m.ddo_email)
    .join(',');

  const reportsDate = addWorkingDays(new Date(panelDate), 7);

  const subject = `DDO Post-Panel Meeting Following - Panel:${panelName} (${format(new Date(panelDate), 'do MMMM')})`;
  const body = `Dear DDO(s),

I am writing to arrange a DDO meeting ahead of the upcoming Panel: ${panelName} on ${format(new Date(panelDate), 'do MMMM')}.

You have a Candidate(s) attending their Stage 2 Panel (${panelName}) on ${format(new Date(panelDate), 'do MMMM')}, this is to let you know when the reports will be going out, and to arrange a time to meet online to reflect together on the advice offered by the Panel.  

The date on which the reports are due to be released is the ${format(reportsDate, 'do')} of ${format(reportsDate, 'MMMM')}. This is because 5 full working days are needed after the end of a Panel, in which to complete all the reports, and this is therefore the earliest date possible.

As usual, the reports will be sent at 3pm, and you are invited to choose a time between 3.30pm and 7.00pm (20min slots) on ${format(reportsDate, 'do')} of ${format(reportsDate, 'MMMM')} to meet online (with your Sponsoring Bishop too if they would like to attend). I’d be most grateful if you could suggest more than one time, in the hope that everyone can be accommodated.
 
Once I have all availability, I will confirm the time slots and send out a zoom link.
 
I look forward to meeting your Candidate(s) soon.
 
Many thanks`;

  return `mailto:${ddoEmails}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

const generateConfirmationEmail = (meetings: any[], panelName: string, panelDate: string) => {
  const ddoEmails = meetings
    .filter(m => m.ddo_email)
    .map(m => m.ddo_email)
    .join(',');

  const reportsDate = addWorkingDays(new Date(panelDate), 7);

  const subject = `DDO Post-Panel Meeting Confirmation - Panel:${panelName} (${format(new Date(panelDate), 'do MMMM')})`;
  const body = `Dear DDO(s),

Thank you to those who have responded to let me know what date/time is best for our post-panel meeting on ${format(reportsDate, 'do')} of ${format(reportsDate, 'MMMM')}, please find below the Zoom link we will use for our meeting.  

If you have so far not let me know a time slot that works for you then the following are still available, please do let me know.
[INSERT TIME SLOTS AVAILABLE]

You can join the meeting using the following Zoom link:
[INSERT ZOOM LINK]

If you need to reschedule, please let me know as soon as possible.

Many thanks`;

  return `mailto:${ddoEmails}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

export function PanelDDOMeetings({ panelId }: { panelId: string }) {
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const queryClient = useQueryClient();

  const { data: meetings } = useQuery({
    queryKey: ['panel-ddo-meetings', panelId],
    queryFn: async () => {
      const response = await fetch(`/api/panels/${panelId}/ddo-meetings`);
      if (!response.ok) throw new Error('Failed to fetch DDO meetings');
      return response.json();
    }
  });

  // Sort meetings: scheduled first (by date), then unscheduled
  const sortedMeetings = meetings?.slice().sort((a: any, b: any) => {
    // If neither has a date, sort by status (completed > scheduled > pending > cancelled)
    if (!a.ddo_meeting_date && !b.ddo_meeting_date) {
      const statusOrder = { completed: 0, scheduled: 1, pending: 2, cancelled: 3 };
      return statusOrder[a.ddo_meeting_status] - statusOrder[b.ddo_meeting_status];
    }
    // If only one has a date, it should come first
    if (!a.ddo_meeting_date) return 1;
    if (!b.ddo_meeting_date) return -1;
    // If both have dates, sort by date
    return new Date(a.ddo_meeting_date).getTime() - new Date(b.ddo_meeting_date).getTime();
  });

  const { data: panelInfo } = useQuery({
    queryKey: ['panel-info', panelId],
    queryFn: async () => {
      const response = await fetch(`/api/panels/${panelId}`);
      if (!response.ok) throw new Error('Failed to fetch panel info');
      return response.json();
    }
  });

  const updateMeeting = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/panels/${panelId}/ddo-meetings/${data.candidate_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update meeting');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel-ddo-meetings', panelId] });
      setSelectedMeeting(null);
    },
  });

  if (!meetings?.length) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div 
          className="flex items-center cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <h2 className="text-xl font-bold">DDO Meetings</h2>
          <button className="p-1 hover:bg-gray-100 rounded ml-2">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
        
        <div className="flex gap-2">
          {meetings?.some(m => m.ddo_email) && (
            <>
              <button
                onClick={() => {
                  if (!panelInfo?.panel) return;
                  window.location.href = generateInviteEmail(
                    meetings,
                    panelInfo.panel.panel_name,
                    panelInfo.panel.panel_date
                  );
                }}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 px-3 py-1 border rounded-md"
                title="Send meeting invitation email"
              >
                <Clock className="w-4 h-4" />
                Send Invite
              </button>
              
              <button
                onClick={() => {
                  if (!panelInfo?.panel) return;
                  window.location.href = generateConfirmationEmail(
                    meetings,
                    panelInfo.panel.panel_name,
                    panelInfo.panel.panel_date
                  );
                }}
                className="text-sm text-green-600 hover:text-green-800 flex items-center gap-1 px-3 py-1 border rounded-md"
                title="Send meeting confirmation email"
              >
                <Calendar className="w-4 h-4" />
                Send Confirmation
              </button>

              <button
                onClick={() => {
                  const emails = meetings
                    .filter(m => m.ddo_email)
                    .map(m => m.ddo_email)
                    .join(', ');
                  navigator.clipboard.writeText(emails);
                }}
                className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1 px-3 py-1 border rounded-md"
                title="Copy all DDO emails"
              >
                <Mail className="w-4 h-4" />
                Copy Emails
              </button>
            </>
          )}
        </div>
      </div>
      
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sortedMeetings?.map((meeting: any) => (
            <div 
              key={meeting.candidate_id}
              className="flex flex-col justify-between p-4 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center gap-3 mb-2">
                {meeting.ddo_meeting_status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                {meeting.ddo_meeting_status === 'cancelled' && <XCircle className="w-4 h-4 text-red-500" />}
                {meeting.ddo_meeting_status === 'scheduled' && <Calendar className="w-4 h-4 text-blue-500" />}
                {meeting.ddo_meeting_status === 'pending' && <Clock className="w-4 h-4 text-gray-500" />}
                
                <div>
                  <div className="font-medium">{meeting.candidate_name}</div>
                  <div className="text-sm text-gray-500">DDO: {meeting.ddo_name || 'Not assigned'}</div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                {meeting.ddo_meeting_date && (
                  <div className="text-right text-sm">
                    <div className="font-medium">{format(new Date(meeting.ddo_meeting_date), 'MMM d')}</div>
                    <div className="text-gray-500">{format(new Date(meeting.ddo_meeting_date), 'HH:mm')}</div>
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMeeting(meeting);
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  {meeting.ddo_meeting_status === 'pending' ? 'Schedule' : 'Edit'}
                </button>
              </div>

              {(meeting.ddo_meeting_attendees?.length > 0 || meeting.ddo_meeting_notes) && (
                <div className="border-t mt-2 pt-2 space-y-2 bg-gray-50">
                  {meeting.ddo_meeting_attendees?.length > 0 && (
                    <div className="flex gap-2 text-sm text-gray-600">
                      <Users className="w-4 h-4 mt-1 flex-shrink-0" />
                      <span>{meeting.ddo_meeting_attendees.join(', ')}</span>
                    </div>
                  )}
                  {meeting.ddo_meeting_notes && (
                    <div className="text-sm text-gray-600">
                      <p className="whitespace-pre-line">{meeting.ddo_meeting_notes}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="px-3 py-2 border-t mt-2">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  meeting.ddo_meeting_status === 'completed' ? 'bg-green-100 text-green-800' :
                  meeting.ddo_meeting_status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  meeting.ddo_meeting_status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {meeting.ddo_meeting_status.charAt(0).toUpperCase() + meeting.ddo_meeting_status.slice(1)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedMeeting && (
        <DDOMeetingModal
          candidateId={selectedMeeting.candidate_id}
          candidateName={selectedMeeting.candidate_name}
          ddoName={selectedMeeting.ddo_name}
          currentData={selectedMeeting}
          onClose={() => setSelectedMeeting(null)}
          onSave={(data) => updateMeeting.mutate({
            ...data,
            candidate_id: selectedMeeting.candidate_id
          })}
        />
      )}
    </div>
  );
}