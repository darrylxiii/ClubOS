

# Upgrade Add Meeting Modal -- Comprehensive Past Meeting Entry

## What is Changing

The existing `AddMeetingModal` on the candidate profile will be upgraded from a basic 3-step wizard into a comprehensive single-page form with all the fields needed to capture maximum intelligence from past meetings and recordings.

**`CreateMeetingDialog` on `/meetings` is NOT touched.** That component schedules future meetings -- a completely different use case.

## Current Problems

1. **Participants are a free-text string** -- no way to search/select real users from the system
2. **No description, agenda, or notes fields** -- strategist observations are lost
3. **No tags** -- no future search/clustering capability
4. **No duration field** -- metadata gap
5. **No recording consent / privacy toggle** -- GDPR gap when `meeting_recordings_extended` has these columns
6. **3-step wizard adds friction** -- for a form this size, a single scrollable page with sections works better
7. **Meeting not linked to participants** -- when a meeting is added, it does not appear on other participants' meeting tabs because no `meeting_participants` rows are created

## What Will Be Built

### 1. New Component: `ParticipantPicker.tsx`

A searchable multi-select component (based on the existing `PersonCell` pattern) that:
- Queries `profiles` table by name or email in real-time
- Shows avatar, name, email for each result
- Allows selecting multiple people with badge display and remove buttons
- Each selected person gets a **role** dropdown: Host, Interviewer, Hiring Manager, Observer, Candidate
- Option to add **external guests** (name + email) who are not in the system
- Returns a structured array: `{ userId?, guestName?, guestEmail?, role }`

### 2. Upgraded `AddMeetingModal.tsx`

Single scrollable modal (no wizard steps) with collapsible sections:

**Section: Meeting Details** (always expanded)
- Title (required)
- Meeting Type selector (screening, technical, behavioral, culture_fit, final_round, debrief, client_presentation, other)
- Date and Time (datetime-local input)
- Duration selector (15, 30, 45, 60, 90, 120 min)
- Description (textarea)
- Agenda (textarea)
- Job selector (optional, searchable from `jobs` table)

**Section: Participants** (always expanded)
- `ParticipantPicker` component with role assignment
- The current candidate is auto-added with role "Candidate"

**Section: Content and Recordings** (collapsible, expanded by default)
- Paste Transcript (textarea, monospace)
- Video upload (drag-and-drop MP4/WebM/MOV, max 50MB)
- Audio upload (drag-and-drop MP3/WAV/M4A, max 50MB)
- Visual checkmarks for each provided input

**Section: Notes and Tags** (collapsible)
- Strategist Notes (textarea)
- Tags (comma-separated text input)

**Section: Privacy** (collapsible)
- Recording consent checkbox
- Private toggle (marks recording as not shareable)

**Footer**
- "Powered by QUIN" label
- Cancel / Submit

### 3. Backend: Updated `process-manual-meeting` Edge Function

Accept the new fields and create proper participant linkages:

- Accept: `description`, `agenda`, `duration`, `participants` (structured array with userId/role/guestName/guestEmail), `notes`, `tags`, `isPrivate`, `recordingConsent`
- Write expanded fields to `meeting_recordings_extended` (notes go into `participants` JSON, tags into metadata)
- Write `description` and `agenda` to the `meetings` row
- **Create `meeting_participants` rows** for each participant with their role, `role_in_interview`, `attended = true`, `rsvp_status = 'accepted'`
- Set `has_recording = true` on meetings row if a file was uploaded

### 4. UI Integration

- `MeetingIntelligenceCard` import path stays the same (modal remains in candidate-profile folder since it is candidate-context specific)
- The candidate's name is passed to auto-add them as a participant

## Files to Create

| File | Purpose |
|---|---|
| `src/components/candidate-profile/ParticipantPicker.tsx` | Searchable user picker with role assignment |

## Files to Modify

| File | Change |
|---|---|
| `src/components/candidate-profile/AddMeetingModal.tsx` | Full rewrite: single-page layout, all new fields, ParticipantPicker integration |
| `supabase/functions/process-manual-meeting/index.ts` | Accept new fields, create `meeting_participants` rows, write description/agenda/tags |
| `src/components/candidate-profile/MeetingIntelligenceCard.tsx` | Pass `candidateName` prop to modal (minor) |

## Participant Linking Logic

When the meeting is submitted with participants:
1. The `meetings` row is created (already happens)
2. For each system user in the participants array: insert into `meeting_participants` with `user_id`, `role`, `role_in_interview`, `attended = true`
3. For each external guest: insert into `meeting_participants` with `guest_name`, `guest_email`, `participant_type = 'guest'`
4. The `meeting_recordings_extended.participants` JSON stores the full structured list for RAG/ML use

This means the meeting automatically appears on each participant's meeting history because the existing meeting queries join through `meeting_participants`.

## RAG and ML Readiness

Every field is chosen to maximize future intelligence extraction:
- **Structured participants with roles** -- enables "who interviews whom" graph queries and panel composition analysis
- **Tags** -- free-text tags for semantic clustering
- **Notes** -- strategist observations feed into embeddings alongside transcript
- **Meeting type + duration** -- categorical and numerical features for scoring models
- **`skills_assessed`** JSONB on `meeting_recordings_extended` -- already exists, populated by the analysis pipeline
- **`embeddings_generated`** flag -- already exists for future vector search

## Technical Notes

- `ParticipantPicker` follows the exact same query pattern as `PersonCell` (queries `profiles` with `.or(full_name.ilike, email.ilike)` and `.limit(20)`)
- File upload stays client-side to `meeting-recordings` bucket (same as current)
- Edge function uses service role key -- no RLS bypass needed
- `meeting_participants` table has all required columns: `user_id`, `guest_email`, `guest_name`, `role`, `role_in_interview`, `participant_type`, `attended`
