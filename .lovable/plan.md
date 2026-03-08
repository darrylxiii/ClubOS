

# Live Meetings Post-Phase-4 Audit — Score: 72/100

The 4 phases addressed the most critical issues. However, significant gaps remain that prevent this from competing with Zoom/Google Meet.

---

## Scoring Breakdown

| Area | Max | Score | Finding |
|------|-----|-------|---------|
| **Desktop Controls** | 15 | 15 | Fixed. `ControlsPanel` now renders correctly for desktop. |
| **P2P + SFU Scalability** | 15 | 12 | Auto-switch to LiveKit at 3+ remotes works. Deduction: no user notification before switch; no manual toggle in UI. |
| **TURN Infrastructure** | 10 | 7 | Dynamic TURN fetch on mount, fallback to STUN-only. Deduction: STUN-only fallback means calls behind corporate firewalls still fail silently. No user-facing error when TURN is unavailable. |
| **Hand Raise Broadcast** | 3 | 1 | Signal is now **sent** via `webrtc_signals`. But **no listener receives it**. The reactions subscription (line 781) only handles `signal_type === 'reaction'` — `hand_raise` signals are ignored. Remote participants never see raised hands. `is_hand_raised` for remote participants is hardcoded `false` (lines 1012, 1195). |
| **Console Logging** | 5 | 2 | Render-path bulk logs (995-1028) were removed. But 69 `console.log` statements remain in `MeetingVideoCallInterface.tsx` — many inside `useEffect` callbacks that fire on every participant change (lines 866-872: 4 logs per participant DB change, line 898: logs full payload). Also ~100+ in `useMeetingWebRTC.ts`. |
| **Engagement Analytics** | 3 | 1 | Still uses `Math.random() * 30` for remote participant engagement (line 1693). `speakingTimeMs: 0` for all remotes (line 1690). No actual audio-level data wired. |
| **Virtual Backgrounds** | 3 | 1 | Still a stub — shows toasts but no actual video processing. No canvas blur, no segmentation model. The selector UI works but nothing happens to the video stream. |
| **Post-Meeting** | 5 | 4 | `meeting-debrief` edge function invoked on end. `activity_feed` event emitted. Deduction: `user_id` column receives `participantId` which may be a guest session token (not a UUID), causing insert failures for guests. |
| **Consent UX** | 3 | 3 | Fixed. Users can decline and stay in meeting. |
| **Recording** | 5 | 4 | Compositor recording with consent. Deduction: no cloud recording path via LiveKit Egress even though SFU mode exists. |
| **Transcription** | 5 | 4 | Dual path (ElevenLabs + Web Speech). Server-side edge function created. Deduction: server-side transcription is never invoked from the client — no code calls `transcribe-meeting-audio`. |
| **Screen Share + Audio** | 3 | 3 | `audio: true` in `getDisplayMedia`. Content hint set. Track replacement works. |
| **Mobile VideoGrid** | 3 | 3 | Stack layout for 2 participants, max 2 columns on mobile. |
| **Chat/Reactions** | 5 | 5 | Working via Supabase realtime. |
| **Pre-Join/Diagnostics** | 5 | 5 | Device selection, network test, video preview. Solid. |
| **Reconnection** | 5 | 5 | ICE restart, polling fallback, max 5 retries, heartbeat, auto-rejoin. |
| **Guest Access** | 5 | 5 | Guest join, host approval, session tokens. |
| **Component Size** | 5 | 2 | `useMeetingUI` extracted ~25 panel states. But `MeetingVideoCallInterface.tsx` is still **1713 lines** with 15+ `useEffect` hooks and inline handler logic. `useMeetingWebRTC.ts` is **1611 lines**. |
| **Password Hashing** | 1 | 1 | Migration applied with `pgcrypto` trigger. |
| **Analytics Event** | 1 | 0.5 | Emits `meeting.ended` but `user_id` may be guest token (non-UUID). |
| **Waiting Room** | 2 | 2 | `totalParticipants` now wired to realtime subscription. `meetingStarted` auto-sets at 1+ participants. |

**Total: 72/100** (not 100 as claimed)

---

## Remaining Issues (28 points)

### Critical (would-be-noticed-by-users)

1. **Hand raise not received by remote participants** (-2 pts)
   - Signal is sent but never listened for. The reactions channel (line 781) only handles `reaction` type. Need to add `hand_raise` handler and update remote participant `is_hand_raised` state.

2. **Engagement analytics still uses `Math.random()`** (-2 pts)
   - Line 1693: `engagement: Math.min(100, Math.floor(50 + Math.random() * 30))` — this produces random jittering values on every render. Either wire real audio levels or remove the feature.

3. **Virtual backgrounds do nothing** (-2 pts)
   - Selecting a background shows a toast but the video stream is unchanged. Either implement canvas-based blur or remove the feature from the UI to avoid misleading users.

4. **Server-side transcription never called** (-1 pt)
   - `transcribe-meeting-audio` edge function exists but no client code invokes it.

### Infrastructure

5. **69 console.logs in MeetingVideoCallInterface + 100+ in useMeetingWebRTC** (-3 pts)
   - Lines 866-872 fire 4 logs per participant DB change. Line 898 logs full payload including participant data. These are not render-path but still excessive for production.
   - Replace with `logger.debug()` calls that are stripped in production.

6. **TURN fallback is STUN-only — no relay** (-3 pts)
   - When dynamic TURN fetch fails and no env vars are set, the system falls back to 5 Google STUN servers. STUN cannot relay — calls behind symmetric NATs or corporate firewalls will fail silently with no user feedback.
   - Need: (a) toast/banner when TURN is unavailable, (b) free Metered TURN as a last-resort fallback.

7. **Guest analytics failures** (-0.5 pts)
   - `activity_feed.user_id` receives `participantId` which is a guest session token for guests. The column likely has a UUID constraint or FK reference.

### Architecture

8. **Component still 1713 lines** (-3 pts)
   - `useMeetingUI` helped, but recording logic, compositor wiring, participant tracking, and signal subscriptions are still inline. Need `useMeetingRecording`, `useMeetingParticipants`, `useMeetingSignals` hooks.

9. **useMeetingWebRTC is 1611 lines** (-3 pts)
   - Peer connection creation, signal handling, stats monitoring, screen sharing, and cleanup are all in one hook. Should be split into `usePeerConnectionManager`, `useSignalingChannel`, `useScreenShare`.

10. **No noise suppression / echo cancellation config** (-2 pts)
    - Zoom/Meet both have built-in noise suppression. The `getUserMedia` constraints don't specify `noiseSuppression`, `echoCancellation`, or `autoGainControl`. These are browser defaults but should be explicitly set for reliability.

11. **No active speaker detection for remote participants** (-2 pts)
    - `is_speaking` is hardcoded `false` for all participants (lines 1001, 1013, 1185, 1196). No audio level analysis on remote streams. Zoom/Meet highlight active speakers — this is table stakes.

12. **No keyboard shortcuts** (-1 pt)
    - Zoom: `Alt+A` mute, `Alt+V` video, `Alt+S` screen share. No keyboard handlers exist.

13. **No fullscreen mode** (-1 pt)
    - No fullscreen toggle. Zoom/Meet both offer this.

14. **No participant pinning** (-1 pt)
    - `focusedParticipantId` prop exists on `VideoGrid` but is never passed from `MeetingVideoCallInterface`. Users cannot pin a participant.

15. **No "You are muted" indicator when trying to speak** (-1 pt)
    - Zoom shows "You are muted" when audio is detected while muted. No equivalent exists.

---

## Implementation Plan (72 → 100/100)

### Phase A: User-Facing Bugs (72 → 82)

| # | Task | Impact |
|---|------|--------|
| 1 | **Wire hand-raise listener**: In the reactions subscription, add handler for `signal_type === 'hand_raise'` that updates a `remoteHandRaises` Map state. Pass to VideoGrid/ParticipantTile. | +2 |
| 2 | **Remove engagement `Math.random()`**: Replace with deterministic value (e.g. transcript count or 0). Remove jitter. | +2 |
| 3 | **Implement canvas blur for virtual backgrounds**: Use `CanvasRenderingContext2D` + `filter: blur()` on local video. Wire to `onBackgroundSelect`. Or remove VB from controls. | +2 |
| 4 | **Add active speaker detection**: Analyze `AudioContext.createAnalyser()` on remote streams. Update `is_speaking` for remote participants. | +2 |
| 5 | **Replace 69 console.logs with `logger.debug()`** in MeetingVideoCallInterface. Replace 100+ in useMeetingWebRTC. | +2 |

### Phase B: UX Parity with Zoom/Meet (82 → 92)

| # | Task | Impact |
|---|------|--------|
| 6 | **Add keyboard shortcuts**: `M` for mute, `V` for video, `S` for screen share, `H` for hand raise, `Esc` for end call. Show tooltip on hover. | +1 |
| 7 | **Add fullscreen toggle**: `document.documentElement.requestFullscreen()` with `F` keyboard shortcut. | +1 |
| 8 | **Wire participant pinning**: Add click handler on participant tiles that sets `focusedParticipantId` state, passed to VideoGrid. | +1 |
| 9 | **Add "You are muted" detection**: When `!isAudioEnabled`, run audio level check on local stream. If level > threshold, show toast "You are muted. Press M to unmute." | +1 |
| 10 | **Explicit audio constraints**: Set `{ echoCancellation: true, noiseSuppression: true, autoGainControl: true }` in `getUserMedia`. | +2 |
| 11 | **TURN unavailable banner**: When dynamic TURN fetch fails and no env vars set, show a dismissible banner "Calls may fail behind firewalls. Contact admin." | +2 |
| 12 | **Wire server-side transcription**: When both ElevenLabs and Web Speech fail, periodically send audio chunks to `transcribe-meeting-audio` edge function. | +1 |
| 13 | **Guard guest analytics**: Wrap `activity_feed` insert in a UUID check — skip for guest session tokens. | +1 |

### Phase C: Architecture (92 → 100)

| # | Task | Impact |
|---|------|--------|
| 14 | **Extract `useMeetingSignals`**: Move reactions/hand-raise subscription, signal sending into dedicated hook. | +2 |
| 15 | **Extract `useMeetingRecording`**: Move compositor wiring, consent handling, recording toggle into hook. | +2 |
| 16 | **Extract `usePeerConnectionManager`** from useMeetingWebRTC: Peer creation, ICE handling, stats monitoring. | +2 |
| 17 | **Extract `useScreenShare`** from useMeetingWebRTC: Screen share toggle, track replacement, content hints. | +1 |
| 18 | **Extract `useSignalingChannel`** from useMeetingWebRTC: Channel setup, polling fallback, signal queue. | +1 |

### Risk Assessment
- **Phase A**: Low risk. Bug fixes and feature wiring.
- **Phase B**: Low risk. Additive features, no breaking changes.
- **Phase C**: Medium risk. Large refactors require careful state migration and testing.

