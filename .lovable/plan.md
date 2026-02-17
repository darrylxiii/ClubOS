
# Fix Attendee Avatars Comprehensively

## Root Cause (two issues)

1. **Email mismatch**: Team members register with one email (e.g., `sebastiaan.brouwer@live.nl`) but their calendar events use a different email (e.g., `sebastiaan@thequantumclub.nl`). The current hook only matches by exact email against the `profiles` table, so it never finds their avatar.

2. **Gravatar silhouettes**: The `emails` table stores Gravatar URLs with `?d=mp`, which returns a generic gray person silhouette for emails without a real Gravatar. The `<AvatarImage>` loads this silhouette "successfully", blocking the initials fallback -- resulting in the blank white/gray circles you see.

## Solution

### 1. Add a third lookup source: `calendar_connections`

The `calendar_connections` table maps `user_id` to `email` (the calendar email). By joining this with `profiles`, we can resolve calendar emails like `darryl@thequantumclub.nl` back to the user's profile avatar.

**Lookup priority becomes:**
1. `profiles` table (match by email directly) -- covers users who registered with the same email
2. `calendar_connections` joined with `profiles` (match calendar email to user_id, then get avatar from profiles) -- covers team members with different login vs calendar emails
3. `emails` table `from_avatar_url` (Gravatar from Gmail sync) -- covers external contacts
4. Initials fallback -- when nothing else works

### 2. Filter out Gravatar placeholder URLs

Gravatar URLs with `?d=mp` return a generic silhouette for ANY email. Replace `d=mp` with `d=404` in stored URLs so the browser gets a 404 instead of a placeholder image. When the `<AvatarImage>` fails to load, Radix Avatar automatically falls back to `<AvatarFallback>` (initials).

### 3. Always render `<AvatarImage>` (remove conditional)

Currently: `{profile?.avatar_url && <AvatarImage ... />}` -- this skips rendering the image element entirely when there is no URL, which is fine. But when there IS a URL, the image always "succeeds" even if it is a Gravatar placeholder.

Change: Always render `<AvatarImage>` when a URL exists (keep the conditional), but transform the URL to use `d=404` so fake Gravatars fail and show initials instead.

---

## Technical Changes

### File: `src/hooks/useAttendeeProfiles.ts`

- After Query 1 (profiles), add Query 2: fetch `calendar_connections` where `email IN (unresolvedEmails)`, join with `profiles` via `user_id` to get `avatar_url` and `full_name`
- Move the existing `emails` table query to Query 3 (only for still-unresolved emails)
- In Query 3, transform any Gravatar URL: replace `d=mp` with `d=404` so placeholder silhouettes become 404s
- Add a helper function `sanitizeGravatarUrl(url)` that swaps `d=mp` to `d=404`

### File: `src/components/clubhome/ActiveMeetingsWidget.tsx`

- No structural changes needed -- already uses `useAttendeeProfiles` correctly
- The fix in the hook will automatically resolve the avatars

### File: `src/components/meetings/EventDetailModal.tsx`

- No structural changes needed -- already uses `useAttendeeProfiles` correctly

---

## Files

| File | Action |
|---|---|
| `src/hooks/useAttendeeProfiles.ts` | Edit -- add calendar_connections lookup, sanitize Gravatar URLs |

No other files need changes. The widget and modal already consume the hook correctly -- the hook just needs to return better data.
