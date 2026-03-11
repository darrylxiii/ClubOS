

# PWA Icon Replacement — Targeted Plan

## Scope

Replace **only** the PWA/app icons that show the AI-generated "Qc" logo. Do **not** touch browser favicons (`favicon.png`, `favicon-32x32.png`, `favicon-16x16.png`, `favicon.ico`) or apple-touch-icon variants — those are fine.

## Files to Replace

These 6 files are the PWA and email icons that use the ugly Qc logo:

| File | Used By | Replace With |
|------|---------|-------------|
| `public/icon-192.png` | PWA manifest (app icon on home screen) | Astronaut logo (500px version, serves well at 192) |
| `public/icon-512.png` | PWA manifest (splash screen) | Astronaut logo (high-quality version) |
| `public/icon-192-maskable.png` | PWA manifest (adaptive icon) | Astronaut logo (500px version) |
| `public/icon-512-maskable.png` | PWA manifest (adaptive icon) | Astronaut logo (high-quality version) |
| `public/icon-base.png` | Source reference file | Astronaut logo (high-quality version) |
| `public/icon-source.png` | Source reference file | Astronaut logo (high-quality version) |

## Additional email icons (if they use the same ugly Qc)

| File | Used By | Replace With |
|------|---------|-------------|
| `public/qc-icon-dark.png` | Email templates (meeting join buttons) | Astronaut logo (500px version) |
| `public/qc-icon-light.png` | Email templates (meeting join buttons) | Astronaut logo (500px version) |

## Cache Busting

- `public/manifest.webmanifest`: bump `?v=2` → `?v=3` on all 4 icon references

## What stays untouched
- `favicon.png`, `favicon-32x32.png`, `favicon-16x16.png`, `favicon.ico`
- All `apple-touch-icon-*.png` variants
- `quantum-clover-icon.png`, `quantum-logo.svg`
- All OG images
- `index.html` (no changes needed since we're not touching favicon refs)
- iOS app icon

