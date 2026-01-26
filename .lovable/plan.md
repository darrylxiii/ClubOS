

# Fix LiveKit Connection Loop & Transcript Mock Data - Root Cause Analysis

## Critical Discovery

After deep code audit, I found **TWO SEPARATE ROOT CAUSES** that both previous fixes missed:

### Issue 1: LiveKit Connection Never Triggers Fallback

**The Problem:**
The timeout logic in `LiveKitMeetingWrapper.tsx` (lines 66-89) depends on checking `!isConnecting && token` to detect success, and `!token` to detect failure. However, when the `livekit-token` edge function fails, the `useLiveKitMeeting` hook sets `isConnecting: false` and `error: "message"` but **does NOT set `token: null`**.

Looking at `useLiveKitMeeting.ts` lines 136-140:
```typescript
setState(prev => ({
  ...prev,
  isConnecting: false,  // ✅ Set to false
  error: lastError?.message || errorMsg  // ✅ Set error
}));
// ❌ token remains undefined, not explicitly null
```

The timeout effect on line 82 checks:
```typescript
if (!token && onFallbackToWebRTC) {  // ← !undefined is true, so this works
```

**BUT** the soft timeout on line 70 checks:
```typescript
if (!token) {
  setShowFallbackOption(true);  // Should work, but doesn't trigger
}
```

**Root Cause:** The effect dependencies `[isConnecting, token]` mean the timeout resets every time `isConnecting` changes. When the token request fails at 7 seconds (after 3 retries), `isConnecting` goes from `true` → `false`, which **resets the 15-second timer**. The 30-second hard timeout ALSO resets because it depends on `[token, onFallbackToWebRTC]`, and `token` changes from `undefined` to still `undefined` but the state object reference changes.

### Issue 2: Web Speech API Transcript Showing Instead of ElevenLabs

**The Problem:**
The `StreamingCaptions` component (line 1327) receives data from **both** transcript hooks:

1. `useMeetingTranscript` (lines 118-121) - Browser's Web Speech API
2. `useStreamingTranscription` (lines 234-245) - ElevenLabs Scribe SDK

But it ONLY displays data from `useStreamingTranscription`:
```typescript
<StreamingCaptions
  enabled={captionsEnabled && hasGivenConsent}
  isConnected={isTranscribing}  // ← from useStreamingTranscription
  partialTranscript={partialTranscript || ''}  // ← from useStreamingTranscription
  committedTranscripts={committedTranscripts || []}  // ← from useStreamingTranscription
  participantName={participantName}
/>
```

However, the `useMeetingTranscript` hook (line 118) is **ALWAYS ENABLED** when `meetingStarted && !showDiagnostics && hasGivenConsent` is true. 

**The actual issue:** The user sees NO transcripts at all because:

1. **ElevenLabs Scribe is NOT connecting** - The `useStreamingTranscription` hook requires `transcriptionEnabled` to be true (line 244), which means the user must explicitly enable captions
2. **When they enable captions**, if ElevenLabs fails to connect (token error, API down, etc.), the `StreamingCaptions` component shows "Start speaking to see live transcription..." but nothing appears
3. **The Web Speech API transcript is collected** (from `useMeetingTranscript`) but **NEVER DISPLAYED** anywhere in the UI

**What the user is likely seeing:**
- Either they enabled captions and see nothing (ElevenLabs not connecting)
- OR they see old/cached mock data from a previous test session stored in browser memory

---

## Comprehensive Fix Plan

### Phase 1: Fix LiveKit Timeout - Remove Dependency on State Changes

**Problem:** Timeout effects reset when state changes.

**Solution:** Use a **single mount-time timer** that's independent of state.

**File: `src/components/meetings/LiveKitMeetingWrapper.tsx`**

Replace lines 65-89 with:

```typescript
// Single timeout effect that runs once on mount
useEffect(() => {
  const connectionStart = Date.now();
  
  // Soft timeout: Show fallback option at 15s
  const softTimer = setTimeout(() => {
    const elapsed = Date.now() - connectionStart;
    console.warn(`[LiveKit] ⏱️ Soft timeout at ${elapsed}ms - showing fallback option`);
    if (!token) {
      setShowFallbackOption(true);
    }
  }, 15000);
  
  // Hard timeout: Auto-fallback at 30s
  const hardTimer = setTimeout(() => {
    const elapsed = Date.now() - connectionStart;
    console.error(`[LiveKit] ⏱️ Hard timeout at ${elapsed}ms - forcing fallback`);
    if (!token && onFallbackToWebRTC) {
      onFallbackToWebRTC();
    }
  }, 30000);
  
  return () => {
    clearTimeout(softTimer);
    clearTimeout(hardTimer);
  };
}, []); // ← NO dependencies, runs once
```

### Phase 2: Add Connection State Logging

**File: `src/hooks/useLiveKitMeeting.ts`**

Add logging to track exact timing (after line 141):

```typescript
setState(prev => ({
  ...prev,
  isConnecting: false,
  error: lastError?.message || errorMsg,
  token: null  // ← Explicitly set to null
}));
console.error('[LiveKit] ❌ All retries failed at', new Date().toISOString());
console.error('[LiveKit] Total elapsed time:', Date.now() - connectionStartTime);
return null;
```

Add a `connectionStartTime` variable at the start of the `getToken` function:

```typescript
const getToken = useCallback(async (): Promise<string | null> => {
  const connectionStartTime = Date.now();
  let lastError: Error | null = null;
  // ... rest of function
```

### Phase 3: Fix Transcript Display - Fallback Chain

**Problem:** Two transcript systems, only one displayed, no fallback.

**Solution:** Create a fallback chain: ElevenLabs → Web Speech API → None

**File: `src/components/meetings/MeetingVideoCallInterface.tsx`**

After line 245, add fallback logic:

```typescript
// Fallback transcript data: Use ElevenLabs if connected, otherwise Web Speech API
const activePartialTranscript = isTranscribing 
  ? (partialTranscript || '')  // ElevenLabs active
  : (transcript || '');  // Fallback to Web Speech API

const activeCommittedTranscripts = isTranscribing 
  ? (committedTranscripts || [])  // ElevenLabs active
  : (transcript ? [{ id: 'web-speech', text: transcript }] : []);  // Fallback to Web Speech

const activeTranscriptionSource = isTranscribing ? 'ElevenLabs Scribe' : 'Browser Speech API';
```

Then update the `StreamingCaptions` component call (line 1327):

```typescript
<StreamingCaptions
  enabled={captionsEnabled && hasGivenConsent}
  isConnected={isTranscribing || !!transcript}  // ← Connected if EITHER source has data
  partialTranscript={activePartialTranscript}
  committedTranscripts={activeCommittedTranscripts}
  participantName={participantName}
  source={activeTranscriptionSource}  // ← NEW: Show which source is active
/>
```

**File: `src/components/video-call/StreamingCaptions.tsx`**

Add `source` prop to interface (line 7-13):

```typescript
interface StreamingCaptionsProps {
  enabled: boolean;
  isConnected: boolean;
  partialTranscript: string;
  committedTranscripts: Array<{ id: string; text: string }>;
  participantName: string;
  source?: string;  // ← NEW
}
```

Update the badge text (line 48) to show source:

```typescript
<span className="text-xs text-muted-foreground">
  {source || 'Live Transcription'}
</span>
```

### Phase 4: Diagnostic Logging for ElevenLabs Connection

**File: `src/hooks/useStreamingTranscription.ts`**

Add detailed logging to understand why ElevenLabs isn't connecting (add after line 155):

```typescript
console.log('[StreamingTranscription] ✅ Connected successfully');
console.log('[StreamingTranscription] Meeting:', meetingId);
console.log('[StreamingTranscription] Stream tracks:', localStream?.getTracks().map(t => `${t.kind}: ${t.enabled}`));
console.log('[StreamingTranscription] VAD commit strategy enabled');
```

Add logging when connection is attempted but conditions not met (add after line 233):

```typescript
if (enabled && localStream && !hasConnectedRef.current) {
  console.log('[StreamingTranscription] 🎬 Starting connection in 1s...');
  console.log('[StreamingTranscription] Enabled:', enabled, 'Has stream:', !!localStream);
  // ... existing code
}
```

Add logging when disabled (add after line 241):

```typescript
if (!enabled && hasConnectedRef.current) {
  console.log('[StreamingTranscription] ⏸️ Disabled, disconnecting...');
  disconnect();
}
```

### Phase 5: Verify Edge Function Health

Create a startup health check to verify `livekit-token` and `elevenlabs-scribe-token` functions are reachable.

**File: `src/components/meetings/MeetingVideoCallInterface.tsx`**

Add a health check effect after line 115:

```typescript
// Health check for meeting infrastructure
useEffect(() => {
  const checkInfrastructure = async () => {
    console.log('[Meeting] 🏥 Checking infrastructure health...');
    
    // Check LiveKit health
    const { data: lkHealth } = await supabase.functions.invoke('livekit-health', { body: {} });
    console.log('[Meeting] LiveKit health:', lkHealth);
    
    // Check ElevenLabs by attempting token fetch
    const { data: elToken, error: elError } = await supabase.functions.invoke('elevenlabs-scribe-token', {
      body: { meeting_id: meeting.id, participant_id: participantId }
    });
    console.log('[Meeting] ElevenLabs token:', elError ? '❌ ' + elError.message : '✅ OK');
  };
  
  checkInfrastructure();
}, [meeting.id, participantId]);
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/meetings/LiveKitMeetingWrapper.tsx` | Replace timeout effects with mount-once timers (lines 65-89) |
| `src/hooks/useLiveKitMeeting.ts` | Add connection timing logs, explicitly set `token: null` on failure |
| `src/components/meetings/MeetingVideoCallInterface.tsx` | Add transcript fallback logic (after line 245), add health check (after line 115) |
| `src/components/video-call/StreamingCaptions.tsx` | Add `source` prop to show which transcript system is active |
| `src/hooks/useStreamingTranscription.ts` | Add detailed connection state logging |

---

## Expected Results After Fix

| Metric | Before | After |
|--------|--------|-------|
| LiveKit timeout triggers | Never (stuck forever) | ✅ 15s soft, 30s hard |
| Transcript fallback | None (blank if ElevenLabs fails) | ✅ Web Speech API fallback |
| Transcript source visibility | Hidden | ✅ Shows "ElevenLabs Scribe" or "Browser Speech API" |
| Connection diagnostics | Silent failures | ✅ Console logs show exact timing and state |
| Infrastructure health | Unknown until failure | ✅ Checked on mount, logged to console |

---

## Testing Protocol

### Test 1: LiveKit Timeout (if LiveKit is down/misconfigured)

1. Join meeting
2. Watch console for "[LiveKit] 🔑 Token request attempt 1/3"
3. After 15 seconds: Should see "Switch to Direct Mode" button
4. After 30 seconds: Should auto-switch to WebRTC P2P mode
5. Console should show: "[LiveKit] ⏱️ Hard timeout at 30000ms - forcing fallback"

### Test 2: Transcript Fallback

1. Join meeting, enable captions
2. If ElevenLabs connects: Should see "ElevenLabs Scribe" in caption badge
3. If ElevenLabs fails: Should see "Browser Speech API" in caption badge
4. Speak: Should see YOUR words appear (not mock phrases)
5. Console should show which system is active

### Test 3: Infrastructure Health

1. Join meeting
2. Open console immediately
3. Should see "[Meeting] 🏥 Checking infrastructure health..."
4. Should see "[Meeting] LiveKit health: { configured: true/false, ready: true/false }"
5. Should see "[Meeting] ElevenLabs token: ✅ OK" or "❌ error message"

---

## Why Previous Fixes Failed

1. **LiveKit Timeout Reset Bug**: The timeout effects had dependencies on `isConnecting` and `token`, which caused them to reset every time the state changed. A failed token request at 7 seconds would reset both timers, making the 15s/30s limits meaningless.

2. **Transcript Display Disconnection**: The `useMeetingTranscript` hook was collecting data but it was never wired to the UI. The `StreamingCaptions` component only shows `useStreamingTranscription` data, so if ElevenLabs fails to connect, the user sees nothing.

3. **Silent ElevenLabs Failures**: The `useStreamingTranscription` hook could fail to connect (token error, API down, microphone permissions) but provided no logging to diagnose why. Without visibility, we couldn't tell if it was a configuration issue, network issue, or code bug.

