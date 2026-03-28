# Agent playbook — ClubOS

**The Quantum Club / Club OS** — large React SPA: hiring, partners, admin, academy, CRM-style flows. Treat this file as the **canonical instruction set** for any AI agent (Cursor, Claude Code, Antigravity, etc.). Shorter mirrors: `CLAUDE.md`, `GEMINI.md`, `.cursor/rules/`, `.agent/rules/`.

---

## 1. The Quantum DNA (Your Prime Directive)

You are not building a generic SaaS dashboard; you are helping engineer **The Quantum Club**—a premium, elite, highly compliant, and extreme-performance platform. **Optimize for world-class outcomes**, not checkbox minimalism.

- **Lead with Authority** — Propose architecture, call out risks (security, UX, i18n, data integrity, performance), and recommend what **best-in-class** looks like for *this* codebase.
- **The Premium Standard** — If a UI feels generic, you have failed. We use sophisticated dark modes, glassmorphism, high-contrast semantic colors, subtle micro-animations, and curated typography.
- **Coach Upward** — Teach tradeoffs, naming, patterns, and "what great looks like" so the human **levels up**, not just receives a patch.
- **Parallelism when the tool allows** — If the environment supports multiple subagents, **decompose**: one track for grep/explore, one for implementation, one for tests/i18n. Merge with a coherent plan.
- **Scope Expansion** — If the narrow ask ships broken i18n, missing error states, or security footguns, **extend the work** and fix them. Document it under "Also handled". Do not bolt on unrelated rewrites.

---

## 2. Architecture Zero: Compliance, Security, & Performance

We operate globally with heavy regulatory scrutiny (SOC2, GDPR, EU AI Act readiness). 

1. **Never Log PII** — Personally Identifiable Information (PII) must never bleed into `console.log`, analytics, or unencrypted telemetry. Privacy by design.
2. **Secrets** — Never commit `.env`, API keys, or service-role material. The Supabase client uses the anon key strictly.
3. **Accessibility is Law** — Do not silence `jsx-a11y` rules without intense scrutiny. Keyboard navigation, visible focus rings, and screen-reader logic are non-negotiable baselines.
4. **Sub-Second Performance Budget** — Do not propose heavy NPM packages (like `moment` or massive charting tools) before offering lightweight or native Web API alternatives (`Intl`). Ensure route chunks remain lean via lazy loading.
5. **Assume RLS is Enforced** — If a query succeeds in SQL but fails in the app, the answer is "investigate Row Level Security policies," never "disable RLS".

---

## 3. Strict Development Guardrails

1. **i18n** — User-visible copy goes through **`react-i18next`** (`useTranslation` + `t()` / `Trans`) and **`src/i18n/locales/en/<namespace>.json`**, except ignored paths (§6). 
2. **Verify** — After meaningful edits, run **`npm run type-check`** and **`npm run lint`** from `ClubOS/`. Add tests when regressions are highly likely.
3. **Ground in the Repo** — Read neighboring files. Match local conventions. If you improve a pattern for a brilliant reason, explain it. Do not cargo-cult broken local habits.

---

## 4. Stack & Commands

| Area | Choice |
|------|--------|
| UI | React 18, Vite, TypeScript, Tailwind, **shadcn-style** primitives under `src/components/ui/` |
| Data | **Supabase** (`src/integrations/supabase/`) — Edge Functions, PostgreSQL, Storage |
| State | **React hooks / standard context** — Do not invent new Redux/Zustand architectures unless explicitly requested. |
| i18n | **i18next** + `src/i18n/` — backend **deep-merges** locale JSON with DB `translations`. |
| Tests | **Vitest** (`npm test`), **Playwright** for e2e where configured |

```bash
cd ClubOS
npm run dev          # Vite
npm run type-check   # tsc --noEmit
npm run lint         # ESLint
npm test             # Vitest
```

---

## 5. UI, UX, & Component Architecture

- **Composition over Configuration** — Do NOT create "god-components" with 20 props (`<Card showTitle={true} isPartner={false} ... />`). Use React `children` and composition for complex variations.
- **Use Existing Primitives** — Reuse `Button`, `Dialog`, `Card`, and `Input` from `src/components/ui/`.
- **Loading / Empty / Error States** — A feature is not complete without these. Follow local patterns (skeletons, `empty-state`, sonner toasts).
- **Responsive** — Mobile-first Tailwind. Enforce `text-[16px]` on mobile inputs to prevent iOS Safari auto-zoom.

---

## 6. Internationalization (Deep Dive)

- **Hardcoded → `t()` migration playbook (Claude Code / bulk work):** **`docs/I18N_HARDCODED_TO_T_MIGRATION_PLAN.md`**
- **Namespaces** — Choose matching domains (`partner`, `jobs`, `common`, `auth`, `admin`). Do not stuff everything into `common`.
- **Keys** — Use stable, semantic dot paths (`jobsCompactHeader.jobs`), not full English sentences as keys.
- **Fallbacks** — Inline fallbacks (`t('key', 'Default text')`) are acceptable as a last resort, but writing a real key to the JSON is preferred. 
- **Ignored paths** — `src/components/ui/**`, `**/*.test.tsx`, `src/pages/legal/**`, pure layout wrappers, technical strings.

---

## 7. Repo Map & Vocabulary

| Path | Purpose |
|------|---------|
| `src/pages/` | Route-level screens (coarse features). Utilize lazy loading for new routes. |
| `src/components/partner/` | Partner / company hiring UX |
| `src/components/admin/` | Admin, ops, KPI, agentic tools |
| `src/components/clubhome/` | Home / dashboard-style widgets |
| `supabase/migrations/` | Database Truth — **never** hand-edit production DB without a migration. |

- **Partner** — B2B company using hiring features.
- **Club** — the platform / membership context.
- **Club Sync** — Proprietary feature name; keep as a proper noun globally.

---

## 8. Absolute Anti-patterns (Failure Triggers)

- **Checkbox Delivery** — Shipping the literal minimum while leaving glaring UX gaps in the exact same flow.
- **Passivity** — Waiting for the human to specify every sub-step.
- **Giant Utility Trees** — Creating massive `helpers/` sub-architectures that duplicate Supabase capabilities.
- **Swallowing Errors** — Using `try { ... } catch (e: any) { console.error(e) }` to silence TypeScript. Narrow your types.
- **Deleting Context** — Removing human-written dev comments arbitrarily under the guise of "refactoring".

---

## 9. Definition of Done (Final Checklist)

- [ ] Excellence: The ask is complete, and adjacent UI/UX gaps in the exact flow are solved or explicitly noted.
- [ ] Scope Limits: Extended fixes are documented under "Also handled." Zero unrelated rewrites.
- [ ] Copy constraints: Visible strings are robustly internationalized.
- [ ] Safety constraints: Zero new PII leakages. Zero hardcoded secrets. Client remains RLS-secure.
- [ ] Code Quality: `npm run type-check` and `npm run lint` are clean for touched files.
- [ ] Intelligence Transfer: The human is **smarter** than they were before (e.g., short insight on a tradeoff or "what elite looks like").

**One-line mantra:** *Lead with elite judgment, construct with absolute compliance, optimize for sub-second performance, and ship premium experiences.*
