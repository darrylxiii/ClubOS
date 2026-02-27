

# Fix: App Crash — "Cannot read properties of undefined (reading 'forwardRef')"

## Root Cause

`@dnd-kit/sortable` version 10 dropped React 18 support and requires React 19. The project uses React 18.3.1. When the module initializes, it calls `React.forwardRef` from a React 19-style import path that resolves to `undefined`, crashing the entire app before any component renders.

## Fix

### 1. Downgrade `@dnd-kit/sortable` to v9 (React 18 compatible)

**File:** `package.json`

Change:
```
"@dnd-kit/sortable": "^10.0.0"
```
To:
```
"@dnd-kit/sortable": "^9.0.0"
```

The v9 API is the same as what this project uses (`useSortable`, `SortableContext`, `verticalListSortingStrategy`, `arrayMove`). No code changes needed in any of the 14 files importing from it.

### 2. Verify no other React 19-only packages

Scan `@dnd-kit/core` v6 and `@dnd-kit/utilities` v3 — these are React 18 compatible. No changes needed.

## Impact

- Zero code changes to components — only `package.json` version pin
- App will boot again immediately after the dependency resolves

