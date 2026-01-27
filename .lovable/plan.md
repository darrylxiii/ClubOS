
# Fix: Location Dropdown Closing Instantly in New Job Modal

## Problem Identified

The location dropdown in the "New Job Modal" disappears immediately when clicked. The session replay confirms this behavior - the dropdown opens (`data-state="open"`) and immediately closes (`data-state="closed"`) within milliseconds.

## Root Cause

This is a **Radix UI focus trap conflict** between nested `Popover` and `Dialog` components:

1. The `CreateJobDialog` uses Radix `Dialog` which has a built-in focus trap
2. The `EnhancedLocationAutocomplete` uses a Radix `Popover` which also tries to manage focus
3. When the `PopoverContent` renders through a Portal (outside the Dialog's DOM tree), the Dialog's focus trap detects focus leaving and/or the Popover's focus management conflicts
4. Result: The popover opens but immediately closes due to the focus conflict

## Solution

Add the `modal={false}` prop to the `Popover` component. This is the documented Radix UI approach for using Popovers inside Dialogs:

- **`modal={false}`** - Disables the popover's focus trap and outside-click handling, allowing it to coexist with the Dialog's focus management

## Files to Modify

| File | Change |
|------|--------|
| `src/components/ui/enhanced-location-autocomplete.tsx` | Add `modal={false}` to `Popover` component |
| `src/components/ui/location-autocomplete.tsx` | Add `modal={false}` to `Popover` component |

## Implementation Details

### 1. Fix EnhancedLocationAutocomplete (Primary Issue)

**File:** `src/components/ui/enhanced-location-autocomplete.tsx`
**Line:** 212

```tsx
// Before
<Popover open={open} onOpenChange={setOpen}>

// After
<Popover open={open} onOpenChange={setOpen} modal={false}>
```

### 2. Fix LocationAutocomplete (For Consistency)

**File:** `src/components/ui/location-autocomplete.tsx`
**Line:** 119

```tsx
// Before
<Popover open={open} onOpenChange={setOpen}>

// After
<Popover open={open} onOpenChange={setOpen} modal={false}>
```

## Technical Explanation

From the Radix UI documentation:
- When `modal={true}` (the default), the Popover:
  - Traps focus inside the content
  - Closes when clicking outside
  - Prevents interaction with elements outside

- When `modal={false}`:
  - Does NOT trap focus
  - Does NOT auto-close on outside clicks (relies on explicit state management)
  - Allows interaction with parent components

Since the `CreateJobDialog` already manages focus trapping at the Dialog level, the nested Popover should not add its own focus trap. Setting `modal={false}` allows both components to work together.

## Additional Considerations

The fix may also optionally benefit from:
- Adding `onOpenAutoFocus={(e) => e.preventDefault()}` to `PopoverContent` if focus jumping issues persist
- Adding `onInteractOutside={(e) => e.preventDefault()}` to prevent accidental closure when clicking other form fields

However, the `modal={false}` fix alone should resolve the immediate close issue.

## Testing Checklist

After implementation:
1. Open the "New Job" modal from `/jobs` (Partner view)
2. Click on the Location field
3. Verify the dropdown stays open
4. Type a city name and confirm suggestions appear
5. Click a suggestion and verify it populates the field
6. Verify the dropdown closes properly after selection
7. Test in `EditJobSheet` which also uses `EnhancedLocationAutocomplete`
