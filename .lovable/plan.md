

# Smart Reply Inbox -- Full Audit and Improvement Plan

## Audit Findings: CRM Reply Inbox vs. /inbox Best Practices

After comparing `/crm/inbox` (Smart Reply Inbox) against `/inbox` (Email Inbox), here are the gaps and issues ranked by impact.

---

## Issues Found (Current State)

### 1. Reply button opens mailto: link instead of in-app compose
The "Reply" button in `ReplyDetailPanel` triggers `onReply` which calls `handleMarkActioned(id, 'replied')` -- it just marks the reply as actioned but does not actually open any compose interface. The "Use as Template" link uses a raw `mailto:` link, which exits the app entirely. The `/inbox` EmailInbox has a proper in-app `EmailComposer` modal. The CRM inbox has a `send-instantly-reply` edge function but no UI to compose and send.

**Fix:** Add an inline reply composer in the detail panel that calls `send-instantly-reply` via the V2 API, keeping the user in-app.

### 2. No undo on destructive actions
`/inbox` uses `useUndoableAction` for archive and delete -- showing a toast with an "Undo" button. The CRM inbox fires-and-forgets: archive is permanent with no undo path.

**Fix:** Wrap archive/mark-actioned in `useUndoableAction` so users get a brief undo window.

### 3. Star toggle is cosmetic only (does nothing)
`handleToggleStar` calculates a new priority but never writes it to the database. The toast fires but the value is not persisted.

**Fix:** Actually update `crm_email_replies.priority` in the database and optimistically update local state.

### 4. Snooze is cosmetic only (does nothing)
`handleSnooze` shows a toast "Snoozed for 24 hours" but performs no database operation. There is no `snoozed_until` column or re-surfacing logic.

**Fix:** Add a `snoozed_until` column to `crm_email_replies`, update it on snooze, and filter snoozed items from the default list view until the snooze expires.

### 5. No "Select All" checkbox
`/inbox` has a select-all checkbox at the top of the list. The CRM inbox only supports individual checkbox toggling -- no way to select all for bulk operations.

**Fix:** Add a select-all row at the top of the list panel with count display.

### 6. Missing bulk actions beyond archive
`/inbox` has bulk archive, delete, mark-read, and mark-unread. The CRM inbox only has bulk archive. Missing: bulk mark-read, bulk mark-unread, bulk delete/spam.

**Fix:** Expand the bulk action bar to include mark-read, mark-unread, and mark-spam.

### 7. No HTML body rendering
`/inbox` sanitizes and renders HTML email bodies via `DOMPurify`. The CRM detail panel only renders `body_text` split by newlines, losing all formatting from HTML emails. The `body_html` field exists on `crm_email_replies` but is never used.

**Fix:** Render `body_html` (sanitized via DOMPurify) when available, falling back to `body_text`.

### 8. Detail panel does not update when reply data refreshes
If the underlying reply data changes (e.g., AI analysis completes), the `selectedReply` object is stale because it is stored as a snapshot in state. `/inbox` has logic to sync `selectedEmail` with the latest data from the emails array.

**Fix:** Add a `useEffect` that keeps `selectedReply` in sync with the `replies` array after refetch.

### 9. No "load more" / pagination
The hook fetches all non-archived, non-spam replies in one query (no limit). For a growing inbox this will hit the 1000-row default limit and become slow. `/inbox` has `loadMore`, `hasMore`, and `loadingMore` props with infinite scroll.

**Fix:** Add cursor-based pagination to `useCRMEmailReplies` with a sensible default limit (e.g., 50) and a "Load more" trigger in the virtual list.

### 10. No empty state for detail panel on mobile
When no reply is selected on mobile, the user sees the list -- which is correct. But after closing the drawer, the list does not scroll back to where they were because the virtual list re-mounts.

**Fix:** Preserve scroll position in `VirtualReplyList` when returning from detail view.

---

## Implementation Plan

### Phase 1: Critical Functional Fixes (highest impact)

**1a. Inline Reply Composer**
- Add a collapsible reply compose area at the bottom of `ReplyDetailPanel`
- Text area with the suggested reply pre-filled (if available)
- "Send via Instantly" button that calls `send-instantly-reply` edge function
- After sending, auto-mark as actioned and show success toast

**1b. Fix Star Toggle (persist to DB)**
- In `handleToggleStar`, call `supabase.from('crm_email_replies').update({ priority: newPriority })` and optimistically update local state

**1c. Fix Snooze (persist + filter)**
- Database migration: add `snoozed_until` column (nullable timestamptz) to `crm_email_replies`
- On snooze, set `snoozed_until = now() + 24h`
- In `useCRMEmailReplies`, add filter: `.or('snoozed_until.is.null,snoozed_until.lt.now()')`
- Allow user to pick snooze duration (1h, 3h, tomorrow, next week)

### Phase 2: UX Parity with /inbox

**2a. Undo on Archive**
- Import and use `useUndoableAction` in `ReplyInboxContent`
- Wrap `handleArchive` so it shows "Archived -- Undo" toast

**2b. Select All + Expanded Bulk Actions**
- Add a select-all row above the reply list (checkbox + "{n} selected" label)
- Add bulk mark-read, mark-unread, and mark-spam buttons to the action bar

**2c. HTML Body Rendering**
- In `ReplyDetailPanel`, check for `reply.body_html` first
- Sanitize with `DOMPurify` (already installed) and render with `dangerouslySetInnerHTML`
- Apply the same email-body-wrapper CSS from `EmailDetail.tsx` for dark mode and overflow handling
- Fall back to `body_text` line splitting when no HTML is available

**2d. Keep Selected Reply in Sync**
- Add `useEffect` watching `replies` array to update `selectedReply` if its data changed, similar to EmailInbox's pattern

### Phase 3: Scalability + Polish

**3a. Pagination**
- Add `limit` and `offset`/cursor to `useCRMEmailReplies`
- Return `hasMore` flag
- Add infinite scroll trigger to `VirtualReplyList`

**3b. Scroll Position Preservation**
- Store scroll offset in a ref before opening mobile drawer
- Restore it on close

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/crm/ReplyDetailPanel.tsx` | Modify | Add inline reply composer, HTML rendering, DOMPurify |
| `src/pages/crm/ReplyInbox.tsx` | Modify | Fix star/snooze handlers, add undo, select-all, bulk actions, sync selectedReply |
| `src/hooks/useCRMEmailReplies.ts` | Modify | Add pagination support, snooze filter |
| `src/components/crm/VirtualReplyList.tsx` | Modify | Add select-all row, load-more trigger |
| SQL migration | Create | Add `snoozed_until` column to `crm_email_replies` |

---

## Priority Order

1. Inline reply composer (core functionality gap)
2. Fix star + snooze persistence (broken features)
3. HTML body rendering (data already exists, just not rendered)
4. Undo on archive + selectedReply sync (UX polish)
5. Select-all + bulk actions (efficiency)
6. Pagination (scalability)

