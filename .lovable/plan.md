

# CRM Reply Inbox -- Full UI/UX Overhaul

## Problems Identified

1. **Detail opens as a popup drawer** instead of an inline right panel on desktop. The `ReplyDetailDrawer` wraps everything in a `<Drawer>` component (bottom sheet), which is wrong for desktop -- it should only be used on mobile.
2. **Left list panel is too narrow** at `w-1/3` (~33%), causing sender names, subjects, and company badges to truncate/overlap (visible in screenshot).
3. **Reply rows are cramped** -- classification badges, company names, and timestamps all compete for space in a narrow column.
4. **No resizable split-pane** -- the list/detail split should be adjustable or at least wider (40/60 split).
5. **Empty state is bland** -- the "Select a reply" placeholder lacks visual refinement.

## Solution

### 1. Replace Drawer with Inline Detail Panel (Desktop)

Create a new `ReplyDetailPanel` component that renders the email detail **inline** in the right side of the split layout (no popup). The existing `ReplyDetailDrawer` will only be used on mobile (< 768px).

**Desktop behavior:** Click a reply in the left list, detail appears in the right panel immediately -- like Gmail, Outlook, or any professional inbox.

**Mobile behavior:** Keep the current drawer (bottom sheet) approach since it works well on small screens.

### 2. Improve List/Detail Split Ratio

Change from `w-1/3` / `flex-1` to `w-[420px] min-w-[320px]` for the list panel, giving the detail panel the remaining space. This gives reply rows enough room to show sender, subject, and badges without truncation.

### 3. Clean Up ReplyRow Layout

- Increase row padding and spacing
- Show company name inline with sender (not as a separate badge)
- Move timestamp to top-right corner (standard email pattern)
- Limit to 1 classification badge + urgency indicator (no stacking)
- Better unread indicator (bold text + dot, not background change)

### 4. Refine Detail Panel

- Full-height scrollable content area
- Sticky action bar at bottom
- Cleaner typography for email body
- AI summary and suggested reply cards with refined styling
- Prospect link as a subtle top bar element

### 5. Polish Header and Tabs

- Tighter header with search inline
- Tab badges only for non-zero counts
- Remove excessive motion animations on header (keep content smooth)

---

## Technical Details

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/crm/ReplyDetailPanel.tsx` | New inline detail panel for desktop (extracts content from ReplyDetailDrawer without the Drawer wrapper) |

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/crm/ReplyInbox.tsx` | Replace desktop `ReplyDetailDrawer` usage with `ReplyDetailPanel`; adjust split layout to fixed-width list + flex detail; keep mobile drawer |
| `src/components/crm/ReplyRow.tsx` | Restyle: company inline with name, timestamp top-right, single-line badges, better spacing |
| `src/components/crm/ReplyDetailDrawer.tsx` | Keep as-is for mobile only (no changes needed) |

### Layout Structure (After)

```text
+----------------------------------------------------------+
| Header: Title / Tabs / Search                            |
+------------------+---------------------------------------+
| List (420px)     | Detail Panel (flex-1)                 |
| [checkbox][star] | From: Name <email>                    |
| Sender Name      | Company | Date                       |
| Subject line     |                                       |
| Preview text     | [Email body content]                  |
| [badge] [time]   |                                       |
|                  | [AI Summary card]                     |
| [next reply...]  | [Suggested Reply card]                |
|                  |                                       |
|                  | --- sticky bottom ---                  |
|                  | [Reply] [Mark Replied] [Archive] [Snz] |
+------------------+---------------------------------------+
```

### Key Behavioral Changes

- **Desktop click:** Sets `selectedReply` state, detail renders inline in right panel (no drawer, no popup)
- **Mobile click:** Opens `ReplyDetailDrawer` as before (bottom sheet)
- **Keyboard nav (j/k):** Navigates list, detail updates inline
- **Empty state:** Refined placeholder with subtle icon and keyboard hint

### Design Tokens Used

- `bg-card/50 backdrop-blur-xl` for panels (matches Refined Luxury aesthetic)
- `border-border/30` for subtle dividers
- `text-foreground/70` for secondary text
- `bg-primary/10` for selected row highlight
- No flashy gradients; clean glass-morphism surfaces

