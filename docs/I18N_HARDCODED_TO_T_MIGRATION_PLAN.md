# Comprehensive plan: hardcoded strings → i18n (`t()` / locale JSON)

**Audience:** Claude Code (and any agent) executing a repo-wide migration.  
**Canonical project rules:** `ClubOS/AGENTS.md`  
**Stack:** `react-i18next`, locale files under `src/i18n/locales/{lang}/{namespace}.json`, optional Supabase `translations` overrides (deep-merged with files — see `src/i18n/supabase-backend.ts`).

**Related docs:** `docs/TRANSLATION_GUIDE.md`, `docs/TRANSLATION_SYSTEM.md` (admin/DB workflows). **For code changes, treat repo `en` JSON as the source of truth for new keys** unless product asks otherwise.

---

## 1. Goals & definition of done

| Goal | How you know |
|------|----------------|
| User-visible English removed from JSX (outside ignores) | ESLint `i18n/no-raw-jsx-text` clean on migrated files |
| Keys exist in **`src/i18n/locales/en/<namespace>.json`** | Every `t('…')` resolves in `en` |
| Other locales | Either mirror keys (copy English as placeholder) **or** run Translation Manager pipeline after bulk `en` update — **do not leave `fr`/`de`/… missing keys** if CI checks parity |
| No shallow-merge regressions | Do not change `supabase-backend` merge behavior to replace full namespaces |
| App runs | `npm run type-check` + `npm run lint` from `ClubOS/` |

**Ignores (do not migrate for literal rule):**  
`src/components/ui/**`, `**/*.test.tsx`, `**/__tests__/**`, `tests/**`, `src/pages/legal/**` (unless explicitly in scope).

---

## 2. Namespaces (`ALL_NAMESPACES` in `src/i18n/config.ts`)

```
common, auth, onboarding, admin, analytics, candidates, compliance,
contracts, jobs, meetings, messages, partner, settings
```

### 2.1 Choose namespace by location (default heuristics)

| Code path | Default namespace |
|-----------|-------------------|
| `src/components/partner/**`, `src/pages/partner/**` | `partner` |
| `src/components/admin/**`, `src/pages/admin/**` | `admin` |
| `src/components/clubhome/**`, shared home chrome | `common` (often `home.*` keys already exist) |
| `src/pages/Auth.tsx`, auth flows | `auth` |
| `src/components/academy/**`, academy pages | often split: copy in `common` or extend `onboarding` / new keys under `common` if no academy namespace — **prefer existing keys in `en/common.json`** first (grep) |
| Jobs, applications, candidates UI | `jobs`, `candidates` |
| Meetings | `meetings` |
| Settings | `settings` |
| CRM-specific | often `common` or `analytics` — **grep** similar strings first |

**Rule:** Before inventing `widget.foo.bar`, **search `en/*.json`** for an existing key (duplicate English string).

---

## 3. How to **find** hardcoded strings

Use **multiple methods**; no single grep is perfect.

### 3.1 ESLint (high signal for JSX)

From `ClubOS/`:

```bash
npm run lint 2>&1 | grep "i18n/no-raw-jsx-text" || true
```

Fix file-by-file. For batch focus:

```bash
npx eslint "src/components/partner/**/*.{tsx,ts}" --format unix | grep no-raw-jsx-text
```

### 3.2 Ripgrep — JSX text-like patterns

Run from `ClubOS/` (adjust paths per wave).

**Between tags (common leak):**

```bash
rg --glob '*.tsx' --glob '!**/components/ui/**' --glob '!**/pages/legal/**' \
  '>[[:space]]*[A-Za-z][^<{]*[A-Za-z][[:space]]*<' src/
```

**String props (labels, titles, placeholders):**

```bash
rg --glob '*.tsx' --glob '!**/components/ui/**' \
  '(placeholder|title|label|description|aria-label|alt)=["\x27][A-Za-z]' src/
```

**Sonner / toast strings:**

```bash
rg --glob '*.tsx' 'toast\.(success|error|info|warning)\(\s*["\x27]' src/
```

**Throw new Error with user-facing text (sometimes should stay dev-only — judge):**

```bash
rg --glob '*.{ts,tsx}' 'throw new Error\(\s*["\x27]' src/
```

**Column definitions / headers:**

```bash
rg --glob '*.tsx' '(header|Header):\s*["\x27]' src/
```

### 3.3 `useTranslation` without enough `t(`

Files that import `useTranslation` but still have English in JSX — manual skim + ESLint.

```bash
rg -l 'useTranslation' src --glob '*.tsx' | while read f; do
  rg -q ">[^{]*[A-Za-z]{3,}" "$f" 2>/dev/null && echo "$f"
done
```

(Heuristic; expect noise.)

### 3.4 `t('key', 'English fallback')` debt

Second argument is a **fallback**; prefer real `en` JSON entries:

```bash
rg "t\([^)]+,\s*['\`\"]" src --glob '*.tsx'
```

### 3.5 Exclude false positives

- `className="..."`, `href`, `src`, `id`, `data-testid`, `key=`, most `variant=`
- GraphQL / SQL fragments in strings
- Regex patterns
- **Brand names** that must stay Latin (optional `Trans` or leave as-is with eslint-disable + comment)

---

## 4. Refactoring patterns (copy-paste recipes)

### 4.1 JSX text

**Before:**

```tsx
<h2>Active Jobs</h2>
```

**After:**

```tsx
const { t } = useTranslation('common'); // or correct namespace
<h2>{t('home.stats.activeJobs')}</h2>
```

Add `home.stats.activeJobs` (or chosen path) to `src/i18n/locales/en/common.json` (nested object).

### 4.2 Multiple namespaces in one file

```tsx
const { t } = useTranslation(['partner', 'common']);
// t('partner:jobs.title') or default NS + explicit in t()
```

Prefer **one primary** namespace per file to reduce noise.

### 4.3 `placeholder`, `title`, `aria-label`, `alt`

**Before:** `placeholder="Search…"`  
**After:** `placeholder={t('jobs.search.placeholder')}`

### 4.4 Conditional labels

**Before:** `{isX ? 'Save' : 'Cancel'}`  
**After:** `{isX ? t('actions.save') : t('actions.cancel')}` — reuse `common` keys if they exist.

### 4.5 Template strings with variables

**Before:** `` `Hello, ${name}` ``  
**After:** `t('greeting.hello', { name })` with JSON `"hello": "Hello, {{name}}"`

### 4.6 Plurals (ICU)

Use i18next plural keys where counts appear:

```json
"items_one": "{{count}} item",
"items_other": "{{count}} items"
```

```tsx
t('items', { count: n })
```

### 4.7 Dates, numbers, currency

**Do not** embed formatted dates in JSON as the primary pattern. Use:

- `Intl.NumberFormat`, `Intl.DateTimeFormat`, or `date-fns` **with user locale** from `i18n.language` for display.
- JSON holds **structure** (“`{{date}}`”) only if you pass preformatted `date` from code.

### 4.8 Rich text (links, bold)

Use **`Trans`** from `react-i18next` with components prop, or split into smaller `t()` strings — avoid HTML in JSON unless sanitized.

### 4.9 Zod / validation messages

Centralize in JSON or a small `validation` subtree per namespace; reference keys from schema:

```ts
z.string().min(1, { message: t('validation.required') })
```

### 4.10 Arrays of UI options (tabs, filters)

**Before:** `const tabs = [{ id: 'a', label: 'All' }, …]`  
**After:** `label: t('tabs.all')` inside component **after** hook, or `useMemo` depending on `t`.

---

## 5. JSON editing rules

1. **Valid JSON** — no trailing commas; escape quotes in strings.
2. **Nested objects** — mirror existing depth in that namespace (don’t flatten everything into root).
3. **Key style** — `camelCase` segments, dotted path in `t('parent.child.leaf')`.
4. **English value** — natural, product tone; translators will replace in other locale files.
5. **Duplicate concepts** — **one key, many uses**; grep `en` JSON before adding `saveButton` × 20.

### 5.1 Other locales (`fr`, `de`, …)

**Minimum for parity:** copy English string as placeholder **or** use team’s Translation Manager batch job.  
**Never** leave `fr` broken with missing keys if your CI or runtime expects parity — grep diff scripts (add if missing).

---

## 6. Execution strategy (phased waves)

Tackle **high-traffic surfaces first**, then breadth.

| Wave | Target paths (examples) | Rationale |
|------|-------------------------|-----------|
| 0 | Fix ESLint `i18n/no-raw-jsx-text` on **already flagged** hot files | Quick wins |
| 1 | `src/components/partner/**`, `src/pages/partner/**`, partner jobs | Revenue / daily use |
| 2 | `src/components/clubhome/**`, partner/admin home dashboards | Visible to leadership |
| 3 | `src/components/admin/**`, `src/pages/admin/**` | Lots of English |
| 4 | `src/pages/**` (excluding `legal`) | Route screens |
| 5 | Remaining `src/components/**` (excluding `ui`) | Long tail |
| 6 | Toasts, dialogs, table shells, chart labels | Cross-cutting second pass |

Within each wave: **grep → edit → `npm run type-check` → `npm run lint` → spot-check UI in `fr`**.

---

## 7. Claude Code–specific tactics

1. **Spawn parallel tasks** (if supported): one subagent per **wave subdirectory** (e.g. `partner/jobs`, `partner/offers`), merge with consistent namespace/key conventions.
2. **Use a running checklist** in the session: files touched, keys added, locales updated.
3. **Before bulk edits:** read **one** representative file in the folder to match **import style** and **hook placement** (top of component).
4. **After bulk edits:** run `npm run type-check` — TypeScript catches bad `t` signatures faster than runtime.
5. **Search keys first:** `rg '"save"' src/i18n/locales/en` to reuse `actions.save` etc.

---

## 8. Verification checklist (per batch / PR)

- [ ] `npm run type-check` (from `ClubOS/`)
- [ ] `npm run lint` — address new `i18n/no-raw-jsx-text` warnings in touched files
- [ ] Manual: switch language to **French** (or other) in app settings; open migrated screen — **no raw English** in that surface
- [ ] Grep: no accidental `TODO` translation comments left unless ticketed
- [ ] Keys added to **`en`**; **`fr`/`de`/…** updated or explicitly deferred with ticket
- [ ] No secrets / `.env` changes

---

## 9. Optional: parity script (future automation)

Add a small Node script (or use existing admin Translation Coverage) to:

1. Flatten keys in `en/{ns}.json`
2. Compare to `fr/{ns}.json` (etc.)
3. Report **missing keys** per locale

Run in CI when ready.

---

## 10. Anti-patterns

- Putting **whole paragraphs** in JSON without structure for translators.
- **Different keys** for the same English string in the same feature area.
- Using **`common`** for everything — blows up bundle and review surface.
- **Removing** ESLint disables without fixing root cause.
- Changing **Supabase** translation rows to **partial** objects without merge fix (regresses to missing keys at runtime).

---

## 11. One-page prompt you can paste into Claude Code

```
You are migrating ClubOS (React + react-i18next) from hardcoded English to i18n.

Read ClubOS/AGENTS.md and ClubOS/docs/I18N_HARDCODED_TO_T_MIGRATION_PLAN.md.

Rules:
- Add keys to src/i18n/locales/en/<namespace>.json; use useTranslation + t() (or Trans).
- Pick namespace by folder (partner→partner, admin→admin, etc.); grep en JSON for existing keys first.
- Migrate user-visible strings only; ignore src/components/ui, tests, src/pages/legal unless asked.
- After edits: npm run type-check && npm run lint from ClubOS/.
- Expand scope within the same flow for obvious i18n gaps (placeholders, toasts, aria-labels) and list under "Also handled".
- Use parallel subagents/tasks per subdirectory when possible.

Current wave: <WAVE_NAME e.g. partner/jobs>.
Start by running eslint grep for i18n/no-raw-jsx-text on that glob, then fix files in batches of 3–5 with verification.
```

---

**End of plan.** Update this document if namespaces, supported languages, or CI parity rules change (`src/i18n/config.ts`).
