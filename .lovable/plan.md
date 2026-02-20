
# Multi-Currency Support for Expenses, Subscriptions & Revenue

## What You're Solving

You have monthly costs billed in USD (e.g., AWS, Figma, Vercel). The EUR amount you actually pay fluctuates each month with the exchange rate. The system currently ignores this — it stores and displays everything as if currency doesn't matter. This plan makes currency a first-class concept across all three financial areas: operating expenses, vendor subscriptions, and placement fees (revenue).

The key design decision: you told us you want to **choose when to lock in conversion rates** ("when we convert them ourselves"). So the system will let you record the original currency amount AND either let you set the EUR equivalent manually at the time of recording, or fetch the live rate as a starting point that you can override.

---

## Architecture: The EUR Snapshot Pattern

All financial aggregations (P&L, Profit card, Burn Rate) work in EUR. The cleanest approach — consistent with how `placement_fees` already handles this via `fee_amount_eur` — is the **EUR snapshot** pattern:

- Every expense/subscription stores: `amount` (original currency) + `currency` (e.g., USD) + `amount_eur` (EUR equivalent at time of recording).
- `amount_eur` is set when you record or manually convert the entry.
- All dashboards aggregate `amount_eur` for totals — so a $120 AWS bill recorded at 1.08 rate shows as €111, locked in forever.
- The live rate is shown as a suggestion in the form, but you always have the last word.

This is how `placement_fees.fee_amount_eur` already works — we're extending the same pattern to expenses and subscriptions.

---

## Database Changes (2 migrations)

### Migration 1: `operating_expenses` — add `amount_eur` column

The table already has a `currency` column (defaulting to `'EUR'`). What's missing is the EUR snapshot:

```sql
ALTER TABLE public.operating_expenses
  ADD COLUMN IF NOT EXISTS amount_eur numeric;

-- Backfill: existing rows are all EUR, so amount_eur = amount
UPDATE public.operating_expenses
  SET amount_eur = amount
  WHERE currency = 'EUR' OR currency IS NULL;
```

### Migration 2: `vendor_subscriptions` — add `monthly_cost_eur` column

The table already has `currency` (defaulting to `'EUR'`). Add the EUR equivalent for the monthly cost:

```sql
ALTER TABLE public.vendor_subscriptions
  ADD COLUMN IF NOT EXISTS monthly_cost_eur numeric;

-- Backfill: existing rows are all EUR
UPDATE public.vendor_subscriptions
  SET monthly_cost_eur = monthly_cost
  WHERE currency = 'EUR' OR currency IS NULL;
```

No data migration risk — existing rows are confirmed all EUR, so the backfill is safe.

---

## Frontend Changes

### 1. `ExpenseFormDialog.tsx` — Currency picker + EUR equivalent field

Currently the form has a hardcoded `currency: "EUR"` in the payload. Changes:

- Add a currency selector dropdown (EUR, USD, GBP, AED) next to the Amount field.
- When a non-EUR currency is selected, show a second field: "EUR Equivalent" — pre-filled with the live rate conversion as a suggestion, but fully editable.
- Show a small helper: "Rate used: 1 USD = €0.92 today. You can override this."
- When EUR is selected, `amount_eur` = `amount` automatically (no second field needed).
- Save both `amount`, `currency`, and `amount_eur` to the database.

```text
BEFORE:
  [Date]        [Amount (EUR)]

AFTER:
  [Date]    [Amount]  [Currency ▼ EUR/USD/GBP/AED]
  (if non-EUR) EUR Equivalent: [€ ___]  (pre-filled, editable)
               "Suggested rate: 1 USD = €0.917 · from live feed"
```

### 2. `AddVendorSubscriptionDialog.tsx` — Currency selector already exists; add EUR monthly cost field

The form already has a `currency` field with a text input. Replace it with a proper dropdown and add:
- "Monthly Cost (EUR)" field that appears when a non-EUR currency is selected.
- Same live-rate suggestion pattern as expenses.
- Save `monthly_cost_eur` alongside `monthly_cost` and `currency`.

### 3. `ExpenseTracking.tsx` (table display) — Show original + EUR

In the Expense Ledger table, the Amount column currently shows `formatCurrency(expense.amount)` — always EUR. Update to:
- Show original amount + currency badge: `$120 USD`
- Show EUR equivalent in muted text below: `≈ €111`
- In summary cards (YTD, Monthly Burn), always aggregate `amount_eur` instead of `amount`.

### 4. `RecurringExpensesPanel.tsx` — Use `amount_eur` for burn rate

The monthly burn calculation currently uses `e.amount` directly. Change to use `e.amount_eur` (or fall back to `e.amount` if null, for backwards compatibility with old entries).

### 5. `ProfitLossCard.tsx` and `FinancialDashboard.tsx` — Use `amount_eur` for P&L

Both files query `operating_expenses.amount` for total expenses and `vendor_subscriptions.monthly_cost` for subscription costs. Update both queries to select and aggregate `amount_eur` / `monthly_cost_eur` instead. This ensures the P&L is always EUR-accurate regardless of original currency.

### 6. `VendorSubscriptionsTable.tsx` — Show original + EUR cost

Similar to the expense table: show `$120/mo USD` with `≈ €111/mo` below it.

---

## Live Rate Suggestion (Frontend Only)

The existing `currencyConversion.ts` already has `updateExchangeRates()` which fetches from `api.exchangerate-api.com`. We'll use this to pre-fill the EUR equivalent in both forms. The flow:

1. User selects USD from currency dropdown.
2. System fetches the current live rate (already cached in localStorage).
3. Pre-fills EUR equivalent = `amount × (1 / USD_rate)`.
4. User can see and override the pre-filled EUR value before saving.
5. The locked-in `amount_eur` is what gets saved — not a floating conversion.

No new API keys needed. The free tier of `exchangerate-api.com` handles this.

---

## No Changes Needed To

- `placement_fees` table — already has `fee_amount_eur` and `currency_code`. Already working correctly.
- Revenue-side of P&L — Moneybird invoices are already in EUR.
- Auth or RLS — same policies apply; no new tables.
- Any edge functions — all currency math happens client-side in the form.

---

## Files to Create/Modify

### New file
- `src/hooks/useLiveFxRate.ts` — A small React hook that reads from the existing `currencyConversion.ts` cache and returns `{ rate, suggestedEur }` for the form fields.

### Modified files
1. `src/components/financial/ExpenseFormDialog.tsx` — Add currency selector + EUR equivalent field.
2. `src/components/financial/AddVendorSubscriptionDialog.tsx` — Replace currency text input with dropdown + EUR monthly cost field.
3. `src/pages/admin/ExpenseTracking.tsx` — Update summary aggregations to use `amount_eur`; update table display.
4. `src/components/financial/RecurringExpensesPanel.tsx` — Use `amount_eur` for burn rate totals.
5. `src/components/financial/ProfitLossCard.tsx` — Query and aggregate `amount_eur` and `monthly_cost_eur`.
6. `src/pages/admin/FinancialDashboard.tsx` — Same aggregate fix for the P&L export query.
7. `src/components/financial/VendorSubscriptionsTable.tsx` — Show original + EUR display.

### Database migrations (2)
1. Add `amount_eur` to `operating_expenses` + backfill EUR rows.
2. Add `monthly_cost_eur` to `vendor_subscriptions` + backfill EUR rows.

---

## Summary of User-Facing Changes

| Where | What changes |
|---|---|
| Add/Edit Expense form | Currency dropdown (EUR/USD/GBP/AED) + EUR equivalent field with live rate hint |
| Add/Edit Subscription form | Currency dropdown + EUR monthly cost field with live rate hint |
| Expense Ledger table | Shows original currency amount + EUR equivalent below |
| Subscription table | Shows original currency amount + EUR equivalent below |
| Recurring Burn Rate card | Aggregates EUR equivalents — correctly reflects what you actually pay in EUR |
| Profit & Loss card | All expense aggregations use EUR snapshots — accurate cross-currency P&L |

No new secrets, no new external dependencies, no schema renames (forward-compatible additions only).
