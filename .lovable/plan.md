
# Batch 1 Audit: Two-Layer Review System — Honest Score

## Overall Score: 62/100

---

## What Works Well (earned points)

### Database Layer: 78/100
- Enums created correctly (`internal_review_status_enum`, `partner_review_status_enum`)
- Columns on `applications` all nullable with defaults — backward compatible
- `pipeline_reviewers` table with correct unique constraint and FKs
- `review_feedback_aggregates` table with proper structure
- `update_review_aggregates()` trigger function is solid — handles job + company aggregation, uses `ON CONFLICT` upsert, correctly filters
- RLS enabled on both new tables
- RLS on `pipeline_reviewers`: admin/strategist full access + reviewer reads own — correct

### useReviewQueue Hook: 70/100
- Clean data fetching with proper joins and map-based lookups (no N+1)
- All 5 mutations (approveInternal, rejectInternal, approvePartner, rejectPartner, holdPartner) implemented
- Writes to both `role_candidate_feedback` and `company_candidate_feedback` — dual-layer learning working
- Proper query invalidation on success

### PipelineCustomizer Reviewer Assignment: 80/100
- Loads partner members from `company_members`, resolves profiles
- Upsert with `onConflict` for idempotent assignment
- Primary toggle with "demote others" logic
- Remove reviewer works
- Role guard (`canManageReviewers`) in place

### JobDashboard Integration: 65/100
- Reviews tab added with pending count badge
- Pipeline stage filtering correctly excludes non-approved candidates
- Internal review panel shown only to admin/strategist

---

## Critical Issues (points deducted)

### 1. Migration file is INCOMPLETE (-15)
The migration file `20260308234831_...sql` only contains the trigger creation — NOT the enums, columns, tables, or RLS policies. The full schema (enums, `ALTER TABLE applications`, `CREATE TABLE pipeline_reviewers`, `CREATE TABLE review_feedback_aggregates`, RLS policies, trigger function) was apparently applied via a separate mechanism, but the migration file doesn't reflect the full migration. This means the migration is not reproducible from the file alone.

### 2. `review_feedback_aggregates` RLS is too permissive (-5)
Policy is `SELECT ... USING (true)` for authenticated users. Any authenticated user (including candidates) can read all review aggregates. Should be restricted to admin/strategist/partner roles.

### 3. `update_review_aggregates` trigger function lacks `search_path` (-3)
Linter warns about mutable search_path. The function should have `SET search_path = public`.

### 4. PartnerFirstReviewPanel UX issues (-8)
- **Rejection reason + specific gaps + ideal candidate fields are always visible**, even when approving. They should be conditionally shown only when the user intends to reject. This clutters the approve flow.
- **No swipe gesture support** despite the plan calling for "Tinder-style" — only keyboard shortcuts exist.
- **Tag labels use raw underscores**: `skills_gap` instead of "Skills Gap". The `replace('_', ' ')` only replaces the FIRST underscore — `leadership_potential` becomes "leadership potential" (no capitalization).
- **No candidate avatar/photo** displayed despite being fetched.
- **No source channel / sourced_by info** on the card.
- **No internal recommendation note** from the internal review shown to partner.

### 5. InternalReviewPanel uses `window.prompt` for rejection (-5)
Individual reject uses `window.prompt()` — a native browser dialog. This is inconsistent with the luxury UI standards. Should use a modal or inline input.

### 6. Keyboard shortcut handler has stale closure risk (-3)
The `useEffect` for keyboard shortcuts in `PartnerFirstReviewPanel` lists dependencies manually but the `handleApprove`/`handleReject`/`handleHold` functions are not stable references (no `useCallback`). Arrow keys may fire with stale state.

### 7. No optimistic updates (-2)
All mutations wait for server response before advancing to the next card. For a speed-optimized review flow, optimistic updates would make it feel instant.

### 8. `goNext` logic has an off-by-one issue (-3)
After approving/rejecting, `goNext` increments `currentIndex`, but the `partnerPending` array length also shrinks (since the mutation invalidates and re-fetches). The `useEffect` that clamps `currentIndex` may cause the user to skip a candidate or see the same one twice during the refetch window.

### 9. Bulk approve fires mutations in parallel without error boundaries (-2)
`Promise.all` in `runBulkApprove` / `runBulkReject` — if one fails, partial state. Should use `Promise.allSettled` and report which failed.

### 10. No activity log / audit trail writes (-5)
The plan specified writing to `candidate_application_logs` and `activity_feed` on review actions. Current implementation only writes to `company_candidate_feedback` and `role_candidate_feedback`. No audit trail.

### 11. `fetchApplicationsForMetrics` includes rejected apps in review count (-2)
Line 325: `.neq('status', 'rejected')` filters out rejected apps. But `internalReviewPendingCount` (line 521) counts apps where `internal_review_status === null`, which includes ALL existing apps that predate the feature. This inflates the pending badge count massively for jobs with existing candidates.

### 12. No empty state for reviewer options (-1)
If a company has no partner members, the reviewer assignment dropdown shows nothing with no helpful message.

### 13. No loading state for reviewer assignment section (-1)
Reviewer options load async in `useEffect` but no loading indicator while fetching.

---

## Summary Table

| Area | Score | Key Issues |
|------|-------|-----------|
| Database schema | 78 | Migration file incomplete, search_path warning |
| RLS & security | 70 | Aggregates too permissive, no audit trail |
| useReviewQueue hook | 70 | No optimistic updates, parallel error handling |
| InternalReviewPanel | 60 | window.prompt, bulk error handling |
| PartnerFirstReviewPanel | 55 | UX clutter, stale closures, off-by-one, no avatar/source |
| JobDashboard integration | 65 | Inflated pending count, review tab works |
| PipelineCustomizer | 80 | Solid reviewer assignment |
| **Overall** | **62/100** | |

---

## Fix Plan to Reach 100/100

### Fix Group A: Critical Data Integrity (62 → 75)
1. Fix migration file to be self-contained (or acknowledge it's handled)
2. Tighten `review_feedback_aggregates` RLS to admin/strategist/partner only
3. Set `search_path = public` on trigger function
4. Add audit trail writes (`candidate_application_logs`) on every review action
5. Fix pending count: only count apps where `internal_review_status = 'pending'` (not null)

### Fix Group B: UX Polish (75 → 90)
6. Conditionally show rejection fields only when user clicks Reject
7. Replace `window.prompt` with inline rejection dialog in InternalReviewPanel
8. Display candidate avatar on partner review card
9. Show source channel + sourced_by on review card
10. Show internal review notes to partner reviewer
11. Capitalize tag labels properly
12. Fix `goNext` off-by-one with index clamping after mutation settles

### Fix Group C: Robustness (90 → 100)
13. Wrap keyboard handlers in `useCallback` with proper deps
14. Use `Promise.allSettled` for bulk operations
15. Add loading state for reviewer options
16. Add empty state when no partner reviewers exist
17. Add optimistic update for card advance (instant feel)

I recommend implementing all three fix groups in a single pass.
