
# Fix WebRTC Meeting Connectivity & Mutual Audio/Video

## Problem Analysis

Based on the session replay, console logs, database state, and codebase analysis, I've identified **8 interconnected root causes** preventing stable video calls:

### 1. **Both Participants Marked as "Left"**
The database shows both users have `left_at` timestamps and status "left". The meeting is marked as "completed". When participants try to reconnect, they're stuck in an inconsistent state.

### 2. **Missing Audio Playback Infrastructure**
**CRITICAL**: The `ParticipantTile` component only has a `<video>` element. Remote audio tracks in the MediaStream won't play without a separate `<audio>` element or AudioContext setup. This explains why you can see each other but cannot hear.

### 3. **Video Element Attachment Race Conditions**
The `useEffect` in `ParticipantTile` sets `videoRef.current.srcObject = participant.stream`, but:
- No verification that video element is mounted
- No check if MediaStream tracks are in "live" state
- No retry mechanism if attachment fails
- Autoplay may be blocked by browser policies

### 4. **Track State Not Validated Before Peer Connection**
`useMeetingWebRTC` adds tracks to peer connections immediately:
```typescript
currentStream.getTracks().forEach(track => {
  pc.addTrack(track, currentStream);
});
```
But doesn't verify tracks are in `readyState: 'live'` or `enabled: true`.

### 5. **No Error Recovery in ParticipantTile**
When `video.srcObject` fails or autoplay is blocked:
- Error is logged but not recovered
- No fallback to manual play attempt
- No user notification

### 6. **Signaling Working But Streams Not Rendering**
Database shows proper offer/answer/ICE candidate exchange:
- Host sends offer at 03:34:02
- Guest sends answer at 03:34:03
- ICE candidates exchanged
- But streams don't appear in UI

This indicates the WebRTC connection succeeds at the protocol level, but stream rendering fails.

### 7. **Free TURN Servers (Reliability Issue)**
System uses community TURN servers (OpenRelay, Metered.ca free tier) which:
- Have rate limits
- Can be congested
- May timeout during peak usage
- Don't guarantee uptime

### 8. **No Comprehensive Connection Health Monitoring**
No real-time visibility into:
- ICE connection state per peer
- Track receive status
- Audio/video playback state
- Network quality degradation

---

## Solution Architecture

### Phase 1: Database State Reset (Immediate)
Clean up participant records to ensure both users are marked as active when they enter the call.

### Phase 2: Add Remote Audio Playback
Create a dedicated `RemoteAudioPlayer` component that handles remote audio tracks separately from video.

### Phase 3: Fix Video Element Lifecycle
Add robust stream attachment with autoplay unlocking, track state validation, and retry logic.

### Phase 4: Track State Validation
Ensure all MediaStream tracks are "live" before adding to peer connections.

### Phase 5: TURN Server Upgrade Path
Add dynamic TURN credential fetching from Twilio (professional TURN service) with graceful fallback.

### Phase 6: Connection Health Dashboard
Add a real-time connection monitor showing ICE state, bitrate, packet loss, and track status.

---

## Detailed Implementation Plan

### Phase 1: Database Cleanup & Session Reset

**File: Database Migration**
```sql
-- Reset meeting to active state when host rejoins
CREATE OR REPLACE FUNCTION reset_meeting_on_host_rejoin()
RETURNS TRIGGER AS $$
BEGIN
  -- If host is rejoining and meeting is completed, reset to in_progress
  IF NEW.user_id IN (
    SELECT host_id FROM meetings WHERE id = NEW.meeting_id AND status = 'completed'
  ) AND NEW.left_at IS NULL THEN
    UPDATE meetings
    SET status = 'in_progress'
    WHERE id = NEW.meeting_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reset_meeting_on_host_rejoin_trigger
AFTER UPDATE ON meeting_participants
FOR EACH ROW
EXECUTE FUNCTION reset_meeting_on_host_rejoin();
```

**File: `src/pages/MeetingRoom.tsx`**
- On join, explicitly reset any stale `left_at` timestamps for current user
- Query for active participants (not just presence check)

### Phase 2: Remote Audio Playback Component

**New File: `src/components/meetings/RemoteAudioRenderer.tsx`**
```typescript
/**
 * Dedicated component for playing remote audio tracks
 * Handles autoplay restrictions and browser audio contexts
 */
import { useEffect, useRef } from 'react';
import { useAudioUnlock } from '@/hooks/useAudioUnlock';

interface RemoteAudioRendererProps {
  stream: MediaStream;
  participantId: string;
  participantName: string;
  volume?: number;
}

export function RemoteAudioRenderer({ 
  stream, 
  participantId, 
  participantName,
  volume = 1.0 
}: RemoteAudioRendererProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { registerAudioElement } = useAudioUnlock();

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !stream) return;

    const audioTracks = stream.getAudioTracks();
    console.log(`[RemoteAudio] Setting up audio for ${participantName}`, {
      streamId: stream.id,
      audioTracks: audioTracks.length,
      trackStates: audioTracks.map(t => ({
        id: t.id,
        enabled: t.enabled,
        readyState: t.readyState,
        muted: t.muted
      }))
    });

    // Attach stream
    audio.srcObject = stream;
    audio.volume = volume;

    // Register with autoplay unlock system
    const unregister = registerAudioElement(audio);

    // Attempt to play
    const playPromise = audio.play();
    if (playPromise) {
      playPromise
        .then(() => {
          console.log(`[RemoteAudio] ✅ Playing audio for ${participantName}`);
        })
        .catch(err => {
          console.warn(`[RemoteAudio] ⚠️ Autoplay blocked for ${participantName}, will retry on interaction:`, err);
        });
    }

    return () => {
      audio.pause();
      audio.srcObject = null;
      unregister();
    };
  }, [stream, participantId, participantName, volume, registerAudioElement]);

  return (
    <audio
      ref={audioRef}
      autoPlay
      playsInline
      style={{ display: 'none' }}
    />
  );
}
```

### Phase 3: Enhanced Video Element with Retry Logic

**File: `src/components/video-call/ParticipantTile.tsx`** (lines 33-65)

Current code has no retry or autoplay handling:
```typescript
useEffect(() => {
  if (videoRef.current && participant.stream) {
    videoRef.current.srcObject = participant.stream;
    // ... basic event handlers
  }
}, [participant.stream]);
```

Replace with:
```typescript
useEffect(() => {
  const video = videoRef.current;
  if (!video || !participant.stream) {
    setIsLoading(false);
    return;
  }

  const stream = participant.stream;
  const videoTracks = stream.getVideoTracks();
  
  console.log(`[ParticipantTile] 🎬 Attaching stream for ${participant.display_name}`, {
    streamId: stream.id,
    videoTracks: videoTracks.length,
    audioTracks: stream.getAudioTracks().length,
    trackStates: stream.getTracks().map(t => ({
      kind: t.kind,
      enabled: t.enabled,
      readyState: t.readyState,
      muted: t.muted
    }))
  });

  // Verify video track is live before attaching
  if (videoTracks.length === 0) {
    console.warn(`[ParticipantTile] ⚠️ No video tracks for ${participant.display_name}`);
    setIsLoading(false);
    return;
  }

  const videoTrack = videoTracks[0];
  if (videoTrack.readyState !== 'live') {
    console.warn(`[ParticipantTile] ⚠️ Video track not live for ${participant.display_name}:`, videoTrack.readyState);
    
    // Wait for track to become live
    const onLive = () => {
      console.log(`[ParticipantTile] ✅ Video track now live for ${participant.display_name}`);
      attachStream();
    };
    videoTrack.addEventListener('unmute', onLive);
    return () => videoTrack.removeEventListener('unmute', onLive);
  }

  const attachStream = async () => {
    try {
      video.srcObject = stream;
      
      // Force play with retry logic
      let retries = 0;
      const attemptPlay = async () => {
        try {
          await video.play();
          console.log(`[ParticipantTile] ✅ Video playing for ${participant.display_name}`);
          setIsLoading(false);
        } catch (err: any) {
          if (err.name === 'NotAllowedError' && retries < 3) {
            console.warn(`[ParticipantTile] ⚠️ Autoplay blocked, retry ${retries + 1}/3`);
            retries++;
            setTimeout(attemptPlay, 500);
          } else {
            console.error(`[ParticipantTile] ❌ Video play failed for ${participant.display_name}:`, err);
            setIsLoading(false);
          }
        }
      };

      video.onloadedmetadata = attemptPlay;
      
    } catch (error) {
      console.error(`[ParticipantTile] ❌ Failed to attach stream:`, error);
      setIsLoading(false);
    }
  };

  attachStream();

  return () => {
    video.pause();
    video.srcObject = null;
  };
}, [participant.stream, participant.display_name]);
```

### Phase 4: Track State Validation in WebRTC Hook

**File: `src/hooks/useMeetingWebRTC.ts`** (line 336-340)

Current code adds tracks without validation:
```typescript
currentStream.getTracks().forEach(track => {
  pc.addTrack(track, currentStream);
});
```

Replace with:
```typescript
// Verify tracks are ready before adding
const tracksToAdd = currentStream.getTracks().filter(track => {
  const isReady = track.readyState === 'live' && track.enabled;
  if (!isReady) {
    console.warn('[WebRTC] ⚠️ Skipping track (not ready):', {
      kind: track.kind,
      readyState: track.readyState,
      enabled: track.enabled,
      muted: track.muted
    });
  }
  return isReady;
});

if (tracksToAdd.length === 0) {
  console.error('[WebRTC] ❌ No live tracks available to add to peer connection!');
  throw new Error('No live media tracks available');
}

tracksToAdd.forEach(track => {
  console.log('[WebRTC] ✅ Adding live track:', track.kind, track.id);
  const sender = pc.addTrack(track, currentStream);
  
  // Monitor track state
  track.onended = () => {
    console.warn('[WebRTC] ⚠️ Track ended:', track.kind, track.id);
  };
  track.onmute = () => {
    console.warn('[WebRTC] ⚠️ Track muted:', track.kind, track.id);
  };
  track.onunmute = () => {
    console.log('[WebRTC] ✅ Track unmuted:', track.kind, track.id);
  };
});
```

### Phase 5: Remote Audio Rendering in VideoGrid

**File: `src/components/video-call/VideoGrid.tsx`** (after line 212)

Add audio renderers for all remote participants:
```typescript
{/* Render audio separately for all remote participants */}
{participants
  .filter(p => p.stream && p.id !== localParticipant?.id)
  .map(p => (
    <RemoteAudioRenderer
      key={`audio-${p.id}`}
      stream={p.stream!}
      participantId={p.id}
      participantName={p.display_name}
    />
  ))
}
```

### Phase 6: TURN Server Reliability (Optional Enhancement)

**New File: `supabase/functions/turn-credentials/index.ts`**

Already exists! The system has a TURN credentials edge function that fetches from Twilio. Need to:

1. Ensure Twilio credentials are configured (check secrets)
2. Update `webrtcConfig.ts` to call this edge function on startup
3. Refresh credentials every 50 minutes (before 1-hour expiry)

**File: `src/utils/webrtcConfig.ts`** (add new function):
```typescript
let cachedTURNCredentials: {
  iceServers: RTCIceServer[];
  expiresAt: string;
} | null = null;

export const fetchDynamicTURNCredentials = async (): Promise<RTCIceServer[]> => {
  try {
    const response = await supabase.functions.invoke('turn-credentials');
    
    if (response.data && response.data.iceServers) {
      cachedTURNCredentials = response.data;
      logger.info('[WebRTC] 🔒 Fetched dynamic TURN credentials', {
        provider: response.data.provider,
        servers: response.data.iceServers.length,
        expiresAt: response.data.expiresAt
      });
      return response.data.iceServers;
    }
    
    throw new Error('No ICE servers in response');
  } catch (error) {
    logger.error('[WebRTC] ❌ Failed to fetch TURN credentials, using fallback:', error);
    return getIceServers(); // Fallback to static config
  }
};
```

### Phase 7: Connection Health Monitor (UI Component)

**New File: `src/components/meetings/ConnectionHealthMonitor.tsx`**
```typescript
/**
 * Real-time connection health display
 * Shows ICE state, bitrate, packet loss for each peer
 */
export function ConnectionHealthMonitor({ 
  peerConnections 
}: { 
  peerConnections: Map<string, RTCPeerConnection> 
}) {
  const [stats, setStats] = useState<Map<string, {
    iceState: string;
    bitrate: number;
    packetLoss: number;
  }>>(new Map());

  useEffect(() => {
    const interval = setInterval(async () => {
      const newStats = new Map();
      
      for (const [peerId, pc] of peerConnections.entries()) {
        const stats = await pc.getStats();
        let bitrate = 0;
        let packetLoss = 0;
        
        stats.forEach(report => {
          if (report.type === 'inbound-rtp') {
            bitrate = report.bytesReceived || 0;
            packetLoss = report.packetsLost || 0;
          }
        });
        
        newStats.set(peerId, {
          iceState: pc.iceConnectionState,
          bitrate,
          packetLoss
        });
      }
      
      setStats(newStats);
    }, 2000);

    return () => clearInterval(interval);
  }, [peerConnections]);

  // Render connection badges
  return (
    <div className="absolute top-4 right-4 flex gap-2">
      {Array.from(stats.entries()).map(([peerId, stat]) => (
        <Badge 
          key={peerId}
          variant={stat.iceState === 'connected' ? 'default' : 'destructive'}
        >
          {stat.iceState}
        </Badge>
      ))}
    </div>
  );
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| **Database Migration** | Add trigger to reset meeting status when host rejoins |
| `src/components/meetings/RemoteAudioRenderer.tsx` | **NEW** - Dedicated audio playback component |
| `src/components/video-call/ParticipantTile.tsx` | Add track state validation, autoplay retry, and error recovery |
| `src/hooks/useMeetingWebRTC.ts` | Validate track readyState before adding to peer connections |
| `src/components/video-call/VideoGrid.tsx` | Render RemoteAudioRenderer for each remote participant |
| `src/utils/webrtcConfig.ts` | Add dynamic TURN credential fetching (optional) |
| `src/components/meetings/ConnectionHealthMonitor.tsx` | **NEW** - Real-time connection monitor |

---

## Testing Checklist

After implementation, verify:

✅ **Host can join** - No "Waiting for Host" errors  
✅ **Guest can join** - RLS allows insertion after host presence  
✅ **Video appears** - Both participants see each other's video  
✅ **Audio works** - Both participants hear each other  
✅ **Connection stable** - No disconnections during 5-minute call  
✅ **Rejoin works** - Both users can leave and rejoin without issues  
✅ **Network resilience** - Call continues on moderate packet loss  
✅ **Browser autoplay** - Video/audio play despite autoplay restrictions  

---

## Expected Results

| Issue | Before | After |
|-------|--------|-------|
| Can see each other | ❌ No | ✅ Yes |
| Can hear each other | ❌ No | ✅ Yes |
| Connection stability | ❌ Unstable, kicked out | ✅ Stable for duration of call |
| Autoplay blocked | ❌ Videos don't play | ✅ Retry logic handles autoplay blocks |
| Track state validation | ❌ Dead tracks added to PC | ✅ Only live tracks added |
| TURN reliability | ⚠️ Free servers, unreliable | ✅ Enterprise TURN with fallback |
| Error visibility | ❌ Silent failures | ✅ Health monitor shows connection state |

---

## Why This Fixes The Problem

### Root Cause → Solution Mapping

1. **"Can't hear each other"** → Add `RemoteAudioRenderer` component
   - Video element doesn't play audio tracks
   - Separate audio element required for remote audio
   - Autoplay unlock handles browser restrictions

2. **"Video doesn't load"** → Track state validation + retry logic
   - Wait for tracks to be in "live" state
   - Retry autoplay if blocked
   - Error recovery instead of silent failure

3. **"Kicked out when other joins"** → Already fixed in previous iteration
   - Host presence detection with 60s window
   - Heartbeat clears `left_at` flag
   - RLS allows join when host is active

4. **"Connection unstable"** → TURN server upgrade
   - Dynamic credentials from Twilio (enterprise-grade)
   - Fallback to community servers if Twilio fails
   - Better NAT traversal success rate

5. **"No visibility into problems"** → Connection health monitor
   - Real-time ICE state display
   - Bitrate and packet loss metrics
   - Early warning of connection degradation

---

## Technical Context

### Why ParticipantTile Only Has Video Element

The original implementation assumed the `<video>` element would play both video and audio tracks from the MediaStream. This works for *local* streams (where `muted={true}` is set), but for *remote* streams, browsers require explicit audio playback.

### Why Autoplay Fails

Modern browsers block autoplay unless:
1. User has interacted with the page
2. Media is muted
3. Document has received a user gesture

The `useAudioUnlock` hook handles this by registering audio elements and playing them on first user interaction.

### Why Track Validation Matters

MediaStream tracks can be in states:
- `live` - Ready to transmit/receive
- `ended` - No longer usable
- `muted` - Temporarily paused

Adding a track that's not `live` to a peer connection causes the connection to negotiate, but no actual media flows.

### WebRTC Connection Flow

```
Host Joins → Media Ready → Send "join" signal
  ↓
Guest Receives "join" → Creates PeerConnection → Sends Offer
  ↓
Host Receives Offer → Sends Answer + ICE Candidates
  ↓
ICE Negotiation → Connection Established
  ↓
Tracks Flow → Video Element Renders Video
                Audio Element Plays Audio
```

The fix ensures every step completes before proceeding to the next.
