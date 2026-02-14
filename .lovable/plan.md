
# Expenses Tab Overhaul: Recurring Expenses, Receipt Upload, and Full Audit

## Audit Findings -- What's Missing

| Gap | Severity | Details |
|-----|----------|---------|
| No recurring expense management | High | The `is_recurring` flag and `recurring_frequency` column exist in the DB but are never set in the form. No UI to view/manage recurring vs one-time expenses separately. |
| No receipt upload on expenses | High | The `receipt_url` column exists but the form never uses it. The receipt scanner was only built for inventory assets. |
| Vendor subscriptions are invisible | High | 2 active subscriptions exist in `vendor_subscriptions` but they never appear in the Expenses tab -- only used in P&L calculations behind the scenes. |
| No recurring frequency options | Medium | DB has `recurring_frequency` but the form has no selector for monthly/quarterly/annual. |
| No expense editing | Medium | Can only add and delete -- no way to edit an existing expense. |
| No filtering or search | Medium | All expenses dumped in one flat table. No date range filter, category filter, or search. |
| No VAT/tax tracking on expenses | Medium | Expenses are gross amounts only. No VAT split for input-VAT recovery tracking. |
| No "Partnerships" category | Low | Categories don't include partnerships or retainers specifically. |
| Notes field not in form | Low | DB has `notes` column but form doesn't expose it. |

## Plan

### 1. Add New Expense Categories (DB Migration)
Add two new categories to `expense_categories`:
- "Partnerships & Retainers"
- "Insurance & Compliance"

### 2. Add `vat_amount` Column to `operating_expenses` (DB Migration)
Add a nullable `vat_amount numeric` column so we can track input VAT on expenses (mirrors the asset pattern).

### 3. Redesign `ExpenseTracking.tsx` with Three Sections

**A. Summary Row (enhanced)**
- YTD Expenses (total)
- Monthly Recurring Burn (sum of all recurring expenses by their frequency, normalized to monthly)
- Subscriptions (count + total from `vendor_subscriptions`)
- Avg Monthly Spend

**B. Recurring Expenses Panel**
A dedicated card showing:
- All expenses where `is_recurring = true`, grouped by frequency
- Active `vendor_subscriptions` surfaced here (read-only, linking to the SaaS inventory tab)
- Total monthly recurring cost

**C. Expense Ledger (improved table)**
- Filters: date range, category dropdown, recurring toggle, search by vendor/description
- Inline badge for recurring frequency
- Receipt icon linking to `receipt_url` when present
- Edit button (opens same dialog in edit mode)
- Pagination or virtual scroll for large lists

### 4. Revamp Add/Edit Expense Dialog

The dialog gets these improvements:
- **Receipt upload zone** at the top (reuses the `parse-receipt` edge function already built for assets) -- drops into the `documents` bucket, AI extracts vendor/amount/date/description and pre-fills
- **Recurring toggle** with frequency selector (monthly, quarterly, semi-annual, annual)
- **VAT amount** field (optional, defaults to 0)
- **Notes** text area
- **Category** selector with the new categories included
- **Edit mode**: pre-populates all fields from the selected expense

### 5. Files to Create
| File | Purpose |
|------|---------|
| `src/components/financial/RecurringExpensesPanel.tsx` | Card showing recurring expenses + subscriptions summary |
| `src/components/financial/ExpenseFilters.tsx` | Filter bar: date range, category, recurring, search |
| `src/components/financial/ExpenseFormDialog.tsx` | New combined add/edit dialog with receipt upload, recurring options, VAT |

### 6. Files to Modify
| File | Change |
|------|--------|
| `src/pages/admin/ExpenseTracking.tsx` | Replace entire page with the three-section layout, import new components |

### 7. No New Edge Functions
The existing `parse-receipt` edge function works for expense receipts too -- same vendor/amount/date extraction.

## Technical Details

- Receipt upload flow: `react-dropzone` -> upload to `documents` bucket -> call `parse-receipt` -> auto-fill form fields (vendor, amount, date, description, category suggestion)
- Recurring normalization: monthly = amount, quarterly = amount/3, semi-annual = amount/6, annual = amount/12
- Vendor subscriptions query: `vendor_subscriptions` where `status = 'active'`, show `vendor_name`, `monthly_cost`, `billing_cycle`, `next_billing_date`
- Edit mode: pass expense ID to dialog, load existing data, use `.update()` instead of `.insert()`
- All currency display uses existing `formatCurrency` utility
