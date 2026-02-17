

# Continue Memory Optimization -- Framer-Motion Barrel Export (~100MB graph savings)

## What This Fixes

184 files each independently import from `framer-motion`, creating 184 edges in Rollup's module graph. Each edge requires Rollup to resolve, parse, and tree-shake the entire framer-motion package separately. A single barrel re-export file reduces this to 1 edge, dramatically cutting AST memory during build.

## Approach

Create `src/lib/motion.ts` that re-exports only the framer-motion symbols actually used across the project. Then update all 184 files to import from `@/lib/motion` instead of `framer-motion`.

### Step 1: Create barrel file

**New file: `src/lib/motion.ts`**

Re-exports the following (the complete set used across 184 files):

- `motion` (184 files)
- `AnimatePresence` (~60 files)
- `useMotionValue` (4 files)
- `useTransform` (4 files)
- `PanInfo` (type, 4 files)
- `useDragControls` (1 file)
- `useSpring` (1 file)
- `useInView` (1 file -- framer's version, used in encrypted-text.tsx)

### Step 2: Update all 184 import sites

Every file currently importing from `'framer-motion'` will be updated to import from `'@/lib/motion'` instead. The imports themselves stay identical -- only the module specifier changes.

Examples of the change pattern:
```
// Before
import { motion, AnimatePresence } from 'framer-motion';

// After
import { motion, AnimatePresence } from '@/lib/motion';
```

## Files Changed

- 1 new file: `src/lib/motion.ts`
- 184 files: import path change only (no logic changes)

## Risk

Very low. This is a pure re-export with no logic changes. Every component gets the exact same symbols from the exact same package -- just routed through a single module. If any file fails, the TypeScript compiler will catch it immediately since the types flow through unchanged.

## Expected Impact

~100MB reduction in Rollup's module graph memory during build. This is the second-largest remaining optimization after the devDependencies move (which is blocked by tooling).

