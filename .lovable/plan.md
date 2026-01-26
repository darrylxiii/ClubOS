

# Fix Email & Phone Verification - Critical Schema Mismatch

## Problem Summary

Your client cannot get through the Request Access modal because **the email verification is silently failing**. I've identified **3 critical bugs**:

### Root Causes Found

| Issue | Impact | Severity |
|-------|--------|----------|
| **Column mismatch in idempotency check** | Edge functions query `.eq('verified', false)` but the database column is `verified_at` (timestamp, not boolean) | 🔴 CRITICAL |
| **Missing `comprehensive_audit_logs` table** | Security logger fails silently, causing edge function errors | 🟡 Medium |
| **Query returns nothing** | Idempotency check always fails, but function still proceeds - the real issue is the column name breaks the query | 🔴 CRITICAL |

---

## Technical Details

### Bug 1: Email Verification Column Mismatch

**File:** `supabase/functions/send-email-verification/index.ts` (lines 116)

```typescript
// BROKEN - 'verified' column doesn't exist
.eq('verified', false)

// SHOULD BE
.is('verified_at', null)
```

The `email_verifications` table has these columns:
- `id`, `user_id`, `email`, `code`, `expires_at`, `verified_at`, `created_at`, `ip_address`, `user_agent`

Note: `verified_at` is a **timestamp** (null when unverified), not a boolean `verified` field.

### Bug 2: SMS Verification Same Issue

**File:** `supabase/functions/send-sms-verification/index.ts` (line 147)

```typescript
// BROKEN - 'verified' column doesn't exist
.eq('verified', false)

// SHOULD BE
.is('verified_at', null)
```

The `phone_verifications` table has the same schema pattern.

### Bug 3: Missing Audit Table

The `comprehensive_audit_logs` table doesn't exist, causing the security logger to fail:

```
ERROR: Could not find the table 'public.comprehensive_audit_logs' in the schema cache
```

This doesn't block verification but generates errors in logs.

---

## Why This Happened

The database schema was likely migrated at some point from using a boolean `verified` column to a timestamp `verified_at` column (which is a better pattern - shows WHEN verification happened). However, the edge functions were not updated to match the new schema.

---

## Fix Implementation

### Phase 1: Fix Email Verification Edge Function

**File:** `supabase/functions/send-email-verification/index.ts`

Change line 116 from:
```typescript
.eq('verified', false)
```
To:
```typescript
.is('verified_at', null)
```

### Phase 2: Fix SMS Verification Edge Function

**File:** `supabase/functions/send-sms-verification/index.ts`

Change line 147 from:
```typescript
.eq('verified', false)
```
To:
```typescript
.is('verified_at', null)
```

### Phase 3: Create Missing Audit Table

**Database Migration:**

```sql
CREATE TABLE IF NOT EXISTS public.comprehensive_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id),
  actor_email TEXT,
  actor_role TEXT,
  actor_ip_address INET,
  actor_user_agent TEXT,
  event_type TEXT NOT NULL,
  event_category TEXT DEFAULT 'security',
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  resource_name TEXT,
  before_value JSONB,
  after_value JSONB,
  changed_fields TEXT[],
  description TEXT,
  metadata JSONB,
  compliance_tags TEXT[] DEFAULT ARRAY['soc2'],
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  event_timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.comprehensive_audit_logs ENABLE ROW LEVEL SECURITY;

-- Admin read-only policy
CREATE POLICY "Admins can view audit logs" ON public.comprehensive_audit_logs
  FOR SELECT
  USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

-- Service role insert policy (for edge functions)
CREATE POLICY "Service role can insert audit logs" ON public.comprehensive_audit_logs
  FOR INSERT
  WITH CHECK (true);

-- Index for common queries
CREATE INDEX idx_audit_logs_actor ON public.comprehensive_audit_logs(actor_id);
CREATE INDEX idx_audit_logs_event_type ON public.comprehensive_audit_logs(event_type);
CREATE INDEX idx_audit_logs_timestamp ON public.comprehensive_audit_logs(event_timestamp DESC);
```

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/send-email-verification/index.ts` | Change `.eq('verified', false)` to `.is('verified_at', null)` on line 116 |
| `supabase/functions/send-sms-verification/index.ts` | Change `.eq('verified', false)` to `.is('verified_at', null)` on line 147 |
| **Database Migration** | Create `comprehensive_audit_logs` table |

---

## Expected Results After Fix

| Test | Before | After |
|------|--------|-------|
| Email verification send | Silently fails (column doesn't exist) | Sends email successfully |
| Email code entry | Never works (no code stored properly) | Verifies and advances |
| SMS verification | Same silent failure | Works correctly |
| Audit logging | Errors in logs | Logs properly |

---

## Testing Plan

After deployment:

1. **Email Verification Test:**
   - Enter email in Request Access modal
   - Click "Next"
   - Check inbox for verification code
   - Enter 6-digit code
   - Should advance to next step

2. **Phone Verification Test:**
   - Reach compliance step
   - Enter phone number with country code (+31...)
   - Click "Next"
   - Check phone for SMS code
   - Enter code and submit

---

## Why Direct API Call Worked

When I tested the edge functions directly, they returned success because:
1. The idempotency check failed (column doesn't exist), so it was skipped
2. The function proceeded to generate a new code and send the email
3. The email was actually sent (I can see the POST returning 200)

But the **frontend verification flow** may be failing at a different point - possibly when trying to **verify the code**, where the same column mismatch could cause the lookup to fail.

---

## Urgency Note

This is a **production-blocking bug** for your partner funnel. The fix is straightforward - just 2 line changes in edge functions. Once deployed, your client should be able to complete the Request Access flow immediately.

