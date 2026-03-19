

# Deep Audit: "Add to Job" Feature — Account Linking & Visibility Gap

## Critical Finding: Candidates Will NEVER See Admin-Sourced Applications

The entire "Add to Job" feature has a **fatal data visibility bug**. When an admin adds an existing `candidate_profiles` record to a job, the `applications` row is created with:
- `user_id: null`
- `candidate_id: <candidate_profiles.id>`

When that candidate later signs up (or already has an account), the candidate dashboard queries use this pattern across **8+ files**:

```
.or(`user_id.eq.${user.id},candidate_id.eq.${user.id}`)
```

But `user.id` is the **auth user UUID** and `candidate_id` is a FK to `candidate_profiles.id` — a completely different UUID. These will **never match** unless the candidate profile's `.id` happens to equal the auth user's `.id`, which it won't.

This means:
- PipelineSnapshot shows 0 applications
- ApplicationActivityFeed shows nothing
- ApplicationDetail returns null
- InterviewPrep finds no applications
- Applications page shows empty state
- NextBestActionCard thinks they have no applications
- UpcomingMeetingsWidget misses linked bookings

---

## Root Cause: No Account Linking Pipeline

1. **`handle_new_user` trigger** creates a `profiles` row but does NOT link to `candidate_profiles` — no email-matching logic exists
2. **`consume-invite` edge function** handles invite codes but doesn't link candidate profiles
3. **`send-candidate-invitation`** edge function doesn't exist yet (referenced in CandidateInvitationDialog)
4. **`memberApprovalService.ts`** is the ONLY place that links `candidate_profiles.user_id` to auth users (by email match), but it only runs during member approval — not regular signup

---

## Plan to Fix (to reach 100/100)

### 1. Database: Add account-linking trigger on signup

**New migration** — Enhance `handle_new_user()` to auto-link candidate profiles by email:

```sql
-- After profile creation, link any orphan candidate_profiles
UPDATE public.candidate_profiles
SET user_id = new.id
WHERE email = new.email
  AND user_id IS NULL
  AND deleted_at IS NULL;
```

This ensures that when a candidate signs up, any profiles previously created by admins get their `user_id` populated.

### 2. Database: Add trigger to backfill `applications.user_id`

When `candidate_profiles.user_id` gets set (linked), auto-populate `applications.user_id` for all applications referencing that candidate:

```sql
CREATE OR REPLACE FUNCTION public.sync_application_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND (OLD.user_id IS NULL OR OLD.user_id != NEW.user_id) THEN
    UPDATE public.applications
    SET user_id = NEW.user_id
    WHERE candidate_id = NEW.id
      AND user_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

This is the simplest fix — it makes the existing `.or(user_id.eq.${userId},candidate_id.eq.${userId})` queries work because `user_id` gets populated.

### 3. Fix the query pattern in `useApplications.ts` (belt + suspenders)

Change the query to resolve the candidate profile first, then use both IDs:

```typescript
// First get candidate_profiles.id for this user
const { data: cp } = await supabase
  .from('candidate_profiles')
  .select('id')
  .eq('user_id', userId)
  .maybeSingle();

const candidateProfileId = cp?.id;
const orFilter = candidateProfileId
  ? `user_id.eq.${userId},candidate_id.eq.${candidateProfileId}`
  : `user_id.eq.${userId}`;

// Then query applications with correct IDs
```

Apply this same fix to all 8 affected files:
- `src/hooks/useApplications.ts`
- `src/components/clubhome/ApplicationActivityFeed.tsx`
- `src/pages/ApplicationDetail.tsx`
- `src/pages/InterviewPrep.tsx`
- `src/components/clubhome/NextBestActionCard.tsx`
- `src/components/clubhome/UpcomingMeetingsWidget.tsx`
- `src/pages/Applications.tsx`
- `src/components/candidate/ApplicationStatusTracker.tsx`

### 4. Fix `AddToJobDialog.tsx` — populate `user_id` when candidate has an account

When adding an existing candidate who already has `user_id` set on their `candidate_profiles`, the applications insert should include that `user_id`:

```typescript
// Fetch candidate's user_id before inserting
const { data: cpData } = await supabase
  .from('candidate_profiles')
  .select('user_id')
  .eq('id', candidateId)
  .maybeSingle();

// Then in the insert:
user_id: cpData?.user_id || null,
```

Same fix needed in `AddCandidateDialog.tsx` for the "existing" flow.

### 5. Create `send-candidate-invitation` edge function

Currently referenced but doesn't exist. This function should:
- Generate an invite code linked to the `candidate_profiles.id`
- Send email via Resend
- On signup, the consume flow should link `candidate_profiles.user_id`

### 6. Add a `useCandidateProfileId` shared hook

Extract the "resolve candidate_profiles.id from auth user_id" pattern into a reusable hook to prevent inconsistency:

```typescript
export function useCandidateProfileId(userId: string | undefined) {
  return useQuery({
    queryKey: ['candidate-profile-id', userId],
    queryFn: async () => { /* ... */ },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
```

---

## Files Summary

| File | Action |
|------|--------|
| **New migration** | Add candidate linking in `handle_new_user`, add `sync_application_user_id` trigger |
| `src/components/partner/AddToJobDialog.tsx` | Fetch and populate `user_id` from candidate_profiles |
| `src/components/partner/AddCandidateDialog.tsx` | Same — populate `user_id` for existing candidates |
| `src/hooks/useApplications.ts` | Fix query to resolve `candidate_profiles.id` first |
| `src/components/clubhome/ApplicationActivityFeed.tsx` | Fix same query pattern |
| `src/pages/ApplicationDetail.tsx` | Fix same query pattern |
| `src/pages/InterviewPrep.tsx` | Fix same query pattern |
| `src/components/clubhome/NextBestActionCard.tsx` | Fix same query pattern |
| `src/components/clubhome/UpcomingMeetingsWidget.tsx` | Fix same query pattern |
| `src/pages/Applications.tsx` | Fix same query pattern |
| `src/components/candidate/ApplicationStatusTracker.tsx` | Fix same query pattern |
| `src/hooks/useCandidateProfileId.ts` | **NEW** — shared hook for resolving candidate profile ID |
| `supabase/functions/send-candidate-invitation/index.ts` | **NEW** — invitation edge function |

