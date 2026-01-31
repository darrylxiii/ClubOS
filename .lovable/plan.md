
# Candidate Home Page Audit & Feature Roadmap

## Current Score: 88/100

---

## Critical Bug Fix: "Unknown Position" in Top Matches

### Root Cause Identified
The `JobRecommendations` component displays "Unknown Position" because:

1. **139 orphaned match_scores** reference jobs that have been **deleted** from the `jobs` table
2. The current code only checks if `job_id` exists in the lookup, but for deleted jobs, the join returns `null`
3. No fallback filtering excludes these orphaned records from display

### Data Evidence
```
Orphaned (job deleted): 139 records
Valid: 235 records
Total: 374 match_scores with UUID job_ids
```

### Fix Required (Score Impact: +5 points)

**Option A: Filter at Query Level (Recommended)**
- Use a database view or modify the query to only return match_scores where the job still exists
- Add a JOIN to filter orphaned records at fetch time

**Option B: Cleanup + Prevent**
- Delete orphaned match_scores from database
- Add a database trigger to cascade delete match_scores when a job is deleted

**Implementation:**
1. Modify `fetchRecommendations()` in `JobRecommendations.tsx` to filter out matches where job lookup returns null
2. Add ON DELETE CASCADE to match_scores foreign key (for future prevention)
3. Optionally clean up the 139 orphaned records

---

## Current Home Page Architecture

The candidate home (`/home` → `CandidateHome.tsx`) contains these widgets:

| Widget | Status | Description |
|--------|--------|-------------|
| UnifiedStatsBar | ✅ Complete | Applications, Matches, Interviews, Messages |
| NextBestActionCard | ✅ Complete | QUIN-powered priority actions |
| PushNotificationOptIn | ✅ Complete | Added in Phase 1 |
| InterviewCountdownWidget | ✅ Complete | Live countdown to next interview |
| StrategistContactCard | ✅ Complete | Dedicated recruiter contact |
| ProfileCompletion | ✅ Complete | With itemized breakdown |
| ApplicationStatusTracker | ✅ Complete | Pipeline visualization |
| JobRecommendations | ⚠️ Bug | "Unknown Position" issue |
| NotificationsPreviewWidget | ✅ Complete | Recent notifications |
| CandidateQuickActions | ✅ Complete | Quick navigation cards |
| QuickTipsCarousel | ✅ Complete | Expert advice |
| UpcomingMeetingsWidget | ✅ Complete | Calendar integration |
| MessagesPreviewWidget | ✅ Complete | Recent messages |
| SavedJobsWidget | ✅ Complete | Real-time subscriptions |
| DocumentStatusWidget | ✅ Complete | CV/document status |
| ReferralStatsWidget | ✅ Complete | Referral earnings |
| AchievementsPreviewWidget | ✅ Complete | XP and badges |
| Club Projects Banner | ✅ Complete | Dismissible promo |
| ActivityTimeline | ✅ Complete | Recent activity feed |

---

## Missing Features Analysis

### Category 1: Market Intelligence (Score Impact: +3)

| Feature | Status | Description |
|---------|--------|-------------|
| Salary Insights Widget | ❌ Missing | Quick salary benchmark on home |
| Market Trends Preview | ❌ Missing | Industry demand indicators |
| Skill Demand Radar | ❌ Missing | Hot skills in user's field |

### Category 2: Career Growth Tools (Score Impact: +2)

| Feature | Status | Description |
|---------|--------|-------------|
| Career Progress Tracker | ❌ Missing | Journey visualization |
| Skill Gap Summary | ❌ Missing | What to learn next |
| Learning Recommendations | ❌ Missing | Academy course suggestions |

### Category 3: Social & Network (Score Impact: +1)

| Feature | Status | Description |
|---------|--------|-------------|
| Network Strength Score | ❌ Missing | Professional connections health |
| Referral Opportunities | ❌ Missing | Roles to share with network |

### Category 4: Application Analytics (Score Impact: +1)

| Feature | Status | Description |
|---------|--------|-------------|
| Application Funnel Widget | ❌ Missing | Personal conversion metrics |
| Response Rate Tracker | ❌ Missing | How often candidates get responses |

---

## Scoring Breakdown

| Category | Current | Max | Notes |
|----------|---------|-----|-------|
| Core Dashboard Widgets | 18/20 | 20 | "Unknown Position" bug |
| Stats & Metrics | 10/10 | 10 | UnifiedStatsBar complete |
| Next Actions & AI | 10/10 | 10 | QUIN NextBestAction working |
| Job Discovery | 8/10 | 10 | Missing market intelligence |
| Career Tools | 6/10 | 10 | Missing progress/skill widgets |
| Communication | 10/10 | 10 | Messages, notifications complete |
| Social/Referrals | 8/10 | 10 | Missing network features |
| Gamification | 10/10 | 10 | Achievements, XP complete |
| Real-time Updates | 8/10 | 10 | Some widgets missing subscriptions |
| **TOTAL** | **88/100** | 100 | |

---

## Roadmap to 100/100

### Phase 1: Critical Bug Fix (+5 points)

**Task 1.1: Fix "Unknown Position" in JobRecommendations**
- Filter out orphaned match_scores at query time
- Add null check before displaying
- Show only jobs that actually exist

**Task 1.2: Database Cleanup**
- Add cascade delete trigger for match_scores → jobs
- Clean orphaned records

### Phase 2: Market Intelligence Widget (+3 points)

**Task 2.1: SalaryInsightsWidget**
- Compact salary range for user's role/location
- "How you compare" indicator
- Link to full Salary Insights page

**Task 2.2: SkillDemandWidget**
- Top 3 hot skills in user's field
- Growth/decline indicators
- Link to skill gap analysis

### Phase 3: Career Progress Widget (+2 points)

**Task 3.1: CareerProgressWidget**
- Visual journey from current → target role
- Milestones achieved (applications, interviews, offers)
- "Career velocity" score

**Task 3.2: LearningRecommendationsWidget**
- 3 suggested Academy courses based on skill gaps
- Progress on current courses
- Link to Academy

### Phase 4: Application Analytics (+1 point)

**Task 4.1: ApplicationFunnelWidget**
- Mini funnel: Applied → Screened → Interview → Offer
- Personal conversion rates
- Industry comparison

### Phase 5: Network Features (+1 point)

**Task 5.1: NetworkStrengthWidget**
- Connection quality score
- Referral opportunities available
- "Who to reach out to" suggestion

---

## Technical Implementation Details

### Fix 1: JobRecommendations.tsx

```typescript
// Filter orphaned records BEFORE mapping
const formatted = matches
  .map(match => {
    const isUuid = uuidRegex.test(match.job_id);
    const jobInfo = isUuid ? jobsMap[match.job_id] : null;
    
    // Skip if UUID but job doesn't exist (deleted)
    if (isUuid && !jobInfo) {
      return null;
    }
    
    // ... rest of mapping
  })
  .filter(Boolean); // Remove nulls
```

### Fix 2: Database Migration

```sql
-- Clean up orphaned match_scores
DELETE FROM match_scores ms
WHERE ms.job_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
AND NOT EXISTS (
  SELECT 1 FROM jobs j WHERE j.id = ms.job_id::uuid
);

-- Add cascade delete for future
-- (if FK doesn't exist, this prevents future orphans)
```

### New Widgets (Summary)

| Widget | Data Source | Complexity |
|--------|-------------|------------|
| SalaryInsightsWidget | salary_benchmarks table | Low |
| SkillDemandWidget | jobs table (aggregate) | Medium |
| CareerProgressWidget | applications + profiles | Medium |
| LearningRecommendationsWidget | courses + user_skills | Medium |
| ApplicationFunnelWidget | applications (aggregate) | Low |
| NetworkStrengthWidget | referrals + connections | Medium |

---

## Priority Order

1. **Immediate (Blocking)**: Fix "Unknown Position" bug
2. **High (Quick Win)**: Clean orphaned match_scores
3. **Medium**: Add SalaryInsightsWidget, SkillDemandWidget
4. **Low**: Career progress, Learning, Network widgets

---

## Summary

The candidate home page is **88/100** - a solid, feature-rich dashboard with one critical bug. The "Unknown Position" issue affects ~37% of displayed matches due to orphaned records from deleted jobs.

**Quick Wins:**
- Fix JobRecommendations filtering (+5 points)
- Add SalaryInsightsWidget (+2 points)
- Add CareerProgressWidget (+2 points)

Implementing Phase 1-2 would bring the home page to **93/100**, with Phase 3-5 completing the journey to **100/100**.
