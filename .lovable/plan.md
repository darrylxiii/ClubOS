
# Candidate Profile Page Redesign — Holistic Layout

## Status: COMPLETE

All changes shipped. Plan retained for reference.

### Change 1 — Hero + Assessment merge
**File**: `CandidateHeroSection.tsx`
Hero now accepts `assessmentBreakdown`, renders 6 dimension score cards in a compact 6-column grid, radar chart (180px) on the right, collapsible AI Summary with strengths/concerns badges. Avatar reduced to 96px, buttons compacted.

### Change 2 — DecisionDashboard removed from profile
**File**: `UnifiedCandidateProfile.tsx`
`CandidateDecisionDashboard` no longer imported or rendered. `useAssessmentScores` lifted to page level, passed to both Hero and SkillAssessment. Grid changed to 65/35 (1fr_300px). Spacing tightened to `space-y-3`.

### Change 3 — Experience promoted, sections reordered
**File**: `UnifiedCandidateProfile.tsx`
`ExperienceTimeline` moved to first position in left column. Portfolio conditionally rendered only when items exist.

### Change 4 — SkillAssessment deduplicated
**File**: `CandidateSkillAssessment.tsx`
Top-level assessment card (overall score, dimension cards, radar) removed — now in Hero. Component only renders sub-components: SkillMatchBreakdown, CultureFitSignals, EngagementTimeline, SalaryComparisonVisualizer, AvailabilityNoticeCard, CareerTrajectoryTimeline. Accepts `breakdown` as prop instead of calling `useAssessmentScores` internally.

### Change 5 — Assessment Scoring Upgrade (42→100)
**File**: `supabase/functions/calculate-assessment-scores/index.ts`
- Fetches 4 new intelligence tables: `interview_intelligence`, `candidate_interview_performance`, `meeting_participants`, `values_poker_sessions`
- Culture Fit: integrates AI interview scores (35%), performance reviews (25%), feedback (20%), values poker (10%), personality/brief (10%)
- Skills Match: proficiency-weighted matching (expert=1.0, intermediate=0.7, beginner=0.4) + interview technical scores (15% supplemental)
- Engagement: adds meeting attendance signal (20% weight) with redistribution of existing weights
- Salary: fallback chain — current_salary+15% → seniority median → 0
- Location: fallback to current location (confidence 0.4) + work authorization EU check
- Overall: confidence-weighted average (Skills 25%, Experience 20%, Engagement 15%, Culture 15%, Salary 15%, Location 10%)

### Change 6 — Confidence visualization
**File**: `CandidateHeroSection.tsx`
- Dimension cards show confidence dot indicator: green (>0.5), amber (0.2-0.5), red (<0.2)
- Low confidence cards dimmed (opacity-40/70) with dashed border
- Tooltips explain confidence level and percentage
- "Computed at" relative timestamp shown next to QUIN label
