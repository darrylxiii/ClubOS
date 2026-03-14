

# Full Candidate Environment Audit

## Critical Bugs

### 1. ApplicationDetail only matches `user_id`, not `candidate_id`
**File:** `src/pages/ApplicationDetail.tsx` line 101
The query uses `.eq("user_id", user.id)` but `useApplications.ts` (the list page) uses `.or("user_id.eq.${userId},candidate_id.eq.${userId}")`. If an application was created via admin/strategist sourcing (setting `candidate_id` but not `user_id`), the candidate can see it in the list but gets "Application not found" when clicking into it.

**Fix:** Change `.eq("user_id", user.id)` to `.or("user_id.eq.${user.id},candidate_id.eq.${user.id}")`.

### 2. `interview-prep/session` route doesn't exist
**File:** `src/pages/Applications.tsx` line 325
The "Interview Prep" button in `ApplicationCard` navigates to `/interview-prep/session?jobId=...` but no route is registered for this path. The candidate routes only define `/interview-prep` (redirects to jobs tab) and `/interview-prep/chat/:sessionId`. Clicking this button results in a 404.

**Fix:** Either register a `/interview-prep/session` route or change the navigation to `/jobs?tab=interview-prep&jobId=...`.

### 3. `Home.tsx` queries `candidate_id` column for application count
**File:** `src/pages/Home.tsx` line 47
Uses `.eq('candidate_id', user.id)` but should also check `user_id` like `useApplications` does. This means the dashboard stats may show 0 pending applications when the candidate actually has some via `user_id`.

**Fix:** Use `.or("user_id.eq.${user.id},candidate_id.eq.${user.id}")`.

### 4. Duplicate home pages: `/home` vs `/club-home`
`Home.tsx` renders its own dashboard (NextBestAction + FeaturedJobs + ApplicationStatusTracker + CandidateQuickActions) while `ClubHome.tsx` renders `CandidateHome` (completely different 6-zone layout). The candidate gets a different experience depending on which URL they land on. If `/home` is the default route, the carefully designed `CandidateHome` is never shown.

**Fix:** Determine which is canonical. If `CandidateHome` is the intended experience, redirect `/home` to `/club-home` or replace `Home.tsx` content with `CandidateHome`.

### 5. `JobDetail.tsx` uses `.single()` instead of `.maybeSingle()`
**File:** `src/pages/JobDetail.tsx` line 106
If a job is deleted or has an invalid ID, `.single()` throws a hard runtime error instead of gracefully redirecting. Per project standards, filter-based lookups must use `.maybeSingle()`.

**Fix:** Change to `.maybeSingle()` and handle null.

---

## Moderate Issues

### 6. `ApplicationDetail.tsx` doesn't use `useQuery` (TanStack)
It uses raw `useState`/`useEffect` with manual loading state. This means no caching, no deduplication, no stale-while-revalidate. Navigating back and forth re-fetches every time.

**Fix:** Refactor to `useQuery` with `queryKey: ['application-detail', applicationId]`.

### 7. `CompactInterviewCountdown` navigates to `/interview-prep` which redirects
Line 122 navigates to `/interview-prep` which immediately redirects to `/jobs?tab=interview-prep`. This causes a visible URL flash and adds to browser history. Same issue in `InterviewCountdownWidget.tsx` and `StagePreparation.tsx`.

**Fix:** Navigate directly to `/jobs?tab=interview-prep`.

### 8. `Settings.tsx` is a 751-line monolith with 20+ `useState` calls
Violates the project standard of decomposing files >500 lines. All profile, compensation, privacy, and social state is managed in one component with a manual debounced save. No `react-hook-form` or `zod` validation despite project standards requiring it for settings.

**Fix:** Extract state into `useSettingsProfile`, `useSettingsCompensation`, `useSettingsPrivacy` hooks. Migrate forms to `react-hook-form + zod`.

### 9. `DiscoveryGrid` saved jobs query uses wrong join syntax
**File:** `src/components/clubhome/DiscoveryGrid.tsx` line 99
Uses `job:jobs(id, title, location, company:companies(name))` — the join `company:companies` may fail because `jobs` references `companies` via `company_id` FK, not a column called `company`. Should be `companies:company_id(name)` or the PostgREST auto-detected join.

**Fix:** Change to `jobs!inner(id, title, location, companies:company_id(name))`.

### 10. `CompactStrategist` SLA computation is expensive and client-side
Lines 49-96: Fetches up to 500 messages, loops through all conversations, and computes average response time in the browser. This is O(n*m) work that should be a server-side RPC or cached metric.

**Fix:** Either create an RPC `get_strategist_avg_response_time(user_id, strategist_id)` or cache the result with a longer `staleTime`.

### 11. `DiscoveryGrid` Messages realtime uses `dispatchEvent` instead of query invalidation
Line 191: Dispatches `window.dispatchEvent(new CustomEvent('invalidate-messages'))` but nothing listens for this event. The realtime subscription does nothing.

**Fix:** Use `queryClient.invalidateQueries({ queryKey: ['discovery-messages'] })`.

### 12. Profile strength only checks 10 fields
`CompactProfileStrength` and `NextBestActionCard` both compute profile completion from the same 10 `profiles` fields, but ignore `candidate_profiles` fields (skills, work authorization, industry preferences, etc.). A candidate could be "100% complete" while missing critical hiring data.

**Fix:** Include `candidate_profiles` fields (skills, desired_role, work_authorization, etc.) in the completion calculation.

---

## Missing Features

### 13. No withdrawal confirmation for applied jobs
The `handleApply` in `JobDetail.tsx` inserts an application but there's no way for a candidate to withdraw from this page. Withdrawal is mentioned in project standards but only exists in the Applications list page.

### 14. No notification when application stage changes
The realtime subscription in `Applications.tsx` invalidates queries but doesn't show a toast or notification when a stage change happens. The candidate has to notice the UI update.

### 15. No interview prep session route with job context
The `ApplicationCard` "Interview Prep" button tries to navigate with `jobId` and `title` query params, but the route doesn't exist and the `InterviewPrep` page doesn't read these params to auto-select the application.

### 16. `PipelineSnapshot` sorts applications client-side by mutating array
Line 37: `active.sort(...)` mutates the filtered array in place. Should use `[...active].sort(...)` to avoid React state mutation issues.

---

## Implementation Plan

### Step 1: Fix critical routing/query bugs (items 1-5)
- `ApplicationDetail.tsx`: Add `candidate_id` to filter
- `Applications.tsx`: Fix interview-prep navigation path
- `Home.tsx`: Fix application count query
- Determine canonical home page (Home vs ClubHome)
- `JobDetail.tsx`: Change `.single()` to `.maybeSingle()`

### Step 2: Fix moderate data flow issues (items 6, 7, 9, 11, 16)
- `ApplicationDetail.tsx`: Refactor to `useQuery`
- Fix all `/interview-prep` navigations to go to `/jobs?tab=interview-prep`
- Fix `DiscoveryGrid` saved jobs join and realtime invalidation
- Fix `PipelineSnapshot` array mutation

### Step 3: Performance improvements (item 10)
- Move strategist SLA computation server-side or increase cache time significantly

### Step 4: Profile completion accuracy (item 12)
- Include `candidate_profiles` fields in completion calculation

### Step 5: Settings refactor (item 8)
- Extract hooks, add `react-hook-form + zod` validation (large task, can be deferred)

---

## Files to Change

| File | Change |
|------|--------|
| `src/pages/ApplicationDetail.tsx` | Fix `user_id` → `or(user_id, candidate_id)`, refactor to `useQuery` |
| `src/pages/Applications.tsx` | Fix interview-prep nav path |
| `src/pages/Home.tsx` | Fix application count query |
| `src/pages/JobDetail.tsx` | `.single()` → `.maybeSingle()` |
| `src/components/clubhome/CompactInterviewCountdown.tsx` | Fix nav to `/jobs?tab=interview-prep` |
| `src/components/clubhome/InterviewCountdownWidget.tsx` | Fix nav path |
| `src/components/StagePreparation.tsx` | Fix nav path |
| `src/components/clubhome/DiscoveryGrid.tsx` | Fix saved jobs join + realtime invalidation |
| `src/components/clubhome/PipelineSnapshot.tsx` | Fix array mutation |
| `src/components/clubhome/CompactProfileStrength.tsx` | Add candidate_profiles fields |
| `src/components/clubhome/NextBestActionCard.tsx` | Add candidate_profiles fields |
| `src/components/clubhome/CompactStrategist.tsx` | Increase staleTime, simplify SLA |

