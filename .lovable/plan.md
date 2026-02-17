
# Sync Meetings from Fireflies.ai

## Overview

Add a Fireflies.ai integration that mirrors the existing Fathom sync pattern -- a new Edge Function fetches transcripts via the Fireflies GraphQL API, deduplicates against `meeting_recordings_extended`, inserts new records, and triggers AI analysis. The frontend gets a "Sync Fireflies" button and a filter option.

## Prerequisites

A `FIREFLIES_API_KEY` secret is needed. You can get it from your Fireflies.ai account under **Settings > Developer > API Key**.

---

## Step 1: Add FIREFLIES_API_KEY Secret

Request the API key from you before proceeding with deployment.

## Step 2: Create Edge Function `sync-fireflies-recordings`

**File**: `supabase/functions/sync-fireflies-recordings/index.ts`

Pattern mirrors `sync-fathom-recordings` exactly:

1. Authenticate the calling user via Authorization header
2. Call Fireflies GraphQL API (`https://api.fireflies.ai/graphql`) with the `transcripts` query:
   - Fields: `id`, `title`, `dateString`, `duration`, `transcript_url`, `audio_url`, `sentences { speaker_name text raw_text start_time end_time }`, `meeting_attendees { displayName email }`, `summary { overview action_items }`, `organizer_email`
   - Paginate using `skip` + `limit` (50 per page, max 20 pages)
3. Deduplicate against `meeting_recordings_extended` where `source_type = 'fireflies'` and `external_source_id` matches the Fireflies transcript ID
4. Insert new records with:
   - `source_type: 'fireflies'`
   - `external_source_id`: Fireflies transcript `id`
   - `transcript`: Joined sentences as `"Speaker: text"` lines
   - `transcript_json`: Raw sentences array
   - `executive_summary`: From `summary.overview`
   - `participants`: From `meeting_attendees`
   - `duration_seconds`: From `duration` (Fireflies returns seconds)
5. Trigger `analyze-meeting-recording-advanced` for records with transcripts
6. Return `{ total_found, already_imported, newly_imported, errors }`

## Step 3: Update Frontend -- MeetingHistoryTab.tsx

- Add `isSyncingFireflies` and `firefliesSyncResult` state
- Add `handleSyncFireflies` function (identical pattern to `handleSyncFathom` but invoking `sync-fireflies-recordings`)
- Add `<SelectItem value="fireflies">Fireflies</SelectItem>` to the source filter dropdown
- Add a "Sync Fireflies" button next to the existing "Sync Fathom" button

## Step 4: Update MeetingRecordingCard.tsx

Add a badge case for `fireflies`:
```
case 'fireflies':
  return <Badge variant="secondary" className="bg-green-500/10 text-green-500">Fireflies</Badge>;
```

---

## Files Summary

| File | Action |
|------|--------|
| `supabase/functions/sync-fireflies-recordings/index.ts` | Create -- GraphQL-based sync function |
| `src/components/meetings/MeetingHistoryTab.tsx` | Edit -- add sync button + filter option |
| `src/components/meetings/MeetingRecordingCard.tsx` | Edit -- add Fireflies badge |

## Risk

Low. This is an additive feature following an established pattern. The Fireflies GraphQL API is well-documented and stable. Graceful degradation if the API key is not configured (returns 400 with clear message).
