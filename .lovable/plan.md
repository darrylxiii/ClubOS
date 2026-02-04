
# Stability Audit: Two Critical Issues Found

## Issue Summary

You're experiencing two distinct problems:

### 1. Application Startup Crash (livekit-client error)
The app crashes on startup with "Failed to resolve module specifier 'livekit-client'" because a voice assistant component is loaded on every page.

### 2. Member Approval Error (duplicate key violation)
When approving Vinay Sharma, you get "Profile creation failed: duplicate key value violates unique constraint 'unique_email_when_present'" because the system tries to create a candidate profile that already exists.

---

## Root Cause Analysis

### Issue 1: LiveKit Startup Crash

**Chain of imports causing the crash:**
```text
AppLayout.tsx (line 23)
  → imports ClubAIVoice.tsx
    → imports useClubAIVoice.ts
      → imports from '@elevenlabs/react' (line 2)
        → @elevenlabs/react depends on 'livekit-client'
          → Module resolution fails at startup
```

The `ClubAIVoice` component (the voice assistant FAB button) is rendered in `AppLayout.tsx` on every protected page. This triggers a static import chain that loads `@elevenlabs/react`, which internally depends on `livekit-client`.

### Issue 2: Member Approval Duplicate Key

**Data state discovered:**
- User profile exists: `id: 367325d4-1ce6-497a-b73b-ac57859508cd` (email: vinaysharma14978@gmail.com)
- Candidate profile already exists: `id: 79655828-a3e3-4564-9062-2d8f1fa95bcf` with `user_id: 367325d4-1ce6-497a-b73b-ac57859508cd`
- User is already approved (`account_status: approved`)

**Code gap:** The `createCandidateFromRequest` function (lines 77-120 in memberApprovalService.ts) does NOT check for existing candidates before inserting, unlike `autoCreateCandidateProfile` (lines 125-209) which properly checks both by `user_id` and by `email`.

---

## Technical Details

### Fix 1: Lazy Load ClubAIVoice in AppLayout

Convert the static import of `ClubAIVoice` to a dynamic lazy import with Suspense.

**File:** `src/components/AppLayout.tsx`

**Current (line 23):**
```typescript
import { ClubAIVoice } from "@/components/voice/ClubAIVoice";
```

**Fixed:**
```typescript
import { lazy, Suspense } from "react";

// Lazy load ClubAIVoice to prevent livekit-client resolution at startup
const ClubAIVoice = lazy(() => 
  import("@/components/voice/ClubAIVoice").then(m => ({ default: m.ClubAIVoice }))
);
```

**Render change (line 217):**
```typescript
// Wrap in Suspense with empty fallback (FAB can load async)
<Suspense fallback={null}>
  <ClubAIVoice />
</Suspense>
```

### Fix 2: Add Duplicate Check to createCandidateFromRequest

Add the same deduplication logic that exists in `autoCreateCandidateProfile`.

**File:** `src/services/memberApprovalService.ts`

**Updated createCandidateFromRequest function:**
```typescript
async createCandidateFromRequest(
  requestData: CandidateProfileData,
  userId: string
): Promise<string | null> {
  try {
    // Check 1: By user_id (prevents duplicate for same user)
    const { data: existingByUserId } = await supabase
      .from('candidate_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingByUserId) {
      console.log('[MemberApproval] Candidate already exists by user_id:', existingByUserId.id);
      return existingByUserId.id;
    }

    // Check 2: By email (prevents unique_email_when_present violation)
    if (requestData.email) {
      const { data: existingByEmail } = await supabase
        .from('candidate_profiles')
        .select('id, user_id')
        .eq('email', requestData.email)
        .maybeSingle();

      if (existingByEmail) {
        // Link existing candidate to this user if not already linked
        if (!existingByEmail.user_id) {
          const { error: linkError } = await supabase
            .from('candidate_profiles')
            .update({ user_id: userId })
            .eq('id', existingByEmail.id);
          
          if (linkError) {
            console.error('[MemberApproval] Failed to link candidate:', linkError);
          } else {
            console.log('[MemberApproval] Linked existing candidate to user:', existingByEmail.id);
          }
        } else {
          console.log('[MemberApproval] Candidate already exists by email (already linked):', existingByEmail.id);
        }
        return existingByEmail.id;
      }
    }

    // No existing candidate found - proceed with insert
    const insertData = {
      user_id: userId,
      full_name: requestData.full_name,
      email: requestData.email,
      // ... rest of fields
    };

    const { data, error } = await supabase
      .from('candidate_profiles')
      .insert(insertData)
      .select('id')
      .single();

    if (error) {
      console.error('[MemberApproval] Create candidate error:', error);
      throw error;
    }
    
    return data?.id || null;
  } catch (error) {
    console.error('Error creating candidate profile:', error);
    throw error;
  }
}
```

---

## Files to Modify

| File | Change | Impact |
|------|--------|--------|
| `src/components/AppLayout.tsx` | Lazy load ClubAIVoice | Fixes startup crash |
| `src/services/memberApprovalService.ts` | Add duplicate check | Fixes approval error |

---

## Data Cleanup Note

For Vinay Sharma specifically, no cleanup is needed - the candidate profile already exists and is linked to the user. The system was failing because it tried to create a duplicate. Once the fix is applied, re-approving will work correctly by returning the existing candidate ID instead of inserting.

---

## Expected Outcome

After these fixes:
1. The application will start without the livekit-client module resolution error
2. Member approvals will gracefully handle existing candidate profiles by linking rather than duplicating
3. The ClubAI voice assistant will still work, just loaded asynchronously when needed
