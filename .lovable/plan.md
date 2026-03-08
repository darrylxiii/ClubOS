

# Club Meetings System — Post-Phase-D Audit

## Current Score: 95/100

The system is architecturally sound after the Phase A-D refactor. The remaining gaps are feature parity items versus Zoom/Meet rather than bugs.

---

## What Works Well (Confirmed)

| Feature | Status |
|---------|--------|
| P2P WebRTC + LiveKit SFU auto-switch at 3+ | Solid |
| Pre-call diagnostics, device selection | Solid |
| Hand raise broadcast + receive | Wired correctly |
| Remote mute/video state sync | Consuming `audio-state`/`video-state` signals |
| Active speaker detection (AudioContext analyser) | Working |
| Keyboard shortcuts (M/V/S/H/F/Shift+Esc) | Working |
| Muted speaking detection | Toast with debounce |
| Participant pinning + active speaker sort | VideoGrid sorts correctly |
| Recording with consent + compositor | Working |
| Transcription dual-path (ElevenLabs + Web Speech) | Working |
| Screen share with audio + content hints | Working |
| E2E encryption toggle | Working |
| Guest access + host approval | Working |
| Reconnection (ICE restart, polling, 5 retries) | Working |
| Picture-in-Picture | Working |
| Audio constraints (echo/noise/AGC) for all devices | Confirmed in `getMediaConstraints()` |
| Logging via meetingLogger in hooks + main component | Clean |
| Post-meeting debrief + analytics | UUID-guarded |
| Architecture: thin `useMeetingWebRTC` (286 lines) | Clean |

---

## Remaining Issues (-5 points)

### 1. ParticipantTile still has ~15 `console.log` statements (-2 pts)
Lines 36-57, 80, 86, 92, 94, 101, 106, 110, 115, 122, 126, 147 in `ParticipantTile.tsx` — heavy debug logging with emoji prefixes that fires on every stream attach. These should use `meetingLogger`.

### 2. No meeting timer visible in the UI (-1 pt)
Zoom and Meet both show elapsed time. `elapsedTimeMs` is computed for `EngagementAnalyticsOverlay` but there is no persistent timer in the meeting header. This is table-stakes UX.

### 3. No gallery view pagination for >9 participants (-1 pt)
`VideoGrid` renders all participants in a single grid. When count exceeds 9, tiles become too small. Zoom paginates at 25 (5x5). A simple page-based approach with prev/next would suffice.

### 4. `speakingTimeMs: 0` for remote participants (-0.5 pts)
The `EngagementAnalyticsOverlay` still receives `speakingTimeMs: 0` for all remotes. Accumulated speaking time is not tracked — only real-time `isSpeaking` works.

### 5. No click-to-pin on participant tiles (-0.5 pts)
`focusedParticipantId` state exists and is passed to `VideoGrid`, but there is no `onClick` handler on participant tiles to set it. Users cannot pin a participant by clicking.

---

## Missing Features vs Zoom/Google Meet

| Feature | Priority | Effort | Description |
|---------|----------|--------|-------------|
| **Meeting timer** | High | Small | Show `HH:MM:SS` elapsed time in the meeting header |
| **Click-to-pin** | High | Small | Add onClick to `ParticipantTile` → set `focusedParticipantId` |
| **Gallery pagination** | Medium | Medium | Page grid at 9 participants with prev/next controls |
| **Speaker view auto-switch** | Medium | Small | Auto-set `focusedParticipantId` to active speaker (already partially done via sort) |
| **Network quality badge per participant** | Medium | Medium | Show connection quality icon on each tile from `getStats()` |
| **Noise suppression toggle in UI** | Low | Small | UI toggle for `noiseSuppression` constraint (already enabled by default) |
| **Bandwidth quality presets** | Low | Medium | "HD / Standard / Low" selector that adjusts video constraints |
| **Chat file/image sharing** | Low | Medium | Extend `MeetingChatSidebar` with file upload |
| **Meeting lock** | Low | Small | Host can toggle `is_locked` to prevent new joins |
| **Raise hand queue** | Low | Small | Show ordered list of raised hands with timestamps |

---

## Implementation Plan (95 → 100)

### Phase E: Final Items (5 tasks)

| # | Task | Points | Details |
|---|------|--------|---------|
| 1 | Replace `console.log` in `ParticipantTile.tsx` with `meetingLogger` | +2 | ~15 statements across stream attach, play, error handlers |
| 2 | Add meeting timer to header | +1 | New `MeetingTimer` component showing `HH:MM:SS` from `actual_start_time`, placed next to meeting title |
| 3 | Add gallery pagination for >9 participants | +1 | Page state in `VideoGrid`, show 9 per page, prev/next buttons |
| 4 | Track accumulated speaking time for remotes | +0.5 | Ref in `MeetingVideoCallInterface` incremented by `useAudioLevelMonitor` interval when `isRemoteSpeaking(id)` is true |
| 5 | Add click-to-pin on participant tiles | +0.5 | Pass `onPin` callback to `VideoGrid` → `ParticipantTile`, toggle `focusedParticipantId` |

