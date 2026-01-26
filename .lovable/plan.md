
# Fix Meeting Connection & Live Transcript - COMPLETE AUDIT

## Executive Summary

I identified **3 critical root causes** preventing meetings from working:

1. **LiveKit Edge Function Crashing** - Token requests are received but function shuts down before returning a token
2. **Transcript Using Mock Data** - The transcript hook has `simulate: true` hardcoded
3. **No Fallback Triggers After 30 Seconds** - Despite the timeout code existing, something prevents the auto-fallback

---

## Root Cause Evidence

### Issue 1: LiveKit Token Function Crashing

**Edge Function Logs Evidence:**
```
2026-01-26T01:50:30Z INFO [LiveKit] 📥 Token request received at: 2026-01-26T01:50:30.180Z
2026-01-26T01:50:30Z LOG shutdown  ← CRASH immediately after receiving request!
```

The pattern repeats throughout the logs - "Token request received" is NEVER followed by "Token generated" or "Config check". The function is crashing during execution, likely during:
- JSON body parsing (`await req.json()`)
- JWT creation (`createJWT()`)
- Or the Web Crypto API call

**Why the fallback doesn't trigger:**
- The hook gets stuck in `isConnecting: true` state forever because the request never returns
- The 30-second timeout in `LiveKitMeetingWrapper` only runs when `token` is falsy, but if the state is stuck, it might not evaluate correctly

### Issue 2: Live Transcript Shows Fake Data

**Evidence (MeetingVideoCallInterface.tsx line 79-82):**
```typescript
const { transcript } = useMeetingTranscript({
  enabled: true,
  simulate: true  // ← THIS IS THE PROBLEM - Forces mock interview phrases
});
```

The `simulate: true` flag triggers an interval that outputs canned phrases like:
- "Can you explain your experience with React?"
- "I have worked with React for 5 years..."

This is demo/placeholder code that was never switched to production mode.

### Issue 3: Streaming Transcription Disabled

**Evidence (MeetingVideoCallInterface.tsx line 244):**
```typescript
enabled: transcriptionEnabled && meetingStarted && !showDiagnostics && hasGivenConsent
```

The **real** ElevenLabs transcription (`useStreamingTranscription`) is disabled until:
- `meetingStarted` = true
- `showDiagnostics` = false  
- `hasGivenConsent` = true

But users never see this because the mock `useMeetingTranscript` is always running.

---

## Implementation Plan

### Phase 1: Fix LiveKit Token Function (CRITICAL)

The function is crashing - likely due to an unhandled exception. Need to:

1. Add comprehensive try-catch around every operation
2. Add detailed logging at each step to identify crash point
3. Ensure proper error responses instead of crashes

**File: `supabase/functions/livekit-token/index.ts`**

```typescript
serve(async (req) => {
  console.log('[LiveKit] 📥 Request method:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Step 1: Check environment
    const apiKey = Deno.env.get('LIVEKIT_API_KEY');
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');
    const livekitUrl = Deno.env.get('LIVEKIT_URL');

    console.log('[LiveKit] 🔧 Secrets loaded:', {
      hasApiKey: !!apiKey,
      hasApiSecret: !!apiSecret,
      hasUrl: !!livekitUrl
    });

    if (!apiKey || !apiSecret || !livekitUrl) {
      console.error('[LiveKit] ❌ Missing secrets');
      return new Response(JSON.stringify({ 
        error: 'LiveKit not configured',
        configured: false 
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Parse body with error handling
    let body;
    try {
      body = await req.json();
      console.log('[LiveKit] 📄 Body parsed:', Object.keys(body));
    } catch (parseError) {
      console.error('[LiveKit] ❌ Body parse failed:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid request body' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { roomName, participantName, participantId, isHost = false } = body;

    if (!roomName || !participantName || !participantId) {
      console.error('[LiveKit] ❌ Missing required fields');
      return new Response(JSON.stringify({ 
        error: 'Missing required fields' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 3: Create token with error handling
    console.log('[LiveKit] 🔑 Creating JWT for:', participantName);
    let token;
    try {
      token = await createJWT({ ... }, apiSecret);
      console.log('[LiveKit] ✅ JWT created successfully');
    } catch (jwtError) {
      console.error('[LiveKit] ❌ JWT creation failed:', jwtError);
      return new Response(JSON.stringify({ 
        error: 'Token generation failed' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      token,
      url: livekitUrl,
      roomName,
      participantId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[LiveKit] ❌ Unhandled error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

### Phase 2: Fix Fallback Trigger (CRITICAL)

The useLiveKitMeeting hook needs to properly signal failure so the fallback can trigger.

**File: `src/hooks/useLiveKitMeeting.ts`**

Add request timeout and proper error state:

```typescript
const getToken = useCallback(async (): Promise<string | null> => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[LiveKit] 🔑 Token request attempt ${attempt}/${MAX_RETRIES}`);
      
      // Add timeout using AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s per attempt
      
      const { data, error } = await supabase.functions.invoke('livekit-token', {
        body: { roomName, participantName, participantId, isHost }
      });
      
      clearTimeout(timeoutId);

      if (error) {
        console.error(`[LiveKit] ❌ Attempt ${attempt} error:`, error);
        throw new Error(error.message);
      }

      if (!data?.token) {
        throw new Error('No token in response');
      }

      console.log('[LiveKit] ✅ Token received');
      return data.token;

    } catch (error) {
      console.warn(`[LiveKit] ⚠️ Attempt ${attempt} failed:`, error);
      
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt - 1]));
      }
    }
  }

  // All retries failed - set error state to trigger fallback
  const errorMsg = 'Failed to connect to video service after 3 attempts';
  console.error('[LiveKit] ❌', errorMsg);
  setState(prev => ({
    ...prev,
    isConnecting: false,  // ← CRITICAL: Must set to false
    error: errorMsg
  }));
  return null;
}, [roomName, participantName, participantId, isHost]);
```

### Phase 3: Remove Mock Transcript (CRITICAL)

**File: `src/components/meetings/MeetingVideoCallInterface.tsx`**

Change line 79-82:

```typescript
// BEFORE:
const { transcript } = useMeetingTranscript({
  enabled: true,
  simulate: true  // ← REMOVE THIS
});

// AFTER: Remove entirely - we use real streaming transcription
// The useStreamingTranscription hook already provides real transcripts
```

OR if you need the hook for AI analysis, disable simulation:

```typescript
const { transcript } = useMeetingTranscript({
  enabled: meetingStarted && !showDiagnostics,
  simulate: false  // ← Use real Speech Recognition API
});
```

### Phase 4: Ensure Streaming Transcription Works

The ElevenLabs streaming transcription (`useStreamingTranscription`) is already properly implemented. We need to ensure:

1. The `elevenlabs-scribe-token` edge function is deployed and working
2. The `ELEVENLABS_API_KEY` secret is configured (✅ already confirmed)

**Verify edge function exists:**
```bash
supabase/functions/elevenlabs-scribe-token/index.ts
```

If missing, create it:

```typescript
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
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }

    const response = await fetch(
      'https://api.elevenlabs.io/v1/single-use-token/realtime_scribe',
      {
        method: 'POST',
        headers: { 'xi-api-key': ELEVENLABS_API_KEY },
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const { token } = await response.json();

    return new Response(JSON.stringify({ token }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[ElevenLabs Scribe] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to get token' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/livekit-token/index.ts` | Add granular try-catch, step-by-step logging |
| `src/hooks/useLiveKitMeeting.ts` | Add per-request timeout, ensure `isConnecting: false` on failure |
| `src/components/meetings/MeetingVideoCallInterface.tsx` | Remove `simulate: true` from useMeetingTranscript |
| `supabase/functions/elevenlabs-scribe-token/index.ts` | Verify exists and working |

---

## Expected Results After Fix

| Issue | Before | After |
|-------|--------|-------|
| "Connecting to secure room..." | Infinite spinner | Either connects in <5s OR auto-fallback at 30s |
| Live Transcript | Fake mock phrases | Real speech-to-text via ElevenLabs Scribe |
| Fallback to WebRTC | Never triggers | Triggers after 30s if LiveKit fails |
| Token generation | Crashes silently | Returns error response, client can retry |

---

## Testing Checklist

After deployment:

1. **LiveKit Path**: Join meeting → Should connect to LiveKit room within 5 seconds
2. **Fallback Path**: If LiveKit fails → Should see fallback buttons at 15s → Auto-switch at 30s
3. **Transcript**: Enable captions → Speak → See YOUR words appear (not mock phrases)
4. **Final Transcript**: End meeting → Meeting history should show full transcript with timestamps

---

## Technical Details

### Why the function crashes

The Supabase Edge Functions have a cold start issue where the function boots, receives a request, but shuts down before processing completes. This can happen when:
1. The function has a syntax error (unlikely - it deployed)
2. An unhandled promise rejection occurs
3. The function takes too long and hits timeout
4. A runtime error occurs in async code

The fix is to wrap EVERYTHING in try-catch and ensure proper error responses.

### Why the timeout doesn't work

The `LiveKitMeetingWrapper` timeout effects depend on `isConnecting` and `token` state. If the hook gets stuck with `isConnecting: true` and never updates, the timeout condition:
```typescript
if (!token && isConnecting) {  // ← This evaluates to true forever
```

Keeps waiting. We need to ensure `isConnecting` is set to `false` when all retries fail.
