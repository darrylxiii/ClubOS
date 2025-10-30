import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

async function refreshGoogleToken(refreshToken: string, clientId: string, clientSecret: string): Promise<GoogleTokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Token refresh failed:', error);
    throw new Error('Failed to refresh Google token');
  }

  return await response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, connectionId, event, timeMin, timeMax, calendars } = await req.json();

    console.log('Google Calendar request:', { action, connectionId, timeMin, timeMax });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!connectionId) {
      return new Response(
        JSON.stringify({ error: 'Connection ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get calendar connection from database
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

    let accessToken = connection.access_token;
    const tokenExpiresAt = new Date(connection.token_expires_at);
    const now = new Date();

    // Check if token is expired or will expire in the next 5 minutes
    const expiryBuffer = 5 * 60 * 1000; // 5 minutes in milliseconds
    if (tokenExpiresAt.getTime() - now.getTime() < expiryBuffer) {
      console.log('Token expired or expiring soon, refreshing...');

      // Get Google OAuth credentials from environment
      const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
      const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

      if (!googleClientId || !googleClientSecret) {
        console.error('Google OAuth credentials not configured');
        return new Response(
          JSON.stringify({ 
            error: 'token_expired',
            message: 'Calendar connection expired. Please reconnect your Google Calendar in Settings.'
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        // Refresh the token
        const tokenResponse = await refreshGoogleToken(
          connection.refresh_token,
          googleClientId,
          googleClientSecret
        );

        accessToken = tokenResponse.access_token;
        const newExpiresAt = new Date(now.getTime() + tokenResponse.expires_in * 1000);

        // Update the database with new token
        const { error: updateError } = await supabase
          .from('calendar_connections')
          .update({
            access_token: accessToken,
            token_expires_at: newExpiresAt.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq('id', connectionId);

        if (updateError) {
          console.error('Failed to update token:', updateError);
        } else {
          console.log('Token refreshed successfully');
        }
      } catch (refreshError) {
        console.error('Token refresh error:', refreshError);
        return new Response(
          JSON.stringify({ 
            error: 'token_refresh_failed',
            message: 'Failed to refresh calendar connection. Please reconnect your Google Calendar in Settings.'
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    if (action === 'createEvent') {
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

      busySlots.sort((a, b) => 
        new Date(a.start).getTime() - new Date(b.start).getTime()
      );

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
      const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
      url.searchParams.append('timeMin', timeMin || new Date().toISOString());
      if (timeMax) {
        url.searchParams.append('timeMax', timeMax);
      }
      url.searchParams.append('maxResults', '100');
      url.searchParams.append('singleEvents', 'true');
      url.searchParams.append('orderBy', 'startTime');

      const response = await fetch(url.toString(), { headers });

      if (!response.ok) {
        const error = await response.text();
        console.error('Failed to list events:', error);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to retrieve calendar events',
            details: error 
          }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      return new Response(
        JSON.stringify({ events: data.items || [] }),
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
