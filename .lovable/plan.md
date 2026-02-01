

# Multi-Location Support with Country Flags & Remote Option

## Current Problems

1. **Location takes up too much space** - When country is added, it wraps to multiple lines on job cards
2. **Single location only** - Jobs can only have one location, but many roles span multiple cities/countries
3. **No remote option** - No dedicated "Remote" designation with a recognizable icon
4. **Text-based location display** - Full text for country/city is inefficient vs. visual flags

---

## Solution Overview

### Visual Design for Job Cards

```text
Current:
┌─────────────────────────────────┐
│ 📍 Amsterdam, Netherlands       │  <- Takes full line
└─────────────────────────────────┘

New (single location):
┌─────────────────────────────────┐
│ 🇳🇱  Amsterdam                   │  <- Flag + city only
└─────────────────────────────────┘

New (multiple locations):
┌─────────────────────────────────┐
│ 🇳🇱 🇩🇪 🇬🇧  Amsterdam, Berlin +1  │  <- Multiple flags + abbreviated cities
└─────────────────────────────────┘

New (remote):
┌─────────────────────────────────┐
│ 🌐  Remote                       │  <- Globe icon for remote
└─────────────────────────────────┘

New (hybrid):
┌─────────────────────────────────┐
│ 🇳🇱 🌐  Amsterdam (Remote OK)     │  <- Flag + globe for hybrid
└─────────────────────────────────┘
```

---

## Database Changes

### New Table: `job_locations`

Stores multiple locations per job with structured data.

```sql
CREATE TABLE job_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  location_type TEXT NOT NULL CHECK (location_type IN ('onsite', 'remote', 'hybrid')),
  city TEXT,
  country TEXT,
  country_code TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  formatted_address TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE job_locations ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read job locations
CREATE POLICY "Anyone can read job locations"
  ON job_locations FOR SELECT
  USING (true);

-- Policy: Job creators/admins can manage locations
CREATE POLICY "Job owners can manage locations"
  ON job_locations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM jobs WHERE jobs.id = job_locations.job_id AND jobs.created_by = auth.uid()
    )
  );
```

### Add `is_remote` to Jobs Table

For quick filtering and backwards compatibility:

```sql
ALTER TABLE jobs ADD COLUMN is_remote BOOLEAN DEFAULT false;
```

---

## Component Changes

### 1. New: `CountryFlag` Component

Converts country code to emoji flag:

```tsx
// src/components/ui/country-flag.tsx

interface CountryFlagProps {
  countryCode: string;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

// Convert "NL" to "🇳🇱" using Unicode regional indicators
const getCountryEmoji = (countryCode: string): string => {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};
```

### 2. New: `RemoteIcon` Component

Recognizable remote work indicator:

```tsx
// Uses Globe2 from lucide-react
// Styled with primary color when remote
// Shows "🌐" or uses Globe2 icon with special styling
```

### 3. New: `JobLocationDisplay` Component

Compact single-line location display for job cards:

```tsx
// src/components/jobs/JobLocationDisplay.tsx

interface JobLocationDisplayProps {
  locations: JobLocation[];
  isRemote?: boolean;
  maxFlags?: number;  // Default: 3
  showCities?: boolean;  // Default: true
}

// Renders:
// - Country flags (max 3, then "+N")
// - City names (comma-separated, truncated)
// - Remote globe icon if applicable
// All in ONE LINE
```

### 4. New: `MultiLocationInput` Component

For job creation/edit dialogs:

```tsx
// src/components/jobs/MultiLocationInput.tsx

interface MultiLocationInputProps {
  locations: LocationInput[];
  onChange: (locations: LocationInput[]) => void;
  maxLocations?: number;  // Default: 5
}

// Features:
// - Add multiple locations via EnhancedLocationAutocomplete
// - Toggle "Remote" option with prominent switch
// - Reorder locations (first = primary)
// - Remove individual locations
// - Visual preview of how it will appear on cards
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/ui/country-flag.tsx` | NEW - Country code to flag emoji converter |
| `src/components/jobs/JobLocationDisplay.tsx` | NEW - Compact multi-location display |
| `src/components/jobs/MultiLocationInput.tsx` | NEW - Multi-location input with remote toggle |
| `src/components/partner/jobs/CompactJobCard.tsx` | Replace MapPin + text with JobLocationDisplay |
| `src/components/partner/CreateJobDialog.tsx` | Replace single location input with MultiLocationInput |
| `src/components/partner/EditJobSheet.tsx` | Same as CreateJobDialog |
| `src/schemas/jobFormSchema.ts` | Add `locations` array and `is_remote` field |
| `src/components/partner/PartnerJobsHome.tsx` | Fetch job_locations in query, pass to cards |
| `src/types/job.ts` | Add JobLocation interface |

---

## Implementation Details

### Country Code to Flag Emoji

Unicode regional indicator symbols allow any 2-letter country code to become a flag:

```typescript
// "US" -> "🇺🇸", "NL" -> "🇳🇱", "DE" -> "🇩🇪"
const countryToFlag = (code: string): string => {
  const base = 0x1F1E6 - 'A'.charCodeAt(0);
  return code.toUpperCase().split('').map(c => 
    String.fromCodePoint(c.charCodeAt(0) + base)
  ).join('');
};
```

### Remote Icon Design

Using Lucide's `Globe2` icon with special styling:
- **Color**: Primary/teal when active
- **Background**: Subtle ring/glow effect
- **Size**: Matches flag emoji (~16-20px)
- **Tooltip**: "Remote position" on hover

### Location Display Logic

```typescript
function formatLocationDisplay(locations: JobLocation[], isRemote: boolean) {
  const flags = locations
    .filter(l => l.countryCode)
    .slice(0, 3)
    .map(l => countryToFlag(l.countryCode));
  
  const extraCount = Math.max(0, locations.filter(l => l.countryCode).length - 3);
  
  const cities = locations
    .filter(l => l.city)
    .slice(0, 2)
    .map(l => l.city);
  
  return {
    flags,
    extraCount,
    cities,
    isRemote,
  };
}
```

### Job Creation/Edit Flow

1. **Remote Toggle** at top of location section (prominent switch)
2. **Location List** with add/remove functionality
3. **Visual Preview** showing how the location will appear on cards
4. **Validation**: At least one location OR remote must be selected

---

## UI Mockups

### Job Card Location (Compact):

```text
Single onsite:        🇳🇱 Amsterdam
Multiple onsite:      🇳🇱 🇩🇪 Amsterdam, Berlin
Many locations:       🇳🇱 🇩🇪 🇬🇧 +2 Amsterdam...
Remote only:          🌐 Remote
Hybrid single:        🇳🇱 🌐 Amsterdam
Hybrid multiple:      🇳🇱 🇩🇪 🌐 Amsterdam +1
```

### Create Job Dialog (Location Section):

```text
┌─────────────────────────────────────────────────────────────┐
│ Location                                                     │
├─────────────────────────────────────────────────────────────┤
│  [Remote Position] ─────────────────────── [ Toggle ON/OFF ] │
│                                                               │
│  Office Locations:                                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 🇳🇱 Amsterdam, Netherlands                      [✕]   │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 🇩🇪 Berlin, Germany                             [✕]   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  [+ Add Location]                                            │
│                                                               │
│  Preview: 🇳🇱 🇩🇪 🌐 Amsterdam, Berlin              │
└─────────────────────────────────────────────────────────────┘
```

---

## Migration Strategy

### Backwards Compatibility

1. Keep existing `location`, `location_city`, `location_country_code` columns
2. New `job_locations` table is additive
3. On display, prefer `job_locations` if available, fallback to legacy `location` field
4. Migration script to populate `job_locations` from existing `location_country_code` and `location_city`

### Data Migration

```sql
-- Populate job_locations from existing single-location data
INSERT INTO job_locations (job_id, location_type, city, country_code, latitude, longitude, formatted_address, is_primary)
SELECT 
  id,
  'onsite',
  location_city,
  location_country_code,
  latitude,
  longitude,
  location_formatted,
  true
FROM jobs
WHERE location_city IS NOT NULL OR location_country_code IS NOT NULL;
```

---

## Technical Considerations

### Performance

- Fetch `job_locations` in single JOIN with jobs query
- Index on `job_locations.job_id` for fast lookups
- Memoize flag emoji generation (it's pure computation)

### Realtime

- Add `job_locations` to Supabase Realtime publication for live updates

### Validation

- Maximum 5 locations per job
- At least one location OR remote must be enabled
- Each location must have either city or country_code

---

## Implementation Order

1. **Database Migration** - Create `job_locations` table and `is_remote` column
2. **CountryFlag Component** - Simple utility component
3. **JobLocationDisplay** - Compact display for cards
4. **Update CompactJobCard** - Integrate new display
5. **MultiLocationInput** - Input component for forms
6. **Update CreateJobDialog** - Multi-location support
7. **Update EditJobSheet** - Same changes
8. **Data Fetching** - Update PartnerJobsHome to fetch locations
9. **Migration Script** - Populate from existing data

---

## Expected Outcome

| Before | After |
|--------|-------|
| "Amsterdam, Netherlands" (long text) | "🇳🇱 Amsterdam" (compact) |
| Single location only | Up to 5 locations |
| No remote indicator | Prominent 🌐 globe icon |
| Multiple lines on cards | Always single line |
| Text-based country | Visual flag emoji |

This creates a professional, space-efficient location display that scales from single to multi-location jobs while providing clear visual indicators for remote work opportunities.

