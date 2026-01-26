
# Partner Funnel UI Fixes

## Issues to Address

### 1. Verification OTP Input Overflows Screen
**Problem**: The 6-digit OTP input uses fixed 40px-width slots (240px total) with no responsive handling, causing horizontal overflow on smaller screens.

**Solution**: 
- Make OTP slots responsive with smaller sizes on mobile (`w-8 h-8` on mobile, `w-10 h-10` on desktop)
- Add `flex-wrap` and proper centering to prevent overflow
- Reduce letter-spacing on mobile to fit better

### 2. Email Verification "Failed to send request" Error
**Problem**: Console shows `FunctionsFetchError: Failed to send a request to the Edge Function` with a nested `TypeError: Failed to fetch`. The edge function is deployed and running but the client cannot connect.

**Root Cause**: The edge function `send-email-verification` is properly deployed (boot logs visible), but the request fails at the network level. This is likely a transient network issue in the preview environment OR a CORS preflight issue.

**Solution**:
- Add better error handling with retry logic in the `useEmailVerification` hook
- Show more helpful error messages to users
- Add a retry button when network errors occur
- Ensure the edge function CORS headers are complete

### 3. "Cheap" Verify Email Button
**Problem**: The current "Verify Email" button uses `size="sm"` and default variant, which doesn't match the luxury brand aesthetic.

**Solution**:
- Use `variant="primary"` for the gold accent color
- Increase to `size="default"` for better prominence
- Add premium styling with subtle glow effect
- Add descriptive microcopy below the button

---

## Technical Changes

### File: `src/components/ui/input-otp.tsx`
Make OTP slots responsive:
- Change slot sizing from fixed `w-10 h-10` to responsive `w-8 h-8 sm:w-10 sm:h-10`
- Ensure the container centers properly on all screen sizes

### File: `src/components/partner-funnel/FunnelSteps.tsx`
1. Update the "Verify Email" button:
   - Change from `size="sm"` to `size="default"`
   - Add `variant="primary"` for gold styling
   - Add subtle premium styling classes
   - Add helper text below the button

2. Make the email verification OTP section responsive:
   - Add responsive padding and width classes
   - Ensure the container doesn't overflow

3. Add better error handling for network failures:
   - Show a retry button when "Failed to fetch" occurs
   - Add more descriptive error states

### File: `src/hooks/useEmailVerification.ts`
Add retry logic:
- Detect "Failed to fetch" network errors
- Allow manual retry without cooldown for network failures
- Add a retry counter to prevent infinite loops

---

## Design Specifications

### Premium "Verify Email" Button
```
- Variant: primary (gold background)
- Size: default (44px height)
- Width: full width on mobile, auto on desktop
- Text: "Verify Email Address"
- Icon: Shield or Mail icon for trust
- Helper text: "We'll send a 6-digit code to verify"
```

### Responsive OTP Input
```
Mobile (< 640px):
- Slot size: 32x32px
- Gap: 4px
- Font size: 16px

Desktop (≥ 640px):
- Slot size: 40x40px  
- Gap: 8px
- Font size: 18px
```

---

## Testing Checklist
- [ ] OTP input fits on 320px screen width
- [ ] "Verify Email" button has premium gold styling
- [ ] Network error shows helpful message with retry option
- [ ] Verification panel is fully visible without horizontal scroll
- [ ] Touch targets remain ≥44px on mobile
