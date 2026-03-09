

# System Audit — Round 2: Settings, Meetings, Type Safety & Data Fetching

## Overall Score: 64/100

---

## Area-by-Area Breakdown

### 1. Settings Page — 45/100 (752 lines)
**The largest remaining monolith.** 30+ individual `useState` calls managing profile, compensation, privacy, social, and preferences — all in one component. No `useQuery`, no `react-hook-form`. Manual `loadProfile()` via `useEffect`, debounced save via raw `setTimeout`.

**Issues:**
- 30+ `useState` declarations for individual fields instead of a form library or reducer (-8)
- No `useQuery` — manual fetch + `setLoading` pattern (-5)
- `profile` typed as `any` (-2)
- Debounced save via raw `useCallback` + `setTimeout` instead of `useMutation` with optimistic updates (-3)
- 752 lines with all tab content inline — should delegate to existing sub-components more cleanly (-2)

### 2. Meetings Page — 55/100 (448 lines)
Still uses `useState`/`useEffect` for all data. Manual `loadMeetings()` + `loadStats()` with `setLoading`. Debug `console.log` statements left in. Stats calculation uses hardcoded `hours: count * 0.5`.

**Issues:**
- No `useQuery` — manual fetch with `setLoading(true)` pattern (-5)
- Debug `console.log` statements still present (lines 53-54, 59) (-2)
- `meetings` typed as `any[]` (-2)
- `hours` stat hardcoded as `analyzedRes.count * 0.5` instead of real duration (-2)
- Stats queries don't filter by user — counts all meetings globally (-3)

### 3. `.single()` Safety — Systemic (398 files, 3076 matches)
The previous pass only fixed DossierView. The remaining files still have ~3000+ `.single()` calls. Key risky patterns:
- Filter-based lookups (`.eq('slug', ...)`, `.eq('user_id', ...)`) that can return 0 rows
- Key offenders: `CandidateProfile`, `AcademyCreatorHub`, `ApplicationDetail`, `Settings`, `CompanyJobsDashboard`, `BookingPage`

### 4. `as any` on Table Names — Systemic (36+ admin files, 75+ page matches)
Tables like `project_contracts`, `project_milestones`, `certificates`, `blog_analytics`, `meeting_recordings_extended`, `company_branding`, `comprehensive_audit_logs` are queried with `as any` casts. This means zero compile-time safety — if a table is renamed or removed, errors are silent until runtime.

### 5. `useState<any>` Across Pages — 42 files, 305 matches
Pages like `HiringIntelligenceHub` (6 `any` states), `AdminRejections`, `Academy`, `MeetingNotes`, `Settings` use untyped state throughout. This defeats TypeScript's purpose entirely.

### 6. Manual Fetch Pages Without `useQuery` — 35+ pages
35 pages still use the `setLoading(true) → fetch → setLoading(false)` pattern instead of React Query. This means no caching, no automatic refetch, no stale-while-revalidate, and duplicated loading/error state management.

---

## Summary Table

| Area | Score | Top Issue |
|------|-------|-----------|
| Settings page | 45 | 752-line monolith, 30+ useState, no useQuery |
| Meetings page | 55 | Manual fetch, debug logs, hardcoded stats |
| `.single()` safety | — | 3076 occurrences across 398 files |
| `as any` table names | — | 75+ in pages, 368 in admin components |
| `useState<any>` | — | 305 occurrences across 42 files |
| Manual fetch pages | — | 35+ pages without useQuery |
| **Overall** | **64/100** | |

---

## Fix Plan

### Priority 1: Settings Page Refactor (64 → 72)
1. Replace 30+ `useState` fields with `react-hook-form` + `zod` schema for the profile form
2. Migrate `loadProfile` to `useQuery` and `saveProfile` to `useMutation` with optimistic updates
3. Type `profile` properly instead of `any`
4. Remove raw debounce in favor of `useMutation` debounce pattern

### Priority 2: Meetings Page Cleanup (72 → 78)
5. Migrate `loadMeetings` and `loadStats` to `useQuery` hooks
6. Remove debug `console.log` statements
7. Type `meetings` array properly (replace `any[]`)
8. Fix stats queries to filter by current user
9. Calculate real meeting hours from duration data

### Priority 3: `.single()` → `.maybeSingle()` Batch Pass (78 → 86)
10. Convert filter-based `.single()` to `.maybeSingle()` in the top ~20 riskiest files:
    - `CandidateProfile`, `ApplicationDetail`, `Settings`, `CompanyJobsDashboard`
    - `BookingPage`, `AcademyCreatorHub`, `PersonalMeetingRoom`, `MeetingRoom`
    - `CandidateOnboarding`, `PendingApproval`
11. Keep `.single()` only after `.insert().select()` or guaranteed-unique ID lookups

### Priority 4: Remove `as any` Table Casts (86 → 92)
12. For tables that exist in the schema but are cast with `as any` — remove the cast
13. For tables not yet in generated types — these are legitimate gaps; leave `as any` but add a `// TODO: add to schema` comment for tracking
14. Focus on high-traffic pages: `ContractDetailPage`, `ContractListPage`, `ContractSignaturePage`, `CourseDetail`, `BlogEngine`

### Priority 5: Type `useState<any>` States (92 → 96)
15. Define interfaces for the top offending pages: `HiringIntelligenceHub`, `AdminRejections`, `Academy`, `MeetingNotes`, `MessagingAnalytics`
16. Replace `useState<any>` with typed state

### Priority 6: Migrate Remaining Manual Fetch Pages (96 → 100)
17. Convert the highest-traffic manual fetch pages to `useQuery`: `Academy`, `CourseDetail`, `BookingManagement`, `AdminRejections`, `HiringIntelligenceHub`

**Recommendation:** Start with Priority 1 (Settings) as it's the single worst-scoring page and touches every user. Then Priority 3 (`.single()` batch) for systemic safety.

