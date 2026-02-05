

## Holistic Fix: LiveKit Module Resolution Error

### Root Cause Analysis

The error `Failed to resolve module specifier "livekit-client"` occurs because of a **conflict between Vite's development configuration and runtime module resolution**.

**In `vite.config.ts` (lines 218-240):**
```typescript
// Development mode: mark heavy libs as external
...(mode === 'development' ? {
  external: [
    'livekit-client',
    '@livekit/components-react',
    '@livekit/components-styles',
    // ... other packages
  ],
} : {}),
```

**What this means:**
1. In development mode, Vite marks `livekit-client` as "external"
2. External packages are **not bundled** - they're expected to be available at runtime
3. When the browser encounters `import ... from 'livekit-client'`, it cannot resolve bare module specifiers
4. The browser throws: `Failed to resolve module specifier "livekit-client"`

**Why it crashes on `/meeting-intelligence`:**
The `LiveKitMeetingWrapper.tsx` file has static top-level imports from `@livekit/components-react`:

```typescript
import {
    LiveKitRoom,
    VideoConference,
    RoomAudioRenderer,
    LayoutContextProvider,
} from '@livekit/components-react';
import '@livekit/components-styles';
```

Even though `MeetingVideoCallInterface` lazy-loads `LiveKitMeetingWrapper`, the **bundler still tries to resolve** the external packages when preparing the module graph.

---

### Solution

There are two complementary fixes needed:

#### Fix 1: Remove LiveKit from External List (Temporary Dev Fix)

Remove `livekit-client`, `@livekit/components-react`, and `@livekit/components-styles` from the `external` array in `vite.config.ts`. This allows Vite to bundle these packages normally.

**File:** `vite.config.ts`

**Before (lines 218-240):**
```typescript
external: [
  'mermaid',
  '@mediapipe/selfie_segmentation',
  '@mediapipe/camera_utils',
  'fabric',
  'katex',
  '@blocknote/core',
  '@blocknote/react',
  '@blocknote/mantine',
  'livekit-client',          // ← REMOVE
  '@livekit/components-react', // ← REMOVE
  '@livekit/components-styles', // ← REMOVE
  'jspdf',
  'jspdf-autotable',
  // ...
],
```

**After:**
```typescript
external: [
  'mermaid',
  '@mediapipe/selfie_segmentation',
  '@mediapipe/camera_utils',
  'fabric',
  'katex',
  '@blocknote/core',
  '@blocknote/react',
  '@blocknote/mantine',
  // LiveKit removed - must be bundled for lazy loading to work
  'jspdf',
  'jspdf-autotable',
  // ...
],
```

#### Fix 2: Ensure Dynamic Import Pattern for LiveKit (Long-term Stability)

To prevent future regressions and keep memory footprint low, restructure `LiveKitMeetingWrapper.tsx` to use dynamic imports instead of static top-level imports.

**File:** `src/components/meetings/LiveKitMeetingWrapper.tsx`

**Current problematic pattern:**
```typescript
import {
    LiveKitRoom,
    VideoConference,
    RoomAudioRenderer,
    LayoutContextProvider,
} from '@livekit/components-react';
import '@livekit/components-styles';
```

**New pattern using dynamic imports:**
```typescript
// No static imports from @livekit at the top level
// Components are loaded dynamically only when this wrapper is rendered

const LiveKitComponents = lazy(() => 
  import('@livekit/components-react').then(mod => ({
    default: () => {
      // Import styles side-effect
      import('@livekit/components-styles');
      return mod;
    }
  }))
);
```

However, since the `LiveKitMeetingWrapper` is **already lazy-loaded** by `MeetingVideoCallInterface`, the simpler fix is just removing it from the external list.

---

### Files to Modify

| File | Change |
|------|--------|
| `vite.config.ts` | Remove `livekit-client`, `@livekit/components-react`, `@livekit/components-styles` from the `external` array in development mode |

---

### Technical Explanation

```text
Current flow (broken):
┌─────────────────────────────────────────────────────────────┐
│ Browser loads /meeting-intelligence                         │
├─────────────────────────────────────────────────────────────┤
│ Vite prepares module graph                                  │
│ ├── MeetingIntelligence.tsx (lazy ✓)                        │
│ ├── ... (other deps)                                        │
│ └── LiveKitMeetingWrapper.tsx (lazy ✓)                      │
│     └── @livekit/components-react (EXTERNAL = NOT BUNDLED)  │
│         └── livekit-client (EXTERNAL = NOT BUNDLED)         │
│             └── Browser: "I can't resolve bare specifiers!" │
│                 └── ❌ ERROR                                 │
└─────────────────────────────────────────────────────────────┘

Fixed flow:
┌─────────────────────────────────────────────────────────────┐
│ Browser loads /meeting-intelligence                         │
├─────────────────────────────────────────────────────────────┤
│ Vite prepares module graph                                  │
│ ├── MeetingIntelligence.tsx (lazy ✓)                        │
│ ├── ... (other deps)                                        │
│ └── LiveKitMeetingWrapper.tsx (lazy ✓)                      │
│     └── @livekit/components-react (BUNDLED in livekit chunk)│
│         └── livekit-client (BUNDLED in livekit chunk)       │
│             └── ✅ Loaded only when user joins meeting      │
└─────────────────────────────────────────────────────────────┘
```

---

### Memory Impact

The memory issue that originally caused LiveKit to be marked as external is addressed by:

1. **Lazy loading** - `LiveKitMeetingWrapper` is already lazy-loaded via `React.lazy()`
2. **Code splitting** - Production builds already chunk LiveKit separately (line 251 in vite.config.ts)
3. **Conditional rendering** - LiveKit components only mount when `useLiveKitMode` is true

Removing it from the external list means Vite will bundle it (adding ~50-100ms to dev server start), but this is necessary for the app to work.

---

### Acceptance Criteria

1. `/meeting-intelligence` route loads without errors
2. App starts successfully in development mode
3. Meeting features remain functional when LiveKit mode is enabled
4. No increase in initial page load (LiveKit stays lazy-loaded)
5. Production builds continue to chunk LiveKit separately

