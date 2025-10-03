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
    const { accessToken, timeMin, timeMax } = await req.json();

    if (!accessToken) {
      throw new Error('Access token is required');
    }

    // Get events from Microsoft Graph API
    const startDateTime = new Date(timeMin).toISOString();
    const endDateTime = new Date(timeMax).toISOString();
    
    const url = `https://graph.microsoft.com/v1.0/me/calendarview?` +
      `startDateTime=${encodeURIComponent(startDateTime)}` +
      `&endDateTime=${encodeURIComponent(endDateTime)}` +
      `&$select=subject,start,end,location,isAllDay` +
      `&$orderby=start/dateTime`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
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
