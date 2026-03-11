

# Employee Dashboard + Finance Hub — Critical Audit

## Score: 52/100 | Target: 100/100

---

## What's Wrong

### A. Employee Intelligence Tabs (RoleIntelligenceTab + UserDetailModal)

**1. Zero earnings data (Critical — 0 of 3 financial sources used)**
The `RoleIntelligenceTab` and `UserDetailModal` show "Revenue" (placement fees generated for the company) but never show what the employee actually **earned**:
- `employee_commissions` — never queried (commissions from placements)
- `referral_revenue_shares` — never queried (% of all revenue)
- `referral_payouts` — never queried (referral bonuses)

An employee who generated €100k in placement fees but earned €15k in commissions sees "€100k Revenue" with no indication of their take-home.

**2. No meetings/interviews tracked per employee (Missing)**
`meeting_participants` links users to meetings. Number of meetings attended, interview recordings analyzed, total meeting hours — all missing from the employee view. For a recruitment firm, interview volume is a core productivity metric.

**3. No `activity_feed` event counts per employee (Missing)**
The `activity_feed` table logs business events (candidate added, status changed, note written). Counting these per user gives a real "actions that matter" metric vs the generic `total_actions` from `user_activity_tracking` which includes page views.

**4. `as any` type casts throughout UserDetailModal (Code quality)**
Lines 166, 177, 230-231, 262-265 — six `as any` casts on `userData.activity` and `userData.recruiterMetrics`. These fields should be properly typed.

**5. No click-through from RoleIntelligenceTab rows to UserDetailModal (UX gap)**
Employee rows are not clickable. The `UserDetailModal` exists but the `RoleIntelligenceTab` has no `onUserClick` handler wired.

**6. No sorting or filtering on the employee table (UX gap)**
Cannot sort by revenue, placements, time online, or filter by activity level. For 10+ employees this is essential.

### B. Revenue Share Earnings (RevenueShareEarningsTable)

**7. Uses `total_amount` (gross) instead of `net_amount` (Bug)**
Line 61: `const amount = Number(invoice.total_amount) || 0` — contradicts `RevenueDistributionSummary` which correctly uses `net_amount` with `grossToNet` fallback. Overstates share obligations by ~21% (NL VAT).

**8. Ignores `applies_to` scope (Bug)**
The `referral_revenue_shares` table has an `applies_to` field (e.g. `"all_revenue"`, `"specific_clients"`) and `min_deal_value`. The calculation applies the percentage to ALL invoices regardless, overstating obligations for scoped shares.

**9. Ignores `effective_from` / `effective_to` date bounds (Bug)**
Shares have date-range fields but the calculation includes all YTD invoices even if the share only became active mid-year.

**10. No connection between revenue shares and employee dashboard (Architecture gap)**
Revenue share beneficiaries who are also employees never see their share earnings in the employee detail view (`EmployeeDetailView`). The `EmployeeCommissionsTab` shows `employee_commissions` but not revenue share earnings or referral payouts.

### C. Employee Detail View (EmployeeDetailView)

**11. No revenue share or referral payout tab (Missing)**
The detail view has Overview, KPIs, Targets, Time, Commissions — but no "Earnings" tab that consolidates all income streams (commissions + share earnings + referral payouts).

**12. No activity/login history (Missing)**
No `user_activity_tracking` data shown. The admin intelligence tabs show logins and time online, but the individual employee detail page does not.

---

## Implementation Plan

### Phase 1: Fix Revenue Share Calculation Bugs (52 → 62)

**File: `src/components/admin/RevenueShareEarningsTable.tsx`**
- Line 61: Change `total_amount` → `net_amount` with `grossToNet` fallback (matching `RevenueDistributionSummary`)
- Add `applies_to` filtering: only apply share to matching invoices
- Add `effective_from`/`effective_to` date bounds: skip invoices outside the share's active period
- Respect `min_deal_value`: skip invoices below the threshold

### Phase 2: Wire Earnings into RoleIntelligenceTab (62 → 75)

**File: `src/components/admin/activity/RoleIntelligenceTab.tsx`**
- Add 3 parallel queries to existing `Promise.all`:
  - `employee_commissions` via `employee_profiles` (match `user_id` to `employee_profiles.user_id` → `employee_commissions.employee_id`)
  - `referral_payouts` where `referrer_user_id` IN user IDs
  - `referral_revenue_shares` where `user_id` IN user IDs + Moneybird invoices (reuse corrected calculation from Phase 1)
- Add `EmployeeRow` fields: `commissions_earned`, `commissions_paid`, `referral_earnings`, `share_earnings`, `total_earnings`
- Add summary card: **"Total Earnings"** (all 3 income streams combined)
- Add columns: **Commissions** | **Earnings** (total take-home)
- Add `onUserClick` prop, make rows clickable → opens `UserDetailModal`
- Add sort toggle on column headers (by revenue, earnings, placements, time online)

### Phase 3: Upgrade UserDetailModal with Earnings Tab (75 → 85)

**File: `src/components/admin/activity/UserDetailModal.tsx`**
- Add **"Earnings"** tab alongside Performance/Events/Profile
- Fetch in parallel (add to existing `Promise.all`):
  - `employee_commissions` (via `employee_profiles` lookup)
  - `referral_payouts` where `referrer_user_id = userId`
  - `referral_revenue_shares` where `user_id = userId` + Moneybird invoices for calculation
  - `meeting_participants` count where `user_id = userId` (meetings attended)
- Earnings tab shows:
  - 4 KPI cards: Total Commissions (paid/pending), Revenue Share Earnings (realized/projected), Referral Payouts, Total Take-Home
  - Commission history list (reuse existing pattern from `EmployeeCommissionsTab`)
  - Revenue share breakdown if active shares exist
- Performance tab additions:
  - Meetings attended count
- Remove all `as any` casts — type the activity and recruiterMetrics interfaces properly

### Phase 4: Add Earnings to EmployeeDetailView (85 → 92)

**File: `src/components/employees/EmployeeDetailView.tsx`**
- Add 6th tab: **"Earnings"** (Wallet icon)
- New component: `src/components/employees/EmployeeEarningsTab.tsx`
  - Fetches all 3 income streams for this employee
  - Shows consolidated view: Commissions + Revenue Share Earnings + Referral Payouts
  - Total YTD earnings with paid vs pending breakdown
  - Monthly earnings chart (simple bar chart using recharts, already installed)
- Add activity stats to the Overview tab:
  - Login count, total time online, last login (from `user_activity_tracking`)
  - Meetings attended (from `meeting_participants`)

### Phase 5: Shared Earnings Calculation Utility (92 → 97)

**New file: `src/lib/employeeEarnings.ts`**
- Extract the revenue share calculation logic into a shared utility so `RevenueShareEarningsTable`, `RoleIntelligenceTab`, `UserDetailModal`, and `EmployeeEarningsTab` all use the same corrected calculation
- Function: `calculateShareEarnings(share, invoices)` — handles `applies_to`, `effective_from/to`, `min_deal_value`, and uses `net_amount`
- Function: `aggregateEmployeeEarnings(userId, commissions, payouts, shareEarnings)` — returns total/paid/pending breakdown

### Phase 6: Polish (97 → 100)

- `RoleIntelligenceTab`: Add loading skeleton for new columns
- `UserDetailModal`: Remove remaining `as any` casts (define proper interfaces for activity tracking and recruiter metrics)
- `RevenueShareEarningsTable`: Add "Scope" column showing `applies_to` value so admins understand what each share covers

---

## Files Summary

| File | Action |
|------|--------|
| `src/lib/employeeEarnings.ts` | **New** — Shared earnings calculation utility |
| `src/components/employees/EmployeeEarningsTab.tsx` | **New** — Consolidated earnings tab for employee detail |
| `src/components/admin/RevenueShareEarningsTable.tsx` | Fix gross→net, add `applies_to`/date/min_deal filtering |
| `src/components/admin/activity/RoleIntelligenceTab.tsx` | Add earnings queries, clickable rows, sort, earnings columns |
| `src/components/admin/activity/UserDetailModal.tsx` | Add Earnings tab, meetings count, remove `as any` casts |
| `src/components/employees/EmployeeDetailView.tsx` | Add Earnings tab, activity stats on Overview |

No database changes needed.

