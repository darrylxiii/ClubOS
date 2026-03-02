
# Partner Funnel Audit -- Full Plan (including failed/non-approved entries)

## Data Audit: Last 3 Months of Non-Approved Partner Requests

| # | Name | Email | Company | Status | Date | Notes |
|---|---|---|---|---|---|---|
| 1 | GeorgeAMcGowen | GeorgeAMcGowen@thy.us | Lechters Housewares | **pending** | Feb 21 | Suspicious: `.us` TLD, company is defunct retailer, completed in 110s. Likely spam/bot. Still sitting in queue. |
| 2 | Test Seb | sebastiaan.brouwer@live.nl | Eyra | **declined** | Feb 19 | Internal test. Declined Mar 2 with reason "Test". Working as expected. |
| 3 | Darryl | darryl@thequantumclub.nl | test | **pending** | Feb 3 | Internal test entry, never cleaned up. |
| 4-7 | Darryl/John | darryl@thequantumclub.nl | Various | **superseded** | Feb 3 | Correctly superseded by dedup logic. Working as expected. |

**Zero partners have been successfully approved in the last 3 months.** The `partner_provisioning_logs` table is completely empty, confirming that the `approve-partner-request` edge function has never been triggered from the unified admin view.

---

## Issues to Fix (consolidated with previous audit)

### Issue A: Partner approval does not provision (CRITICAL -- from previous audit)

`AdminMemberRequests.tsx` lines 381-384 do a direct DB status update to `approved`, then send an email via `send-approval-notification`. It never calls the `approve-partner-request` edge function, so:
- No Auth user is created
- No company record is created
- No `company_members` link
- No invite code
- No provisioning log entry
- The welcome email magic link will not work

**Fix**: When `reviewAction === 'approve'` and `request_type === 'partner'`, replace the direct DB update with a call to `supabase.functions.invoke('approve-partner-request', { body: { requestId } })`. The edge function already handles status update, user creation, company setup, email, and audit logging.

### Issue B: No "Request Received" confirmation email (MEDIUM -- from previous audit)

After form submission, no email is sent to the partner confirming receipt. The `send-partner-request-received` edge function exists but is never invoked.

**Fix**: Add a non-blocking call after the admin notification in `FunnelSteps.tsx`:
```
supabase.functions.invoke('send-partner-request-received', {
  body: { email, contactName, companyName }
}).catch(...)
```

### Issue C: Spam/bot entry sitting in pending queue (NEW)

The `GeorgeAMcGowen@thy.us` entry is almost certainly spam:
- `thy.us` is a known disposable/spam domain
- "Lechters Housewares" was a chain that went bankrupt in 2001
- US-based address, completed form in under 2 minutes
- No website, no LinkedIn

This entry will stay in the admin queue indefinitely unless manually declined.

**Fix (data)**: Decline this entry via DB update with reason "Spam/bot submission".

**Fix (prevention)**: The funnel already has reCAPTCHA v3. Consider adding a basic domain blocklist check on submit, or a honeypot field. This is a low priority since it is a single instance.

### Issue D: Stale internal test entries in pending (LOW)

The `darryl@thequantumclub.nl` / "test" entry from Feb 3 is still pending. It should be cleaned up.

**Fix (data)**: Mark as `superseded` or `declined` with reason "Internal test".

### Issue E: Decline email delivery issues (MEDIUM -- from previous audit)

Partner declines route through `send-approval-notification` -> `send-partner-declined-email`. The chained invocation can fail silently.

**Fix**: For partner declines, call `send-partner-declined-email` directly instead of routing through the generic function. Add error toast if it fails.

---

## Implementation Plan

### Task 1: Fix partner approval to use provisioning edge function
**File**: `src/components/admin/AdminMemberRequests.tsx`

In `handleReview()`, when `reviewAction === 'approve'` and `selectedRequest.request_type === 'partner'`:
- Call `approve-partner-request` edge function with `{ requestId: selectedRequest.id }`
- On success, show toast and refresh
- On failure, show error toast with message from edge function
- Skip the direct DB update and separate email call (edge function handles both)
- Keep the existing candidate approval path unchanged

### Task 2: Fix partner decline to call email directly
**File**: `src/components/admin/AdminMemberRequests.tsx`

When `reviewAction === 'decline'` and `selectedRequest.request_type === 'partner'`:
- Keep the direct DB status update (no provisioning needed for declines)
- Call `send-partner-declined-email` directly instead of `send-approval-notification`
- Add error handling with toast warning if email fails

### Task 3: Add "Request Received" email on submission
**File**: `src/components/partner-funnel/FunnelSteps.tsx`

After the existing `notify-admin-partner-request` call (around line 260), add non-blocking invocation of `send-partner-request-received`.

### Task 4: Clean up bad data
- Decline the spam entry (`GeorgeAMcGowen@thy.us`) with reason "Spam/bot submission"
- Supersede or decline the stale test entry (`darryl@thequantumclub.nl` / "test", id `94ea9bc4`)

---

## Verification Checklist

1. Submit a new test partner request -- confirm "Request Received" email arrives
2. Approve a partner from the unified admin view -- confirm Auth user, company, roles, invite code, and provisioning log are all created
3. Test the magic link from the welcome email -- confirm the partner can log in
4. Decline a partner -- confirm decline email arrives with reason
5. Verify spam entry and stale test entry are cleaned from the pending queue
6. Verify no regressions on candidate approval flow
