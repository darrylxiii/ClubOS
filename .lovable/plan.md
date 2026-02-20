
# Fix: 100% PDF Invoice Auto-Fill with Multi-Currency & VAT Intelligence

## What's Broken Today (Root Cause Analysis)

After reading all relevant code, there are five distinct bugs causing incomplete auto-fill:

**Bug 1 — Category is never filled in.** The AI returns `suggested_category` as values like `it_hardware`, `software_purchased`, etc. But the form's category dropdown uses real database values: `Software & SaaS`, `Office & Facilities`, `Professional Services`, etc. There is no mapping between the two schemas, and `ExpenseFormDialog.tsx` never reads `suggested_category` or sets `category_name` from it.

**Bug 2 — AI doesn't know about currency or jurisdiction.** The `parse-receipt` function prompt tells the AI to return all amounts "in euros" — which is wrong for USD/AED invoices. It also has no concept of VAT jurisdiction, so a Dubai invoice with 5% VAT or 0% VAT (depending on service type) is treated identically to a Dutch 21% BTW invoice.

**Bug 3 — AI schema is missing critical expense fields.** The current tool schema extracts: `asset_name`, `purchase_value_excl_vat`, `vat_amount`, `purchase_date`, `supplier`, `invoice_reference`, `description`, `suggested_category`. Missing: `currency`, `vat_rate_percent`, `is_vat_exempt`, `jurisdiction`, `is_recurring_hint`. None of these are extracted, so currency and VAT logic is always wrong.

**Bug 4 — PDF base64 encoding can break on large files.** The current code uses `btoa(String.fromCharCode(...new Uint8Array(fileBuffer)))` — the spread operator on a large Uint8Array causes a stack overflow for files over ~1MB. Multi-page PDFs silently fail, returning garbage or nothing, causing the AI to return incomplete data.

**Bug 5 — No category mapping exists.** Even if the AI returned the right category key, there is no code to translate `software_purchased` → `Software & SaaS` in the form.

---

## Solution Architecture

### Part 1 — Fix `parse-receipt` Edge Function

Rewrite the edge function with three improvements:

**A. Fix the base64 encoding for large PDFs:**

Replace the stack-overflow-prone spread with a chunked encoder:
```text
BEFORE: btoa(String.fromCharCode(...new Uint8Array(fileBuffer)))
AFTER:  chunk loop — btoa(String.fromCharCode(...chunk)) for chunks of 8192 bytes
```

**B. Expand the AI tool schema to extract all needed fields:**

New fields added to the `extract_invoice_data` function schema:
- `currency` — ISO code detected from the document (EUR, USD, GBP, AED, etc.)
- `amount_net` — net amount excluding any tax, in the document's original currency
- `amount_gross` — total amount including tax, in the document's original currency
- `vat_amount` — VAT/tax amount extracted directly from document, in original currency (0 if exempt)
- `vat_rate_percent` — numeric rate (e.g. 21 for NL BTW, 5 for UAE VAT, 0 if exempt/not applicable)
- `is_vat_exempt` — boolean; true for Dubai/UAE zero-rated or NL exempt services
- `jurisdiction` — detected country/region ("Netherlands", "UAE", "UK", "USA", etc.) from vendor address or VAT number
- `suggested_expense_category` — now mapped directly to actual DB category names: `Software & SaaS`, `Office & Facilities`, `Professional Services`, `Marketing & Advertising`, `Travel & Entertainment`, `Salaries & Benefits`, `Insurance & Compliance`, `Partnerships & Retainers`, `Other`
- `is_recurring_hint` — boolean; true if invoice says "subscription", "monthly", "annual fee", etc.
- `recurring_frequency_hint` — "monthly" | "annual" | "quarterly" if detected

**C. Upgrade the system prompt for VAT jurisdiction awareness:**

```text
CURRENT PROMPT:
"You are an expert at reading receipts and invoices. Extract all financial data."

NEW PROMPT:
"You are QUIN, financial intelligence for The Quantum Club. This company operates 
from the Netherlands and Dubai. Analyse the invoice carefully:

CURRENCY: Always return amounts in the invoice's ORIGINAL currency — never convert.
Extract the currency code (EUR, USD, GBP, AED, etc.) from the document.

VAT RULES:
- Netherlands (NL): Standard BTW rate is 21%. Some services are 0% or exempt.
  Look for 'BTW', 'VAT NL', or NL VAT number (NLxxxxxxxxx).
- UAE / Dubai: Standard VAT is 5%. Some B2B exports are 0% (zero-rated).
  Look for 'TRN', 'UAE VAT', or 'Federal Tax Authority'.
- UK: Standard rate 20%. Look for GB VAT number.
- USA: Typically no VAT. If no tax line exists, vat_amount = 0, is_vat_exempt = true.
- If the invoice has no VAT line at all, set vat_amount = 0 and is_vat_exempt = true.

CATEGORY: Map the service/product to the exact expense category name from this list:
Software & SaaS, Office & Facilities, Professional Services, Marketing & Advertising,
Travel & Entertainment, Salaries & Benefits, Insurance & Compliance,
Partnerships & Retainers, Other

RECURRING: If the invoice mentions 'subscription', 'monthly fee', 'annual fee',
'recurring', or similar, set is_recurring_hint = true."
```

### Part 2 — Fix `ExpenseFormDialog.tsx` (the consumer side)

After the `parse-receipt` function returns improved data, update the form's `onDrop` handler to consume all new fields:

```text
CURRENT (fills 3 fields):
  vendor, amount (only excl VAT as EUR), vat_amount, description, expense_date

NEW (fills 8+ fields):
  vendor              → supplier
  expense_date        → purchase_date
  description         → description / asset_name
  amount              → amount_net (in original currency)
  currency            → currency (auto-selects EUR/USD/GBP/AED dropdown)
  amount_eur          → amount_gross_eur (calculated via FX rate if non-EUR)
  vat_amount          → vat_amount (0 if is_vat_exempt or no VAT line found)
  category_name       → suggested_expense_category (now matches DB values exactly)
  is_recurring        → is_recurring_hint
  recurring_frequency → recurring_frequency_hint
```

Additionally:

- After parse, show a "Parsed from PDF" confirmation banner listing which fields were auto-filled vs which still need manual input.
- If `is_vat_exempt` is true, show a small badge "VAT exempt — set to 0" next to the VAT field so the user understands why it's zero.
- If `currency` detected from PDF differs from the currently selected currency in the form, auto-switch the currency selector to match.

### Part 3 — VAT Field Label Update

The current VAT field label is: `"VAT Amount (EUR, optional)"`. This is misleading for non-EUR invoices. Update to: `"VAT Amount ({currency})"` — always showing the detected/selected original currency, not hardcoding EUR. The saved `vat_amount` column stores the original-currency VAT amount; the EUR conversion is implicit via the `amount_eur` snapshot ratio.

---

## Files to Change

### 1. `supabase/functions/parse-receipt/index.ts` — Core fix

Complete rewrite of:
- Base64 encoding (chunked, no stack overflow)
- System prompt (full VAT jurisdiction + currency + category awareness)
- Tool schema (add 7 new fields)
- Response: return all new fields so the frontend can use them

### 2. `src/components/financial/ExpenseFormDialog.tsx` — Consumer fix

- Expand `onDrop` handler to read and apply all new parsed fields
- Auto-switch `currency` state when PDF's currency differs from current selection
- Show parsed field summary banner after successful parse
- Update VAT field label to use dynamic currency symbol
- Map `is_recurring_hint` and `recurring_frequency_hint` to form toggles

---

## Edge Cases Handled

| Scenario | Behaviour |
|---|---|
| Dubai invoice, AED, 5% VAT | currency=AED, vat_rate=5, vat_amount extracted, category mapped |
| Dubai invoice, zero-rated export | currency=AED, vat_amount=0, is_vat_exempt=true, badge shown |
| US SaaS invoice (no VAT) | currency=USD, vat_amount=0, is_vat_exempt=true |
| Dutch BTW invoice 21% | currency=EUR, vat_rate=21, full BTW amount extracted |
| Annual subscription PDF | is_recurring=true, recurring_frequency=annual |
| Large multi-page PDF | Chunked base64 — no stack overflow |
| Amount in "1.234,56" EU format | Prompt instructs: return as numeric float, no formatting |
| Category "AWS" invoice | suggested_expense_category = "Software & SaaS" |

---

## What Does NOT Change

- No database migrations needed — `vat_amount`, `currency`, `is_recurring`, `category_name`, `amount_eur` all already exist in `operating_expenses`.
- No new secrets or API keys needed — uses existing Lovable AI gateway.
- No RLS or auth changes.
- `parse-receipt` edge function is deployed automatically after code change.

---

## Summary

| Before | After |
|---|---|
| 3 fields auto-filled (vendor, amount, date) | 9+ fields auto-filled |
| Category always blank | Category matched to real DB values |
| VAT always needs manual entry | VAT extracted + zero for exempt jurisdictions |
| Currency ignored — always assumed EUR | Currency detected from PDF, dropdown auto-set |
| Large PDFs may silently fail | Chunked base64 — reliable up to 20MB |
| No recurring detection | Subscription invoices auto-toggle recurring |
| No VAT jurisdiction logic | Netherlands 21%, UAE 5%/0%, USA 0% handled correctly |
