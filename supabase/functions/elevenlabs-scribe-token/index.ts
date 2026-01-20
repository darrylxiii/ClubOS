import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory rate limiting (resets on function restart)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // requests per minute
const RATE_WINDOW_MS = 60 * 1000;

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT) {
    return false;
  }

  entry.count++;
  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    // Get request body for meeting validation (optional)
    let meetingId: string | null = null;
    let participantId: string | null = null;
    
    try {
      const body = await req.json();
      meetingId = body.meeting_id || null;
      participantId = body.participant_id || null;
    } catch {
      // Body is optional, continue without it
    }

    // Rate limit by IP or participant
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateLimitKey = participantId || clientIP;

    if (!checkRateLimit(rateLimitKey)) {
      console.warn('[ElevenLabs Scribe] Rate limit exceeded for:', rateLimitKey);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please wait before requesting again.' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Optional: Validate meeting participation if meeting_id provided
    if (meetingId && participantId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: participant, error: participantError } = await supabase
        .from('meeting_participants')
        .select('id')
        .eq('meeting_id', meetingId)
        .or(`user_id.eq.${participantId},session_token.eq.${participantId}`)
        .maybeSingle();

      if (participantError) {
        console.warn('[ElevenLabs Scribe] Error validating participant:', participantError);
        // Continue anyway - don't block transcription for validation errors
      } else if (!participant) {
        console.log('[ElevenLabs Scribe] Participant not found in meeting, but allowing token (guest flow)');
        // Allow for guests who may not be registered yet
      }
    }

    console.log('[ElevenLabs Scribe] Requesting single-use token for realtime transcription');
    console.log('[ElevenLabs Scribe] Meeting:', meetingId, 'Participant:', participantId);

    const response = await fetch(
      'https://api.elevenlabs.io/v1/single-use-token/realtime_scribe',
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ElevenLabs Scribe] Token request failed:', response.status, errorText);
      throw new Error(`Failed to get scribe token: ${response.status}`);
    }

    const { token } = await response.json();
    console.log('[ElevenLabs Scribe] Token obtained successfully');

    return new Response(
      JSON.stringify({ token }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[ElevenLabs Scribe] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
