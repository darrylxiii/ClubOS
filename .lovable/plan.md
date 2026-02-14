
# Financial System Full Audit -- Score: 34/100

## Scoring Breakdown

### A. Revenue Tracking (18/25)
| Item | Score | Max | Notes |
|------|-------|-----|-------|
| Moneybird sync + financial metrics | 4 | 5 | Working. 49 invoices synced, 3 metric snapshots. Solid foundation. |
| Revenue summary cards (net/collected/outstanding) | 4 | 5 | Clean VAT-aware net revenue display with tooltips. |
| Revenue overview chart (monthly invoiced vs collected) | 3 | 5 | Exists but wraps a single sub-component. No trend annotations, no comparison to prior year. |
| Cash flow projection (30/60/90 day) | 4 | 5 | Well-structured with pipeline toggle, DSO, pending commissions, and subscription costs included. |
| Top clients + payment aging | 3 | 5 | Present but no drill-down, no client concentration risk warning, no export. |

### B. Expense & Cost Management (6/25)
| Item | Score | Max | Notes |
|------|-------|-----|-------|
| Vendor subscriptions table + CRUD | 3 | 5 | Full CRUD exists, filters, renewal warnings. But **0 records entered** -- entirely empty. |
| Subscription budgets | 1 | 5 | Table + hooks exist. Budget vs Actual UI works. But **0 budgets set**, so the card shows "No budgets configured." No way to add budgets from the UI (no add-budget dialog). |
| Operating expenses | 1 | 5 | CRUD + categories exist (7 categories seeded). But **0 expense records**. Monthly average divides by 12 even if only February (should use months elapsed). |
| Expense auto-import from subscriptions | 1 | 5 | "Sync to Expenses" button exists and the hook works, but since there are 0 subscriptions, it generates 0 entries. No auto-scheduled sync. |
| Cost intelligence cards | 1 | 5 | All four cards render. But with 0 subscriptions: Cost per Placement shows total expenses / 3 placements (correct logic), Health Score defaults to a hardcoded 75 when no seat data exists, Savings shows 0. The health score calculation has a **bug**: starts at 100, then adds utilization scores, so it can exceed 100 before the final `Math.min`. |

### C. Profit & Loss (8/10)
| Item | Score | Max | Notes |
|------|-------|-----|-------|
| P&L card | 5 | 5 | Excellent. Net revenue, commissions, payouts, SaaS costs, other expenses, gross margin, net profit, margin %. Properly excludes VAT. |
| P&L accuracy | 3 | 5 | Subscription cost YTD calculation is correct (months-active * MRC). But with 0 subscriptions and 0 expenses, the P&L only reflects commissions as deductions. No budget variance indicator as planned. |

### D. Deal Pipeline & Placement Fees (7/15)
| Item | Score | Max | Notes |
|------|-------|-----|-------|
| Placement fees table | 4 | 5 | 3 records exist. Good search, salary variance display, sourcer attribution, add dialog. "Generate Invoice" button does nothing (no handler). |
| Deal pipeline kanban | 3 | 5 | Full kanban with stages, revenue charts, forecasting, probation tracker, leaderboard, client health. Table `deal_pipeline_deals` does not exist in DB (query will fail). |
| Employee commissions | 3 | 5 | 2 records. Stats cards + table. No approval workflow beyond status badges. No link back to the placement that generated the commission. |

### E. Invoicing & Reconciliation (6/10)
| Item | Score | Max | Notes |
|------|-------|-----|-------|
| Invoice reconciliation | 4 | 5 | Solid: auto-reconcile via edge function, match/unmatch, CSV export, finance review queue. 49 invoices synced. |
| Partner invoices | 1 | 5 | Table exists (0 records). "Generate Invoice" on placement fees has no handler. No invoice PDF generation. |
| Moneybird settings/sync | 1 | 0 | Bonus: exists as a tab. Config management works. |

### F. VAT & Tax (4/5)
| Item | Score | Max | Notes |
|------|-------|-----|-------|
| VAT liability card | 2 | 2.5 | Clean quarterly breakdown, next filing deadline, paid vs outstanding VAT split. |
| VAT register table | 2 | 2.5 | Quarterly BTW-aangifte data. Works. |

### G. Revenue Ladder & Shares (3/5)
| Item | Score | Max | Notes |
|------|-------|-----|-------|
| Revenue ladder | 2 | 2.5 | 2 ladders with 6 milestones. Milestone calculation via edge function. |
| Revenue shares | 1 | 2.5 | Table + CRUD. Recruiter commissions table, referral payouts table. 0 revenue shares and 0 referral payouts -- no data to validate. |

### H. Architecture & Code Quality (3/5 bonus)
| Item | Score | Max | Notes |
|------|-------|-----|-------|
| Duplication | -1 | 0 | Subscriptions tab is rendered in 3 places: FinancialDashboard, FinanceHub (redirects), and SubscriptionManagement page (lazy loaded). |
| BurnRateChart uses `Math.random()` | -1 | 0 | Line 23: `monthlyBurn * (1 + (Math.random() * 0.1 - 0.05))` -- renders fake jittered data for "actual" spend. This is misleading; it should query real monthly expense totals. |
| Unused import | 0 | 0 | `SubscriptionManagementEmbed` imported in FinanceHub but never used (dead code). |

---

## Critical Issues (Must Fix)

### 1. BurnRateChart shows fabricated data
The "Actual" line uses `Math.random()` to jitter the current MRC. This means every page load shows different "historical" data that is entirely fake. Must query real monthly operating_expenses + subscription costs per month from the database.

### 2. No UI to create subscription budgets
The `BudgetVsActual` component reads from `subscription_budgets` but there is no dialog or form to create/edit budgets anywhere in the UI. Users see "No budgets configured" with no way to fix it.

### 3. Health score calculation bug
In `useSubscriptionBudgets.ts` line 85-96: `utilizationScore` starts at 100, then adds `(seats_used / seats_licensed) * 100` for each subscription, then divides by count. This means with 1 subscription at 100% utilization, score = (100 + 100) / 1 = 200, which then gets capped by `Math.min(100, ...)`. The initial 100 should not be there.

### 4. "Generate Invoice" button is non-functional
In `PlacementFeesTable.tsx` line 73-75: the button has no `onClick` handler. It renders but does nothing.

### 5. Monthly average expense calculation is wrong
In `ExpenseTracking.tsx` line 237: divides YTD expenses by 12 regardless of current month. Should divide by months elapsed.

### 6. Dead code in FinanceHub
`SubscriptionManagementEmbed` is imported (line 18) but the tab just shows a redirect link. The import should be removed.

### 7. No data seeded
0 vendor subscriptions, 0 operating expenses, 0 budgets, 0 partner invoices, 0 referral payouts. The system looks broken to any user because every chart, table, and metric shows empty/zero states.

---

## Improvement Plan to Reach 100/100

### Phase 1: Fix Broken Things (34 -> 55)

1. **Fix BurnRateChart** -- Query actual monthly expenses from `operating_expenses` and subscription costs per month from `vendor_subscriptions` grouped by month. Remove `Math.random()`.

2. **Add Budget Management Dialog** -- Create an `AddBudgetDialog` component with category dropdown, amount input, period type selector. Wire it into `BudgetVsActual` and `SubscriptionManagement`.

3. **Fix health score math** -- Remove the initial `100` bias. Calculate purely from subscription data.

4. **Fix monthly average** -- Use `new Date().getMonth() + 1` instead of `12`.

5. **Remove dead code** -- Remove unused `SubscriptionManagementEmbed` import from FinanceHub.

6. **Wire "Generate Invoice"** -- Connect the placement fee "Generate Invoice" button to either a PDF generator (jspdf is installed) or a Moneybird API call.

### Phase 2: Data & Completeness (55 -> 75)

7. **Seed subscription data** -- Pre-populate `vendor_subscriptions` with common SaaS tools (Instantly, LinkedIn Recruiter, etc.) so the system demonstrates value immediately.

8. **Auto-sync expenses on schedule** -- Add a cron or "auto-generate on 1st of month" flag so subscription expenses flow into operating_expenses without manual "Sync" button clicks.

9. **Prior year comparison** -- Add YoY comparison to revenue charts and P&L card. The data exists in `moneybird_financial_metrics` across multiple periods.

10. **Client concentration risk** -- Flag in Top Clients if any single client exceeds 30% of revenue.

11. **Partner invoice generation** -- Build a flow: select placement fees -> generate draft invoice -> preview PDF -> send via Moneybird API.

### Phase 3: Intelligence & Automation (75 -> 90)

12. **Real cost trend analysis** -- Track MRC changes over time (subscription cost history table) so burn rate shows genuine trends, not projections based on current MRC.

13. **Contract renewal alerts** -- Email/notification when a subscription is within `cancellation_notice_days` of its renewal date.

14. **Budget alerts** -- Toast or notification when a category exceeds 90% of budget.

15. **Expense categorization AI** -- Use QUIN to auto-categorize imported expenses based on vendor name and description.

16. **Revenue attribution tracking** -- For each subscription with `revenue_attribution` set, calculate actual ROI by comparing attributed revenue to cost.

### Phase 4: Polish & Enterprise Features (90 -> 100)

17. **Financial exports** -- PDF export of P&L, burn rate, and budget reports. CSV already exists for reconciliation; extend to all tables.

18. **Audit trail** -- Log all financial mutations (subscription add/edit/delete, expense changes, budget updates) to `audit_logs`.

19. **Multi-currency support** -- Some subscriptions may be in USD. Add exchange rate conversion for consolidated EUR reporting.

20. **Dashboard consolidation** -- Remove the duplicate Subscriptions tab from FinancialDashboard (it exists on both the dashboard and the dedicated page). Keep one canonical location.

21. **Role-based visibility** -- Finance role should see full P&L; Strategist should only see their commissions and pipeline metrics.

22. **Cohort analysis** -- The Revenue Dashboard shows "Cohort analysis will be available once sufficient customer data is collected." Wire this to actual placement/client data grouped by signup cohort.

---

## Technical Details

### Files to Modify

| File | Change |
|------|--------|
| `src/components/financial/BurnRateChart.tsx` | Replace `Math.random()` with real monthly expense query |
| `src/components/financial/BudgetVsActual.tsx` | Add "Set Budget" button that opens new dialog |
| `src/hooks/useSubscriptionBudgets.ts` | Fix health score: remove initial 100 bias |
| `src/pages/admin/ExpenseTracking.tsx` | Fix monthly avg: divide by months elapsed, not 12 |
| `src/pages/admin/FinanceHub.tsx` | Remove dead import |
| `src/components/financial/PlacementFeesTable.tsx` | Wire "Generate Invoice" button |

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/financial/AddBudgetDialog.tsx` | Form to create/edit category budgets |
| `src/components/financial/InvoiceGenerator.tsx` | PDF invoice generation from placement fees |

### Database Changes

| Change | Purpose |
|--------|---------|
| Seed `vendor_subscriptions` with sample data | Demonstrate system value |
| Add `subscription_cost_history` table | Track MRC changes over time for real trend data |
| Add index on `operating_expenses(expense_date)` | Performance for monthly aggregation queries |
