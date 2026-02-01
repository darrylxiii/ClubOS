
# Native External Meeting Capture System

## Overview
Replace the Recall.ai-based external meeting capture with a browser-native screen capture approach that leverages your existing recording compositor, OpenAI Whisper transcription, and AI analysis pipeline.

## How It Works

```text
User Flow:
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  1. User opens external meeting (Zoom/Teams/Meet) in separate window/tab    │
│                                                                              │
│  2. User clicks "Capture External Meeting" in TQC app                       │
│                                                                              │
│  3. Browser prompts for screen share (window/tab picker)                    │
│                                                                              │
│  4. User selects the meeting window/tab + audio                             │
│                                                                              │
│  5. TQC records screen + audio using MediaRecorder                          │
│                                                                              │
│  6. On stop: Upload to storage → Transcribe → Analyze → Show insights       │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Technical Architecture

### 1. New Hook: `useExternalMeetingCapture`
A dedicated hook for capturing external meeting windows using `getDisplayMedia`:

- **Screen capture** with `{ video: true, audio: true }` to get system audio
- **MediaRecorder** for recording the captured stream
- **Real-time transcription** chunks every 10 seconds using existing Whisper integration
- **Status tracking** via `external_meeting_sessions` table

### 2. Updated Dialog: `JoinExternalMeetingDialog`
Replace bot-based UI with screen capture flow:

- Remove Recall.ai references
- Add "Start Capture" button that triggers screen share picker
- Show live recording indicator with duration
- Preview the captured window
- Stop button to end capture and process

### 3. New Edge Function: `process-external-capture`
Process the captured recording:

- Receive uploaded recording from storage
- Create `meeting_recordings_extended` record
- Chain to existing `transcribe-recording` function
- Chain to `analyze-meeting-recording-advanced` function
- Generate embeddings via `embed-meeting-intelligence`

### 4. Modified Functions
- **dispatch-meeting-bot**: Remove Recall.ai dependency, update to handle native capture session creation
- **recall-webhook-receiver**: Keep for backward compatibility but mark as deprecated

## Database Changes
None required - existing `external_meeting_sessions` table structure works for native capture:
- `status` values: `pending` → `capturing` → `uploading` → `processing` → `completed`

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useExternalMeetingCapture.ts` | Screen capture + recording logic |
| `src/components/meetings/ExternalCapturePreview.tsx` | Live preview of captured window |
| `supabase/functions/process-external-capture/index.ts` | Post-capture processing pipeline |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/meetings/JoinExternalMeetingDialog.tsx` | Replace bot UI with screen capture UI |
| `supabase/functions/dispatch-meeting-bot/index.ts` | Remove Recall.ai, support native sessions |

## Implementation Details

### useExternalMeetingCapture Hook
```text
Responsibilities:
├── requestScreenCapture()     - Triggers getDisplayMedia with audio
├── startRecording()           - Begins MediaRecorder
├── stopRecording()            - Stops and returns blob
├── uploadRecording()          - Uploads to meeting-recordings bucket
├── triggerProcessing()        - Calls process-external-capture
├── State: isCapturing, duration, stream preview
└── Cleanup: releases tracks on unmount
```

### Screen Capture Configuration
```text
getDisplayMedia options:
├── video: { displaySurface: "browser" | "window" | "monitor" }
├── audio: true (captures system audio - crucial for meeting audio)
├── preferCurrentTab: false (user picks external meeting window)
└── systemAudio: "include" (Chrome 94+)
```

### Recording Flow
```text
1. User selects meeting window
2. MediaRecorder starts with "video/webm;codecs=vp9,opus"
3. Every 10s: send audio chunk for live transcription (optional)
4. On stop: create blob, upload to storage
5. Create external_meeting_sessions record with status=uploading
6. Call process-external-capture edge function
7. Edge function chains to transcription and analysis
8. Update session status to completed
```

### Browser Compatibility
- **Chrome/Edge**: Full support with system audio
- **Firefox**: Partial (no system audio in screen share)
- **Safari**: Limited (requires user gesture, no audio)

Will show compatibility warnings in UI when system audio unavailable.

## Advantages Over Recall.ai

| Aspect | Recall.ai | Native Capture |
|--------|-----------|----------------|
| Cost | Per-minute API fees | Free (uses existing infra) |
| Privacy | 3rd party sees data | Data stays in-house |
| Setup | API key required | Zero config |
| Quality | Varies by platform | Full HD available |
| Latency | Bot join delay | Instant start |
| Reliability | Depends on 3rd party | No external dependencies |

## User Experience

### Before (Recall.ai)
```text
1. Enter meeting URL
2. Click "Send Bot"
3. Wait for bot to join (30-60 seconds)
4. Bot appears as participant
5. Wait for meeting to end
6. Processing happens asynchronously
```

### After (Native)
```text
1. Open external meeting in browser
2. Click "Capture" in TQC
3. Select meeting window (1 click)
4. Recording starts immediately
5. Click "Stop" when done
6. Processing starts, results in ~2 minutes
```

## Considerations

### Audio Capture Limitations
System audio capture requires:
- Chrome 94+ or Edge
- User must select "Share audio" checkbox in picker
- Show clear instructions in UI

### Fallback for No Audio
If user doesn't share audio:
- Still capture video
- Show warning that transcript may be limited
- Consider offering manual transcript upload

### Privacy Notice
Display consent reminder that:
- Recording captures everything in selected window
- User is responsible for informing meeting participants
- Recording is stored securely in TQC platform

## Summary

This native approach removes external dependencies (Recall.ai), reduces costs to zero, keeps all data in-house, and provides a faster user experience. It leverages your existing compositor, transcription (Whisper), and AI analysis pipelines - just with a different input source (screen capture instead of meeting bot).
