

# Critical Audit of the Partner Approval Plan

## Verdict: The plan has the right diagnoses but several gaps that would leave you crashing again. Here's every issue.

---

## BUG 1 (SHOWSTOPPER): `account_status: 'active'` — Still in deployed code

**Status in plan:** Identified correctly.
**Status in reality:** STILL LIVE. Both edge functions (`approve-partner-request` line 230, `provision-partner` line 315) set `account_status: 'active'`.

The constraint `profiles_account_status_check` only allows: `pending`, `approved`, `declined`. Setting `'active'` crashes every single partner approval silently. The plan says to fix this — good — but it's marked as a non-fatal error in the current code (line 234-236 of `approve-partner-request`), meaning the flow continues with a broken profile. **This must become fatal or the rest of the provisioning chain runs on a half-baked state.**

**What the plan misses:** The `provision-partner` function has the exact same bug (line 315) AND also treats the profile update as non-fatal (lines 318-320). The plan mentions it but doesn't emphasize that BOTH functions need identical treatment.

---

## BUG 2 (SHOWSTOPPER): `member_requests_unified` view has NO role filter on candidates

The view (migration `20251115`) selects ALL profiles where `created_at > '2025-01-01'` as candidates:

```sql
SELECT p.id, 'candidate' as request_type, ...
FROM profiles p
WHERE p.created_at > '2025-01-01'
```

Every partner, admin, and strategist shows up as a "candidate request." This is the direct cause of Timo/Zakaria reappearing. The plan correctly identifies this, but the proposed fix has a performance concern:

**Problem with plan's approach:** Calling `is_pure_candidate(id)` per row in a view is expensive — it does a subquery into `user_roles` for every profile row. The current `is_pure_candidate` function only excludes `admin`, `partner`, `strategist` — it does NOT exclude `recruiter`, `hiring_manager`, `company_admin`, `moderator`. So a recruiter would still appear as a candidate request.

**What should happen:** The `is_pure_candidate` function needs to exclude ALL elevated roles, and the view needs an index-friendly filter or materialized approach for performance.

---

## BUG 3 (MODERATE): `check_approval_requires_onboarding_for_candidates` constraint

This CHECK constraint calls `is_pure_candidate(id)` which is a SQL function. CHECK constraints must be IMMUTABLE, but `is_pure_candidate` is `STABLE` (it reads from `user_roles` table). This is technically a Postgres violation — it works today but will fail on `pg_dump`/restore and can cause unpredictable behavior during bulk updates.

**The plan ignores this entirely.** Per the project's own guidelines, validation triggers should be used instead of CHECK constraints for mutable checks.

---

## BUG 4 (MODERATE): No client-side guard against re-approving partners as candidates

The plan mentions adding a defensive filter in `AdminMemberRequests.tsx`, which is correct. But the current `executeApprovalWorkflow` in `memberApprovalService.ts` has NO guard. If a partner row somehow appears in the candidate list (which it does today), clicking "Approve" runs the full candidate workflow — creating a `candidate_profiles` record for a partner user. This is exactly what happened to Timo.

**The plan identifies this but groups it as "defense in depth."** It should be treated as mandatory, not optional.

---

## BUG 5 (DATA INTEGRITY): Timo approved twice — cleanup required

The plan says to run a one-time data repair:
- Set `profiles.account_status='approved'` for partners stuck in `pending`
- Remove accidental `candidate_profiles` for partner users

**What the plan misses:** It doesn't specify how to identify ALL affected users — just Timo and Zakaria. There could be more. The cleanup query should be: any user with `role='partner'` in `user_roles` who also has a `candidate_profiles` entry with `source_channel='admin_approval'` or `source_channel='member_approval'`.

---

## BUG 6 (EDGE CASE): Partner approval creates user even if company step fails

In `approve-partner-request`, if Step 2 (company creation) fails, the user is rolled back. But if Step 5 (company_members insert) fails, it's marked non-fatal (line 249-251). This means a partner can be provisioned without actually being linked to their company — breaking the entire company-based permission model.

**The plan doesn't address this.** Company member insertion should be fatal for partner provisioning.

---

## BUG 7 (MISSING): `is_pure_candidate` doesn't cover enough roles

Current function:
```sql
role IN ('admin', 'partner', 'strategist')
```

Missing: `recruiter`, `hiring_manager`, `company_admin`, `moderator`, `user` (if `user` means staff-level). Any recruiter who signs up would show as a candidate request.

---

## BUG 8 (MISSING): No idempotency on candidate workflow

`executeApprovalWorkflow` in `memberApprovalService.ts` has no idempotency check. If an admin double-clicks "Confirm," the workflow runs twice. The partner path has this check server-side (line 101: `if (request.status !== 'pending')`), but the candidate path updates `profiles.account_status` directly with no guard.

The `submissionInProgress` ref in the dialog is client-side only and doesn't survive a page refresh mid-submission.

---

## Revised Implementation Order (priority-ranked)

| # | Fix | Severity | Files |
|---|-----|----------|-------|
| 1 | Change `account_status: 'active'` → `'approved'` in BOTH edge functions; make profile update FATAL | Showstopper | `approve-partner-request/index.ts`, `provision-partner/index.ts` |
| 2 | Update `member_requests_unified` view: add `AND is_pure_candidate(p.id)` filter to candidate branch | Showstopper | DB migration |
| 3 | Update `is_pure_candidate` to exclude ALL elevated roles | Showstopper | DB migration |
| 4 | Replace `check_approval_requires_onboarding_for_candidates` CHECK with a validation trigger | Moderate | DB migration |
| 5 | Add server-side guard in `executeApprovalWorkflow`: skip candidate profile creation if user has elevated role | Moderate | `memberApprovalService.ts` |
| 6 | Add client-side filter in `AdminMemberRequests.tsx` to hide elevated-role users from candidate tab | Moderate | `AdminMemberRequests.tsx` |
| 7 | Make `company_members` insert fatal in `approve-partner-request` | Moderate | `approve-partner-request/index.ts` |
| 8 | Run data cleanup: fix stuck statuses, remove accidental candidate profiles for partner users | Data | DB migration or one-time query |
| 9 | Redeploy both edge functions after changes | Required | Deploy step |

