

# Candidate Environment Audit — Round 2

## Status of Previous Fixes

All 12 fixes from the last audit are confirmed shipped:
- `ApplicationDetail.tsx`: Uses `or(user_id, candidate_id)` + `.maybeSingle()` ✅
- `Applications.tsx`: Interview prep nav fixed to `/jobs?tab=interview-prep` ✅
- `Home.tsx`: Application count uses `.or()` ✅ (but Home.tsx is now dead code — see below)
- `JobDetail.tsx`: Uses `.maybeSingle()` ✅
- `DiscoveryGrid.tsx`: Uses `queryClient.invalidateQueries` ✅ and correct join syntax ✅
- `PipelineSnapshot.tsx`: Uses `[...active].sort()` ✅
- `CompactProfileStrength.tsx`: Includes `candidate_profiles` fields ✅
- All interview-prep nav paths corrected ✅

---

## NEW ISSUES FOUND

### CRITICAL

#### 1. `Home.tsx` is dead code — 110 lines never rendered
`/home` maps to `ClubHome` (App.tsx line 367). `Home.tsx` is never imported or rendered anywhere. It contains duplicate dashboard logic (NextBestActionCard, ApplicationStatusTracker, FeaturedJobs) that will drift from the canonical `CandidateHome`. Should be deleted.

#### 2. `ApplicationDetail.tsx` hardcodes `finalDecisionDate: "2025-10-25"`
Line 600: `TimelineDeadlines` receives a hardcoded date from October 2025 — over 5 months in the past. Every candidate sees this stale date. Should either compute from pipeline data or be omitted when unknown.

#### 3. `ApplicationDetail.tsx` still uses `useState/useEffect` — no caching
Lines 62-197: Manual fetch with `useState` + `useEffect`. No TanStack Query = no caching, no deduplication, no stale-while-revalidate. Navigating back from the detail page re-fetches every time. This was flagged in the last audit but not yet fixed (deferred to Step 2).

#### 4. `ApplicationDetail.tsx` "Send Message" button does nothing
Line 638: `<Button variant="outline">Send Message</Button>` — no `onClick` handler. Clicking it does nothing. Should navigate to `/messages?to=${strategist.user_id}`.

#### 5. `ReferralNetworkWidget` shows only hardcoded zeros
Lines 12-19: All stats are hardcoded to 0. Comment says "candidate_referrals table not yet in schema." The widget renders a fully designed card with all zeros, which looks broken rather than graceful. Should either hide when no real data exists or query actual `referral_earnings` / `revenue_shares` data.

---

### MODERATE

#### 6. `CompactStrategist` queries `candidate_profiles.id` instead of `.user_id`
Line 33: `.eq('id', user!.id)` — the `candidate_profiles` table uses `user_id` as the foreign key to auth users, not `id` (which is its own primary key). If `id` happens to equal `user_id` it works by coincidence, but this is semantically wrong and fragile.

#### 7. `NextBestActionCard` doesn't include `candidate_profiles` in profile completion check
Lines 44-51: Only checks 10 fields from `profiles` table. The `CompactProfileStrength` widget was updated to include `candidate_profiles` fields, but `NextBestActionCard` still uses the old 10-field check. They can disagree — profile strength shows 60% while QUIN says "You're All Set!"

#### 8. `ApplicationDetail.tsx` loading state is a plain text paragraph
Lines 200-204: Shows "Loading application details..." as unstyled text instead of skeleton loaders. Every other page uses `<Skeleton />` components. This creates visual inconsistency.

#### 9. Settings.tsx remains a 751-line monolith (previously flagged, still unfixed)
20+ `useState` calls, no form validation, manual debounced save. Deferred from last audit but still the largest tech debt in the candidate experience.

#### 10. `Meetings.tsx` uses `useState/useEffect` with manual fetch (no `useQuery`)
Lines 32-33: `const [meetings, setMeetings] = useState<any[]>([])` with manual `setLoading`. Same pattern as the old `ApplicationDetail` — no caching, refetches on every mount.

#### 11. `ClubAI.tsx` is a 1024-line monolith
The full Club AI chat page is a single massive file. Should be decomposed into hooks and sub-components.

---

### CLEANUP

#### 12. `ApplicationDetail.tsx` uses `console.error` for strategist fetch errors
Line 131: `console.error("Error fetching strategist:", strategistError)` — should use `logger.error` per project standards.

#### 13. `ForYouColumn` in `DiscoveryGrid` casts `(j.companies as any)?.name`
Line 44: The join result should be properly typed instead of using `as any`.

#### 14. `ApplicationDetail` timeline widget shows hardcoded `estimatedDaysToNext: 5`
Line 599: Every stage shows "~5 days to next stage" regardless of actual pipeline velocity.

---

## IMPLEMENTATION PLAN

### Step 1: Delete dead code + fix critical bugs
- Delete `src/pages/Home.tsx` (dead code, never imported)
- Fix `ApplicationDetail.tsx` hardcoded `finalDecisionDate` — use last stage's `scheduledDate` or `null`
- Fix `ApplicationDetail.tsx` "Send Message" button — add `onClick={() => navigate('/messages?to=${strategist.user_id}')}`
- Fix `ReferralNetworkWidget` — hide the widget entirely when no real referral data exists (return `null` like other widgets)

### Step 2: Fix data inconsistencies
- Fix `CompactStrategist` query to use `.eq('user_id', user!.id)` instead of `.eq('id', user!.id)`
- Sync `NextBestActionCard` profile completion logic with `CompactProfileStrength` (include `candidate_profiles` fields)

### Step 3: Refactor ApplicationDetail to useQuery
- Replace `useState/useEffect` fetch with `useQuery({ queryKey: ['application-detail', applicationId] })`
- Replace text loading state with `<Skeleton />` components
- Replace `console.error` with `logger.error`

### Step 4: Fix hardcoded estimates
- Remove hardcoded `estimatedDaysToNext: 5` — compute from `stage_updated_at` history or omit
- Remove hardcoded `finalDecisionDate: "2025-10-25"` — use actual data or `undefined`

---

## FILES TO CHANGE

| File | Change |
|------|--------|
| `src/pages/Home.tsx` | **DELETE** — dead code |
| `src/pages/ApplicationDetail.tsx` | Fix message button, hardcoded dates, refactor to `useQuery`, skeleton loading |
| `src/components/clubhome/ReferralNetworkWidget.tsx` | Return `null` when all stats are zero (no real data) |
| `src/components/clubhome/CompactStrategist.tsx` | Fix `.eq('id')` → `.eq('user_id')` |
| `src/components/clubhome/NextBestActionCard.tsx` | Include `candidate_profiles` fields in completion check |

