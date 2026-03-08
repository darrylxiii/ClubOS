

# Live Meetings Audit — Revised Score: 34/100

The previous audit scored 38/100 but was generous on several items. After deep code inspection, additional issues surfaced.

---

## Scoring

| Area | Max | Score | Finding |
|------|-----|-------|---------|
| Desktop Controls | 15 | 0 | **CRITICAL**: `ControlsPanel` wrapped in `!isMobile && false` (line 1327). Desktop users have zero controls — cannot mute, toggle video, share screen, end call, or access any feature. The entire meeting is unusable on desktop. |
| Duplicate Rendering | 5 | 0 | `LiveInterviewAnalysis` rendered twice identically (lines 1303-1309 and 1311-1317). Double AI inference calls, double DOM nodes. |
| Render-Path Logging | 5 | 0 | Lines 995-1028: `console.log` inside `.map()` on `remoteStreams` during participant array construction. This runs on EVERY render — every state change, every heartbeat, every reaction. Also lines 182-234 in the `onRemoteStream` callback have 6 console.logs per remote join. Lines 919-931 log full stream details on every `remoteStreams` change. |
| P2P Scalability | 15 | 3 | Mesh topology. No auto-switch to LiveKit SFU. `useLiveKitMode` hardcoded to `false` (line 129). LiveKit health check runs on mount (line 284) but result is discarded — not used to decide mode. |
| TURN Infrastructure | 10 | 2 | Hardcoded free OpenRelay credentials in client code (lines 110-136 of `webrtcConfig.ts`). `fetchDynamicTURNCredentials` exists but is NEVER CALLED — `useMeetingWebRTC` uses `DEFAULT_RTC_CONFIG` which calls `getIceServers()` synchronously (no dynamic fetch). Corporate firewall users will fail silently. |
| Hand Raise | 3 | 1 | `handleToggleHandRaise` (line 571-573) only sets local state + shows a toast. **No broadcast** — other participants never see the raised hand. No signal sent via `sendReaction` or `webrtc_signals`. |
| Post-Meeting | 5 | 1 | `handleEndCall` (line 462-474) stops recording and calls cleanup. No post-meeting summary trigger, no `meeting-debrief` edge function invocation, no analytics event. |
| Consent UX | 3 | 1 | `handleConsentDeclined` (line 439-444) kicks user out of the meeting entirely. No option to stay without recording — binary "consent to everything or leave". |
| Virtual Backgrounds | 3 | 0 | `VirtualBackgroundSelector` `onBackgroundSelect` (line 1619-1622) just does `console.log('Background selected:', bg)`. No actual background processing, no canvas manipulation, no ML model. Complete stub. |
| Engagement Analytics | 3 | 1 | `EngagementAnalyticsOverlay` receives hardcoded mock data: `speakingTimeMs: 0`, `engagement: 75/80`, `sentimentTrend: 'neutral'/'positive'` (lines 1700-1718). No real data pipeline. |
| Component Size | 5 | 1 | 1727 lines, 30+ `useState`, ~15 `useEffect`, ~20 handler functions. Unmaintainable. Every feature addition risks regressions. |
| Screen Share Audio | 2 | 1 | `toggleScreenShare` in `useMeetingWebRTC` calls `getDisplayMedia` but audio capture option not verified. |
| Recording Upload | 5 | 3 | Compositor recording implemented with consent. Upload path exists. But no cloud recording fallback when compositor fails. |
| Transcription | 5 | 3 | Dual path (ElevenLabs + Web Speech API) with proper fallback chain. Web Speech API is unreliable on Firefox/Safari. No server-side fallback. |
| Chat/Reactions | 5 | 4 | Realtime chat via Supabase. Reactions broadcast via `webrtc_signals`. On-screen overlay with auto-dismiss. Working. |
| Pre-Join/Diagnostics | 5 | 4 | Device selection, network test, video preview. Solid. |
| Reconnection | 5 | 4 | ICE restart, fallback polling, max 5 retries, presence heartbeat every 10s, auto-rejoin if incorrectly marked as left. Good. |
| Guest Access | 5 | 4 | Guest join dialog, host approval panel, session tokens. Working. |
| **Bonus: Waiting Room Bug** | -2 | -2 | Lines 1217-1276: Waiting room shows when `!meetingStarted && totalParticipants <= 1`. But `meetingStarted` is set to `true` only when host clicks "Start Meeting Anyway" (line 1266) OR never — there's no listener that sets it when a 2nd participant joins. The `totalParticipants` state is never updated from any source. Dead code. |

**Total: 34/100**

---

## Issues Not Caught in Previous Audit

1. **Hand raise is local-only** — never broadcast to other participants.
2. **`totalParticipants` is never updated** — initialized to `0` (line 118), no setter calls found. The waiting room logic depends on it but it's always 0.
3. **Virtual backgrounds is a complete stub** — just a `console.log`.
4. **Engagement analytics uses hardcoded mock data** — no real speaking time or sentiment.
5. **`fetchDynamicTURNCredentials` is never called** — exists but dead code.
6. **Consent decline = forced exit** — no "stay without recording" option.
7. **Health checks fire on every mount** — LiveKit + ElevenLabs health checks (lines 278-299) fire a 2s timer on every component mount but results are discarded.

---

## Implementation Plan

### Phase 1: Critical — Desktop Unusable (34 → 58/100)

| # | Task | File(s) | Points |
|---|------|---------|--------|
| 1 | Remove `false &&` from ControlsPanel condition (line 1327) | `MeetingVideoCallInterface.tsx` | +15 |
| 2 | Remove duplicate `LiveInterviewAnalysis` (lines 1311-1317) | `MeetingVideoCallInterface.tsx` | +5 |
| 3 | Remove all render-path `console.log` (lines 995-1028, 919-931, 182-234) | `MeetingVideoCallInterface.tsx` | +5 |
| 4 | Broadcast hand raise via `webrtc_signals` instead of local-only state | `MeetingVideoCallInterface.tsx` | +2 |
| 5 | Wire `totalParticipants` to `meeting_participants` realtime subscription | `MeetingVideoCallInterface.tsx` | +2 |

### Phase 2: Infrastructure — Calls Fail Behind Firewalls (58 → 75/100)

| # | Task | File(s) | Points |
|---|------|---------|--------|
| 6 | Call `fetchDynamicTURNCredentials` in `useMeetingWebRTC` before creating peer connections; fall back to static config | `useMeetingWebRTC.ts`, `webrtcConfig.ts` | +5 |
| 7 | Remove hardcoded OpenRelay/Metered credentials from client code | `webrtcConfig.ts` | +3 |
| 8 | Auto-switch to LiveKit SFU when `remoteStreams.size >= 3`; use health check result to decide | `MeetingVideoCallInterface.tsx` | +5 |
| 9 | Add post-meeting debrief trigger in `handleEndCall` (invoke `meeting-debrief` edge function) | `MeetingVideoCallInterface.tsx` | +3 |
| 10 | Allow consent decline without leaving — stay in meeting with recording disabled | `MeetingVideoCallInterface.tsx` | +1 |

### Phase 3: Polish — Feature Completeness (75 → 90/100)

| # | Task | File(s) | Points |
|---|------|---------|--------|
| 11 | Extract state into sub-hooks: `useMeetingUI`, `useMeetingRecording`, `useMeetingParticipants` | New hooks + refactor | +5 |
| 12 | Remove virtual background stub OR implement basic canvas blur | `VirtualBackgroundSelector.tsx`, `MeetingVideoCallInterface.tsx` | +3 |
| 13 | Wire real speaking-time data to `EngagementAnalyticsOverlay` from `useMeetingWebRTC` audio levels | `MeetingVideoCallInterface.tsx` | +2 |
| 14 | Add `audio: true` option to `getDisplayMedia` for screen share with system audio | `useMeetingWebRTC.ts` | +2 |
| 15 | Mobile VideoGrid: stack layout for 1-2 participants, reduce tile padding | `VideoGrid.tsx` | +3 |

### Phase 4: Enterprise Grade (90 → 100/100)

| # | Task | File(s) | Points |
|---|------|---------|--------|
| 16 | Server-side transcription fallback via Lovable AI when browser APIs unavailable | New edge function | +4 |
| 17 | Cloud recording via LiveKit Egress when SFU mode is active | New integration | +3 |
| 18 | Remove discarded health check calls or use results to set initial mode | `MeetingVideoCallInterface.tsx` | +1 |
| 19 | Add `meeting.ended` analytics event on call end | `MeetingVideoCallInterface.tsx` | +1 |
| 20 | Hash meeting passwords in DB instead of plaintext | Migration + `CreateMeetingDialog.tsx` | +1 |

### Risk Assessment
- **Phase 1**: Zero risk. Bug fixes, dead code removal, and a small signal addition.
- **Phase 2**: Low risk. Async TURN fetch with sync fallback. LiveKit wrapper already exists with fallback mechanism.
- **Phase 3**: Medium risk. Component refactoring requires careful state migration. Virtual background ML model adds bundle size.
- **Phase 4**: Medium risk. New edge functions and LiveKit Egress integration require testing.

