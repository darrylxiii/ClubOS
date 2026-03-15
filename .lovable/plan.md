

# Audit Status: What's Next

## Completed So Far
1. **Round 1 Candidate Audit** — 12 fixes shipped (query patterns, navigation, sorting)
2. **Round 2 Candidate Audit** — 5 fixes shipped (dead code, hardcoded dates, useQuery refactor, Send Message button, widget fixes)
3. **Notification System** — Phase 1-3 complete (orchestrator, settings UI, 7 new edge functions, email templates standardized)

## What Remains — Prioritized

### TIER 1: Code Quality Debt (Candidate Pages)

**A. Settings.tsx — 751-line monolith (flagged twice, still unfixed)**
- 20+ `useState` calls, no form validation, manual debounced save
- Heavy `as any` casting throughout (lines 226-227, 281-284, 357, 400, 425)
- Should decompose into hook (`useSettingsForm`) + existing sub-components already extract some tabs

**B. ClubAI.tsx — 1024-line monolith (flagged, still unfixed)**
- Full chat page in a single file
- Should extract: `useClubAIChat` hook, `ChatMessageList`, `ChatSessionSidebar`, `ChatConfirmationDialog`

**C. Meetings.tsx — 441 lines, uses `useState/useEffect` with manual fetch**
- No `useQuery`, no caching, refetches on every mount
- Same pattern fixed in `ApplicationDetail` — should apply the same refactor

**D. Messages.tsx — 493 lines**
- Already uses `useMessages` hook, but the page itself is large
- Lower priority — functional

**E. Jobs.tsx — 834 lines**
- Uses `useQuery` already — structurally better
- Large but modular (tabs are lazy-loaded)

### TIER 2: console.log/error Cleanup
- **760 matches across 60 files** — `console.error` should be `logger.error`
- Candidate-facing offenders: `JobDetail.tsx` (5 instances), `CareerPath.tsx`, `DocumentManagement.tsx`, `InterviewPrep.tsx`, `Meetings.tsx`, `EnhancedProfile.tsx`

### TIER 3: Remaining `window.confirm()` Calls
- `JobDashboard.tsx` line 656 — delete pipeline stage
- `UnifiedUserManagement.tsx` line 865 — reset MFA (admin page, lower priority)

### TIER 4: `as any` Type Safety
- **368 matches in 40 files** — Settings.tsx is the worst offender
- `Companies.tsx`, `EnhancedProfile.tsx`, `UnifiedCandidateProfile.tsx`, `InterviewPrepChat.tsx` all cast Supabase joins

### TIER 5: Remaining Tech Debt (from TECHNICAL_DEBT.md)
5 low-priority items remain (~9h estimated):
- TD-008: Email scheduling via Edge Function
- TD-010: User profile fetch for assessment personalization
- TD-011: Meeting templates table
- TD-013/14/15: Contract detail page modals (revision, upload, comments)

---

## Recommended Next Step

**Refactor Settings.tsx and Meetings.tsx** — these are the two highest-impact candidate-facing monoliths:

| File | Lines | Issue | Fix |
|------|-------|-------|-----|
| `Settings.tsx` | 751 | 20+ useState, no validation, `as any` everywhere | Extract `useSettingsData` hook, add Zod validation, type Supabase queries |
| `Meetings.tsx` | 441 | Manual fetch, no caching | Refactor to `useQuery`, add skeleton loading |
| `ClubAI.tsx` | 1024 | Monolith | Extract hook + 3 sub-components |

Then sweep `console.error` → `logger.error` across the 6 candidate-facing pages, and replace the remaining `window.confirm()` in `JobDashboard.tsx`.

This would bring the candidate experience code quality to a consistent standard across all pages.

