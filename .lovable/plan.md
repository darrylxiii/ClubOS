

# Fix: Hub Tab Navigation -- Match Working Jobs Hub Pattern

## Root Cause (confirmed by comparing working vs broken code)

The **Jobs Hub tabs work** because they use `TabsList className="h-auto flex-wrap"`, which cooperates with the base component's `inline-flex` display mode.

The **Assessments, Finance, Security, and Translations Hubs are broken** because they use `TabsList className="grid w-full grid-cols-N"`. The `grid` display mode is supposed to override `inline-flex` through tailwind-merge, but in practice this combination produces invisible or collapsed tabs.

## Fix

Rewrite all four broken hubs to use the exact same pattern as the working Jobs Hub: `h-auto flex-wrap` on `TabsList`, no custom `className` on `TabsTrigger`.

## Files Changed (4)

### 1. `src/pages/admin/AssessmentsHub.tsx`

Change line 32 from:
```tsx
<TabsList className="grid w-full grid-cols-5">
```
To:
```tsx
<TabsList className="h-auto flex-wrap">
```

### 2. `src/pages/admin/FinanceHub.tsx`

- Remove the `triggerClass` constant (line 31)
- Change the `TabsList` (line 56) from:
```tsx
<TabsList className="grid w-full grid-cols-3 md:grid-cols-5 lg:grid-cols-9 bg-muted/50 p-1 rounded-lg h-auto gap-1">
```
To:
```tsx
<TabsList className="h-auto flex-wrap">
```
- Remove all `className={triggerClass}` from the 9 `TabsTrigger` elements (plain triggers, no custom class)

### 3. `src/pages/admin/SecurityHub.tsx`

- Remove the `triggerClass` constant (line 25)
- Change `TabsList` (line 50) to `className="h-auto flex-wrap"`
- Remove all `className={triggerClass}` from the 6 triggers

### 4. `src/pages/admin/TranslationsHub.tsx`

- Remove the `triggerClass` constant (line 29)
- Change `TabsList` (line 55) to `className="h-auto flex-wrap"`
- Remove all `className={triggerClass}` from the 6 triggers

## Why This Works

The Jobs Hub uses `h-auto flex-wrap` and it works. This pattern:
- Keeps the base `inline-flex` display mode (no conflict)
- `h-auto` removes any height constraint so tabs can wrap to multiple lines
- `flex-wrap` allows wrapping on smaller screens
- No `bg-muted/50` or custom trigger classes that create contrast issues

This is a copy-the-working-pattern fix, not a guess.

