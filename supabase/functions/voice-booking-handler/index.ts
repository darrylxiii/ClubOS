/**
 * Voice Booking Handler Edge Function
 * 
 * Handles voice-based booking interactions via ElevenLabs.
 * Processes voice transcripts and manages booking flow.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VoiceRequest {
  session_id: string;
  action: 'start' | 'process' | 'confirm' | 'end';
  transcript?: string;
  booking_link_slug?: string;
  user_timezone?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      session_id,
      action,
      transcript,
      booking_link_slug,
      user_timezone = 'Europe/Amsterdam'
    }: VoiceRequest = await req.json();

    if (!session_id) {
      return new Response(
        JSON.stringify({ error: 'session_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[voice-booking] Processing:', { session_id, action });

    switch (action) {
      case 'start':
        return handleStart(supabase, session_id, booking_link_slug);
      
      case 'process':
        return handleProcess(supabase, lovableKey, session_id, transcript || '', user_timezone);
      
      case 'confirm':
        return handleConfirm(supabase, session_id);
      
      case 'end':
        return handleEnd(supabase, session_id);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('[voice-booking] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleStart(supabase: any, sessionId: string, bookingLinkSlug?: string) {
  // Get booking link info if provided
  let bookingLink = null;
  let hostName = 'our team';

  if (bookingLinkSlug) {
    const { data } = await supabase
      .from('booking_links')
      .select('*, profiles:owner_id(full_name)')
      .eq('slug', bookingLinkSlug)
      .eq('is_active', true)
      .single();
    
    bookingLink = data;
    hostName = data?.profiles?.full_name || 'our team';
  }

  // Create or update session
  const { data: session, error } = await supabase
    .from('voice_booking_sessions')
    .upsert({
      session_id: sessionId,
      booking_link_id: bookingLink?.id,
      status: 'active',
      transcript: [],
      extracted_intent: {},
      started_at: new Date().toISOString()
    }, { onConflict: 'session_id' })
    .select()
    .single();

  if (error) {
    throw error;
  }

  const greeting = `Hello! Welcome to The Quantum Club. I'm here to help you schedule a meeting with ${hostName}. What day and time works best for you?`;

  return new Response(
    JSON.stringify({
      success: true,
      session_id: sessionId,
      response_text: greeting,
      next_action: 'process'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleProcess(
  supabase: any, 
  lovableKey: string, 
  sessionId: string, 
  userTranscript: string,
  userTimezone: string
) {
  // Get current session
  const { data: session, error: sessionError } = await supabase
    .from('voice_booking_sessions')
    .select('*, booking_links(*, profiles:owner_id(full_name))')
    .eq('session_id', sessionId)
    .single();

  if (sessionError || !session) {
    return new Response(
      JSON.stringify({ error: 'Session not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Update transcript history
  const transcriptHistory = session.transcript || [];
  transcriptHistory.push({ role: 'user', content: userTranscript, timestamp: new Date().toISOString() });

  // Get available slots for context
  let availableSlotsText = '';
  if (session.booking_link_id) {
    const slotsResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/get-available-slots`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        booking_link_id: session.booking_link_id,
        timezone: userTimezone,
        days_ahead: 7
      })
    });

    if (slotsResponse.ok) {
      const slotsData = await slotsResponse.json();
      if (slotsData.slots?.length > 0) {
        availableSlotsText = slotsData.slots.slice(0, 10).map((slot: any) => {
          const date = new Date(slot.start);
          return date.toLocaleString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          });
        }).join(', ');
      }
    }
  }

  // Use AI to understand intent and generate response
  const systemPrompt = `You are QUIN, a voice booking assistant for The Quantum Club.
You're helping someone book a meeting with ${session.booking_links?.profiles?.full_name || 'our team'}.

Available time slots: ${availableSlotsText || 'Various times available'}

Your tasks:
1. Extract booking intent (date, time, name, email if mentioned)
2. Confirm details before booking
3. Be conversational and natural

Conversation so far:
${transcriptHistory.map((t: any) => `${t.role}: ${t.content}`).join('\n')}

Respond with JSON:
{
  "response_text": "Your spoken response",
  "extracted_data": {
    "date": "YYYY-MM-DD or null",
    "time": "HH:MM or null",
    "name": "string or null",
    "email": "string or null"
  },
  "ready_to_confirm": boolean,
  "needs_info": ["date", "time", "name", "email"] // what's still missing
}`;

  const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userTranscript }
      ],
      response_format: { type: 'json_object' }
    }),
  });

  if (!aiResponse.ok) {
    throw new Error('AI processing failed');
  }

  const aiResult = await aiResponse.json();
  const parsed = JSON.parse(aiResult.choices?.[0]?.message?.content || '{}');

  // Update session with extracted intent
  const currentIntent = session.extracted_intent || {};
  const updatedIntent = {
    ...currentIntent,
    ...Object.fromEntries(
      Object.entries(parsed.extracted_data || {}).filter(([_, v]) => v !== null)
    )
  };

  transcriptHistory.push({ 
    role: 'assistant', 
    content: parsed.response_text, 
    timestamp: new Date().toISOString() 
  });

  await supabase
    .from('voice_booking_sessions')
    .update({
      transcript: transcriptHistory,
      extracted_intent: updatedIntent,
      status: parsed.ready_to_confirm ? 'awaiting_confirmation' : 'active'
    })
    .eq('session_id', sessionId);

  return new Response(
    JSON.stringify({
      success: true,
      response_text: parsed.response_text,
      extracted_data: updatedIntent,
      ready_to_confirm: parsed.ready_to_confirm,
      needs_info: parsed.needs_info || [],
      next_action: parsed.ready_to_confirm ? 'confirm' : 'process'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleConfirm(supabase: any, sessionId: string) {
  const { data: session, error: sessionError } = await supabase
    .from('voice_booking_sessions')
    .select('*, booking_links(*, profiles:owner_id(full_name, email))')
    .eq('session_id', sessionId)
    .single();

  if (sessionError || !session) {
    return new Response(
      JSON.stringify({ error: 'Session not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const intent = session.extracted_intent || {};

  // Validate we have all required info
  if (!intent.date || !intent.time || !intent.name || !intent.email) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Missing required information',
        needs_info: ['date', 'time', 'name', 'email'].filter(k => !intent[k])
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Create the booking
  const scheduledStart = new Date(`${intent.date}T${intent.time}:00`);
  const duration = session.booking_links?.duration_minutes || 30;
  const scheduledEnd = new Date(scheduledStart.getTime() + duration * 60000);

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      booking_link_id: session.booking_link_id,
      guest_name: intent.name,
      guest_email: intent.email,
      scheduled_start: scheduledStart.toISOString(),
      scheduled_end: scheduledEnd.toISOString(),
      status: 'confirmed',
      source: 'voice'
    })
    .select()
    .single();

  if (bookingError) {
    console.error('[voice-booking] Booking failed:', bookingError);
    return new Response(
      JSON.stringify({
        success: false,
        response_text: "I'm sorry, there was an issue creating your booking. Please try again or book online.",
        error: bookingError.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Update session
  await supabase
    .from('voice_booking_sessions')
    .update({
      booking_id: booking.id,
      status: 'completed',
      ended_at: new Date().toISOString()
    })
    .eq('session_id', sessionId);

  const hostName = session.booking_links?.profiles?.full_name || 'our team';
  const confirmationText = `Perfect! Your meeting with ${hostName} is confirmed for ${scheduledStart.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}. You'll receive a confirmation email at ${intent.email} shortly. Have a great day!`;

  return new Response(
    JSON.stringify({
      success: true,
      response_text: confirmationText,
      booking_id: booking.id,
      scheduled_start: scheduledStart.toISOString()
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleEnd(supabase: any, sessionId: string) {
  const { data: session } = await supabase
    .from('voice_booking_sessions')
    .select('started_at')
    .eq('session_id', sessionId)
    .single();

  const durationSeconds = session?.started_at 
    ? Math.round((Date.now() - new Date(session.started_at).getTime()) / 1000)
    : null;

  await supabase
    .from('voice_booking_sessions')
    .update({
      status: 'abandoned',
      ended_at: new Date().toISOString(),
      duration_seconds: durationSeconds
    })
    .eq('session_id', sessionId);

  return new Response(
    JSON.stringify({
      success: true,
      response_text: "Thank you for calling The Quantum Club. Goodbye!",
      session_ended: true
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
