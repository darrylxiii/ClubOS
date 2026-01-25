
# Pipeline Candidate Card Quality Fix

## Problem Analysis

The pipeline is showing unprofessional candidate cards with several issues:

### Issue 1: Name Showing as "Candidate" Instead of Real Name
- **Root Cause**: The `full_name` field in `candidate_profiles` shows user input like "Test84" or "39393" instead of the actual LinkedIn name
- **Why**: The LinkedIn scraper extracts the name but users may still enter junk data in the form
- **Data Evidence**: Database shows `full_name: 'Test84'` and `full_name: '39393'` for candidates with valid LinkedIn URLs

### Issue 2: Raw Ugly Notes Displayed on Card
- **Root Cause**: The stage notes contain raw template text:
  ```
  Candidate: Test84
  Email: N/A
  Phone: N/A
  LinkedIn: https://www.linkedin.com/in/anni-pfeiffer-13963a15b/
  Current: N/A at N/A
  ```
- **Why**: `AddCandidateDialog` line 340-341 stores this raw format in `stages[0].notes`
- **Result**: This ugly text is displayed verbatim in the card UI

### Issue 3: Avatar Not Showing LinkedIn Profile Photo
- **Root Cause**: `avatar_url` is explicitly set to `null` on line 285 of `AddCandidateDialog.tsx`
- **Why**: The code ignores the `avatar_url` returned by the LinkedIn scraper
- **Evidence**: All manually added candidates have `avatar_url: null` in database

### Issue 4: LinkedIn URL Extraction Not Using Apify Properly
- **Current State**: Apify is now integrated but the form is accepting user-entered names without validating against scraped data
- **Flow Gap**: User enters "Test84" as name, system doesn't override with Apify-scraped name

---

## Implementation Plan

### Phase 1: Fix AddCandidateDialog to Save Avatar from LinkedIn Scraper

**File**: `src/components/partner/AddCandidateDialog.tsx`

**Changes**:
1. Add state to store scraped avatar URL:
   ```typescript
   const [scrapedAvatarUrl, setScrapedAvatarUrl] = useState<string | null>(null);
   ```

2. Update `handleLinkedInScrape` to capture avatar:
   ```typescript
   if (data.success) {
     setScrapedAvatarUrl(data.data.avatar_url || null);
     setFormData({
       fullName: data.data.full_name || "",
       // ... rest unchanged
     });
   }
   ```

3. Update candidate profile insert to use the scraped avatar:
   ```typescript
   .insert({
     // ... existing fields
     avatar_url: scrapedAvatarUrl, // Use scraped avatar instead of null
   })
   ```

### Phase 2: Stop Storing Raw Data in Stage Notes

**File**: `src/components/partner/AddCandidateDialog.tsx`

**Changes**:
Instead of storing contact details in stage notes, store only meaningful notes:

```typescript
stages: [
  {
    name: "Applied",
    status: "in_progress",
    started_at: new Date().toISOString(),
    notes: formData.notes || "Candidate added via LinkedIn import",
  },
],
```

### Phase 3: Improve StageCandidatesList Card Layout

**File**: `src/components/partner/StageCandidatesList.tsx`

**Changes**:
1. Don't show stage notes if they contain the auto-generated template
2. Show professional contact details in a cleaner layout
3. Ensure avatar properly loads from `avatar_url`
4. Show proper fallback initials from the full name

Current problematic rendering:
```tsx
{currentStage?.notes && (
  <div className="mb-3 p-3 rounded-lg bg-muted/30 border border-border/50">
    <p className="text-xs text-muted-foreground line-clamp-2">
      {currentStage.notes}
    </p>
  </div>
)}
```

Updated rendering:
```tsx
{currentStage?.notes && !currentStage.notes.startsWith('Candidate:') && (
  <div className="mb-3 p-3 rounded-lg bg-muted/30 border border-border/50">
    <p className="text-xs text-muted-foreground line-clamp-2">
      {currentStage.notes}
    </p>
  </div>
)}
```

### Phase 4: Fix LinkedIn URL Name Extraction

**File**: `supabase/functions/linkedin-scraper/index.ts`

The `extractNameFromUrl` function should already work, but ensure it's being used correctly when Apify fails:

```typescript
function extractNameFromUrl(url: string): string {
  // Current logic is good - extracts "Anni Pfeiffer" from 
  // "https://www.linkedin.com/in/anni-pfeiffer-13963a15b/"
}
```

The issue is that when Apify successfully returns data, we should **enforce** using the Apify name, not allow user override with junk like "Test84".

### Phase 5: Auto-Fill Form with Scraped Name (Enforce Override)

**File**: `src/components/partner/AddCandidateDialog.tsx`

After successful LinkedIn scrape, disable the name field to prevent user from entering junk:

```tsx
<Input
  id="fullName"
  value={formData.fullName}
  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
  placeholder="John Smith"
  disabled={linkedinImported && formData.fullName.length > 0}
  className={linkedinImported ? "bg-muted" : ""}
/>
{linkedinImported && (
  <p className="text-xs text-muted-foreground mt-1">
    Name extracted from LinkedIn profile
  </p>
)}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/partner/AddCandidateDialog.tsx` | Save avatar_url from scraper, clean stage notes format, disable name field after import |
| `src/components/partner/StageCandidatesList.tsx` | Filter out auto-generated notes, ensure avatar displays properly |
| `supabase/functions/linkedin-scraper/index.ts` | Ensure avatar_url is returned in response (already done) |

---

## Data Migration Consideration

Existing candidates with bad data (like "Test84", "39393") will need manual cleanup or a migration script. Options:
1. Manual update in database
2. Migration script to re-extract names from LinkedIn URLs
3. Add "Edit Candidate" feature for strategists

---

## Expected Result

After implementation:
- Avatar shows LinkedIn profile photo (when available) or professional initials
- Name shows actual extracted name (e.g., "Anni Pfeiffer", "Vincent Biekman")
- Card shows clean layout without raw template data
- Professional appearance matching The Quantum Club brand standards
