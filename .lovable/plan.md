
# Fix: Mobile Layout Broken Across All Pages (Batch 2)

## Problem

After fixing the first batch of ~15 pages, there are still 52 files using width-capping patterns (`container mx-auto`, `max-w-*xl mx-auto`) and/or redundant `<AppLayout>` wrappers. These pages render at constrained desktop widths on mobile instead of adapting to the smaller viewport.

Pages wrapped in redundant `<AppLayout>` cause double sidebars (the page's own AppLayout + the ProtectedLayout's AppLayout), which steals space from content on all viewports and especially hurts mobile.

## Pages to Fix (grouped by priority)

### Group A: Pages with redundant AppLayout wrappers (highest impact -- double sidebar)

These pages render INSIDE ProtectedLayout which already provides AppLayout. Wrapping again causes double sidebar:

1. `src/pages/CourseDetail.tsx` -- `<AppLayout>` + `container max-w-7xl mx-auto`
2. `src/pages/SubscriptionSuccess.tsx` -- `<AppLayout>` + `container max-w-2xl mx-auto`
3. `src/pages/SchedulingSettings.tsx` -- `<AppLayout>` + `container mx-auto`
4. `src/pages/ModuleEdit.tsx` -- `<AppLayout>` + `container max-w-5xl mx-auto`
5. `src/pages/admin/InvestorDashboard.tsx` -- `<AppLayout>` + `container max-w-7xl mx-auto`
6. `src/pages/ReferralProgram.tsx` -- `<AppLayout>` + wrapping pattern

For each: Remove `<AppLayout>` wrapper + replace `container mx-auto max-w-*xl` with `w-full px-4 sm:px-6 lg:px-8`.

### Group B: Pages with container/max-w constraints (no redundant AppLayout)

7. `src/pages/Admin.tsx` -- `container mx-auto px-4`
8. `src/pages/Meetings.tsx` -- `container mx-auto px-4`
9. `src/pages/ConnectsStorePage.tsx` -- `container max-w-6xl`
10. `src/pages/BookingPage.tsx` -- `container mx-auto max-w-5xl`
11. `src/pages/WhatsAppImport.tsx` -- `container mx-auto max-w-4xl`
12. `src/pages/KnowledgeBase.tsx` -- `container max-w-7xl`
13. `src/pages/support/SupportTicketList.tsx` -- `container max-w-6xl`
14. `src/pages/support/SupportTicketNew.tsx` -- `container max-w-3xl`
15. `src/pages/support/SupportTicketDetail.tsx` -- likely `container`
16. `src/pages/JobsMap.tsx` -- `container mx-auto` in header

For each: Replace `container mx-auto` / `container max-w-*xl` with `w-full px-4 sm:px-6 lg:px-8`.

### Group C: Public/standalone pages (use their own layout, not inside ProtectedLayout)

17. `src/pages/legal/LegalHub.tsx` -- `container mx-auto` (OK to keep, not inside ProtectedLayout)
18. `src/pages/legal/AccessibilityStatement.tsx` -- same
19. `src/pages/PartnershipSubmitted.tsx` -- `container mx-auto` (standalone page)

For public pages: Replace `container mx-auto` with `w-full px-4 sm:px-6 lg:px-8` but keep any intentional max-width on content cards (not page wrapper).

## Fix Pattern (applied consistently)

```text
BEFORE:
  <AppLayout>
    <div className="container max-w-7xl mx-auto p-6">
      ...content...
    </div>
  </AppLayout>

AFTER:
  <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
    ...content...
  </div>
```

## Technical Details

For each file:
- Remove `<AppLayout>` import and wrapper (if present and page is in ProtectedLayout routes)
- Replace `container mx-auto` with `w-full`
- Replace `max-w-*xl mx-auto` with responsive padding `px-4 sm:px-6 lg:px-8`
- Keep existing `py-*` padding values
- Leave max-width on modal/dialog/card internals untouched
- Leave public pages' structural containers if they provide their own header/footer

## Execution

Will process all ~16 highest-impact files (Groups A and B) in this batch. Group C (public pages) can follow if needed.

## Risk

Low. All changes are CSS class replacements following the same pattern successfully applied to the first batch of 15 files. The AppLayout already provides the correct full-width flex layout structure.
