
# Booking System Comprehensive Audit & Fix Plan

## Executive Summary

After thorough analysis, I've identified **6 interconnected root causes** affecting the booking system. This plan addresses all issues systematically to bring the email quality to 100/100 and eliminate the slot collision and cancellation bugs.

---

## Issues Identified

### Issue 1: Booked Slots Still Appear in UI (Critical)
**Root Cause**: The `get-available-slots` edge function only filters out `confirmed` bookings, ignoring `pending` bookings. Additionally, the modern `UnifiedDateTimeSelector` component lacks real-time subscription to remove slots when someone else books them.

**Impact**: Users can select already-booked slots, only to receive an error upon submission.

**Files Affected**:
- `supabase/functions/get-available-slots/index.ts` (line 55)
- `src/components/booking/UnifiedDateTimeSelector.tsx` (missing real-time hook)

---

### Issue 2: Cancel Booking Edge Function Errors (Critical)
**Root Cause**: The `cancel-booking` function uses a nested query syntax (`profiles:user_id(email, full_name)`) that may fail depending on foreign key relationships. Additionally, it doesn't properly handle email send failures (no error checking on Resend API responses).

**Impact**: Cancellation fails silently or throws 500 errors.

**Files Affected**:
- `supabase/functions/cancel-booking/index.ts` (lines 31-46, 156-168)

---

### Issue 3: Broken Logo in Emails (65/100 Rating)
**Root Cause**: Email logo references `https://thequantumclub.app/lovable-uploads/57a00fec-4cc3-44e5-a5d9-c4a1a4c3f6d6.png` which doesn't exist (the `lovable-uploads` folder in `public/` is empty). Should use the existing `quantum-clover-icon.png` that exists in `public/`.

**Impact**: Blue question mark / broken image icon appears in email clients.

**Files Affected**:
- `supabase/functions/_shared/email-config.ts` (lines 11-13)

---

### Issue 4: Host Not Receiving Booking Notifications
**Root Cause**: Confirmed that owner notification logic exists in `send-booking-confirmation` and logs show "Owner confirmation email sent". However, if the profile query fails or returns no email, the host block is skipped. Need to verify and add better error handling/logging.

**Files Affected**:
- `supabase/functions/send-booking-confirmation/index.ts` (lines 40-52, 268-338)

---

### Issue 5: Cancel-Booking Uses Hardcoded Email Senders
**Root Cause**: The `cancel-booking` function hardcodes `bookings@thequantumclub.nl` instead of using the centralized `EMAIL_SENDERS` config, leading to inconsistency and potential issues if the domain changes.

**Files Affected**:
- `supabase/functions/cancel-booking/index.ts` (lines 163, 215)

---

### Issue 6: Email Template Quality Improvements
**Current Rating**: 65/100
**Target**: 100/100

**Improvements Needed**:
- Use hosted logo that actually exists
- Add fallback alt text for images
- Improve error handling in email sending
- Use consistent sender configuration
- Add better Schema.org markup

---

## Implementation Plan

### Phase 1: Fix Slot Availability (Eliminates Ghost Slots)

#### 1.1 Update `get-available-slots` to Include Pending Bookings
```sql
-- Change from:
.eq("status", "confirmed")

-- To include pending status:
.in("status", ["confirmed", "pending"])
```

#### 1.2 Add Real-time Subscription to UnifiedDateTimeSelector
Import and use the existing `useBookingRealtime` hook:
```typescript
const { liveBookingsCount } = useBookingRealtime({
  bookingLinkId: bookingLink.id,
  selectedDate,
  onSlotBooked: () => {
    toast.info("A slot was just booked. Refreshing...");
    if (selectedDate) loadSlotsForDate(selectedDate);
  },
  onSlotCancelled: () => {
    toast.success("A slot just became available!");
    if (selectedDate) loadSlotsForDate(selectedDate);
  },
});
```

---

### Phase 2: Fix Cancel Booking Edge Function

#### 2.1 Improve Profile Query (More Robust)
Replace the nested query with a separate profile fetch:
```typescript
// Get booking details first
const { data: booking } = await supabaseClient
  .from("bookings")
  .select(`*, booking_links!inner(title, user_id)`)
  .eq("id", bookingId)
  .single();

// Then fetch owner profile separately  
const { data: ownerProfile } = await supabaseClient
  .from("profiles")
  .select("email, full_name")
  .eq("id", booking.booking_links.user_id)
  .single();
```

#### 2.2 Add Email Error Handling
Check Resend API response status:
```typescript
const emailResponse = await fetch("https://api.resend.com/emails", {...});
if (!emailResponse.ok) {
  const errorData = await emailResponse.json();
  console.error("Resend API error:", errorData);
  // Continue with booking cancellation even if email fails
}
```

#### 2.3 Use Centralized EMAIL_SENDERS
```typescript
import { EMAIL_SENDERS } from "../_shared/email-config.ts";
// ...
from: EMAIL_SENDERS.bookings,
```

---

### Phase 3: Fix Email Logo

#### 3.1 Update email-config.ts
Change logo URLs to use the existing asset:
```typescript
export const EMAIL_LOGOS = {
  cloverIcon80: `${EMAIL_ASSETS_BASE_URL}/quantum-clover-icon.png`,
  cloverIcon40: `${EMAIL_ASSETS_BASE_URL}/quantum-clover-icon.png`, // Fixed
  fullLogo: `${EMAIL_ASSETS_BASE_URL}/quantum-clover-icon.png`,     // Fixed
} as const;
```

---

### Phase 4: Enhance Host Notifications

#### 4.1 Add Better Logging and Error Handling in send-booking-confirmation
```typescript
// Add explicit logging for debugging
console.log("Looking up owner profile for user_id:", bookingLink.user_id);

const response = await fetch(...);
if (!response.ok) {
  console.error("Profile fetch failed:", response.status, await response.text());
}

const profiles = await response.json();
console.log("Owner profile lookup result:", profiles);

if (!ownerProfile?.email) {
  console.error("Owner profile not found or missing email for user_id:", bookingLink.user_id);
} else {
  console.log("Sending owner notification to:", ownerProfile.email);
}
```

---

### Phase 5: Email Template Polish (100/100)

#### 5.1 Add Fallback Text for Logo
```html
<img 
  src="${EMAIL_LOGOS.cloverIcon40}" 
  alt="The Quantum Club"
  title="The Quantum Club" 
  width="64" 
  height="64"
  onerror="this.style.display='none'"
/>
<!-- Text fallback if image fails -->
<div style="display: none;">The Quantum Club</div>
```

#### 5.2 Improve Color Contrast
Replace `rgba()` colors with solid hex equivalents for better email client compatibility:
```typescript
textSecondary: '#B8B7B3',  // Instead of rgba(245, 244, 239, 0.7)
textMuted: '#8A8985',      // Instead of rgba(245, 244, 239, 0.5)
```

---

## Technical Details

### Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/get-available-slots/index.ts` | Include pending bookings in conflict check |
| `src/components/booking/UnifiedDateTimeSelector.tsx` | Add real-time subscription hook |
| `supabase/functions/cancel-booking/index.ts` | Fix profile query, add error handling, use EMAIL_SENDERS |
| `supabase/functions/_shared/email-config.ts` | Fix logo URLs, solidify colors |
| `supabase/functions/send-booking-confirmation/index.ts` | Add better logging for host notifications |
| `supabase/functions/_shared/email-templates/base-template.ts` | Add image fallback |

### Edge Functions to Deploy
- `get-available-slots`
- `cancel-booking`
- `send-booking-confirmation`

---

## Expected Outcomes

1. **Slots disappear immediately** when booked (real-time + pending status check)
2. **Cancel booking works reliably** with proper error handling
3. **Logo displays correctly** in all email clients
4. **Host receives notifications** for all bookings
5. **Email quality 100/100** with solid colors and proper fallbacks

---

## Testing Checklist

1. Book a slot, verify it disappears for other users in real-time
2. Cancel a booking, verify success without errors
3. Check email in Gmail, Outlook, Apple Mail for logo display
4. Verify host receives notification email
5. Verify guest receives confirmation email with all details
