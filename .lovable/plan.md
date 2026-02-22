
# Finance Dashboard: Critical Audit and Fix Plan

## Current Score: 25/100

This is LOWER than the previous estimate of 35/100 because deeper inspection reveals compounding errors that make the dashboard actively misleading -- not just empty.

---

## Critical Issues Found

### Issue 1: `verify_jwt = true` blocks ALL Moneybird syncs (STILL BROKEN)
- **Where:** `supabase/config.toml` line 1042
- **Impact:** The `moneybird-fetch-financials` function returns 401 on every call. The auto-sync hook fires on every dashboard load, fails, and shows "Edge Function not available" toast. Data is 47 days stale.
- **Also affected:** `sync-company-revenue` (line 1044), `reconcile-invoices` (line 1047), `calculate-recruiter-commissions` (line 1050), `backfill-placement-fees` (line 1053), `automate-placement-fee` (line 1059) -- ALL have `verify_jwt = true` and are therefore broken on Lovable Cloud.

### Issue 2: RevenueSummaryCards strips VAT TWICE (data displays wrong numbers)
- **Where:** `RevenueSummaryCards.tsx` lines 22-28
- **What happens:** The edge function `moneybird-fetch-financials` already stores NET amounts (after dividing by 1.21) in `total_revenue`. But `RevenueSummaryCards` divides by 1.21 AGAIN:
  ```
  const grossRevenue = metrics?.total_revenue || 0;  // This is already NET
  const netRevenue = Math.round(grossRevenue / 1.21 * 100) / 100;  // Double-stripped
  ```
- **Result:** Revenue shows ~17% less than actual. For 2025 data: real net is ~243k, displayed as ~201k.
- **Same bug for `total_paid`:** collected amount also double-stripped.

### Issue 3: Zero partner_invoices exist
- **Database:** `partner_invoices` table is completely empty (0 rows).
- **Impact:** The "Partner Invoices" tab shows nothing. `CashFlowPipeline` has no data. The `moneybird-sync-invoice-status` function has nothing to sync. The `moneybird-webhook` has nothing to match against.

### Issue 4: Zero moneybird_invoice_sync records
- **Database:** Empty table. No Moneybird drafts have ever been created through the system.
- **Impact:** Even when `moneybird-sync-invoice-status` runs, it finds 0 records to check.

### Issue 5: All 3 placement fees stuck at "pending" with no invoice
- **Database:** 3 placement fees (EUR 16k, 15k, 26k = 57k total) all have `invoice_id: null` and `status: pending`.
- **Impact:** No revenue is tracked as invoiced or collected. Cash flow pipeline shows everything in "Pending."

### Issue 6: Strategists blocked by RLS on Moneybird tables
- **Policies:** `moneybird_financial_metrics` and `moneybird_sales_invoices` only allow `admin` and `super_admin`. But `FinanceHub` is accessible to strategists via `RoleGate allowedRoles={['admin', 'strategist']}`.
- **Impact:** Strategists see blank dashboard -- zero data, no error message.

### Issue 7: CORS headers incomplete on ALL Moneybird edge functions
- **Where:** All 5 Moneybird functions use minimal headers:
  ```
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
  ```
- **Missing:** `x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version`
- **Impact:** Preflight failures on Lovable Cloud's Supabase client.

### Issue 8: PlacementFeesTable "Generate Invoice" button does NOT call Moneybird
- **Where:** `PlacementFeesTable.tsx` lines 77-94
- **What it does:** Opens `InvoiceGenerator` which inserts `partner_invoices` rows directly via client-side Supabase insert -- completely bypassing the `create-placement-invoice` edge function and Moneybird integration.
- **Impact:** Even if someone clicks "Generate Invoice," no Moneybird draft is created.

### Issue 9: No per-fee "Generate Invoice" action
- **Where:** `PlacementFeesTable.tsx` line 212-218
- **What it shows:** "View Invoice" button (does nothing actionable) or a dash "-" for fees without invoices. No way to trigger invoice creation for a single fee.

### Issue 10: `usePartnerInvoices` has no year filter
- **Where:** `useFinancialData.ts` line 101-119
- **Impact:** The "Partner Invoices" tab fetches ALL invoices regardless of the selected year, unlike placement fees which respect the year selector.

### Issue 11: `moneybird_financial_metrics` 2025 row has stale schema
- **Database:** The 2025 row has `total_revenue_gross: 0`, `vat_amount: 0`, `net_revenue: 0` because it was synced on Jan 3 before these columns were properly populated. The `total_revenue` field contains 243,538.52 which is NET (excl. VAT), but `RevenueSummaryCards` treats it as GROSS.
- **Impact:** Even after fixing the double-VAT issue, the stored gross/vat fields are wrong until a re-sync.

### Issue 12: `moneybird_sales_invoices` has `net_amount` column with wrong data
- **Database:** 49 invoices stored. The `late` category shows `net_total: 64,292` but `total: 42,742` -- meaning net is HIGHER than gross, which is impossible. The `net_amount` was calculated as `total_price_excl_tax || amount / 1.21` but for some invoices, Moneybird's `total_price_excl_tax` includes or excludes VAT inconsistently.

---

## Fix Plan to 100/100

### Fix 1: Unblock ALL edge functions (config.toml)
Set `verify_jwt = false` for every function that currently has `verify_jwt = true`:
- `moneybird-fetch-financials`
- `sync-company-revenue`
- `reconcile-invoices`
- `calculate-recruiter-commissions`
- `backfill-placement-fees`
- `automate-placement-fee`

### Fix 2: Fix CORS headers on ALL Moneybird edge functions
Update the `corsHeaders` constant in these 5 files:
- `moneybird-fetch-financials/index.ts`
- `moneybird-sync-invoice-status/index.ts`
- `moneybird-create-invoice/index.ts`
- `moneybird-webhook/index.ts`
- `create-placement-invoice/index.ts`

New value:
```
'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version'
```

### Fix 3: Fix double-VAT in RevenueSummaryCards
The edge function already stores NET values in `total_revenue` and `total_paid`. The component must display them directly instead of dividing by 1.21 again. Also use `total_revenue_gross` and `vat_amount` fields when available for the tooltip.

### Fix 4: Add strategist SELECT policies on financial tables
Database migration to add RLS policies:
- `moneybird_financial_metrics`: SELECT for strategist role
- `moneybird_sales_invoices`: SELECT for strategist role

### Fix 5: Add per-fee "Create Invoice" button to PlacementFeesTable
For each fee with `status: 'pending'` and no `invoice_id`:
- Show a "Create Invoice" button that calls the `create-placement-invoice` edge function with the fee's ID.
- On success, invalidate queries and show toast with invoice number.
- Replace the broken bulk `InvoiceGenerator` button with this per-fee approach (or keep bulk but wire it to call the edge function for each fee).

### Fix 6: Join partner_invoices in usePlacementFeesWithContext
Update the query to also select `partner_invoices` via the `invoice_id` FK so the table can display the invoice number, status, and Moneybird link instead of raw UUIDs.

### Fix 7: Add year filter to usePartnerInvoices
Add an optional `year` parameter and filter by `invoice_date` to match the year selector behavior of other financial queries.

### Fix 8: Add error/empty state to RevenueSummaryCards
When `metrics` is null (not loading, just absent), show a clear "No data synced" message with a manual "Sync Now" button instead of showing four cards with zero values.

---

## Implementation Order

1. `supabase/config.toml` -- set all `verify_jwt = false`
2. Database migration -- strategist RLS policies on moneybird tables
3. All 5 edge functions -- update CORS headers
4. `RevenueSummaryCards.tsx` -- remove double-VAT, use stored net values directly, add error state
5. `PlacementFeesTable.tsx` -- add per-fee "Create Invoice" button calling edge function
6. `usePlacementFeesWithContext.ts` -- join partner_invoices for invoice number/status
7. `useFinancialData.ts` -- add year filter to `usePartnerInvoices`

After deploying: the auto-sync will trigger on next dashboard load, re-sync all Moneybird data with correct gross/net/vat fields, and the dashboard will show accurate, current numbers. The 3 existing placement fees can then be individually invoiced via the new button.
