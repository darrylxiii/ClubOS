
# Partner Home — Full 100/100 Implementation Plan

## Executive Summary

This plan transforms the Partner Home from a **72/100** functionality score to a **100/100** enterprise-grade dashboard worthy of a luxury 0.1% recruitment agency. We'll fix all backend data gaps, add missing features that elite clients expect, and ensure everything syncs seamlessly with the rest of the platform.

---

## Current State Analysis

### Database Health Check
| Table | Current Count | Required Action |
|-------|---------------|-----------------|
| `partner_smart_alerts` | 0 rows | Need trigger-based population |
| `partner_ai_insights` | 0 rows | Edge function exists but not triggered |
| `partner_benchmarks` | 0 rows | RPC exists, needs scheduled execution |
| `talent_matches` | 0 rows | RPC exists, needs job-triggered execution |
| `partner_sla_tracking` | 0 rows | Need SLA creation triggers |
| `partner_health_scores` | 2 rows | Working, but sub-scores null |
| `company_strategist_assignments` | 0 rows | Need company-to-strategist mapping |
| `candidate_shortlists` | 0 rows | Table exists, needs UI integration |
| `placement_fees` | 3 rows | Working |
| `talent_strategists` | 4 active | Data exists |

### Database Functions Status
All required RPCs exist:
- `generate_partner_smart_alerts()` — Created
- `calculate_partner_benchmarks()` — Created
- `calculate_company_health_score()` — Created
- `generate_talent_matches()` — Created
- `generate_daily_analytics_snapshot()` — Created
- `generate_smart_alerts()` — Created

### Edge Function Status
- `generate-partner-insights` — Exists, uses Lovable AI, needs auto-trigger

---

## What a 0.1% Luxury Client Expects (Currently Missing)

### High Priority — Must Have for 100/100

| Feature | Why Elite Clients Expect It | Current Status |
|---------|---------------------------|----------------|
| **Dedicated Concierge with Availability** | "Who is my point of contact and are they available NOW?" | Partially working — needs assignment mapping |
| **AI Daily Briefing** | "Give me the 60-second summary each morning" | Backend exists, not auto-triggered |
| **Smart Alerts** | "Proactively tell me what needs attention" | Trigger exists, no data generated |
| **Revenue Visibility** | "What ROI am I getting from this agency?" | Working but goal is hardcoded |
| **SLA Tracking** | "Are you meeting your promises?" | Empty — need SLA creation on key events |
| **Industry Benchmarks** | "How do I compare to market?" | RPC exists, not executed |
| **Talent Matches** | "Show me candidates I should consider" | Empty — not running on job publish |
| **Candidate Shortlist** | "Quick access to my starred candidates" | Table exists, needs population |
| **Unread Messages Count** | "Do I have waiting communications?" | Not shown on homepage |
| **Upcoming Deadlines** | "What's time-sensitive this week?" | Partially in SLA, needs enhancement |

### Medium Priority — Differentiators

| Feature | Business Value |
|---------|---------------|
| **Dossier Activity** | Show when candidates' dossiers are viewed/shared |
| **Meeting Prep Reminders** | "You have an interview in 2 hours — here's the prep" |
| **Invoice/Payment Status** | Billing visibility for enterprise clients |
| **Comparative Hiring Speed** | "You're hiring 23% faster than industry average" |
| **Calendar Integration Status** | "Your calendar is synced and working" |

### Low Priority — Future Enhancements

| Feature | Description |
|---------|-------------|
| **Market Salary Intelligence** | Live comp data for open roles |
| **Competitor Activity** | Who else is hiring similar roles |
| **Predictive Time-to-Fill** | AI estimate based on role parameters |

---

## Implementation Plan

### Phase 1: Backend Data Population (Critical)

#### 1.1 Fix Company-Strategist Assignment
Create automatic assignment when companies are created or assign the first active strategist.

```text
┌─────────────────────────────────────────────────────────┐
│ Database Migration                                       │
├─────────────────────────────────────────────────────────┤
│ 1. Create function: auto_assign_strategist_to_company   │
│ 2. Create trigger on companies INSERT                   │
│ 3. Backfill: Assign strategist to existing companies   │
└─────────────────────────────────────────────────────────┘
```

#### 1.2 Fix Smart Alerts Generation
Create triggers that fire when:
- New application received
- Application stuck > 7 days
- Interview scheduled < 24 hours
- Offer pending > 5 days

```text
┌─────────────────────────────────────────────────────────┐
│ Database Trigger: on_application_change                 │
├─────────────────────────────────────────────────────────┤
│ AFTER INSERT OR UPDATE ON applications                  │
│ → Call generate_partner_smart_alerts(company_id)        │
└─────────────────────────────────────────────────────────┘
```

#### 1.3 Fix AI Daily Briefing Auto-Generation
Create a scheduled job or on-demand trigger when Partner Home loads (if no briefing exists for today).

```text
┌─────────────────────────────────────────────────────────┐
│ Logic: On PartnerHome mount                             │
├─────────────────────────────────────────────────────────┤
│ 1. Check if partner_ai_insights has today's briefing    │
│ 2. If not, call generate-partner-insights edge function │
│ 3. Display loading state while generating               │
└─────────────────────────────────────────────────────────┘
```

#### 1.4 Fix Benchmark Calculation
Trigger benchmark calculation when:
- Application hired
- Weekly scheduled job

```text
┌─────────────────────────────────────────────────────────┐
│ Database Trigger: on_hire_complete                      │
├─────────────────────────────────────────────────────────┤
│ AFTER UPDATE ON applications WHERE status = 'hired'     │
│ → Call calculate_partner_benchmarks(company_id)         │
└─────────────────────────────────────────────────────────┘
```

#### 1.5 Fix Talent Matching
Trigger talent matching when:
- Job published
- Daily refresh for active jobs

```text
┌─────────────────────────────────────────────────────────┐
│ Database Trigger: on_job_published                      │
├─────────────────────────────────────────────────────────┤
│ AFTER UPDATE ON jobs WHERE status = 'published'         │
│ → Call generate_talent_matches(job_id, 10)              │
└─────────────────────────────────────────────────────────┘
```

#### 1.6 Fix SLA Tracking
Create SLAs automatically when:
- New application → 48-hour response SLA
- Interview scheduled → Feedback within 24 hours SLA
- Offer extended → Decision within 5 days SLA

```text
┌─────────────────────────────────────────────────────────┐
│ Database Trigger: create_sla_on_application             │
├─────────────────────────────────────────────────────────┤
│ AFTER INSERT ON applications                            │
│ → Insert into partner_sla_tracking with deadline        │
└─────────────────────────────────────────────────────────┘
```

#### 1.7 Fix Health Score Sub-metrics
Update `calculate_company_health_score` to return all sub-metrics and store them properly.

---

### Phase 2: Frontend Improvements

#### 2.1 Add Missing Widgets

| New Widget | Data Source | Purpose |
|------------|-------------|---------|
| `UnreadMessagesWidget` | `messages` table | Show unread count + preview |
| `DossierActivityWidget` | `dossier_views` table | Recent profile views |
| `CalendarSyncStatusWidget` | `calendar_integrations` | Integration health |
| `UpcomingDeadlinesWidget` | Aggregated from SLAs + interviews | Critical dates this week |

#### 2.2 Improve Existing Widgets

| Widget | Improvement |
|--------|-------------|
| `PlacementRevenueWidget` | Fetch goal from company settings, not hardcoded |
| `PartnerConciergeCard` | Use company_strategist_assignments for proper mapping |
| `DailyBriefing` | Auto-generate on first load if no today's briefing |
| `SLATracker` | Use partner_sla_tracking with proper events |

#### 2.3 Layout Optimization

```text
Current Layout:
┌─────────────────────────────────────────────────────────┐
│ Stats Bar                                               │
├─────────────────────────────────────────────────────────┤
│ Concierge Card                                          │
├─────────────────────────────────────────────────────────┤
│ Revenue | Offers                                        │
├─────────────────────────────────────────────────────────┤
│ Smart Alerts + Briefing | Health + Benchmarks + SLA     │
├─────────────────────────────────────────────────────────┤
│ Quick Actions | Pipeline                                │
├─────────────────────────────────────────────────────────┤
│ Interviews Today | Upcoming Meetings                    │
├─────────────────────────────────────────────────────────┤
│ Position Countdown | Shortlist | Interview Success      │
├─────────────────────────────────────────────────────────┤
│ Time Tracking                                           │
├─────────────────────────────────────────────────────────┤
│ Recent Applications | Talent Recommendations            │
├─────────────────────────────────────────────────────────┤
│ Activity Feed                                           │
└─────────────────────────────────────────────────────────┘

Proposed Optimized Layout:
┌─────────────────────────────────────────────────────────┐
│ Stats Bar (Active Jobs | Applications | Interviews | ⚡ │
│ Unread Messages count added)                            │
├─────────────────────────────────────────────────────────┤
│ Concierge Card (Full width hero)                        │
├─────────────────────────────────────────────────────────┤
│ Revenue | Offers | Messages Preview (3-col)             │
├─────────────────────────────────────────────────────────┤
│ Daily Briefing (Full width AI summary)                  │
├─────────────────────────────────────────────────────────┤
│ Smart Alerts | Health Score | SLA Tracker (3-col)       │
├─────────────────────────────────────────────────────────┤
│ Today's Interviews | Upcoming Deadlines (2-col)         │
├─────────────────────────────────────────────────────────┤
│ Pipeline Overview | Talent Matches (2-col)              │
├─────────────────────────────────────────────────────────┤
│ Shortlist | Position Countdown | Benchmarks (3-col)     │
├─────────────────────────────────────────────────────────┤
│ Recent Applications | Activity Feed (2-col)             │
└─────────────────────────────────────────────────────────┘
```

---

### Phase 3: Data Integrity Fixes

#### 3.1 Backfill Existing Data
Run one-time scripts to:
1. Assign strategists to all existing companies
2. Generate benchmarks for companies with historical data
3. Create talent matches for all published jobs
4. Generate initial AI briefings for active companies

#### 3.2 Add Realtime Subscriptions
Enable realtime for:
- `partner_smart_alerts` — Live alert updates
- `applications` — Pipeline changes
- `meetings` — Meeting status updates

---

### Phase 4: New Premium Widgets

#### 4.1 UnreadMessagesWidget
```text
┌─────────────────────────────────────────┐
│ 💬 Messages                    [3 New] │
├─────────────────────────────────────────┤
│ Sarah Chen (2h ago)                     │
│ "Thanks for the update on..."           │
│                                         │
│ Jasper @ TQC (4h ago)                   │
│ "New candidate for your review..."      │
│                                         │
│ [View All Messages →]                   │
└─────────────────────────────────────────┘
```

#### 4.2 UpcomingDeadlinesWidget
```text
┌─────────────────────────────────────────┐
│ ⏰ This Week's Deadlines               │
├─────────────────────────────────────────┤
│ TODAY                                   │
│ • Interview: Sarah Chen @ 2pm           │
│ • Response due: Mark Liu application    │
│                                         │
│ TOMORROW                                │
│ • Offer expires: John Doe               │
│                                         │
│ THIS WEEK                               │
│ • 3 interviews scheduled                │
│ • 2 SLA deadlines approaching           │
└─────────────────────────────────────────┘
```

#### 4.3 DossierActivityWidget
```text
┌─────────────────────────────────────────┐
│ 👁️ Profile Views                       │
├─────────────────────────────────────────┤
│ Your team viewed 12 candidate profiles  │
│ this week                               │
│                                         │
│ Most viewed:                            │
│ • Sarah Chen (5 views)                  │
│ • Mark Liu (3 views)                    │
└─────────────────────────────────────────┘
```

---

## Technical Implementation Details

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/partner/UnreadMessagesWidget.tsx` | Messages preview |
| `src/components/partner/UpcomingDeadlinesWidget.tsx` | Deadline aggregation |
| `src/components/partner/DossierActivityWidget.tsx` | Profile view tracking |
| `src/hooks/usePartnerDataPopulation.ts` | Auto-populate missing data |

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/clubhome/PartnerHome.tsx` | Add new widgets, optimize layout |
| `src/components/partner/PartnerConciergeCard.tsx` | Use proper assignment mapping |
| `src/components/partner/DailyBriefing.tsx` | Auto-generate on load |
| `src/components/partner/PlacementRevenueWidget.tsx` | Fetch goal from company settings |
| `src/components/partner/SLATracker.tsx` | Use partner_sla_tracking |
| `src/components/clubhome/UnifiedStatsBar.tsx` | Add unread messages count |

### Database Migrations Required

1. **Strategist Assignment Trigger** — Auto-assign on company creation
2. **Smart Alert Trigger** — Generate on application changes
3. **SLA Tracking Trigger** — Create SLAs on key events
4. **Talent Match Trigger** — Generate on job publish
5. **Benchmark Trigger** — Calculate on hire completion
6. **Backfill Script** — Populate data for existing records

---

## Expected Scores After Implementation

| Dimension | Before | After | Notes |
|-----------|--------|-------|-------|
| Feature Completeness | 72/100 | **98/100** | All widgets functional with real data |
| UI/UX & Styling | 88/100 | **92/100** | Optimized layout, consistent styling |
| Data Integrity | 55/100 | **95/100** | Automated triggers ensure data exists |
| Partner Experience | 72/100 | **98/100** | Feels like $50K+/year enterprise tool |
| **Overall** | **72/100** | **96/100** | Elite luxury experience |

---

## Implementation Priority

| Priority | Task | Estimated Impact |
|----------|------|------------------|
| 1 | Database triggers for smart alerts, SLAs, benchmarks | +15 points |
| 2 | Fix Concierge strategist assignment | +5 points |
| 3 | Auto-generate Daily Briefing on load | +5 points |
| 4 | Add UnreadMessagesWidget | +3 points |
| 5 | Add UpcomingDeadlinesWidget | +3 points |
| 6 | Backfill existing data | +10 points |
| 7 | Optimize layout with new widgets | +3 points |
| 8 | Add realtime subscriptions | +2 points |

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| AI briefing generation slow | Show skeleton + "Generating insights..." message |
| Trigger loops | Use `pg_trigger_depth()` checks |
| Empty states remain | Graceful fallbacks with aspirational copy |
| Performance with realtime | Debounce updates, limit to 5 alerts |

