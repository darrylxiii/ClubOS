
# Moneybird + Closing System Sync: Full Audit

## Current Score: 30/100

## What Exists Today

### Building Blocks (working in isolation):
1. **`moneybird-create-invoice` edge function** -- Can create a draft invoice in Moneybird given a `partnerInvoiceId`, `companyId`, `amount`, `description`. Creates contacts automatically. Stores sync record in `moneybird_invoice_sync`.
2. **`moneybird-sync-invoice-status` edge function** -- Can poll Moneybird for status changes, marks `partner_invoices` as paid when Moneybird shows paid.
3. **`moneybird-webhook` edge function** -- Receives real-time payment events from Moneybird, updates `partner_invoices.status = 'paid'`, auto-approves referral payouts.
4. **`automate-placement-fee` edge function** -- Creates a `placement_fees` record AND auto-calls `moneybird-create-invoice`. BUT it expects a `partnerInvoiceId`, which doesn't exist at that point.
5. **Database trigger `auto_generate_placement_fee`** -- Creates `placement_fees` row when application goes to "hired". Does NOT create any invoice.
6. **`JobClosureDialog`** -- The UI for closing roles. Sets application to "hired", which fires the trigger. Does NOT call `automate-placement-fee` or any Moneybird function.

### The Disconnect (why it scores 30/100):

```text
JobClosureDialog
    |
    v
application.status = 'hired'
    |
    v
[trigger] auto_generate_placement_fee
    |
    v
placement_fees row created (status: 'pending')
    |
    v
NOTHING HAPPENS  <-- No invoice, no Moneybird draft, no partner_invoice
```

The `automate-placement-fee` edge function exists but is NEVER CALLED from the closure flow. The `moneybird-create-invoice` function expects a `partnerInvoiceId` (FK to `partner_invoices`), but `partner_invoices` has no `placement_fee_id` column -- there's no link between placement fees and partner invoices.

The webhook and polling sync exist but have nothing to sync because no invoices are ever created during closure.

---

## Issues Found

| # | Issue | Severity | Where |
|---|---|---|---|
| 1 | **JobClosureDialog never triggers Moneybird invoice creation** -- placement fees sit at "pending" forever | Critical | `JobClosureDialog.tsx` |
| 2 | **No `partner_invoices` row is created during closure** -- the `moneybird-create-invoice` function requires a `partnerInvoiceId` that never gets created | Critical | Missing link |
| 3 | **`partner_invoices` has no `placement_fee_id` column** -- no FK relationship between the two entities | Critical | Database schema |
| 4 | **`automate-placement-fee` is never called** -- it has Moneybird integration but nobody invokes it | High | Dead code path |
| 5 | **Payment status never flows back** -- even if an invoice existed, `moneybird-sync-invoice-status` only updates `partner_invoices` (not `placement_fees`) | High | `moneybird-sync-invoice-status` |
| 6 | **Webhook payment handler references `partner_invoices.placement_fee_id`** which doesn't exist on the table | High | `moneybird-webhook/index.ts` line 125 |
| 7 | **Duplicate placement fee creation risk** -- trigger creates one, `automate-placement-fee` would create another if ever called | Medium | Trigger + edge function |
| 8 | **No idempotency check** on `moneybird-create-invoice` -- could create duplicate Moneybird drafts | Medium | `moneybird-create-invoice` |
| 9 | **`moneybird-sync-invoice-status` only updates `partner_invoices.status`** to 'paid' but never updates `placement_fees.status` | Medium | `moneybird-sync-invoice-status` |
| 10 | **No scheduled sync** -- `moneybird-sync-invoice-status` exists but is only callable manually, not on a cron | Low | Missing cron |

---

## All Flows That Should Work

### Flow 1: Happy Path (Hire -> Invoice -> Payment)
```text
Close role as "hired"
  -> placement_fee created (trigger)
  -> partner_invoice created automatically
  -> Moneybird draft invoice created via API
  -> placement_fee.status = 'invoiced'
  -> Client pays in Moneybird
  -> Webhook fires OR polling picks it up
  -> partner_invoice.status = 'paid', paid_at set
  -> placement_fee.status = 'paid'
  -> Referral payouts auto-approved
```

### Flow 2: Moneybird Already Has a Draft (manual creation)
```text
Close role as "hired"
  -> Check if Moneybird invoice already exists for this company/amount
  -> If yes: link it, skip creation
  -> If no: create new draft
```

### Flow 3: Failed Moneybird API (non-blocking)
```text
Close role as "hired"
  -> placement_fee created
  -> partner_invoice created
  -> Moneybird API call fails
  -> placement_fee stays 'pending', logs error
  -> Admin can retry from finance dashboard
```

### Flow 4: Partial Payment
```text
Moneybird reports 'late' or partial status
  -> partner_invoice stays 'sent'/'overdue'
  -> placement_fee stays 'invoiced'
  -> Dashboard shows aging
```

### Flow 5: Invoice Cancelled/Credited
```text
Moneybird reports 'uncollectible'
  -> partner_invoice.status = 'cancelled'
  -> placement_fee.status = 'cancelled'
```

---

## Plan to Reach 100/100

### Step 1: Database Migration -- Add `placement_fee_id` to `partner_invoices`

Add a nullable FK column `placement_fee_id UUID REFERENCES placement_fees(id)` to `partner_invoices`. This links the two entities so payment status can flow from Moneybird -> partner_invoice -> placement_fee.

### Step 2: Create `create-placement-invoice` Edge Function

A new focused edge function that:
1. Accepts a `placement_fee_id`
2. Looks up the placement fee, job, company, and candidate details
3. Creates a `partner_invoices` row (invoice_number auto-generated, amount = fee_amount, company = partner_company_id)
4. Calls `moneybird-create-invoice` internally to create the Moneybird draft
5. Updates `placement_fees.invoice_id` to point to the new partner_invoice
6. Updates `placement_fees.status` to 'invoiced'
7. Has idempotency: if `placement_fees.invoice_id` is already set, returns existing invoice instead of creating a duplicate
8. Non-blocking on Moneybird failure: partner_invoice is created even if Moneybird API fails

### Step 3: Wire `JobClosureDialog` to Call the New Function

After the application is set to "hired" and the trigger creates the placement fee:
1. Query the newly created `placement_fees` row for this application
2. Call `create-placement-invoice` with that placement_fee_id
3. Show a toast: "Placement fee recorded. Invoice draft created in Moneybird." or "Placement fee recorded. Invoice will be synced to Moneybird shortly." on failure
4. This is fire-and-forget (non-blocking) -- the hire is already committed

### Step 4: Fix `moneybird-sync-invoice-status` to Update `placement_fees`

When a Moneybird invoice status changes to 'paid':
1. Update `partner_invoices.status = 'paid'` (already works)
2. Also update `placement_fees.status = 'paid'` via the new `placement_fee_id` FK
3. Same for 'uncollectible' -> 'cancelled'

### Step 5: Fix `moneybird-webhook` to Use the FK

The webhook handler at line 125 does `invoice.placement_fee_id` which doesn't exist. Fix it to join through the new FK:
```text
partner_invoices.placement_fee_id -> placement_fees.id
```

### Step 6: Add Cron for Polling Sync

Add a pg_cron schedule (every 6 hours) to call `moneybird-sync-invoice-status` as a fallback for missed webhooks. This ensures payment status eventually syncs even if the webhook fails.

### Step 7: Deprecate `automate-placement-fee`

This edge function is never called and duplicates logic that now lives in the trigger + the new `create-placement-invoice` function. Mark it as deprecated (or delete it) to avoid confusion.

---

## Implementation Order

1. **Database migration**: Add `placement_fee_id` to `partner_invoices`
2. **New edge function**: `create-placement-invoice` (the orchestrator)
3. **Edit `JobClosureDialog.tsx`**: Call the new function after hire completes
4. **Edit `moneybird-sync-invoice-status`**: Also update `placement_fees.status` via FK
5. **Edit `moneybird-webhook`**: Fix the `placement_fee_id` lookup to use FK
6. **Add cron**: Schedule `moneybird-sync-invoice-status` every 6 hours
7. **Clean up**: Deprecate `automate-placement-fee`

## After These Fixes: 100/100

- Every hire automatically creates a Moneybird draft invoice
- Payment status flows back: Moneybird paid -> partner_invoice paid -> placement_fee paid
- Referral payouts auto-approve on payment
- Webhook provides real-time updates, polling provides fallback
- Duplicate invoices prevented via idempotency checks
- Moneybird failures are non-blocking (hire always succeeds)
- Clean data model with proper FK relationships
