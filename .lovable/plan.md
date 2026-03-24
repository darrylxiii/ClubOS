

# Candidate Profile Page Redesign — Holistic, Scroll-Minimized Layout

## Current Problems

1. **Duplication**: "Overall Assessment" (CandidateDecisionDashboard) and "Skill Assessment" (CandidateSkillAssessment) show the same 6 dimensions (Skills Match, Experience, Engagement, Culture Fit, Salary Match, Location) with overlapping radar charts and score badges
2. **Wasted space**: Hero card has a large right-side gap next to name/title — the skill dimension cards and radar could live there
3. **Excessive scroll**: 12+ cards stacked vertically in the left column — many are sparse or empty
4. **Partner view shows empty shells**: Cards like MeetingIntelligence, InterviewScorecard, AssessmentInsights render empty states when no data exists, adding clutter
5. **Quick Facts grid** at bottom of DecisionDashboard duplicates data already in Career Preferences sidebar card
6. **Personality Insights** card is usually empty, taking up space

## Redesign Plan

### Zone 1 — Hero + Assessment (above the fold)

Merge the hero section with the Skill Assessment dimension cards into a single wide card:

```text
┌──────────────────────────────────────────────────────────────┐
│ [Avatar]  Name / Title / Contact / Badges     │ Radar Chart │
│           Action buttons (Edit, LinkedIn,...)  │   (220px)   │
│                                                │             │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐          │
│  │Skill│ │Exp  │ │Engmt│ │Cult.│ │Salary│ │Loc  │          │
│  │Match│ │     │ │     │ │Fit  │ │Match │ │     │          │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘          │
└──────────────────────────────────────────────────────────────┘
```

- Remove `CandidateDecisionDashboard` entirely from the page
- Move Quick Actions bar (Schedule Interview, Log Verdict, Move to Offer) into the hero section as a slim action row beneath the badges — only when `applicationId` exists
- Move AI Summary + Strengths + Concerns into a collapsible section within the hero or as the first item below it
- The 6 dimension score cards from `CandidateSkillAssessment` render as a compact row below the avatar/name inside the hero card
- Radar chart sits to the right of the name block

### Zone 2 — Pipeline Context (conditional)

Keep `PipelineBreakdownCard` as-is, shown only when an application exists. No change.

### Zone 3 — Main Content Grid (two-column, 65/35)

```text
┌────────────────────────────────┬──────────────────┐
│ Work Experience + Education    │ Career Prefs     │
│ (promoted to first position)   │ Work Auth        │
│                                │ Data Completeness│
│ Skill Match Breakdown          │ Tags (admin)     │
│ Culture Fit + Engagement row   │ Talent Pool      │
│ Salary + Availability + Career │ Activity Feed    │
│                                │                  │
│ Meeting Intelligence*          │                  │
│ Interview Scorecard*           │                  │
│ Assessment Insights*           │                  │
│ Portfolio*                     │                  │
│ Documents*                     │                  │
│ Notes                          │                  │
│                                │                  │
│ TQC Internal (admin only)      │ Move Probability │
│ Audit Log (admin only)         │ Relationship     │
│                                │ App Log (admin)  │
└────────────────────────────────┴──────────────────┘
* = only rendered when data exists (no empty shells)
```

### Key Changes

**File: `src/pages/UnifiedCandidateProfile.tsx`**
- Remove `CandidateDecisionDashboard` import and render
- Move `ExperienceTimeline` to first position in left column (was after 4 other cards)
- Pass assessment dimension data + radar chart to the hero section
- Wrap `MeetingIntelligenceCard`, `InterviewScorecard`, `AssessmentInsightsCard`, `PortfolioGrid` in conditional renders that check for actual data before mounting
- Move `PersonalityInsights` content (from DecisionDashboard) into a collapsible section within the Skill Assessment area

**File: `src/components/candidate-profile/CandidateHeroSection.tsx`**
- Accept new props: `assessmentBreakdown`, `onRecompute`, `isComputing`, `applicationId`, `onAction`
- Render the 6 dimension score cards as a compact 6-column grid below the contact info row
- Render the radar chart (280px) to the right of the avatar+info block using the existing grid layout
- Add a slim Quick Actions bar (from DecisionDashboard) at the bottom of the hero card, only when `applicationId` is provided
- Include AI Summary as a collapsible `<details>` element below the score cards

**File: `src/components/candidate-profile/CandidateSkillAssessment.tsx`**
- Remove the top "Main Assessment Card" section (overall score + dimension cards + radar) — this is now in the hero
- Keep only the sub-components: `SkillMatchBreakdown`, `CultureFitSignals`, `EngagementTimeline`, `SalaryComparisonVisualizer`, `AvailabilityNoticeCard`, `CareerTrajectoryTimeline`

**File: `src/components/partner/CandidateDecisionDashboard.tsx`**
- No longer imported by the profile page. Kept in codebase for potential reuse elsewhere but removed from this view.

### Conditional Rendering (eliminate empty blocks)

Each intelligence card will be wrapped:
```tsx
{/* Only render if the card has data — components will expose a render-nothing pattern */}
<MeetingIntelligenceCard candidateId={id} renderEmpty={false} />
```

For cards that don't support this pattern, wrap with a data-check query at the page level or add a `hideWhenEmpty` prop to each component.

### Visual Polish
- Hero card uses the same glassmorphism tokens (`candidateProfileTokens.glass.card`)
- Dimension cards use `rounded-xl p-2.5` (slightly tighter than current `p-3`) to fit 6 across
- Radar chart uses `h-[180px]` (down from 220) to keep hero compact
- Right sidebar width changes from `320px` to `300px` to give more room to the left column
- All section cards use consistent `space-y-3` (down from `space-y-4`) to tighten vertical rhythm

### What stays the same
- All data currently shown is preserved — nothing removed, only relocated and deduplicated
- Sidebar cards (Career Prefs, Work Auth, Activity Feed, Tags, Talent Pool, etc.) unchanged
- Admin-only sections remain gated behind `isAdmin`
- Partner view shows: Hero+Assessment, Pipeline, Experience, Skill Breakdown, Culture/Engagement, Documents, Notes
- `useAssessmentScores` hook called at page level and passed down (single query, no duplication)

## Files Changed

| File | Change |
|------|--------|
| `src/pages/UnifiedCandidateProfile.tsx` | Remove DecisionDashboard; reorder sections; lift assessment hook; conditional rendering |
| `src/components/candidate-profile/CandidateHeroSection.tsx` | Add assessment dimensions, radar, quick actions, AI summary |
| `src/components/candidate-profile/CandidateSkillAssessment.tsx` | Remove top assessment card (now in hero); keep sub-components only |

