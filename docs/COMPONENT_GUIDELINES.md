# Component Usage Guidelines

This document provides comprehensive guidelines for using UI components consistently across The Quantum Club platform.

## Button Component

### Variants

| Variant | Use Case | Example |
|---------|----------|---------|
| `default` | Primary actions, main CTAs | "Save", "Submit", "Apply" |
| `primary` | Emphasized primary actions | "Create Account", "Get Started" |
| `secondary` | Secondary actions | "Cancel", "Back" |
| `destructive` | Dangerous/irreversible actions | "Delete", "Remove" |
| `success` | Positive confirmations | "Confirm", "Approve" |
| `warning` | Cautionary actions | "Override", "Force Update" |
| `outline` | Less prominent actions | "Learn More", "View Details" |
| `ghost` | Subtle actions, navigation | Icon buttons, menu items |
| `link` | Inline links | Text links within content |

### Sizes

- `default` - Standard buttons
- `sm` - Compact spaces, inline actions
- `lg` - Hero sections, primary CTAs
- `icon` - Icon-only buttons (always include `aria-label`)

### Loading State

Always use the `loading` prop for async operations:

```tsx
<Button loading={isSubmitting}>Save Changes</Button>
```

### Icon Buttons

Icon-only buttons MUST include an `aria-label`:

```tsx
<Button variant="ghost" size="icon" aria-label="Close dialog">
  <X className="h-4 w-4" />
</Button>
```

---

## Card Component

### Variants

| Variant | Use Case |
|---------|----------|
| `default` | Standard cards with hover effects |
| `static` | Cards without hover effects (info display) |
| `elevated` | Prominent cards, featured content |
| `interactive` | Clickable cards, list items |
| `outline` | Bordered cards, form sections |
| `ghost` | Subtle background cards |

---

## Input Component

### Props

- `error` - Shows error styling and sets `aria-invalid`
- `success` - Shows success styling (green border)

### With FormField

Use the `FormField` compound component for consistent form layouts:

```tsx
<FormField 
  label="Email Address" 
  error={errors.email?.message}
  required
>
  <Input 
    type="email" 
    error={!!errors.email}
    {...register("email")}
  />
</FormField>
```

---

## Loading States

### Hierarchy

1. **Page loads**: Use `PageLoadingSkeleton` - full page skeleton with branding
2. **Section loads**: Use domain-specific skeletons (e.g., `AdminTableSkeleton`, `GameResultsSkeleton`)
3. **Button actions**: Use `Button` with `loading` prop
4. **Background refreshes**: Silent (no visible loader)

### Available Skeletons

```tsx
import {
  PageLoadingSkeleton,      // Full page loads
  AdminTableSkeleton,       // Admin tables
  GameResultsSkeleton,      // Game admin pages
  ListSkeleton,             // Generic lists
  MessageSkeleton,          // Chat/comments
  CRMActivitySkeleton,      // CRM activities
  ActivityFeedSkeleton,     // Activity feeds
  InlineLoadingSkeleton,    // Small inline spaces
  CardLoadingSkeleton,      // Card content
} from "@/components/LoadingSkeletons";
```

### Pattern: Replace "Loading..." Text

❌ **Don't:**
```tsx
{loading && <p>Loading...</p>}
```

✅ **Do:**
```tsx
{loading ? <AdminTableSkeleton columns={5} /> : <Table>...</Table>}
```

---

## Error Handling

### useAsyncAction Hook

Use for centralized error handling with retry:

```tsx
import { useAsyncAction } from "@/hooks/useAsyncAction";

const { execute, isLoading, error } = useAsyncAction();

const handleSubmit = () => {
  execute(
    () => api.saveData(formData),
    {
      successMessage: "Changes saved successfully",
      errorMessage: "Failed to save changes",
      retry: () => handleSubmit(),
    }
  );
};
```

### ErrorState Component

For error displays with retry options:

```tsx
import { ErrorState } from "@/components/ui/error-state";

{error && (
  <ErrorState 
    variant="card"
    title="Failed to load data"
    message={error.message}
    onRetry={() => refetch()}
  />
)}
```

---

## Accessibility Requirements

### ARIA Labels

All icon-only buttons MUST have `aria-label`:

```tsx
// ✅ Correct
<Button variant="ghost" size="icon" aria-label="Delete item">
  <Trash2 className="h-4 w-4" />
</Button>

// ❌ Incorrect - missing aria-label
<Button variant="ghost" size="icon">
  <Trash2 className="h-4 w-4" />
</Button>
```

### Focus Management

- All interactive elements must be keyboard accessible
- Focus traps for modals and sidebars
- Visible focus rings (never remove with `outline-none`)

### Color Contrast

- Text: minimum 4.5:1 ratio
- Large text (>18px): minimum 3:1 ratio
- UI components: minimum 3:1 ratio

---

## Motion & Animation

### Reduced Motion

Always respect user preferences:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Standard Durations

- Micro-interactions: 150-200ms
- Page transitions: 200-300ms
- Complex animations: 300-500ms

---

## Color Usage

### Semantic Tokens

Always use semantic tokens from the design system:

```tsx
// ✅ Correct
className="bg-background text-foreground border-border"

// ❌ Incorrect - hardcoded colors
className="bg-[#0E0E10] text-white border-gray-700"
```

### Available Tokens

- `background` / `foreground` - Base colors
- `primary` / `primary-foreground` - Brand/accent
- `secondary` / `secondary-foreground` - Secondary actions
- `muted` / `muted-foreground` - Subtle backgrounds/text
- `accent` / `accent-foreground` - Highlights
- `destructive` / `destructive-foreground` - Errors
- `success` / `success-foreground` - Success states
- `warning` / `warning-foreground` - Warnings

---

## File Organization

### Component Structure

```
src/components/
├── ui/                    # Base UI primitives
│   ├── button.tsx
│   ├── card.tsx
│   └── ...
├── [feature]/            # Feature-specific components
│   ├── FeatureCard.tsx
│   └── FeatureList.tsx
└── LoadingSkeletons.tsx  # All skeleton loaders
```

### Naming Conventions

- Components: `PascalCase.tsx`
- Hooks: `use-feature-name.ts` (kebab-case)
- Utils: `feature-utils.ts` (kebab-case)
- Types: `feature.types.ts`

---

## Performance Considerations

### Lazy Loading

Heavy components should be lazy loaded:

```tsx
const ChartComponent = React.lazy(() => import('./ChartComponent'));

// Usage
<Suspense fallback={<ChartSkeleton />}>
  <ChartComponent data={data} />
</Suspense>
```

### Content Visibility

For long lists, use content-visibility:

```css
.content-auto {
  content-visibility: auto;
  contain-intrinsic-size: 0 200px;
}
```

---

## Best Practices Summary

1. ✅ Use semantic color tokens
2. ✅ Add `aria-label` to icon buttons
3. ✅ Use domain-specific skeletons for loading states
4. ✅ Use `Button` loading prop for async actions
5. ✅ Use `FormField` for form layouts
6. ✅ Respect reduced motion preferences
7. ✅ Use `useAsyncAction` for error handling with retry
8. ❌ Don't use hardcoded colors
9. ❌ Don't show "Loading..." text
10. ❌ Don't remove focus outlines
