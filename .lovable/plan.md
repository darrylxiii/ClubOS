
# Fix: Application Boot Crash (forwardRef undefined)

## Root Cause Analysis

The error `Cannot read properties of undefined (reading 'forwardRef')` means React itself is `undefined` when a dependency tries to use it. Combined with the secondary error `Failed to fetch dynamically imported module: .../src/components/voice/ClubAIVoice.tsx`, this points to a **Vite dependency optimization failure**.

**Why it breaks:**
- `vite.config.ts` uses `noDiscovery: true`, meaning only explicitly listed packages in `optimizeDeps.include` get pre-bundled
- `next-themes` is imported eagerly via `src/components/ui/sonner.tsx` (line 1: `import { useTheme } from "next-themes"`) which is imported in `App.tsx` line 173 via `<Sonner />`
- `next-themes` is **NOT** in the `optimizeDeps.include` list
- When Vite tries to resolve `next-themes` outside the pre-bundle, it gets a separate React reference that hasn't initialized yet, causing `React.forwardRef` to be `undefined`
- This crashes the entire application at boot before any route renders

**Secondary issue:**
- `@elevenlabs/react` (used by ClubAIVoice) is also not in `optimizeDeps.include`, causing the dynamic import to fail with a module resolution error

## Fix (2 changes)

### 1. Add missing dependencies to `optimizeDeps.include` in `vite.config.ts`

Add these packages that are used eagerly but not pre-bundled:

```
'next-themes',
'@elevenlabs/react',
'@elevenlabs/client',
'jspdf',
'jspdf-autotable',
```

- `next-themes`: Eagerly imported via Sonner component in App.tsx root — this is the boot crasher
- `@elevenlabs/react` + `@elevenlabs/client`: Used by ClubAIVoice (lazy-loaded but still needs proper pre-bundling to avoid the secondary module fetch error)
- `jspdf` + `jspdf-autotable`: Now eagerly imported in DueDiligenceDashboard via InvestorPDFExport — without pre-bundling, they may trigger the same React resolution issue when that route loads

### 2. Add defensive error boundary around ClubAIVoice in `AppLayout.tsx`

The current `Suspense fallback={null}` catches loading states but not module resolution errors. Wrap it in an error boundary so a voice module failure doesn't take down the entire layout.

## Expected Outcome

- App boots successfully on all routes
- `forwardRef` error eliminated (React properly shared across all pre-bundled deps)
- ClubAIVoice module resolution error eliminated
- Financial dashboard routes load without issues
