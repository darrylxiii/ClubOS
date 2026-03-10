

# MFA Setup Audit & Fix

## Current Score: 25/100

| Area | Score | Issue |
|------|-------|-------|
| **Error recovery** | 0/10 | If `mfa.enroll()` fails, step is set to `'enroll'` (loading spinner) with NO way back. User stuck forever. |
| **Stale factor cleanup** | 0/10 | Previous failed attempts leave unverified TOTP factors. Re-enrollment fails with "factor already exists" — no cleanup, no UI to retry. |
| **Session validation** | 2/10 | Page calls `useAuth()` but doesn't verify session is alive before calling MFA APIs. If session expired, enroll silently fails. |
| **Initial loading state** | 3/10 | `checkExisting` runs async but page renders 'intro' immediately — race condition where user can click "Setup" before check completes. |
| **User feedback** | 4/10 | Toast errors exist but are swallowed by the stuck loading spinner. User sees "nothing happens." |
| **Consistency** | 2/10 | `TwoFactorSettings.tsx` (settings page) has better error handling, factor removal, and duplicate detection. `MfaSetup.tsx` (enforcement page) is far weaker. |

## Root Cause of "Button Does Nothing"

1. User clicks "Continue Setup" → `setStep('enroll')` (shows spinner) + `handleEnroll()` runs
2. `handleEnroll` calls `supabase.auth.mfa.enroll()` which **fails** (likely due to existing unverified factor from previous attempt, OR expired session)
3. Error handler shows a toast and returns — but **step stays at `'enroll'`** which renders `<PageLoader />`
4. User sees infinite loading spinner. The toast error may flash behind it or be missed entirely.

## Fixes

### File: `src/pages/MfaSetup.tsx` — Full rewrite of the logic

1. **Add proper loading state for initial check** — show PageLoader until `checkExisting` completes, not 'intro'
2. **Clean up stale unverified factors before enrolling** — unenroll any existing unverified TOTP factors before calling `enroll()`
3. **Fix step state on error** — revert `step` back to `'intro'` in all error paths so user can retry
4. **Validate session before enrollment** — call `supabase.auth.getUser()` to confirm session is alive; if not, redirect to `/auth`
5. **Don't set step to 'enroll' before the call** — call `handleEnroll` first, only advance step on success
6. **Add retry button** on error states instead of infinite spinner

### Specific code changes:

```typescript
// 1. Initial check with proper loading gate
const [initialCheckDone, setInitialCheckDone] = useState(false);

useEffect(() => {
  const checkExisting = async () => {
    // Also clean up stale unverified factors
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = data?.totp?.filter(f => f.status === 'verified') || [];
    if (verified.length > 0) {
      navigate('/dashboard', { replace: true });
      return;
    }
    // Unenroll any stale unverified factors
    const unverified = data?.totp?.filter(f => f.status === 'unverified') || [];
    for (const f of unverified) {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    setInitialCheckDone(true);
  };
  if (user) checkExisting();
}, [user, navigate]);

// 2. Session validation + error recovery in handleEnroll
const handleEnroll = async () => {
  setIsLoading(true);
  try {
    // Validate session is alive
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      toast.error('Session expired. Please sign in again.');
      navigate('/auth', { replace: true });
      return;
    }
    
    // Clean up any stale factors first
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const stale = factors?.totp?.filter(f => f.status === 'unverified') || [];
    for (const f of stale) {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    
    const { data, error } = await supabase.auth.mfa.enroll({...});
    if (error) {
      toast.error('Failed to set up MFA. Please try again.');
      setStep('intro'); // ← CRITICAL: revert on error
      return;
    }
    // Only advance step on success
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setFactorId(data.id);
    setStep('verify');
  } catch (err) {
    toast.error('Something went wrong');
    setStep('intro'); // ← CRITICAL: revert on error
  } finally {
    setIsLoading(false);
  }
};

// 3. Don't render UI until initial check is done
if (!user || !initialCheckDone) return <PageLoader />;
```

### No database changes needed.
### 1 file to edit: `src/pages/MfaSetup.tsx`

