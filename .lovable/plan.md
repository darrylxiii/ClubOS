

# Fix Partner Provisioning Edge Function — Column Mismatches

## Problem

The `provision-partner` edge function fails with a non-2xx response because several database inserts use column names that do not match the actual table schemas.

## Root Causes

### 1. `invite_codes` table (Step 8, line 358-371)

The table has a `created_by_type` column that is NOT NULL with no default. The function never sets it, so the insert fails.

### 2. `comprehensive_audit_logs` table (Step 11, lines 482-501)

The function uses wrong column names throughout:

| Function uses | Actual column | Required? |
|---|---|---|
| `action_type` | `event_type` | NOT NULL |
| `action_category` | `event_category` | nullable |
| (missing) | `action` | NOT NULL |
| `new_value` | `after_value` | nullable |
| `ip_address` | `actor_ip_address` | nullable (inet type) |
| `user_agent` | `actor_user_agent` | nullable |
| `description` | `description` | OK |
| `resource_type` | `resource_type` | OK |
| `resource_id` | `resource_id` | OK |

### 3. Legacy `serve()` import

The function imports `serve` from `deno.land/std@0.168.0` which is deprecated. While it works now, it should use `Deno.serve()` for reliability.

## Changes

### File: `supabase/functions/provision-partner/index.ts`

1. **Replace `serve()` import with `Deno.serve()`** (lines 1, 42) -- remove the deno std import and use the built-in.

2. **Fix `invite_codes` insert** (line 358-371) -- add `created_by_type: 'admin'` to the insert payload.

3. **Fix `comprehensive_audit_logs` insert** (lines 482-501) -- correct all column names:
   - `action_type` to `event_type`
   - `action_category` to `event_category`
   - Add `action: 'partner_provisioned'`
   - `new_value` to `after_value`
   - `ip_address` to `actor_ip_address`
   - `user_agent` to `actor_user_agent`

4. **Add defensive error logging** on steps 8-11 so silent insert failures are logged to console for future debugging.

## No other files change

The frontend hook (`usePartnerProvisioning.ts`) and UI components remain unchanged -- they already handle the success/error response correctly.

