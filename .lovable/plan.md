

# Audit: Partner Approval Flow — Enterprise Readiness

## Critical Bugs Found (2 blockers, 1 high)

### BUG 1 — BLOCKER: No `force_password_change` metadata
**File:** `supabase/functions/approve-partner-request/index.ts` line 108
**Issue:** User is created without `force_password_change: true`. Compare with `provision-partner` (line 206) which sets it correctly.
**Impact:** Partner clicks magic link → lands in the app → session expires → **cannot log back in** (no password set, no way to set one).
**Fix:** Add `force_password_change: true` to `user_metadata` at line 108.

### BUG 2 — BLOCKER: No `account_status` set to `'active'`
**File:** `supabase/functions/approve-partner-request/index.ts` line 212-224
**Issue:** Profile update sets `full_name`, `phone`, `provisioned_by`, `provisioned_at` — but **never sets `account_status`**. The default is `NULL`, which `ProtectedRoute` coalesces to `'pending'` (line 58: `|| 'pending'`).
**Impact:** Partner clicks magic link → authenticates → `ProtectedRoute` sees `account_status = pending` → **redirected to `/pending-approval` forever**. They can never access the app.
**Fix:** Add `account_status: 'active'` to the profile update at line 214. Compare with `provision-partner` line 315 which correctly sets `account_status: 'active'`.

### BUG 3 — HIGH: Magic link redirects to `/partner-welcome` instead of `/partner-setup`
**File:** `supabase/functions/approve-partner-request/index.ts` line 266
**Issue:** `redirectTo: \`\${siteUrl}/partner-welcome\`` — but the password setup flow lives at `/partner-setup`. Even after fixing Bug 1, the partner would land on the welcome page first, then `ProtectedRoute` would redirect them to `/partner-setup` on next navigation — an unnecessary extra hop and confusing UX.
**Fix:** Change redirect to `\`\${siteUrl}/partner-setup\`` to match `provision-partner` behavior.

---

## Order of Operations After Fix

The corrected flow will be:

```text
Admin clicks "Approve"
  → Edge function creates auth user with force_password_change: true
  → Sets account_status: 'active' on profile
  → Generates magic link → /partner-setup
  → Sends welcome email with magic link

Partner clicks magic link in email
  → Authenticates (session created)
  → ProtectedRoute: account_status = 'active' ✓
  → ProtectedRoute: force_password_change = true → redirect /partner-setup
  → Partner sets password (12+ chars, HIBP check)
  → Partner optionally adds LinkedIn + avatar
  → Complete → force_password_change cleared → onboarding_completed_at set
  → Redirected to /partner-welcome (concierge page)
  → Partner can now log in with email + password forever
```

## Implementation

### Single file change: `supabase/functions/approve-partner-request/index.ts`

**Change 1** — Line 108, add `force_password_change: true` to user_metadata:
```typescript
user_metadata: {
  full_name: request.contact_name,
  phone: request.contact_phone,
  provisioned_by_admin: true,
  provisioned_at: new Date().toISOString(),
  force_password_change: true,  // ← ADD
},
```

**Change 2** — Line 214, add `account_status: 'active'` to profile update:
```typescript
.update({
  full_name: request.contact_name,
  phone: request.contact_phone,
  provisioned_by: adminUser.id,
  provisioned_at: new Date().toISOString(),
  account_status: 'active',  // ← ADD
})
```

**Change 3** — Line 266, change redirect from `/partner-welcome` to `/partner-setup`:
```typescript
options: { redirectTo: `${siteUrl}/partner-setup` },  // ← CHANGE
```

All three changes are in the same edge function. No frontend changes needed — `ProtectedRoute` and `PartnerSetup` already handle the flow correctly once the metadata is set properly.

