import { supabase } from "@/integrations/supabase/client";
import { UnifiedCalendarEvent } from "@/types/calendar";

export async function fetchUnifiedCalendarEvents(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<UnifiedCalendarEvent[]> {
  const allEvents: UnifiedCalendarEvent[] = [];

  // Fetch Quantum Club meetings
  const qcEvents = await fetchQuantumClubMeetings(userId, startDate, endDate);
  allEvents.push(...qcEvents);

  // Fetch Google Calendar events
  const googleEvents = await fetchGoogleCalendarEvents(userId, startDate, endDate);
  allEvents.push(...googleEvents);

  // Fetch Microsoft Calendar events
  const msEvents = await fetchMicrosoftCalendarEvents(userId, startDate, endDate);
  allEvents.push(...msEvents);

  // Sort by start time
  return allEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
}

async function fetchQuantumClubMeetings(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<UnifiedCalendarEvent[]> {
  const { data: meetings, error } = await supabase
    .from('meetings')
    .select(`
      *,
      meeting_bot_sessions(id, connection_status, joined_at),
      meeting_insights(id, summary)
    `)
    .gte('scheduled_start', startDate.toISOString())
    .lte('scheduled_start', endDate.toISOString())
    .order('scheduled_start', { ascending: true });

  if (error || !meetings) return [];

  return meetings.map(meeting => ({
    id: `qc-${meeting.id}`,
    title: meeting.title,
    start: new Date(meeting.scheduled_start),
    end: new Date(meeting.scheduled_end),
    source: 'quantum_club' as const,
    description: meeting.description,
    location: meeting.meeting_code ? `/meetings/${meeting.id}` : undefined,
    is_quantum_club: true,
    has_club_ai: !!meeting.meeting_bot_sessions?.[0],
    meeting_id: meeting.id,
    bot_session: meeting.meeting_bot_sessions?.[0],
    insights_available: !!meeting.meeting_insights?.[0],
    color: 'hsl(var(--primary))',
  }));
}

async function fetchGoogleCalendarEvents(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<UnifiedCalendarEvent[]> {
  const { data: connections } = await supabase
    .from('calendar_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .eq('is_active', true);

  if (!connections || connections.length === 0) return [];

  const allEvents: UnifiedCalendarEvent[] = [];

  for (const connection of connections) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const { data, error } = await supabase.functions.invoke('google-calendar-events', {
        body: {
          action: 'listEvents',
          connectionId: connection.id,
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (error || !data?.events) {
        console.error('Failed to fetch Google events:', error);
        continue;
      }

      const events = data.events.map((event: any) => ({
        id: `google-${event.id}`,
        title: event.summary || 'Untitled Event',
        start: new Date(event.start.dateTime || event.start.date),
        end: new Date(event.end.dateTime || event.end.date),
        source: 'google' as const,
        provider: 'google',
        calendar_label: connection.label,
        description: event.description,
        location: event.location,
        attendees: event.attendees?.map((a: any) => a.email) || [],
        is_quantum_club: false,
        has_club_ai: false,
        insights_available: false,
        color: '#3B82F6',
      }));

      allEvents.push(...events);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.error('Google calendar sync timed out after 30s');
      } else {
        console.error('Failed to fetch Google calendar events:', err);
      }
    }
  }

  return allEvents;
}

async function fetchMicrosoftCalendarEvents(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<UnifiedCalendarEvent[]> {
  const { data: connections } = await supabase
    .from('calendar_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'microsoft')
    .eq('is_active', true);

  if (!connections || connections.length === 0) return [];

  const allEvents: UnifiedCalendarEvent[] = [];

  for (const connection of connections) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const { data, error } = await supabase.functions.invoke('microsoft-calendar-events', {
        body: {
          connectionId: connection.id,
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (error || !data?.events) {
        console.error('Failed to fetch Microsoft events:', error);
        continue;
      }

      const events = data.events.map((event: any) => ({
        id: `ms-${event.id}`,
        title: event.summary || 'Untitled Event',
        start: new Date(event.start),
        end: new Date(event.end),
        source: 'microsoft' as const,
        provider: 'microsoft',
        calendar_label: connection.label,
        description: event.description,
        location: event.location,
        is_quantum_club: false,
        has_club_ai: false,
        insights_available: false,
        color: '#10B981',
      }));

      allEvents.push(...events);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.error('Microsoft calendar sync timed out after 30s');
      } else {
        console.error('Failed to fetch Microsoft calendar events:', err);
      }
    }
  }

  return allEvents;
}

export async function getCalendarConnections(userId: string) {
  const { data: connections } = await supabase
    .from('calendar_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  return connections || [];
}
