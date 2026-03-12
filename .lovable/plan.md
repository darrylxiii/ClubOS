

# Full System Audit — Findings and Fix Plan

## Summary

After inspecting the live database state, edge functions, views, and frontend code, I found **5 issues that need fixing** and confirmed **4 items from the last audit are already resolved**.

---

## CONFIRMED FIXED (No action needed)

1. **`approve-partner-request` + `provision-partner`**: Both correctly use `account_status: 'approved'` with fatal rollbacks. Verified in code.
2. **`member_requests_unified` view**: Live DB confirms the view includes `AND is_pure_candidate(p.id)` filter on the candidate branch. Working.
3. **`trg_validate_candidate_approval` trigger**: Exists in the database. Working.
4. **`memberApprovalService.executeApprovalWorkflow`**: Has the elevated-role guard (line 571-583). Blocks candidate profile creation for partners/admins. Working.
5. **`AdminMemberRequests.tsx`**: Has `ELEVATED_ROLES` array and `isElevatedRoleCandidate` filter (line 86-99). Working.
6. **No partners stuck in `pending`**: Query confirms zero partners with `account_status='pending'`.

---

## ISSUES THAT NEED FIXING

### ISSUE 1 (CRITICAL): `is_pure_candidate` function NOT updated in database

The migration created the trigger and recreated the view, but **did NOT update the `is_pure_candidate` function itself**. The live DB version still only excludes 3 roles:

```sql
-- CURRENT (in DB):
role IN ('admin', 'partner', 'strategist')

-- SHOULD BE:
role IN ('admin', 'super_admin', 'partner', 'strategist', 'recruiter',
         'hiring_manager', 'company_admin', 'moderator')
```

**Impact**: Recruiters, hiring managers, and company admins will still appear as candidate requests in the view.

**Fix**: Migration to `CREATE OR REPLACE FUNCTION is_pure_candidate` with the full role list.

---

### ISSUE 2 (CRITICAL): Old CHECK constraint still exists alongside the new trigger

The `check_approval_requires_onboarding_for_candidates` CHECK constraint was NOT dropped. It still exists in the database alongside the new trigger `trg_validate_candidate_approval`. This means:
- The CHECK constraint calls the old `is_pure_candidate` (which is `STABLE`, violating Postgres immutability rules for CHECK)
- Both the constraint AND the trigger fire on updates, causing double-validation with potentially different logic

**Fix**: Migration to `ALTER TABLE profiles DROP CONSTRAINT check_approval_requires_onboarding_for_candidates`.

---

### ISSUE 3 (MODERATE): `confidence_score` is integer — merge suggestions silently fail

The `potential_merges.confidence_score` column is type `integer`. The `getMergeSuggestionsForMember` query works (it doesn't filter by score), but any code or DB function that passes `0.7` as a threshold gets `invalid input syntax for type integer`.

**Fix**: Migration to `ALTER TABLE potential_merges ALTER COLUMN confidence_score TYPE numeric USING confidence_score::numeric`. This preserves existing integer values while allowing decimal scores.

---

### ISSUE 4 (DATA INTEGRITY): 9 elevated-role users have accidental candidate_profiles

Live query shows 9 users with elevated roles (partner, admin) who also have `candidate_profiles` entries. Notable examples:
- Darryl (admin+partner) — `source_channel: 'manual'`
- Sarah Bensalah (admin+partner) — `source_channel: 'integrated_funnel'`
- Marc Jong, Social Elite Agency, Patryk Skoczylas, Renee Kroon (all partners) — `source_channel: 'integrated_funnel'`

Some of these may be legitimate dual-role users (admin who is also a candidate). Others are clearly accidental (company accounts like "Social Elite Agency").

**Fix**: Delete candidate profiles for clearly non-candidate elevated users where no applications are attached. For safety, only delete where `source_channel IN ('admin_approval', 'member_approval')` — the ones created by the broken approval flow. Leave `integrated_funnel` and `manual` ones alone since those may be intentional.

---

### ISSUE 5 (CLEANUP): `PartnerOnboarding` page is orphaned dead code

`/partner-onboarding` route exists in `App.tsx` (line 390) pointing to `PartnerOnboarding.tsx` (337 lines). This is a legacy page — the real partner setup flow uses `/partner-setup` (`PartnerSetup.tsx`). The old page creates companies directly via client-side Supabase calls without the provisioning safeguards.

**Fix**: Replace the route with a redirect to `/partner-setup` and delete `PartnerOnboarding.tsx`.

---

## Implementation Plan

### Step 1: Database migration (Issues 1, 2, 3)
Single migration with:
- `CREATE OR REPLACE FUNCTION is_pure_candidate` — expanded role list
- `ALTER TABLE profiles DROP CONSTRAINT check_approval_requires_onboarding_for_candidates`
- `ALTER TABLE potential_merges ALTER COLUMN confidence_score TYPE numeric`

### Step 2: Data cleanup (Issue 4)
Using the insert tool (data operation):
- Delete candidate profiles for elevated-role users created via `admin_approval` or `member_approval` source channels, only where no applications reference them

### Step 3: Dead code removal (Issue 5)
- Change `/partner-onboarding` route in `App.tsx` to `<Navigate to="/partner-setup" replace />`
- Delete `src/pages/PartnerOnboarding.tsx`

