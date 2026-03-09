

# System Audit — Round 3

## Completed So Far (Rounds 1-2)
- Settings page: `useQuery`/`useMutation` hook extracted
- Meetings page: `useMeetingsData` hook created
- `.single()` → `.maybeSingle()` in 6 high-risk pages
- Messages search, PartnerHome guard, DossierView security, Scheduling decomposition

## Current State: 72/100

---

## Remaining Issues by Priority

### Priority 1: Meetings Page Still Has Debug Logs (Quick Win)
`src/pages/Meetings.tsx` lines 51-59 still contain 3 `console.log` debug statements that were flagged in Round 2 but not removed.

### Priority 2: `useState<any>` Epidemic — 159 Files, ~995 Matches
The worst offenders:
- **HiringIntelligenceHub.tsx**: 6 `useState<any>` + manual fetch + `setLoading` pattern (549 lines)
- **CourseDetail.tsx**: 4 `useState<any>` + manual fetch
- **UnifiedTaskDetailDialog.tsx**: 6 `useState<any>`
- **ExpertMarketplace.tsx**: 3 `useState<any>` + results cast `as any`
- **MeetingRoom.tsx**: `useState<any>` + manual fetch
- **InstantMeetingButton.tsx**: 2 `useState<any>`

### Priority 3: `as any` Table Casts — 53 Files, 527 Matches in Pages
Key clusters:
- **BlogEngine.tsx**: `'blog_analytics' as any`
- **JobApprovals.tsx**: `(supabase as any).from('jobs')` + update cast
- **ExpertMarketplace.tsx**: `setExperts(data as any)` / `setModules(data as any)`
- **TargetCompaniesOverview.tsx**: 8+ `(tc.companies as any)` / `(tc.profiles as any)` casts on join results
- **ClientAnalyticsPage.tsx**: `(supabase as any).from('marketplace_projects')`

### Priority 4: Console.log Cleanup — 55 Files, ~983 Matches
Beyond Meetings, major offenders:
- **ConnectionsSettings.tsx**: 20+ OAuth debug logs with emoji prefixes
- **UserCompanyAssignment.tsx**: 4 debug logs
- **RadioListen.tsx**: 4 debug logs
- **OAuthOnboarding.tsx**: 5 debug logs
- **Onboarding.tsx**: `console.log("Form submitted:", formData)` leaking PII

### Priority 5: Remaining `.single()` — 61 Files, 415 Matches in Pages
Still risky filter-based `.single()` calls in:
- **CourseDetail.tsx**: `.eq("slug", slug).single()` — slug lookup can fail
- **MeetingInsights.tsx**: 2x `.single()` on meeting/insights lookup
- **PartnerRejections.tsx**: membership lookup
- **Post.tsx**: post + author lookups
- **ContractDetailPage.tsx**: contract lookup by ID param
- **ConnectsStorePage.tsx**: 2x `.single()` on balance/subscription
- **PartnerWelcome.tsx**: 3x `.single()` on profile/membership/strategist

### Priority 6: Technical Debt — 5 Remaining Items
From `TECHNICAL_DEBT.md`: TD-008, TD-010, TD-011, TD-013/14/15 (Contract page modals)

---

## Fix Plan

### Batch A: Quick Wins (72 → 78)
1. Remove all `console.log` from `Meetings.tsx`, `Onboarding.tsx` (PII leak), `Settings.tsx`
2. Remove debug logs from `ConnectionsSettings.tsx`, `UserCompanyAssignment.tsx`, `OAuthOnboarding.tsx` — keep only `console.error` for actual failures
3. Convert `.single()` → `.maybeSingle()` in `CourseDetail`, `Post`, `MeetingInsights`, `PartnerWelcome`, `ContractDetailPage`, `ConnectsStorePage`, `PartnerRejections`

### Batch B: Type Safety (78 → 86)
4. Type `HiringIntelligenceHub` — define interfaces for stats, jobs, interviews; migrate to `useQuery`
5. Type `CourseDetail` — define `Course`, `Module`, `Certificate` interfaces; migrate to `useQuery`
6. Type `UnifiedTaskDetailDialog` — define interfaces for objective, project, subtasks
7. Fix `TargetCompaniesOverview` join casts — type the `.select()` join response properly

### Batch C: Remaining `as any` Table Casts (86 → 92)
8. Audit which `as any` tables actually exist in the schema vs missing — tag missing ones with `// TODO: add migration`
9. Remove casts for tables that exist (e.g., `jobs` in JobApprovals — no cast needed)
10. Fix `ExpertMarketplace` result casts with proper typing

### Batch D: Manual Fetch → useQuery (92 → 100)
11. Migrate `HiringIntelligenceHub` to `useQuery` (largest remaining manual-fetch page)
12. Migrate `CourseDetail` to `useQuery`
13. Migrate `ExpertMarketplace` to `useQuery`

**Recommendation**: Start with Batch A (quick wins — log cleanup + `.single()` safety) since it's high-impact, low-risk, and addresses a PII leak in Onboarding.

