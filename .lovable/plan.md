

# Jobs Consolidation: Enterprise Architecture Redesign

## The Problem

The platform currently has **14+ separate pages** scattered across routes for job-related functionality. Users must navigate between fragmented views to accomplish basic workflows. The sidebar is cluttered with redundant entries. This creates cognitive overhead and makes the platform feel disjointed rather than enterprise-grade.

## Full Audit: Every Job-Related Page

| # | Current Page | Route | Lines | Role | Purpose |
|---|---|---|---|---|---|
| 1 | `Jobs.tsx` | `/jobs` | 717 | Candidate/Admin/Partner (switches view by role) | Browse jobs (candidate) / PartnerJobsHome (admin/partner) |
| 2 | `JobDetail.tsx` | `/jobs/:jobId` | 600 | All | Individual job detail + apply |
| 3 | `JobDashboard.tsx` | `/jobs/:jobId/dashboard` | 1145 | Admin/Partner/Strategist | Per-job pipeline management |
| 4 | `JobsMap.tsx` | `/jobs/map` | 30 | All | Map view of jobs |
| 5 | `Applications.tsx` | `/applications` | 425 | Candidate | My applications pipeline |
| 6 | `ApplicationDetail.tsx` | `/applications/:id` | -- | Candidate | Single application detail |
| 7 | `CompanyJobsDashboard.tsx` | `/company-jobs` | 630 | Partner | Partner's company job management |
| 8 | `CompanyApplications.tsx` | `/company-applications` | 464 | Partner | Partner's application view |
| 9 | `ClosedJobs.tsx` | `/admin/closed-jobs` | 522 | Admin | Closed jobs archive |
| 10 | `JobAnalyticsIndex.tsx` | `/admin/job-analytics` | 207 | Admin | Per-job analytics index |
| 11 | `JobAnalyticsDashboard.tsx` | `/admin/job-analytics/:jobId` | 203 | Admin | Per-job analytics detail |
| 12 | `HiringIntelligenceHub.tsx` | `/hiring-intelligence` | 547 | Admin/Partner | AI hiring predictions |
| 13 | `InterviewComparison.tsx` | `/interview-comparison` | 247 | Admin/Partner | Compare candidates per role |
| 14 | `InteractionEntry.tsx` | `/interactions/new` | -- | Admin | Log a new interaction |
| 15 | `InteractionsFeed.tsx` | `/interactions` | -- | Admin | All interactions feed |

**Total: 14+ pages, scattered across 4 route files, with 6+ sidebar entries per role.**

---

## The Solution: 2 Unified Hubs + 1 Detail Page

### Architecture

```text
CANDIDATE EXPERIENCE (2 pages)
  /jobs                 --> Jobs Hub (browse + saved + applications + map)
  /jobs/:jobId          --> Job Detail (unchanged -- this is the right pattern)

ADMIN/PARTNER EXPERIENCE (1 hub + 1 detail)
  /jobs                 --> Jobs Command Center (all jobs + closed + analytics + intelligence)
  /jobs/:jobId/dashboard --> Per-Job Dashboard (unchanged -- already excellent)
```

### Page 1: Candidate Jobs Hub (`/jobs` for candidates)

Consolidates: Jobs browse + Applications + Jobs Map into one page with tabs.

| Tab | Source Page | What Moves In |
|---|---|---|
| **Opportunities** | `Jobs.tsx` (current candidate view) | Job cards, search, filters, Club Sync, sort |
| **My Applications** | `Applications.tsx` | Pipeline stages, application cards, progress tracking |
| **Saved** | `Jobs.tsx` (saved tab) | Already exists as a tab -- stays |
| **Map** | `JobsMap.tsx` | GlobalJobsMap component embedded as tab content |

Navigation impact: Removes `/applications` and `/jobs/map` as standalone routes (redirects preserved).

### Page 2: Admin/Partner Jobs Command Center (`/jobs` for admin/partner/strategist)

Consolidates: PartnerJobsHome + CompanyJobsDashboard + CompanyApplications + ClosedJobs + JobAnalyticsIndex + HiringIntelligenceHub + InterviewComparison + Interactions into one unified hub with tabs.

| Tab | Source Page | What Moves In |
|---|---|---|
| **All Jobs** | `PartnerJobsHome` (current admin view in Jobs.tsx) | Job cards, filters, bulk ops, favorites |
| **Applications** | `CompanyApplications.tsx` | Application table, filters, analytics |
| **Closed** | `ClosedJobs.tsx` | Closed jobs archive table, stats, detail sheet |
| **Analytics** | `JobAnalyticsIndex.tsx` + `JobAnalyticsDashboard.tsx` | Per-job analytics selector and charts |
| **Intelligence** | `HiringIntelligenceHub.tsx` | AI predictions, aggregated insights, dossiers |
| **Interactions** | `InteractionsFeed.tsx` + `InteractionEntry.tsx` | Interaction log + new interaction button |

Navigation impact: Removes 6 standalone routes. The `CompanyJobsDashboard.tsx` content merges into the "All Jobs" tab with a company scope filter.

### Page 3: Per-Job Dashboard (`/jobs/:jobId/dashboard`)

**No change.** This 1145-line dashboard is already the correct pattern -- a deep-dive into a single job's pipeline. It stays as-is.

### Page 4: Job Detail (`/jobs/:jobId`)

**No change.** The candidate-facing job detail page is already well-structured. It stays as-is.

---

## Sidebar Navigation: Before vs After

### Candidate Sidebar

```text
BEFORE (3 entries):              AFTER (1 entry):
  Career:                          Career:
    Jobs          /jobs               Jobs      /jobs
    Jobs Map      /jobs/map           (map is a tab)
    Applications  /applications       (applications is a tab)
```

### Partner Sidebar

```text
BEFORE (8 entries):              AFTER (2 entries):
  Hiring:                          Hiring:
    Jobs                /jobs         Jobs         /jobs
    Company Jobs        /company-jobs (tab inside Jobs)
    Intelligence Hub    /hiring-..    (tab inside Jobs)
    Company Intel       /company-..   (separate -- not job-specific)
    Applicants          /applications (tab inside Jobs)
    Company Applications /company-..  (tab inside Jobs)
    Interactions        /interactions (tab inside Jobs)
    Log Interaction     /int../new    (button inside Interactions tab)
```

### Admin Sidebar

```text
BEFORE (7+ entries across groups):    AFTER (2 entries):
  Talent Management:                    Talent Management:
    All Jobs         /jobs                Jobs           /jobs
    Jobs Map         /jobs/map            (map = candidate tab)
    All Applications /applications        (tab inside Jobs)
    Closed Jobs      /admin/closed-jobs   (tab inside Jobs)
    Club Sync Reqs   /admin/club-sync..   (stays separate -- approval workflow)

  Intelligence Center:
    Hiring Intelligence /hiring-int..     (tab inside Jobs)
    Per-Job Analytics   /admin/job-an..   (tab inside Jobs)
```

---

## Implementation Plan (Phased)

### Phase 1: Candidate Jobs Hub
1. Add tabs to `Jobs.tsx` candidate view: Opportunities (current), Applications, Saved (current), Map
2. Move `Applications.tsx` pipeline content into an `ApplicationsTab` component
3. Embed `GlobalJobsMap` as the Map tab content
4. Add `<Navigate>` redirects from `/applications` and `/jobs/map` to `/jobs?tab=applications` and `/jobs?tab=map`
5. Update `navigation.config.ts` candidate Career section: remove Jobs Map and Applications entries

### Phase 2: Admin/Partner Jobs Command Center
1. Expand the existing role-switch in `Jobs.tsx` (line 416) to render a tabbed command center
2. Create tab components by extracting content from each source page:
   - `JobsAllTab` -- wraps existing `PartnerJobsHome`
   - `JobsApplicationsTab` -- wraps `CompanyApplications` content
   - `JobsClosedTab` -- wraps `ClosedJobs` content
   - `JobsAnalyticsTab` -- wraps `JobAnalyticsIndex` + `JobAnalyticsDashboard`
   - `JobsIntelligenceTab` -- wraps `HiringIntelligenceHub` content
   - `JobsInteractionsTab` -- wraps `InteractionsFeed` + entry button
3. Use URL query parameter `?tab=` for state persistence (consistent with platform pattern)
4. Add `<Navigate>` redirects for all legacy routes
5. Update `navigation.config.ts` for partner and admin roles

### Phase 3: Cleanup
1. Mark old standalone pages as deprecated (keep files temporarily for redirect safety)
2. Update route files (`jobs.routes.tsx`, `admin.routes.tsx`, `analytics.routes.tsx`)
3. Remove redundant sidebar entries from `navigation.config.ts`
4. Update any internal `navigate()` calls and `<Link>` components across the codebase

---

## Files Modified

| File | Changes |
|---|---|
| `src/pages/Jobs.tsx` | Major: add candidate tabs (Applications, Map), expand admin/partner tabbed command center |
| `src/components/jobs/CandidateJobsHub.tsx` | **New**: Candidate tabbed experience component |
| `src/components/jobs/AdminJobsCommandCenter.tsx` | **New**: Admin/Partner tabbed command center component |
| `src/components/jobs/tabs/ApplicationsTab.tsx` | **New**: Extracted from Applications.tsx |
| `src/components/jobs/tabs/MapTab.tsx` | **New**: Wraps GlobalJobsMap |
| `src/components/jobs/tabs/ClosedJobsTab.tsx` | **New**: Extracted from ClosedJobs.tsx |
| `src/components/jobs/tabs/JobAnalyticsTab.tsx` | **New**: Extracted from JobAnalyticsIndex + Dashboard |
| `src/components/jobs/tabs/IntelligenceTab.tsx` | **New**: Extracted from HiringIntelligenceHub |
| `src/components/jobs/tabs/InteractionsTab.tsx` | **New**: Extracted from InteractionsFeed + Entry |
| `src/config/navigation.config.ts` | Consolidate sidebar entries for all 3 roles |
| `src/routes/jobs.routes.tsx` | Add redirect routes, remove standalone routes |
| `src/routes/admin.routes.tsx` | Remove `/admin/closed-jobs`, `/admin/job-analytics` routes |
| `src/routes/analytics.routes.tsx` | Remove `/hiring-intelligence` route |
| `src/routes/candidate.routes.tsx` | Remove `/applications` standalone route |

## Pages Eliminated

| Page | Lines | Absorbed Into |
|---|---|---|
| `Applications.tsx` | 425 | Jobs Hub > Applications tab |
| `JobsMap.tsx` | 30 | Jobs Hub > Map tab |
| `CompanyJobsDashboard.tsx` | 630 | Jobs Command Center > All Jobs tab |
| `CompanyApplications.tsx` | 464 | Jobs Command Center > Applications tab |
| `ClosedJobs.tsx` | 522 | Jobs Command Center > Closed tab |
| `JobAnalyticsIndex.tsx` | 207 | Jobs Command Center > Analytics tab |
| `JobAnalyticsDashboard.tsx` | 203 | Jobs Command Center > Analytics tab |
| `HiringIntelligenceHub.tsx` | 547 | Jobs Command Center > Intelligence tab |
| `InterviewComparison.tsx` | 247 | Jobs Command Center > Intelligence tab |
| `InteractionsFeed.tsx` | -- | Jobs Command Center > Interactions tab |
| `InteractionEntry.tsx` | -- | Jobs Command Center > Interactions tab |

**Result: 14+ pages reduced to 2 hubs + 2 detail pages. Sidebar entries reduced by ~70%.**

## Technical Notes

- All tab components are lazy-loaded to prevent loading unused content
- URL query params (`?tab=closed`) enable deep-linking and back-button support
- `<Navigate>` redirects ensure zero broken bookmarks or shared links
- The existing `PartnerJobsHome` component and `JobDashboard` page remain untouched internally -- they are wrapped, not rewritten
- Phase 1 and Phase 2 can be implemented independently

