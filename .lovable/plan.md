

# Fix: Add Missing INSERT RLS Policy on `calendar_connections`

## Problem

The Google OAuth token exchange succeeds (edge function logs confirm "Token exchange successful"), but the subsequent client-side `INSERT` into the `calendar_connections` table is blocked because there is **no INSERT RLS policy**.

Current policies on `calendar_connections`:
- SELECT: users can view own rows
- UPDATE: users can update own rows
- DELETE: users can delete own rows
- **INSERT: MISSING**

## Fix

Add a single RLS policy allowing authenticated users to insert rows where `user_id` matches their auth UID.

```sql
CREATE POLICY "Users can insert own calendar connections"
  ON public.calendar_connections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

No code changes needed -- the client-side insert logic is already correct.

