

# Fix Nick's Account — Clear Stuck `force_password_change` Flag

## What's Blocking Nick

Nick's auth metadata has `force_password_change: true` permanently stuck. Here's what happens every time he logs in:

1. Auth.tsx detects he's a partner → sends to `/home`
2. ProtectedRoute sees `force_password_change: true` → redirects to `/partner-setup`
3. PartnerSetup makes him redo the full setup (password, profile, team)
4. At the final step, `handleCompleteSetup` tries to clear the flag **client-side** via `supabase.auth.updateUser()` — but this call likely fails silently (stale token, race condition), so the flag stays `true`
5. Next login → same loop. He tried "Forgot Password" out of frustration → "Invalid Reset Token" because the token was already consumed.

**Root cause**: The `force_password_change` flag is only cleared client-side at the very end of a multi-step wizard. If that single call fails, there's no retry, no server-side fallback, and no way out.

## Fix (3 parts)

### 1. Immediate fix — Edge function to unblock Nick right now

Create `admin-fix-user-metadata` edge function that uses `auth.admin.updateUserById()` to set `force_password_change: false` for a given user ID. Deploy it, invoke it for Nick (`31f473b9-18e0-4b3b-bfde-398ea2c5078a`), confirm it worked. This edge function stays — it's a useful admin recovery tool.

### 2. Permanent fix — Server-side flag clearing in PartnerSetup

Create `session-change-password` edge function:
- Accepts the user's JWT + new password
- Uses admin API to update the password AND clear `force_password_change: false` atomically
- Returns success/failure

Update `handleSetPassword` in `PartnerSetup.tsx` to call this edge function instead of `supabase.auth.updateUser({ password })`. The flag gets cleared at the password step (step 1), not the final step (step 3). If a partner completes the password step, they're already unblocked even if they abandon the rest of the wizard.

### 3. Safety net — Retry in `handleCompleteSetup`

Keep the existing client-side `updateUser({ data: { force_password_change: false } })` in `handleCompleteSetup` as a backup, but add a retry: if it fails, call the edge function as fallback.

## Files

| File | Change |
|------|--------|
| `supabase/functions/admin-fix-user-metadata/index.ts` | **NEW** — admin API to clear metadata flags by user ID (admin-only, JWT verified) |
| `supabase/functions/session-change-password/index.ts` | **NEW** — sets password + clears `force_password_change` server-side atomically |
| `src/pages/PartnerSetup.tsx` | Call `session-change-password` in `handleSetPassword`; add edge function fallback in `handleCompleteSetup` |
| `src/pages/ChangePassword.tsx` | Also use `session-change-password` for non-partner forced resets |

## After This, Nick's Path

1. We invoke `admin-fix-user-metadata` → flag cleared immediately
2. Nick logs in → Auth.tsx → `/home` → ProtectedRoute → no `force_password_change` → he's in
3. Future partners: flag cleared at password step via server-side edge function — no more stuck accounts

