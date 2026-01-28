
# Comprehensive /onboarding Audit Report

## Current Score: 76/100

The onboarding flow has solid core functionality but several issues need addressing to reach 100/100.

---

## Issues Found (Organized by Severity)

### CRITICAL Issues (Blocking - Must Fix) [-15 points]

#### 1. CORS Headers Inconsistency on Edge Functions
**Impact:** Can cause "Failed to fetch" errors intermittently
**Files Affected:**
- `verify-sms-code/index.ts` (line 9-12) - Missing enhanced CORS headers
- `check-email-exists/index.ts` (line 7-9) - Missing enhanced CORS headers

**Current (broken):**
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
```

**Required:**
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-api-version, x-application-name, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, traceparent, tracestate",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Max-Age": "86400",
};
```

#### 2. Hardcoded Strategist ID in Profile Creation
**File:** `CandidateOnboardingSteps.tsx` (line 608)
**Issue:** `assigned_strategist_id: '8b762c96-5dcf-41c8-9e1e-bbf18c18c3c5'` - hardcoded UUID
**Risk:** If this strategist is removed or changes, all new candidates fail assignment

---

### HIGH Priority Issues [-6 points]

#### 3. Phone OTP Input Missing Styling Consistency
**File:** `CandidateOnboardingSteps.tsx` (lines 1243-1256)
**Issue:** Phone OTP input (step 4) lacks the responsive styling that email OTP has
**Current:** No `className="gap-1 sm:gap-2"` on InputOTPGroup
**Fix:** Add same responsive styling as email OTP (lines 837-845)

#### 4. Missing Error Boundary for Resume Upload
**File:** `CandidateOnboardingSteps.tsx` (lines 710-736)
**Issue:** Resume upload errors are caught but toast might not show if component crashes
**Fix:** Wrap in try-catch with explicit error logging

#### 5. funnel_config Query Not Handling Missing Data
**File:** `CandidateOnboarding.tsx` (lines 18-28)
**Issue:** If `funnel_config` table is empty, `.single()` throws error
**Current:** No error handling
**Fix:** Add error handling and default to `isActive = true`

---

### MEDIUM Priority Issues [-3 points]

#### 6. Progress Bar Calculation Off by One
**File:** `CandidateOnboardingSteps.tsx` (line 1440)
**Current:** `style={{ width: \`${(currentStep / 5) * 100}%\` }}`
**Issue:** Should be `/ 6` for 6 steps (0-5), shows 100% at step 5 instead of step 6

#### 7. Location Parsing Edge Case
**File:** `CandidateOnboardingSteps.tsx` (lines 680-698)
**Issue:** `selectedCity.split(", ")` assumes format "City, Country" but LocationAutocomplete can return different formats (e.g., "Amsterdam, North Holland, Netherlands")
**Fix:** Handle multi-part location strings properly

#### 8. Missing aria-labels for Accessibility
**Files:** Multiple form inputs lack proper aria-labels
**Impact:** Screen readers cannot properly describe form fields

---

### LOW Priority Issues (Polish)

#### 9. Console.log Statements in Production
**File:** `CandidateOnboardingSteps.tsx`
**Lines:** 222, 380, 407, 424, 463, 503, 517, 526, 541, 569, 587, 618
**Issue:** Multiple `console.log` statements should use structured logging or be removed

#### 10. Success Screen Redirect Logic
**File:** `CandidateOnboardingSteps.tsx` (lines 632-637)
**Issue:** Shows "Redirecting to your dashboard" but redirects to `/pending-approval`
**Misleading UX:** Copy doesn't match destination

#### 11. Password Step Shows "Profile Completed" Prematurely
**File:** `CandidateOnboardingSteps.tsx` (lines 1356-1362)
**Issue:** Shows "Profile completed" checkmark before account is actually created

---

## Score Breakdown

| Category | Current | Max | Issues |
|----------|---------|-----|--------|
| Core Functionality | 32 | 40 | CORS on 2 edge functions |
| UX/Polish | 18 | 25 | OTP styling, progress bar, copy |
| Security | 13 | 15 | Hardcoded strategist ID |
| Error Handling | 8 | 12 | Missing boundaries, funnel config |
| Accessibility | 5 | 8 | Missing aria-labels |
| **TOTAL** | **76** | **100** | |

---

## Path to 100/100

### Phase 1: Critical Fixes (+15 points)

1. **Update CORS headers** on `verify-sms-code` and `check-email-exists`
2. **Dynamic strategist assignment** - Query available strategists or use system setting

### Phase 2: High Priority (+6 points)

3. **Phone OTP styling** - Add responsive classes matching email OTP
4. **Resume upload error boundary** - Add explicit error handling
5. **funnel_config error handling** - Default to active if query fails

### Phase 3: Medium Priority (+3 points)

6. **Progress bar fix** - Change divisor from 5 to 6
7. **Location parsing fix** - Use robust parsing for multi-part locations
8. **Add aria-labels** - Audit all form inputs

### Phase 4: Polish (+0 points, but professional)

9. **Remove console.log statements** - Use logger utility
10. **Fix success screen copy** - Match "pending approval" destination
11. **Fix password step indicator** - Only show "completed" after submission

---

## Implementation Files

### Files to Modify:
1. `supabase/functions/verify-sms-code/index.ts` - CORS headers
2. `supabase/functions/check-email-exists/index.ts` - CORS headers
3. `src/components/candidate-onboarding/CandidateOnboardingSteps.tsx` - Multiple fixes
4. `src/pages/CandidateOnboarding.tsx` - Error handling

### Estimated Time: ~45 minutes for 100/100
