
# Full Audit: Request Access Flow, SMS Verification, and User Generation Stability

## Executive Summary

After thorough investigation, I've identified **5 critical issues** affecting the authentication flow, SMS verification, and user generation stability. The "2FA error" you're experiencing is likely related to JWT token issues and database schema mismatches, not the SMS OTP system itself.

---

## Audit Findings

### Issue 1: Build Errors - Missing MediaPipe Type Declarations (Critical)

**Status:** Blocking deployment

The Phase 2 Capacitor cleanup inadvertently left the `useVirtualBackground.ts` hook with missing dependencies.

**Current Problem:**
```typescript
// src/hooks/useVirtualBackground.ts
type SelfieSegmentationType = import('@mediapipe/selfie_segmentation').SelfieSegmentation;
type CameraType = import('@mediapipe/camera_utils').Camera;
```

These packages were never installed, causing TypeScript errors.

**Fix:** Convert to dynamic-import-only pattern with no compile-time type dependencies.

---

### Issue 2: Database Schema Mismatches (High)

**Status:** Causing runtime errors

Two tables have missing columns referenced by application code:
- `user_activity_tracking.action_type` does not exist
- `performance_metrics.metric_name` does not exist

**Evidence from postgres_logs:**
```
column user_activity_tracking.action_type does not exist (21+ occurrences)
column performance_metrics.metric_name does not exist (1+ occurrences)
```

**Fix:** Add missing columns via database migration.

---

### Issue 3: RLS Policy Blocking Error Logs (High)

**Status:** Silent failures

The `error_logs` table has RLS policies blocking inserts from anonymous or service contexts.

**Evidence:**
```
new row violates row-level security policy for table "error_logs" (10+ occurrences)
```

**Fix:** Update RLS to allow service role inserts with appropriate audit policy.

---

### Issue 4: JWT Token Issues - "Missing Sub Claim" (Medium)

**Status:** Causing auth failures for health checks

Multiple auth errors showing:
```
403: invalid claim: missing sub claim
```

**Root Cause:** External health monitoring services (IP addresses 3.68.66.14, 18.159.248.175, etc.) hitting `/user` endpoint with invalid/empty tokens.

**Fix:** This is expected behavior for health checks; no code change needed but should be documented.

---

### Issue 5: SMS Verification Flow Architecture (Medium)

**Current State:** The SMS flow works correctly for authenticated users.

**Flows Identified:**
1. **Request Access (InviteGate.tsx)** - Just submits to waitlist table, no SMS
2. **Request Access (EnhancedInviteGate.tsx)** - Same, waitlist only
3. **OAuth Onboarding (OAuthOnboarding.tsx)** - Uses SMS OTP correctly
4. **User Settings (UserSettings.tsx)** - Uses SMS OTP correctly
5. **Profile Settings (ProfileSettings.tsx)** - Uses SMS OTP correctly

**Key Finding:** The "Request Access" button does NOT trigger SMS verification - it submits a waitlist application. If you're expecting 2FA here, it's not currently implemented.

---

## Implementation Plan

### Phase 1: Fix Build Errors (Immediate)

**File: `src/hooks/useVirtualBackground.ts`**
- Remove compile-time type imports
- Use inline type definitions for dynamic imports
- Keep the lazy-loading pattern intact

### Phase 2: Database Schema Fixes

**Migration Required:**
```sql
-- Add missing columns
ALTER TABLE user_activity_tracking ADD COLUMN IF NOT EXISTS action_type TEXT;
ALTER TABLE performance_metrics ADD COLUMN IF NOT EXISTS metric_name TEXT;

-- Fix error_logs RLS
ALTER POLICY "error_logs_insert_policy" ON error_logs
USING (true) WITH CHECK (true);
```

### Phase 3: Holistic User Generation Stability

**Current Problems:**
1. Profile creation can fail silently due to RLS
2. Error logging fails, hiding root causes
3. Missing columns cause silent errors in activity tracking

**Solutions:**
1. Add comprehensive try-catch with fallback error reporting
2. Create audit trail for failed user generation attempts
3. Add health check endpoint that bypasses auth

### Phase 4: Optional - Add SMS to Request Access

If you want SMS verification for the "Request Access" flow:

1. Modify `EnhancedInviteGate.tsx` to include phone verification step
2. Add phone field as required before form submission
3. Call `send-sms-verification` edge function
4. Verify OTP before allowing waitlist submission

---

## Files to be Modified

| File | Action | Priority |
|------|--------|----------|
| `src/hooks/useVirtualBackground.ts` | Fix type imports | Critical |
| Database migration | Add missing columns | High |
| `error_logs` RLS policy | Allow service inserts | High |
| `src/components/landing/EnhancedInviteGate.tsx` | Optional: Add phone verification | Medium |

---

## Root Cause Summary

The "2FA error" you mentioned is most likely:
1. **NOT** the SMS OTP system (which is working)
2. **LIKELY** the database errors cascading (missing columns, RLS blocks)
3. **POSSIBLY** confusion with the MFA (authenticator app) flow in TwoFactorSettings.tsx

The "crashes after some time" is caused by:
1. Accumulated RLS violations on `error_logs`
2. Missing columns breaking activity tracking
3. Silent failures masking the actual issues

---

## Technical Implementation Details

### Fix 1: useVirtualBackground.ts Type Safety

Replace lines 1-7 with:
```typescript
import { useEffect, useRef, useState } from 'react';
import { logger } from '@/lib/logger';

// No compile-time imports - all dynamic
interface SelfieSegmentationResults {
  segmentationMask: HTMLCanvasElement;
  image: HTMLVideoElement;
}

interface SelfieSegmentationOptions {
  locateFile: (file: string) => string;
}
```

### Fix 2: Database Migration

Add the missing columns and fix RLS:
```sql
-- user_activity_tracking
ALTER TABLE user_activity_tracking 
ADD COLUMN IF NOT EXISTS action_type TEXT DEFAULT 'page_view';

-- performance_metrics  
ALTER TABLE performance_metrics 
ADD COLUMN IF NOT EXISTS metric_name TEXT;

-- error_logs RLS fix
DROP POLICY IF EXISTS "Allow service role to insert error_logs" ON error_logs;
CREATE POLICY "Allow any insert to error_logs" ON error_logs
FOR INSERT WITH CHECK (true);
```

### Fix 3: Enhanced Error Handling

Add defensive patterns to user generation to prevent "crashes":
```typescript
try {
  // User generation logic
} catch (error) {
  // Fallback error logging that bypasses RLS
  console.error('[Critical] User generation failed:', error);
  // Store in localStorage as backup
  localStorage.setItem('last_generation_error', JSON.stringify({
    timestamp: Date.now(),
    error: String(error)
  }));
}
```
