// CRM Activities Types

export type ActivityType = 'call' | 'email' | 'meeting' | 'task' | 'deadline' | 'follow_up' | 'linkedin' | 'note' | 'sms';

export type ActivityOutcome = 
  | 'completed' 
  | 'no_answer' 
  | 'left_voicemail' 
  | 'busy' 
  | 'wrong_number'
  | 'interested' 
  | 'not_interested' 
  | 'callback_requested' 
  | 'meeting_scheduled'
  | 'email_sent' 
  | 'bounced' 
  | 'cancelled' 
  | 'rescheduled' 
  | 'other';

export interface CRMActivity {
  id: string;
  prospect_id: string | null;
  deal_id: string | null;
  company_id: string | null;
  campaign_id: string | null;
  activity_type: ActivityType;
  subject: string;
  description: string | null;
  note: string | null;
  due_date: string | null;
  due_time: string | null;
  duration_minutes: number;
  all_day: boolean;
  is_done: boolean;
  done_at: string | null;
  outcome: ActivityOutcome | null;
  outcome_notes: string | null;
  owner_id: string | null;
  created_by: string | null;
  reminder_at: string | null;
  reminder_sent: boolean;
  linked_booking_id: string | null;
  linked_meeting_id: string | null;
  external_id: string | null;
  priority: number;
  tags: string[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Joined
  owner_name?: string;
  owner_avatar?: string;
  prospect_name?: string;
  prospect_company?: string;
}

export const ACTIVITY_TYPES: { value: ActivityType; label: string; icon: string; color: string }[] = [
  { value: 'call', label: 'Call', icon: 'Phone', color: 'blue' },
  { value: 'email', label: 'Email', icon: 'Mail', color: 'purple' },
  { value: 'meeting', label: 'Meeting', icon: 'Users', color: 'green' },
  { value: 'task', label: 'Task', icon: 'CheckSquare', color: 'orange' },
  { value: 'deadline', label: 'Deadline', icon: 'Clock', color: 'red' },
  { value: 'follow_up', label: 'Follow Up', icon: 'ArrowRight', color: 'cyan' },
  { value: 'linkedin', label: 'LinkedIn', icon: 'Linkedin', color: 'blue' },
  { value: 'note', label: 'Note', icon: 'FileText', color: 'gray' },
  { value: 'sms', label: 'SMS', icon: 'MessageSquare', color: 'emerald' },
];

export const ACTIVITY_OUTCOMES: { value: ActivityOutcome; label: string }[] = [
  { value: 'completed', label: 'Completed' },
  { value: 'no_answer', label: 'No Answer' },
  { value: 'left_voicemail', label: 'Left Voicemail' },
  { value: 'busy', label: 'Busy' },
  { value: 'wrong_number', label: 'Wrong Number' },
  { value: 'interested', label: 'Interested' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'callback_requested', label: 'Callback Requested' },
  { value: 'meeting_scheduled', label: 'Meeting Scheduled' },
  { value: 'email_sent', label: 'Email Sent' },
  { value: 'bounced', label: 'Bounced' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rescheduled', label: 'Rescheduled' },
  { value: 'other', label: 'Other' },
];
