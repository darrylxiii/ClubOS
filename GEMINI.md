# Antigravity (Google) — ClubOS rules

**Complete agent playbook (leadership, parallelism, quality, Supabase, structure): [`AGENTS.md`](./AGENTS.md)**

This project uses **react-i18next**. The i18n section below is repeated so Antigravity loads it with native precedence; mindset + everything else lives in **`AGENTS.md`**.

## Internationalization (mandatory)

- Do **not** add user-visible text as raw JSX children or plain string literals inside JSX (headings, labels, buttons, placeholders, empty states, toasts, prose `title` / `aria-label` / `alt`).
- Do use **`useTranslation` + `t()`** (or **`Trans`**) and add strings to **`src/i18n/locales/en/<namespace>.json`** first; mirror other languages when requested.
- Use **stable translation keys**, not English sentences as keys.

**Ignored paths:** `src/components/ui/**`, tests (`**/*.test.tsx`, `**/__tests__/**`, `tests/**`), **`src/pages/legal/**`**, and purely technical strings (classes, URLs, analytics keys).

**Lint:** `i18n/no-raw-jsx-text` in `eslint.config.js` — fix warnings; disable only with a short comment.

**Supabase translations:** Repo JSON is the complete baseline; database rows **override** keys but must **not** wipe nested keys (deep-merge with locale files).

See also: **`AGENTS.md`**, **`CLAUDE.md`**, **`.cursor/rules/`**, **`.agent/rules/`**.
