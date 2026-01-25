/**
 * WhatsApp Booking Handler Edge Function
 * 
 * Handles incoming WhatsApp messages and manages booking flow.
 * Supports both EN and NL languages with AI-powered conversation.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppRequest {
  phone_number: string;
  message: string;
  booking_link_slug?: string;
  language?: 'en' | 'nl';
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
      phone_number,
      message,
      booking_link_slug,
      language = 'en'
    }: WhatsAppRequest = await req.json();

    if (!phone_number || !message) {
      return new Response(
        JSON.stringify({ error: 'phone_number and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[whatsapp-booking] Processing message from:', phone_number);

    // Get or create session
    let { data: session } = await supabase
      .from('whatsapp_booking_sessions')
      .select('*, booking_links(*, profiles:owner_id(full_name))')
      .eq('phone_number', phone_number)
      .eq('status', 'active')
      .or('status.eq.awaiting_confirmation')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Check if session expired
    if (session && new Date(session.expires_at) < new Date()) {
      await supabase
        .from('whatsapp_booking_sessions')
        .update({ status: 'expired' })
        .eq('id', session.id);
      session = null;
    }

    // Get booking link if starting new session
    let bookingLink = session?.booking_links;
    if (!session && booking_link_slug) {
      const { data } = await supabase
        .from('booking_links')
        .select('*, profiles:owner_id(full_name)')
        .eq('slug', booking_link_slug)
        .eq('is_active', true)
        .single();
      bookingLink = data;
    }

    // Create new session if needed
    if (!session) {
      const { data: newSession, error } = await supabase
        .from('whatsapp_booking_sessions')
        .insert({
          phone_number,
          booking_link_id: bookingLink?.id,
          conversation_history: [],
          extracted_data: { language },
          status: 'active',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
        .select('*, booking_links(*, profiles:owner_id(full_name))')
        .single();

      if (error) throw error;
      session = newSession;
    }

    // Update conversation history
    const history = session.conversation_history || [];
    history.push({ 
      role: 'user', 
      content: message, 
      timestamp: new Date().toISOString() 
    });

    // Get available slots for context
    let availableSlots: any[] = [];
    if (session.booking_link_id) {
      const slotsResponse = await fetch(`${supabaseUrl}/functions/v1/get-available-slots`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          booking_link_id: session.booking_link_id,
          timezone: 'Europe/Amsterdam',
          days_ahead: 7
        })
      });

      if (slotsResponse.ok) {
        const slotsData = await slotsResponse.json();
        availableSlots = slotsData.slots || [];
      }
    }

    const hostName = bookingLink?.profiles?.full_name || 'our team';
    const currentData = session.extracted_data || {};

    // Check for confirmation intent
    const isConfirmation = /^(yes|ja|confirm|bevestig|ok|okay|sure|yep|yup|yeah)$/i.test(message.trim());
    const isCancellation = /^(no|nee|cancel|annuleer|stop|nevermind)$/i.test(message.trim());

    if (session.status === 'awaiting_confirmation' && isConfirmation) {
      // Create the booking
      return await createBooking(supabase, session, history);
    }

    if (isCancellation) {
      await supabase
        .from('whatsapp_booking_sessions')
        .update({ 
          status: 'expired',
          conversation_history: history
        })
        .eq('id', session.id);

      const cancelMsg = language === 'nl' 
        ? 'Geen probleem! Als je later wilt boeken, stuur dan gewoon een berichtje.'
        : 'No problem! Feel free to message again when you\'d like to book.';

      return new Response(
        JSON.stringify({
          success: true,
          response: cancelMsg,
          session_ended: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use AI to process message and extract intent
    const slotsText = availableSlots.slice(0, 8).map((slot: any) => {
      const date = new Date(slot.start);
      return date.toLocaleString(language === 'nl' ? 'nl-NL' : 'en-US', { 
        weekday: 'long', 
        day: 'numeric',
        month: 'long',
        hour: 'numeric',
        minute: '2-digit'
      });
    }).join('\n- ');

    const systemPrompt = `You are QUIN, a WhatsApp booking assistant for The Quantum Club.
Respond in ${language === 'nl' ? 'Dutch' : 'English'}.

Host: ${hostName}
Meeting duration: ${bookingLink?.duration_minutes || 30} minutes

Available slots:
- ${slotsText || 'Various times available this week'}

Current booking data:
${JSON.stringify(currentData, null, 2)}

Conversation:
${history.map((h: any) => `${h.role}: ${h.content}`).join('\n')}

Your tasks:
1. Understand what the user wants (date/time preference)
2. Extract: date, time, name, email
3. When all info is collected, ask for confirmation
4. Keep responses brief and WhatsApp-friendly (use line breaks, emojis sparingly)

Respond as JSON:
{
  "response": "Your WhatsApp message",
  "extracted_data": {
    "preferred_date": "YYYY-MM-DD or null",
    "preferred_time": "HH:MM or null", 
    "guest_name": "string or null",
    "guest_email": "string or null"
  },
  "ready_to_confirm": boolean,
  "matched_slot": "ISO datetime string or null"
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
          { role: 'user', content: message }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    if (!aiResponse.ok) {
      throw new Error('AI processing failed');
    }

    const aiResult = await aiResponse.json();
    const parsed = JSON.parse(aiResult.choices?.[0]?.message?.content || '{}');

    // Merge extracted data
    const updatedData = {
      ...currentData,
      ...Object.fromEntries(
        Object.entries(parsed.extracted_data || {}).filter(([_, v]) => v !== null)
      ),
      matched_slot: parsed.matched_slot || currentData.matched_slot
    };

    history.push({
      role: 'assistant',
      content: parsed.response,
      timestamp: new Date().toISOString()
    });

    // Update session
    await supabase
      .from('whatsapp_booking_sessions')
      .update({
        conversation_history: history,
        extracted_data: updatedData,
        status: parsed.ready_to_confirm ? 'awaiting_confirmation' : 'active',
        last_message_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', session.id);

    return new Response(
      JSON.stringify({
        success: true,
        response: parsed.response,
        extracted_data: updatedData,
        ready_to_confirm: parsed.ready_to_confirm
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[whatsapp-booking] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function createBooking(supabase: any, session: any, history: any[]) {
  const data = session.extracted_data || {};
  const bookingLink = session.booking_links;
  const language = data.language || 'en';

  // Validate required data
  if (!data.matched_slot && (!data.preferred_date || !data.preferred_time)) {
    const errorMsg = language === 'nl'
      ? 'Er ontbreekt nog wat informatie. Welke datum en tijd werkt voor jou?'
      : 'I\'m missing some information. What date and time works for you?';

    return new Response(
      JSON.stringify({
        success: false,
        response: errorMsg
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!data.guest_email) {
    const emailMsg = language === 'nl'
      ? 'Bijna klaar! Wat is je e-mailadres voor de bevestiging?'
      : 'Almost done! What\'s your email address for the confirmation?';

    return new Response(
      JSON.stringify({
        success: false,
        response: emailMsg
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Parse scheduled time
  const scheduledStart = data.matched_slot 
    ? new Date(data.matched_slot)
    : new Date(`${data.preferred_date}T${data.preferred_time}:00`);
  
  const duration = bookingLink?.duration_minutes || 30;
  const scheduledEnd = new Date(scheduledStart.getTime() + duration * 60000);

  // Create booking
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      booking_link_id: session.booking_link_id,
      guest_name: data.guest_name || 'WhatsApp Guest',
      guest_email: data.guest_email,
      guest_phone: session.phone_number,
      scheduled_start: scheduledStart.toISOString(),
      scheduled_end: scheduledEnd.toISOString(),
      status: 'confirmed',
      source: 'whatsapp'
    })
    .select()
    .single();

  if (bookingError) {
    console.error('[whatsapp-booking] Booking failed:', bookingError);
    const errorMsg = language === 'nl'
      ? 'Sorry, er ging iets mis. Probeer het later opnieuw of boek via onze website.'
      : 'Sorry, something went wrong. Please try again or book via our website.';

    return new Response(
      JSON.stringify({
        success: false,
        response: errorMsg,
        error: bookingError.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Update session
  const hostName = bookingLink?.profiles?.full_name || 'our team';
  const dateStr = scheduledStart.toLocaleString(language === 'nl' ? 'nl-NL' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit'
  });

  const confirmMsg = language === 'nl'
    ? `✅ Perfect! Je afspraak met ${hostName} is bevestigd!\n\n📅 ${dateStr}\n\nJe ontvangt een bevestiging per email. Tot dan! 👋`
    : `✅ Perfect! Your meeting with ${hostName} is confirmed!\n\n📅 ${dateStr}\n\nYou'll receive a confirmation email shortly. See you then! 👋`;

  history.push({
    role: 'assistant',
    content: confirmMsg,
    timestamp: new Date().toISOString()
  });

  await supabase
    .from('whatsapp_booking_sessions')
    .update({
      booking_id: booking.id,
      status: 'completed',
      conversation_history: history
    })
    .eq('id', session.id);

  return new Response(
    JSON.stringify({
      success: true,
      response: confirmMsg,
      booking_id: booking.id,
      session_completed: true
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
