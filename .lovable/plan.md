

# Job Card Layout Fix + Clear Header Design

## Current Problems (from Screenshot)

1. **Title not visible** - Job title text is being hidden/cut off
2. **3x3 metrics grid is too dense** - Creates visual clutter
3. **Badges (Club Sync + Active) are stacked vertically** - Takes up header space that should show title
4. **AI warning ("Pipeline stalled") competing with badges** - Layout is confusing

---

## Proposed Solution: Clear Header + 2x2 Badges + Full-Width Alert

### New Card Structure

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ HEADER ROW                                                                │
│ ┌────┐  Senior Product Designer                      [♡]  [⋮]            │
│ │ 🏢 │  Stealth Inc.                                                      │
│ └────┘  📍 Amsterdam                                                       │
├───────────────────────────────────────────────────────────────────────────┤
│ BADGES 2x2                                                                │
│  [Active ✓]     [⚡ Club Sync]                                            │
├───────────────────────────────────────────────────────────────────────────┤
│ AI ALERT (full width)                                                     │
│  ⚠️ Pipeline stalled - Check in with candidates                          │
├───────────────────────────────────────────────────────────────────────────┤
│ METRICS 3x3                                                               │
│  Candidates  │  Days Open  │  Active                                      │
│  12 ▁▂▃▅▇   │  45d        │  3                                           │
│─────────────┼─────────────┼──────────────                                 │
│  Interviews │  Conversion │  Hired                                        │
│  2          │  8%         │  1                                            │
│─────────────┼─────────────┼──────────────                                 │
│  Target     │  Last Active│  Pipeline %                                   │
│  2          │  3d ago     │  25%                                          │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Changes to Make

### 1. Restructure Header Layout

**Move badges out of header row**
- Header now ONLY contains: Checkbox (on hover) + Logo + Title/Company/Location + Favorite + Menu
- Remove status badge and Club Sync from the header flex row

### 2. Add Badge Row (2x2 under header)

Create a new row below header for badges:
```tsx
<div className="flex items-center gap-2 flex-wrap">
  <JobStatusBadge status={...} />
  <ClubSyncBadge status={...} />
  {job.is_stealth && <StealthBadge />}
</div>
```

### 3. AI Alert Full Width

Move the "Pipeline stalled" alert to span full width BELOW the badges:
```tsx
{nextAction && (
  <div className="w-full px-3 py-2.5 rounded-md bg-amber-500/10">
    ⚠️ Pipeline stalled - Check in
  </div>
)}
```

### 4. Keep 3x3 Metrics Grid

The 3x3 grid stays at the bottom - it shows all the important data.

---

## Visual Hierarchy (Top to Bottom)

1. **Header** (Logo + Title + Company + Location + ♡ + ⋮)
2. **Badge Row** (Status + Club Sync side by side - 2 items in a row)
3. **AI Alert** (Full width warning banner when needed)
4. **Metrics Grid** (3x3 grid with all the numbers)

---

## Code Changes

### File: `src/components/partner/jobs/CompactJobCard.tsx`

#### Header Section (Lines 223-356)

```tsx
<CardHeader className="pb-3">
  {/* Row 1: Checkbox + Logo + Title/Company + Favorite + Menu */}
  <div className="flex items-start gap-3">
    {/* Checkbox (on hover) */}
    <div className={cn('shrink-0 mt-1 transition-opacity', isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
      <Checkbox ... />
    </div>

    {/* Logo */}
    <Avatar className="h-12 w-12">...</Avatar>

    {/* Title Block - FULL SPACE, no truncation */}
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-base">{job.title}</h3>
        {job.is_stealth && <Lock />}
      </div>
      <p className="text-sm text-muted-foreground">{job.company_name}</p>
      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
        <MapPin /> {job.location}
      </div>
    </div>

    {/* Favorite + Menu (far right) */}
    <div className="flex items-center gap-1 shrink-0">
      <Button variant="ghost" onClick={onToggleFavorite}>
        <Heart className={cn(isFavorite && 'fill-current text-rose-500')} />
      </Button>
      <DropdownMenu>...</DropdownMenu>
    </div>
  </div>

  {/* Row 2: Badges (2x2 layout) */}
  <div className="flex items-center gap-2 mt-3 flex-wrap">
    <JobStatusBadge status={job.status} size="sm" />
    <ClubSyncBadge status={job.club_sync_status} size="sm" />
  </div>
</CardHeader>
```

#### CardContent Section

```tsx
<CardContent className="pt-0 space-y-4">
  {/* AI Alert - Full Width */}
  {nextAction && (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2.5 rounded-md text-sm w-full',
      nextAction.urgent ? 'bg-amber-500/10 text-amber-600' : 'bg-primary/10 text-primary'
    )}>
      <AlertCircle /> {nextAction.text}
    </div>
  )}

  {/* Metrics Grid 3x3 - stays the same */}
  <div className="grid grid-cols-3 gap-4">
    ...
  </div>
</CardContent>
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/partner/jobs/CompactJobCard.tsx` | Restructure header, move badges to row 2, full-width alert |

---

## Expected Result

| Before | After |
|--------|-------|
| Title hidden behind badges | Title fully visible in header |
| Badges stacked vertically | Badges in horizontal 2x2 row |
| AI alert competing with badges | AI alert full-width under badges |
| Cluttered header | Clean hierarchy: Title → Badges → Alert → Metrics |

This keeps the 3x3 metrics grid but creates a clear visual separation between the job identity (header), status info (badges), alerts (AI), and data (metrics).

