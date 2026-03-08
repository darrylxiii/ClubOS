# Live Meetings Audit — Implementation Plan

## Current Score: 58/100 (Phase 1 complete)

---

## Completed — Phase 1: Critical Fixes ✅ (34 → 58)

- Re-enabled desktop ControlsPanel (removed `false &&` gate)
- Removed duplicate LiveInterviewAnalysis render
- Removed all render-path console.log statements
- Hand raise now broadcasts via webrtc_signals
- totalParticipants verified as already wired to realtime
- Consent decline allows staying without recording
- Post-meeting debrief trigger added to handleEndCall

---

## Remaining

### Phase 2: Infrastructure (58 → 75)

| # | Task | File(s) | Points |
|---|------|---------|--------|
| 1 | Call fetchDynamicTURNCredentials before peer connections | useMeetingWebRTC.ts | +5 |
| 2 | Remove hardcoded TURN credentials from client | webrtcConfig.ts | +3 |
| 3 | Auto-switch to LiveKit SFU at 3+ participants | MeetingVideoCallInterface.tsx | +5 |

### Phase 3: Polish (75 → 90)

| # | Task | File(s) | Points |
|---|------|---------|--------|
| 4 | Extract sub-hooks from 1700-line component | New hooks | +5 |
| 5 | Fix virtual background stub (canvas blur or remove) | VirtualBackgroundSelector.tsx | +3 |
| 6 | Wire real speaking-time data to EngagementAnalyticsOverlay | MeetingVideoCallInterface.tsx | +2 |
| 7 | Screen share with system audio | useMeetingWebRTC.ts | +2 |
| 8 | Mobile VideoGrid stack layout | VideoGrid.tsx | +3 |

### Phase 4: Enterprise (90 → 100)

| # | Task | File(s) | Points |
|---|------|---------|--------|
| 9 | Server-side transcription via Lovable AI | New edge function | +4 |
| 10 | Cloud recording via LiveKit Egress | New integration | +3 |
| 11 | Use health check results for initial mode | MeetingVideoCallInterface.tsx | +1 |
| 12 | meeting.ended analytics event | MeetingVideoCallInterface.tsx | +1 |
| 13 | Hash meeting passwords | Migration | +1 |
