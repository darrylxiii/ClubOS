

# Fix: Create Missing `user_pinned_kpis` Table

## Problem

Every time the KPI Command Center loads, the `usePinnedKPIs` hook queries a table called `user_pinned_kpis` that does not exist in the database. This produces the error:

```
Could not find the table 'public.user_pinned_kpis' in the schema cache
```

The other messages (Sentry DSN, PostHog key, RB2B script) are non-critical warnings expected in the development environment. They are not errors.

## Fix

Run a database migration to create the `user_pinned_kpis` table with proper structure and Row-Level Security.

### Table Schema

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key, default gen_random_uuid() |
| user_id | uuid | References auth.users, not null |
| kpi_id | text | Identifier for the KPI, not null |
| kpi_domain | text | Domain/category of the KPI, not null |
| pinned_at | timestamptz | Default now(), not null |

- Unique constraint on (user_id, kpi_id) to prevent duplicate pins.
- Index on user_id for fast lookups.

### RLS Policies

- **SELECT**: Users can only read their own pinned KPIs (`auth.uid() = user_id`).
- **INSERT**: Users can only insert rows for themselves (`auth.uid() = user_id`).
- **DELETE**: Users can only delete their own pins (`auth.uid() = user_id`).

### Code Changes

None. The existing `usePinnedKPIs.ts` hook is already correctly written to use this table. Once the table exists, the errors will stop.

## Risk

Very low. This adds a new table with no impact on existing tables. The hook already handles the missing-table case gracefully (returns empty array), so there is zero risk of regression.

