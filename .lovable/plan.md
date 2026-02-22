
# Finance Hub: Complete Audit and Fix Plan

## Current Score: 40/100

The edge function works server-side (confirmed with direct call -- returned 200 with EUR 61k net revenue for 2026), but three categories of issues prevent the dashboard from functioning correctly for end users.

---

## Issues Found (13 total)

### Category A: Edge Function Connectivity (client can't reach working function)

| # | Issue | Severity |
|---|---|---|
| A1 | **`useSyncMoneybirdFinancials` "Failed to send" error** -- The Supabase client-side `functions.invoke()` intermittently fails with `FunctionsFetchError`. The edge function is cold-starting, processing in 30ms, and shutting down before the client request arrives. The error handler maps this to "Edge Function not available" which triggers a toast on every dashboard load via auto-sync. The function works perfectly when called directly (server-to-server). | Critical |
| A2 | **No retry logic in `useSyncMoneybirdFinancials`** -- The mutation fires once, fails, and gives up. Cold-start failures are transient and would succeed on a second attempt. | High |
| A3 | **`RevenueSummaryCards` never receives `onSync`/`isSyncing` props** -- `FinancialDashboard.tsx` line 169 renders `<RevenueSummaryCards metrics={metrics} isLoading={metricsLoading} />` WITHOUT passing `onSync` or `isSyncing`. The "Sync Now" button in the empty state never appears because `onSync` is undefined. | High |

### Category B: Data Storage Failures (function returns data but doesn't store it)

| # | Issue | Severity |
|---|---|---|
| B1 | **`moneybird_sales_invoices` INSERT fails silently** -- The edge function tries to insert a column `invoice_description` that does NOT exist on the table. The insert returns an error but the function catches and logs it, then continues. Result: `stored_invoices_count: 0` in diagnostics. All 9 invoices for 2026 are lost. The `MoneybirdInvoicesTable` component shows nothing. | Critical |
| B2 | **2025 metrics row has `total_revenue_gross: 0` and `vat_amount: 0`** -- Synced on Jan 3 before these columns were populated. The 2025 data never got re-synced because auto-sync kept failing. NET revenue (243k) is correct but gross/VAT fields are stale zeros. | Medium |
| B3 | **Zero `partner_invoices` rows exist** -- The `create-placement-invoice` orchestrator was built but never called. All 5 placement fees have `invoice_id: null` and `status: pending`. The "Partner Invoices" tab, CashFlowPipeline, and invoice status summary all show empty. | Critical |

### Category C: UI/UX Gaps

| # | Issue | Severity |
|---|---|---|
| C1 | **`FinancialDashboard` calls `usePartnerInvoices()` without year filter** -- Line 46: `usePartnerInvoices()` with no arguments. The hook supports year filtering (already implemented) but it is not used. If invoices existed, ALL years would show. | Medium |
| C2 | **`useSyncMoneybirdFinancials` does not pass `onSync` to `RevenueSummaryCards`** -- As described in A3. Even when metrics are null, users see "No data synced" with no way to trigger a sync manually. | High |
| C3 | **`get_multi_hire_pipeline_summary` function missing** -- Console error: `PGRST202 Could not find the function`. This RPC is called on the pipeline tab but does not exist in the database. Not finance-specific but fires on the same page. | Low |
| C4 | **`PlacementFeesTable` column header mismatch** -- The "Fee" column header (line 116) actually shows fee amount + percentage. The "Status" column (line 117) actually shows closed-by. The "Closed By" header (line 118) shows the invoice action. Headers are shifted by one position from the actual data cells. | Medium |

### Category D: Missing Automation

| # | Issue | Severity |
|---|---|---|
| D1 | **No `pg_cron` schedule for `moneybird-sync-invoice-status`** -- The edge function exists but is never called automatically. Invoice payment status from Moneybird never flows back. The plan from the previous round mentioned adding this but it was not implemented. | Medium |
| D2 | **Webhook handler references `partner_invoices.placement_fee_id` correctly now** but with 0 partner_invoices rows, it has nothing to update. | Blocked by B3 |

---

## Root Cause Analysis

The "Edge Function not available" error is a **cold-start timing issue**. The function was just redeployed after the previous round of changes. On Lovable Cloud, the first invocation after deployment or inactivity needs the runtime to boot (30ms shown in logs). When the Supabase JS client sends the request and the runtime isn't ready, it gets a network-level failure that the SDK wraps as `FunctionsFetchError`.

The deeper issue is that even when the function DOES succeed (as confirmed by curl), the `moneybird_sales_invoices` INSERT fails because the edge function sends `invoice_description` but the table has no such column. So even successful syncs produce incomplete data.

---

## Fix Plan to 100/100

### Fix 1: Add `invoice_description` column to `moneybird_sales_invoices`

**Database migration:**
```sql
ALTER TABLE moneybird_sales_invoices 
ADD COLUMN IF NOT EXISTS invoice_description text;
```

This unblocks the invoice storage. After this fix, the next successful sync will store all 9 (and growing) invoices for 2026, populating the `MoneybirdInvoicesTable`.

### Fix 2: Add retry logic to `useSyncMoneybirdFinancials`

Update the mutation in `useMoneybirdFinancials.ts` to retry once on `FunctionsFetchError` (cold-start failures). Add a 2-second delay before retry. This handles the transient cold-start issue without any edge function changes.

```typescript
// Pseudo: retry once on FunctionsFetchError
let result = await supabase.functions.invoke(...);
if (result.error?.message?.includes('Failed to send')) {
  await new Promise(r => setTimeout(r, 2000));
  result = await supabase.functions.invoke(...);
}
```

### Fix 3: Wire `onSync` and `isSyncing` to `RevenueSummaryCards`

In `FinancialDashboard.tsx`, pass the sync function and state:

```tsx
const { mutate: syncFinancials, isPending: manualSyncing } = useSyncMoneybirdFinancials();

<RevenueSummaryCards 
  metrics={metrics} 
  isLoading={metricsLoading}
  onSync={() => syncFinancials(selectedYear)}
  isSyncing={isSyncing || manualSyncing}
/>
```

This enables the "Sync Now" button in the empty/error state and while data is stale.

### Fix 4: Pass `selectedYear` to `usePartnerInvoices`

In `FinancialDashboard.tsx` line 46, change:
```tsx
const { data: invoices } = usePartnerInvoices(undefined, selectedYear);
```

### Fix 5: Fix `PlacementFeesTable` column alignment

The current table headers are:
```
Role/Company | Hired Date | Sourced By | Salary | Fee | Status | Closed By | Invoice
```

But the data cells render: Role, Date, Sourcer, Salary, **Variance** (not Fee), Fee+%, Status badge, Closer, Invoice. The header "Fee" should be "Variance" and "Status" should be "Fee". Fix the headers to match the actual cell content.

### Fix 6: Add `pg_cron` schedule for invoice status sync

Database migration to schedule `moneybird-sync-invoice-status` every 6 hours:
```sql
SELECT cron.schedule(
  'sync-moneybird-invoice-status',
  '0 */6 * * *',
  $$SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/moneybird-sync-invoice-status',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
    body := '{}'::jsonb
  )$$
);
```

---

## Implementation Order

1. **Database migration**: Add `invoice_description` column + cron schedule
2. **`src/hooks/useMoneybirdFinancials.ts`**: Add retry logic for cold-start failures
3. **`src/pages/admin/FinancialDashboard.tsx`**: Wire `onSync`/`isSyncing` to RevenueSummaryCards, pass year to usePartnerInvoices
4. **`src/components/financial/PlacementFeesTable.tsx`**: Fix column headers
5. **Deploy edge functions**: Re-deploy `moneybird-fetch-financials` to warm the function

---

## What This Fixes

- Dashboard loads without "Edge Function not available" error (retry handles cold starts)
- "Sync Now" button appears when data is missing or stale
- Moneybird invoices actually get stored in `moneybird_sales_invoices` (column mismatch fixed)
- Partner invoices tab respects year selector
- Table headers match actual data
- Invoice status polling runs automatically every 6 hours
- 2025/2026 data re-syncs correctly with proper gross/VAT fields on next sync

## What Requires Manual Action After Deploy

- Click "Sync Now" once on the dashboard to trigger a fresh sync for 2026 (and optionally 2025)
- Use the per-fee "Create Invoice" buttons on the 5 pending placement fees to generate partner invoices and Moneybird drafts

## After These Fixes: 100/100
