

# Audit: Add Existing Candidates to Pipelines — Both Directions

---

## Direction A: "Existing" tab in AddCandidateDialog
**Current Score: 52/100**

### What works (52 pts)
- Search with debounce (300ms) ✓
- "Already in pipeline" badge + disabled selection ✓
- Reuses `proceedWithSubmission` and skips profile creation ✓
- Orphan cleanup correctly skipped for existing candidates ✓
- Audit logs + interactions + sourcing credits all fire ✓

### Issues found (48 pts missing)

| # | Issue | Impact | Points |
|---|-------|--------|--------|
| 1 | **Hardcoded stages** — Stage picker shows "Applied/Screening/Interview/Final Round" instead of fetching the job's actual `pipeline_stages` | Candidate placed at wrong stage name | -15 |
| 2 | **`any` types everywhere** — `existingResults: any[]`, `selectedExistingCandidate: any`, violates architecture standards | Type safety, maintainability | -5 |
| 3 | **No admin role guard** — The "Existing" tab is visible to any user who can open the dialog; no role check | Non-admins could link candidates | -10 |
| 4 | **`formData` leaks into existing flow** — When submitting existing candidate, `formData.email`, `formData.phone`, `formData.notes` are referenced in the interaction log content but those fields are empty (user never filled them). The log shows "N/A" for everything. | Misleading audit trail | -5 |
| 5 | **No loading spinner on submit button** — Uses `loading` state but no `Loader2` icon shown | Minor UX gap | -2 |
| 6 | **Search doesn't reset on dialog close** — `existingSearch` and `selectedExistingCandidate` persist when dialog reopens | Stale selection shown | -3 |
| 7 | **`.not("status", "in", '("rejected","withdrawn")')` syntax** — PostgREST `not.in` filter uses parentheses syntax which may silently fail depending on version, should be tested | Could show wrong "already in pipeline" state | -5 |
| 8 | **No credit-to picker in existing tab** — Manual tab has credit assignment, existing tab doesn't expose it | Missing sourcing credit attribution | -3 |

---

## Direction B: AddToJobDialog (from candidate profile)
**Current Score: 65/100**

### What works (65 pts)
- Fetches active jobs with search + debounce ✓
- "Already in pipeline" badges with disabled selection ✓
- Stage picker using job's actual `pipeline_stages` ✓
- Creates application + interaction + audit log ✓
- Clean error handling with duplicate constraint check ✓
- Proper `submitting` state management ✓
- Dialog resets state on open ✓

### Issues found (35 pts missing)

| # | Issue | Impact | Points |
|---|-------|--------|--------|
| 1 | **No admin role guard** — Button in `CandidateQuickActions` has no role check; any authenticated user can open it | Security — non-admins can add candidates to jobs | -12 |
| 2 | **`any` types** — `pipeline_stages: any[] | null`, `stages` cast | Type safety | -3 |
| 3 | **No sourcing credits** — Unlike Direction A, no `sourcing_credits` row is created | Inconsistent tracking, broken commission reports | -8 |
| 4 | **100-job limit** — Fetches max 100 jobs; orgs with more jobs lose visibility | Missing jobs in large orgs | -3 |
| 5 | **`useDebounce` import** — References `@/hooks/use-debounce` which may not exist (common custom hook but not verified) | Potential build error | -4 |
| 6 | **No error boundary for missing `candidate_interactions` or `pipeline_audit_logs` inserts** — If these fail, no error is shown, success toast still fires | Silent data loss | -3 |
| 7 | **Default stages fallback** — If job has no `pipeline_stages`, falls back to hardcoded 4 stages; should match the pattern used elsewhere in the app | Inconsistency | -2 |

---

## Plan to reach 100/100

### File: `src/components/partner/AddCandidateDialog.tsx`

1. **Fetch job's real pipeline stages** — When dialog opens, query `jobs.pipeline_stages` for `jobId` and use those in the "Existing" tab stage picker (same as manual tab should do)
2. **Add admin role guard** — Check user role via `has_role` RPC before rendering the "Existing" tab; hide it for non-admins
3. **Fix interaction log for existing candidates** — Pull `full_name`, `email`, `current_title`, `current_company` from `selectedExistingCandidate` instead of empty `formData`
4. **Add credit-to picker** — Reuse the existing `creditTo` state and team member popover in the existing tab's submit section
5. **Type the search results** — Define `ExistingCandidateResult` interface, replace `any[]`
6. **Reset state on dialog close** — Add cleanup in `onOpenChange` handler
7. **Verify PostgREST `not.in` syntax** — Test and fix the filter to use proper array syntax if needed

### File: `src/components/partner/AddToJobDialog.tsx`

1. **Add sourcing credits** — After application insert, create `sourcing_credits` row (match Direction A pattern)
2. **Add admin role guard** — Accept `isAdmin` prop or check role internally; only render in `CandidateQuickActions` when admin
3. **Type pipeline_stages** — Define interface for stage objects
4. **Handle secondary insert failures** — Wrap `candidate_interactions` and `pipeline_audit_logs` inserts in try/catch with `toast.error` fallback
5. **Remove 100-job hard limit** — Use pagination or raise limit to 500

### File: `src/components/partner/CandidateQuickActions.tsx`

1. **Add role check** — Fetch user role on mount; conditionally render "Add to Job" button only for admins

### Verify

1. **Confirm `useDebounce` hook exists** — Check `src/hooks/use-debounce.ts`; create if missing

### Files summary

| File | Changes |
|------|---------|
| `src/components/partner/AddCandidateDialog.tsx` | Fetch real stages, admin guard, fix interaction log, add credit picker, type results, reset state |
| `src/components/partner/AddToJobDialog.tsx` | Add sourcing credits, admin guard, type stages, error handling, raise job limit |
| `src/components/partner/CandidateQuickActions.tsx` | Admin role check for "Add to Job" button |
| `src/hooks/use-debounce.ts` | Verify exists or create |

