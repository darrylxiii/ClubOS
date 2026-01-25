

# Add Candidate Button & LinkedIn Import Fix

## Issues Identified

### Issue 1: "Invalid job or candidate reference" Error
**Root Cause**: Duplicate conflicting foreign key constraints on the `applications` table

The `applications.candidate_id` column has **two FK constraints** with different behaviors:
| Constraint Name | ON DELETE Action |
|-----------------|------------------|
| `applications_candidate_id_fkey` | SET NULL |
| `fk_applications_candidate_profiles` | CASCADE |

This creates unpredictable behavior when:
1. A candidate profile is created successfully (Step 1) ✅
2. The application insert (Step 2) triggers the `23503` FK error because PostgreSQL encounters constraint conflicts

**Fix**: Remove the duplicate constraint and keep only the correct one.

### Issue 2: LinkedIn Import Not Working
**Root Cause**: No Apify integration exists - the function only supports Proxycurl

**Current State**:
- The `linkedin-scraper` Edge Function checks for `PROXYCURL_API_KEY`
- If missing, it falls back to **URL-only extraction** (just parses the name from the URL)
- There is **NO Apify integration** in the codebase despite user's claim
- No `APIFY_API_KEY` in the 32 configured secrets

**Fix**: Add Apify integration to the LinkedIn scraper as an alternative provider.

---

## Implementation Plan

### Phase 1: Fix Duplicate FK Constraint (Database Migration)

Remove the conflicting duplicate constraint:

```sql
-- Remove duplicate FK constraint that causes the 23503 error
ALTER TABLE applications 
DROP CONSTRAINT IF EXISTS fk_applications_candidate_profiles;

-- The remaining constraint will be:
-- applications_candidate_id_fkey: FOREIGN KEY (candidate_id) REFERENCES candidate_profiles(id) ON DELETE SET NULL
```

### Phase 2: Add Apify LinkedIn Scraper Integration

Update `supabase/functions/linkedin-scraper/index.ts` to support Apify as a provider:

**Provider Priority Order**:
1. **Apify** (if `APIFY_API_KEY` is configured) - LinkedIn Profile Scraper Actor
2. **Proxycurl** (if `PROXYCURL_API_KEY` is configured) - Current implementation
3. **URL Extraction** (fallback) - Parse name from URL only

**Apify Actor to use**: `apify/linkedin-profile-scraper`

```typescript
// Check for Apify first
const APIFY_API_KEY = Deno.env.get('APIFY_API_KEY');
if (APIFY_API_KEY) {
  console.log('[linkedin-scraper] Using Apify API');
  
  // Run Apify actor synchronously
  const response = await fetch(
    `https://api.apify.com/v2/acts/apify~linkedin-profile-scraper/run-sync-get-dataset-items?token=${APIFY_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrls: [{ url: linkedinUrl }],
        maxResults: 1
      })
    }
  );
  
  // Parse Apify response format
  const data = await response.json();
  // ... map to LinkedInProfile format
}
```

### Phase 3: Add APIFY_API_KEY Secret

If the user has an Apify API key, add it as a secret using the `add_secret` tool.

### Phase 4: Improve Error Messaging

Enhance the FK error handler to provide more diagnostic information:

```typescript
} else if (appError.code === '23503') {
  console.error('❌ [Add Candidate] FK violation details:', {
    candidateId,
    jobId,
    constraint: appError.message
  });
  
  // Check which reference is invalid
  const { data: jobExists } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .maybeSingle();
    
  const { data: candidateExists } = await supabase
    .from('candidate_profiles')
    .select('id')
    .eq('id', candidateId)
    .maybeSingle();
    
  if (!jobExists) {
    throw new Error('FK_ERROR: The selected job no longer exists. Please refresh and select a different job.');
  } else if (!candidateExists) {
    throw new Error('FK_ERROR: Candidate profile creation was interrupted. Please try again.');
  }
  
  throw new Error('FK_ERROR: Database constraint error. Please refresh and try again.');
}
```

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/xxx_fix_duplicate_fk.sql` | Create | Remove duplicate FK constraint |
| `supabase/functions/linkedin-scraper/index.ts` | Modify | Add Apify provider support |
| `src/components/partner/AddCandidateDialog.tsx` | Modify | Improve FK error diagnostics |

---

## Verification Steps

After implementation:

1. **FK Constraint Check**:
```sql
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'applications'::regclass 
AND contype = 'f';
-- Should show only ONE candidate_id FK
```

2. **Test Add Candidate**:
   - Sebastiaan logs in
   - Opens job pipeline
   - Clicks "Add Candidate"
   - Fills form and submits
   - Should succeed without FK error

3. **Test LinkedIn Import**:
   - Enter LinkedIn URL
   - Click "Import from LinkedIn"
   - Should show extracted profile data (with Apify) or just name (fallback)

---

## Secret Required

To enable full LinkedIn scraping, the user needs to provide one of:
- `APIFY_API_KEY` - From Apify account (has LinkedIn Profile Scraper actor)
- `PROXYCURL_API_KEY` - From Proxycurl account (~$49/mo for 1000 credits)

Without either key, LinkedIn import will only extract the name from the URL.

