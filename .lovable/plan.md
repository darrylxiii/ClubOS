

# Club Meetings System — Full Audit (Post Phase A-E)

## Current Score: 72/100

Previous scores were inflated. This audit applies strict Zoom/Meet parity criteria, penalizes stubs, and treats "feature exists but doesn't work" as zero credit.

---

## Scoring Breakdown

| Area | Max | Score | Issue |
|------|-----|-------|-------|
| **WebRTC P2P Core** | 10 | 9 | Solid. ICE restart, retry, codec prefs, signaling with fallback polling. -1 for no TURN-unavailable banner. |
| **SFU Auto-Switch** | 5 | 4 | Auto-switches at 3+ remotes. LiveKit health check deferred 2s. -1 for no cloud recording path in SFU mode. |
| **Pre-Call Diagnostics** | 5 | 5 | Device selection, network test, video preview. Good. |
| **Controls Panel** | 5 | 5 | Full desktop + mobile controls, reaction dropdown, PiP, layout toggle. |
| **Video Grid** | 5 | 4 | Pagination at 9 works. -1: connection quality badge on `ParticipantTile` is hardcoded green (3 bars, always `bg-emerald-500`). Never reflects actual quality. |
| **Active Speaker** | 5 | 3 | Real-time `isRemoteSpeaking()` works via `useAudioLevelMonitor`. But: `speakingTimeMs: 0` hardcoded for all remotes in `EngagementAnalyticsOverlay`. Local speaking time is heuristic (`committedTranscripts.length * 5000`). No accumulated tracking. |
| **Hand Raise** | 3 | 2.5 | Broadcast + receive works. -0.5: No ordered queue — just binary state. All raised hands shown equally, no "who raised first". |
| **Recording** | 8 | 6 | Compositor recording with consent works. -1: No SFU-mode recording. -1: `isRecording` state gets out of sync — `handleToggleRecording` sets `isRecording` but compositor state is separate (`isCompositorRecording`). Dual state can cause UI confusion. |
| **Transcription** | 8 | 5 | ElevenLabs + Web Speech dual path. But: server-side `transcribe-meeting-audio` edge function never invoked. No fallback when both client paths fail. Transcription panel shows timestamps as `new Date(t.timestamp).toLocaleTimeString()` but `t.timestamp` type is unverified. |
| **Screen Share** | 5 | 5 | Audio capture, content hints, track replacement, camera restore. Solid. |
| **Chat** | 5 | 3.5 | Works via realtime. -1: No file/image sharing. -0.5: No unread count badge on mobile controls (only desktop `ControlsPanel` gets `unreadChatMessages`). |
| **Remote State Sync** | 5 | 4 | `audio-state`/`video-state` signals consumed. But: signals sent via `signaling.sendSignal()` → `webrtc_signals` INSERT. Received via separate `postgres_changes` subscription on same table. Two independent channels — race condition possible where UI subscription fires before signal is committed. |
| **Guest Access** | 5 | 4.5 | Guest join, host approval, session tokens. -0.5: Guest cleanup on page close uses `beforeunload` which is unreliable on mobile Safari. |
| **Keyboard Shortcuts** | 2 | 2 | M, V, S, H, F, Shift+Esc. All working. |
| **Meeting Timer** | 2 | 2 | Shows elapsed HH:MM:SS from `actual_start_time`. Good. |
| **Click-to-Pin** | 2 | 2 | `onClick` on tiles, toggle `focusedParticipantId`. Working. |
| **Muted Speaking Detection** | 2 | 2 | Toast with 5s debounce. Working. |
| **Fullscreen** | 1 | 1 | F key. Working. |
| **E2E Encryption** | 3 | 2 | Toggle works, key rotation, peer tracking. -1: No visual verification (e.g. safety number comparison like Signal). |
| **Post-Meeting** | 5 | 3.5 | Debrief invoked, analytics event emitted. -1: No meeting summary email. -0.5: No action items extraction from transcript. |
| **Virtual Backgrounds** | 3 | 0 | "Coming soon" dialog. Button still visible in controls. Misleading. Should be hidden entirely or feature-flagged. |
| **Engagement Analytics** | 3 | 1 | UI renders but data is mostly fake: `speakingTimeMs: 0` for remotes, `engagement` is `isRemoteSpeaking(id) ? 85 : 60` (hardcoded), `sentimentTrend: 'neutral'` (hardcoded). Not usable for real insights. |
| **Connection Quality** | 3 | 0.5 | `useMeetingConnectionQuality` runs but results only show in `MeetingConnectionIndicator` (top-level). Per-participant tile badge is hardcoded green. `suggestedAction` triggers auto-video-off but no user-facing quality indicator per participant. |
| **Meeting History/List** | 5 | 4 | Pages exist (`/meetings`, `/meeting-history`). -1: No search/filter on meeting history. |

**Total: 72/100**

---

## Critical Issues (28 points to recover)

### Tier 1: Broken/Fake Data (-12 pts)

1. **Engagement Analytics data is fabricated** (-2 pts)
   - `speakingTimeMs: 0` for all remote participants
   - `engagement` score hardcoded to `85` or `60` based on binary speaking state
   - `sentimentTrend` hardcoded to `'neutral'` or `'positive'`
   - Fix: Accumulate speaking time via ref incremented by audio level monitor interval; remove hardcoded engagement values

2. **Connection quality badge hardcoded green** (-2.5 pts)
   - `ParticipantTile.tsx` lines 276-291: Three green bars, always emerald, no props for quality level
   - `useMeetingConnectionQuality` produces per-peer stats but they never reach `ParticipantTile`
   - Fix: Pass `connectionQuality` prop to each participant, derive from `getStats()` RTT/packetLoss

3. **Virtual backgrounds button visible but non-functional** (-3 pts)
   - Users click, get "coming soon" dialog. Bad UX in a production app
   - Fix: Remove from `ControlsPanel` entirely, or implement basic CSS filter blur

4. **Recording state dual-tracking** (-1 pts)
   - `isRecording` (local state) and `isCompositorRecording` (from hook) can diverge
   - `handleToggleRecording` sets `isRecording` but the actual compositor state is separate
   - Fix: Remove `isRecording` state entirely, use only `isCompositorRecording`

5. **Server-side transcription never invoked** (-1 pts)
   - `transcribe-meeting-audio` edge function exists but no client fallback path
   - Fix: When `isTranscribing === false && !transcript` after 10s, try server-side

6. **No TURN-unavailable user warning** (-1 pts)
   - When `getDynamicRTCConfig()` fails, users behind symmetric NATs fail silently
   - Fix: Surface a dismissible banner when STUN-only mode is detected

7. **Mobile chat unread badge missing** (-0.5 pts)
   - `MobileMeetingControls` receives `unreadMessages` prop but the count is passed. Need to verify it's displayed.

8. **No accumulated speaking time tracking** (-1 pts)
   - Real-time `isSpeaking` works but cumulative time per participant is not tracked
   - Local participant uses `committedTranscripts.length * 5000` (heuristic, not accurate)

### Tier 2: Missing Features vs Zoom/Meet (-10 pts)

9. **No speaker view auto-switch** (-1.5 pts)
   - Active speaker sorts first in grid but doesn't auto-pin to spotlight
   - Zoom/Meet auto-focus on whoever is talking

10. **No network quality indicator per participant** (-1.5 pts)
    - Related to #2 but also needs RTT/jitter display on hover

11. **No meeting lock** (-1 pt)
    - Host cannot prevent new joins after meeting starts
    - Table has no `is_locked` column

12. **No raise hand queue** (-1 pt)
    - Binary state only, no ordered list with timestamps

13. **No chat file sharing** (-1 pt)
    - Text-only chat. No drag-drop or file picker

14. **No bandwidth quality presets** (-1 pt)
    - "HD / Standard / Low" selector for users on poor connections

15. **No noise suppression UI toggle** (-0.5 pts)
    - Always enabled via constraints, no user control

16. **No meeting summary email** (-1 pt)
    - Post-meeting debrief runs but no email notification with summary + action items

17. **No action items extraction** (-0.5 pts)
    - Transcript exists but no AI-driven action item parsing post-meeting

18. **No gallery view keyboard nav** (-0.5 pts)
    - Arrow keys don't navigate between pages when paginated

---

## Implementation Plan (72 → 100)

### Phase F: Data Integrity (72 → 82)

| # | Task | Points |
|---|------|--------|
| 1 | Track accumulated speaking time per remote via ref incremented by audio monitor | +1 |
| 2 | Pass real connection quality to ParticipantTile from `useMeetingConnectionQuality` stats | +2.5 |
| 3 | Wire real engagement data (speaking time, dynamic engagement score based on speaking ratio, remove hardcoded values) | +2 |
| 4 | Remove `isRecording` local state, use only `isCompositorRecording` throughout | +1 |
| 5 | Hide virtual backgrounds button from ControlsPanel entirely (feature-flag it out) | +3 |
| 6 | Add TURN-unavailable dismissible banner | +1 |

### Phase G: Feature Parity (82 → 94)

| # | Task | Points |
|---|------|--------|
| 7 | Auto-pin active speaker in spotlight mode (auto-switch `focusedParticipantId` when speaker changes, with 2s debounce) | +1.5 |
| 8 | Add meeting lock toggle for host (database column + UI toggle in HostSettingsPanel + guard in join flow) | +1 |
| 9 | Implement raise hand queue with timestamps and ordered list in ParticipantsPanel | +1 |
| 10 | Add chat file/image sharing via storage bucket + drag-drop in MeetingChatSidebar | +1 |
| 11 | Add bandwidth quality presets (HD/Standard/Low) in settings that adjust video constraints | +1 |
| 12 | Wire server-side transcription fallback when client paths fail | +1 |
| 13 | Add noise suppression UI toggle in DeviceSelector | +0.5 |
| 14 | Post-meeting summary email via edge function after debrief completes | +1 |
| 15 | AI action items extraction from transcript in meeting-debrief edge function | +0.5 |
| 16 | Per-participant network quality badge with RTT/jitter on hover tooltip | +1.5 |
| 17 | Gallery page keyboard navigation (arrow keys) | +0.5 |
| 18 | Mobile chat unread badge verification + fix | +0.5 |

### Phase H: Polish (94 → 100)

| # | Task | Points |
|---|------|--------|
| 19 | SFU-mode cloud recording path via LiveKit Egress API | +2 |
| 20 | Meeting history search and date filter | +1 |
| 21 | E2E encryption safety number comparison dialog | +1 |
| 22 | `beforeunload` → `sendBeacon` for reliable mobile cleanup | +0.5 |
| 23 | Guest cleanup heartbeat timeout (server-side: mark left if no heartbeat for 60s) | +0.5 |
| 24 | Meeting summary card in meeting history (duration, participants, key topics from debrief) | +1 |

