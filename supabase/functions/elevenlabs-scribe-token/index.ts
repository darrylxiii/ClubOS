import { createHandler } from '../_shared/handler.ts';
import { resilientFetch } from '../_shared/resilient-fetch.ts';

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

Deno.serve(createHandler(async (req, ctx) => {
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
        headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  // Optional: Validate meeting participation if meeting_id provided
  if (meetingId && participantId) {
    const { data: participant, error: participantError } = await ctx.supabase
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

  const { response } = await resilientFetch(
    'https://api.elevenlabs.io/v1/single-use-token/realtime_scribe',
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
    },
    {
      timeoutMs: 10_000,
      maxRetries: 1,
      service: 'elevenlabs',
      operation: 'get-scribe-token',
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
    { headers: { ...ctx.corsHeaders, 'Content-Type': 'application/json' } }
  );
}));
