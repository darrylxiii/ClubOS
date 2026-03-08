

# Candidate Review & Feedback Intelligence System — Implementation Plan

This is a large, multi-phase implementation. I recommend implementing it in **3 batches** to keep each change reviewable and stable.

---

## Batch 1: Database + Core Review UI (Phases 1-2)

### Phase 1: Database Migration

**Single migration** adding:

1. **Two enums**: `internal_review_status_enum` (`pending`, `approved`, `rejected`, `needs_info`) and `partner_review_status_enum` (`pending`, `approved`, `rejected`, `hold`)

2. **New columns on `applications`**:
   - `internal_review_status`, `internal_reviewed_by` (FK profiles), `internal_reviewed_at`, `internal_review_notes`
   - `partner_review_status`, `partner_reviewed_by` (FK profiles), `partner_reviewed_at`, `partner_review_notes`, `partner_review_rating` (1-5)
   - All nullable, default null — existing apps unaffected

3. **New table `pipeline_reviewers`**: `id`, `job_id` FK jobs, `reviewer_id` FK profiles, `review_type` text (`internal`/`partner`), `is_primary` boolean, `assigned_by` FK profiles, `assigned_at` timestamp
   - RLS: admin/strategist full CRUD; reviewers read own rows

4. **New table `review_feedback_aggregates`**: `id`, `entity_type` text (`company`/`job`), `entity_id` uuid, `total_shared`, `total_approved`, `total_rejected`, `total_hold` (all int default 0), `avg_rating` numeric, `top_rejection_reasons` JSONB, `top_approval_traits` JSONB, `avg_review_time_hours` numeric, `updated_at` timestamp
   - RLS: admin/strategist/partner read

5. **DB trigger** on `applications` when `partner_review_status` changes → updates `review_feedback_aggregates` for both company and job entity types (upsert counts, recalculate avg_rating, avg_review_time)

### Phase 2: Review UI Components

**New files:**

- **`src/hooks/useReviewQueue.ts`** — Fetches applications filtered by `internal_review_status` or `partner_review_status`, joins candidate_profiles + profiles (sourced_by), job requirements. Provides `approveInternal`, `rejectInternal`, `approvePartner`, `rejectPartner`, `holdPartner` mutations that update status columns AND insert into `company_candidate_feedback` + `role_candidate_feedback`.

- **`src/components/partner/InternalReviewPanel.tsx`** — Table view for admin/strategist:
  - Queries `internal_review_status = 'pending'` for current job
  - Columns: candidate name, title, match score, source channel, sourced_by, CV status
  - Checkbox multi-select with bulk Approve/Reject bar
  - Quick approve → sets `internal_review_status = 'approved'`, `partner_review_status = 'pending'`

- **`src/components/partner/PartnerFirstReviewPanel.tsx`** — Card-by-card review for partners:
  - One candidate at a time, progress indicator ("3 of 12")
  - Card content: name, photo, title, years exp, location, key skills (green/red vs job requirements), salary bar (expectation vs band), source info, TQC internal recommendation note
  - Quick-tag feedback chips: `skills_gap`, `too_junior`, `too_senior`, `salary`, `location`, `culture`, `great_fit`, `strong_technical`, `leadership_potential`
  - Star rating (1-5)
  - On Approve: optional notes + rating → writes to both feedback tables → next card
  - On Reject: mandatory primary reason dropdown + specific gaps tags + "ideal candidate" free text → writes to both feedback tables → next card
  - On Hold: optional notes → next card
  - Keyboard shortcuts: → Approve, ← Reject, ↓ Hold

- **`src/pages/JobDashboard.tsx`** edits:
  - Add "Reviews" tab between "Analytics" and "Rejected"
  - Reviews tab content: sub-tabs "Internal Review" (admin/strategist only) | "Partner Review" (partner + admin) | "Metrics" (Phase 3)
  - Show pending review count badge on tab

- **`src/components/partner/ExpandablePipelineStage.tsx`** edit:
  - Filter pipeline candidates to only show those with `partner_review_status = 'approved'` OR `partner_review_status IS NULL` (backward compat)

- **`src/components/partner/PipelineCustomizer.tsx`** edit:
  - Add "Assign First Reviewer" section at bottom
  - Dropdown to select partner user(s) from company_members
  - Toggle for `is_primary`
  - Saves to `pipeline_reviewers` table

---

## Batch 2: Metrics + Intelligence (Phases 3-4)

### Phase 3: Review Conversion Metrics

- **`src/components/partner/ReviewConversionMetrics.tsx`** — Reads from `review_feedback_aggregates` + `applications`:
  - Funnel: Sourced → Shared → Approved → Pipeline (recharts funnel)
  - Approval rate % with company average comparison
  - Top rejection reasons bar chart (from `company_candidate_feedback`)
  - Top approval traits bar chart
  - Batch trend line ("Batch 1: 20% → Batch 3: 45%")
  - Avg review turnaround time

- **`src/components/partner/ReviewerPerformanceCard.tsx`** — Admin view:
  - Per-reviewer stats from `applications` grouped by `partner_reviewed_by`
  - Reviews completed, avg time, approval rate, SLA compliance

### Phase 4: Feedback Intelligence Engine

- **`src/components/intelligence/CompanyHiringIntelligence.tsx`** — Aggregates `company_candidate_feedback` across all jobs for a company:
  - Pattern cards: "70% rejected for salary mismatch", "Culture fit valued 2x over technical"
  - Shown on company profile page for strategists

- **`src/components/intelligence/JobSearchCalibration.tsx`** — Aggregates `role_candidate_feedback` for current job:
  - "Based on feedback, consider: raising seniority, expanding location"
  - Auto-generated via AI (`google/gemini-2.5-flash-lite`) from rejection patterns

- **`supabase/functions/analyze-review-patterns/index.ts`** — Edge function:
  - Called manually or after every 5th partner review
  - Aggregates feedback → identifies company-wide patterns → writes insights to `company_intelligence` and `review_feedback_aggregates.top_rejection_reasons`/`top_approval_traits`
  - Uses `google/gemini-2.5-flash-lite` for pattern summarization

---

## Batch 3: Timeline + Sourcing + Notifications (Phases 5-7)

### Phase 5: Unified Candidate 360 Timeline

- **`src/components/candidate-profile/CandidateTimelineHub.tsx`** — Replaces `ActivityFeedCard` + `ApplicationLogViewer` in `UnifiedCandidateProfile.tsx`:
  - Merges: `candidate_application_logs`, `candidate_interactions`, `interview_feedback`, `company_candidate_feedback`, `role_candidate_feedback`, pipeline stage changes
  - Type filter pills: All | Reviews | Calls | Emails | Meetings | Decisions
  - Actor filter dropdown
  - Each entry: icon, type badge, description, actor avatar, relative timestamp
  - Expandable details for rich entries

### Phase 6: Sourcing & Profile Visibility

- **`src/components/candidate-profile/SourcingAttributionBadge.tsx`** — "Sourced by [Name] via [Channel] on [Date]"
  - Queries `applications.sourced_by` → joins `profiles` for name
  - Added to `CandidateHeroSection.tsx`

- **`src/pages/UnifiedCandidateProfile.tsx`** edits:
  - Replace `ActivityFeedCard` + `ApplicationLogViewer` with `CandidateTimelineHub`
  - Add review history card for admin (all partner verdicts across applications)
  - Add strategist contact card for candidates
  - Add partner's own review history card

### Phase 7: Notifications & SLA

- **DB trigger migration**: On `applications.partner_review_status` change → insert into `activity_feed` with appropriate event type
- **DB trigger**: When `internal_review_status` set to `approved` → insert notification for assigned partner reviewer (from `pipeline_reviewers`)
- **SLA tracking**: Trigger creates `unified_tasks` when partner review is pending > 48h (scheduled via `pg_cron`)

---

## Files Summary

| New Files | Purpose |
|-----------|---------|
| `src/hooks/useReviewQueue.ts` | Review data fetching + mutations |
| `src/components/partner/InternalReviewPanel.tsx` | Admin pre-screening table |
| `src/components/partner/PartnerFirstReviewPanel.tsx` | Partner card-by-card review |
| `src/components/partner/ReviewConversionMetrics.tsx` | Funnel + metrics dashboard |
| `src/components/partner/ReviewerPerformanceCard.tsx` | Per-reviewer stats |
| `src/components/intelligence/CompanyHiringIntelligence.tsx` | Company pattern detection |
| `src/components/intelligence/JobSearchCalibration.tsx` | Job search refinement |
| `src/components/candidate-profile/CandidateTimelineHub.tsx` | Unified 360 timeline |
| `src/components/candidate-profile/SourcingAttributionBadge.tsx` | Sourcing badge |
| `supabase/functions/analyze-review-patterns/index.ts` | AI pattern analysis |
| 1 SQL migration (Phase 1) | Tables, columns, triggers |
| 1 SQL migration (Phase 7) | Notification triggers |

| Edited Files | Changes |
|-------------|---------|
| `JobDashboard.tsx` | Add Reviews tab with sub-tabs |
| `ExpandablePipelineStage.tsx` | Filter by partner_review_status |
| `PipelineCustomizer.tsx` | Reviewer assignment section |
| `UnifiedCandidateProfile.tsx` | Swap timeline, add role-specific cards |
| `CandidateHeroSection.tsx` | Add SourcingAttributionBadge |
| `supabase/config.toml` | Register analyze-review-patterns |

I recommend starting with **Batch 1** (database + review UI). Shall I proceed?

