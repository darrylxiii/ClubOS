

# Auto LinkedIn Sync + Skill Match Scoring for Pipelines

## What We're Building

Three connected features that eliminate manual repetitive work:

1. **"Sync All LinkedIn" button on Job Dashboard** — one click to batch-enrich every candidate in the pipeline who has a LinkedIn URL, then auto-calculate skill match scores
2. **Auto-enrich on candidate add** — whenever a candidate is added (via Quick Add, Email Dump, or LinkedIn import), automatically trigger LinkedIn enrichment + skill scoring
3. **Skill Match Scoring** — after enrichment, compare each candidate's LinkedIn skills against the job's `requirements` (must-have) and `nice_to_have` skills, compute a match percentage, and store it

## Architecture

```text
Candidate Added / "Sync All" clicked
         │
         ▼
  batch-linkedin-enrich (existing edge function)
         │ scrapes LinkedIn, populates skills
         ▼
  calculate-skill-match (NEW edge function)
         │ compares candidate.skills vs job.requirements + nice_to_have
         │ writes skill_match_score + skill_match_details to applications table
         ▼
  UI auto-refreshes, showing match % badge on each candidate card
```

## Implementation

### 1. New Edge Function: `calculate-skill-match`

**Input**: `{ job_id, candidate_ids }` (or `application_ids`)

**Logic**:
- Fetch job's `requirements` (must-have) and `nice_to_have` arrays
- Fetch each candidate's `skills` from `candidate_profiles`
- For each candidate, compute:
  - `must_have_matched`: intersection of candidate skills with job requirements (case-insensitive fuzzy)
  - `nice_to_have_matched`: intersection with nice-to-have
  - `skill_match_score`: weighted formula (must-have 70% weight, nice-to-have 30%)
  - `skill_match_details`: JSON object with matched/unmatched breakdown
- Update the `applications` row with `match_score` and a `skill_match_details` metadata field

### 2. Update `batch-linkedin-enrich` Edge Function

After enriching each candidate:
- Return the candidate IDs that were successfully enriched
- The caller (frontend) chains a call to `calculate-skill-match` with those IDs

### 3. New Component: `PipelineLinkedInSync`

A panel on the Job Dashboard (inside `AdminJobTools` dropdown or as a standalone button) that:
- Shows count of candidates with LinkedIn URLs vs total
- "Sync All LinkedIn" button → calls `batch-linkedin-enrich` in chunks of 10, with progress UI (reusing `LinkedInEnrichmentProgress`)
- After enrichment completes, auto-calls `calculate-skill-match` for all enriched candidates
- Shows results: X enriched, Y skills matched, Z% average match

### 4. Auto-Enrich on Add

Modify three entry points to trigger enrichment after candidate creation:

| Entry Point | File | Change |
|-------------|------|--------|
| Quick Add (manual/linkedin) | `AddCandidateDialog.tsx` | After `onCandidateAdded()`, if candidate has `linkedin_url`, fire `batch-linkedin-enrich` + `calculate-skill-match` |
| Email Dump | `ExtractedCandidatesPreview.tsx` | After import completes, auto-trigger enrichment (remove the manual "Enrich" button step) |
| LinkedIn Sync (single) | `CandidateQuickActions.tsx` | After single-profile scrape, call `calculate-skill-match` for that candidate |

### 5. Skill Match Badge on Pipeline Cards

Update `ExpandablePipelineStage.tsx` and candidate cards to show:
- A skill match % badge (color-coded: green ≥ 80%, yellow ≥ 50%, red < 50%)
- Tooltip showing must-have hits vs misses

### 6. Database Migration

Add `skill_match_details` JSONB column to `applications` table to store the structured match breakdown (the `match_score` column already exists).

## Files

| File | Change |
|------|--------|
| `supabase/functions/calculate-skill-match/index.ts` | **NEW** — skill matching engine |
| `supabase/functions/batch-linkedin-enrich/index.ts` | Return enriched IDs for chaining |
| `src/components/partner/PipelineLinkedInSync.tsx` | **NEW** — "Sync All LinkedIn" panel with progress |
| `src/components/partner/AdminJobTools.tsx` | Add "Sync All LinkedIn" button |
| `src/components/partner/AddCandidateDialog.tsx` | Auto-trigger enrichment + skill match after add |
| `src/components/jobs/email-dump/ExtractedCandidatesPreview.tsx` | Auto-trigger enrichment after import |
| `src/components/partner/CandidateQuickActions.tsx` | Chain skill-match after LinkedIn scrape |
| `src/components/partner/ExpandablePipelineStage.tsx` | Show skill match % badge |
| `supabase/config.toml` | Register new edge function |
| Migration | Add `skill_match_details` JSONB to `applications` |

