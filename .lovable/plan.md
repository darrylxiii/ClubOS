

# JavaScript Memory Analysis Report

## Executive Summary

Your production build is failing due to **JavaScript heap out of memory** errors during Vite's chunk rendering phase. The project has **17,800+ modules** which is exceptionally large for a single React application. This report identifies memory-consuming dependencies and provides actionable recommendations.

---

## Dependency Categories by Memory Impact

### CRITICAL - Massive Bundle Size (Remove or Lazy-Load)

| Package | Est. Size | Usage | Files Using | Recommendation |
|---------|-----------|-------|-------------|----------------|
| **livekit-client** | ~800KB | Video meetings | 1 file | **PAUSE** - Only 1 hook uses it |
| **@livekit/components-react** | ~400KB | Video UI | 0 direct imports | **REMOVE** - No direct usage found |
| **@blocknote/core + react + mantine** | ~600KB | Rich text editor | 15 files | Keep but ensure lazy-loaded |
| **mermaid** | ~1.2MB | Diagram rendering | 1 file | **Already dynamic import** |
| **fabric** | ~700KB | Whiteboard/image editor | 2 files | **Already dynamic import** |
| **recharts** | ~400KB | Charts/analytics | 28 files | Keep - widely used |
| **framer-motion** | ~150KB | Animations | 314 files | Keep - core to UX |

### HIGH - Significant Memory Usage

| Package | Est. Size | Usage | Files Using | Recommendation |
|---------|-----------|-------|-------------|----------------|
| **@sentry/react** | ~200KB | Error tracking | 9 files | Keep - critical for monitoring |
| **@opentelemetry/*** | ~400KB total | Distributed tracing | 3 files | **PAUSE** - Only dev use confirmed |
| **posthog-js** | ~100KB | Analytics | 1 file | Keep but ensure lazy-loaded |
| **jspdf + jspdf-autotable** | ~300KB | PDF generation | 1 file | **PAUSE** - Only 1 component uses it |
| **katex** | ~300KB | Math equations | 1 file | **Already dynamic import** |

### MEDIUM - Moderate Impact

| Package | Est. Size | Usage | Files Using | Recommendation |
|---------|-----------|-------|-------------|----------------|
| **@capacitor/*** (8 packages) | ~150KB | Native mobile | 11 files | **PAUSE** if not deploying mobile |
| **@elevenlabs/react** | ~80KB | AI voice | 2 files | **PAUSE** - Limited use |
| **react-markdown** | ~100KB | Markdown rendering | 6 files | Keep - used in AI chat |
| **@hello-pangea/dnd** | ~60KB | Drag-drop (kanban) | 4 files | Keep - core feature |
| **@dnd-kit/*** (3 packages) | ~80KB | Drag-drop | 11 files | Keep - core feature |

### LOW - Dev/Test Only (Not in Production Bundle)

| Package | Notes | Recommendation |
|---------|-------|----------------|
| **@playwright/test** | E2E tests | Move to devDependencies |
| **vitest** | Unit tests | Already dev (OK) |
| **@testing-library/*** | Tests | Move to devDependencies |

### UNUSED - No Imports Found

| Package | Est. Size | Recommendation |
|---------|-----------|----------------|
| **@tabler/icons-react** | ~200KB | **REMOVE** - No usage, lucide-react used instead |
| **@tiptap/extensions** | ~150KB | **REMOVE** - No direct imports |
| **react-icons** | ~50KB | **REMOVE** - Only 2 files use it (switch to lucide) |
| **@mediapipe/camera_utils** | ~100KB | **REMOVE** - No imports found |
| **@mediapipe/selfie_segmentation** | ~100KB | **REMOVE** - No imports found |
| **@mantine/core** | ~300KB | **REMOVE** - Only @blocknote uses internal mantine |
| **@mantine/hooks** | ~50KB | **REMOVE** - Same as above |

---

## Immediate Action Plan

### Phase 1: Remove Unused Dependencies (Immediate Build Fix)

Remove these packages from `package.json` - no code imports them:

```text
@tabler/icons-react
@tiptap/extensions
@mediapipe/camera_utils
@mediapipe/selfie_segmentation
@mantine/core
@mantine/hooks
```

Estimated savings: **~900KB** from bundle, significant memory reduction during build.

### Phase 2: Pause Non-Critical Features

Temporarily remove or lazy-load these to unblock the build:

| Package | Feature | Impact |
|---------|---------|--------|
| livekit-client | Video meetings | Meetings won't work |
| @livekit/components-* | Video UI | Same as above |
| @opentelemetry/* | Tracing | Dev debugging only |
| @capacitor/* | Mobile app | Web still works |
| @elevenlabs/react | AI voice | Voice features disabled |

### Phase 3: Move Test Packages to devDependencies

These should not be in `dependencies`:

```text
@playwright/test
@testing-library/dom
@testing-library/jest-dom
@testing-library/react
```

---

## Current Build Optimization Status

Your `vite.config.ts` already has good optimizations:

| Setting | Status | Notes |
|---------|--------|-------|
| `maxParallelFileOps: 1` | Enabled | Reduces peak memory |
| `cssCodeSplit: false` | Enabled | Single CSS file |
| `manualChunks` | Enabled | Separates heavy libs |
| Heavy libs as `external` (dev) | Enabled | But not in production |

**The Problem**: Production builds still bundle everything. The `external` list only applies to development mode.

---

## Recommended Next Steps

1. **Immediate**: Remove the 6 unused packages listed above
2. **Short-term**: Move test packages to devDependencies
3. **If build still fails**: Temporarily remove livekit and @opentelemetry packages
4. **Long-term**: Implement proper code splitting for @blocknote and recharts components

---

## Technical Notes

- **Module count**: 17,807 (extremely high for a React app)
- **Build phase failing**: "rendering chunks" (memory-intensive phase)
- **Heap limit reached**: ~3GB (Node.js default max)
- **Dynamic imports working**: mermaid, fabric, katex all use proper dynamic imports

The root cause is too many large dependencies bundled together. Removing unused packages and moving test utilities to devDependencies should recover enough memory for the build to complete.

