

# Logo Replacement — Final Plan

## Asset Mapping

| Uploaded File | Target |
|---|---|
| 500x500 PNG (`LIVE_LIKE_BENNY_COMMENT_OS_1200_x_630_px_630_x_630_px.png`) | All `public/` icons + `public/quantum-logo.png` (new) |
| HQ PNG (`LIVE_LIKE_BENNY_COMMENT_OS_1200_x_630_px_630_x_630_px_1.png`) | All `src/assets/` logo PNGs (overwrite in-place) |

## Changes

### 1. Create `public/quantum-logo.png` from 500x500 upload
Copy uploaded 500x500 to `public/quantum-logo.png`.

### 2. Overwrite all PWA/system icons (public/) with 500x500 PNG
`icon-192.png`, `icon-512.png`, `icon-192-maskable.png`, `icon-512-maskable.png`, `apple-touch-icon.png`, `apple-touch-icon-180x180.png`, `apple-touch-icon-180.png`, `apple-touch-icon-167x167.png`, `apple-touch-icon-167.png`, `apple-touch-icon-152x152.png`, `apple-touch-icon-152.png`, `favicon.png`, `favicon-32x32.png`, `favicon-16x16.png`, `icon-base.png`, `icon-source.png`, `qc-icon-light.png`, `qc-icon-dark.png`, `quantum-clover-icon.png`

### 3. Overwrite all in-app logos (src/assets/) with HQ PNG
`quantum-club-logo.png`, `quantum-logo-dark.png`, `quantum-logo-dark-transparent.png`, `quantum-logo-light.png`, `quantum-logo-light-transparent.png`, `quantum-logo-black.png`, `quantum-logo-white.png`

Zero import path changes needed — 21 component files keep working.

### 4. Code edits (3 files)

**`src/components/ui/unified-loader.tsx`** — Change line 27 from `/quantum-logo.svg` to `/quantum-logo.png`. Keep framer-motion breathing pulse as-is.

**`index.html`** — Change preload and boot screen `<img>` refs from `quantum-logo.svg` to `quantum-logo.png`.

**`src/main.tsx`** — Change error fallback `<img>` from `quantum-logo.svg` to `quantum-logo.png`.

### 5. Delete obsolete SVGs
- `public/quantum-logo.svg`
- `src/assets/quantum-logo.svg`

### Summary
- 28 image files overwritten
- 1 new file (`public/quantum-logo.png`)
- 3 code files edited (svg→png reference)
- 2 SVG files deleted
- UnifiedLoader keeps framer-motion breathing animation, just shows new logo

