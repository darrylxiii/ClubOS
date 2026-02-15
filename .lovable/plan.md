

# Add Meeting / Recording Entry Modal for Candidate Intelligence

## Overview

Build a modal on the candidate profile that lets strategists manually add past meetings, recordings (MP4/audio), and transcripts. Each submission flows through the existing transcription and AI analysis pipeline, enriching the candidate's assessment scores, culture fit signals, engagement timeline, and interview intelligence automatically.

## What Already Exists

The infrastructure is already robust:
- `meeting_recordings_extended` table with full schema (transcript, ai_analysis, candidate_id, job_id, processing_status, etc.)
- `meeting-recordings` storage bucket (public, already created)
- `transcribe-recording` edge function (Whisper-based, chains to analysis)
- `analyze-meeting-recording-advanced` edge function (Lovable AI with circuit breaker, chunking, fallback models)
- `MeetingIntelligenceCard` component on the candidate profile already reads analyzed data
- `meeting_recordings` table for simpler manual entries (has transcript, ai_analysis, meeting_type fields)

## What Needs to Be Built

### 1. New Component: `AddMeetingModal.tsx`

A multi-step modal with the following sections:

**Step 1 -- Meeting Details**
- Meeting type selector: `screening`, `technical`, `behavioral`, `culture_fit`, `final_round`, `debrief`, `client_presentation`, `other`
- Meeting date and time picker
- Duration (optional, auto-detected from recording if uploaded)
- Title / subject line
- Job selector (optional -- links to a specific role for scoring)
- Participants (free-text names or stakeholder picker)

**Step 2 -- Content Input (at least one required)**
Three input modes, any combination allowed:
- **Transcript paste**: Large textarea for pasting a meeting transcript
- **Video upload**: Drag-and-drop MP4/WebM file upload to `meeting-recordings` bucket
- **Audio-only upload**: Drag-and-drop MP3/WAV/M4A/WebM audio upload to same bucket

Visual indicator showing which inputs have been provided (checkmarks).

**Step 3 -- Review and Submit**
- Summary of what will be processed
- "Powered by QUIN" label
- Submit button that triggers the pipeline

### 2. Backend Flow (Edge Function: `process-manual-meeting`)

New edge function that orchestrates the full pipeline:

1. Creates a row in `meeting_recordings_extended` with `candidate_id`, `source_type: 'manual_upload'`, and the storage path or pasted transcript
2. If a file was uploaded but no transcript was pasted:
   - Calls `transcribe-recording` (which uses Whisper then chains to `analyze-meeting-recording-advanced`)
3. If only a transcript was pasted (no file):
   - Writes transcript directly to `meeting_recordings_extended`
   - Calls `analyze-meeting-recording-advanced` directly
4. If both file and transcript provided:
   - Stores file, uses provided transcript (skips Whisper), calls analysis
5. Optionally creates a row in `meetings` table with `candidate_id` so `MeetingIntelligenceCard` picks it up
6. Returns processing status to the frontend

### 3. UI Integration

- Add a "Add Meeting" button to the `MeetingIntelligenceCard` empty state AND as a header action when data exists
- The button opens the `AddMeetingModal`
- After submission, show a toast: "Meeting submitted for analysis. Intelligence will update shortly."
- The `MeetingIntelligenceCard` already polls/reads from the right tables, so new data will appear on next load

### 4. Intelligence Enrichment

Once the analysis pipeline runs, it automatically:
- Populates `ai_analysis` JSON on `meeting_recordings_extended` (strengths, areas for improvement, key moments, recommendation)
- `MeetingIntelligenceCard` reads this and shows scores, trends, and insights
- `calculate-assessment-scores` picks up meeting data for the Culture Fit and Engagement dimensions
- The more meetings added, the higher the confidence scores across all assessment dimensions

## Files to Create

| File | Purpose |
|---|---|
| `src/components/candidate-profile/AddMeetingModal.tsx` | Modal component with 3-step form |
| `supabase/functions/process-manual-meeting/index.ts` | Edge function orchestrating storage, transcription, and analysis |

## Files to Modify

| File | Change |
|---|---|
| `src/components/candidate-profile/MeetingIntelligenceCard.tsx` | Add "Add Meeting" button in header and empty state; open modal |
| `supabase/config.toml` | Add `[functions.process-manual-meeting]` entry (auto-managed, but noting for completeness) |

## Technical Details

### Meeting Type Options
```
screening | technical | behavioral | culture_fit | final_round | debrief | client_presentation | other
```

### Accepted File Types
- Video: `video/mp4`, `video/webm`, `video/quicktime`
- Audio: `audio/mpeg`, `audio/wav`, `audio/mp4`, `audio/webm`, `audio/x-m4a`
- Max size: 50MB (matches existing `MAX_VIDEO_SIZE` pattern)

### Storage Path Convention
```
candidates/{candidateId}/meetings/{timestamp}_{filename}
```

### Edge Function CORS
The new `process-manual-meeting` function will include `x-application-name` in `Access-Control-Allow-Headers` from the start (lesson learned from previous bugs).

### Database Row Creation
The function creates entries in both:
1. `meeting_recordings_extended` -- for the analysis pipeline
2. `meetings` -- with `candidate_id` set, so `MeetingIntelligenceCard` query picks it up via the join on `meeting_recording_analysis`

### Processing States Shown to User
- `uploading` -- file being sent to storage
- `processing` -- transcript being generated (Whisper)
- `analyzing` -- AI extracting intelligence
- `complete` -- data ready, card auto-refreshes

## Summary

This creates a closed loop: strategist adds a meeting (any format) -> system transcribes if needed -> AI extracts intelligence -> candidate profile gets smarter across all assessment dimensions. Every new meeting increases confidence and accuracy of scores, culture fit signals, and engagement metrics.

