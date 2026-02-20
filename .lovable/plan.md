
# Fix: `description` NOT NULL Constraint on `partner_requests`

## Root Cause — Confirmed

The CRO rewrite correctly made the `description` textarea **optional** in the UI (good for conversions). However, the database column `description` in `partner_requests` still has a `NOT NULL` constraint.

When a partner submits without filling in the description field, the code sends:

```typescript
description: formData.description || null,  // → sends NULL
```

The database rejects this with the error seen:

```
null value in column "description" of relation "partner_requests" 
violates not-null constraint
```

## Full List of NOT NULL Columns That Are Now Optional in the Form

After checking the schema, only `description` is the active blocker — all other `NOT NULL` columns (`company_name`, `contact_name`, `contact_email`, `industry`, `company_size`, `agreed_no_cure_no_pay`, `agreed_privacy`, `status`, `steps_completed`) either have defaults or are still required fields in the frontend validation.

## The Fix — One Database Migration

Drop the `NOT NULL` constraint from the `description` column. This is a non-destructive change: all existing rows that already have a value are unaffected. New submissions where a user leaves the description blank will simply store `NULL`.

**Migration SQL:**
```sql
ALTER TABLE public.partner_requests 
  ALTER COLUMN description DROP NOT NULL;
```

That is the entire fix. No frontend code changes needed — the form already sends `null` correctly when the field is empty. No data is lost. No RLS changes needed.

## Why Not Default to Empty String Instead?

Setting `DEFAULT ''` would silently store blank strings and make it impossible to distinguish "user left it blank" from "user typed nothing meaningful". `NULL` is semantically correct for an optional field and allows the admin panel to accurately show "no description provided" vs an empty string.

## After the Fix

Partner submissions with no description will insert successfully. Submissions with a description will continue to work exactly as before. No other columns need to change.
