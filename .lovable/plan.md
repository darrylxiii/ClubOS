
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
