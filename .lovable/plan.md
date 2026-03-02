

# Social Posting Tracker for Avatar Accounts

## Concept

Each avatar account can be active on multiple social platforms (LinkedIn, Twitter/X, Reddit, Instagram). For each platform, admins set a **weekly posting target** and the system tracks **posts done this week**. When targets are set, a recurring task is automatically created on the responsible admin's task board.

## Database Design

### New table: `avatar_social_targets`

| Column | Type | Default | Purpose |
|---|---|---|---|
| `id` | uuid | gen_random_uuid() | PK |
| `account_id` | uuid (FK -> linkedin_avatar_accounts) | | Which avatar account |
| `platform` | text | | 'linkedin', 'twitter', 'reddit', 'instagram' |
| `platform_handle` | text | null | Username/handle on that platform |
| `platform_url` | text | null | Profile URL on that platform |
| `weekly_target` | integer | 3 | Posts per week goal |
| `weekly_posts_done` | integer | 0 | Posts completed this week |
| `weekly_reset_at` | timestamptz | now() | When counter was last reset |
| `responsible_user_id` | uuid (FK -> auth.users) | | Admin who manages posting for this account+platform |
| `is_active` | boolean | true | Whether this platform is actively being posted to |
| `notes` | text | null | Platform-specific notes/strategy |
| `created_at` | timestamptz | now() | |
| `updated_at` | timestamptz | now() | |

**Unique constraint**: `(account_id, platform)` -- one row per account per platform.

**Weekly reset**: Extend the existing Monday pg_cron job to also reset `weekly_posts_done` to 0.

**RLS**: Same admin/strategist pattern as `linkedin_avatar_accounts`.

### Auto-task creation via DB trigger

When a new `avatar_social_targets` row is inserted (or `responsible_user_id` changes), a trigger creates a recurring task in `unified_tasks`:

- Title: "Post on [Platform] for [Account Label]"
- Type: `social_posting`
- Assigned to the `responsible_user_id`
- Board: the user's personal board (first board where `visibility = 'personal'` and `owner_id = responsible_user_id`)
- Recurrence: weekly
- Due: next Monday

When `weekly_posts_done` is incremented to meet/exceed `weekly_target`, the task is auto-completed for that week.

## UI Changes

### 1. ViewAvatarProfileDialog -- New "Social Presence" Section

Between Connection Requests and About, add a section showing all platforms for this account:

```text
SOCIAL PRESENCE
LinkedIn    [====------] 4/7 posts this week    @john-doe
Twitter/X   [==========] 3/3 done               @johndoe
Reddit      Not configured
Instagram   [==--------] 2/5 posts this week    @johndoe.tqc
```

Each row shows: platform icon, progress bar, count, handle, and a "+1 Post" quick-log button.

### 2. EditAvatarAccountDialog -- New "Social Platforms" Section

Below Connection Request Quota, add a section where admins can:
- Toggle platforms on/off (LinkedIn, Twitter/X, Reddit, Instagram)
- Set weekly target per platform
- Set platform handle/URL
- Assign responsible admin (dropdown of team members)

### 3. AvatarAccountCard -- Social Summary Row

Below the connection quota bar, add a compact row showing platform icons with color-coded dots:
- Green dot: on target or ahead
- Amber dot: behind but active
- Red dot: no posts this week
- Gray dot: not configured

### 4. AvatarAccountGrid -- New "Behind on Posts" filter pill

Shows accounts where any active platform has `weekly_posts_done < weekly_target`.

## Task Board Integration

When `responsible_user_id` is set on an `avatar_social_targets` row:

1. A DB function `create_social_posting_task` fires
2. It finds the user's personal task board via `task_boards` table
3. Creates a `unified_tasks` entry:
   - `title`: "Social: Post on LinkedIn for [Account Label] (0/7)"
   - `task_type`: 'social_posting'
   - `board_id`: personal board of the responsible user
   - `user_id`: responsible user
   - `created_by`: responsible user
   - `status`: 'pending'
   - `priority`: 'medium'
   - `due_date`: next Monday 00:00 UTC
   - `tags`: `["social", platform_name, account_label]`

When `weekly_posts_done` is incremented via the log button, the trigger also updates the task title to reflect the new count and marks it complete if target is met.

## File Changes Summary

| File | Action | Description |
|---|---|---|
| DB migration | Create | New `avatar_social_targets` table, RLS, trigger for auto-task, extend pg_cron reset |
| `useAvatarAccounts.ts` | Edit | Add `useAvatarSocialTargets` query + `logSocialPost` and `upsertSocialTarget` mutations |
| `ViewAvatarProfileDialog.tsx` | Edit | Add Social Presence section with progress bars and quick-log buttons |
| `EditAvatarAccountDialog.tsx` | Edit | Add Social Platforms configuration section |
| `AvatarAccountCard.tsx` | Edit | Add compact social status dots row |
| `AvatarAccountGrid.tsx` | Edit | Add "Behind on Posts" filter pill |

## Platform Details

| Platform | Icon | Color | Handle Format |
|---|---|---|---|
| LinkedIn | Linkedin | blue-700 | /in/username |
| Twitter/X | Twitter | sky-500 | @username |
| Reddit | MessageSquare | orange-500 | u/username |
| Instagram | Instagram | pink-500 | @username |

