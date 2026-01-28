
# Candidate Home Dashboard Comprehensive Audit Report

## Current Score: 82/100

After implementing P0, P1, and P2 fixes, the dashboard has improved significantly from the initial 72/100, but there are still gaps preventing a perfect score.

---

## Score Breakdown by Category

| Category | Score | Max | Issues |
|----------|-------|-----|--------|
| Data Accuracy | 78 | 100 | Activity triggers missing (5 of 6), profile_views still empty |
| UI/UX Polish | 92 | 100 | Excellent animations, glass-morphism, responsive |
| Real-time Updates | 75 | 100 | Some widgets lack Supabase subscriptions |
| Feature Completeness | 85 | 100 | New widgets added, but some empty states |
| Performance | 80 | 100 | 15+ queries on page load, no batching |
| Error Handling | 78 | 100 | Better logging, but some console.errors remain |
| Accessibility | 75 | 100 | Missing ARIA labels, keyboard navigation gaps |
| Testing Coverage | 70 | 100 | No unit/E2E tests for new widgets |

---

## Component Audit (Post-Implementation)

### Excellent (90-100)
| Component | Score | Notes |
|-----------|-------|-------|
| ApplicationStatusTracker | 95 | Real-time, well-designed, navigable |
| InterviewCountdownWidget (NEW) | 92 | Live countdown, meeting link integration |
| StrategistContactCard (NEW) | 90 | Working data (12 candidates have strategists) |
| QuickTipsCarousel | 90 | All 30 links now point to valid routes |
| UnifiedStatsBar | 88 | Animated counters, real data |

### Good (75-89)
| Component | Score | Notes |
|-----------|-------|-------|
| NextBestActionCard | 85 | Logic works, but application query uses wrong column |
| JobRecommendations | 82 | Fixed schema error, 370 matches available |
| ProfileCompletion | 82 | Working, but slow multi-query |
| SavedJobsWidget (NEW) | 80 | Working, 1 saved job in DB |
| DocumentStatusWidget (NEW) | 78 | Working, 9 documents in DB |
| MessagesPreviewWidget | 78 | Working, complex query chain |
| UpcomingMeetingsWidget | 78 | Working, but no interview bookings exist |

### Needs Work (60-74)
| Component | Score | Notes |
|-----------|-------|-------|
| ReferralStatsWidget | 72 | Works but "Projected" vs "Realized" unclear |
| AchievementsPreviewWidget | 72 | Good data (79 achievements), needs XP animation |
| ActivityTimeline | 68 | Only 17 entries, triggers missing |
| NotificationsPreviewWidget | 68 | Works, but not user-specific filtering visible |

### Critical Issues (Below 60)
| Component | Score | Notes |
|-----------|-------|-------|
| Activity Feed Population | 40 | Only 1 of 6 triggers created (referral only) |
| Profile Views | 35 | 0 entries - tracking hook exists but no data generated |

---

## Critical Gaps Blocking 100/100

### 1. Missing Activity Feed Triggers (P0 - Incomplete)
The migration only created 1 of 6 planned triggers:

| Trigger | Status | Impact |
|---------|--------|--------|
| `log_referral_to_activity_feed` | Created | Referrals logged |
| `log_application_to_activity_feed` | MISSING | No application events |
| `log_application_status_change` | MISSING | No status change events |
| `log_achievement_to_activity_feed` | MISSING | No achievement events |
| `log_meeting_to_activity_feed` | MISSING | No meeting events |
| `log_profile_update_to_activity_feed` | MISSING | No profile events |

**Current State**: `activity_feed` has 0 public entries, making the LivePulse widget useless (correctly removed, but data triggers still needed for ActivityTimeline).

### 2. Profile Views Not Tracking
- Hook `useProfileViewTracking` exists and is integrated into `PublicUserProfile.tsx`
- But `profile_views` table has 0 entries
- Possible cause: RLS blocking inserts, or profile pages not being visited

### 3. Interview Countdown Widget Shows "No Interviews"
- `bookings.is_interview_booking` has 0 true entries
- Widget works correctly but has no data to display

### 4. NextBestActionCard Query Bug
Line 94 uses `user_id` but applications table uses `candidate_id`:
```typescript
// WRONG
.eq('user_id', user.id);

// CORRECT  
.eq('candidate_id', user.id);
```

### 5. Missing Click-Through on Stats
- Stats in `UnifiedStatsBar` are not clickable
- Users can't navigate to detailed views from summary metrics

### 6. No Real-time Subscriptions on Key Widgets
- `SavedJobsWidget` - no realtime
- `DocumentStatusWidget` - no realtime
- `JobRecommendations` - no realtime

### 7. Club Projects Banner Not Dismissible
- Hardcoded "New Feature" badge never expires
- No dismiss/close functionality
- Takes up significant screen space

### 8. Accessibility Gaps
- Missing `aria-label` on icon-only buttons
- No keyboard shortcuts for quick actions
- Screen reader announcements missing for live updates

---

## Plan to Reach 100/100

### Phase 1: Fix Critical Data Issues (Score: 82 → 90)

**Task 1.1: Create Missing Activity Feed Triggers**
Create a new migration with all 5 missing triggers:

```sql
-- Application submitted trigger
CREATE OR REPLACE FUNCTION public.log_application_to_activity_feed()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activity_feed (user_id, event_type, event_data, visibility, created_at)
  VALUES (
    NEW.candidate_id,
    'application_submitted',
    jsonb_build_object('application_id', NEW.id, 'job_id', NEW.job_id),
    'private',
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER application_activity_feed_trigger
  AFTER INSERT ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.log_application_to_activity_feed();

-- Similar triggers for:
-- - Application status change (UPDATE on applications where status changes)
-- - Achievement unlocked (INSERT on user_quantum_achievements)
-- - Meeting scheduled (INSERT on meeting_participants)
-- - Profile updated (UPDATE on profiles with significant changes)
```

**Task 1.2: Fix NextBestActionCard Query**
Change line 94 from `user_id` to `candidate_id`.

**Task 1.3: Debug Profile View Tracking**
Add RLS policy allowing authenticated users to insert their own views:
```sql
CREATE POLICY "Allow profile view inserts" ON profile_views
  FOR INSERT TO authenticated
  WITH CHECK (true);
```

---

### Phase 2: Enhance Interactivity (Score: 90 → 95)

**Task 2.1: Make Stats Clickable**
Update `UnifiedStatsBar` to wrap each stat in a `Link`:
- Applications → `/applications`
- Matches → `/jobs?filter=matches`
- Interviews → `/meetings`
- Messages → `/messages`

**Task 2.2: Add Real-time to New Widgets**
Add Supabase realtime subscriptions to:
- `SavedJobsWidget` - subscribe to `saved_jobs` table
- `DocumentStatusWidget` - subscribe to `candidate_documents`
- `JobRecommendations` - subscribe to `match_scores`

**Task 2.3: Make Club Projects Banner Dismissible**
- Add close button
- Store dismissal in localStorage
- Add `banner_dismissed_at` column to profiles for persistence

**Task 2.4: Add Trend Indicators to Stats**
Calculate week-over-week change and show up/down arrows with percentages.

---

### Phase 3: Polish & Accessibility (Score: 95 → 98)

**Task 3.1: Add ARIA Labels**
- All icon-only buttons need `aria-label`
- Live regions for countdown timers
- Announce new messages/notifications

**Task 3.2: Add Keyboard Navigation**
- `Tab` through all interactive elements
- `Enter`/`Space` to activate
- `Escape` to close modals/dismissibles

**Task 3.3: Performance Optimization**
Batch queries using `Promise.all` where possible:
- Combine profile + candidate_profile queries
- Combine stats queries in a single hook

**Task 3.4: Add Loading Skeletons**
Ensure all widgets have proper skeleton states (most already do, verify completeness).

---

### Phase 4: Testing & Documentation (Score: 98 → 100)

**Task 4.1: Unit Tests for New Widgets**
Create Vitest tests for:
- `InterviewCountdownWidget.test.tsx`
- `StrategistContactCard.test.tsx`
- `SavedJobsWidget.test.tsx`
- `DocumentStatusWidget.test.tsx`

**Task 4.2: E2E Tests**
Create Playwright tests:
- Home page loads all widgets
- Stats display correct counts
- Interview countdown updates in real-time
- Quick actions navigate correctly

**Task 4.3: Update Documentation**
- Document new widgets in component library
- Update `TECHNICAL_DEBT.md` to mark items complete
- Add home page architecture diagram

---

## Implementation Priority

| Phase | Tasks | Effort | Score Impact |
|-------|-------|--------|--------------|
| Phase 1 | Fix data triggers, query bug | 3h | +8 points |
| Phase 2 | Interactivity & realtime | 4h | +5 points |
| Phase 3 | Accessibility & polish | 3h | +3 points |
| Phase 4 | Testing & docs | 4h | +2 points |
| **Total** | | **14h** | **82 → 100** |

---

## Summary

The Candidate Home has improved from **72/100 to 82/100** with the P0-P2 implementations. The main blockers to 100/100 are:

1. **Incomplete database triggers** (5 of 6 missing)
2. **Query bug** in NextBestActionCard
3. **No interactivity** on stats cards
4. **Missing realtime** on new widgets
5. **Accessibility gaps**

With the 4-phase plan above, the dashboard can reach **100/100** in approximately **14 hours** of focused development.
