# Club Meetings System — Full Audit Plan

## Current Score: 92/100 (In-Meeting) | Ecosystem: 82/100

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

### Phase G: Ecosystem Wiring ✅ (Ecosystem 65 → 77)
- **Bridge auto-trigger**: `bridge-meeting-to-intelligence` and `bridge-meeting-to-pilot` now automatically chain-called after `analyze-meeting-recording-advanced` completes
- **Deduplicated task creation**: Removed `unified_tasks` insert from `analyze-meeting-recording-advanced`; `bridge-meeting-to-pilot` is the single task creation path
- **Lovable AI migration**: `extract-candidate-performance` and `extract-hiring-manager-patterns` switched from `OPENAI_API_KEY` to Lovable AI gateway (`google/gemini-2.5-flash`)
- **Compile transcript on end**: `compile-meeting-transcript` now auto-triggered in `handleEndCall` before `meeting-debrief`
- **Candidate interview history**: `MeetingIntelligenceCard` now also queries `candidate_interview_recordings` for richer data from the analysis pipeline
- **Job interview recordings panel**: New `JobInterviewRecordingsPanel` component on the JobDashboard Analytics tab showing all interview recordings per role with scores and recommendations

---

## Remaining

### Phase G2: In-Meeting Feature Parity ✅ (82 → 92)
- Auto-pin active speaker in spotlight mode (2s debounce, user-pin override)
- Meeting lock toggle for host (DB column `is_locked` + HostSettingsPanel UI)
- Raise hand queue with timestamps and ordered list in ParticipantsPanel
- Bandwidth quality presets (HD/Standard/Low) in DeviceSelector
- Per-participant network quality tooltip (RTT/jitter/packetLoss/bitrate on hover)
- Gallery page keyboard navigation (arrow keys)
- Noise suppression UI toggle in DeviceSelector

### Phase H: Polish (92 → 100)

| # | Task | Points |
|---|------|--------|
| 19 | SFU-mode cloud recording via LiveKit Egress API | +2 |
| 20 | Meeting history search and date filter | +1 |
| 21 | E2E encryption safety number dialog | +1 |
| 22 | `beforeunload` → `sendBeacon` for mobile cleanup | +0.5 |
| 23 | Guest cleanup heartbeat timeout (server-side) | +0.5 |
| 24 | Meeting summary card in history (duration, participants, topics) | +1 |

### Phase I: Ecosystem Completeness (77 → 100)

| # | Task | Impact |
|---|------|--------|
| 25 | Auto-trigger post-meeting follow-up generation | No manual click |
| 26 | Pre-meeting prep auto-push (30min before) | Interviewers prepared |
| 27 | Auto-advance pipeline stage on strong_yes recommendation | Close recruitment loop |
| 28 | Recording chapters from AI topic transitions | Smart playback navigation |
| 29 | Interview Comparison Matrix page | Better hiring decisions |
| 30 | Meeting cost calculator on meeting cards | ROI awareness |
| 31 | Date range filter on MeetingHistoryTab | Basic UX |
| 32 | Candidate meeting portal | Candidate experience |
