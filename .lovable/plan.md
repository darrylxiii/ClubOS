
# Multi-Entity Financial System: The Quantum Club Dubai

## What This Does

Adds "The Quantum Club Dubai" as a second legal entity alongside the existing Netherlands entity, so revenue, invoices, VAT, P&L, and placement fees can be tracked, filtered, and reported per entity. Think of it as a "company within the company" toggle across the entire financial system.

## Why This Matters

- Revenue earned in Dubai has different tax rules (0% corporate tax, 5% VAT vs NL 21% BTW)
- Invoices from Dubai go through a separate Moneybird administration (or a separate invoicing system entirely)
- P&L, cash flow, and VAT reports need to be split or consolidated
- Placement fees need to be attributed to the correct entity for commission calculations

## Architecture: The `legal_entity` Column

Rather than building a complex multi-tenant system, we add a single `legal_entity` enum column to every financial table. This is the 0.1% approach -- minimal schema change, maximum impact.

```text
legal_entity: 'tqc_nl' | 'tqc_dubai'
Default: 'tqc_nl' (all existing data stays Netherlands)
```

### Tables That Get the Column

| Table | Purpose |
|---|---|
| `placement_fees` | Which entity earns the fee |
| `moneybird_sales_invoices` | Which entity issued the invoice |
| `moneybird_financial_metrics` | Aggregated metrics per entity |
| `operating_expenses` | Which entity incurred the cost |
| `employee_commissions` | Which entity pays the commission |
| `referral_payouts` | Which entity pays the referral |
| `financial_events` | Event attribution |
| `vendor_subscriptions` | Which entity holds the subscription |
| `financial_forecasts` | Forecast per entity |

## Database Changes

### 1. Create `legal_entities` reference table

```sql
CREATE TABLE public.legal_entities (
  code text PRIMARY KEY,
  display_name text NOT NULL,
  country_code text NOT NULL,
  currency_code text NOT NULL DEFAULT 'EUR',
  vat_rate numeric NOT NULL DEFAULT 0,
  vat_number text,
  company_registration text,
  bank_name text,
  bank_iban text,
  bank_bic text,
  bank_account_holder text,
  address_line1 text,
  address_line2 text,
  city text,
  postal_code text,
  country text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

Seed with two rows:
- `tqc_nl`: "The Quantum Club B.V." / NL / EUR / 21% VAT / BTW number
- `tqc_dubai`: "The Quantum Club FZ-LLC" / AE / EUR (or AED) / 5% VAT

### 2. Add `legal_entity` column to financial tables

```sql
ALTER TABLE placement_fees ADD COLUMN legal_entity text DEFAULT 'tqc_nl' REFERENCES legal_entities(code);
ALTER TABLE moneybird_sales_invoices ADD COLUMN legal_entity text DEFAULT 'tqc_nl' REFERENCES legal_entities(code);
ALTER TABLE moneybird_financial_metrics ADD COLUMN legal_entity text DEFAULT 'tqc_nl' REFERENCES legal_entities(code);
ALTER TABLE operating_expenses ADD COLUMN legal_entity text DEFAULT 'tqc_nl' REFERENCES legal_entities(code);
ALTER TABLE employee_commissions ADD COLUMN legal_entity text DEFAULT 'tqc_nl' REFERENCES legal_entities(code);
ALTER TABLE referral_payouts ADD COLUMN legal_entity text DEFAULT 'tqc_nl' REFERENCES legal_entities(code);
ALTER TABLE financial_events ADD COLUMN legal_entity text DEFAULT 'tqc_nl' REFERENCES legal_entities(code);
ALTER TABLE vendor_subscriptions ADD COLUMN legal_entity text DEFAULT 'tqc_nl' REFERENCES legal_entities(code);
ALTER TABLE financial_forecasts ADD COLUMN legal_entity text DEFAULT 'tqc_nl' REFERENCES legal_entities(code);
```

All existing data defaults to `tqc_nl` -- zero data loss.

### 3. Update `moneybird_settings` for multi-admin support

```sql
ALTER TABLE moneybird_settings ADD COLUMN legal_entity text DEFAULT 'tqc_nl' REFERENCES legal_entities(code);
```

This allows connecting a second Moneybird administration for Dubai.

## Frontend Changes

### 1. Entity Selector on Financial Dashboard

Add an entity filter next to the existing Year and Currency selectors:

- **Options**: "All Entities" (consolidated) | "TQC Netherlands" | "TQC Dubai"
- **Default**: "All Entities" (shows combined view)
- When filtered, all cards, charts, tables, and P&L reflect only that entity

### 2. Update Financial Components

These components need to accept and pass down a `legalEntity` filter parameter:

| Component | Change |
|---|---|
| `RevenueSummaryCards` | Filter metrics by entity |
| `FinancialOverviewChart` | Split/filter revenue by entity |
| `TopClientsTable` | Filter clients by entity |
| `PaymentAgingChart` | Filter aging by entity |
| `ProfitLossCard` | P&L per entity (different VAT rates) |
| `VATLiabilityCard` | Critical: NL shows 21% BTW, Dubai shows 5% VAT |
| `VATRegisterTable` | Filter by entity |
| `CashFlowProjection` | Per-entity cash flow |
| `PlacementFeesTable` | Show entity column, allow filtering |
| `MoneybirdInvoicesTable` | Show entity badge |
| `EmployeeCommissionsTable` | Filter by entity |
| `InvoiceStatusSummary` | Per-entity counts |

### 3. VATLiabilityCard: Dual-Regime Support

Currently hardcoded to "21% BTW" and "Belastingdienst". When entity is Dubai:
- Show "5% VAT" instead of "21% BTW"
- Remove BTW number badge
- Show UAE tax reference instead
- Change "Belastingdienst" to "FTA (Federal Tax Authority)"

### 4. Entity Badge Component

A small reusable badge:
- `tqc_nl`: Flag NL + "Netherlands"
- `tqc_dubai`: Flag AE + "Dubai"

Used on placement fee rows, invoice rows, expense rows.

### 5. Placement Fee Creation

When creating a placement fee (manually or via `automate-placement-fee`), allow selecting which entity earns the fee. Default based on:
- If the job/company is in UAE/Dubai region -> `tqc_dubai`
- Otherwise -> `tqc_nl`

## Edge Function Changes

### `moneybird-fetch-financials`
- Accept `legal_entity` parameter
- Use the correct Moneybird administration credentials based on entity
- Tag all stored invoices with the entity
- Compute metrics per entity

### `sync-company-revenue`
- Group by entity when aggregating
- Store entity-aware revenue totals

### `automate-placement-fee`
- Auto-detect entity from company/job region
- Store `legal_entity` on the placement fee

## Hooks Changes

### `useMoneybirdFinancials`
- Accept optional `legalEntity` filter
- Query `moneybird_financial_metrics` with `.eq('legal_entity', entity)` or omit for consolidated

### `usePlacementFeesWithContext`, `useVATData`, etc.
- Accept and apply entity filter

## Consolidated vs Per-Entity Reporting

When "All Entities" is selected:
- Revenue cards show combined totals
- P&L shows combined (with a note about mixed VAT regimes)
- VAT card shows split: NL liability + Dubai liability side by side

## Moneybird Settings Page

Add ability to connect a second Moneybird administration for Dubai:
- Show current connections with entity labels
- "Add Dubai Administration" button
- Each connection stores its own `administration_id` and tokens

## Implementation Order

1. Database migration: `legal_entities` table + columns on all financial tables
2. Seed NL and Dubai entities
3. Create `EntitySelector` component
4. Update `FinancialDashboard` with entity filter state
5. Update hooks to accept entity filter
6. Update all financial components to use the filter
7. Update `VATLiabilityCard` for dual-regime
8. Update `moneybird-fetch-financials` for multi-admin
9. Update `automate-placement-fee` for entity detection
10. Update Moneybird settings UI for multi-connection

## Files to Create/Modify

| File | Change |
|---|---|
| Migration SQL | New table + columns |
| `src/components/financial/EntitySelector.tsx` | New component |
| `src/components/financial/EntityBadge.tsx` | New component |
| `src/pages/admin/FinancialDashboard.tsx` | Add entity filter, pass down |
| `src/hooks/useMoneybirdFinancials.ts` | Accept entity param |
| `src/hooks/useVATData.ts` | Accept entity param |
| `src/hooks/useFinancialData.ts` | Accept entity param |
| `src/hooks/usePlacementFeesWithContext.ts` | Accept entity param |
| `src/components/financial/RevenueSummaryCards.tsx` | Entity-aware |
| `src/components/financial/ProfitLossCard.tsx` | Entity-aware VAT |
| `src/components/financial/VATLiabilityCard.tsx` | Dual-regime |
| `src/components/financial/PlacementFeesTable.tsx` | Entity column |
| `src/components/financial/MoneybirdInvoicesTable.tsx` | Entity badge |
| `src/components/financial/FinancialOverviewChart.tsx` | Entity filter |
| `src/components/financial/TopClientsTable.tsx` | Entity filter |
| `src/components/financial/CashFlowProjection.tsx` | Entity filter |
| `src/components/financial/EmployeeCommissionsTable.tsx` | Entity filter |
| `supabase/functions/moneybird-fetch-financials/index.ts` | Multi-admin |
| `supabase/functions/automate-placement-fee/index.ts` | Entity detection |
| `supabase/functions/sync-company-revenue/index.ts` | Entity-aware |
