

# Skill Assessment Engine -- Full Audit & Enterprise Upgrade Plan

## Current Score: 52/100

Here is the brutally honest breakdown:

---

## AUDIT SCORECARD

| Category | Score | Max | Notes |
|---|---|---|---|
| **Core Functionality** | 8/20 | 20 | The `calculate-assessment-scores` edge function is completely broken in the browser due to missing `x-application-name` CORS header (line 5). 4 of 6 components show empty/error states. |
| **Error Handling & Resilience** | 6/15 | 15 | `useAssessmentScores` silently fails; error state exists but is never surfaced to the UI. `CultureFitSignals` and `EngagementTimeline` show "No data" when the real problem is a CORS failure, misleading the user. No retry button on those sub-components. |
| **Data Completeness** | 10/15 | 15 | Computation logic is solid (724 lines, 6 dimensions, synonym-aware skill matching, salary normalization, location matrix). But no job-agnostic fallback intelligence is surfaced. |
| **UI/UX Quality** | 12/15 | 15 | Radar chart, dimension cards, sparkline, concern flags are well-built. But the 3-column layout `grid-cols-[auto_1fr_280px]` breaks on smaller screens (no responsive fallback). Assessment section is split across 4 separate cards on the page (`InterviewScorecard`, `AssessmentInsightsCard`, `CandidateSkillAssessment`) with no visual grouping. |
| **Component Cohesion** | 5/10 | 10 | `InterviewScorecard` and `AssessmentInsightsCard` sit outside `CandidateSkillAssessment` in the page layout but serve the same domain. Culture Fit loads feedback independently but then hides it all if `breakdown` is null. |
| **Security** | 6/10 | 10 | `calculate-assessment-scores` uses `SUPABASE_SERVICE_ROLE_KEY` with `verify_jwt = true`, which means Supabase gateway validates the JWT before forwarding -- acceptable. But the function accepts any `candidate_id` without verifying the caller has permission to view that candidate. |
| **Performance** | 5/15 | 15 | Edge function does 6+ sequential/parallel DB queries per call. No caching beyond 24h staleness check. `CultureFitSignals` and `EngagementTimeline` each make their own DB calls on mount, duplicating data the edge function already fetched. Auto-recompute fires on every page load if data is stale. |

**Total: 52/100**

---

## WHAT IS BROKEN RIGHT NOW (Critical)

### 1. CORS Header Missing on `calculate-assessment-scores` (Blocker)
- Line 5: `x-application-name` is not in `Access-Control-Allow-Headers`
- This is the exact same bug we just fixed on `extract-skills-from-experience`
- **Impact**: Overall Assessment Card shows 0/---, CultureFitSignals shows "No data", EngagementTimeline shows "No data"

### 2. CultureFitSignals Hides Valid Data
- The component loads interview feedback independently (lines 26-44), which works fine
- But it gates ALL rendering on `hasData = cultureFitData && cultureFitData.confidence > 0.1` (line 48)
- If the breakdown call fails (which it does), `cultureFitData` is null, so even valid feedback entries are hidden behind the "No culture fit data yet" empty state

### 3. EngagementTimeline Same Problem
- Sparkline data loads independently and works (lines 26-72)
- But score display is gated on `hasData = engagementData && engagementData.confidence > 0.1` (line 75)
- When breakdown is null, the entire sparkline is hidden even though the data is there

### 4. Error State Not Surfaced
- `useAssessmentScores` has an `error` field but `CandidateSkillAssessment` destructures only `{ breakdown, isLoading, isComputing, recompute }` -- `error` is discarded (line 31)
- Users see "Needs data" on dimension cards with no indication of what went wrong

---

## WHAT IS MEDIOCRE (Needs Improvement)

### 5. Responsive Layout
- Main assessment card uses `grid-cols-[auto_1fr_280px]` (line 166) -- breaks on tablet/mobile
- No `lg:` or `md:` breakpoints

### 6. Duplicate Data Fetching
- `CultureFitSignals` re-fetches applications + interview_feedback that the edge function already queried
- `EngagementTimeline` re-fetches interactions, app logs, and comms that the edge function already queried
- This doubles DB load for every profile view

### 7. No Job Selector
- `jobId` is passed from URL param `fromJob`, but there's no UI to pick a different job to compare against
- Strategists often want to see how a candidate scores against multiple roles

### 8. Assessment Section Fragmentation
- `InterviewScorecard` and `AssessmentInsightsCard` are rendered ABOVE `CandidateSkillAssessment` as separate cards
- From a user's perspective, all assessment data belongs together but is scattered across the page

### 9. Auto-Compute Without Consent
- `useAssessmentScores` auto-fires `computeScores()` when data is stale or missing (line 103)
- This silently calls an edge function on every page load, which is costly and unexpected

---

## WHAT IS MISSING (New Components)

### 10. Availability & Notice Period Card
- Data exists: `notice_period`, `availability_status`, `earliest_start_date`, `work_authorization`
- Not visualized anywhere in the assessment section
- Critical for strategists making shortlist decisions

### 11. Salary Comparison Visualizer
- Data exists: `current_salary_min/max`, `desired_salary_min/max` on candidate; `salary_min/max` on job
- Currently only shown as a number in the assessment dimension tooltip
- A visual range bar would make comp alignment instantly clear

### 12. Career Trajectory Timeline
- Data exists: `work_history` JSON array with titles, companies, durations
- The edge function already computes a "progression bonus" but never exposes the visual
- Shows career velocity and seniority progression

---

## THE FIX PLAN (Target: 95/100)

### Phase 1: Unblock (Critical)
1. **Fix CORS** on `calculate-assessment-scores/index.ts` -- add `x-application-name` to line 5
2. **Surface error state** in `CandidateSkillAssessment` -- destructure and display `error` from `useAssessmentScores`
3. **Redeploy** the function

### Phase 2: Resilience
4. **CultureFitSignals** -- show feedback entries even when `breakdown` is null; use locally computed score as fallback
5. **EngagementTimeline** -- show sparkline even when `breakdown` is null; compute local engagement summary from the data already fetched
6. **useAssessmentScores** -- add explicit retry with toast feedback; remove silent auto-compute (require user click)

### Phase 3: Responsive & Cohesion
7. **Fix layout** -- change `grid-cols-[auto_1fr_280px]` to responsive grid with `lg:grid-cols-[auto_1fr_280px] grid-cols-1`
8. **Consolidate** -- move the assessment error/empty state to a unified banner at the top of the section

### Phase 4: New Components
9. **AvailabilityNoticeCard** -- compact card showing notice period, earliest start, availability status, work authorization with semantic color coding
10. **SalaryComparisonVisualizer** -- horizontal stacked bar showing current range, desired range, and job range with overlap highlighting
11. **CareerTrajectoryTimeline** -- vertical mini-timeline from `work_history` showing title progression, company names, and computed seniority level with trend arrow

### Phase 5: Polish
12. **Job Selector Dropdown** -- let strategists pick a job to compare against from the assessment header
13. **"Powered by QUIN"** label on AI-computed dimensions
14. **Confidence indicators** -- replace text "Low confidence" with a visual dot system (1-3 dots)

---

## FILES TO MODIFY

| File | Change |
|---|---|
| `supabase/functions/calculate-assessment-scores/index.ts` | Add `x-application-name` to CORS headers (line 5) |
| `src/hooks/useAssessmentScores.ts` | Surface error, remove auto-compute, add manual retry with toast |
| `src/components/candidate-profile/CandidateSkillAssessment.tsx` | Destructure `error`, fix responsive grid, add 3 new component slots, add job selector, add QUIN label |
| `src/components/candidate-profile/CultureFitSignals.tsx` | Show feedback independently of breakdown; compute local fallback score |
| `src/components/candidate-profile/EngagementTimeline.tsx` | Show sparkline independently of breakdown; compute local engagement summary |
| `src/components/candidate-profile/AvailabilityNoticeCard.tsx` | New: notice period, earliest start, availability, work authorization |
| `src/components/candidate-profile/SalaryComparisonVisualizer.tsx` | New: horizontal range bars with overlap detection |
| `src/components/candidate-profile/CareerTrajectoryTimeline.tsx` | New: work history progression with seniority detection |

---

## PROJECTED SCORE AFTER IMPLEMENTATION

| Category | Before | After | Delta |
|---|---|---|---|
| Core Functionality | 8 | 19 | +11 (CORS fixed, all 6 dimensions populate) |
| Error Handling | 6 | 14 | +8 (error surfaced, fallbacks work, no misleading empty states) |
| Data Completeness | 10 | 14 | +4 (3 new components surface existing data) |
| UI/UX Quality | 12 | 15 | +3 (responsive, job selector, confidence dots) |
| Component Cohesion | 5 | 9 | +4 (independent fallbacks, unified section) |
| Security | 6 | 8 | +2 (QUIN attribution, no new exposure) |
| Performance | 5 | 13 | +8 (remove auto-compute, local fallbacks reduce edge function calls) |
| **Total** | **52** | **92** | **+40** |

To reach 100: would need RLS-level authorization check in the edge function (verify caller owns or is assigned to the candidate), server-side caching of computed breakdowns with invalidation, and E2E tests for each assessment component. Those are follow-up items.

