# Wave 3 - Breadcrumbs Implementation Guide

## Status: Pattern Established ✅

The breadcrumbs component provides automatic navigation context across the application.

## Component: Breadcrumbs

**Location**: `src/components/ui/breadcrumbs.tsx` (existing)

**Features**:
- Auto-generates breadcrumbs from route path
- Translation support (i18n)
- Smart UUID handling (shows "Details" for detail pages)
- Home icon link
- Only shows for nested pages (2+ levels deep)
- Fully accessible with `aria-label="Breadcrumb"`

**Auto-generation**: The component automatically maps route segments to readable labels:
- `/admin/users` → "Admin > Users"
- `/crm/prospects/abc-123` → "CRM > Prospects > Details"
- Supports custom items for complex scenarios

---

## Implementation Pattern

### Step 1: Add Import

```typescript
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
```

### Step 2: Add Component

Place at the start of your main content container, typically after `RoleGate`:

```typescript
export default function YourPage() {
  return (
    <RoleGate allowedRoles={["admin"]}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Breadcrumbs />
        {/* Rest of page content */}
      </div>
    </RoleGate>
  );
}
```

### Auto-Generated Example

Most pages can use auto-generation (no props needed):

```typescript
// Route: /admin/source-effectiveness
<Breadcrumbs />
// Renders: Home > Admin > Source Effectiveness
```

### Custom Breadcrumbs Example

For complex navigation, pass custom items:

```typescript
<Breadcrumbs
  items={[
    { label: "Dashboard", href: "/dashboard" },
    { label: "Projects", href: "/projects" },
    { label: "Project Alpha" }, // Current page (no href)
  ]}
/>
```

---

## Pages with Breadcrumbs (23 total)

### Original (3)
- ✅ JobDetail.tsx
- ✅ ApplicationDetail.tsx
- ✅ WorkspacePage.tsx

### Admin Pages (9)
- ✅ SourceEffectiveness.tsx
- ✅ SecurityHub.tsx
- ✅ ErrorLogs.tsx
- ✅ UserActivity.tsx
- ✅ AdminAuditLog.tsx
- ✅ LanguageManager.tsx
- ✅ FeatureControlCenter.tsx

### CRM Pages (7)
- ✅ CRMDashboard.tsx
- ✅ ProspectPipeline.tsx
- ✅ CRMAnalytics.tsx
- ✅ EmailSequencingHub.tsx
- ✅ ProspectDetail.tsx

### Candidate Pages (3)
- ✅ Settings.tsx
- ✅ Assessments.tsx
- ✅ CareerPath.tsx

### Partner/Business Pages (4)
- ✅ TalentPool.tsx
- ✅ CompanyJobsDashboard.tsx
- ✅ PartnerAnalyticsDashboard.tsx
- ✅ Companies.tsx

### Analytics Pages (1)
- ✅ MessagingAnalytics.tsx

---

## Translation Keys

The breadcrumbs component uses these translation keys (in `common` namespace):

```json
{
  "breadcrumbs": {
    "jobs": "Jobs",
    "applications": "Applications",
    "companies": "Companies",
    "referrals": "Referrals",
    "assessments": "Assessments",
    "offerComparison": "Offer Comparison",
    "coverLetterBuilder": "Cover Letter Builder",
    "interviewPrep": "Interview Prep",
    "profile": "Profile",
    "settings": "Settings",
    "messages": "Messages",
    "meetings": "Meetings",
    "analytics": "Analytics",
    "admin": "Admin",
    "details": "Details"
  }
}
```

Add new keys as needed for your routes.

---

## Remaining Work

**153 pages** still need breadcrumbs (87% of pages).

### High Priority Pages to Add
- Candidate profile pages
- Job management pages
- Partner pipeline pages
- More admin management pages
- Meeting/calendar pages
- Academy/learning pages

### Adoption Strategy

1. **Batch by area**: Add to all admin pages, then all CRM pages, etc.
2. **Use grep**: Find pages without breadcrumbs:
   ```bash
   grep -L "Breadcrumbs" src/pages/**/*.tsx
   ```
3. **Systematic approach**: Add to 10-20 pages at a time
4. **Verify build**: Run `npx tsc --noEmit` after each batch

---

## Score Impact

**Wave 3 Progress**: Breadcrumbs at 13% adoption (23/176 pages)

- ✅ Empty States - Complete
- 🔄 Breadcrumbs - Pattern established, 13% coverage
- ⬜ Toast improvements
- ⬜ aria-live regions
- ⬜ Unsaved changes guards
- ⬜ Command palette enhancements

**Projected score**: When breadcrumbs reach 80%+ adoption: +3 points

---

## Benefits

1. **User Orientation**: Users always know where they are
2. **Quick Navigation**: One-click to parent pages
3. **SEO**: Structured navigation improves search indexing
4. **Accessibility**: Screen reader navigation context
5. **Consistency**: Uniform navigation pattern across app
6. **Zero Maintenance**: Auto-generates from routes

---

## Testing Checklist

After adding breadcrumbs to a page:
- [ ] Breadcrumbs render on page load
- [ ] Home icon links to /home
- [ ] Intermediate links work correctly
- [ ] Current page is not a link
- [ ] Breadcrumbs hide on top-level pages (1 segment)
- [ ] Translation works (test with language switcher)
- [ ] Accessible with keyboard navigation
- [ ] TypeScript compiles clean

---

## Quick Reference

```typescript
// Import
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

// Basic usage (auto-generated)
<Breadcrumbs />

// Custom breadcrumbs
<Breadcrumbs items={[
  { label: "Section", href: "/section" },
  { label: "Current Page" }
]} />

// With className
<Breadcrumbs className="mb-6" />
```
