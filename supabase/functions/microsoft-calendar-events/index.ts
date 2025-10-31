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
    const { action, connectionId, accessToken, timeMin, timeMax, event } = await req.json();

    console.log('Microsoft Calendar request:', { action, connectionId, timeMin, timeMax });

    // If connectionId is provided, fetch from database
    let msAccessToken = accessToken;
    if (connectionId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.38.4');
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: connection, error: connectionError } = await supabase
        .from('calendar_connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (connectionError || !connection) {
        console.error('Failed to fetch connection:', connectionError);
        return new Response(
          JSON.stringify({ error: 'Calendar connection not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      msAccessToken = connection.access_token;
    }

    if (!msAccessToken) {
      throw new Error('Access token is required');
    }

    // Handle createEvent action
    if (action === 'createEvent') {
      const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${msAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

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

    // Handle findFreeSlots action for conflict detection
    if (action === 'findFreeSlots') {
      const startDateTime = new Date(timeMin).toISOString();
      const endDateTime = new Date(timeMax).toISOString();
      
      const url = `https://graph.microsoft.com/v1.0/me/calendarview?` +
        `startDateTime=${encodeURIComponent(startDateTime)}` +
        `&endDateTime=${encodeURIComponent(endDateTime)}` +
        `&$select=subject,start,end,isAllDay` +
        `&$orderby=start/dateTime`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${msAccessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Microsoft Graph API error:', data);
        return new Response(
          JSON.stringify({ error: data.error?.message || 'Failed to fetch calendar events' }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Transform to busy slots format
      const busySlots = data.value
        .filter((event: any) => !event.isAllDay)
        .map((event: any) => ({
          start: event.start.dateTime,
          end: event.end.dateTime,
        }));

      console.log(`[MS Calendar] Found ${busySlots.length} busy slots`);

      return new Response(
        JSON.stringify({ busySlots }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle listEvents action (backwards compatibility)
    const startDateTime = new Date(timeMin).toISOString();
    const endDateTime = new Date(timeMax).toISOString();
    
    const url = `https://graph.microsoft.com/v1.0/me/calendarview?` +
      `startDateTime=${encodeURIComponent(startDateTime)}` +
      `&endDateTime=${encodeURIComponent(endDateTime)}` +
      `&$select=subject,start,end,location,isAllDay` +
      `&$orderby=start/dateTime`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${msAccessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Microsoft Graph API error:', data);
      throw new Error(data.error?.message || 'Failed to fetch calendar events');
    }

    // Transform Microsoft events to a common format
    const events = data.value.map((event: any) => ({
      id: event.id,
      summary: event.subject,
      start: event.start.dateTime,
      end: event.end.dateTime,
      location: event.location?.displayName,
      isAllDay: event.isAllDay,
    }));

    return new Response(
      JSON.stringify({ events }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in microsoft-calendar-events:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
