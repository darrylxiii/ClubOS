

# Fix: Upsert Still Failing Due to Missing WITH CHECK on UPDATE Policy

## Problem

The `.upsert()` call is correct, but Supabase (PostgREST) requires the UPDATE RLS policy to include **both** a `USING` clause and a `WITH CHECK` clause for upserts to succeed. The current UPDATE policy only has `USING (auth.uid() = user_id)` but no `WITH CHECK`.

## Solution

Drop and recreate the UPDATE policy with both clauses:

```sql
DROP POLICY "Users can update own calendar connections" ON public.calendar_connections;

CREATE POLICY "Users can update own calendar connections"
  ON public.calendar_connections
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

This single migration will allow the upsert to perform the UPDATE path when a matching row already exists.

