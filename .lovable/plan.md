

# Fix Avatar Control: Location JSON and Missing Profile Pictures

## Issue 1: Location Displayed as Raw JSON

### Root Cause
In `sync-avatar-linkedin/index.ts` (lines 165-167), the location parsing logic is:

```typescript
location = (location as any).default || (location as any).city || JSON.stringify(location);
```

When the Apify scraper returns `{"country":"United Kingdom","city":"","full":"United Kingdom","country_code":"GB"}`:
- `.default` does not exist -- skips
- `.city` is empty string `""` (falsy) -- skips
- Falls back to `JSON.stringify(location)` -- stores raw JSON in the DB

The code never checks `.full` or `.country`, which contain the actual useful data.

### Fix

**Edge function fix** (lines 165-167): Replace the location extraction with proper field priority:

```typescript
if (typeof location === 'object' && location !== null) {
  const loc = location as Record<string, string>;
  const city = loc.city || '';
  const country = loc.country || '';
  location = (city && country) ? `${city}, ${country}` : (loc.full || city || country || loc.region || null);
}
```

**Frontend defensive parsing**: Create `src/lib/format-location.ts` utility and apply it in `AvatarAccountCard.tsx` (line 111) and `ViewAvatarProfileDialog.tsx` (line 123) where `account.location` is rendered. This handles any existing bad data without needing a DB migration.

**Data cleanup**: Run an UPDATE to fix the ~4 accounts that already have JSON strings stored in their `location` column.

---

## Issue 2: Francis Hagendoorn Missing Profile Picture

### Root Cause
The Proxycurl fallback (line 194) only triggers when `!fullName` -- meaning if Apify successfully returns a name but no profile picture, Proxycurl is never tried for the avatar. Francis has a LinkedIn photo, but Apify failed to extract it.

### Fix

After the Apify block succeeds (line 191), add a secondary Proxycurl attempt specifically for the avatar when Apify returned profile data but no picture:

```typescript
// After Apify block, before storing avatar
if (!profilePicUrl && PROXYCURL_API_KEY) {
  try {
    const resp = await fetch(
      `https://nubela.co/proxycurl/api/v2/linkedin?url=${encodeURIComponent(linkedinUrl)}`,
      { headers: { 'Authorization': `Bearer ${PROXYCURL_API_KEY}` } }
    );
    if (resp.ok) {
      const data = await resp.json();
      profilePicUrl = findField(data, PIC_ALIASES);
    }
  } catch (e) {
    console.warn('[sync-avatar-linkedin] Proxycurl avatar fallback failed:', e.message);
  }
}
```

This way, if Apify gets the name/headline/stats but misses the photo, Proxycurl fills in the gap.

---

## File Changes Summary

| File | Action | What Changes |
|---|---|---|
| `supabase/functions/sync-avatar-linkedin/index.ts` | Edit | Fix location parsing (lines 165-167); add Proxycurl avatar fallback after Apify block |
| `src/lib/format-location.ts` | Create | Utility to safely extract display text from location strings or JSON objects |
| `src/components/avatar-control/AvatarAccountCard.tsx` | Edit | Use `formatLocation()` on line 111 |
| `src/components/avatar-control/ViewAvatarProfileDialog.tsx` | Edit | Use `formatLocation()` on line 123 |
| DB data fix (via insert tool) | Update | Clean the ~4 accounts with JSON location strings |

---

## Technical Details

### format-location.ts

```typescript
export function formatLocation(location: unknown): string {
  if (!location) return '';
  if (typeof location === 'string') {
    if (location.startsWith('{')) {
      try {
        return formatLocationObject(JSON.parse(location));
      } catch { return location; }
    }
    return location;
  }
  if (typeof location === 'object') {
    return formatLocationObject(location as Record<string, unknown>);
  }
  return String(location);
}

function formatLocationObject(obj: Record<string, unknown>): string {
  const city = (obj.city as string) || '';
  const country = (obj.country as string) || '';
  if (city && country) return `${city}, ${country}`;
  return (obj.full as string) || city || country || '';
}
```

### Data Cleanup SQL

```sql
UPDATE linkedin_avatar_accounts
SET location = COALESCE(
  NULLIF(location::jsonb->>'city', '') || ', ' || (location::jsonb->>'country'),
  location::jsonb->>'full',
  location::jsonb->>'country'
)
WHERE location LIKE '{%' AND location LIKE '%country%';
```

After these changes, re-syncing Francis's account will pull the profile picture via the Proxycurl fallback, and all location data will display cleanly.

