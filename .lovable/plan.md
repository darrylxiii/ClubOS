

# Fix Partner Provisioning 500 Error

## Root Cause

The `provision-partner` edge function references database objects that don't exist, causing Postgres errors that surface as a 500 to the frontend.

Two bugs found:

### Bug 1: Wrong table name for strategist assignment (Step 4b, ~line 268)

The function inserts into `candidate_strategist_assignments` — this table does not exist.

The correct table is `strategist_assignments` with this schema:

| Column | Maps to |
|---|---|
| `partner_id` | the new user's ID (function uses `candidate_id` which doesn't exist) |
| `strategist_id` | correct |
| `is_active` | use instead of `status: 'active'` |
| `notes` | correct |

### Bug 2: Wrong column name for phone on profiles (Step 3, ~line 248)

The function writes `phone_number` to the `profiles` table. The actual column is `phone`.

---

## Fix

One file to update: `supabase/functions/provision-partner/index.ts`

**Change 1** (line 248): `phone_number` to `phone`

**Change 2** (lines 267-274): Replace the `candidate_strategist_assignments` insert with:

```typescript
await supabase
  .from('strategist_assignments')
  .insert({
    partner_id: newUserId,
    strategist_id: body.assignedStrategistId,
    is_active: true,
    assignment_type: 'partner_provisioning',
    notes: 'Assigned during partner provisioning'
  });
```

Then redeploy the edge function.
