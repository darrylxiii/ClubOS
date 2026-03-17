

# Audit & Revised Plan: Partner Password Bug + Account Flow

## Bug: Timo's Password Error

**Root cause confirmed.** `PartnerSetup.tsx` line 79 calls:
```typescript
supabase.functions.invoke('password-reset-set-password', { body: { password } })
```
But the edge function expects `{ token, new_password, confirm_password }` (Zod schema, line 5-9). Since `token` is missing, Zod validation fails **every single time** with "Invalid request format."

**Fix:** Replace with `supabase.auth.updateUser({ password })`. The partner already has an active session (arrived via magic link), so this is the correct API. Supabase Auth enforces password strength server-side. The HIBP check and password history from the edge function won't apply, but the built-in breach detection covers the critical case.

---

## Flow Problem: Empty Partner Accounts

The `approve-partner-request` edge function has a conditional on line 247:
```typescript
if (companyId) { /* insert company_members */ }
```
If the admin approves without selecting/creating a company (or the `companyId` is null), the partner gets approved with **no company linked**. When they log in, their dashboard is empty — no jobs, no pipeline, no data.

**Fix:** Make company assignment **mandatory** in the approval flow. The edge function should return a 400 error if `companyId` is null after the company resolution step. The frontend `MemberApprovalWorkflowDialog` should already enforce this via the `CompanySelectionStep`, but we need a server-side guard as a safety net.

---

## Flow Problem: PendingApproval UX

Current issues:
1. **30-second polling** — slow feedback when admin approves. User may sit for up to 30s staring at "Under Review."
2. **No role awareness** — shows `CandidateApplicationTracker` for everyone, including partners.
3. **No user context** — doesn't greet the user by name or show what they're waiting for.

---

## Implementation Plan

### 1. Fix PartnerSetup password (bug fix)
**File:** `src/pages/PartnerSetup.tsx`
- Replace lines 79-81 (`supabase.functions.invoke(...)`) with:
  ```typescript
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  ```
- Keep the existing Zod validation + confirmation match check on the client side
- Remove the edge function error code handling (`data.code === 'weak_password'` etc.) since `updateUser` throws `AuthError` directly — catch and display `error.message`

### 2. Guard: require company on partner approval
**File:** `supabase/functions/approve-partner-request/index.ts`
- After the company resolution block (line ~203), add:
  ```typescript
  if (!companyId) {
    await rollbackUser("No company assigned");
    return jsonResponse({ error: "A company must be assigned to approve a partner" }, 400);
  }
  ```
- This prevents "empty" partner accounts from ever being created

### 3. Upgrade PendingApproval page
**File:** `src/pages/PendingApproval.tsx`
- Add **realtime subscription** on `profiles` table filtered by user ID, listening for `account_status` changes — instant redirect on approval instead of 30s poll
- Keep polling as fallback (increase interval to 60s since realtime handles the fast path)
- **Role-aware UI**: Fetch user roles. Show `CandidateApplicationTracker` only for candidates. Show a partner-specific message for partners ("Your partnership application is under review")
- **Personalized greeting**: Use `status.full_name` which is already fetched
- Replace `console.error` with `logger.error`

### Files to modify

| File | Change |
|------|--------|
| `src/pages/PartnerSetup.tsx` | Replace edge function call with `supabase.auth.updateUser` |
| `supabase/functions/approve-partner-request/index.ts` | Add company-required guard |
| `src/pages/PendingApproval.tsx` | Realtime subscription, role-aware UI, personalized greeting |

