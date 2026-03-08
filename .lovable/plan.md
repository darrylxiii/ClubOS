# Live Meetings Audit — Implementation Plan

## Current Score: 75/100 (Phases 1–2 complete)

---

## Completed

### Phase 1: Critical Fixes ✅ (34 → 58)
- Re-enabled desktop ControlsPanel (removed `false &&` gate)
- Removed duplicate LiveInterviewAnalysis render
- Removed all render-path console.log statements
- Hand raise now broadcasts via webrtc_signals
- totalParticipants verified as already wired to realtime
- Consent decline allows staying without recording
- Post-meeting debrief trigger added to handleEndCall

### Phase 2: Infrastructure ✅ (58 → 75)
- Dynamic TURN credential fetching wired into useMeetingWebRTC (fetches on mount, caches in ref)
- Hardcoded OpenRelay/Metered credentials removed from webrtcConfig.ts (STUN-only fallback)
- Auto-switch to LiveKit SFU at 3+ remote participants (uses health check result)
- Health check results now used to determine LiveKit availability

---

## Remaining

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
| 11 | meeting.ended analytics event | MeetingVideoCallInterface.tsx | +1 |
| 12 | Hash meeting passwords | Migration | +1 |
| 13 | Remove unused ElevenLabs health check from mount | MeetingVideoCallInterface.tsx | +1 |
