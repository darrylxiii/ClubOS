

# Partner Provisioning Audit -- Current Score: 88/100

## Scorecard

| Category | Weight | Current | Target | Issue |
|---|---|---|---|---|
| Core Provisioning (provision-partner) | 20 | 19/20 | 20/20 | Solid, one minor bug |
| Core Provisioning (approve-partner-request) | 15 | 14/15 | 15/15 | Solid, one minor bug |
| Auth and Authorization | 15 | 15/15 | 15/15 | Both verify JWT + admin role |
| Error Handling and Rollback | 10 | 9/10 | 10/10 | Good, audit log can silently fail |
| Client-Side Error Handling | 5 | 5/5 | 5/5 | Done |
| Welcome Email Integration | 5 | 5/5 | 5/5 | send-partner-welcome deleted, inline Resend |
| Input Validation | 5 | 5/5 | 5/5 | Length limits, format checks |
| Audit Logging | 5 | 3/5 | 5/5 | BUG: "unknown" crashes inet column |
| Idempotency | 5 | 5/5 | 5/5 | Solid |
| Data Integrity (DB) | 5 | 4/5 | 5/5 | Bad pending data will crash approvals |
| Dead Code | 5 | 4/5 | 5/5 | resendWelcomeEmail is a TODO stub |
| Production Evidence | 5 | 0/5 | 5/5 | Still zero successful provisions |

**Total: 88/100**

---

## Remaining Issues (8 items)

### 1. Audit Log Insert Crashes on Missing IP (MEDIUM -- affects BOTH functions)

Both `provision-partner` (line 567) and `approve-partner-request` (line 403) write:

```typescript
actor_ip_address: req.headers.get('x-forwarded-for') || 'unknown',
```

The `actor_ip_address` column is type `inet` in Postgres. The string `"unknown"` is **not a valid inet value** and will cause the audit log insert to fail silently on every call where `x-forwarded-for` is absent. Additionally, `x-forwarded-for` can contain multiple IPs (e.g., `"1.2.3.4, 5.6.7.8"`), which is also invalid inet.

**Fix**: Extract only the first IP, and fall back to `null` (not `"unknown"`):

```typescript
const rawIp = req.headers.get('x-forwarded-for');
const actorIp = rawIp ? rawIp.split(',')[0].trim() : null;
```

### 2. Decline Flow Missing Audit Trail (LOW)

`AdminPartnerRequestsTab.handleDecline` updates `status` to `"declined"` but does not set `reviewed_by` or `reviewed_at` on the `partner_requests` row. These columns exist and are used by the approve flow.

**Fix**: Include `reviewed_by` and `reviewed_at` in the decline update. This requires fetching the current user's ID.

### 3. `resendWelcomeEmail` is a TODO Stub (LOW)

`usePartnerProvisioning.ts` line 113-116 shows a `resendWelcomeEmail` function that does nothing but show a toast saying "coming soon." If this is exposed in the UI, it's a broken button.

**Fix**: Remove the stub entirely or implement it by invoking `provision-partner`'s magic link + email logic via a dedicated edge function. For now, removing the stub is cleaner.

### 4. Dirty Pending Data (LOW -- data quality)

Six pending requests exist, two of which have invalid emails:
- `darryl@` (no domain)
- `test` (not an email at all)

If an admin tries to approve these, the auth user creation will fail and return an error. The function handles this gracefully (returns 400), but it's confusing for the admin. These should be cleaned up or auto-declined.

**Fix**: Add a migration to decline the two invalid requests with a `decline_reason`.

### 5. `send-partner-welcome` Still in config.toml (COSMETIC)

Line 3-4 of `config.toml` shows `[functions.send-test-email]` -- this is fine, it's a different function. But let me confirm there's no stale `send-partner-welcome` entry. (Verified: there is none -- the deletion was clean.)

No action needed.

---

## Implementation Plan

### Phase 1: Fix the Audit Log Bug (both functions)

**File: `supabase/functions/provision-partner/index.ts`** (line 567)
- Replace `req.headers.get('x-forwarded-for') || 'unknown'` with proper IP extraction that returns `null` for missing/invalid values
- Same fix for `actor_user_agent` -- keep as-is (text type accepts "unknown")

**File: `supabase/functions/approve-partner-request/index.ts`** (line 403)
- Same IP extraction fix

### Phase 2: Decline Flow Audit Trail

**File: `src/components/admin/AdminPartnerRequestsTab.tsx`**
- In `handleDecline`, fetch the current user and include `reviewed_by` and `reviewed_at` in the update

### Phase 3: Clean Up Dead Code

**File: `src/hooks/usePartnerProvisioning.ts`**
- Remove the `resendWelcomeEmail` stub (or keep but mark as not-implemented -- depends on whether it's referenced in UI)

### Phase 4: Data Cleanup Migration

**New migration**:
```sql
UPDATE partner_requests
SET status = 'declined',
    decline_reason = 'Invalid email address',
    reviewed_at = now()
WHERE status = 'pending'
  AND (contact_email !~ '^[^@]+@[^@]+\.[^@]+$');
```

### Phase 5: Deploy and Test

- Redeploy `provision-partner` and `approve-partner-request`
- Run an end-to-end test by approving one of the valid pending requests

### Files to modify:
- `supabase/functions/provision-partner/index.ts` -- Fix inet IP extraction (2 lines)
- `supabase/functions/approve-partner-request/index.ts` -- Fix inet IP extraction (2 lines)
- `src/components/admin/AdminPartnerRequestsTab.tsx` -- Add reviewed_by/reviewed_at to decline flow
- `src/hooks/usePartnerProvisioning.ts` -- Remove resendWelcomeEmail stub
- New DB migration: Decline invalid pending requests

### Edge function deployments needed:
- `approve-partner-request`
- `provision-partner`

