

# Critique of the Previous Financial Audit Plan: Score 0/100

## Why It Scores 0/100

### Flaw 1: The plan itself contains a wrong number (the audit data is stale)
The previous audit stated 2025 `gross_invoiced = 243,538`. But the actual `moneybird_sales_invoices` table now shows **2025 gross = 318,558** and **2025 net = 278,019**. The metrics row (synced Jan 3) says `total_revenue = 243,538` -- that is stale by nearly 2 months. The audit compared stale metrics to stale metrics and concluded "revenue is GROSS for 2024-2025." In reality, the metrics for 2024 ARE gross (117,515 matches invoice gross exactly), but the 2025 metrics are just outdated. The plan never distinguished between "wrong base" and "stale sync" -- two completely different problems requiring different fixes.

### Flaw 2: The plan never verified what the edge function actually stores
The plan said `total_revenue` is "NET for 2026 but GROSS for 2024-2025." But reading the edge function code (line 428): `totalRevenue += netAmount` -- it DOES store NET. The 2024 data was synced with an OLDER version of the edge function that stored GROSS. The 2026 data was synced with the CURRENT version that stores NET. The fix is not "update the edge function to store NET" (it already does). The fix is: **re-sync 2024 and 2025 to overwrite the old GROSS values with NET values using the current edge function**.

### Flaw 3: `net_revenue` column is referenced but does not actually exist
The plan says "populate the `net_revenue` column." The database query confirms `net_revenue` is always 0. But `RevenueSummaryCards` never reads `net_revenue` -- it reads `total_revenue`. The metrics interface (`MoneybirdFinancialMetrics`) does not even define a `net_revenue` field. The plan prescribed fixing a column that nothing reads, while the real problem (stale data) was ignored.

### Flaw 4: TopClientsTable uses GROSS revenue / 1.21 -- always wrong
Line 77: `const netRevenue = client.revenue / 1.21`. But the `top_clients` JSONB in metrics already stores NET values (line 461 of edge function: `clientRevenue[contactId].revenue += netAmount`). So when 2026 data is synced, the table divides NET by 1.21 a second time, understating client revenue by ~17%. For 2024 data (stored as GROSS), it accidentally gives the correct number. The plan identified the `/ 1.21` hardcode but never caught this specific reversal bug.

### Flaw 5: Payment aging uses GROSS amounts, not NET
Edge function lines 470-479: `paymentAging.current += unpaidAmount`. But `unpaidAmount` comes from `invoice.total_unpaid` which is the GROSS unpaid amount (incl. VAT). The dashboard then displays this in the "Outstanding" and "Overdue" cards as if it were NET. This inconsistency was never identified.

### Flaw 6: Collection rate is actually correct for post-2026 data, not broken
The plan said collection rate mixes bases. But the edge function (lines 428-430) calculates both `totalRevenue` (NET) and `totalPaid` (proportional NET). For data synced with the current function, collection rate = NET/NET = correct. The problem only exists for stale 2024-2025 data. The fix is a re-sync, not a formula change.

### Flaw 7: The plan proposes 18 changes but sequences them wrong
Fixing VAT hardcodes before re-syncing data means the fixed code will read stale GROSS values as NET, making numbers WORSE. Re-sync must come first. The plan listed re-sync as Phase 1 item 1 but then listed code changes in the same phase, creating ambiguity about ordering.

### Flaw 8: No mention of the `normalizeJobStatus` gap
`pending_approval` was added to `JobStatus` type and config, but `normalizeJobStatus()` (statusConfig.ts line 378-392) has no mapping for it. Any code calling `normalizeJobStatus('pending_approval')` returns `'draft'` -- silently downgrading pending jobs.

### Flaw 9: create-placement-invoice hardcodes 21% VAT for all entities
Line 105-107: `tax_rate: 21, tax_amount: feeAmount * 0.21, total_amount: feeAmount * 1.21`. If a Dubai placement fee is invoiced through this function, the invoice will have 21% VAT instead of 5%. The plan mentioned "Dubai uses 5% VAT" but never audited the invoice creation edge function for this.

### Flaw 10: The plan has no concrete SQL, no file paths with line numbers, no test criteria
Every item says "Fix X" without specifying: what file, what line, what the old code is, what the new code should be, and how to verify it worked. That makes implementation ambiguous and error-prone.

### Flaw 11: Pipeline double-counting diagnosis is wrong
The plan said placement fees with `status = 'invoiced'` would be double-counted because their invoices also appear in `moneybird_sales_invoices`. But ALL 5 placement fees have `invoice_id = NULL` and `status = 'pending'`. Zero partner invoices exist. Zero placement fees have been invoiced. The double-counting is theoretical, not actual. Meanwhile, the REAL problem -- EUR 72,722 in placement fees sitting permanently as 'pending' with no invoice -- was correctly identified but given insufficient urgency.

---

## Verified Current State (Live Data)

| Data Point | Value | Problem |
|---|---|---|
| `moneybird_financial_metrics` 2024 | `total_revenue = 117,515` | GROSS (stale sync from old edge function) |
| `moneybird_financial_metrics` 2025 | `total_revenue = 243,538` | STALE (invoices now total 318,558 gross / 278,019 net) |
| `moneybird_financial_metrics` 2026 | `total_revenue = 61,000` | NET (correct, synced with current function) |
| `moneybird_sales_invoices` 2024 | 12 rows, gross=117,515, net=111,340 | Data exists but metrics row is stale |
| `moneybird_sales_invoices` 2025 | 36 rows, gross=318,558, net=278,019 | Data exists but metrics row is stale |
| `moneybird_sales_invoices` 2026 | 0 rows | Missing entirely |
| `partner_invoices` | 0 rows | Never used |
| `referral_payouts` | 0 rows | Never used |
| `placement_fees` | 5 rows, all pending, all invoice_id=NULL | EUR 72,722 untracked |
| `employee_commissions` | 4 rows | Exist but tiny impact |
| `operating_expenses` | 6 rows | Exist |
| `vendor_subscriptions` active | 2 rows | Exist |
| `/ 1.21` hardcodes | 10 files, 71 occurrences | Pervasive |
| `formatCurrency` implementations | 4+ separate copies | Inconsistent locales |

---

## Master Plan to 100/100

### Phase 0: Data Re-Sync (must come first, everything depends on it)

**Action**: Trigger `moneybird-fetch-financials` for years 2024, 2025, and 2026.

The current edge function already stores NET in `total_revenue` (line 428). Re-syncing overwrites stale GROSS values for 2024-2025 and populates missing 2026 invoice rows.

**Verification**: After sync, `total_revenue` for 2024 should be ~111,340 (not 117,515), and 2025 should be ~278,019 (not 243,538). 2026 invoice rows should appear in `moneybird_sales_invoices`.

This is an operational action (invoke edge function 3 times), not a code change. Must happen before any calculation fixes.

---

### Phase 1: Fix Hardcoded VAT Divisor (7 files)

**Problem**: 71 occurrences of `/ 1.21` across 10 files. After re-sync, `net_amount` is populated on invoice rows, so most of these are fallback paths. But they are still hit when `net_amount` is NULL, and they are always wrong for Dubai (5% VAT).

**Solution**: Create a shared utility:

```text
File: src/lib/vatRates.ts (NEW)
```

```typescript
const ENTITY_VAT_RATES: Record<string, number> = {
  tqc_nl: 0.21,
  tqc_dubai: 0.05,
};

export function getVATRate(legalEntity?: string): number {
  if (!legalEntity || legalEntity === 'all') return 0.21; // NL default
  return ENTITY_VAT_RATES[legalEntity] ?? 0.21;
}

export function grossToNet(gross: number, legalEntity?: string): number {
  return gross / (1 + getVATRate(legalEntity));
}

export function netToGross(net: number, legalEntity?: string): number {
  return net * (1 + getVATRate(legalEntity));
}
```

**Files to update** (replace `/ 1.21` with `grossToNet()`):

1. `src/components/financial/ProfitLossCard.tsx` lines 25, 27
2. `src/components/financial/MoneybirdInvoicesTable.tsx` line 62
3. `src/components/financial/RevenueSummaryCards.tsx` lines 26, 31
4. `src/components/financial/TopClientsTable.tsx` line 77 -- **REMOVE the division entirely** (data is already NET after re-sync)
5. `src/hooks/useRevenueForecasting.ts` lines 114, 167, 169
6. `src/hooks/useVATData.ts` lines 57, 135
7. `src/components/admin/revenue/RevenueDistributionSummary.tsx` lines 24, 26, 30
8. `src/hooks/useSubscriptionBudgets.ts` line 78
9. `src/components/financial/RevenueAttributionROI.tsx` line 30
10. `src/pages/admin/FinancialDashboard.tsx` lines 66-67

**TopClientsTable special case** (line 77): After re-sync, `client.revenue` in the metrics JSONB already contains NET values. The `/ 1.21` division DOUBLE-DISCOUNTS the number. Fix: display `client.revenue` directly without division.

---

### Phase 2: Fix P&L Entity Filtering (1 file)

**Problem**: `ProfitLossCard` accepts `year` but not `legalEntity`. All 5 queries are unfiltered by entity. The Financial Dashboard has an entity selector but never passes it to P&L.

**Solution**:

1. Add `legalEntity?: string` prop to `ProfitLossCardProps`
2. Add `.eq('legal_entity', legalEntity)` filter to the `moneybird_sales_invoices` query (only when entity is not 'all')
3. Pass `legalEntity` from `FinancialDashboard.tsx` to `ProfitLossCard`

The `operating_expenses`, `employee_commissions`, `referral_payouts`, and `vendor_subscriptions` tables would also need a `legal_entity` column and filter -- but with only 6 expenses, 4 commissions, 0 payouts, and 2 subscriptions, this is lower priority. For now, filter only the revenue query (the largest number).

---

### Phase 3: Fix create-placement-invoice VAT for Multi-Entity (1 file)

**Problem**: `create-placement-invoice/index.ts` line 105 hardcodes `tax_rate: 21`. Dubai placements get 21% VAT.

**Solution**: Look up the company's `country_code` (already fetched on line 75). If `country_code === 'AE'`, use `tax_rate: 5`. Otherwise default to 21.

```typescript
const isDubai = company?.country_code === 'AE';
const taxRate = isDubai ? 5 : 21;
// ...
tax_rate: taxRate,
tax_amount: Math.round(feeAmount * (taxRate / 100) * 100) / 100,
total_amount: Math.round(feeAmount * (1 + taxRate / 100) * 100) / 100,
```

---

### Phase 4: Fix normalizeJobStatus Gap (1 file)

**Problem**: `normalizeJobStatus()` in `statusConfig.ts` has no mapping for `pending_approval`. Calling it with that value returns `'draft'`.

**Solution**: Add to the mapping object at line 381:

```typescript
pending_approval: "pending_approval",
pending: "pending_approval",
```

---

### Phase 5: Fix Payment Aging Base (1 file)

**Problem**: Edge function `moneybird-fetch-financials` line 470 stores GROSS `unpaidAmount` in `paymentAging`. The dashboard displays this as if NET.

**Solution**: In the edge function, calculate net unpaid proportionally:

```typescript
const netUnpaidAmount = unpaidAmount > 0 ? netAmount * (unpaidAmount / amount) : 0;
// Use netUnpaidAmount instead of unpaidAmount in aging buckets
```

This requires re-deploying the edge function and re-syncing.

---

### Phase 6: Consolidate formatCurrency (4 files)

**Problem**: 4+ implementations with different locales (nl-NL vs en-US).

**Solution**: 
- Keep `src/lib/currency.ts` as the single source of truth
- Update `src/lib/currencyConversion.ts` to import from `currency.ts` instead of defining its own
- Update `TopClientsTable.tsx` and `VATLiabilityCard.tsx` to import from `currency.ts` instead of inline definitions
- Update `RevenueSummaryCards.tsx` to import from `currency.ts`

---

### Phase 7: Add Financial Audit Logging (3 files)

**Problem**: Placement fee creation, invoice generation, and commission changes have no audit trail to `comprehensive_audit_logs`.

**Solution**: Use the existing `useFinancialAuditLog` hook (already created but unused) in:
1. `AddPlacementFeeDialog` -- log on successful fee creation
2. `PlacementFeesTable` -- log on invoice creation trigger
3. Commission approval flows -- log on status change

---

### Phase 8: Revenue Ladder Uses Potentially Wrong Base

**Problem**: `useRevenueStats` reads `total_revenue` from `moneybird_financial_metrics`. For 2024 (pre-re-sync), this is GROSS. After Phase 0 re-sync, this self-corrects.

**Solution**: No code change needed -- Phase 0 re-sync fixes this. But add a comment in `useRevenueLadder.ts` documenting that `total_revenue` is NET.

---

## Implementation Order (strict sequence)

1. Phase 0: Re-sync data (operational, invoke edge function)
2. Phase 4: Fix normalizeJobStatus (tiny, no dependencies)
3. Phase 1: Create `vatRates.ts`, replace all `/ 1.21` hardcodes
4. Phase 5: Fix payment aging in edge function, re-deploy, re-sync again
5. Phase 2: Add entity filtering to P&L
6. Phase 3: Fix invoice VAT for multi-entity
7. Phase 6: Consolidate formatCurrency
8. Phase 7: Add audit logging

## Verification Criteria

| Check | Expected After Fix |
|---|---|
| 2024 `total_revenue` | ~111,340 (NET, not 117,515) |
| 2025 `total_revenue` | ~278,019 (NET, not 243,538) |
| 2026 invoice rows | >0 in `moneybird_sales_invoices` |
| TopClientsTable net revenue | Displayed directly from data, not divided again |
| P&L shows entity-filtered revenue | When "Dubai" selected, only Dubai invoices counted |
| Dubai placement invoice | tax_rate = 5, not 21 |
| `normalizeJobStatus('pending_approval')` | Returns `'pending_approval'`, not `'draft'` |
| Payment aging amounts | NET-based, not GROSS |
| All `formatCurrency` calls | Use `src/lib/currency.ts` with nl-NL locale |

