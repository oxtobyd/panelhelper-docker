import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Calendar, MapPin, Users, CheckSquare, Mail, Phone, UserCircle, ChevronUp, ChevronDown, Plus, Trash2, Printer, ExternalLink, FileText } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { AddTasksModal } from './AddTasksModal';
import { CandidateRecordModal } from './CandidateRecordModal';
import { PanelNote } from './PanelNote';
import { PanelTasks } from './PanelTasks';
//import { ScoringPanel } from './ScoringPanel';
import { PanelDDOMeetings } from './PanelDDOMeetings';
import { CopyWorshipScheduleModal } from './CopyWorshipScheduleModal';
import { PrintingChecklistModal } from './PrintingChecklistModal';
import { CandidateSummaryModal } from './CandidateSummaryModal';


interface Task {
  id: number;
  title: string;  
  description: string;
  due_date: string;
  completed: boolean;
}

interface AdviserPreference {
  adviser_id: number;
  arrive_night_before: boolean;
  evening_meal: boolean;
  arrival_time: string | null;
}

interface WorshipService {
  day: string;
  time: string;
  service_type: string;
  leading: string;
  first_reader: string;
  second_reader: string;
  prayers: string;
  homily: string;
  first_reading: string;
  second_reading: string;
  hymns: string;
  notes: string;
}

interface WorshipSchedule {
  season: string;
  services: WorshipService[];
}

// Add this helper function near the top of the file
const generateCandidateWelcomeEmail = (
  candidates: any[], 
  panelDate: string, 
  panelName: string,
  secretary: any
) => {
  const candidateEmails = candidates
    .filter(c => c.email)
    .map(c => c.email)
    .join(',');

  const candidateCount = candidates.length;
  const groupSize = Math.ceil(candidateCount / 2);

  const subject = `Welcome to ${panelName}`;
  const body = `Dear Candidates,

I will be your Panel Secretary at your forthcoming Stage 2 Discernment Panel on ${format(new Date(panelDate), 'do MMMM')}.

I'm looking forward to meeting you on ${format(new Date(panelDate), 'EEEE do MMMM')} (10.30 -11.15am arrival for a 11.30am start).

[UPDATE AS REQUIRED]
**We will be a smaller cohort than normal (x2 Groups of ${groupSize} Candidates), and with this in mind we can amend our Timetable to allow yourselves an earlier departure on Day 2, therefore our closing meeting will be 1pm – 1.30pm on Day 2, and you'll be able to leave from 1.30pm onwards. I will make available on your arrival a full printed copy of the timetable.

The Online Portal will be emailing you additional information 3 weeks before the Panel, and all the Resources you need are available via the Resource links in the Portal, but if you have any questions please do let me know.

Every blessing, and I look forward to meeting you on ${format(new Date(panelDate), 'do MMMM')}.

Many thanks,
${secretary?.attendee_name || 'Panel Secretary'}`;

return `mailto:?bcc=${candidateEmails}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

// Add these helper functions
const generateAdviserEmail1 = (advisers: any[], panelDate: string, panelName: string, venueName: string) => {
  const adviserEmails = advisers
    .filter(a => a.attendee_type === 'A' && a.email)
    .map(a => a.email)
    .join(',');

  const startDate = new Date(panelDate);
  const endDate = addDays(startDate, 2);

  // Calculate the Wednesday before the panel
  const preMeetingDate = new Date(startDate);
  preMeetingDate.setDate(startDate.getDate() - startDate.getDay() - 4); // Go back to previous Wednesday
  // If we ended up with a date after the panel start, go back one more week
  if (preMeetingDate >= startDate) {
      preMeetingDate.setDate(preMeetingDate.getDate() - 7);
  }

  const subject = `Panel: ${panelName} - Initial Information`;
  const body = `Dear Adviser Colleagues,

I am very much looking forward to serving with at our Stage 2 Panel to be held at ${venueName} from ${format(startDate, 'EEEE do')} to ${format(endDate, 'EEEE do MMMM')}.

I'm emailing at this point to check two matters with you:

• Would you please let our Support Secretary Patsy Jones (cc'd into this email) know at your earliest convenience if you would like to stay over at ${venueName} on the night of ${format(addDays(startDate, -1), 'EEEE do MMMM')} (please copy me in). I will be staying over myself and will aim to arrive around 6pm. We will hold our first meeting at 10am on Day 1 and some Advisers find it helpful to be on site the night before we begin. If you would like to stay, please would you let Patsy know and what time you might be arriving as soon as possible to help the staff manage their rotas etc? 

[AMEND AS REQUIRED]
${venueName} are not able to offer an evening meal, but I propose those who would like to, we go to a local pub for some food at around 7pm, (this can be claimed back on your expenses).

• I'd like to propose that we have an online pre-meeting the week before the Panel to meet each other, briefly run through the purpose and format of a Stage 2 Panel to familiarise/re-familiarise ourselves with it and begin to address any questions or comments that we might have. You won't need to have read the Candidates' Paperwork by this point (though hopefully you will have started to engage with them for your Interview preparations), as we will discuss Candidates once we have gathered at our venue. To that end, would you be free for about 45-60 minutes on [AMEND] ${format(preMeetingDate, 'EEEE do MMMM')}? We will use the following zoom link for our meeting https://churchofengland-org.zoom.us/j/96758696317

More information will be made available to you over the coming weeks. For now, I send you my prayers and gratitude for your willingness to share in the important ministry of discernment.`;

  return `mailto:?bcc=${adviserEmails}&cc=patsy.jones@churchofengland.org&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

const generateAdviserEmail2 = (
  advisers: any[], 
  panelDate: string, 
  panelName: string, 
  venueName: string,
  subjects: any[]
) => {

  console.log('Generating email with:', {
    advisers,
    subjects
  });

  const adviserEmails = advisers
    .filter(a => a.attendee_type === 'A' && a.email)
    .map(a => a.email)
    .join(',');

  const startDate = new Date(panelDate);
  const endDate = addDays(startDate, 2);

  // Calculate the Wednesday before the panel
  const preMeetingDate = new Date(startDate);
  preMeetingDate.setDate(startDate.getDate() - startDate.getDay() - 4); // Go back to previous Wednesday
  // If we ended up with a date after the panel start, go back one more week
  if (preMeetingDate >= startDate) {
      preMeetingDate.setDate(preMeetingDate.getDate() - 7);
  }

  // Generate the qualities allocation text
  const qualitiesText = advisers
    .map(adviser => {
      // Construct the adviser's designation (MFA1, MFA2, PFA1, or PFA2)
      const adviserDesignation = `${adviser.mfa_or_pfa}FA${adviser.mp1_or_2}`;
      console.log('Adviser designation:', adviserDesignation);

      // Find subjects matching this adviser's designation and sort by id
      const adviserSubjects = subjects
        .filter(subject => subject.designation === adviserDesignation)
        .sort((a, b) => parseInt(a.id) - parseInt(b.id))
        .map(subject => subject.name);

      console.log('Matched subjects for adviser:', adviserSubjects);

      if (adviserSubjects.length === 0) return null;

      // Split into full and half qualities
      const fullQuality = adviserSubjects[0];
      const halfQuality = adviserSubjects[1];

      return `• ${adviser.attendee_name}: Full Quality - ${fullQuality}, Half Quality - ${halfQuality}`;
    })
    .filter(text => text !== null)
    .join('\n');

  // Debug log final text
  console.log('Final qualities text:', qualitiesText);

  const subject = `Panel: ${panelName} - Additional Information`;
  const body = `Dear Adviser Colleagues,

I'm looking forward to ministering alongside you at the forthcoming Stage 2 Panel on which you have kindly agreed to serve from ${format(startDate, 'EEEE do')} to ${format(endDate, 'EEEE do MMMM')}. This is just some additional information which I hope you will find helpful as you start your preparations.

[AMEND AS REQUIRED]
Timetable Change
• In light of us have 8 Candidates (4 in each Group), I thought it helpful to review the Timetable to make better use of our time together and offer some more space for writing up of reports. I will therefore bring a hard-copy of the revised timetable to our Panel, but in essence, Candidates will leave earlier on the 2nd Day (1.30pm), leaving more time for Report Writing.

Candidate Paperwork and Online Resources
• You will hear from Patsy (cc'd into this email) with further details about our Panel, and details of the Resources and Paperwork being made available. You will find the Candidates Paperwork and additional Resources in the Online Portal, but I have also attached the Notes for Bishops' Advisers for Stage 2. Your starting point might be to read the Notes for Bishops' Advisers – these are gleaned from the training sessions you attended and will back up that training and refresh it for you.

Candidates and Qualities
• We will have two Groups of Candidates and Advisers for this Panel, and you will find the Candidate details in the Online Portal under Panel ${panelName}. Please check Candidate names just to ensure there are no conflicts of interest and look at which Quality and Half-Quality you will be interviewing against (see below the Qualities Allocations)
  
Qualities Allocations
${qualitiesText}

Staying overnight before the Panel.
• Thank you for letting Patsy know if you'll be staying overnight the evening before the Panel, if you haven't yet let her know please do so ASAP (and copy myself in). I will be arriving at the venue around 6pm, and either myself or Patsy will send further instructions nearer the time regarding accessing the Venue if not staffed.

First Day 
• On the first day I would like to start our initial meeting at 10am, since the Stage 2 Panels are new for some of us.

Pre-panel meeting on [AMEND] ${format(preMeetingDate, 'EEEE do MMMM')} at 6pm.
• Thank you for letting me know if you can attend our pre-panel meeting the week before, here's the zoom link again https://churchofengland-org.zoom.us/j/96758696317
  
Worship
• I will be in touch regarding the leading of worship in the Panel in due course. I am trying not to over-burden you too much at your Panel. Please be assured no one will be asked to preach or give an address in worship. There will be the need for some of you to help lead worship, however and I will give further details in due course.

Structuring of Interviews at the Panel
Some advisers have asked about the internal structure of the interviews at the panel. We can say more at the Pre-Panel meeting, but the following pattern is suggested for each of the 75-minute Interviews. The timings have a little flexibility (and we are aware that the Wisdom Quality may need a few minutes more as there is a lot to cover) but we have found this pattern to work reasonably well so far.

• Welcome and introduction (Adviser B) (3 mins).
• Adviser A main Quality (c20 minutes)
• Supplementary Question(s) by Adviser B, then check out if the candidate has anything more they wish to add on this Quality
• Adviser A half Quality (c.10 minutes)
• Supplementary Question(s) Adviser B, then check out if the candidate has anything more they wish to add on this half Quality

• Mid-point 3-5 minutes comfort break offered – optional if tight on time.

• Adviser B main Quality (c20 minutes)
• Supplementary Question(s) by Adviser A, then check out if the candidate has anything more they wish to add on this Quality
• Adviser B half Quality (c.10 minutes)
• Supplementary Question(s) Adviser A, then check out if the candidate has anything more they wish to add on this half Quality
• Last opportunity for Candidate to re-visit/volunteer something (3 mins) - Adviser B to invite
• Thank you and 'Goodbye'

The advantage of the above pattern, we felt, is that it splits the Advisers' time overall neatly into two halves – meaning that each Adviser knows how much time in total they have available to explore their Quality and half-Quality and leaves their colleague with the same amount of time to do the same.

When you meet in your team of four and your interviewing pairs on the Monday, you will have the space to hone what you need to cover and how you will do it between you.

Further Documentation 
• Further useful documents will be in the Online Portal Resource links. The Crib sheets for Interviews and reports will be printed in hard copy and given to you at the Panel, as will copies of the Group Exercise that the candidates will be engaging with, along with other helpful documents for the Panel.

I have also attached the following:
• Group Exercise scenario for you and the follow-on email as well as guidance for the MFA Advisers about leading it (this will be confirmed nearer the time). Please note that the Scenario and email are not to be shared or forwarded to anyone as they will be needed in the future.
• Report writing sample paragraphs (two highlight their structural breakdown), which my previous panels found helpful for their own report writing, and therefore I offer in the hope it's helpful for yourselves also when it comes to writing reports.

Additional Information
[AMEND AS REQUIRED]
• As we only have 8 Candidates in total, I will combine the two Groups of 4 into one cohort of 8 for the purpose of the Group Exercise.

I very much look forward to meeting with you and working with you on this Panel.`;

return `mailto:?bcc=${adviserEmails}&cc=patsy.jones@churchofengland.org&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

const generateAdviserEmail3 = (advisers: any[], panelDate: string, panelName: string) => {
  const adviserEmails = advisers
    .filter(a => a.attendee_type === 'A' && a.email)
    .map(a => a.email)
    .join(',');

  const subject = `Panel: ${panelName} - Final Information`;
  const body = `Dear Colleagues,

I hope this email finds you keeping well, and finding a little space to engage with the Candidate Paperwork, below is some additional information for our Panel.

Worship 
• I've attached a Worship Schedule and hope you don't mind in the sharing of the Readings and Prayers, please do have a look at the Schedule, and where I have your name down, let me know if any problems.

Group Exercise
• Please could our MFA 1 Advisers [NAMES] act as the Group Exercise Facilitators for your respective Group. I've attached again for ease, the notes on how to facilitate the Group Exercise. I'll bring along hard copies of the Scenario and Additional Information as needed.
  
Pre-Meeting
I look forward to ministering with you soon, and seeing you at our Zoom pre-meeting at 6pm for those able to make it. (zoom link is https://churchofengland-org.zoom.us/j/96758696317)`;

  return `mailto:?bcc=${adviserEmails}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

const generateCarouselAdviserEmail = (
  advisers: any[],
  panelDate: string,
  panelName: string,
  secretary: any
) => {
  const subject = `Carousel Information - ${panelName}`;
  const body = `Dear Adviser Colleagues,

This is to let you know the essential information for our Carousel Conversations. Please remember to join our initial meeting after logging out of your Zoom account and logging in with the provided ones, as noted in the Web Portal.

I look forward to serving with you at our upcoming Carousel, when we will engage with the Candidates. I will be your Panel Secretary and can best be contacted via email. However, if you need to contact me in an emergency, my mobile number is 07595 387652.

All the Candidate and Conversation information you require for our Carousel will be available via the Web Portal (10 days before the Carousel date) at https://discernment.churchofengland.org with further details outlined below.

Feedback During the day
• Conversation feedback can now be submitted via the Portal, where you will find a button next to each Candidate's name with a small drop-down arrow. Once the drown-down arrow is clicked, a menu will appear. From here, you can add your Conversation Feedback and a Banding. Please complete the feedback after each Conversation where possible and during any breaks.

Candidate Stage 1 Forms
• You will find the Candidate Stage 1 Forms for our Carousel in the Web Portal so you can start your preparations. These are available 10 days before the Carousel date. This is where the Candidate has an opportunity to introduce themselves and may also include some optional additional words from their (A)DDO and any disability information that may be relevant. Whether the Candidate is being sponsored as a Priest or Distinctive Deacon is also indicated.

• To access the Candidate Stage 1 Forms - After logging into the Portal, select the button on the left, 'Carousels'. This will show you a list of the Carousels you have been booked onto. Then select the relevant Carousel. From here, you will see a list of Candidates and a button to 'View Documentation' against each one. This will show you the Stage 1 Form the Candidate has completed.

Carousel Conversation Allocation
• Please log into the Web Portal, and look at your Carousel, where you will find which Conversation you have been assigned. This is shown in the Details box (top left).

Carousel Timetable & Zoom Account
The Carousel Timetable, Zoom Links, and your dedicated Zoom Account details will be generated and available via the Web Portal 36 Hours before the Carousel starts. You will find the Zoom links for our:
• Initial Meeting with myself and fellow Advisers at 9 am/2 pm (depending on a morning or afternoon Carousel; further details below).
• Meeting with the Candidates at the beginning and end of the Carousel,
• Conversation Zoom link (this will be your single ongoing Zoom meeting that Candidates will enter and leave at the appropriate time),
• Moderation session.

Initial Meeting – 9 am/2 pm (depending on morning or afternoon Carousel)
• We will meet an hour before the Candidates join us to recap key elements from the Stage 1 Training and cover any technical hurdles anyone may have with logging into your dedicated Zoom account. Please join this Initial Meeting using the Zoom account created for you rather than your own personal Zoom account.

• The Candidates will join us at this meeting at 10 am/3 pm for their briefing.

• If this is your first Stage 1 Carousel, or If you would value a conversation or meeting before the day to cover anything you're unsure about, please let me know.

Conversation Resources
We are making all the resources available to all Advisers at a Carousel – but please make sure you have identified and looked at the resources and supporting documents relevant to the Conversation you are looking after. To access your Conversation Resource, Supporting Documents, and Additional Guides, please see the Resources section in the Web Portal for the Carousel.

The following Resource links in the Web Portal are:
• Conversation 1: Priesthood Diaconate Image Set - images and scripture passages
• Conversation 2: Church of England News Story - news story
• Conversation 3: Communicating Christian Faith - (no extra resources needed)
• Conversation 4: Practical and Pastoral Care
  • Pastoral Follow-Up Email - email that is shown to the Candidate part-way through the Conversation and Scenario Guidance Notes
  • Adviser Practical & Pastoral Care Video - the video clip of the pastoral scenario
• Conversation 5: Living as a Disciple - (no extra resources needed)
• Conversation 6: General News Story - The candidate might request this if they haven't provided something

Supporting Documents
You will also find under the Resources - Adviser Welcome/ Instruction Document, the link will take you to a Dropbox folder that contains your
  • Additional Guides (if helpful)
    • Notes for Advisers guide (as you received during Training)
    • Document explaining how to access the Zoom account you will be using at the Carousel
    • Additional notes on Zoom interviewing

Zoom - Technical Note
The main technical hurdle we have found Advisers to have with Zoom-based Conversations is their logging out of Zoom from their own personal account and logging in with the provided account (as will be shown in the Zoom Information section of Portal 36hrs before our Carousel), please do familiarise yourself with logging in and out of Zoom before coming to our initial meeting, please do refer to the additional support document '1 – Advisers' Notes on Zoom Login.pdf' to help with this, or let me know and I'll happily guide you through the process.

PS Sometimes Zoom asks for a verification code. If this is the case, please let me know at 07595 387652, and I can access the one generated for your Adviser Zoom account and share this with you. Please be aware this verification code is only valid for 10 minutes.

NB. Please do not share these links or their content, with anyone else.

I hope this is of help and reassurance at this point. If you have any questions before our Initial Meeting at 9 am/2 pm on the day, please do not hesitate to get in touch.`;

  return `mailto:?bcc=${advisers.map(a => a.email).join(',')}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

export function PanelDetail() {
  const { id } = useParams();
  const [showAddTasks, setShowAddTasks] = useState(false);
  const queryClient = useQueryClient();
  const [selectedCandidate, setSelectedCandidate] = useState<{ id: number; name: string } | null>(null);
  const [isScoringExpanded, setIsScoringExpanded] = useState(true);
  const [isWorshipExpanded, setIsWorshipExpanded] = useState(true);
  const [showCopyScheduleModal, setShowCopyScheduleModal] = useState(false);
  const [isAttendeesExpanded, setIsAttendeesExpanded] = useState(true);
  const [showPrintingChecklist, setShowPrintingChecklist] = useState(false);
  const [showAdviserEmailMenu, setShowAdviserEmailMenu] = useState(false);
  const [showCandidateSummary, setShowCandidateSummary] = useState(false);

  const { data: panelData, isLoading } = useQuery({
    queryKey: ['panel', id],
    queryFn: async () => {
      const response = await fetch(`/api/panels/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch panel');
      }
      const data = await response.json();
      console.log('Panel data:', data);
      return data;
    },
  });

  const { data: scores = [] } = useQuery({
    queryKey: ['adviser-candidate-scores', id],
    queryFn: async () => {
      const response = await fetch(`/api/panels/${id}/scores`);
      if (!response.ok) {
        throw new Error('Failed to fetch scores');
      }
      const data = await response.json();
      console.log('Scores data:', data);
      return data;
    },
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const response = await fetch('/api/panels/subjects');
      if (!response.ok) {
        throw new Error('Failed to fetch subjects');
      }
      return response.json();
    },
  });

  const scoreMutation = useMutation({
    mutationFn: async ({ adviserId, candidateId, subjectId, score }: {
      adviserId: number;
      candidateId: number;
      subjectId: number;
      score: number;
    }) => {
      console.log('Sending score update:', {
        panel_id: id,
        adviser_id: adviserId,
        candidate_id: candidateId,
        subject_id: subjectId,
        score,
      });

      const response = await fetch('/api/panels/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          panel_id: id,
          adviser_id: adviserId,
          candidate_id: candidateId,
          subject_id: subjectId,
          score,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Score update failed:', errorData);
        throw new Error(errorData.error || 'Failed to update score');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adviser-candidate-scores', id] });
    },
  });

  const getScore = (adviserId: number, candidateId: number, subjectId: number) => {
    
    const score = scores.find((s: any) => 
      s.adviser_id === adviserId.toString() && 
      s.candidate_id === candidateId.toString() && 
      s.subject_id === subjectId.toString()
    )?.score;
    
    console.log('Found score:', score);
    return score;
  };

  const { data: candidateRecords } = useQuery({
    queryKey: ['candidateRecords'],
    queryFn: async () => {
      const response = await fetch(`/api/candidates/records`);
      if (!response.ok) {
        throw new Error('Failed to fetch candidate records');
      }
      const data = await response.json();
      console.log('Fetched candidate records:', data);
      return data;
    },
  });

  const [preferences, setPreferences] = useState<{ [key: string]: AdviserPreference }>({});
  
  // Fetch existing preferences
  const { data: adviserPreferences } = useQuery({
    queryKey: ['adviser-preferences', id],
    queryFn: async () => {
      const response = await fetch(`/api/panels/${id}/adviser-preferences`);
      if (!response.ok) throw new Error('Failed to fetch preferences');
      const data = await response.json();
      return data.reduce((acc: any, pref: AdviserPreference) => {
        acc[pref.adviser_id] = pref;
        return acc;
      }, {});
    },
  });

  // Mutation for updating preferences
  const updatePreference = useMutation({
    mutationFn: async (data: {
      adviserId: number;
      arriveNightBefore: boolean;
      eveningMeal: boolean;
      arrivalTime: string | null;
    }) => {
      const response = await fetch(`/api/panels/${id}/adviser-preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update preferences');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adviser-preferences', id] });
    },
  });

  const [adviserDetails, setAdviserDetails] = useState({});

  const handleCheckboxChange = (id, field, value) => {
    setAdviserDetails((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleTimeChange = (id, time) => {
    setAdviserDetails((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        arrivalTime: time,
      },
    }));
  };

  const handleWorshipScheduleChange = (index: number, field: string, value: string) => {
    const updatedSchedule = { ...worshipSchedule };
    
    if (field === 'season') {
      updatedSchedule.season = value;
    } else {
      updatedSchedule.services = [...updatedSchedule.services];
      updatedSchedule.services[index] = {
        ...updatedSchedule.services[index],
        [field]: value
      };
    }

    // Use the mutation to update the schedule
    updateWorshipSchedule.mutate(updatedSchedule);
  };

  const { data: worshipSchedule = {
    season: 'Ordinary',
    services: [
      {
        day: 'Day 1',
        time: '11:30',
        service_type: 'Opening Worship',
        leading: 'Panel Sec.',
        first_reader: '',
        second_reader: '',
        prayers: '',
        homily: '',
        first_reading: '',
        second_reading: '',
        hymns: '',
        notes: ''
      }
    ]
  }} = useQuery({
    queryKey: ['worship-schedule', id],
    queryFn: async () => {
      const response = await fetch(`/api/worship-schedule/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch worship schedule');
      }
      return response.json();
    }
  });

  const updateWorshipSchedule = useMutation({
    mutationFn: async (data: WorshipSchedule) => {
      const response = await fetch(`/api/worship-schedule/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to update worship schedule');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worship-schedule', id] });
    },
  });

  const handleAddService = () => {
    const updatedSchedule = {
      ...worshipSchedule,
      services: [...worshipSchedule.services, {
        day: 'Day 1',
        time: '',
        service_type: '',
        leading: 'Panel Sec.',
        first_reader: '',
        second_reader: '',
        prayers: '',
        homily: '',
        first_reading: '',
        second_reading: '',
        hymns: '',
        notes: ''
      }]
    };
    updateWorshipSchedule.mutate(updatedSchedule);
  };

  const handleRemoveService = (index: number) => {
    const updatedSchedule = {
      ...worshipSchedule,
      services: worshipSchedule.services.filter((_, i) => i !== index)
    };
    updateWorshipSchedule.mutate(updatedSchedule);
  };

  const copyWorshipSchedule = useMutation({
    mutationFn: async (sourceId: string) => {
      console.log('Starting copy mutation with sourceId:', sourceId, 'targetId:', id);
      
      const response = await fetch(`/api/worship-schedule/${id}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_panel_id: sourceId }),
      });
      
      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (!response.ok) {
        throw new Error(data.detail || data.error || 'Failed to copy worship schedule');
      }
      
      return data;
    },
    onSuccess: (data) => {
      console.log('Copy successful:', data);
      queryClient.invalidateQueries({ queryKey: ['worship-schedule', id] });
      setShowCopyScheduleModal(false);
    },
    onError: (error) => {
      console.error('Copy failed:', error);
      // You might want to show this error in your UI
      alert(`Failed to copy worship schedule: ${error.message}`);
    }
  });

  if (isLoading) {
    return <div>Loading panel details...</div>;
  }

  const { panel, secretary, attendees, tasks } = panelData;

  if (!Array.isArray(subjects)) {
    console.error('Subjects data is not an array:', subjects);
    return <div>Error loading subjects</div>;
  }

  const groupAttendeesByTeam = (attendees: any[], type: 'C' | 'A') => {
    return attendees
      .filter(a => a.attendee_type === type)
      .reduce((groups: { [key: string]: any[] }, attendee) => {
        const team = attendee.attendee_team || 'Unassigned';
        if (!groups[team]) {
          groups[team] = [];
        }
        groups[team].push(attendee);
        return groups;
      }, {});
  };

  const getAdviserDesignation = (adviser: any) => {
    if (!adviser.mfa_or_pfa || !adviser.mp1_or_2) return '';
    const prefix = adviser.mfa_or_pfa === 'M' ? 'MFA' : 'PFA';
    return `${prefix}${adviser.mp1_or_2}`;
  };

  if (selectedCandidate) {
    return (
      <CandidateRecordModal
        candidateId={selectedCandidate.id}
        candidateName={selectedCandidate.name}
        onClose={() => setSelectedCandidate(null)}
      />
    );
  }

  // Add these helper functions near the top of your component
  const getRecordStatus = (record: any) => {
    if (!record) return 'none';
    
    // Check if we have any data beyond just the candidate_id
    const hasData = Object.keys(record).length > 1;
    if (!hasData) return 'none';
    
    if (isRecordComplete(record)) return 'complete';
    return 'partial';
  };

  const isRecordComplete = (record: any) => {
    if (!record) return false;
    
    // Required checks (must all be true/filled)
    const requiredChecks = [
      record.dbs_check_complete === true,
      record.ddo_named_on_report && record.ddo_named_on_report.trim() !== '',
      record.ddo_email && record.ddo_email.trim() !== '',
      record.baptised === true,
      record.confirmed === true,
      record.references_up_to_date === true
    ];

    // Return true if all required checks are complete
    return requiredChecks.every(Boolean);
  };

  const getMissingChecks = (record: any) => {
    if (!record) return ['No record exists'];
    if (Object.keys(record).length <= 1) return ['No checks recorded'];
    
    const missing = [];
    
    // Required checks
    if (!record.dbs_check_complete) missing.push('DBS Check');
    if (!record.ddo_named_on_report?.trim()) missing.push('DDO Name');
    if (!record.ddo_email?.trim()) missing.push('DDO Email');
    if (!record.baptised) missing.push('Baptism');
    if (!record.confirmed) missing.push('Confirmation');
    if (!record.references_up_to_date) missing.push('References');
    
    return missing;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
      <h1 className="text-2xl font-bold">{panel.panel_name}</h1>
      {panel.portal_ref && (
        <a 
          href={`https://discernment.churchofengland.org/app/scheduling/${panel.panel_type === 'Panel' ? 'panels' : 'carousels'}/${panel.portal_ref}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          (View in Portal)
        </a>
      )}
      </div>
      {panel.panel_type === 'Panel' && (
      <button
        onClick={() => setShowPrintingChecklist(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-50 border rounded-md hover:bg-gray-100 text-gray-700"
      >
        <Printer size={18} />
        <span>Printing & Clipboards</span>
      </button>
    )}
        </div>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="flex items-center text-gray-600">
            <Calendar size={18} className="mr-2" />
            <span>{format(new Date(panel.panel_date), 'PPP')}</span>
          </div>
          <div className="flex items-center text-gray-600">
            <MapPin size={18} className="mr-2" />
            <span>{panel.venue_name}</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Users size={18} className="mr-2" />
            <span>
              {attendees.filter((a: { attendee_type: string }) => a.attendee_type === 'C').length} Candidates,{' '}
              {attendees.filter((a: { attendee_type: string }) => a.attendee_type === 'A').length} Advisers
            </span>
          </div>
        </div>

        {/* Secretary information */}
        {secretary && (
          <div className="border-t pt-4 mt-4">
            <h2 className="text-lg font-semibold mb-3 flex items-center">
              <UserCircle size={20} className="mr-2" />
              Panel Secretary
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-gray-600">{secretary.attendee_name}</div>
              {secretary.secretary_email && (
                <div className="flex items-center text-gray-600">
                  <Mail size={16} className="mr-2" />
                  <a 
                    href={`mailto:${secretary.secretary_email}`}
                    className="hover:text-blue-600"
                  >
                    {secretary.secretary_email}
                  </a>
                </div>
              )}
              {secretary.secretary_tel && (
                <div className="flex items-center text-gray-600">
                  <Phone size={16} className="mr-2" />
                  <a 
                    href={`tel:${secretary.secretary_tel}`}
                    className="hover:text-blue-600"
                  >
                    {secretary.secretary_tel}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <PanelNote panelId={id!} />

      <div className="bg-white rounded-lg shadow-md p-6">
        <div 
          className="flex items-center justify-between cursor-pointer mb-4"
          onClick={() => setIsAttendeesExpanded(!isAttendeesExpanded)}
        >
          <h2 className="text-xl font-bold">Attendees</h2>
          <button className="p-1 hover:bg-gray-100 rounded">
            {isAttendeesExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {isAttendeesExpanded && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold">Candidates</h3>
                <div className="flex gap-2">
                {panel.panel_type === 'Panel' && (
                    <button
                      onClick={() => {
                        if (!panel?.panel_date) return;
                        window.location.href = generateCandidateWelcomeEmail(
                          attendees.filter((a: any) => a.attendee_type === 'C'),
                          panel.panel_date,
                          panel.panel_name,
                          secretary
                        );
                      }}
                      className="text-sm text-green-600 hover:text-green-800 flex items-center gap-1 px-3 py-1 border rounded-md"
                    >
                      <Mail className="w-4 h-4" />
                      Send Welcome
                    </button>
                  )}
                  <button
                    onClick={() => setShowCandidateSummary(true)}
                    className="px-3 py-1 bg-gray-50 text-gray-600 rounded hover:bg-gray-100 flex items-center gap-1"
                  >
                    <FileText className="w-4 h-4" />
                    Notes
                  </button>
                  <button
                    onClick={() => {
                      const emails = attendees
                        .filter((a: { attendee_type: string; email: string }) => 
                          a.attendee_type === 'C' && a.email
                        )
                        .map((a: { email: string }) => a.email)
                        .join(', ');
                      navigator.clipboard.writeText(emails);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 px-3 py-1 border rounded-md"
                  >
                    <Mail className="w-4 h-4" />
                    Copy Emails
                  </button>
                </div>
              </div>
              {Object.entries(groupAttendeesByTeam(attendees, 'C')).map(([team, teamAttendees]) => (
                <div key={team} className="mb-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">{team}</h4>
                  <ul className="space-y-2">
                    {teamAttendees.map((attendee) => (
                      <li key={attendee.id} className="text-gray-700">
                        <div className="flex justify-between items-start">
                          <div>
                            {attendee.attendee_name}
                            {(attendee.sponsored_ministry || attendee.diocese_name) && (
                              <span className="text-sm text-gray-500 ml-1">
                                ({[
                                  attendee.sponsored_ministry,
                                  attendee.diocese_name
                                ].filter(Boolean).join(', ')})
                              </span>
                            )}
                            {attendee.email && (
                              <div className="text-sm text-gray-500">
                                <Mail size={14} className="inline mr-1" />
                                <a href={`mailto:${attendee.email}`} className="hover:text-blue-600">
                                  {attendee.email}
                                </a>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => setSelectedCandidate({
                              id: parseInt(attendee.attendee_id),
                              name: attendee.attendee_name
                            })}
                            className={`text-sm px-3 py-1 ${
                              {
                                'none': 'bg-blue-50 text-blue-600 hover:bg-blue-100',
                                'partial': 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100',
                                'complete': 'bg-green-50 text-green-600 hover:bg-green-100'
                              }[getRecordStatus(candidateRecords?.find(
                                r => parseInt(r.candidate_id) === parseInt(attendee.attendee_id)
                              ))]
                            } rounded-md`}
                            title={
                              getRecordStatus(candidateRecords?.find(
                                r => parseInt(r.candidate_id) === parseInt(attendee.attendee_id)
                              )) === 'complete' 
                                ? 'All checks complete'
                                : `Missing: ${getMissingChecks(candidateRecords?.find(
                                    r => parseInt(r.candidate_id) === parseInt(attendee.attendee_id)
                                  )).join(', ')}`
                            }
                          >
                            Extra Info/Checks
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold">Advisers</h3>
                <div className="flex gap-2 relative">
                  <div className="relative">
                    {panel.panel_type === 'Panel' ? (
                      <>
                        <button
                          onClick={() => setShowAdviserEmailMenu(!showAdviserEmailMenu)}
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 px-3 py-1 border rounded-md"
                        >
                          <Mail className="w-4 h-4" />
                          Send Email
                        </button>
                        
                        {showAdviserEmailMenu && (
                          <div className="absolute right-0 mt-1 w-48 bg-white border rounded-md shadow-lg z-10">
                            <button
                              onClick={() => {
                                if (!panel?.panel_date) return;
                                window.location.href = generateAdviserEmail1(
                                  attendees.filter(a => a.attendee_type === 'A'),
                                  panel.panel_date,
                                  panel.panel_name,
                                  panel.venue_name
                                );
                                setShowAdviserEmailMenu(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                            >
                              Initial Information
                            </button>
                            <button
                              onClick={() => {
                                if (!panel?.panel_date || !panel?.venue_name) {
                                  console.error('Missing required panel data');
                                  return;
                                }
                                window.location.href = generateAdviserEmail2(
                                  attendees.filter(a => a.attendee_type === 'A'),
                                  panel.panel_date,
                                  panel.panel_name,
                                  panel.venue_name,
                                  subjects
                                );
                                setShowAdviserEmailMenu(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                            >
                              Additional Information
                            </button>
                            <button
                              onClick={() => {
                                if (!panel?.panel_date) return;
                                window.location.href = generateAdviserEmail3(
                                  attendees,
                                  panel.panel_date,
                                  panel.panel_name
                                );
                                setShowAdviserEmailMenu(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                            >
                              Final Information
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          if (!panel?.panel_date) return;
                          window.location.href = generateCarouselAdviserEmail(
                            attendees.filter(a => a.attendee_type === 'A'),
                            panel.panel_date,
                            panel.panel_name,
                            secretary
                          );
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 px-3 py-1 border rounded-md"
                      >
                        <Mail className="w-4 h-4" />
                        Send Email
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      const emails = attendees
                        .filter((a: { attendee_type: string; email: string }) => 
                          a.attendee_type === 'A' && a.email
                        )
                        .map((a: { email: string }) => a.email)
                        .join(', ');
                      navigator.clipboard.writeText(emails);
                    }}
                    className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1 px-3 py-1 border rounded-md"
                  >
                    <Mail className="w-4 h-4" />
                    Copy Emails
                  </button>
                </div>
              </div>
              {Object.entries(groupAttendeesByTeam(attendees, 'A')).map(([team, teamAttendees]) => (
                <div key={team} className="mb-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">{team}</h4>
                  <ul className="space-y-2">
                    {teamAttendees.map((attendee) => (
                      <li key={attendee.id} className="text-gray-700">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span>{attendee.attendee_name}</span>
                              {getAdviserDesignation(attendee) && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {getAdviserDesignation(attendee)}
                                </span>
                              )}
                              {attendee.previous_panels_count !== null && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                  <span className="mr-1 font-bold">{attendee.previous_panels_count}</span>
                                  <span>previous {panel.panel_type.toLowerCase()}{attendee.previous_panels_count === 1 ? '' : 's'}</span>
                                </span>
                              )}
                            </div>
                            {attendee.email && (
                              <div className="text-sm text-gray-500">
                                <Mail size={14} className="inline mr-1" />
                                <a href={`mailto:${attendee.email}`} className="hover:text-blue-600">
                                  {attendee.email}
                                </a>
                              </div>
                            )}
                          </div>
                          {/* Only show preferences for Panel type */}
                          {panel.panel_type === 'Panel' && (
                            <div className="flex flex-col gap-2 ml-4">
                              <label className="flex items-center text-sm">
                                <input
                                  type="checkbox"
                                  className="rounded border-gray-300 text-blue-600 mr-2"
                                  checked={adviserPreferences?.[attendee.attendee_id]?.arrive_night_before || false}
                                  onChange={(e) => updatePreference.mutate({
                                    adviserId: parseInt(attendee.attendee_id),
                                    arriveNightBefore: e.target.checked,
                                    eveningMeal: adviserPreferences?.[attendee.attendee_id]?.evening_meal || false,
                                    arrivalTime: adviserPreferences?.[attendee.attendee_id]?.arrival_time || null,
                                  })}
                                />
                                Night Before
                              </label>
                              <label className="flex items-center text-sm">
                                <input
                                  type="checkbox"
                                  className="rounded border-gray-300 text-blue-600 mr-2"
                                  checked={adviserPreferences?.[attendee.attendee_id]?.evening_meal || false}
                                  onChange={(e) => updatePreference.mutate({
                                    adviserId: parseInt(attendee.attendee_id),
                                    arriveNightBefore: adviserPreferences?.[attendee.attendee_id]?.arrive_night_before || false,
                                    eveningMeal: e.target.checked,
                                    arrivalTime: adviserPreferences?.[attendee.attendee_id]?.arrival_time || null,
                                  })}
                                />
                                Evening Meal
                              </label>
                              <div className="flex items-center text-sm">
                                <span className="mr-2">Arrival:</span>
                                <input
                                  type="time"
                                  className="border rounded px-2 py-1"
                                  value={adviserPreferences?.[attendee.attendee_id]?.arrival_time || ''}
                                  onChange={(e) => updatePreference.mutate({
                                    adviserId: parseInt(attendee.attendee_id),
                                    arriveNightBefore: adviserPreferences?.[attendee.attendee_id]?.arrive_night_before || false,
                                    eveningMeal: adviserPreferences?.[attendee.attendee_id]?.evening_meal || false,
                                    arrivalTime: e.target.value,
                                  })}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <PanelTasks 
        tasks={tasks} 
        panelId={id!} 
        panelType={panel.panel_type} 
      />

      {/* Conditionally render Candidate Scoring section */}
      {panel.panel_type === 'Panel' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setIsScoringExpanded(!isScoringExpanded)}
          >
            <h2 className="text-xl font-bold">Candidate Scoring</h2>
            <button className="p-1 hover:bg-gray-100 rounded">
              {isScoringExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>

          {isScoringExpanded && (
            <div className="mt-4 grid grid-cols-2 gap-8">
              {['A', 'B'].map((team) => (
                <div key={team}>
                  <h3 className="text-lg font-semibold mb-4">Team {team}</h3>
                  <div className="space-y-8">
                    {attendees
                      .filter((a: any) => a.attendee_type === 'C' && a.attendee_team === team)
                      .map((candidate: any) => (
                        <div key={candidate.id} className="bg-white rounded-lg">
                          <h4 className="text-lg font-medium mb-3">{candidate.attendee_name}</h4>
                          <table className="min-w-full">
                            <thead>
                              <tr>
                                <th className="text-left text-gray-500 uppercase text-sm w-32">Subject</th>
                                <th className="text-left text-gray-500 uppercase text-sm w-48">Adviser</th>
                                <th className="text-left text-gray-500 uppercase text-sm">Score</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {Array.isArray(subjects) && 
                                [...subjects]
                                  .sort((a, b) => a.id - b.id)
                                  .map((subject: any) => {
                                    const matchingAdvisers = attendees.filter((adviser: any) => {
                                      const adviserDesignation = getAdviserDesignation(adviser);
                                      return (
                                        adviser.attendee_type === 'A' &&
                                        adviser.attendee_team === candidate.attendee_team &&
                                        adviserDesignation === subject.designation
                                      );
                                    });

                                    if (matchingAdvisers.length === 0) return null;

                                    return matchingAdvisers.map((adviser: any) => {
                                      const currentScore = getScore(
                                        parseInt(adviser.attendee_id),
                                        parseInt(candidate.attendee_id),
                                        subject.id
                                      );

                                      return (
                                        <tr key={`${subject.id}-${adviser.id}`} className="hover:bg-gray-50">
                                          <td className="py-2">
                                            <div className="font-medium text-sm text-gray-600">
                                              {subject.name}
                                            </div>
                                          </td>
                                          <td className="py-2">
                                            <div className="text-sm text-gray-500">
                                              {adviser.attendee_name}
                                            </div>
                                          </td>
                                          <td className="py-2">
                                            <div className="flex gap-1">
                                              {[1, 2, 3, 4, 5, 6].map((score) => (
                                                <button
                                                  key={score}
                                                  onClick={() => {
                                                    scoreMutation.mutate({
                                                      adviserId: adviser.attendee_id,
                                                      candidateId: candidate.attendee_id,
                                                      subjectId: subject.id,
                                                      score,
                                                    });
                                                  }}
                                                  className={`w-6 h-6 text-sm rounded border flex items-center justify-center
                                                    hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500
                                                    ${currentScore === score 
                                                      ? 'bg-blue-100 border-blue-500 text-blue-800' 
                                                      : ''
                                                    }`}
                                                >
                                                  {score}
                                                </button>
                                              ))}
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    });
                                  })}
                            </tbody>
                          </table>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {panel.panel_type === 'Panel' && <PanelDDOMeetings panelId={id!} />}

      {/* Worship Schedule Section */}
      {panel.panel_type === 'Panel' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div 
            className="flex items-center justify-between cursor-pointer mb-4"
            onClick={() => setIsWorshipExpanded(!isWorshipExpanded)}
          >
            <h2 className="text-xl font-bold">Worship Schedule</h2>
            <button className="p-1 hover:bg-gray-100 rounded">
              {isWorshipExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>

          {isWorshipExpanded && (
            <div className="overflow-x-auto">
              <div className="mb-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700">
                    Season:
                    <select
                      className="ml-2 border rounded px-2 py-1"
                      value={worshipSchedule.season}
                      onChange={(e) => handleWorshipScheduleChange(-1, 'season', e.target.value)}
                    >
                      <option value="Ordinary">Ordinary</option>
                      <option value="Advent">Advent</option>
                      <option value="Christmas">Christmas</option>
                      <option value="Epiphany">Epiphany</option>
                      <option value="Lent">Lent</option>
                      <option value="Easter">Easter</option>
                      <option value="Pentecost">Pentecost</option>
                    </select>
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCopyScheduleModal(true)}
                    className="px-3 py-1 bg-gray-50 text-gray-600 rounded hover:bg-gray-100 flex items-center gap-1"
                  >
                    Copy from Panel
                  </button>
                  <button
                    onClick={handleAddService}
                    className="px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 flex items-center gap-1"
                  >
                    <Plus size={16} /> Add Service
                  </button>
                </div>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-2 py-1 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Day</th>
                    <th className="px-2 py-1 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Time/Service</th>
                    <th className="px-2 py-1 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Leading</th>
                    <th className="px-2 py-1 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">1st Reader</th>
                    <th className="px-2 py-1 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">2nd Reader</th>
                    <th className="px-2 py-1 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Prayers</th>
                    <th className="px-2 py-1 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Homily</th>
                    <th className="px-2 py-1 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">1st Reading</th>
                    <th className="px-2 py-1 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">2nd Reading</th>
                    <th className="px-2 py-1 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {worshipSchedule.services.map((service, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-2 py-1">
                        <select
                          className="w-13 text-[8px] border rounded px-1 py-0.5"
                          value={service.day}
                          onChange={(e) => handleWorshipScheduleChange(index, 'day', e.target.value)}
                        >
                          <option value="Day 1">Day 1</option>
                          <option value="Day 2">Day 2</option>
                          <option value="Day 3">Day 3</option>
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <div className="flex gap-1">
                          <input
                            type="text"
                            className="w-9 text-[8px] border rounded px-1 py-0.5"
                            value={service.time}
                            onChange={(e) => handleWorshipScheduleChange(index, 'time', e.target.value)}
                          />
                          <input
                            type="text"
                            className="w-17 text-[8px] border rounded px-1 py-0.5"
                            value={service.service_type}
                            onChange={(e) => handleWorshipScheduleChange(index, 'service_type', e.target.value)}
                          />
                        </div>
                      </td>
                      <td className="px-2 py-1">
                        <select
                          className="w-full text-[8px] border rounded px-1 py-0.5"
                          value={service.leading}
                          onChange={(e) => handleWorshipScheduleChange(index, 'leading', e.target.value)}
                        >
                          <option value="Panel Sec.">Panel Secretary</option>
                          {attendees
                            .filter((a: any) => a.attendee_type === 'A')
                            .map((adviser: any) => (
                              <option key={adviser.id} value={adviser.attendee_name}>
                                {adviser.attendee_name}
                              </option>
                            ))}
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <select
                          className="w-full text-[8px] border rounded px-1 py-0.5"
                          value={service.first_reader}
                          onChange={(e) => handleWorshipScheduleChange(index, 'first_reader', e.target.value)}
                        >
                          <option value="">n/a</option>
                          {attendees
                            .filter((a: any) => a.attendee_type === 'A')
                            .map((adviser: any) => (
                              <option key={adviser.id} value={adviser.attendee_name}>
                                {adviser.attendee_name}
                              </option>
                            ))}
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <select
                          className="w-full text-[8px] border rounded px-1 py-0.5"
                          value={service.second_reader}
                          onChange={(e) => handleWorshipScheduleChange(index, 'second_reader', e.target.value)}
                        >
                          <option value="">n/a</option>
                          {attendees
                            .filter((a: any) => a.attendee_type === 'A')
                            .map((adviser: any) => (
                              <option key={adviser.id} value={adviser.attendee_name}>
                                {adviser.attendee_name}
                              </option>
                            ))}
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <select
                          className="w-full text-[8px] border rounded px-1 py-0.5"
                          value={service.prayers}
                          onChange={(e) => handleWorshipScheduleChange(index, 'prayers', e.target.value)}
                        >
                          <option value="">n/a</option>
                          {attendees
                            .filter((a: any) => a.attendee_type === 'A')
                            .map((adviser: any) => (
                              <option key={adviser.id} value={adviser.attendee_name}>
                                {adviser.attendee_name}
                              </option>
                            ))}
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <select
                          className="w-full text-[8px] border rounded px-1 py-0.5"
                          value={service.homily}
                          onChange={(e) => handleWorshipScheduleChange(index, 'homily', e.target.value)}
                        >
                          <option value="">n/a</option>
                          <option value="Panel Sec.">Panel Secretary</option>
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          className="w-full text-[8px] border rounded px-1 py-0.5"
                          value={service.first_reading}
                          placeholder="e.g. Matt 5"
                          onChange={(e) => handleWorshipScheduleChange(index, 'first_reading', e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          className="w-full text-[8px] border rounded px-1 py-0.5"
                          value={service.second_reading}
                          placeholder="e.g. Luke 5"
                          onChange={(e) => handleWorshipScheduleChange(index, 'second_reading', e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <button
                          onClick={() => handleRemoveService(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showCopyScheduleModal && (
        <CopyWorshipScheduleModal
          currentPanelId={id!}
          onClose={() => setShowCopyScheduleModal(false)}
          onCopy={(sourceId) => copyWorshipSchedule.mutate(sourceId)}
        />
      )}

      {showPrintingChecklist && (
        <PrintingChecklistModal
          panelId={id!}
          onClose={() => setShowPrintingChecklist(false)}
        />
      )}

      {showCandidateSummary && (
        <CandidateSummaryModal
          isOpen={showCandidateSummary}
          onClose={() => setShowCandidateSummary(false)}
          candidates={attendees
            .filter(a => a.attendee_type === 'C')
            .map(candidate => {
              const record = candidateRecords?.find(
                r => parseInt(r.candidate_id) === parseInt(candidate.attendee_id)
              );
              return {
                attendee_name: candidate.attendee_name,
                notes: record?.notes || '',
                disabilities: record?.disabilities || ''
              };
            })}
        />
      )}
  

    </div>
  );
}