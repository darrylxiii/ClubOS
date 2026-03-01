
# Candidate Home Redesign -- 0.1% Executive Experience

## Problem

The current CandidateHome is 20+ widgets dumped into 3 collapsible accordion sections. It feels like a settings page, not a home. Candidates land on a stats bar, a QUIN card, an AI chat box, then "Collapse/Expand" toggles hiding the actual important content. There is no visual hierarchy, no breathing room, and no sense of "this is your command center."

## Design Philosophy

Think Apple Health meets Bloomberg Terminal meets a private concierge dashboard. Three principles:

1. **Show, don't list** -- Surface the 1 most important thing in each category, not a full inventory
2. **Progressive depth** -- Home = glanceable summary. Detail pages exist for deep dives
3. **One CTA per zone** -- Each section has exactly one action. No decision fatigue

## New Layout Structure

```text
+--------------------------------------------------+
|  QUIN Next Best Action (slim banner)              |
+--------------------------------------------------+
|                                                    |
|  Pipeline Snapshot          Next Interview          |
|  [3 stage pills]           [countdown + join]      |
|  "2 active, 1 in final"    "Tomorrow, 2pm"         |
|                                                    |
+--------------------------------------------------+
|                                                    |
|  Club AI (inline chat bar -- already good)         |
|                                                    |
+--------------------------------------------------+
|                                                    |
|  Your Strategist (compact inline)                  |
|  [avatar] Sarah K. -- Talent Strategist  [Message] |
|                                                    |
+--------------------------------------------------+
|                                                    |
|  For You       Saved (2)     Messages (1 new)      |
|  [job card]    [job card]    [msg preview]          |
|  [job card]    [job card]    [msg preview]          |
|  See all ->    See all ->    See all ->             |
|                                                    |
+--------------------------------------------------+
|                                                    |
|  Profile Strength [=====75%====]  Complete ->       |
|                                                    |
+--------------------------------------------------+
```

## What Gets Removed from Home

These widgets move to their dedicated pages (they already exist there):

| Widget | New Home |
|---|---|
| UnifiedStatsBar (4 metric cards) | Removed -- QUIN banner + pipeline snapshot replaces it |
| DocumentStatusWidget | /settings?tab=documents |
| NotificationsPreviewWidget | /notifications (bell icon in header) |
| PushNotificationOptIn | /settings?tab=notifications |
| SalaryInsightsWidget | /analytics |
| SkillDemandWidget | /analytics |
| CareerProgressWidget | /analytics |
| AchievementsPreviewWidget | /achievements |
| ReferralStatsWidget | /referrals |
| ActivityTimeline | /applications |
| CandidateQuickActions | Absorbed into the layout itself |

## What Stays (Reimagined)

### 1. QUIN Next Best Action -- Stays as-is (already good, slim banner)

### 2. Pipeline Snapshot (NEW)
Replaces ApplicationStatusTracker + UnifiedStatsBar. A single compact card showing:
- 3 horizontal stage indicators (Applied / Interview / Offer) with counts
- Most advanced application highlighted (company + stage)
- Single "View Pipeline" link
- If empty: "No active applications -- Browse roles"

### 3. Interview Countdown -- Stays but made compact
- Only shows if an interview exists within 7 days
- Compact: one line with countdown + "Prepare" or "Join" button
- If no interview: section is hidden entirely (no empty state card)

### 4. Club AI Chat -- Stays as-is (good design)

### 5. Strategist Contact -- Stays but made inline
- Single row: avatar + name + title + "Message" button
- No card wrapper, just a subtle divider row
- If no strategist assigned: hidden entirely

### 6. Three-Column Discovery Grid (NEW)
Replaces SavedJobs + JobRecommendations + MessagesPreview as a unified section:
- **For You**: Top 2 AI-matched jobs (from JobRecommendations)
- **Saved**: Top 2 saved jobs (from SavedJobsWidget)  
- **Messages**: Top 2 recent messages (from MessagesPreviewWidget)
- Each column has a "See all" link to its full page
- On mobile: horizontal scroll or stacked

### 7. Profile Strength -- Stays but made a slim progress bar
- Single line: "Profile Strength" + progress bar + percentage + "Complete" link
- Not a full card with breakdown -- that lives in /settings

## Files Changed

### 1. `src/components/clubhome/CandidateHome.tsx` -- Complete rewrite
- Remove all collapsible sections and 15 widget imports
- New clean layout with 5 focused sections
- Conditional rendering (no empty state cards for missing data)

### 2. `src/components/clubhome/PipelineSnapshot.tsx` -- New component
- Compact application pipeline summary
- Queries applications, shows stage counts + top application
- Single "View Pipeline" CTA

### 3. `src/components/clubhome/DiscoveryGrid.tsx` -- New component
- Three-column layout: For You / Saved / Messages
- Each column fetches its own data (2 items max)
- Responsive: 3 cols on desktop, stacked on mobile

### 4. `src/components/clubhome/CompactProfileStrength.tsx` -- New component
- Slim single-row progress indicator
- Reuses existing profile completion logic

### 5. `src/components/clubhome/CompactStrategist.tsx` -- New component
- Inline row format of StrategistContactCard
- Hidden when no strategist assigned

### 6. `src/components/clubhome/CompactInterviewCountdown.tsx` -- New component
- Single-row countdown, only visible when interview is within 7 days

No existing widgets are deleted -- they remain available for their dedicated pages. The home page simply stops importing them.

## Technical Notes

- All data fetching uses existing hooks/queries (useApplications, saved-jobs-widget, etc.)
- Framer Motion entrance animations kept but simplified (fade-in only, no stagger cascades)
- Mobile-first: all sections stack naturally, discovery grid goes 1-column
- Dark monochromatic palette maintained per brand constraints
- No gold accents, no emojis in headings, calm professional tone
