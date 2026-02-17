
# Show Profile Pictures for Meeting Attendees (Multi-Source)

## What changes

Replace the initial-only avatars in the ActiveMeetingsWidget and EventDetailModal with real profile pictures, pulling from two sources:

1. **`profiles` table** -- for team members / platform users (matched by email)
2. **`emails` table** -- for external contacts whose Gravatar URLs were captured during Gmail sync (matched by `from_email` to `from_avatar_url`)

This covers both internal users and external contacts, so nearly every attendee will have a photo.

---

## New file: `src/hooks/useAttendeeProfiles.ts`

A hook that accepts an array of email addresses and returns a map of email to avatar URL + display name.

**Logic:**
- Deduplicate incoming emails
- Query 1: `profiles` table -- `SELECT email, full_name, avatar_url WHERE email IN (...)`
- Query 2: `emails` table -- `SELECT DISTINCT ON (from_email) from_email, from_name, from_avatar_url WHERE from_email IN (...)` (only for emails not already resolved from profiles)
- Merge results: profiles take priority over email-synced avatars
- Return `Map<string, { avatar_url: string | null; full_name: string | null }>`
- Uses React Query with a stable cache key derived from sorted emails
- Skips queries when the email list is empty

---

## Edit: `src/components/clubhome/ActiveMeetingsWidget.tsx`

- Import `useAttendeeProfiles` and `AvatarImage`
- Collect all attendee emails from loaded events into a flat array
- Pass to `useAttendeeProfiles` to get the profile map
- Update `AttendeeAvatars` to accept the profile map as a prop
- Render `<AvatarImage src={...} />` when a match exists; keep initials as `<AvatarFallback>`

---

## Edit: `src/components/meetings/EventDetailModal.tsx`

- Import `useAttendeeProfiles` and `AvatarImage`
- Call hook with event attendees
- In the attendee pills section, add `<AvatarImage>` to each `<Avatar>`
- Show `full_name` from the resolved profile as primary text (email as secondary) when available

---

## Lookup priority

```
1. profiles.avatar_url  (platform user photo -- highest trust)
2. emails.from_avatar_url  (Gravatar from Gmail sync -- external contacts)
3. Initials fallback  (unchanged behavior for unknowns)
```

---

## Files

| File | Action |
|---|---|
| `src/hooks/useAttendeeProfiles.ts` | Create -- multi-source email-to-avatar resolver |
| `src/components/clubhome/ActiveMeetingsWidget.tsx` | Edit -- render profile photos in stacked avatars |
| `src/components/meetings/EventDetailModal.tsx` | Edit -- render profile photos in attendee pills |

No database changes needed.
