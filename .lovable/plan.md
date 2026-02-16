
# Fathom Integration -- Import Meeting Recordings into Meeting Intelligence

## Overview

Fathom has a public API that allows fetching your recorded meetings, transcripts, and AI summaries. This integration will pull that data into your existing `meeting_recordings_extended` table so Club AI can analyze it alongside your other recordings, making the entire system smarter with more data.

## How It Works

1. You provide your Fathom API key (generated in Fathom's User Settings)
2. A new backend function connects to Fathom's API to pull meetings, transcripts, and summaries
3. The data is stored in your existing recordings table with a new `fathom` source type
4. Your existing AI analysis pipeline processes the Fathom transcripts automatically
5. A "Sync Fathom" button on the Meeting Intelligence page lets you import on demand, with an option for automatic webhook-based sync later

## What Gets Imported Per Meeting

- Title, date, duration, and participant list
- Full speaker-attributed transcript (Fathom provides these natively)
- AI-generated summary from Fathom
- Fathom's recording ID for deduplication (no double imports)

Once imported, your existing analysis pipeline (`analyze-meeting-recording-advanced`) runs on the transcript to extract skills assessed, action items, key moments, and hiring signals -- exactly like it does for TQC meetings.

## Plan

### 1. Database: Add `fathom` source type and tracking columns

- Add `'fathom'` to the `source_type` check constraint on `meeting_recordings_extended`
- Add `external_source_id` column (text, nullable) for storing the Fathom recording ID to prevent duplicate imports
- Add a unique partial index on `(external_source_id)` where `source_type = 'fathom'`

### 2. Backend: `sync-fathom-recordings` edge function

A new backend function that:
- Accepts the user's Fathom API key (stored as a secret, not sent per request)
- Calls `GET https://api.fathom.ai/external/v1/meetings` to list recent meetings
- For each new meeting (not already imported by `external_source_id`):
  - Calls `GET /recordings/{id}/transcript` to fetch the full transcript
  - Calls `GET /recordings/{id}/summary` to fetch the AI summary
  - Inserts into `meeting_recordings_extended` with `source_type = 'fathom'`, `processing_status = 'analyzing'`
  - Triggers `analyze-meeting-recording-advanced` to run Club AI analysis on the transcript
- Supports pagination (Fathom uses cursor-based pagination)
- Supports optional date range filtering

### 3. Frontend: Fathom sync UI on Meeting Intelligence page

- Add a "Fathom" filter option to the source type dropdown in `MeetingHistoryTab`
- Add a "Sync Fathom" button that triggers the import
- Show a sync status indicator (syncing, last synced, number imported)
- Fathom recordings appear in the existing recording list with a Fathom badge

### 4. API Key Configuration

- You will be prompted to enter your Fathom API key as a backend secret (`FATHOM_API_KEY`)
- The key is stored securely server-side and never exposed to the browser

## Files to Create

| File | Purpose |
|---|---|
| `supabase/functions/sync-fathom-recordings/index.ts` | Backend function that calls Fathom API and imports meetings |

## Files to Modify

| File | Change |
|---|---|
| `src/components/meetings/MeetingHistoryTab.tsx` | Add Fathom filter option and Sync button |
| `src/hooks/useMeetingRecordings.ts` | Add `'fathom'` to source type union |
| `src/components/meetings/MeetingRecordingCard.tsx` | Display Fathom badge for imported recordings |

## Database Migration

```sql
-- Add 'fathom' to source_type constraint
ALTER TABLE meeting_recordings_extended
  DROP CONSTRAINT meeting_recordings_extended_source_type_check;
ALTER TABLE meeting_recordings_extended
  ADD CONSTRAINT meeting_recordings_extended_source_type_check
  CHECK (source_type = ANY (ARRAY[
    'tqc_meeting','live_hub','conversation_call','fathom'
  ]));

-- Track external source IDs for deduplication
ALTER TABLE meeting_recordings_extended
  ADD COLUMN IF NOT EXISTS external_source_id text;

-- Prevent duplicate Fathom imports
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_fathom_source
  ON meeting_recordings_extended (external_source_id)
  WHERE source_type = 'fathom' AND external_source_id IS NOT NULL;
```

## Data Flow

```
Fathom API                    Backend Function                    Database
-----------                   ----------------                   --------
GET /meetings        --->     List all meetings         --->     Check external_source_id
                              (paginated)                        (skip duplicates)

GET /recordings/     --->     Fetch transcript +        --->     INSERT into
  {id}/transcript             summary per meeting                meeting_recordings_extended
GET /recordings/                                                 (source_type = 'fathom')
  {id}/summary
                                                        --->     Trigger analyze-meeting-
                                                                 recording-advanced
```

## Security Notes

- Fathom API key stored server-side only (backend secret)
- API keys in Fathom are user-scoped -- they only access meetings recorded by that user or shared to their team
- No raw audio is downloaded; only transcripts and metadata are imported
- All imported data follows existing RLS policies on `meeting_recordings_extended`
