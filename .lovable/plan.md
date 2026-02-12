
# Enterprise Skill Matrix and Assessment Engine

## Problem Statement

The candidate profile's "Overall Assessment" card shows a radar chart with six dimensions — Skills Match, Experience, Engagement, Culture Fit, Salary Match, and Location — but **five of six are broken**:

- **Skills Match**: Uses `fit_score` which is NULL for 153 of 154 candidates. No computation exists.
- **Engagement**: Uses `engagement_score` which is NULL for 153 of 154 candidates. No computation exists.
- **Culture Fit**: Incorrectly mapped to `internal_rating` (a manual field). No culture-fit scoring logic exists.
- **Salary Match**: Hardcoded to `80`. Never computed from actual salary data.
- **Location**: Hardcoded to `70`. Never computed from actual location/remote preferences.
- **Experience**: Works (derived from `years_of_experience`) but capped arbitrarily at 10 years.

The SkillMatrix component below the radar is a static list of skill tags with no match analysis against job requirements.

---

## Data Sources Available (Already in Database)

| Data Point | Table | Status |
|---|---|---|
| Candidate skills (raw) | `candidate_profiles.skills` (JSONB) | Sparse, mostly empty |
| Candidate skills (structured) | `profile_skills` (9 rows across 2 users) | Very sparse |
| Skills taxonomy | `skills_taxonomy` (200 entries) | Good |
| Job requirements | `job_postings.requirements[]`, `nice_to_have[]` | Good |
| Interview feedback | `interview_feedback` (culture_fit_score, technical_score, communication_score) | Available |
| Role feedback | `role_candidate_feedback` (skills_match_score, experience_match_score) | Available |
| Company feedback | `company_candidate_feedback` (culture_fit_issues, skills_mismatch) | Available |
| Talent matches | `talent_matches` (match_score, match_factors) | Available |
| Candidate interactions | `candidate_interactions` (for engagement) | 0 rows for current candidate |
| Salary data | `candidate_profiles` (current_salary, desired_salary_min/max) | Available |
| Job comp bands | `job_postings` (salary_min, salary_max) | Available |
| Location prefs | `candidate_profiles` (preferred_locations, remote_preference) | Available |
| Job location | `job_postings` (location, remote_allowed) | Available |

---

## Implementation Plan

### Phase 1: Database — Composite Score Calculation Function

Create a PostgreSQL function `calculate_candidate_assessment_scores` that computes all six dimensions for a candidate-job pair:

**Skills Match (0-100)**
1. Compare `candidate_profiles.skills` + `profile_skills` against `job_postings.requirements` and `nice_to_have`
2. Use `skills_taxonomy.synonyms` for fuzzy matching (e.g., "JS" matches "JavaScript")
3. Weight: must-have skills = 2x, nice-to-have = 1x
4. Formula: `(matched_must_have / total_must_have * 0.7 + matched_nice_to_have / total_nice_to_have * 0.3) * 100`
5. Aggregate any `role_candidate_feedback.skills_match_score` values as a secondary signal

**Engagement Score (0-100)**
1. Count interactions from `candidate_interactions` (last 90 days)
2. Factor in `candidate_application_logs` activity
3. Profile completeness as a signal
4. Last login/activity recency
5. Formula: weighted sum of interaction_frequency (30%), response_speed (25%), profile_updates (20%), login_recency (25%)

**Culture Fit (0-100)**
1. Aggregate `interview_feedback.culture_fit_score` (1-10 scale, normalize to 0-100)
2. Factor in `company_candidate_feedback.culture_fit_issues` (penalty per issue)
3. If no interview data exists, use personality alignment from AI insights (if available)
4. Show "Insufficient data" indicator when no feedback exists (instead of showing 0)

**Salary Match (0-100)**
1. Compare `candidate_profiles.desired_salary_min/max` against `job_postings.salary_min/max`
2. Perfect overlap = 100, partial overlap scales down, no overlap = 0
3. Account for currency differences using `preferred_currency`

**Location Match (0-100)**
1. If job is fully remote and candidate prefers remote: 100
2. If candidate's preferred_locations includes job location: 100
3. Hybrid with partial match: 70
4. No match: 20

**Experience Match (0-100)**
1. Compare `years_of_experience` against job seniority expectations
2. Use a bell curve: exact match = 100, +/-2 years = 80, over/under-qualified penalty

### Phase 2: Edge Function — `calculate-assessment-scores`

A new edge function that:
1. Accepts `candidate_id` and optionally `job_id`
2. If `job_id` provided: compute per-job match scores
3. If no `job_id`: compute a general profile score using aggregated data across all applications
4. Writes results back to `candidate_profiles.fit_score`, `engagement_score`, and a new JSONB column `assessment_breakdown`
5. Returns the full breakdown for immediate UI use

### Phase 3: Database Schema Update

```text
candidate_profiles:
  + assessment_breakdown    JSONB   -- { skills_match, engagement, culture_fit, salary_match, location_match, experience_match, computed_at, job_id }
  + assessment_computed_at  TIMESTAMPTZ
```

### Phase 4: Enhanced Skill Matrix Component

Replace the current `SkillMatrix` component on the candidate profile with an enterprise-grade version:

**New `CandidateSkillAssessment` component:**
- **Skills Match Panel**: Side-by-side comparison of candidate skills vs job requirements
  - Green checkmarks for matched must-have skills
  - Yellow for matched nice-to-have
  - Red X for missing must-have skills
  - Taxonomy-aware matching (synonyms highlighted)
  - Proficiency level bars per skill (from `profile_skills.proficiency_level`)

- **Radar Chart (Fixed)**: All six axes now driven by real computed data
  - Shows "No data" gracefully when scores cannot be computed
  - Tooltip on each axis explaining the calculation
  - Color-coded: green (70+), amber (40-69), red (0-39)

- **Score Cards**: The four existing ScoreBadge cards updated to show real data
  - Each card shows the score source ("Based on 3 interviews" or "Needs more data")
  - Click-to-expand showing the breakdown formula

- **Culture Fit Signals**: New section showing
  - Interview feedback culture scores (from `interview_feedback`)
  - Flagged culture concerns (from `company_candidate_feedback.culture_fit_issues`)
  - Personality alignment notes (from `personality_insights`)

- **Engagement Timeline**: Mini sparkline showing interaction frequency over last 90 days

### Phase 5: Auto-Compute Triggers

- Trigger `calculate-assessment-scores` when:
  - A new `interview_feedback` row is inserted
  - A new `role_candidate_feedback` or `company_candidate_feedback` row is inserted
  - A candidate's profile is updated (skills, salary, location)
  - A candidate is matched to a new job via `talent_matches`
- Use a database trigger to set `assessment_computed_at = NULL` on relevant changes, and a periodic cron (or on-read check) to recompute stale scores

### Phase 6: Context-Aware Job Matching

When the candidate profile is opened from a specific job (`fromJob` query param exists):
- Show the per-job skill match breakdown (candidate skills vs that job's requirements)
- Highlight gaps: "Missing 2 of 5 must-have skills: Docker, Kubernetes"
- Show salary band overlap visualization
- Show location compatibility

When opened without a job context:
- Show aggregate scores across all applications
- Show "best fit" job recommendation from `talent_matches`

---

## Technical Details

### Files to Create
| File | Purpose |
|---|---|
| `supabase/functions/calculate-assessment-scores/index.ts` | Edge function for score computation |
| `src/components/candidate-profile/CandidateSkillAssessment.tsx` | Enterprise skill matrix + radar |
| `src/components/candidate-profile/SkillMatchBreakdown.tsx` | Side-by-side skill comparison |
| `src/components/candidate-profile/CultureFitSignals.tsx` | Culture fit evidence panel |
| `src/components/candidate-profile/EngagementTimeline.tsx` | Mini engagement sparkline |
| `src/hooks/useAssessmentScores.ts` | Hook to fetch/compute scores |

### Files to Modify
| File | Change |
|---|---|
| `src/pages/UnifiedCandidateProfile.tsx` | Replace `SkillMatrix` with `CandidateSkillAssessment`, pass `fromJob` |
| `src/components/partner/CandidateDecisionDashboard.tsx` | Use real computed scores instead of raw DB fields; remove hardcoded 80/70 |
| Migration SQL | Add `assessment_breakdown` JSONB + `assessment_computed_at` columns |

### Score Computation Priority
The edge function will compute scores in this priority order:
1. **Hard data first**: Interview feedback scores, salary numbers, location data
2. **Derived signals second**: Skill taxonomy matching, interaction counts
3. **AI-inferred last**: Personality alignment, AI summary sentiment
4. Each dimension includes a `confidence` field (0-1) indicating data density

### Handling Missing Data
- If a dimension has zero data points, display "Needs assessment" instead of 0
- Radar chart uses dashed lines for low-confidence dimensions
- ScoreBadge shows a muted state with "Collect more data" helper text
- The overall score only averages dimensions with confidence > 0.3
