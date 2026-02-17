

# Fix: "Cannot access 'lazy' before initialization"

## Root Cause

In `src/App.tsx`, the `lazy()` function is called on **line 15** to create `LazyPostHogProvider`, but `lazy` is not imported until **line 24**:

```
Line 15: const LazyPostHogProvider = lazy(() => ...   // <-- uses lazy
Line 24: import { lazy, Suspense, memo, useEffect } from "react";  // <-- imports lazy
```

While ES module `import` statements are hoisted, the `const` declaration on line 15 sits between other imports and gets evaluated in a way that triggers a temporal dead zone (TDZ) reference error during Vite's HMR module re-evaluation. This is the direct cause of `ReferenceError: Cannot access 'lazy' before initialization`.

## Fix

Move the `import { lazy, Suspense, memo, useEffect } from "react"` line **above** the `const LazyPostHogProvider` declaration. Specifically, move it from line 24 to line 5 (before any usage of `lazy`).

### Change in `src/App.tsx`

**Before (simplified):**
```
import { TracingProvider } from "@/lib/tracing/TracingProvider";
...other imports...
const LazyPostHogProvider = lazy(() => ...);    // line 15
...more imports...
import { lazy, Suspense, memo, useEffect } from "react";  // line 24
```

**After:**
```
import { lazy, Suspense, memo, useEffect } from "react";  // moved up
import { TracingProvider } from "@/lib/tracing/TracingProvider";
...other imports...
const LazyPostHogProvider = lazy(() => ...);    // now lazy is available
...more imports (line 24 import removed)...
```

## Risk

Zero. This is purely reordering an import statement so it appears before its first usage. No logic changes.

