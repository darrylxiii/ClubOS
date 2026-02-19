
# Multi-Currency Salaries and Office Revenue Assignment

## What This Does

1. **Multi-currency salary support**: When creating placement fees, admins can select the salary currency (EUR, USD, GBP, AED, etc.) instead of everything defaulting to EUR. The fee is stored in the original currency, with an EUR-equivalent calculated for consolidated reporting.
2. **Office assignment on placement fees**: Admins can assign each placement fee to Amsterdam or Dubai office. This leverages the existing `legal_entity` column, but makes it user-selectable instead of always defaulting to `tqc_nl`.

## Current State

- `placement_fees.currency_code` exists but is always hardcoded to `'EUR'`
- `placement_fees.legal_entity` exists but defaults to `'tqc_nl'` with no UI to change it
- `AddPlacementFeeDialog` has no currency selector and no office selector
- `PlacementFeesTable.formatCurrency` is hardcoded to EUR
- `InvoiceGenerator` is hardcoded to EUR and 21% VAT
- `MissingFeesAlert` hardcodes `currency_code: 'EUR'`
- `automate-placement-fee` edge function hardcodes EUR, no `currency_code` or `legal_entity` in insert
- The currency conversion library (`src/lib/currencyConversion.ts`) already supports EUR/USD/GBP/AED with live rates

## Database Changes

### Add `fee_amount_eur` column to `placement_fees`

Store the EUR-equivalent of the fee amount so consolidated reporting always works without on-the-fly conversion:

```sql
ALTER TABLE placement_fees ADD COLUMN fee_amount_eur numeric;
```

For existing rows (all EUR), backfill:
```sql
UPDATE placement_fees SET fee_amount_eur = fee_amount WHERE fee_amount_eur IS NULL;
```

This means reporting can always sum `fee_amount_eur` for consolidated views, while `fee_amount` + `currency_code` stores the original amount.

## Frontend Changes

### 1. AddPlacementFeeDialog -- Add Currency and Office Selectors

- Add a currency dropdown (EUR, USD, GBP, AED) next to the salary field
- Add an office/entity selector (Amsterdam / Dubai) below the date field
- When submitting, pass `currency_code` and `legal_entity` to the insert
- Update the "Calculated Fee" preview to show the selected currency symbol
- Add a secondary line showing the EUR equivalent using `convertCurrency()`

### 2. PlacementFeesTable -- Show Currency per Row

- Update `formatCurrency()` to use each fee's `currency_code` instead of hardcoded EUR
- Add the EntityBadge (already created) next to the company name to show office
- Show EUR equivalent in a subtle subtitle when currency is not EUR

### 3. InvoiceGenerator -- Currency-Aware

- Group fees by currency when generating invoices (or convert all to EUR for invoicing)
- Use the fee's `currency_code` for the "Base Salary" column
- Invoice totals remain in EUR (since invoices are issued by the NL or Dubai entity in EUR)
- When entity is Dubai, use 5% VAT instead of 21%

### 4. MissingFeesAlert -- Pass Currency from Job

- Instead of hardcoding `currency_code: 'EUR'`, use the job's currency field
- Default to EUR if not set

### 5. RevenueSummaryCards / ProfitLossCard -- Use `fee_amount_eur`

- For consolidated views, sum `fee_amount_eur` instead of `fee_amount`
- When filtered to a single entity, still use `fee_amount_eur` for consistency

## Edge Function Changes

### `automate-placement-fee`

- Accept optional `currency_code` and `legal_entity` in the request body
- Auto-detect currency from the job's `currency` field if not provided
- Auto-detect entity from company location (Dubai region = `tqc_dubai`)
- Calculate `fee_amount_eur` using exchange rates (fetch from API or use stored rates)
- Store `currency_code`, `legal_entity`, and `fee_amount_eur` on the placement fee

## Files to Create/Modify

| File | Change |
|---|---|
| Migration SQL | Add `fee_amount_eur` column, backfill existing data |
| `src/components/financial/AddPlacementFeeDialog.tsx` | Add currency selector, office selector, EUR equivalent preview |
| `src/components/financial/PlacementFeesTable.tsx` | Currency-aware formatting, EntityBadge per row |
| `src/components/financial/InvoiceGenerator.tsx` | Use fee currency for salary column, entity-aware VAT |
| `src/components/financial/MissingFeesAlert.tsx` | Use job currency instead of hardcoded EUR |
| `supabase/functions/automate-placement-fee/index.ts` | Accept and store currency_code, legal_entity, fee_amount_eur |
| `src/hooks/usePlacementFeesWithContext.ts` | Include currency_code and legal_entity in select |
| `src/hooks/useFinancialData.ts` | Update PlacementFee type to include currency_code and legal_entity |

## Technical Details

### EUR Equivalent Calculation

When a fee is in USD (e.g. $90,000 salary, 20% fee = $18,000):
- Fetch current EUR/USD rate
- `fee_amount_eur = fee_amount / exchange_rate` (e.g. $18,000 / 1.09 = ~EUR 16,514)
- Stored at time of creation, not recalculated (snapshot)

### Office Assignment Logic

- Default: `tqc_nl` (Amsterdam)
- Admin can override to `tqc_dubai` in the form
- `automate-placement-fee` auto-detects based on company/job location containing "dubai", "uae", "abu dhabi"
- The EntitySelector already exists on the dashboard for filtering; this just makes each fee carry its own entity

### Currency Display Pattern

```
Salary: $90,000 USD
Fee: $18,000 (20%)
EUR equiv: ~EUR 16,514
Office: Dubai
```
