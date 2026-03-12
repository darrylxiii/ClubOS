

# Fix: Remove Non-Existent `domain` Column from Partner Approval

## Problem
`approve-partner-request/index.ts` line 155 inserts `domain` into the `companies` table, but no such column exists in the schema. This causes every partner approval to fail with: *"Could not find the 'domain' column of 'companies' in the schema cache"*.

## Fix
**File:** `supabase/functions/approve-partner-request/index.ts` (lines 150-159)

Remove `domain` from the insert. The email domain is not needed for company creation — it can optionally be stored in `website_url` later. Also add `industry` and `company_size` from the partner request data since those fields exist on both the request and the companies table.

```typescript
const { data: company, error: companyError } = await supabase
  .from("companies")
  .insert({
    name: request.company_name,
    slug: `${slug}-${Date.now().toString(36)}`,
    industry: request.industry || null,
    company_size: request.company_size || null,
    is_active: true,
  })
  .select()
  .single();
```

One file change, one line removed. Deploy will auto-trigger.

