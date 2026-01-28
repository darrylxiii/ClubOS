
# Comprehensive Candidate Home Dashboard Audit

## Executive Summary

The candidate home page exists in **two versions**:
1. `/home` route → renders `ClubHome.tsx` → which delegates to `CandidateHome.tsx`
2. `Home.tsx` — a standalone page that's NOT currently routed (legacy/unused)

**Current state: The main home page at `/home` uses `CandidateHome.tsx`**

---

## Component-by-Component Scoring

### 1. UnifiedStatsBar (Stats at Top)
**Score: 78/100**

| Aspect | Status | Issue |
|--------|--------|-------|
| Data fetching | Working | Uses `useRoleStats` hook |
| Real data | Partial | Applications ✓, Matches ✓, Interviews ✓, Messages ✓ |
| Animations | Excellent | Framer Motion stagger animations |
| Responsiveness | Good | 2-col mobile, 4-col desktop |

**Issues Found:**
- Matches count relies on `match_scores` table which has 370 entries but `JobRecommendations` has schema issues
- No click-through actions on stat cards
- Missing trend indicators (up/down arrows)

---

### 2. ProfileCompletion
**Score: 82/100**

| Aspect | Status | Issue |
|--------|--------|-------|
| Data source | Working | `profile_strength_stats` + `profile_strength_tasks` tables |
| Task navigation | Working | Clickable tasks navigate to correct pages |
| Progress calculation | Working | Multi-level system with percentages |
| UI polish | Good | Glass morphism, gradient CTAs |

**Issues Found:**
- Doesn't show when stats are null (loading state missing)
- Hardcoded task definitions may not sync with actual profile fields

---

### 3. NextBestActionCard (QUIN Powered)
**Score: 85/100**

| Aspect | Status | Issue |
|--------|--------|-------|
| Logic | Working | Prioritizes: Profile → Interview → Applications → CV → All Set |
| Data queries | Working | Fetches profile, bookings, applications, candidate_profile |
| UI | Excellent | Priority-based color coding, smooth animations |
| Actionability | Good | Direct links to action pages |

**Issues Found:**
- "Powered by QUIN" branding but no actual AI inference
- Limited action types (only 5 states)
- No personalized recommendations beyond basic checks

**Enhancement Opportunities:**
- Add AI-generated text explaining WHY this action matters
- Include estimated impact ("3x more recruiter views")
- Add deadline urgency for interview prep

---

### 4. NotificationsPreviewWidget
**Score: 80/100**

| Aspect | Status | Issue |
|--------|--------|-------|
| Data fetching | Working | Uses `useNotifications` hook |
| Real-time | Unknown | No visible subscription |
| Mark as read | Working | Individual + bulk mark read |
| Empty state | Good | Clear messaging |

**Issues Found:**
- Database shows 60 notifications but may not be user-specific
- No notification categories or filtering
- Missing notification preferences link

---

### 5. QuickTipsCarousel
**Score: 88/100**

| Aspect | Status | Issue |
|--------|--------|-------|
| Content quality | Excellent | 30 well-written tips across 5 categories |
| Responsiveness | Working | 1/2/3 cards per view based on screen |
| Auto-play | Working | 7-second interval with pause on hover |
| Navigation | Good | Arrows + dot indicators |

**Issues Found:**
- All actionLinks go to `/resources/*` which may not exist as pages
- Tips are static (not personalized to user's situation)
- No tip dismissal or "already read" tracking

---

### 6. Club Projects Banner
**Score: 72/100**

| Aspect | Status | Issue |
|--------|--------|-------|
| Content | Good | Promotes freelance marketplace |
| Design | Good | Badge, features list, CTA |
| Link target | Uncertain | Links to `/projects` |

**Issues Found:**
- Hardcoded "New Feature" badge may become stale
- No personalization based on user's freelance interest
- Should be dismissible or shown conditionally

---

### 7. CandidateQuickActions
**Score: 75/100**

| Aspect | Status | Issue |
|--------|--------|-------|
| Action variety | Good | 6 actions, shows 4 based on conditions |
| Dynamic badges | Working | Shows "X new matches", "X active" |
| Navigation | Working | All paths are valid routes |

**Issues Found:**
- `newMatches` always 0 (hardcoded in `Home.tsx`, not from DB)
- Actions are generic, not personalized
- Missing: Calendar/schedule, Messages, Settings shortcuts

---

### 8. ApplicationStatusTracker
**Score: 90/100**

| Aspect | Status | Issue |
|--------|--------|-------|
| Data fetching | Excellent | Uses unified `useApplications` hook |
| Real-time updates | Working | Supabase realtime subscription |
| Stage visualization | Working | Progress bars, stage icons, color coding |
| Navigation | Working | Click navigates to application detail |

**Issues Found:**
- Only shows 5 applications (limiting)
- "View All Applications" button appears only when >= 5
- Stage info relies on `getApplicationStageInfo` utility

**This is the strongest component on the page!**

---

### 9. JobRecommendations
**Score: 45/100 - CRITICAL ISSUE**

| Aspect | Status | Issue |
|--------|--------|-------|
| Data fetching | BROKEN | Schema cache error: "Could not find relationship between 'match_scores' and 'job_id'" |
| Fallback | Working | Shows "Complete profile" empty state |
| Dismiss feature | Working | Saves to `dismissed_jobs` table |

**Console Error Detected:**
```
⚠️ Could not fetch recommendations - database schema may need migration
{"error":"Could not find a relationship between 'match_scores' and 'job_id' in the schema cache"}
```

**Root Cause:** The `match_scores` table likely doesn't have a proper foreign key relationship to `jobs` table, or the column is named differently.

---

### 10. UpcomingMeetingsWidget
**Score: 85/100**

| Aspect | Status | Issue |
|--------|--------|-------|
| Data fetching | Working | Queries `meeting_participants` + `meetings` |
| Real-time | Working | Subscribes to meeting changes |
| Status badges | Excellent | "Live Now", "Starting Soon" indicators |
| Join button | Working | Shows for in-progress meetings |

**Issues Found:**
- Complex query may be slow with many participants
- "Schedule a Meeting" link goes to `/meetings` (general, not scheduling)

---

### 11. ClubPilotTasksWidget
**Score: 70/100**

| Aspect | Status | Issue |
|--------|--------|-------|
| Data fetching | Working | Queries `pilot_tasks` table |
| Task completion | Working | Updates status in database |
| Priority colors | Good | High/medium/low visual distinction |

**Issues Found:**
- Database shows 0 pending tasks (no data seeded)
- No task creation from this widget
- "AI Suggested" badge but tasks aren't AI-generated

---

### 12. MessagesPreviewWidget
**Score: 82/100**

| Aspect | Status | Issue |
|--------|--------|-------|
| Data fetching | Working | Queries conversations + messages + profiles |
| Real-time | Working | Subscribes to new messages |
| Unread indicator | Working | Animated pulse dot |
| Refresh button | Good | Manual refresh available |

**Issues Found:**
- Complex multi-query fetch (conversations → messages → profiles)
- No message preview truncation issues

---

### 13. TimeTrackingWidget
**Score: 68/100**

| Aspect | Status | Issue |
|--------|--------|-------|
| Data fetching | Working | Queries `time_entries` for this week |
| Active timer | Working | Shows "Timer running" indicator |
| Earnings calculation | Working | Hourly rate × hours |

**Issues Found:**
- Only 2 time entries in database (minimal data)
- Widget assumes freelance/project work context
- May not be relevant for all candidates

---

### 14. ReferralStatsWidget
**Score: 78/100**

| Aspect | Status | Issue |
|--------|--------|-------|
| Data fetching | Working | Uses `useReferralStats` hook |
| Stats display | Good | Active, Projected, Earned |
| Empty state | Good | Clear CTA to start referring |

**Issues Found:**
- "Projected" vs "Realized" distinction unclear visually
- No recent referral activity shown

---

### 15. AchievementsPreviewWidget
**Score: 85/100**

| Aspect | Status | Issue |
|--------|--------|-------|
| Data fetching | Working | Queries `user_quantum_achievements` + `quantum_achievements` |
| Visual display | Excellent | Emoji icons, tooltips, progress bars |
| XP system | Working | Points accumulated and displayed |
| Milestones | Working | 5/10/25/50/100 progression |

**Issues Found:**
- Database shows 79 achievements unlocked (good data!)
- "Next achievement slot" placeholder could show actual next achievable

---

### 16. LivePulse
**Score: 55/100**

| Aspect | Status | Issue |
|--------|--------|-------|
| Data fetching | Working | Queries `activity_feed` where visibility='public' |
| Real-time | Working | Subscribes to inserts |
| Event types | Good | 6 different event types supported |

**Issues Found:**
- **Database shows 0 public activity feed entries!** Widget will always be empty
- No activity generation triggers in place
- Fixed 400px height is too tall for empty state

---

### 17. ProfileViewers
**Score: 60/100**

| Aspect | Status | Issue |
|--------|--------|-------|
| Data fetching | Working | Queries `profile_views` with viewer/company joins |
| Real-time | Working | Subscribes to new views |
| Anonymous handling | Good | Shows "Anonymous Viewer" appropriately |

**Issues Found:**
- **Database shows 0 profile views!** Widget will always show empty state
- No profile view tracking implementation
- Fixed 400px height is too tall for empty state

---

### 18. ActivityTimeline
**Score: 75/100**

| Aspect | Status | Issue |
|--------|--------|-------|
| Data fetching | Working | Queries `activity_timeline` |
| Real-time | Working | Subscribes to new activities |
| Date grouping | Excellent | Today/Yesterday/Date format |
| Event types | Comprehensive | 15+ activity types supported |

**Issues Found:**
- Database shows only 17 entries (sparse data)
- Timeline is at the bottom of the page (low visibility)
- No activity generation for common actions

---

## Overall Home Page Score: 72/100

### Scoring Breakdown

| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| Data Accuracy | 65/100 | 25% | 16.25 |
| UI/UX Polish | 85/100 | 20% | 17.00 |
| Real-time Updates | 80/100 | 15% | 12.00 |
| Feature Completeness | 70/100 | 20% | 14.00 |
| Performance | 75/100 | 10% | 7.50 |
| Error Handling | 60/100 | 10% | 6.00 |
| **TOTAL** | | | **72.75** |

---

## Critical Issues Requiring Immediate Fix

### P0 - Broken

1. **JobRecommendations component is broken** — Schema relationship error prevents any recommendations from showing

### P1 - Data Missing

2. **LivePulse has no data** — `activity_feed` table has 0 public entries
3. **ProfileViewers has no data** — `profile_views` table has 0 entries
4. **ClubPilotTasks has no data** — 0 pending pilot tasks

### P2 - Logic Issues

5. **`newMatches` always shows 0** — Hardcoded in stats calculation
6. **QuickTips links to non-existent `/resources/*` pages**

---

## Features Missing from Home That Exist in App

| Feature | Page Location | Priority to Surface |
|---------|--------------|---------------------|
| Salary Insights | `/salary-insights` | HIGH - mentioned in QuickActions but no preview |
| Interview Prep | `/interview-prep` | HIGH - critical for candidates with interviews |
| Career Path Planner | `/career-path` | MEDIUM - personalization opportunity |
| My Skills | `/my-skills-page` | HIGH - profile completeness |
| Assessments | `/assessments` | MEDIUM - gamification |
| Academy/Learning | `/academy` | MEDIUM - engagement |
| Club DJ/Radio | `/radio` | LOW - entertainment |
| Projects/Gigs | `/projects` | MEDIUM - mentioned in banner |

---

## Features That Should Be Created

### 1. Interview Countdown Widget (P0)
- Shows time until next interview
- Quick access to interview prep materials
- Panel/interviewer info preview
- Join meeting button when live

### 2. Offer Pipeline Widget (P1)
- Active offers requiring response
- Deadline countdowns
- Compare offers side-by-side link

### 3. Skill Gap Analysis Widget (P1)
- Based on jobs being applied to
- Recommended courses/certifications
- Links to Academy

### 4. Strategist Contact Card (P0)
- Assigned TQC strategist info
- Quick message button
- Last contact date
- Scheduled call link

### 5. Document Status Widget (P1)
- CV upload status
- Document expiry warnings
- Quick upload button

### 6. Saved Jobs Preview (P2)
- Jobs saved for later
- Quick apply button
- Remove from saved

### 7. Company Following Updates (P2)
- News from followed companies
- New jobs posted by followed companies

---

## Recommended Architecture Changes

### 1. Consolidate Home Pages
- Remove `Home.tsx` (unused legacy)
- Route `/home` continues to use `ClubHome.tsx` → `CandidateHome.tsx`

### 2. Fix Data Population
- Create triggers to populate `activity_feed` on key events
- Create triggers to log `profile_views`
- Seed `pilot_tasks` for onboarding users

### 3. Prioritize Widget Layout

**Proposed Layout Order:**
```text
1. UnifiedStatsBar (keep)
2. NextBestActionCard (keep - QUIN)
3. InterviewCountdownWidget (NEW - P0)
4. StrategistContactCard (NEW - P0)
5. ApplicationStatusTracker (keep)
6. JobRecommendations (FIX SCHEMA)
7. ProfileCompletion (move up if incomplete)
8. UpcomingMeetingsWidget (keep)
9. MessagesPreviewWidget (keep)
10. ReferralStatsWidget (keep)
11. AchievementsPreviewWidget (keep)
12. QuickTipsCarousel (keep)
13. ActivityTimeline (keep at bottom)

REMOVE or CONDENSE:
- LivePulse (no data, remove until populated)
- ProfileViewers (no data, remove until populated)
- ClubPilotTasks (no data, remove until populated)
- TimeTrackingWidget (niche use case)
- Club Projects Banner (make dismissible)
```

### 4. Performance Optimizations
- Reduce from 15+ individual queries to batched parallel queries
- Add `Suspense` boundaries around widget groups
- Lazy load below-fold widgets

---

## Implementation Priority

| Task | Effort | Impact | Priority |
|------|--------|--------|----------|
| Fix JobRecommendations schema | 1h | HIGH | P0 |
| Add InterviewCountdownWidget | 3h | HIGH | P0 |
| Add StrategistContactCard | 2h | HIGH | P0 |
| Remove empty widgets (LivePulse, ProfileViewers) | 30m | MEDIUM | P1 |
| Create activity_feed triggers | 2h | MEDIUM | P1 |
| Create profile_views tracking | 2h | MEDIUM | P1 |
| Fix newMatches calculation | 30m | MEDIUM | P1 |
| Fix QuickTips resource links | 1h | LOW | P2 |
| Consolidate Home.tsx | 30m | LOW | P2 |
| Add Saved Jobs Widget | 2h | MEDIUM | P2 |
| Add Document Status Widget | 2h | MEDIUM | P2 |

---

## Summary

The Candidate Home is **functional but underperforming** at 72/100. The main issues are:
1. **Broken JobRecommendations** due to schema relationship error
2. **Empty widgets** (LivePulse, ProfileViewers, ClubPilot) with no data
3. **Missing P0 features** like Interview Countdown and Strategist Contact
4. **Stale hardcoded values** (`newMatches` always 0)

The UI polish and animation quality are excellent (85/100), but data accuracy (65/100) and feature completeness (70/100) drag down the overall score.

**Recommendation:** Focus on P0 fixes first (JobRecommendations, new widgets), then populate missing data triggers, then add P1 enhancements.
