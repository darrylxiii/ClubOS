

# Full Codebase Audit Report — Current State

## Score: ~85/100

The `/login` redirect is fully fixed (0 matches). Previous batch work resolved the most critical crashes. Here is what remains.

---

## Category 1: `.single()` Crash Risk — 2,565 matches in 337 files

Many are safe (insert/select/single, PK lookups), but a significant number are filter-based and will crash on empty results. The highest-risk remaining files not yet fixed:

| File | Dangerous pattern |
|------|------------------|
| `RecommendationsPanel.tsx` | `.eq('id', rec.recommended_id).single()` — rec may reference deleted content |
| `InterviewCommandWidget.tsx` | `.eq('id', meeting.candidate_id).single()` (x3) — candidate may be deleted |
| `AudiencePickerModal.tsx` | `.eq('id', userId).single()` — profile lookup |
| `MessageSearch.tsx` | `.ilike('full_name', ...).single()` — may match 0 or multiple |
| `Onboarding.tsx` | `.eq('code', inviteCode).single()` — code may not exist |
| `LiveDJs.tsx` | `.eq('id', session.dj_id).single()` — DJ profile may not exist |
| `AddJobTeamMemberDialog.tsx` | `.eq('id', jobId).single()` — job lookup |
| `useHealthScores.ts` | `.eq('id', jobId).single()` — job may be deleted |
| `useMLMatching.ts` | `.eq('id', options.jobId).single()` |
| `useTalentPool.ts` | `.eq('id', candidateId).single()` |
| `useSecurityConfig.ts` | `.eq('config_key', 'ip_whitelist').single()` (x2) — config may not exist |
| `SSOManagement.tsx` | filter-based lookups |

**Estimate: ~20 more files need `.maybeSingle()` conversion**

---

## Category 2: `useState<any>` — 453 matches in 84 files

Top offenders in pages (23 files, 131 matches):
- `MeetingRoom.tsx`, `MeetingNotes.tsx`, `MeetingInsights.tsx`
- `AcademyCreatorHub.tsx`, `CourseEdit.tsx`, `ModuleEdit.tsx`
- `InterviewPrepChat.tsx`, `AdminRejections.tsx`, `AdminUserProfile.tsx`
- `CompanyIntelligence.tsx`

Top offenders in components (61 files, 322 matches):
- `JobDashboardCandidates.tsx`, `EmailInbox.tsx`, `CompanyProfile.tsx`
- `UserProfilePreview.tsx`, `ModuleQuiz.tsx`, `UnifiedTaskDetailDialog.tsx`
- `MeetingIntelligenceHub.tsx`, `CompanyMLInsights.tsx`

**Impact: Developer quality, potential runtime bugs from untyped data access. Not user-facing crashes.**

---

## Category 3: `as any` casts — 592 matches in 63 page files

Most are casting Supabase queries for tables not in generated types (e.g., `(supabase as any).from('career_insights_cache')`). These are structural — fixing requires adding tables to the type system or creating typed wrappers.

**Impact: Medium. Masks type errors but works at runtime.**

---

## Category 4: Silent `catch` blocks — 831 matches in 107 files

Most `catch {}` blocks are now acceptable:
- JSON parse fallbacks, localStorage reads, Battery API, audio play, fullscreen — all fine
- Sentry import failures — acceptable

**Remaining problematic ones** (catch with only `console.error`, no toast):
- `Companies.tsx` lines 191, 243, 288 — member/metrics loads fail silently
- `UnifiedCandidateProfile.tsx` line 193 — candidate load error, no user feedback
- `JobDetail.tsx` lines 143, 185 — status checks fail silently (minor)

**Estimate: ~5 files need toast.error additions**

---

## Category 5: ErrorState adoption — only 8 pages use it

Pages that fetch data but have no ErrorState:
- `AcademyCreatorHub.tsx`, `PersonalMeetingRoom.tsx`, `BookingManagement.tsx`
- `MessagingAnalytics.tsx`, `Post.tsx`, `CompanyPage.tsx`, `ClubAI.tsx`
- `MeetingRoom.tsx`, `Settings.tsx`, `CourseDetail.tsx`

**Estimate: ~7 more pages should wire ErrorState**

---

## Category 6: `.catch(() => {})` swallowed promises — 168 matches in 23 files

Most are acceptable (media autoplay, fullscreen, Sentry lazy-load). Problematic ones:
- `MeetingRoom.tsx` lines 130, 146 — analytics POST silently swallowed
- `BatchProcessingPanel.tsx` line 55 — batch processing errors swallowed
- `FunnelAIAssistant.tsx` line 110 — AI response error, but does show error message in chat

**Impact: Low. Most are fire-and-forget or have fallbacks.**

---

## Implementation Plan (85 → 92)

### Wave 1: `.single()` → `.maybeSingle()` (20 files)
Convert the remaining filter-based lookups listed in Category 1. Keep `.single()` for insert+select and PK-by-id patterns.

### Wave 2: Silent catches → toast (5 files)
Add `toast.error()` to:
- `Companies.tsx` (3 silent catches for members/metrics)
- `UnifiedCandidateProfile.tsx` (candidate load)
- `JobDetail.tsx` (2 silent status checks)

### Wave 3: ErrorState wiring (7 pages)
Add `fetchError` state + `<ErrorState>` to:
- `AcademyCreatorHub.tsx`
- `PersonalMeetingRoom.tsx`
- `BookingManagement.tsx`
- `MessagingAnalytics.tsx`
- `CompanyPage.tsx`
- `ClubAI.tsx`
- `CourseDetail.tsx`

### Deferred (requires dedicated effort)
- `useState<any>` elimination (84 files) — needs interface definitions for each entity
- `as any` Supabase casts (63 files) — needs type generation for missing tables
- useQuery migration for remaining manual-fetch pages

---

## Summary

| Issue | Count | Severity | Fix effort |
|-------|-------|----------|-----------|
| Dangerous `.single()` | ~20 files remaining | HIGH — runtime crashes | 2h |
| Silent catches without toast | ~5 files | MEDIUM — invisible failures | 30m |
| Missing ErrorState | ~7 pages | MEDIUM — infinite loaders | 1h |
| `useState<any>` | 84 files, 453 instances | LOW — developer quality | 8h+ |
| `as any` casts | 63 files, 592 instances | LOW — type masking | 8h+ |
| Swallowed `.catch(() => {})` | ~3 actionable | LOW | 15m |

**Recommended: Implement Waves 1-3 (~32 files, ~3.5h) to reach 92/100.**

