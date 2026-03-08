

# Plan Audit: Email System — Current Score & Path to 100/100

## Current Score: 78/100

The plan was written before most items were implemented. The codebase now shows that **the majority of Phase 1, Phase 2, and Phase 3 items are already done**. The plan is outdated and contains completed items presented as to-dos, plus a few items that still need work.

---

## What's Already Done (remove from plan)

| Item | Status |
|------|--------|
| `getEmailHeaders()` helper in `email-config.ts` | Done (line 93) |
| `htmlToPlainText()` helper in `email-config.ts` | Done (line 105) |
| All 23 email functions using `headers` + `text` | Done (23 files confirmed) |
| `rgba()` replaced with solid hex in `components.ts` | Done (line 73-79) |
| `linear-gradient()` removed from components | Done (zero matches) |
| `<ul>/<li>` replaced with table layout in `MeetingPrepCard` | Done (line 366-375) |
| Physical address added to footer (`COMPANY_ADDRESS`) | Done (line 238 of base-template) |
| `COMPANY_ADDRESS` constant added to `email-config.ts` | Done (line 87) |
| Emoji removed from email subject lines (6 functions) | Done (only CRM automation note left, not an email) |

---

## What's Still Missing (-22 points)

### 1. Remaining `rgba()` in `base-template.ts` (-3 pts)
Line 186: `box-shadow: 0 4px 24px rgba(0, 0, 0, 0.10)` — Outlook strips this. Replace with no box-shadow or a solid fallback.

**Fix:** Remove `box-shadow` from the container table inline style in `base-template.ts` line 186.

### 2. `JobAnalyticsIndex.tsx` still double-wraps in `AppLayout` (-5 pts)
Line 77: When `embedded` is false, it wraps content in `AppLayout` inside the already-present `ProtectedLayout`. This causes double sidebar/header rendering.

**Fix:** Change line 77 to always use a fragment wrapper:
```typescript
const Wrapper = ({ children }: { children: React.ReactNode }) => <>{children}</>;
```

### 3. Service Worker JS/CSS uses `CacheFirst` instead of `NetworkFirst` (-5 pts)
`vite.config.ts` line 209: JS/CSS handler is `CacheFirst`. The project memory note explicitly requires `NetworkFirst` for hashed bundles to prevent stale asset recovery errors. This is a **stability risk** — the same class of issue that caused the production crash.

**Fix:** Change handler from `'CacheFirst'` to `'NetworkFirst'` on line 209 of `vite.config.ts`.

### 4. `lucide-react` in `optimizeDeps.include` (-3 pts)
Line 32 of `vite.config.ts`: Forces the entire 157KB icon barrel to be pre-bundled as one chunk. Removing it lets Vite auto-discover only what's needed.

**Fix:** Remove `'lucide-react'` from the `optimizeDeps.include` array.

### 5. Plan file itself is stale (-3 pts)
`.lovable/plan.md` lists 25 files to modify and 4 phases of work that are 90% complete. The plan should reflect current reality.

**Fix:** Rewrite `.lovable/plan.md` to show completed status and only the remaining items above.

### 6. Exclamation points in email copy — not verified (-3 pts)
The plan claims `send-referral-invite` has exclamation points. Need to verify and fix if still present.

**Fix:** Check `send-referral-invite/index.ts` and remove any exclamation points from subject/body copy.

---

## Updated Plan (100/100)

### Single Phase — All Remaining Items

| # | Task | File | Risk |
|---|------|------|------|
| 1 | Change SW JS/CSS handler to `NetworkFirst` | `vite.config.ts` line 209 | None — aligns with memory note |
| 2 | Remove `lucide-react` from `optimizeDeps.include` | `vite.config.ts` line 32 | None — Vite auto-discovers |
| 3 | Fix `JobAnalyticsIndex` double `AppLayout` wrapper | `src/pages/admin/JobAnalyticsIndex.tsx` line 77 | None — same pattern as 45+ other pages |
| 4 | Remove `rgba()` box-shadow from email container | `supabase/functions/_shared/email-templates/base-template.ts` line 186 | None — progressive enhancement only |
| 5 | Remove exclamation points from `send-referral-invite` | `supabase/functions/send-referral-invite/index.ts` | None — copy change |
| 6 | Rewrite `.lovable/plan.md` to reflect completed state | `.lovable/plan.md` | None |

**Total files: 4 code files + 1 plan file. All changes are safe, surgical, and non-breaking.**

### Risk Assessment
- No database changes
- No new dependencies
- No auth/RLS changes
- No structural refactors
- Every change follows an already-proven pattern from prior work

