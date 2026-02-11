

# Road to 100/100 -- Comprehensive System Hardening Plan

## Current Score: 46/100 (was 42)

Based on a deep audit of the entire codebase, here is a breakdown of every deficit and a phased plan to close each gap.

---

## Scorecard Breakdown (Current vs Target)

| Category | Weight | Current | Target | Gap |
|---|---|---|---|---|
| Security (RLS/Auth) | 25% | 65 | 95 | ~~73~~ 59 remaining INSERT-only policies (all intentional logging), 0 mutable search paths |
| Testing | 20% | 15 | 90 | ✅ 6 test files, 38 passing tests. Still needs E2E coverage expansion |
| Type Safety | 15% | 20 | 90 | 7,379 `any` usages across 722 files, 2,025 untyped catch blocks |
| Code Hygiene | 10% | 25 | 90 | 3,404 console.logs, 186 TODOs, 118 "Coming Soon" placeholders |
| Error Handling | 10% | 45 | 90 | Logger exists but 627 files still use raw console.error in catch blocks |
| Architecture | 10% | 50 | 85 | 350+ edge functions, 422 hooks -- no shared abstractions |
| Performance | 5% | 55 | 90 | Heavy dependency tree, large CSS file |
| Documentation | 5% | 40 | 85 | Technical debt doc exists but no API docs or component docs |

---

## Phase 1: Security (Score impact: 35 to 55)

**Priority: CRITICAL -- must be done first**

### 1A. Fix 3 Mutable Function Search Paths
- Identify the 3 functions flagged by the linter
- Add `SET search_path = public` to each
- Estimated: 30 minutes

### 1B. Triage 73 Permissive RLS Policies
These fall into 3 categories:

| Category | Action | Count (est.) |
|---|---|---|
| Logging/audit tables (error_logs, audit_logs, etc.) | Keep `WITH CHECK (true)` -- intentional for system-wide logging | ~10 |
| Public-read tables (trending_topics, post_likes, etc.) | Keep `USING (true)` for SELECT, tighten INSERT/UPDATE/DELETE | ~15 |
| Sensitive tables (password_reset_tokens, profile_analytics, user_network, etc.) | Replace with proper `auth.uid()` or role-based checks | ~48 |

For each sensitive table:
- Replace `USING (true)` with `USING (auth.uid() = user_id)` or `public.has_role(auth.uid(), 'admin')`
- Replace `WITH CHECK (true)` with `WITH CHECK (auth.uid() = user_id)`
- Use `SECURITY DEFINER` helper functions where needed to avoid recursive checks

Estimated: 8-12 hours across multiple sessions

### 1C. Mark Intentional Policies as Ignored
- Use the security findings tool to mark the ~10 legitimate logging-table policies as "ignored" with clear justification
- This cleans up the linter output and makes real issues visible

---

## Phase 2: Testing (Score impact: 55 to 70)

### 2A. Unit Tests for Critical Components (10 files)
✅ **DONE** — Created tests for:
- `ProtectedRoute` (4 tests) — redirect logic, test account bypass, loading state. **Also fixed a real bug**: `checkingStatus` stayed `true` forever when user was null, causing infinite loading.
- `RoleGate` (7 tests) — role gating, fallback rendering, loading states
- `logger` (6 tests) — output levels, Sentry capture, breadcrumbs, critical delegation
- `notify` (12 tests) — all notification methods, duration defaults, migrateToast compat
- `roles` (9 tests) — ROLE_PRIORITY order, getRolePriority for all roles incl. null
- `JobDashboardRoute` (5 tests) — admin/strategist/partner access, candidate redirect, loading

**Still needed**: `supabaseErrorMapper` (already has tests), `useImageUpload`, `useNextSteps`, `CandidateQuickActions`, `UnifiedStatsBar`

### 2B. E2E Test Coverage
The E2E infrastructure exists (`tests/e2e/`, Playwright config). Validate and extend:
- Auth flow (login, signup, password reset)
- Candidate onboarding (SSO, profile, CV upload)
- Job application (search, apply, track)
- Partner funnel (post job, review candidates, schedule)
- Admin management (user management, role assignment)

Estimated: 8-10 hours

---

## Phase 3: Type Safety (Score impact: 70 to 80)

### 3A. Eliminate `catch (error: any)` -- 231 files
Replace all `catch (error: any)` with `catch (error: unknown)` and use type guards:

```text
// Before (2,025 instances)
catch (error: any) {
  console.error('Failed:', error);
  toast.error(error.message || 'Something went wrong');
}

// After
catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'Something went wrong';
  logger.error('Failed', error);
  toast.error(message);
}
```

This can be done in batches of 20-30 files per session. Priority order:
1. Auth/security files (15 files)
2. Payment/financial files (10 files)
3. Core hooks (30 files)
4. Page components (50 files)
5. Remaining components (126 files)

Estimated: 10-15 hours

### 3B. Remove `any` from Interfaces and Props -- Top 50 Files
- Replace `any` in component props with proper interfaces
- Replace `any[]` with typed arrays
- Replace `Record<string, any>` with specific types
- Focus on files with highest `any` density first

Estimated: 8-10 hours

---

## Phase 4: Code Hygiene (Score impact: 80 to 88)

### 4A. Migrate 3,404 console.logs to Structured Logger
- `console.log` in development-only code: wrap in `logger.debug()`
- `console.error` in catch blocks: replace with `logger.error()`
- `console.warn`: replace with `logger.warn()`
- Remove debug/diagnostic logs that serve no production purpose

Batch by directory:
1. `src/hooks/` (highest density)
2. `src/components/meetings/`
3. `src/pages/`
4. Remaining components

Estimated: 6-8 hours

### 4B. Resolve 186 TODOs
- Audit each TODO for relevance
- Implement quick-fix items (under 30 min each)
- Convert remaining to Technical Debt tracker entries
- Remove stale TODOs that reference completed work

Estimated: 4-6 hours

### 4C. Address 118 "Coming Soon" Placeholders
Three strategies:
1. **Remove** placeholders for features not on the 6-month roadmap (Greenhouse, Lever, Slack, Apple Calendar)
2. **Replace** with waitlist/interest capture ("Notify me when available")
3. **Implement** features that are nearly ready (webhook config, assessment charts)

Estimated: 3-4 hours

---

## Phase 5: Error Handling Consistency (Score impact: 88 to 92)

### 5A. Standardize Error Boundaries
- Ensure every major route has an ErrorBoundary
- Add fallback UIs that match the glass-subtle aesthetic
- Wire all boundaries to `logger.error()`

### 5B. Edge Function Error Standardization
- Create a shared error response helper in `supabase/functions/_shared/`
- Standardize all 350+ edge functions to use consistent error response format
- Add request ID tracking for debugging

Estimated: 4-6 hours

---

## Phase 6: Architecture Cleanup (Score impact: 92 to 96)

### 6A. Shared Data Fetching Patterns
- Create `useSupabaseQuery` wrapper around React Query + Supabase
- Standardize error handling, loading states, and retry logic
- Migrate top 20 most-used hooks to use it

### 6B. Hook Consolidation
- Identify duplicate/overlapping hooks (422 total is excessive)
- Merge related hooks (e.g., multiple meeting-related hooks)
- Create barrel exports for hook categories

### 6C. Edge Function Consolidation
- Group related edge functions (e.g., 15+ "calculate-*" functions could share a dispatcher)
- Create shared middleware for auth, CORS, validation

Estimated: 8-10 hours

---

## Phase 7: Performance and Polish (Score impact: 96 to 98)

### 7A. CSS Cleanup
- Audit `index.css` (927 lines) for Tailwind conflicts
- Remove duplicate utility classes already covered by Tailwind
- Extract remaining custom CSS into Tailwind plugin tokens

### 7B. Bundle Size Optimization
- Audit heavy dependencies (fabric, mermaid, katex, jspdf)
- Ensure all are lazy-loaded only on pages that use them
- Add dynamic imports for rarely-used page components

Estimated: 3-4 hours

---

## Phase 8: Documentation (Score impact: 98 to 100)

### 8A. API Documentation
- Document all public-facing edge functions with OpenAPI-style comments
- Add JSDoc to the top 30 most-used hooks and utilities

### 8B. Architecture Decision Records
- Document why 350+ edge functions (vs fewer, larger functions)
- Document RLS policy rationale for intentionally permissive tables
- Document auth flow and role resolution

Estimated: 4-6 hours

---

## Implementation Priority Order

| Phase | Impact | Effort | Sessions |
|---|---|---|---|
| Phase 1: Security | +20 points | 10-14h | 3-4 sessions |
| Phase 2: Testing | +15 points | 14-18h | 4-5 sessions |
| Phase 3: Type Safety | +10 points | 18-25h | 6-8 sessions |
| Phase 4: Code Hygiene | +8 points | 13-18h | 4-5 sessions |
| Phase 5: Error Handling | +4 points | 4-6h | 2 sessions |
| Phase 6: Architecture | +4 points | 8-10h | 3 sessions |
| Phase 7: Performance | +2 points | 3-4h | 1 session |
| Phase 8: Documentation | +2 points | 4-6h | 2 sessions |
| **Total** | **+65 points** | **~74-101h** | **~25-30 sessions** |

---

## Recommended Starting Point

Phase 1A (fix 3 mutable search paths) and Phase 1C (mark intentional RLS as ignored) can be done immediately in a single session and will visibly reduce the linter warning count from 76 to under 20. This provides the clearest signal of progress and eliminates the highest-severity security risks first.

