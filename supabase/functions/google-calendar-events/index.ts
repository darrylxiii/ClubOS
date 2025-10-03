import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, accessToken, event, timeMin, timeMax, calendars } = await req.json();

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'Access token required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    if (action === 'createEvent') {
      // Create a calendar event
      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers,
          body: JSON.stringify(event),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('Failed to create event:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to create calendar event' }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const createdEvent = await response.json();
      return new Response(
        JSON.stringify({ event: createdEvent }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'findFreeSlots') {
      // Find available time slots across calendars
      const calendarIds = calendars || ['primary'];
      
      const freeBusyQuery = {
        timeMin,
        timeMax,
        items: calendarIds.map((id: string) => ({ id })),
      };

      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/freeBusy',
        {
          method: 'POST',
          headers,
          body: JSON.stringify(freeBusyQuery),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('Failed to query free/busy:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to find available slots' }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const freeBusyData = await response.json();
      
      // Process busy times to find free slots
      interface BusySlot {
        start: string;
        end: string;
      }
      
      const busySlots: BusySlot[] = [];
      Object.values(freeBusyData.calendars || {}).forEach((calendar: any) => {
        if (calendar.busy) {
          busySlots.push(...calendar.busy);
        }
      });

      // Sort busy slots
      busySlots.sort((a, b) => 
        new Date(a.start).getTime() - new Date(b.start).getTime()
      );

      // Calculate free slots (simplified - assumes working hours 9-5)
      const freeSlots: BusySlot[] = [];
      const startTime = new Date(timeMin);
      const endTime = new Date(timeMax);
      
      let currentTime = startTime;
      
      for (const busy of busySlots) {
        const busyStart = new Date(busy.start);
        const busyEnd = new Date(busy.end);
        
        if (currentTime < busyStart) {
          freeSlots.push({
            start: currentTime.toISOString(),
            end: busyStart.toISOString(),
          });
        }
        
        if (busyEnd > currentTime) {
          currentTime = busyEnd;
        }
      }
      
      // Add final free slot if there's time left
      if (currentTime < endTime) {
        freeSlots.push({
          start: currentTime.toISOString(),
          end: endTime.toISOString(),
        });
      }

      return new Response(
        JSON.stringify({ freeSlots, busySlots }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'listEvents') {
      // List upcoming events
      const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
      url.searchParams.append('timeMin', timeMin || new Date().toISOString());
      url.searchParams.append('maxResults', '10');
      url.searchParams.append('singleEvents', 'true');
      url.searchParams.append('orderBy', 'startTime');

      const response = await fetch(url.toString(), { headers });

      if (!response.ok) {
        const error = await response.text();
        console.error('Failed to list events:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to retrieve calendar events' }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const events = await response.json();
      return new Response(
        JSON.stringify({ events: events.items || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Google Calendar events error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});