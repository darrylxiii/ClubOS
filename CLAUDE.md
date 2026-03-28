# Claude Code — ClubOS

**Full agent playbook: [`AGENTS.md`](./AGENTS.md)** — lead with expert judgment, parallelize when possible, aim for world-class outcomes (not minimal checkbox delivery).

**i18n migration (hardcoded → `t()`):** [`docs/I18N_HARDCODED_TO_T_MIGRATION_PLAN.md`](./docs/I18N_HARDCODED_TO_T_MIGRATION_PLAN.md)

Vite + React + TypeScript app. User-facing copy is **internationalized**; do not ship new raw English in JSX.

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — production build
- `npm run lint` — ESLint (includes `i18n/no-raw-jsx-text`)
- `npm run type-check` — `tsc --noEmit`
- `npm test` — Vitest

## Internationalization (mandatory)

- **No** raw JSX text or string literals in JSX for anything users read (labels, buttons, headings, placeholders, toasts, `title` / `aria-label` / `alt` when prose).
- **Use** `react-i18next`: `useTranslation('<namespace>')` and `t('key.path')` (or `Trans` for rich text).
- **Add keys** to `src/i18n/locales/en/<namespace>.json` first; extend `fr`, `de`, etc. when the task requires those locales.
- Use **stable keys**, not full English sentences as keys.

**Exceptions:** `src/components/ui/**`, `**/*.test.tsx`, `**/__tests__/**`, `tests/**`, `src/pages/legal/**`, and non-UI strings (class names, URLs, ids).

**Rare opt-out:** `// eslint-disable-next-line i18n/no-raw-jsx-text` with a one-line reason.

**Supabase:** Locale JSON in the repo is the **full baseline**; DB `translations` rows are **overrides** only (must deep-merge with files — never replace whole namespaces with partial JSON).

Same folder: **`AGENTS.md`** = full cross-tool playbook (this file is the Claude-oriented digest).
