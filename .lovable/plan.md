
# Financial System Audit — 0.1% CFO Perspective

**Current Score: 62/100**

The previous round of fixes correctly solved the NET/GROSS consistency problem (metrics now match invoices exactly: 0 discrepancy across all 3 years). VAT utilities are centralized, payment aging uses NET, and the P&L accepts entity filtering. Those were real improvements.

But a 0.1% CFO would still reject this system for production financial reporting. Here is what remains broken, misleading, or missing.

---

## CATEGORY A: Numbers That Are Wrong Right Now

### A1. MoneybirdInvoicesTable still hardcodes `/1.21` (line 62)

The one remaining hardcoded VAT divisor in the codebase:
```typescript
const netAmount = Number(invoice.net_amount) || Number(invoice.total_amount) / 1.21;
```

After the re-sync, `net_amount` is always populated, so this fallback rarely fires. But if it ever does (e.g., a manually inserted row), Dubai invoices would be calculated at 21% instead of 5%. This is the only file that was missed in Phase 1.

**Fix:** Replace `/ 1.21` with `grossToNet(Number(invoice.total_amount))` using the centralized utility.

### A2. RevenueSummaryCards hardcodes "21% BTW" in tooltip (line 45)

```typescript
tooltip: `Gross: ${formatCurrency(grossRevenue)} (incl. 21% BTW)`,
```

When the entity selector is set to Dubai, the tooltip still says "21% BTW." This is factually wrong for UAE entity (5% VAT). The component does not receive `legalEntity` as a prop.

**Fix:** Pass `legalEntity` into `RevenueSummaryCards`. Conditionally show "21% BTW" or "5% VAT" based on entity.

### A3. CashFlowProjection ignores entity filter entirely

`FinancialDashboard` passes `legalEntity` to `ProfitLossCard`, `FinancialOverviewChart`, and `VATLiabilityCard` -- but NOT to `CashFlowProjection` (line 204). The cash flow forecast always shows consolidated numbers regardless of entity selector position.

`useRevenueForecasting` also has no `legalEntity` parameter. All its queries (unpaid invoices, commissions, payouts, pipeline) are unfiltered.

**Fix:** Add `legalEntity` prop to `CashFlowProjection` and thread it through `useRevenueForecasting` to filter `moneybird_sales_invoices` and `placement_fees` queries.

### A4. P&L export query in FinancialDashboard ignores entity (lines 57-103)

The `plData` query at the top of `FinancialDashboard` duplicates the entire P&L calculation but never applies the `legalEntity` filter. When exporting P&L to PDF/CSV while the entity selector is set to "Dubai," the export contains consolidated (all-entity) numbers, not the filtered view the admin sees on screen.

**Fix:** Add `legalEntity` to the query key and filter the `moneybird_sales_invoices` query in `plData`.

### A5. P&L card filters revenue by entity but NOT expenses

`ProfitLossCard.usePLData` correctly filters `moneybird_sales_invoices` by `legal_entity` (line 26-28). But the expense queries for `employee_commissions`, `operating_expenses`, and `vendor_subscriptions` are NOT filtered -- despite all three tables having a `legal_entity` column.

Result: When viewing "Dubai only," revenue shows Dubai-only numbers but ALL expenses (NL + Dubai) are subtracted, making Dubai's P&L appear far worse than reality.

**Fix:** Add `.eq('legal_entity', legalEntity)` to the commissions, expenses, and subscriptions queries in `usePLData` (when legalEntity is not 'all').

---

## CATEGORY B: Data Integrity Gaps

### B1. EUR 72,722 in placement fees permanently stuck as "pending"

All 5 placement fees have `invoice_id = NULL` and `status = 'pending'`. Zero `partner_invoices` exist. These fees represent real revenue that is not invoiced, not tracked, and has no aging. The oldest fee (`hired_date: 2025-12-15`) is 74 days old with no invoice.

A CFO would flag this as a material receivables gap. The "Create Invoice" button exists but has apparently never been used.

**Fix:** This is operational, not code. But the system should surface a warning when fees are uninvoiced past 14 days. `MissingFeesAlert` exists but it checks for jobs without fees -- not fees without invoices.

### B2. Placement fees and Moneybird invoices are completely disconnected

There is no reconciliation between `placement_fees` (EUR 72,722 pending) and `moneybird_sales_invoices` (EUR 61,000 net for 2026). Are they the same revenue? Different revenue? Double-counted? No way to tell from the current system.

The `ReconciliationAlert` component exists but it compares placement fees to partner_invoices (which has 0 rows). It never cross-references Moneybird invoices.

**Fix:** Add a reconciliation view that matches placement fees to Moneybird invoices by amount, date, and company name. Flag unmatched items.

### B3. No FX rate stored on placement fees

All 5 fees are EUR, so this is not a current problem. But `AddPlacementFeeDialog` uses `convertCurrency()` with potentially stale fallback rates for non-EUR fees. The converted `fee_amount_eur` is stored permanently without recording what rate was used. If audited, there is no way to verify the conversion.

**Fix:** Add `fx_rate_used` column to `placement_fees`. Store the rate at creation time.

---

## CATEGORY C: Structural/Reporting Issues

### C1. Three inline `formatCurrency` implementations remain

Despite the centralized `src/lib/currency.ts`, three components still define their own:
1. `RevenueSummaryCards.tsx` line 16-23 (inline, no AED support)
2. `MoneybirdInvoicesTable.tsx` line 43-44 (inline, no AED support)
3. `PlacementFeesTable.tsx` line 101-106 (inline, accepts currency param)

All use `nl-NL` locale, so the visual output is consistent. But `SupportedCurrency` in `currency.ts` is `'EUR' | 'USD' | 'GBP'` -- it does not include `'AED'`. Dubai fees denominated in AED would fall through to `en-US` locale formatting.

**Fix:** Add `AED` to `SupportedCurrency` and `LOCALE_MAP`. Replace the 3 inline implementations with imports.

### C2. `gross_profit` in metrics is just `total_paid` (line 524 of edge function)

```typescript
const grossProfit = totalPaid;
```

This makes `gross_profit` semantically meaningless -- it is identical to `total_paid`. The field name implies "revenue minus COGS," but no cost of goods sold is subtracted. If anyone queries `moneybird_financial_metrics.gross_profit`, they get a misleading number.

**Fix:** Either calculate actual gross profit (revenue minus commissions/referrals) or remove/rename the field to avoid misinterpretation.

### C3. Subscription cost calculation does not cap to year end for historical years

`ProfitLossCard` lines 62-76 calculate subscription costs using `now` as the end point. For historical years (e.g., viewing 2025 while it's 2026), `monthsElapsed` is calculated as months from Jan 2025 to Feb 2026 = 14. This overstates subscription costs by 2 months for a past year.

**Fix:** Cap `now` to `min(now, yearEnd)` where `yearEnd = new Date(year, 11, 31)`.

### C4. VAT Reserve card hardcodes "Owed to Belastingdienst" for all entities

`CashFlowProjection.tsx` line 92: "Owed to Belastingdienst" is shown regardless of entity. For Dubai, the authority is FTA (Federal Tax Authority). The `VATLiabilityCard` correctly uses entity-aware labels, but the cash flow card does not.

### C5. No audit trail for commission or expense mutations

`useFinancialAuditLog` was integrated into `AddPlacementFeeDialog` and `PlacementFeesTable` (good). But commission creation, commission approval, expense creation, and subscription changes have no audit logging. The `EmployeeCommissionsTable` and any expense forms write to the database without calling `logAction`.

---

## CATEGORY D: Missing Controls a CFO Would Require

### D1. No approval workflow for expenses or commissions
Anyone with admin access can create expenses and commissions directly. There is no maker-checker separation. For a 0.1% CFO, any financial mutation above a threshold should require a second approval.

### D2. No period-close / freeze mechanism
There is no way to "close" a financial period (month/quarter). Data for past periods can be freely modified, which makes reconciliation unstable.

### D3. No budget vs actual for entity-level or category-level
`subscription_budgets` table exists but there is no visible budget-vs-actual comparison at the entity or expense category level.

---

## Scoring Breakdown

| Category | Max | Score | Notes |
|---|---|---|---|
| Revenue accuracy | 20 | 17 | Metrics match invoices exactly (0 discrepancy). -3 for one remaining `/1.21` hardcode and wrong tooltip. |
| Multi-entity correctness | 15 | 6 | P&L revenue filters by entity but expenses do not. Cash flow ignores entity entirely. Export ignores entity. |
| Data completeness | 15 | 8 | Fees populated with candidate_id (good). But 0 partner invoices, 0 reconciliation between fees and MB invoices. |
| Calculation accuracy | 15 | 12 | VAT centralized (good). But subscription cost overcount for past years, gross_profit = total_paid. |
| Code quality | 10 | 7 | One `/1.21` hardcode remains. 3 inline formatCurrency. AED not in SupportedCurrency. |
| Audit/compliance | 10 | 4 | Audit log on fees (good). Missing on commissions, expenses. No period close. No approval workflow. |
| Reconciliation | 10 | 5 | ReconciliationAlert exists but compares wrong tables. No fee-to-MB-invoice matching. |
| Controls | 5 | 3 | No maker-checker. No threshold approvals. No period freeze. |
| **Total** | **100** | **62** | |

---

## Master Plan to 100/100

### Phase 1: Fix the remaining wrong numbers (Priority: Immediate, 4 changes)

1. **MoneybirdInvoicesTable.tsx line 62**: Replace `/ 1.21` with `grossToNet(Number(invoice.total_amount))`.
2. **RevenueSummaryCards**: Accept `legalEntity` prop. Change tooltip from hardcoded "21% BTW" to entity-aware label.
3. **ProfitLossCard.usePLData**: Filter `employee_commissions`, `operating_expenses`, and `vendor_subscriptions` by `legal_entity` when entity is not 'all'.
4. **FinancialDashboard.plData** (export query, lines 57-103): Apply `legalEntity` filter to the `moneybird_sales_invoices` query.

### Phase 2: Thread entity through cash flow (Priority: High, 2 changes)

5. **CashFlowProjection**: Accept `legalEntity` prop. Pass to `useRevenueForecasting`.
6. **useRevenueForecasting**: Accept `legalEntity` param. Add `.eq('legal_entity', legalEntity)` to `moneybird_sales_invoices` and `placement_fees` queries when applicable.

### Phase 3: Fix calculation bugs (Priority: High, 2 changes)

7. **ProfitLossCard subscription calculation**: Cap `now` to `min(now, new Date(year, 11, 31))` to prevent overcounting for historical years.
8. **Edge function `gross_profit`**: Change from `totalPaid` to `totalRevenue - totalCommissions` or remove/rename the field.

### Phase 4: Code quality (Priority: Medium, 3 changes)

9. **Add `AED` to `SupportedCurrency`** in `src/lib/currency.ts`. Add `AED: 'ar-AE'` to the locale map.
10. **Replace 3 inline `formatCurrency`** in `RevenueSummaryCards`, `MoneybirdInvoicesTable`, and `PlacementFeesTable` with imports from `src/lib/currency.ts`.
11. **Fix CashFlowProjection "Belastingdienst" label**: Make entity-aware.

### Phase 5: Reconciliation and alerts (Priority: Medium, 2 changes)

12. **Create `UninvoicedFeesAlert`**: A component that warns when placement fees older than 14 days have no linked invoice. Display prominently on the dashboard.
13. **Enhance `ReconciliationAlert`**: Cross-reference `placement_fees` amounts against `moneybird_sales_invoices` by company name and approximate amount. Flag unmatched items.

### Phase 6: Audit trail completion (Priority: Standard, 2 changes)

14. **Add audit logging to commission mutations**: Commission creation, approval, and payment status changes.
15. **Add audit logging to expense creation**: Operating expense and subscription create/update.

### Phase 7: Financial controls (Priority: Future, 3 changes)

16. **Period close mechanism**: Add a `financial_periods` table with `status: open | closed`. Prevent mutations to closed periods.
17. **FX rate recording**: Add `fx_rate_used` column to `placement_fees`. Store rate at creation.
18. **Budget vs actual dashboard**: Build entity-level and category-level budget comparison view using existing `subscription_budgets` table.

### Implementation order (strict sequence)

Phases 1-3 can be done in a single implementation pass (all are code-only, no migrations needed except Phase 3 item 8 which is an edge function update).

Phase 4 is purely cosmetic/quality.

Phases 5-7 require new components and possibly new tables.

### Expected score after Phase 1-4: ~85/100
### Expected score after Phase 1-6: ~95/100
### Expected score after all phases: 100/100
