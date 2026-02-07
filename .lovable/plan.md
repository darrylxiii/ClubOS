

# Comprehensive Plan: Give Club AI Full System Data Access for Admins

## Problem

Club AI currently only queries a **small subset** of the database for admin context. When an admin asks questions like "which high-value roles have few candidates?" or "show me pipeline bottlenecks", the AI cannot answer because it lacks:

1. **Per-job financial data** (salary, fees, deal stage)
2. **Per-job candidate counts** (applications grouped by job)
3. **Candidate pipeline depth** (stage breakdown per job)
4. **Shortlists and scorecards** (who's been shortlisted, evaluated)
5. **Offers data** (pending, accepted, declined offers)
6. **Interview feedback** (ratings, recommendations)
7. **Dossiers** (shared dossiers, view counts)
8. **Strategist assignments** (who manages which partner)
9. **Capacity planning** (team workload)
10. **Churn analysis** (lost clients/candidates)
11. **SLA tracking** (response times, compliance)
12. **NPS surveys** (satisfaction scores)
13. **Candidate interactions** (touchpoint history)
14. **Candidate notes** (internal strategist notes)

## Solution

Enrich the admin context block in `supabase/functions/club-ai-chat/index.ts` with **all business-critical tables**, and restructure the jobs output to include per-job candidate counts and financials.

## Changes (1 file: `supabase/functions/club-ai-chat/index.ts`)

### 1. Expand the admin Promise.all query block (lines 873-898)

Add these new queries to the existing `Promise.all`:

| Table | Select Fields | Purpose |
|---|---|---|
| `jobs` (enriched) | Add `salary_min, salary_max, currency, job_fee_type, job_fee_percentage, job_fee_fixed, target_hire_count, hired_count, deal_stage, deal_probability, deal_value_override, club_sync_status, is_continuous` | Per-job financials and deal pipeline |
| `applications` (enriched) | Add `job_id, stages` | Cross-reference candidates per job with stage breakdown |
| `candidate_offers` | `id, candidate_id, job_id, status, total_compensation, base_salary, sent_at, responded_at` | Active offers, acceptance rates |
| `candidate_shortlists` | `id, candidate_id, job_id, company_id, priority, notes` | Who's been shortlisted for what |
| `candidate_scorecards` | `id, application_id, overall_rating, recommendation, status, submitted_at` | Evaluation data |
| `interview_feedback` | `id, application_id, overall_rating, recommendation, status, submitted_at` | Interview evaluations |
| `candidate_interactions` | `id, candidate_id, interaction_type, title, summary, ai_sentiment, created_at` (limit 50) | Recent touchpoint history |
| `candidate_notes` | `id, candidate_id, note_type, title, content, pinned, created_at` (limit 30) | Internal notes |
| `dossier_shares` | `id, candidate_id, shared_by, expires_at, view_count, is_revoked` | Dossier sharing activity |
| `meeting_dossiers` | `id, title, candidate_id, view_count, is_revoked, created_at` (limit 20) | Generated dossiers |
| `strategist_assignments` | `id, partner_id, strategist_id, is_active, assignment_type` | Who manages whom |
| `capacity_planning` | `id, user_id, week_start, scheduled_hours, available_hours, capacity_load_percent` (limit 20) | Team capacity |
| `churn_analysis` | `id, user_id, churned_at, plan_tier, churn_reason, total_revenue_euros, reactivation_likelihood` (limit 20) | Client churn |
| `sla_tracking` | All fields (limit 20) | SLA compliance |
| `nps_surveys` | All fields (limit 20) | Satisfaction data |

### 2. Build per-job intelligence (new logic after fetching)

After the Promise.all resolves, add cross-referencing logic:

```text
For each job in allJobs:
  1. Count applications with matching job_id
  2. Group those applications by stage name
  3. Calculate estimated placement fee:
     - If job_fee_type = 'percentage': salary_max * (job_fee_percentage / 100)
     - If job_fee_type = 'fixed': job_fee_fixed
     - Else: salary_max * 0.20 (default)
  4. Count offers for that job_id
  5. Count shortlisted candidates for that job_id
  6. Determine pipeline health: candidates vs. target_hire_count
```

### 3. Replace flat job list with rich output (lines 974-979)

Replace the simple job list with a detailed per-job summary:

```text
=== ADMIN: ALL JOBS (Full Pipeline Intelligence) ===
- Senior Engineer @ Acme Corp (Active) - Amsterdam
  Salary: EUR 80,000-120,000 | Fee: 20% (~EUR 24,000)
  Candidates: 12 (Screen: 5, Interview: 4, Offer: 1, Other: 2)
  Shortlisted: 3 | Offers: 1 (pending)
  Multi-hire: 1/3 hired | Deal: qualified (70%) | Club Sync: active
```

### 4. Add new context sections

After the existing admin sections, append:

```text
=== ADMIN: OFFERS & NEGOTIATIONS ===
(List all active offers with status, compensation, candidate, job)

=== ADMIN: INTERVIEW FEEDBACK ===
(Summary: X scorecards submitted, avg rating, recommendations breakdown)

=== ADMIN: SHORTLISTS ===
(Summary: X candidates shortlisted across Y roles)

=== ADMIN: CANDIDATE INTERACTIONS (Recent) ===
(Last 20 touchpoints with type, sentiment, candidate name)

=== ADMIN: DOSSIERS ===
(Active dossier shares, view counts, expiring soon)

=== ADMIN: STRATEGIST ASSIGNMENTS ===
(Who manages which partners, active assignments)

=== ADMIN: TEAM CAPACITY ===
(Capacity load per team member this week)

=== ADMIN: SLA COMPLIANCE ===
(SLA metrics, any breaches)

=== ADMIN: CLIENT SATISFACTION ===
(NPS scores, recent survey results)

=== ADMIN: CHURN RISK ===
(Recent churns, reasons, reactivation likelihood)
```

### 5. Update system prompt (line 1296)

Add to the admin role instruction that Club AI now has access to per-job pipeline intelligence, offers, shortlists, scorecards, interactions, dossiers, capacity, SLAs, NPS, and churn data. It should cross-reference these when answering strategic questions.

### 6. Same enrichment for partner context (lines 981-1052)

For the partner block, add:
- `job_id` to the partner applications query (already partially done)
- Per-job candidate counts and stage breakdown (same logic as admin but scoped to company)
- Salary/fee data on partner jobs query
- Company-scoped offers, shortlists, and interview feedback

### 7. Fix `searchJobs` in ai-tools.ts (line 183)

The `search_jobs` tool still uses `.eq('is_active', true)` which is a non-existent column. Change to `.eq('status', 'published')`.

## Technical Notes

- All new queries use the service role key (already initialized), so RLS is bypassed for admin context -- this is correct since the edge function enforces role checks.
- The total number of new queries added to the admin Promise.all is ~10. With Supabase connection pooling this adds roughly 50-100ms total latency, acceptable for a chat response.
- Each new query is limited (20-50 rows) to prevent context window overflow.
- No database changes needed -- all tables and columns already exist.

## Files Modified

| File | Changes |
|---|---|
| `supabase/functions/club-ai-chat/index.ts` | Expand admin queries, add cross-referencing logic, add new context sections, update system prompt, fix partner context |
| `supabase/functions/_shared/ai-tools.ts` | Fix `is_active` to `status = 'published'` in `searchJobs` |

## Execution Order

1. Update `ai-tools.ts` (fix `is_active` bug)
2. Update `club-ai-chat/index.ts` (all enrichment changes)
3. Deploy both edge functions
4. Test with admin account asking "which high-value roles have few candidates?"

