# Club Meetings System — Full Audit Plan

## Current Score: 82/100 (Phases A-F Complete)

---

## Completed

### Phase 1–4 (Original): 72/100 baseline
- All items from original plan completed.

### Phase A: User-Facing Bugs ✅ (72 → 82)
- Hand-raise listener, engagement analytics fix, active speaker detection, console logs cleanup, virtual backgrounds deferred

### Phase B: UX Parity ✅ (82 → 92)
- Keyboard shortcuts, fullscreen, participant pinning, muted speaking detection, audio constraints, guest analytics guard

### Phase C: Architecture ✅ (92 → 97)
- Extracted useSignalingChannel, usePeerConnectionManager, useMeetingScreenShare; refactored useMeetingWebRTC

### Phase D: Final Polish ✅ (97 → 100)
- Console logging cleaned, remote mute/video state sync, local is_speaking, virtual backgrounds stub, duplicate recording indicator, audio constraints verified

### Phase E: Feature Parity ✅ (Inflated 100 → recalibrated to 72)
- Meeting timer, gallery pagination, click-to-pin, ParticipantTile logging cleanup

### Phase F: Data Integrity ✅ (72 → 82)
- **Accumulated speaking time**: Ref-based tracking incremented every 200ms from `useAudioLevelMonitor` levels for both remote and local participants
- **Real connection quality per tile**: `peerStats` from `useMeetingConnectionQuality` passed through VideoGrid → ParticipantTile; bars now reflect actual RTT/packet loss (green/amber/red)
- **Real engagement analytics**: Removed all hardcoded values (`speakingTimeMs: 0`, `engagement: 85/60`, `sentimentTrend: 'neutral'`); now computed from accumulated speaking time ratios
- **Recording state unified**: Removed `isRecording` local state; `isCompositorRecording` is the single source of truth throughout
- **Virtual backgrounds hidden**: Button removed from both ControlsPanel and MobileMeetingControls; "Coming Soon" dialog removed
- **TURN-unavailable banner**: Dismissible banner shown when TURN relay credentials fail to load (STUN-only mode warning)

---

## Remaining (82 → 100)

### Phase G: Feature Parity (82 → 94)

| # | Task | Points |
|---|------|--------|
| 7 | Auto-pin active speaker in spotlight mode (2s debounce) | +1.5 |
| 8 | Meeting lock toggle for host (DB column + UI + join guard) | +1 |
| 9 | Raise hand queue with timestamps and ordered list | +1 |
| 10 | Chat file/image sharing via storage bucket | +1 |
| 11 | Bandwidth quality presets (HD/Standard/Low) | +1 |
| 12 | Server-side transcription fallback | +1 |
| 13 | Noise suppression UI toggle | +0.5 |
| 14 | Post-meeting summary email | +1 |
| 15 | AI action items extraction from transcript | +0.5 |
| 16 | Per-participant network quality tooltip (RTT/jitter on hover) | +1.5 |
| 17 | Gallery page keyboard navigation (arrow keys) | +0.5 |
| 18 | Mobile chat unread badge verification | +0.5 |

### Phase H: Polish (94 → 100)

| # | Task | Points |
|---|------|--------|
| 19 | SFU-mode cloud recording via LiveKit Egress API | +2 |
| 20 | Meeting history search and date filter | +1 |
| 21 | E2E encryption safety number dialog | +1 |
| 22 | `beforeunload` → `sendBeacon` for mobile cleanup | +0.5 |
| 23 | Guest cleanup heartbeat timeout (server-side) | +0.5 |
| 24 | Meeting summary card in history (duration, participants, topics) | +1 |
