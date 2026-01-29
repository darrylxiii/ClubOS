
# Plan: Fix Onboarding Flow & Pending Approval Routing

## Problems Identified

### Problem 1: Users Logged Out After Account Creation
After completing the onboarding form, the code calls `supabase.auth.signOut()` at line 700 in `CandidateOnboardingSteps.tsx`, then navigates to `/pending-approval`. But `/pending-approval` requires authentication and redirects unauthenticated users to `/auth`.

**Current Flow (Broken):**
```text
User completes form → Account created → signOut() called → Navigate to /pending-approval
                                                                      ↓
                                            /pending-approval checks: no user? → Redirect to /auth
```

### Problem 2: Logged-In Pending Users Not Routed Correctly
When a pending user logs in via `/auth`, they are correctly routed to `/pending-approval` by `ProtectedRoute`. However, if they try to access `/onboarding` again, they should be able to see the pending status page, not restart onboarding.

## Solution

### Fix 1: Remove signOut() After Account Creation

The user should remain logged in after creating their account. This allows them to see the `/pending-approval` page with their application tracker.

**File:** `src/components/candidate-onboarding/CandidateOnboardingSteps.tsx`

```typescript
// REMOVE this line (line 700):
await supabase.auth.signOut();
```

### Fix 2: Make PendingApproval Handle Both Logged-In and Logged-Out States

The `/pending-approval` page should work for:
1. **Logged-in pending users** → Show application tracker with their data
2. **Logged-out users who just submitted** → Show a generic "check your email" message

**File:** `src/pages/PendingApproval.tsx`

Change the redirect logic:
```typescript
const checkApprovalStatus = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Instead of redirecting to auth, show a generic pending message
      setStatus({ 
        account_status: 'pending', 
        account_decline_reason: null, 
        full_name: '' 
      });
      setLoading(false);
      return;
    }
    // ... rest of existing logic
  }
};
```

### Fix 3: Redirect Logged-In Pending Users from /onboarding

If a user tries to access `/onboarding` but is already logged in with a pending account, redirect them to `/pending-approval`.

**File:** `src/pages/CandidateOnboarding.tsx`

Add a useEffect to check if user is already authenticated:
```typescript
useEffect(() => {
  const checkExistingUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_status, onboarding_completed_at')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        if (profile.account_status === 'approved' && profile.onboarding_completed_at) {
          navigate('/home');
        } else {
          navigate('/pending-approval');
        }
      }
    }
  };
  checkExistingUser();
}, []);
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/candidate-onboarding/CandidateOnboardingSteps.tsx` | Remove `signOut()` call after account creation |
| `src/pages/PendingApproval.tsx` | Handle logged-out state gracefully, show generic pending message |
| `src/pages/CandidateOnboarding.tsx` | Add auth check to redirect already-logged-in users |

## Updated Flow After Fix

```text
NEW USER FLOW:
User completes form → Account created → Stay logged in → Navigate to /pending-approval
                                                                      ↓
                                              /pending-approval shows: Application Tracker (personalized)

RETURNING PENDING USER FLOW:
User logs in → ProtectedRoute detects pending status → Redirect to /pending-approval
                                                                      ↓
                                              /pending-approval shows: Application Tracker (personalized)

RETURNING PENDING USER TRIES /onboarding:
User visits /onboarding → Auth check finds user → Redirect to /pending-approval
```

## i18n Additions

Add translation keys for the logged-out pending state message:

**English:**
```json
{
  "pendingApproval": {
    "submittedTitle": "Application Submitted",
    "submittedDescription": "Thank you for applying. Please check your email for confirmation and sign in to track your application status."
  }
}
```

**Dutch:**
```json
{
  "pendingApproval": {
    "submittedTitle": "Aanvraag Ingediend",
    "submittedDescription": "Bedankt voor je aanmelding. Controleer je e-mail voor bevestiging en log in om je aanvraagstatus te volgen."
  }
}
```
