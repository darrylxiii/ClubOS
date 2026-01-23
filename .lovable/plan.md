
## Goal
1) Fix the production build crash (`JavaScript heap out of memory`) so the app reliably publishes again.
2) Provide a “one-time” way to download `schema.sql` and `data.sql` from inside the app (no navigation needed), while keeping admin-only security.

## What’s actually causing the build OOM (root cause)
Your generated backend type file is enormous:

- `src/integrations/supabase/types.ts` ≈ **53,228 lines**

That’s not automatically fatal, but it becomes fatal when it gets pulled into the **runtime bundle**.

I found multiple places where `Database` / `Json` are imported from that file **as a normal import** (not type-only). If Vite/Rollup treats those imports as runtime, it tries to include that massive file in the JS build graph, which can explode memory during chunk rendering.

### Offending imports found (examples)
These should be type-only imports, but currently they are runtime imports in several files:
- `src/types/database.ts` (currently: `import { Database } from '@/integrations/supabase/types';`)
- `src/hooks/useCommunicationWorkflows.ts`
- `src/hooks/useUnifiedCommunications.ts`
- `src/hooks/useCrossChannelPatterns.ts`
- `src/hooks/useGlobalCallSignaling.ts`
- `src/hooks/useCallSignaling.ts`
- `src/components/messages/CallNotificationManager.tsx`
- plus several that import `Json` similarly (security/workspace automation hooks)

Even one runtime import can keep the whole file in the runtime graph.

## Fix strategy (high confidence, minimal risk)
### A) Stop bundling `types.ts` into runtime
1. Convert all imports of `Database` and `Json` from:
   - `import { Database } from '@/integrations/supabase/types'`
   - `import { Json } from '@/integrations/supabase/types'`
   to:
   - `import type { Database } from '@/integrations/supabase/types'`
   - `import type { Json } from '@/integrations/supabase/types'`

2. In “types aggregator” files (especially `src/types/database.ts` and `src/types/api.ts`), ensure they only re-export types:
   - Use `export type ...` everywhere
   - Avoid any value-level exports that might force the module to become “runtime relevant”

3. Quick verification pass:
   - Re-run a codebase search for `from '@/integrations/supabase/types'` and ensure every import is `import type`.
   - Ensure there is no `export { Database }` (non-type) re-export anywhere.

**Expected outcome:** `src/integrations/supabase/types.ts` becomes “type-only” to the compiler and should not be emitted into the runtime bundle, drastically reducing memory usage during build.

### B) Secondary build stabilizers (only if needed after A)
If the build is still heavy after the type-only fix:
1. Make sure other large subsystems are lazy-loaded (already good in many places: mermaid/katex/jspdf/mediapipe are dynamic).
2. Consider lazy-loading the BlockNote editor entry routes if it’s part of the main route graph (it currently has multiple direct imports of `@blocknote/*`).
3. Revisit `vite.config.ts` only if necessary (it already has many memory-saver settings applied).

## “One-time export” UX (no navigation required)
You said you don’t need navigation because it’s probably used once. We can do this without adding anything to menus.

### Approach
Create an **admin-only hidden route** (not linked in nav):
- Example: `/admin/exports` (or `/admin/db-export`)
- Must follow your architecture requirement: wrap in `AppLayout` and `RoleGate`.

On that page:
- Two buttons:
  - Download `schema.sql`
  - Download `data.sql`
- Each calls the backend functions using the authenticated client (so the Authorization header is included automatically).
- It creates a Blob and triggers a browser download.

No separate backend login is needed; the app session provides the token.

### Security posture
- The backend functions remain admin-only server-side.
- The UI route is admin-gated.
- No token in URL, no public links, nothing “leaky”.

## Backend function routing clarification
The “working” endpoints are accessed as:
- `https://<backend-base-url>/functions/v1/schema-dump`
- `https://<backend-base-url>/functions/v1/data-dump`

But direct address-bar use will still 401 because no Authorization header is sent; the in-app button call is the correct “clickable” flow.

## Sequencing (fastest path to unbreak production)
1) Fix type-only imports (this is the build blocker).
2) Confirm production build passes.
3) Add the hidden admin export page to trigger downloads.
4) Optionally harden function config alignment (verify_jwt settings) if needed for consistency, but the in-app invoke should work regardless as long as headers are present.

## Acceptance criteria
### Build
- Production build completes without OOM.
- `types.ts` is not pulled into runtime chunks (practical sign: build completes; and bundle size does not balloon).

### Export
- As admin, visiting the hidden route shows two buttons.
- Clicking each downloads a non-empty `.sql` file.
- Non-admin users can’t access it.

## De-scope (keeps this tight)
- No navigation links or menu items.
- No public “shareable” export URLs.
- No additional export formats (CSV/JSON) right now.

## Notes / constraints I will follow
- I will not edit auto-generated backend client/types files directly (they are meant to be generated).
- Admin pages will be wrapped with `AppLayout` and `RoleGate` as required.
