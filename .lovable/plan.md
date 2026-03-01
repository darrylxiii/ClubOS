
## Enterprise Recovery Audit — Boot Failure to 100/100 Stability

### What I found (root-cause summary)
From the replay + console/network evidence, this is not a route bug first — it is a **startup module evaluation crash**:

1. `Main: false / Booting: false / Booted: false` means the entry module never reached executable body (or crashed during dependency init before body completed).
2. Runtime error is consistently: `Cannot read properties of undefined (reading 'forwardRef')`.
3. Current production bundle graph shows many React consumer chunks imported at startup (`i18n`, `radix`, `livekit`, `charts`), while React is in a separate `vendor` chunk.
4. `vite.config.ts` currently splits many React-heavy ecosystems into separate chunks (`@radix-ui`, `i18next`, `framer-motion`, etc.), which is high-risk for React interop/init order issues in generated chunks.
5. `build.rollupOptions.treeshake` is conditional (`mode === 'production'`), which can over-include dependency side effects in preview builds and amplify startup fragility.
6. There are additional enterprise risks discovered during audit:
   - `LanguageSelector.tsx` has a client-side admin heuristic (`email includes 'darryl'` / `user_metadata.role`) — this must be removed.
   - `InvestorPortal.tsx` validates access codes directly from client-side table reads (security model should be server-validated).

---

## Step-by-step recovery plan

### Phase 1 — Emergency boot hotfix (restore loading first)
**Goal:** eliminate `forwardRef` startup crash and get `/auth` + `/jobs` loading reliably.

1. **Stabilize bundling boundaries** in `vite.config.ts`
   - Keep `react`, `react-dom`, `scheduler`, `jsx-runtime` deduped.
   - Keep React + immediate UI consumers in the same vendor path:
     - stop manual chunking for: `@radix-ui`, `react-i18next/i18next`, `framer-motion`, router/form stacks that are eagerly used.
   - Retain manual chunking only for truly heavy non-core libs (e.g. mermaid/fabric/pdf/math/editor suites if needed).

2. **Make tree-shaking deterministic**
   - Set `rollupOptions.treeshake` to enabled consistently for preview/prod build outputs used in runtime validation.
   - Avoid mode-dependent tree-shake behavior that changes startup dependency shape unpredictably.

3. **Harden dependency pre-bundling metadata**
   - Add explicit `optimizeDeps.entries: ['src/main.tsx']`.
   - Ensure eager startup libs are included (react, react-dom, react-router-dom, sonner, next-themes, react-i18next, i18next, radix entry deps).

4. **Make `main.tsx` boot markers robust**
   - Ensure boot markers are set before risky initialization work.
   - Move non-essential startup initializers into controlled async bootstrap with targeted try/catch boundaries so boot diagnostics remain truthful and recovery UI can render.

**Acceptance criteria (Phase 1):**
- No `forwardRef` error in console.
- `__MAIN_LOADED__ = true` within 1s.
- No 3x recovery loop on root route.
- `/auth` loads normally; `/jobs` route resolves after auth.

---

### Phase 2 — Runtime isolation and graceful degradation
**Goal:** prevent one optional subsystem from taking down the full shell.

1. In app shell (`App.tsx` / `AppLayout.tsx`), keep optional modules (voice, advanced overlays) behind:
   - lazy loading + Suspense
   - local ErrorBoundary wrappers
   - safe fallbacks that preserve navigation/auth shell

2. Ensure public/core auth route path has minimum startup surface:
   - no non-essential heavy widgets on first paint
   - defer analytics and optional providers after initial render

**Acceptance criteria (Phase 2):**
- If voice or optional integrations fail, app shell still renders.
- Auth route remains interactive and recoverable.

---

### Phase 3 — Security corrections required for enterprise grade
**Goal:** remove privilege-escalation and client trust weaknesses.

1. **Remove client-side admin determination**
   - Replace `LanguageSelector.tsx` admin check with server-backed role context only (`user_roles`-driven, no email/user_metadata shortcuts).
   - Ensure no role authority comes from local/session storage or profile metadata.

2. **Harden investor portal access**
   - Move invite code verification to backend function (server-side hash compare + rate limiting + audit log + expiry enforcement).
   - Client should receive only allow/deny/session token outcome; never query hash table directly from browser.

3. Confirm existing role architecture remains table-driven (`user_roles`, `has_role`) and keep it that way across all new code paths.

**Acceptance criteria (Phase 3):**
- No client-side role elevation vectors.
- Investor access flow is server-validated and auditable.

---

### Phase 4 — Route and product-level validation
**Goal:** verify business-critical flows after boot fix.

Run a deterministic smoke matrix:
1. `/` → `/auth` boot and login render.
2. Authenticated navigation to `/home`, `/jobs`, `/admin/due-diligence`.
3. Investor portal access (invalid code denied, valid code allowed).
4. PDF export route load (no startup regression).
5. Logout/login cycle with no loading deadlock.

Add a regression checklist for each deployment:
- boot flags true
- zero fatal startup errors
- no recovery loop
- key routes open
- security checks pass

---

## Proposed execution order
1. **Phase 1 only** (ship immediately) — recover loading.
2. Validate boot and critical routes.
3. **Phase 2 + 3** hardening.
4. **Phase 4** smoke + release gate.

---

## De-scope recommendation (to accelerate recovery)
Temporarily deprioritize non-critical “wow” widgets at startup (voice/UI extras) until Phase 1 stability is confirmed. This reduces blast radius and restores enterprise reliability fastest.

---

## Files to change in implementation pass
- `vite.config.ts` (chunk strategy, treeshake, optimizeDeps entries/include)
- `src/main.tsx` (boot-safe initialization sequence)
- `src/App.tsx` and/or `src/components/AppLayout.tsx` (optional-feature isolation)
- `src/components/LanguageSelector.tsx` (remove insecure admin heuristic)
- `src/pages/InvestorPortal.tsx` + backend function for secure code validation

---

## Target state after completion
- Boot reliability restored (no crash/recovery loop).
- `/jobs` accessible again once authenticated.
- Startup architecture resilient to optional module failures.
- Security posture aligned with enterprise requirements (roles server-authoritative, no client-side privilege checks).
