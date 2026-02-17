
# Replace Assignee Dropdown with Searchable Input

## Problem
The "Assign to others" section shows a flat scrollable list of all users (up to 50). For admins managing many users, this is unwieldy -- no way to filter or search by name.

## Solution
Replace the static list (lines 501-522) with a searchable text input that filters profiles as the admin types. Uses the same data source (`profiles` state) but adds client-side filtering with a dedicated search input.

## Changes

### `src/components/unified-tasks/CreateUnifiedTaskDialog.tsx`

1. Add a `assigneeSearch` state variable (string, default "")
2. Replace the current "Assign to others" block (the `max-h-48` scrollable div at lines 502-521) with:
   - A search `Input` with placeholder "Search by name..." and a `Users` icon
   - Filter the `profiles` array client-side: `profiles.filter(p => p.full_name?.toLowerCase().includes(assigneeSearch.toLowerCase()))`
   - Show "No results" text when filter returns empty
   - Keep the same avatar + click-to-toggle UI for each result
   - Auto-focus the search input when `showAssignOthers` is toggled on
3. Clear `assigneeSearch` when `showAssignOthers` is toggled off or when the dialog closes (inside the existing `resetForm`)

No new dependencies, no database changes, no new files. Just a search filter on the existing profile list.
