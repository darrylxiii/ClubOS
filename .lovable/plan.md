
# Critical Fix: Onboarding SMS Verification & Cities Selector

## Problem Summary
Two blocking issues preventing candidate onboarding completion:

1. **SMS Verification "Failed to fetch"**: CORS headers missing critical Supabase client headers
2. **Preferred Cities dropdown empty/erroring**: RLS policy requires authentication, but onboarding users aren't authenticated yet
3. **UX Issue**: Dropdown is not user-friendly; should be typeahead like job location picker

---

## Fix 1: SMS Verification CORS Headers

### File: `supabase/functions/send-sms-verification/index.ts`

**Current (lines 17-20):**
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
```

**Updated:**
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-api-version, x-application-name, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, traceparent, tracestate",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Max-Age": "86400",
};
```

This matches the enhanced CORS headers used in `send-email-verification` and ensures all Supabase client headers are allowed.

---

## Fix 2: Cities RLS Policy for Anonymous Access

### Database Migration

Add a public SELECT policy so unauthenticated users can read active cities:

```sql
-- Allow anonymous (public) access to read active cities
-- This is needed for onboarding where users aren't authenticated yet
CREATE POLICY "Public can view active cities"
  ON public.cities
  FOR SELECT
  TO anon
  USING (is_active = true);
```

Cities are non-sensitive reference data, so public read access is safe.

---

## Fix 3: Replace Dropdown with LocationAutocomplete Typeahead

### File: `src/components/candidate-onboarding/CandidateOnboardingSteps.tsx`

**Changes:**

1. **Remove the Select dropdown** (lines 1169-1187)
2. **Replace with LocationAutocomplete component** (already imported at line 22)
3. **Update add location logic** to work with typeahead selection

**Before (lines 1166-1234):**
```tsx
<div className="space-y-3">
  <Label>Preferred Cities (Optional)</Label>
  <div className="flex gap-2">
    <Select value={selectedCity} onValueChange={setSelectedCity}>
      <SelectTrigger>
        <SelectValue placeholder="Select a city" />
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {cities
          .filter(city => { ... })
          .map((city) => (
            <SelectItem key={city.id} value={`${city.name}, ${city.country}`}>
              {city.name}, {city.country}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
    <Button type="button" onClick={handleAddPreferredLocation} disabled={!selectedCity}>
      Add
    </Button>
  </div>
  ...
</div>
```

**After:**
```tsx
<div className="space-y-3">
  <Label>Preferred Cities (Optional)</Label>
  <p className="text-sm text-muted-foreground mb-2">
    Search for cities where you'd like to work
  </p>
  <div className="flex gap-2">
    <div className="flex-1">
      <LocationAutocomplete
        value={selectedCity}
        onChange={setSelectedCity}
        placeholder="Type to search cities..."
      />
    </div>
    <Button 
      type="button" 
      onClick={handleAddPreferredLocation} 
      disabled={!selectedCity}
    >
      Add
    </Button>
  </div>

  {selectedCity && (
    <div className="space-y-2 p-4 border-2 border-primary/20 rounded-lg bg-primary/5">
      <Label>Maximum distance from {selectedCity.split(", ")[0]}</Label>
      <div className="pt-2 pb-4">
        <Slider
          min={0}
          max={100}
          step={5}
          value={[cityRadius]}
          onValueChange={(value) => setCityRadius(value[0])}
        />
      </div>
      <p className="text-sm text-muted-foreground">Within {cityRadius} km radius</p>
    </div>
  )}

  {formData.preferred_work_locations.length > 0 && (
    <div className="flex flex-wrap gap-2 mt-2">
      {formData.preferred_work_locations.map((location, index) => (
        <div
          key={`${location.city}-${location.country}-${index}`}
          className="flex items-center gap-2 px-3 py-2 bg-accent/10 border border-accent/20 rounded-lg text-sm"
        >
          <span>
            {location.city}, {location.country} (within {location.radius_km}km)
          </span>
          <button
            type="button"
            onClick={() => handleRemovePreferredLocation(location)}
            className="text-primary hover:text-primary/80 text-lg leading-none"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )}
</div>
```

4. **Remove the `loadCities` function and `cities` state** (lines 43, 118-133) since we're using OpenStreetMap API via LocationAutocomplete instead of the database.

---

## Technical Notes

### LocationAutocomplete Benefits
- Uses OpenStreetMap Nominatim API (no RLS issues)
- Typeahead experience like job postings
- Recent searches stored in localStorage
- Full keyboard navigation
- Works for unauthenticated users

### Security Consideration
The cities table RLS update only allows `SELECT` on active cities - no write access. This is safe for reference data.

---

## Implementation Order

1. Update SMS CORS headers and deploy edge function
2. Add RLS policy for anonymous city access (backup)
3. Replace dropdown with LocationAutocomplete in onboarding
4. Remove unused cities state/fetch code
5. Test full onboarding flow

---

## Testing Checklist

- [ ] SMS verification sends successfully during onboarding
- [ ] Phone verification code input works
- [ ] Location typeahead shows suggestions as user types
- [ ] Can add multiple preferred cities with radius
- [ ] Can remove preferred cities
- [ ] Complete onboarding flow end-to-end
