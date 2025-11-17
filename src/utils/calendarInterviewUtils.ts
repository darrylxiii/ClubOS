import { UnifiedCalendarEvent } from "@/types/calendar";

export interface DetectedInterview {
  id: string;
  calendar_event_id: string;
  calendar_provider: string;
  event_title: string;
  scheduled_start: string;
  scheduled_end: string;
  meeting_link?: string;
  location?: string;
  detection_confidence?: string;
  interview_type?: string;
  detected_candidates: any;
  detected_partners: any;
  detected_tqc_members: any;
  unknown_attendees: any;
  status: string;
  job_id?: string;
  application_id?: string;
  candidate_id?: string;
  application?: any;
}

export interface CalendarEventWithDetection extends UnifiedCalendarEvent {
  detectedInterview?: DetectedInterview;
  isLinked: boolean;
  hasMultipleAttendees: boolean;
  hasVideoLink: boolean;
}

export function formatInterviewType(type: string): string {
  const types: Record<string, string> = {
    'tqc_intro': 'TQC Introduction',
    'partner_interview': 'Partner Interview',
    'panel_interview': 'Panel Interview',
    'unknown': 'Unknown Type'
  };
  return types[type] || type;
}

export function getConfidenceBadgeVariant(confidence: string): "default" | "secondary" | "outline" {
  switch (confidence) {
    case 'high':
      return 'default';
    case 'medium':
      return 'secondary';
    case 'low':
      return 'outline';
    default:
      return 'outline';
  }
}

export function getStatusBadgeVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case 'confirmed':
      return 'default';
    case 'pending_review':
      return 'secondary';
    case 'dismissed':
      return 'outline';
    case 'linked_to_booking':
      return 'default';
    default:
      return 'outline';
  }
}

export function enrichCalendarEventWithDetection(
  event: UnifiedCalendarEvent,
  detectedInterviews: DetectedInterview[]
): CalendarEventWithDetection {
  const detection = detectedInterviews.find(
    d => d.calendar_event_id === event.id.replace('google-', '').replace('microsoft-', '')
  );

  return {
    ...event,
    detectedInterview: detection,
    isLinked: !!detection && detection.status !== 'dismissed',
    hasMultipleAttendees: (event.attendees?.length || 0) > 1,
    hasVideoLink: !!(event.location?.includes('meet.google.com') || 
                     event.location?.includes('zoom.us') || 
                     event.location?.includes('teams.microsoft.com'))
  };
}

export function getInterviewSourceBadge(source: 'booking' | 'detected' | 'quantum_club'): {
  label: string;
  variant: "default" | "secondary" | "outline";
  icon: string;
} {
  switch (source) {
    case 'booking':
      return { label: 'Confirmed Booking', variant: 'default', icon: '🟢' };
    case 'detected':
      return { label: 'From Calendar', variant: 'secondary', icon: '🟡' };
    case 'quantum_club':
      return { label: 'Quantum Club Meeting', variant: 'outline', icon: '🔵' };
    default:
      return { label: 'Unknown', variant: 'outline', icon: '⚪' };
  }
}

export function extractCandidateEmailFromEvent(
  event: UnifiedCalendarEvent,
  applications: any[]
): string | null {
  if (!event.attendees || event.attendees.length === 0) return null;

  // Match attendee emails with candidate emails in applications
  for (const attendee of event.attendees) {
    const matchedApp = applications.find(
      app => app.email?.toLowerCase() === attendee.toLowerCase()
    );
    if (matchedApp) return attendee;
  }

  return null;
}

export function suggestCandidateFromEvent(
  event: UnifiedCalendarEvent,
  applications: any[]
): { applicationId: string; candidateName: string; confidence: 'high' | 'medium' | 'low' } | null {
  // Try email match first (highest confidence)
  const emailMatch = extractCandidateEmailFromEvent(event, applications);
  if (emailMatch) {
    const app = applications.find(
      app => app.email?.toLowerCase() === emailMatch.toLowerCase()
    );
    if (app) {
      return {
        applicationId: app.id,
        candidateName: app.full_name || app.email || 'Unknown',
        confidence: 'high'
      };
    }
  }

  // Try name match in title (medium confidence)
  const titleLower = event.title.toLowerCase();
  for (const app of applications) {
    const name = app.full_name?.toLowerCase();
    if (name && titleLower.includes(name)) {
      return {
        applicationId: app.id,
        candidateName: app.full_name || app.email || 'Unknown',
        confidence: 'medium'
      };
    }

    // Also try first name + last name separately
    const names = name?.split(' ');
    if (names && names.length >= 2) {
      const firstName = names[0];
      const lastName = names[names.length - 1];
      if (titleLower.includes(firstName) && titleLower.includes(lastName)) {
        return {
          applicationId: app.id,
          candidateName: app.full_name || app.email || 'Unknown',
          confidence: 'medium'
        };
      }
    }
  }

  return null;
}
