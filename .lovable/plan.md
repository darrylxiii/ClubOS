

# Partner Home Audit: From 24 Widgets to 6 Zones

## The Problem

The current PartnerHome renders **24 separate components** across 11 scroll sections. For comparison, AdminHome has **9 components** across 7 zones. The partner home is more than 2.5x denser — and most of the extra density comes from widgets that query phantom tables (`as any` casts), show duplicate data, or belong in dedicated tabs rather than a homepage.

---

## Current Component Inventory (24 widgets)

```text
#   COMPONENT                    DATA SOURCE              VERDICT
──────────────────────────────────────────────────────────────────────
1   UnifiedStatsBar              Real (jobs, apps)        KEEP
2   ClubAIHomeChatWidget         AI chat                  REMOVE (global FAB exists)
3   PartnerConciergeCard         Real (strategist)        KEEP (compact)
4   PendingReviewsWidget         Real (applications)      KEEP
5   OfferPipelineWidget          Real (applications)      MERGE → into pipeline
6   UnreadMessagesWidget         Phantom (messages)       REMOVE (link in nav)
7   DailyBriefing                Phantom (partner_ai_*)   REMOVE
8   SmartAlertsPanel             Phantom (partner_smart_*) REMOVE
9   HealthScoreDashboard         Phantom (partner_health*) REMOVE
10  SLATracker                   Phantom (partner_sla_*)  REMOVE (in Partner Hub)
11  InterviewTodayWidget         Real (meetings)          KEEP → merge with deadlines
12  UpcomingDeadlinesWidget       Real (meetings+SLA)      MERGE → with interviews
13  HiringPipelineOverview       Real (applications)      KEEP
14  TalentRecommendations        Phantom (talent_matches)  REMOVE
15  PositionFillCountdown        Real (jobs)              REMOVE (duplicate of pipeline)
16  CandidateShortlistWidget     Phantom (shortlists)     REMOVE
17  BenchmarkComparison          Phantom (partner_bench*)  REMOVE
18  Quick Actions (inline)       Static links             MERGE → into header
19  TeamOverviewWidget           Real (company_members)   REMOVE (322 lines, belongs in settings)
20  TimeTrackingWidget           Real (time_entries)      REMOVE (not partner-relevant)
21  DossierActivityWidget        Phantom (dossier_views)  REMOVE
22  InterviewSuccessWidget       Real (applications)      REMOVE (duplicate of pipeline)
23  RecentApplicationsList       Real (applications)      KEEP → merge with activity
24  PartnerActivityFeed          Real (applications)      MERGE → with recent apps
```

**Summary:** 12 widgets query phantom/empty tables. 4 are duplicates. 2 exist elsewhere. 2 are irrelevant to partners.

---

## Proposed New Layout: 6 Focused Zones

```text
┌─────────────────────────────────────────────────┐
│ ZONE 0: Stats Bar (existing UnifiedStatsBar)    │
│ Active Roles · Pipeline · Pending Reviews · TTH │
├─────────────────────────────────────────────────┤
│ ZONE 1: Action Required Strip                   │
│ Pending Reviews (count) + Today's Interviews    │
│ + Quick Actions (New Role, Review, Schedule)    │
├─────────────────────────────────────────────────┤
│ ZONE 2: Your Strategist (compact concierge)     │
│ Avatar · Name · Last contact · Message button   │
├──────────────────────┬──────────────────────────┤
│ ZONE 3: Pipeline     │ ZONE 3: Open Roles       │
│ Overview (stages,    │ Summary (each role with   │
│ funnel, conversion)  │ candidate count + stage)  │
├──────────────────────┴──────────────────────────┤
│ ZONE 4: Recent Activity (unified feed)          │
│ New applications, stage changes, interviews     │
├─────────────────────────────────────────────────┤
│ ZONE 5: Upcoming (interviews + deadlines)       │
│ Next 7 days, compact timeline                   │
└─────────────────────────────────────────────────┘
```

**Result:** 24 widgets → ~8 components. Zero phantom data. Every widget shows real, actionable information.

---

## Detailed Changes

### REMOVE (14 components)
| Component | Reason |
|-----------|--------|
| `ClubAIHomeChatWidget` | Global ClubAI FAB already exists in AppLayout |
| `UnreadMessagesWidget` | Messages accessible from nav; phantom table |
| `DailyBriefing` | Queries `partner_ai_insights` (phantom) |
| `SmartAlertsPanel` | Queries `partner_smart_alerts` (phantom) |
| `HealthScoreDashboard` | Queries `partner_health_scores` (phantom) |
| `SLATracker` | Duplicate of Partner Hub SLA tab |
| `TalentRecommendations` | Queries `talent_matches` (phantom) |
| `PositionFillCountdown` | Duplicate info — jobs+days open already in pipeline |
| `CandidateShortlistWidget` | Queries phantom shortlist table |
| `BenchmarkComparison` | Queries `partner_benchmarks` (phantom) |
| `TeamOverviewWidget` | 322-line component with invite dialog — belongs in Company Settings |
| `TimeTrackingWidget` | Freelancer/candidate concept, not partner-relevant |
| `DossierActivityWidget` | Queries `dossier_views` (phantom) |
| `InterviewSuccessWidget` | Duplicate of HiringPipelineOverview data |

### KEEP (4 components, minor adjustments)
| Component | Adjustment |
|-----------|-----------|
| `UnifiedStatsBar` | Keep as-is |
| `PendingReviewsWidget` | Keep as-is (real data, actionable) |
| `HiringPipelineOverview` | Keep as-is (real pipeline data) |
| `PartnerConciergeCard` | Slim down — remove the 320-line card, create a compact 1-row strategist strip |

### MERGE (3 merges)
| New Component | Sources | What it shows |
|---------------|---------|---------------|
| `PartnerActionStrip` | Quick Actions + PendingReviews badge + InterviewToday count | Single-row action bar: "3 reviews pending · 1 interview today · [New Role] [Review Candidates]" |
| `PartnerActivityFeedUnified` | RecentApplicationsList + PartnerActivityFeed | Single chronological feed: new apps, stage moves, meetings — no duplicates |
| `UpcomingScheduleWidget` | InterviewTodayWidget + UpcomingDeadlinesWidget | Combined "Today & This Week" timeline for interviews and deadlines |

### CREATE (1 new component)
| Component | Purpose |
|-----------|---------|
| `OpenRolesSummary` | Compact card per open role: title, candidate count, furthest stage, days open. Links to job dashboard. Replaces PositionFillCountdown + OfferPipelineWidget with real data. |

---

## Implementation Steps

1. **Rebuild `PartnerHome.tsx`** — new 6-zone layout with only the kept/merged components
2. **Create `PartnerActionStrip`** — compact action bar combining quick actions with pending counts
3. **Create `PartnerStrategistStrip`** — slim 1-row version of PartnerConciergeCard (avatar, name, message button)
4. **Create `OpenRolesSummary`** — compact role cards from real `jobs` + `applications` data
5. **Create `PartnerActivityFeedUnified`** — merge RecentApplicationsList + PartnerActivityFeed into one feed
6. **Create `UpcomingScheduleWidget`** — merge InterviewTodayWidget + UpcomingDeadlinesWidget
7. **Keep existing widget files** — they may be used in other views (Partner Hub tabs). Only remove imports from PartnerHome.

