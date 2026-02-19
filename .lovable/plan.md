

# Fix Organization Scan Estimate (0 employees / blank credits)

## Problem

When opening the scan dialog for "Dore & Rose," the estimate shows 0 employees and blank credit values. Two root causes:

1. **Apify estimate logic returns wrong count**: The current code requests `maxItems: 1` from the employee scraper and uses `results.length` as headcount -- yielding at most 1, not the real employee count. The fallback (`company_size`) is NULL for this company.

2. **Response shape mismatch**: The edge function returns `{ headcount, totalEstimate, warning }` but the frontend `ScanEstimate` interface expects additional fields: `listingCredits`, `enrichmentCredits`, `monthlySpendSoFar`. These render as blank/undefined in the dialog.

---

## Changes

### 1. Edge Function: `supabase/functions/scan-partner-organization/index.ts`

Update the `estimate` action to:
- Use the Apify company scraper properly. Instead of requesting `maxItems: 1` and counting results, request a reasonable sample (e.g., `maxItems: 50`) and check whether Apify metadata exposes a total. If not available, fall back to a higher `maxItems` or the `company_size` column.
- Alternatively, use the Apify LinkedIn Company Profile scraper to get the company page metadata (which includes employee count) rather than running the employee-listing actor just for a count.
- Return the full shape the frontend expects: `headcount`, `listingCredits`, `enrichmentCredits`, `totalEstimate`, `monthlySpendSoFar`, and `warning`.
- Query existing monthly Apify usage from `company_scan_jobs` to populate `monthlySpendSoFar`.

### 2. Database: Populate `company_size` (optional improvement)

- When the estimate fetches the real headcount from Apify/LinkedIn, write it back to `companies.company_size` so future estimates have a fast fallback.

### 3. Frontend: No changes required

The `ScanEstimate` interface and `ScanProgressDialog` are already correct -- they just need the edge function to return the expected fields.

---

## Technical Detail

Updated estimate response shape from the edge function:

```text
{
  success: true,
  estimate: {
    headcount: 45,
    listingCredits: 1,        // Apify charges per actor run, not per profile
    enrichmentCredits: 45,    // ~1 credit per profile enrichment run
    totalEstimate: 46,
    monthlySpendSoFar: 120,   // sum from company_scan_jobs this month
    warning: null
  }
}
```

Apify actor for company info (to get employee count without listing all employees):
- Actor: `apify/linkedin-company-scraper` or similar -- accepts company URL, returns company metadata including employee count.
- If no dedicated company-info actor is available, run the employee listing actor with a higher `maxItems` and count the results, or parse the total from the response.

### Sequence

1. Fix the edge function estimate action (response shape + headcount logic)
2. Deploy and verify with Dore & Rose
3. Optionally backfill `company_size` on successful estimates
