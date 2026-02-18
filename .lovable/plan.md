
# Fix: Full Screen Utilization -- Root Cause Found

## The Real Problem

**`src/App.css` line 2** contains the Vite starter boilerplate:

```css
#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}
```

This caps the ENTIRE application at 1280px and centers it with 2rem padding on all sides. Every page, every widget, every grid is imprisoned inside this 1280px box. No amount of per-page fixes will help -- this is the ceiling above everything.

This is leftover from the Vite "Hello World" template and should have been removed on day one.

## Fix (3 layers)

### Layer 1: Remove the root cap (App.css)

Replace the `#root` block with:

```css
#root {
  width: 100%;
  min-height: 100vh;
}
```

This single change will immediately unlock all pages to use the full viewport width. The sidebar, header, and all content will expand to fill the screen.

### Layer 2: Upgrade DashboardSection grid for wider screens

Currently `DashboardSection` maxes out at `lg:grid-cols-3`. On 2xl+ screens (1536px+), the grid should expand further. Also, it uses dynamic Tailwind class interpolation (`` `grid-cols-${mobileColumns}` ``) which gets purged by JIT.

Fix by using explicit class maps and adding `xl`/`2xl` breakpoints:

```
columns=2 --> grid-cols-1 lg:grid-cols-2
columns=3 --> grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
columns=4 --> grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
```

### Layer 3: Continue batch cleanup of remaining ~98 pages

With the root cap removed, pages that still wrap in redundant `<AppLayout>` (causing double sidebar) or use `container mx-auto` (centering within a centered box) need cleanup. This is the same pattern from the approved plan -- removing `container mx-auto`, `max-w-7xl`, and redundant `<AppLayout>` wrappers.

Priority files (Partner pages the user is looking at):
- PartnerRejections, PartnerTargetCompanies, PartnerOnboarding
- IntegrationsManagement, AuditLog, PartnerAnalyticsDashboard
- BillingDashboard, SLADashboard, LiveInterview

Then remaining ~90 pages across Feature, Meeting, Support, and Project modules.

## Scope

- **1 critical fix**: `App.css` root cap removal (this alone fixes ~70% of the problem)
- **1 component fix**: `DashboardSection.tsx` grid scaling
- **~100 page files**: Remove `container mx-auto`, `max-w-*xl`, and redundant `<AppLayout>` wrappers

## Risk

Very low. The `App.css` change removes constraints, it doesn't add any. The `AppLayout` component already handles full-width layout correctly (`min-h-screen flex w-full`). Internal card/grid layouts use responsive Tailwind that will naturally expand.
