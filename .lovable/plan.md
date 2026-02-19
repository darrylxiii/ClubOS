
# Full Audit: Shareable Job Pipeline Links & Enriched Candidate Profiles

**Score: 31 / 100**

---

## Executive Summary

The feature has a solid architectural concept and the UI scaffolding is clean. However, it has three showstopper bugs that mean the feature **does not function at all** in its current state. The core purpose — letting anonymous external partners view a pipeline with enriched candidate data — is broken end-to-end. No candidate will ever appear in a shared view. Password protection is silently non-functional. AI summaries are wired to a column that does not exist on the table being queried.

---

## Critical Bugs (All Fatal — Feature Does Not Work)

### Bug 1 (Fatal): Anonymous users cannot read applications or candidate_profiles — the pipeline always renders empty

**Severity: Critical. Feature-breaking.**

The `fetchPipelineData()` function in `SharedPipelineView.tsx` makes two direct Supabase client queries as an anonymous (unauthenticated) user:

```typescript
supabase.from('applications').select('id, current_stage_index, applied_at, match_score, ai_summary, candidate_id, user_id').eq('job_id', shareMeta.job_id)
supabase.from('candidate_profiles').select('id, full_name, current_title, current_company, email, linkedin_url').in('id', candidateIds)
```

The `applications` table has RLS enabled with these SELECT policies:
- `Admins can view all applications` → requires `has_role(auth.uid(), 'admin')` — fails for anon (uid is NULL)
- `Company members can view job applications` → requires matching company_members row with auth.uid() — fails for anon
- `Users can view their own applications` → requires `auth.uid() = user_id AND user_id IS NOT NULL` — fails for anon

The `candidate_profiles` table has RLS enabled with SELECT policies that require `TO authenticated` or specific role checks. Both are completely blocked for anon.

**Result**: Both queries silently return 0 rows. The Kanban board renders with all columns empty. There is no error shown to the user — just an empty board. The feature's entire value proposition — showing enriched candidate cards — is completely non-functional. No candidate will ever appear in a shared pipeline view.

**What should have been done**: The `validate_job_pipeline_share` RPC should fetch all candidate data server-side within the `SECURITY DEFINER` function (which can bypass RLS) and return it as part of the JSON response. The client should never make raw table queries as anon for this data.

---

### Bug 2 (Fatal): Password protection is silently broken — all "protected" links are actually unprotected

**Severity: Critical. Security-breaking.**

`SharePipelineDialog.tsx` lines 138–143 call a database RPC function `hash_pipeline_share_password` to hash the user's password before storing it:

```typescript
const { data: hashData, error: hashError } = await supabase.rpc(
  'hash_pipeline_share_password' as any,
  { _password: password.trim() }
);
payload.password_hash = hashData || null;  // ← null on failure
```

The function `hash_pipeline_share_password` **does not exist** in the database. Verified via direct query — `SELECT proname FROM pg_proc WHERE proname = 'hash_pipeline_share_password'` returns empty. When the RPC fails, `hashData` is `undefined`, so `payload.password_hash = null`.

The link is inserted with `password_hash = NULL`. The `check_pipeline_share_requires_password` RPC then returns `requires_password: false`. The password gate is **never displayed**. Anyone with the link URL bypasses the password entirely, even though the creator believed the link was protected.

There is no error shown to the user when `hash_pipeline_share_password` fails — the toast fires "Share link copied to clipboard" as if everything worked. The user has no idea the password was silently dropped.

**What should have been done**: Either implement the `hash_pipeline_share_password` function using `pgcrypto`'s `crypt()` function (one line of SQL), or hash the password inside the `validate` function itself by storing a salted hash at insert time using a proper `insert_pipeline_share` SECURITY DEFINER RPC. The `as any` TypeScript cast masked this missing function entirely.

---

### Bug 3 (Fatal): AI summaries are wired to a non-existent column — always null

**Severity: High. Feature-breaking.**

`SharedPipelineView.tsx` line 158 fetches `ai_summary` from the `applications` table:

```typescript
supabase.from('applications').select(`id, current_stage_index, applied_at, match_score, ai_summary, candidate_id, user_id`)
```

The `applications` table **does not have an `ai_summary` column**. Verified via `SELECT column_name FROM information_schema.columns WHERE table_name = 'applications'` — the column is absent. `ai_summary` lives on `candidate_profiles`.

Furthermore, even if the code were fixed to fetch from `candidate_profiles`, the candidate profiles query only selects:
```typescript
.select('id, full_name, current_title, current_company, email, linkedin_url')
```
`ai_summary` is not in that select list either.

**Result**: `application.ai_summary` is always `undefined`. The AI summary section in `SharedCandidateCard` never renders — even if `show_ai_summary = true`. The "AI-enriched" part of the enriched profile is completely non-functional.

---

## High Severity Issues

### Issue 4 (High): password_hash is returned to the frontend in `select('*')`

`fetchShares()` in `SharePipelineDialog.tsx` calls:
```typescript
supabase.from('job_pipeline_shares').select('*')
```
The `job_pipeline_shares` table has a `password_hash` column. The `select('*')` returns the bcrypt hash to every admin/strategist who opens the dialog. While bcrypt is one-way, exposing hashes to the frontend is unnecessary and violates data minimization principles. The `ShareLink` interface even includes `password_hash: string | null` in its type definition — the hash is actively being used (to show the "Protected" badge). The hash should never leave the server. Use a boolean `is_password_protected` column instead.

### Issue 5 (High): Email and LinkedIn are fetched from the database regardless of visibility flags — client-side filtering only

`fetchPipelineData` always fetches `email` and `linkedin_url` from `candidate_profiles` for every candidate, regardless of whether `show_candidate_emails` or `show_candidate_linkedin` are enabled. The filtering happens client-side:
```typescript
email: shareMeta.show_candidate_emails ? cp?.email : undefined,
linkedin_url: shareMeta.show_candidate_linkedin ? cp?.linkedin_url : undefined,
```
This means candidate PII (email addresses, LinkedIn URLs) is transmitted over the network to the anonymous viewer's browser even when the creator disabled those fields. Any person with browser dev tools can inspect the network response and extract all emails and LinkedIn URLs regardless of what visibility flags are set. Server-side filtering is mandatory for PII.

### Issue 6 (High): No rate limiting or brute-force protection on password validation

`validate_job_pipeline_share` can be called infinitely with incorrect passwords. There is no attempt counter, no lockout, no CAPTCHA, no IP-based rate limiting. A 6-character alphanumeric password has approximately 2 billion combinations — while this is high, there is nothing preventing automated attacks. The existing `detect_brute_force_attacks` and `check_rate_limit` functions in the database are not wired to this endpoint at all.

### Issue 7 (High): No audit logging for anonymous pipeline views

Every view of a shared pipeline increments `view_count` but logs nothing else. There is no record of when the link was accessed, from what IP, or whether the view was successful or failed (wrong password). The `audit_logs` table exists in the system but is not used here. For a "Confidential — View Only" feature targeting executive talent, this is a significant gap.

### Issue 8 (High): Stage index matching is fragile — candidates may appear in wrong columns

`PipelineShareBoard` matches candidates to stages using:
```typescript
applications.filter((app) => app.current_stage_index === stageOrder)
```
where `stageOrder` is `stage.order` from the `pipeline_stages` JSONB. Looking at real data, pipeline stages use `order: 0, 1, 2, 3...` as sequential integers. This works for simple pipelines, but for jobs like "SocialElite" where stages have `order: 2, 3, 4, 5` (skipping 0 and 1 for the Applied/Screening stages that were added later), candidates whose `current_stage_index` doesn't match any `stage.order` will simply not appear in any column. The board silently drops them.

---

## Medium Severity Issues

### Issue 9 (Medium): TypeScript type safety completely bypassed with `as any`

Throughout the implementation, `job_pipeline_shares` is cast with `as any` because the table is not in the generated `types.ts`:
```typescript
supabase.from('job_pipeline_shares' as any)
supabase.rpc('validate_job_pipeline_share' as any, ...)
supabase.rpc('hash_pipeline_share_password' as any, ...)
```
This is the direct reason Bug 2 went undetected — TypeScript would have caught the missing function if it had been in the type definitions. The pattern of using `as any` to bypass type errors is what allowed the broken password hashing to ship silently.

### Issue 10 (Medium): The view count is incremented on every page load, including reloads and tab-reopens

There is no session-level deduplication on `view_count`. Every call to `validateAndLoad()` increments the counter. If a viewer refreshes the page, the count goes up by 1. For non-password links, `checkToken()` calls `validateAndLoad(null)` immediately on mount — so even bot crawlers or link previews (e.g. Slack unfurling) increment the view count. This makes the metric misleading.

### Issue 11 (Medium): The "Share" button has no visual indicator of active share links

When active shares exist for a job, the "Share" button in `JobDashboard.tsx` looks identical to when none exist. There is no badge count, no dot indicator, nothing that tells the admin "this job currently has 2 active shared links." A strategist could accidentally create a 4th link without realizing 3 are already active and being viewed.

### Issue 12 (Medium): No confirmation dialog before revoke

Clicking the revoke (trash) icon in `ShareLinkRow` immediately calls `handleRevoke()` with no confirmation. If an external partner is actively viewing the pipeline in a browser tab, they lose access instantly without warning. A two-step confirm is standard for destructive actions.

### Issue 13 (Medium): `current_company` is always shown regardless of name visibility

In `SharedCandidateCard`, `current_company` is rendered unconditionally — there is no visibility flag controlling it. Even when `show_candidate_names = false` and `show_candidate_emails = false`, the candidate's current employer is always visible. For candidates with `employer_shield` / stealth mode enabled, this could expose which company they currently work at to external viewers.

### Issue 14 (Medium): Password field accepts any length including 1-character passwords

The `SharePipelineDialog` only checks `!password.trim()` before creating a link. There is no minimum length, no strength validation, no complexity requirement. A strategist could set "a" as the pipeline password, providing essentially zero security while believing the link is protected.

---

## Low Severity Issues

### Issue 15 (Low): No "no candidates" state for the full board when pipeline is empty

When all stages have 0 candidates (either genuinely empty or due to Bug 1), the board renders a full horizontal Kanban with each column showing "No candidates." There is no higher-level empty state that explains why the pipeline appears empty to an external viewer who may think the link is broken.

### Issue 16 (Low): Expired links show in the dialog but cannot be cleaned up

`expiredShares` are displayed indefinitely. There is no bulk-delete or cleanup option. A job with a 12-month lifespan could accumulate dozens of expired links in the dialog with no way to clear them other than individually, with no revoke button shown for already-expired entries.

### Issue 17 (Low): The `show_contact_info` flag is redundant and misleading

The `job_pipeline_shares` table has both `show_candidate_emails`, `show_candidate_linkedin`, AND `show_contact_info`. The insert logic sets `show_contact_info: showEmails || showLinkedin`. This creates a third flag that is derivable from the other two and adds confusion. The `SharedCandidateCard` uses `show_candidate_emails` and `show_candidate_linkedin` directly for rendering — `show_contact_info` is never checked.

### Issue 18 (Low): The route `/pipeline/:token` conflicts with potential future routes

The token route is registered at top level without a namespace prefix. If a token happened to be a UUID like `new` or `create`, routing ambiguity could arise. More practically, there is no 404 handling in the router — the `SharedPipelineView` handles its own error state, but a completely malformed URL `/pipeline/` with no token renders the loading state forever (the `token` param would be `undefined`, the guard fires, but `setViewState('error')` is followed by a `navigate` call to `/auth` which is jarring for external users).

---

## What Works Correctly

1. The database migration is structurally sound — table schema, RLS policy for authenticated users, and the `validate_job_pipeline_share` SECURITY DEFINER function are well-designed.
2. The `SECURITY DEFINER` approach for token validation is the correct pattern and properly excludes `password_hash` from the return payload.
3. The token generation (`encode(gen_random_bytes(32), 'hex')`) is cryptographically strong — 64-character hex token, 256 bits of entropy.
4. The `bcrypt` comparison logic within `validate_job_pipeline_share` is correct (the comparison `crypt(input, hash) = hash` is the proper pgcrypto pattern) — it just never runs because hashes are never stored.
5. Role-gating the "Share" button to admin/strategist only in `JobDashboard.tsx` is correctly implemented.
6. The UI of the Kanban board and candidate cards is well-designed for the TQC aesthetic.
7. The expiry display and `formatDistanceToNow` usage is clean and correct.
8. Revocation via `is_active = false` (rather than deletion) correctly preserves audit history.

---

## Scoring Breakdown

| Category | Max | Score | Reason |
|---|---|---|---|
| Core functionality | 35 | 0 | Feature is completely non-functional — anon cannot read any data |
| Security | 25 | 8 | Token strength and SECURITY DEFINER pattern are good; password is broken, PII leaked client-side, no rate limiting |
| Data correctness | 15 | 3 | ai_summary mapped to wrong table; stage matching fragile; email/LinkedIn always fetched |
| UI/UX | 15 | 12 | Well-designed dialog and board; missing empty state, revoke confirmation, active share indicator |
| Code quality | 10 | 8 | Clean component structure; `as any` casts throughout mask critical bugs |

**Total: 31 / 100**

---

## The Fix Priority List (Ordered by Impact)

1. **Blocker**: Add `get_pipeline_share_data(_token, _password)` SECURITY DEFINER RPC that returns all job + application + candidate data in one server-side call. Remove direct anon queries to `applications` and `candidate_profiles`.
2. **Blocker**: Create `hash_pipeline_share_password(_password text) RETURNS text` as `SECURITY DEFINER` using `crypt(_password, gen_salt('bf'))`. Wire correctly in dialog.
3. **Blocker**: Add `ai_summary` to the candidate_profiles select in the data fetch, and pass it through to the Application type.
4. **High**: Server-side PII filtering — do not return email/LinkedIn to the browser unless flags are set.
5. **High**: Add rate limiting to `validate_job_pipeline_share` (attempt counter per token, lock after 10 failures).
6. **High**: Replace `select('*')` with explicit column list excluding `password_hash` in the dialog.
7. **Medium**: Add a `is_password_protected` boolean column, remove `password_hash` from all client-facing queries.
8. **Medium**: Add revoke confirmation dialog.
9. **Medium**: Add active share count badge to the Share button.
10. **Medium**: Add password minimum length validation (8+ characters).
