import { supabase } from "@/integrations/supabase/client";
import { UnifiedCalendarEvent } from "@/types/calendar";

// Debounce map to prevent excessive detection calls
const detectionDebounce = new Map<string, number>();
const DETECTION_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

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

  // Auto-trigger interview detection (debounced)
  const now = Date.now();
  const lastDetection = detectionDebounce.get(userId) || 0;
  
  if (now - lastDetection > DETECTION_COOLDOWN_MS) {
    detectionDebounce.set(userId, now);
    
    // Trigger detection in background (don't await to avoid blocking calendar load)
    triggerInterviewDetection(userId, startDate, endDate).catch(error => {
      console.error('Background interview detection failed:', error);
    });
  }

  // Sort by start time
  return allEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
}

async function triggerInterviewDetection(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<void> {
  try {
    console.log('Auto-triggering interview detection for user:', userId);
    
    const { data, error } = await supabase.functions.invoke('detect-calendar-interviews', {
      body: {
        userId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });

    if (error) {
      console.error('Interview detection error:', error);
    } else {
      console.log('Interview detection completed:', data);
    }
  } catch (error) {
    console.error('Failed to invoke interview detection:', error);
  }
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

      const events = data.events.map((event: Record<string, any>) => ({
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

      const events = data.events.map((event: Record<string, any>) => ({
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

// Two-way sync: Push TQC meeting to external calendar
export async function syncMeetingToExternalCalendar(
  meetingId: string,
  userId: string,
  action: 'create' | 'update' | 'delete' = 'create'
): Promise<{ success: boolean; externalEventId?: string; error?: string }> {
  try {
    // Get meeting details
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .single();

    if (meetingError || !meeting) {
      return { success: false, error: 'Meeting not found' };
    }

    // Get user's calendar connections
    const connections = await getCalendarConnections(userId);
    if (connections.length === 0) {
      return { success: true }; // No calendars to sync to
    }

    const syncedTo: string[] = [];
    let externalEventId: string | undefined;

    for (const connection of connections) {
      try {
        const functionName = connection.provider === 'google' 
          ? 'google-calendar-events' 
          : 'microsoft-calendar-events';
        const provider = connection.provider as 'google' | 'microsoft';

        if (action === 'delete' && meeting.external_calendar_event_id) {
          // Delete from external calendar
          await supabase.functions.invoke(functionName, {
            body: {
              action: 'deleteEvent',
              connectionId: connection.id,
              eventId: meeting.external_calendar_event_id,
            },
          });
          syncedTo.push(provider);
        } else if (action === 'update' && meeting.external_calendar_event_id) {
          // Update in external calendar
          const event = formatMeetingForExternalCalendar(meeting, provider);
          const { data } = await supabase.functions.invoke(functionName, {
            body: {
              action: 'updateEvent',
              connectionId: connection.id,
              eventId: meeting.external_calendar_event_id,
              event,
            },
          });
          if (data?.event?.id) {
            externalEventId = data.event.id;
            syncedTo.push(provider);
          }
        } else if (action === 'create') {
          // Create in external calendar
          const event = formatMeetingForExternalCalendar(meeting, provider);
          const { data } = await supabase.functions.invoke(functionName, {
            body: {
              action: 'createEvent',
              connectionId: connection.id,
              event,
            },
          });
          if (data?.event?.id) {
            externalEventId = data.event.id;
            syncedTo.push(provider);
          }
        }
      } catch (err) {
        console.error(`Failed to sync to ${connection.provider}:`, err);
      }
    }

    // Update meeting with sync status
    if (syncedTo.length > 0) {
      await supabase
        .from('meetings')
        .update({
          external_calendar_event_id: externalEventId,
          synced_to_calendars: syncedTo,
        })
        .eq('id', meetingId);
    }

    return { success: true, externalEventId };
  } catch (error) {
    console.error('Calendar sync error:', error);
    return { success: false, error: 'Failed to sync to calendar' };
  }
}

function formatMeetingForExternalCalendar(
  meeting: any,
  provider: 'google' | 'microsoft'
): any {
  const meetingUrl = `${window.location.origin}/meetings/${meeting.id}`;
  
  if (provider === 'google') {
    return {
      summary: meeting.title,
      description: `${meeting.description || ''}\n\nJoin TQC Meeting: ${meetingUrl}`,
      start: {
        dateTime: meeting.scheduled_start,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: meeting.scheduled_end,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      conferenceData: {
        entryPoints: [{
          entryPointType: 'video',
          uri: meetingUrl,
          label: 'Join TQC Meeting',
        }],
      },
    };
  } else {
    // Microsoft format
    return {
      subject: meeting.title,
      body: {
        contentType: 'HTML',
        content: `${meeting.description || ''}<br><br><a href="${meetingUrl}">Join TQC Meeting</a>`,
      },
      start: {
        dateTime: meeting.scheduled_start,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: meeting.scheduled_end,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      isOnlineMeeting: true,
      onlineMeetingUrl: meetingUrl,
    };
  }
}
