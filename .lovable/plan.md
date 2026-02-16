

# Fix: Booking Function Crash — Duplicate Variable Declaration

## Problem
Sebastiaan's booking attempts on `/book/darryl` fail with "network request failed" because the `create-booking` backend function crashes immediately on startup. The logs show:

```
Uncaught SyntaxError: Identifier 'clientIp' has already been declared
```

The recent security fix added a new rate-limiting block (lines 79-85) that declares `const clientIp`, but an older DB-based rate limiter already declares the same variable (line 143). JavaScript does not allow two `const` declarations with the same name in the same scope, so the function never boots.

## Fix

**File:** `supabase/functions/create-booking/index.ts`

1. **Remove the old, redundant rate-limiting block (lines 142-171).** The new `checkUserRateLimit` utility (lines 79-85) already provides IP-based rate limiting using the shared rate-limiter module. The old block duplicates this logic by querying the `bookings` table — it is less efficient and now causes the crash.

2. **Keep the new rate-limiter block (lines 79-85) as-is.** It correctly uses the shared utility and fires before any heavy DB work, which is the intended pattern.

No other files need changes. After the edit, the function will be redeployed and Sebastiaan's booking flow will work.

## Technical Details

### What is removed
```typescript
// OLD block (lines 142-171) — REMOVE entirely
const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || ...
const fifteenMinutesAgo = ...
const { data: recentBookings } = await supabaseClient
  .from("bookings").select("id").eq("guest_email", guestEmail)...
if (recentBookings.length >= 5) { return 429 }
```

### What stays
```typescript
// NEW block (lines 79-85) — KEEP
const clientIp = req.headers.get('x-forwarded-for')...
const rateLimit = await checkUserRateLimit(clientIp, 'create-booking', 10, 15 * 60 * 1000);
if (!rateLimit.allowed) { return 429 }
```

### Verification
- Redeploy `create-booking`
- Confirm logs no longer show `SyntaxError`
- Test a booking on `/book/darryl` to confirm end-to-end success

