

# Add Existing Candidates to Pipelines — Both Directions

## Overview

Two complementary features for admins to efficiently reuse existing `candidate_profiles` across multiple job pipelines without creating duplicates.

**Direction A:** From a job's pipeline → search and link an existing candidate profile
**Direction B:** From a candidate's profile page → pick a job to add them to

---

## Direction A: "Existing Candidate" tab in AddCandidateDialog

### File: `src/components/partner/AddCandidateDialog.tsx`

1. Expand `addMode` state to `"manual" | "linkedin" | "existing"` and update `TabsList` to 3 columns
2. New tab content with:
   - Debounced search input querying `candidate_profiles` by `full_name`, `email`, or `linkedin_url` (ILIKE, limit 20)
   - Results as selectable cards showing avatar, name, email, current title/company
   - Pre-check `applications` table to show "Already in pipeline" badge on candidates already active in this job (disabled selection)
   - On select, store `selectedExistingCandidate` in state
3. On submit with existing candidate selected:
   - **Skip** `candidate_profiles` INSERT (STEP 1)
   - Go straight to STEP 2-5: create `applications` row with existing `candidate_id`, plus `candidate_interactions`, `sourcing_credits`, `pipeline_audit_logs`
   - Same stage picker, credit-to picker, and notes field as manual mode

---

## Direction B: "Add to Job" from candidate profile page

### New file: `src/components/partner/AddToJobDialog.tsx`

A dialog that receives `candidateId` and `candidateName` as props:

1. Fetches active jobs (`status IN ('active', 'open')`) with searchable list
2. Queries `applications` to identify jobs where candidate is already active — shows those as disabled with "Already in pipeline" badge
3. On selecting a job, fetches that job's `pipeline_stages` for stage picker
4. On submit: creates `applications` row (with existing `candidate_id`), `candidate_interactions`, and `pipeline_audit_logs` — no new profile creation

### File: `src/components/partner/CandidateQuickActions.tsx`

Add an "Add to Job" button (using `Briefcase` icon) that opens `AddToJobDialog`. This component is already admin-only by context (rendered on partner/admin candidate views).

---

## No database changes needed

- `applications.candidate_id` FK to `candidate_profiles` already exists
- `idx_unique_active_application_per_job` prevents duplicates per job
- Existing RLS policies allow admin inserts

## Files summary

| File | Action |
|------|--------|
| `src/components/partner/AddCandidateDialog.tsx` | Add "Existing Candidate" tab with search + link flow |
| `src/components/partner/AddToJobDialog.tsx` | **NEW** — dialog to add candidate to a selected job |
| `src/components/partner/CandidateQuickActions.tsx` | Add "Add to Job" button opening AddToJobDialog |

