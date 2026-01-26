
# Meeting Connection Failures: Comprehensive Audit & Fix Plan

## Executive Summary

Your meetings are experiencing **two critical failure modes** that prevent proper functionality:

1. **"Connecting to secure room..." infinite loading** - LiveKit token generation is failing silently
2. **"Waiting for host" despite host being present** - Participant state synchronization is broken due to race conditions

Both issues stem from **architectural problems** in how participant state is managed and how the LiveKit integration is initialized.

---

## Root Cause Analysis

### Issue 1: LiveKit Token Generation Failure

**Symptoms:**
- Screen shows "Connecting to secure room..." with spinning loader indefinitely
- No actual connection to LiveKit SFU ever established
- Edge function logs show only boot/shutdown, no request processing

**Root Causes:**
1. **Silent failure in token request**: The `useLiveKitMeeting` hook calls `supabase.functions.invoke('livekit-token')` but if this fails (network, auth, misconfiguration), it just sets `error` state without retry logic
2. **No timeout mechanism**: The LiveKitMeetingWrapper component waits forever for `!isConnecting && token` - there's no 30-second timeout to fail gracefully
3. **LiveKit secrets might be misconfigured**: While secrets exist (`LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`), the actual values might be incorrect or the LiveKit cloud service might be unreachable
4. **No fallback to WebRTC P2P**: The app previously had a working WebRTC peer-to-peer system (`useMeetingWebRTC`), but it was completely replaced by LiveKit with no fallback

**Evidence:**
```typescript
// src/hooks/useLiveKitMeeting.ts:76-109
const getToken = useCallback(async (): Promise<string | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('livekit-token', { ... });
    if (error) {
      console.error('[LiveKit] Token error:', error);
      throw new Error(error.message);  // ❌ Throws but no retry
    }
    return data.token;
  } catch (error) {
    setState(prev => ({ ...prev, error: ... }));  // ❌ Just sets error, never retries
    return null;
  }
}, []);
```

---

### Issue 2: Participant State Synchronization Broken

**Symptoms:**
- Sebastiaan sees "Waiting for host" even though Darryl (host) has already joined
- Database shows BOTH participants have `left_at` set and `status: 'left'`
- Host cannot see participants who joined after them

**Root Causes:**
1. **Aggressive "mark as left" on join** (MeetingRoom.tsx:186-194): When ANY user joins, the system first marks ALL their existing participant records as "left" before creating a new one. This is intended to handle reconnections, but it creates a race condition
2. **Race condition timeline:**
   ```
   T0: Host clicks "Join Meeting"
   T1: System marks existing host participant as "left" (left_at = NOW)
   T2: System inserts new participant record (left_at = NULL)
   T3: Host enters diagnostics screen (camera/mic check)
   T4: Heartbeat should update last_seen every 10s...
   T5: BUT heartbeat only runs when !showDiagnostics (line 575)
   T6: Auto-rejoin fix only runs when !showDiagnostics (line 603)
   T7: Guest joins, checks host presence, sees left_at != NULL from T1
   T8: Guest shows "Waiting for host" screen
   ```

3. **Heartbeat blocked during diagnostics**: The heartbeat effect that updates `last_seen` has a dependency on `showDiagnostics` - it won't run until AFTER the camera/mic check completes
4. **Auto-rejoin blocked during diagnostics**: Same issue - the fix that resets `left_at` to NULL only runs after diagnostics complete

**Evidence from database:**
```sql
-- Meeting CB54DB5D6C has 2 participants, BOTH marked as left:
[
  { user_id: "8b762c96...", status: "left", left_at: "2026-01-26 01:18:44.305+00" },
  { user_id: "8b762c96...", status: "left", left_at: "2026-01-26 01:18:58.379+00" }
]
-- This explains why host_last_seen is NULL and active_participants is 0
```

---

## Proposed Solution Architecture

### Phase 1: Add LiveKit Fallback & Timeout (HIGH PRIORITY)

**Problem**: No graceful degradation when LiveKit fails  
**Solution**: Add 15-second timeout to LiveKit connection, then auto-fallback to WebRTC P2P

**Changes:**

1. **File**: `src/hooks/useLiveKitMeeting.ts`
   - Add timeout logic to `connect()` function
   - If token request takes >15s or fails 3 times, return `{ fallbackToWebRTC: true }`
   - Emit connection state events: `'livekit-timeout'`, `'fallback-initiated'`

2. **File**: `src/components/meetings/LiveKitMeetingWrapper.tsx`
   - Add timeout UI: After 15s of "Connecting...", show:
     ```
     "Connection taking longer than expected...
     [Switch to Direct Connection] [Keep Waiting]"
     ```
   - If user clicks "Switch" or 30s total timeout, call `onFallback()` prop

3. **File**: `src/components/meetings/MeetingVideoCallInterface.tsx`
   - Add fallback state: `const [useLiveKitMode, setUseLiveKitMode] = useState(true)`
   - Render logic:
     ```tsx
     {useLiveKitMode ? (
       <LiveKitMeetingWrapper onFallback={() => setUseLiveKitMode(false)} />
     ) : (
       <VideoGrid />  {/* The original WebRTC P2P system */}
     )}
     ```
   - Show toast: "Switched to direct peer-to-peer mode"

**Why this fixes "Connecting to secure room...":**
- Prevents infinite loading by adding hard timeout
- Provides escape hatch to working WebRTC system
- User experience: 15s wait → option to switch → fallback at 30s

---

### Phase 2: Fix Participant State Race Conditions (CRITICAL)

**Problem**: Participants marked as "left" during join flow, blocking host detection  
**Solution**: Redesign join flow to be atomic and start heartbeat immediately

**Changes:**

1. **File**: `src/pages/MeetingRoom.tsx` - Fix handleJoinMeeting
   ```typescript
   // BEFORE (lines 186-209): Mark as left → Insert new → Race condition
   
   // AFTER: Atomic upsert with immediate heartbeat start
   const handleJoinMeeting = async () => {
     setJoining(true);
     try {
       // Use upsert pattern to avoid race condition
       const { error } = await supabase
         .from('meeting_participants')
         .upsert({
           meeting_id: meeting.id,
           user_id: user.id,
           status: 'accepted',
           joined_at: new Date().toISOString(),
           left_at: null,  // ✅ Atomic: never in "left" state
           last_seen: new Date().toISOString()  // ✅ Immediate heartbeat
         }, {
           onConflict: 'meeting_id,user_id',  // Unique constraint needed
           ignoreDuplicates: false
         });
       
       // Start heartbeat IMMEDIATELY (don't wait for diagnostics)
       startHeartbeat(meeting.id, user.id);
       
       setInCall(true);
     } catch (error) { ... }
   };
   ```

2. **File**: `src/components/meetings/MeetingVideoCallInterface.tsx`
   - **Remove** `showDiagnostics` dependency from heartbeat effect (line 575)
   - Heartbeat should run from the moment participant enters, even during diagnostics
   - Change line 575:
     ```typescript
     // BEFORE:
     if (!meeting?.id || !participantId || showDiagnostics) return;
     
     // AFTER:
     if (!meeting?.id || !participantId) return;  // ✅ Always run heartbeat
     ```

3. **Database Migration**: Add unique constraint
   ```sql
   -- Prevent duplicate active participants
   CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_participants_unique_active
   ON meeting_participants(meeting_id, user_id)
   WHERE left_at IS NULL;
   
   -- For guests using session_token
   CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_participants_unique_active_guest
   ON meeting_participants(meeting_id, session_token)
   WHERE left_at IS NULL AND session_token IS NOT NULL;
   ```

**Why this fixes "Waiting for host":**
- No more race condition - participant is NEVER in "left" state during join
- Heartbeat starts immediately, so `last_seen` is always fresh
- Host presence check (MeetingRoom.tsx:48-67) will correctly detect host as active
- Unique constraint prevents duplicate participant records

---

### Phase 3: Improve LiveKit Error Visibility (MEDIUM PRIORITY)

**Problem**: Token failures are silent - no user feedback  
**Solution**: Add detailed error states and manual retry

**Changes:**

1. **File**: `src/components/meetings/LiveKitMeetingWrapper.tsx`
   - Enhance error display to show WHAT failed:
     ```tsx
     if (error) {
       return (
         <div className="...">
           <h3>Connection Failed</h3>
           <p className="text-sm text-muted-foreground">
             {error.includes('LiveKit not configured') 
               ? 'Video infrastructure is not available. Contact support.'
               : error.includes('Token generation failed')
                 ? 'Failed to generate meeting token. Please refresh.'
                 : error
             }
           </p>
           <div className="flex gap-2">
             <button onClick={() => connect()}>Retry</button>
             <button onClick={() => onFallback()}>Use Direct Mode</button>
           </div>
         </div>
       );
     }
     ```

2. **File**: `supabase/functions/livekit-token/index.ts`
   - Add detailed logging for debugging:
     ```typescript
     console.log('[LiveKit] Token request received:', {
       roomName,
       participantId,
       participantName,
       isHost,
       timestamp: new Date().toISOString()
     });
     
     // After token generation
     console.log('[LiveKit] ✅ Token generated successfully for:', participantName);
     ```

3. **Add health check endpoint**: New edge function `livekit-health`
   ```typescript
   // Test if LiveKit cloud is reachable
   const response = await fetch(`${livekitUrl}/healthz`);
   return {
     livekitReachable: response.ok,
     livekitUrl,
     secretsConfigured: !!(apiKey && apiSecret && livekitUrl)
   };
   ```

---

### Phase 4: Database Cleanup & Monitoring (LOW PRIORITY)

**Problem**: Stale participant records accumulate  
**Solution**: Automated cleanup + admin visibility

**Changes:**

1. **New edge function**: `cleanup-stale-meeting-participants`
   ```typescript
   // Run every 5 minutes via cron
   // Clean up participants where:
   // - left_at is NULL (still "in" meeting)
   // - last_seen > 2 minutes ago (no heartbeat)
   // - meeting has ended
   const staleThreshold = new Date(Date.now() - 2 * 60 * 1000);
   await supabase
     .from('meeting_participants')
     .update({ left_at: new Date().toISOString(), status: 'disconnected' })
     .is('left_at', null)
     .lt('last_seen', staleThreshold.toISOString());
   ```

2. **Add to config.toml**:
   ```toml
   [functions.cleanup-stale-meeting-participants]
   verify_jwt = false
   ```

3. **Monitoring query** (for admin dashboard):
   ```sql
   -- Show meetings with participant state issues
   SELECT 
     m.title,
     m.meeting_code,
     COUNT(*) FILTER (WHERE mp.left_at IS NULL) as active_count,
     COUNT(*) FILTER (WHERE mp.left_at IS NULL AND mp.last_seen < NOW() - INTERVAL '2 minutes') as stale_count
   FROM meetings m
   JOIN meeting_participants mp ON mp.meeting_id = m.id
   WHERE m.status IN ('scheduled', 'in_progress')
   GROUP BY m.id
   HAVING COUNT(*) FILTER (WHERE mp.left_at IS NULL AND mp.last_seen < NOW() - INTERVAL '2 minutes') > 0;
   ```

---

## Implementation Priority & Risk

| Phase | Priority | Risk | Est. Time | Fixes |
|-------|----------|------|-----------|-------|
| Phase 2 | **CRITICAL** | Low | 30 min | "Waiting for host" + race conditions |
| Phase 1 | **HIGH** | Medium | 45 min | "Connecting..." infinite load + provides fallback |
| Phase 3 | MEDIUM | Low | 20 min | Better error UX |
| Phase 4 | LOW | Low | 30 min | Long-term stability |

**Recommendation**: Implement Phase 2 FIRST (fixes immediate blocking issue), then Phase 1 (adds resilience).

---

## Technical Debt Identified

1. **No connection mode preference**: Should store per-user preference for LiveKit vs WebRTC
2. **Missing LiveKit health monitoring**: No proactive checks if LiveKit cloud is down
3. **No retry exponential backoff**: Token requests don't use proper retry strategy
4. **Diagnostics screen blocks critical logic**: Camera/mic check shouldn't delay participant presence updates
5. **No "meeting capacity" check**: LiveKit vs WebRTC decision should be based on participant count (P2P mesh degrades >4 participants)

---

## Testing Plan

After implementation, test these scenarios:

**Scenario 1: LiveKit Working** (Happy Path)
1. Host starts meeting → Should show LiveKit room within 5s
2. Guest joins → Should see host immediately
3. Both should see each other's video/audio

**Scenario 2: LiveKit Down** (Fallback)
1. Host starts meeting → After 15s, should see fallback option
2. Click "Switch to Direct Connection" → Should load WebRTC mode
3. Guest joins → Should auto-use WebRTC (detect host's mode)

**Scenario 3: Rapid Reconnection** (Race Condition Test)
1. Host joins → Immediately closes tab → Rejoins within 5s
2. Should NOT create duplicate participant records
3. Should show as "active" without gaps in `last_seen`

**Scenario 4: Stale Participants** (Cleanup)
1. Create meeting with 3 participants
2. Force-kill browser for 2 participants (no cleanup signal)
3. After 2 minutes, verify they're marked as `status: 'disconnected'`

---

## Files to Modify

### Critical (Phase 1 & 2):
- `src/pages/MeetingRoom.tsx` - Fix join flow race condition
- `src/components/meetings/MeetingVideoCallInterface.tsx` - Remove diagnostics dependency, add LiveKit fallback
- `src/hooks/useLiveKitMeeting.ts` - Add timeout + retry logic
- `src/components/meetings/LiveKitMeetingWrapper.tsx` - Add fallback UI + timeout handling
- **New migration**: Add unique constraints on meeting_participants

### Medium (Phase 3):
- `supabase/functions/livekit-token/index.ts` - Better logging
- **New function**: `supabase/functions/livekit-health/index.ts`

### Low (Phase 4):
- **New function**: `supabase/functions/cleanup-stale-meeting-participants/index.ts`
- `supabase/config.toml` - Register cleanup function

---

## Success Metrics

After implementation, meetings should achieve:
- **0% "Connecting..." timeouts** (fallback activates within 30s)
- **0% "Waiting for host" false positives** (race condition eliminated)
- **< 1s** time-to-first-heartbeat after join button click
- **99.9%** participant state accuracy (active vs left)
- **< 5%** LiveKit failure rate (with auto-fallback masking failures)

---

## Long-Term Recommendations

1. **Add automatic mode selection**: Use LiveKit for 4+ participants, WebRTC P2P for 1-3
2. **Implement connection quality telemetry**: Track which mode performs better per network type
3. **Pre-flight connectivity test**: Before joining, test reachability of LiveKit and TURN servers
4. **Graceful degradation path**: LiveKit SFU → TURN-relayed WebRTC → Direct WebRTC → Audio-only
5. **Add meeting "health score" dashboard** for admins showing connection success rates

