

# Fix: Double-Nested AppLayout in All 3 Hubs

## Root Cause

Every sub-page embedded as tab content (e.g., `FinancialDashboard`, `AntiHacking`, `TranslationManager`) wraps itself in `<AppLayout>` and often `<RoleGate>`. The Hub pages (`FinanceHub`, `SecurityHub`, `TranslationsHub`) also wrap everything in `<AppLayout>` + `<RoleGate>`. This causes **double sidebar + double header nesting**, pushing the actual content far to the right and down, and hiding the tab navigation entirely.

## Solution

Strip the outer `<AppLayout>` and `<RoleGate>` wrappers from all 21 sub-pages that are embedded as tab content. The Hub provides these wrappers -- the sub-pages should only render their content `<div>`.

Each sub-page also has its own title/header section (e.g., "Financial Dashboard", "Anti-Hacking Dashboard") with `container mx-auto` centering. Since these are now embedded inside a Hub that already has its own title, those per-page titles and `container` wrappers should also be simplified to avoid redundant headers and inconsistent alignment.

## Files to Edit (21 pages across 3 hubs)

### Finance Hub (9 pages)
1. `src/pages/admin/FinancialDashboard.tsx` -- Remove `<AppLayout>`, `<RoleGate>`, strip `container mx-auto py-8` wrapper
2. `src/pages/admin/DealsPipeline.tsx` -- Remove `<RoleGate>`, `<AppLayout>`, strip container
3. `src/pages/admin/RevenueLadderPage.tsx` -- Strip `container mx-auto py-8` (no AppLayout but has container)
4. `src/pages/admin/CompanyFeeConfiguration.tsx` -- Remove `<RoleGate>`, `<AppLayout>`, strip container
5. `src/pages/admin/RevenueShares.tsx` -- Remove `<AppLayout>`, `<RoleGate>`, strip container
6. `src/pages/admin/ExpenseTracking.tsx` -- Remove `<AppLayout>`, `<RoleGate>`, strip container
7. `src/pages/admin/InvoiceReconciliation.tsx` -- Check and strip wrappers
8. `src/pages/admin/MoneybirdSettings.tsx` -- Remove `<RoleGate>`, `<AppLayout>`, strip container
9. `src/pages/admin/DealPipelineSettings.tsx` -- Remove `<AppLayout>`, `<RoleGate>`, strip container

### Security Hub (6 pages)
10. `src/pages/admin/AntiHacking.tsx` -- Remove `<AppLayout>`, `<RoleGate>`
11. `src/pages/admin/SecurityEventDashboard.tsx` -- Remove `<AppLayout>` (both in loading and main return)
12. `src/pages/admin/AdminAuditLog.tsx` -- Remove `<AppLayout>`, `<RoleGate>`
13. `src/pages/admin/ErrorLogs.tsx` -- Remove `<AppLayout>`, `<RoleGate>`
14. `src/pages/admin/GodMode.tsx` -- Remove `<AppLayout>`, `<RoleGate>`
15. `src/pages/admin/DisasterRecoveryPage.tsx` -- Remove `<AppLayout>`

### Translations Hub (6 pages)
16. `src/pages/admin/TranslationManager.tsx` -- Remove `<AppLayout>`
17. `src/pages/admin/TranslationEditor.tsx` -- Remove `<AppLayout>`, `<RoleGate>`
18. `src/pages/admin/TranslationCoverage.tsx` -- Remove `<AppLayout>`, `<RoleGate>`
19. `src/pages/admin/BrandTermManager.tsx` -- Remove `<AppLayout>`, `<RoleGate>`
20. `src/pages/admin/TranslationAuditLog.tsx` -- Remove `<AppLayout>`, `<RoleGate>`
21. `src/pages/admin/LanguageManager.tsx` -- Remove `<AppLayout>`

## Important Consideration

Some of these pages may still be accessible via direct routes (before the redirect kicks in) or referenced elsewhere. To keep them safe for standalone use AND hub-embedded use, the cleanest approach is:

- Remove the `<AppLayout>` and `<RoleGate>` wrappers from each page
- Ensure the existing route redirects (already set up) handle legacy URLs by redirecting to the Hub with the correct `?tab=` parameter
- The Hub provides AppLayout + RoleGate, so embedded pages just render content

## Pattern for Each Page

```tsx
// BEFORE (causes double-nesting)
export default function FinancialDashboard() {
  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin']}>
        <div className="container mx-auto py-8 px-4">
          {/* content */}
        </div>
      </RoleGate>
    </AppLayout>
  );
}

// AFTER (clean embedding)
export default function FinancialDashboard() {
  return (
    <div className="space-y-6">
      {/* content -- no AppLayout, no RoleGate, no container */}
    </div>
  );
}
```

## Result

- Tabs become visible at the top of the Finance/Security/Translations pages
- Content aligns properly within the Hub layout (left-aligned, no double sidebar offset)
- Each Hub's title + subtitle remains the single header for all its tabs
- 21 files updated with a simple wrapper removal pattern
