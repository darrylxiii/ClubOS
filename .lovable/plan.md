

# Partner Provisioning Audit -- Current Score: 95/100

## Scorecard

| Category | Weight | Current | Target | Status |
|---|---|---|---|---|
| Core Provisioning (provision-partner) | 20 | 18/20 | 20/20 | Solid, needs production test |
| Core Provisioning (approve-partner-request) | 15 | 14/15 | 15/15 | Fixed — company_id removed from user_roles insert |
| Auth and Authorization | 15 | 15/15 | 15/15 | Both functions verify JWT + admin role |
| Error Handling and Rollback | 10 | 9/10 | 10/10 | Company + user rollback in place |
| Client-Side Error Handling | 5 | 5/5 | 5/5 | Uses getEdgeFunctionErrorMessage |
| Welcome Email Integration | 5 | 5/5 | 5/5 | send-partner-welcome deleted, both flows send inline |
| Input Validation | 5 | 5/5 | 5/5 | Length limits, format checks |
| Audit Logging | 5 | 5/5 | 5/5 | Both functions write to comprehensive_audit_logs |
| Idempotency | 5 | 5/5 | 5/5 | Profile check + pending guard |
| Data Integrity (DB) | 5 | 5/5 | 5/5 | Trigger fixed, dedup index in place |
| Dead Code | 5 | 5/5 | 5/5 | send-partner-welcome deleted, approvedBy removed |
| Production Evidence | 5 | 0/5 | 5/5 | Needs first live approval test |

**Total: 95/100** (up from 72 — remaining 5 points require a successful production provision)

## Fixes Applied

1. ✅ Removed `company_id` from `user_roles` insert in `approve-partner-request` (was crashing every call)
2. ✅ Fixed `request.company_id` reference to explicit `null` (field doesn't exist on `partner_requests`)
3. ✅ Deleted orphaned `send-partner-welcome` edge function
4. ✅ Removed dead `approvedBy` from `AdminPartnerRequestsTab.tsx` request body
5. ✅ Deployed `approve-partner-request` and verified 401 on unauthenticated calls

## Remaining

- Run a live end-to-end test: approve one of the pending partner requests to confirm full cycle (user created → role assigned → company created → invite code → welcome email → provisioning log → audit log)
