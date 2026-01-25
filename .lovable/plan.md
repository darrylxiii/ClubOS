
# LinkedIn Quick Add Fix - Timeout and Reliability Improvement

## Problem Analysis

The LinkedIn Quick Add is failing with "Failed to import LinkedIn profile" due to a **timeout cascade**:

```
+---------------+     60s timeout    +----------------+    30-120s wait    +--------+
| Frontend      | -----------------> | Edge Function  | -----------------> | Apify  |
| (supabase SDK)|                    | linkedin-scraper|                   | API    |
+---------------+                    +----------------+                    +--------+
     ^                                      |
     |       Connection drops               |
     +--------------------------------------+
```

**Root Cause**: The Apify LinkedIn scraper uses the synchronous `run-sync-get-dataset-items` endpoint which can take 30-120+ seconds. Edge Functions default to a 60s timeout, causing the request to fail.

---

## Implementation Plan

### Phase 1: Add Immediate URL Extraction Fallback

Rather than waiting for Apify (which may timeout), implement a **two-phase approach**:

**Phase 1a: Instant extraction** (fallback first)
- Extract name from LinkedIn URL immediately
- Return basic profile data in less than 1 second
- User gets immediate feedback

**Phase 1b: Async enrichment** (background)
- If Apify/Proxycurl succeed within timeout, use enriched data
- Add AbortController with 15s timeout for external APIs

**File**: `supabase/functions/linkedin-scraper/index.ts`

```typescript
// Add timeout for external API calls
const EXTERNAL_API_TIMEOUT = 15000; // 15 seconds

// Create AbortController for timeout
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), EXTERNAL_API_TIMEOUT);

try {
  const response = await fetch(apifyUrl, {
    signal: controller.signal,
    // ... rest of options
  });
} catch (err) {
  if (err.name === 'AbortError') {
    console.log('[linkedin-scraper] Apify timed out, using URL extraction');
    // Fall through to URL extraction
  }
} finally {
  clearTimeout(timeoutId);
}
```

### Phase 2: Improve Error Handling in Frontend

**File**: `src/components/partner/AddCandidateDialog.tsx`

Add specific error messages for timeout vs other failures:

```typescript
} catch (error: any) {
  console.error("Error scraping LinkedIn:", error);
  
  if (error.message?.includes('Failed to fetch') || error.name === 'FunctionsFetchError') {
    // Likely a timeout - offer manual entry
    toast.error("LinkedIn import timed out", {
      description: "Please enter candidate details manually or try again"
    });
    // Auto-fill name from URL as best-effort
    const extractedName = extractNameFromLinkedInUrl(linkedinUrlForScrape);
    if (extractedName) {
      setFormData(prev => ({
        ...prev,
        fullName: extractedName,
        linkedinUrl: linkedinUrlForScrape
      }));
    }
  } else {
    toast.error("Failed to import LinkedIn profile");
  }
}
```

### Phase 3: Add Client-Side URL Name Extraction

**File**: `src/components/partner/AddCandidateDialog.tsx`

Add a utility function to extract name from LinkedIn URL on the client side:

```typescript
function extractNameFromLinkedInUrl(url: string): string {
  const match = url.match(/linkedin\.com\/in\/([^\/\?]+)/);
  if (match && match[1]) {
    let namePart = match[1].replace(/\/\d+$/, '').split('/')[0];
    namePart = namePart.replace(/-[a-z0-9]{6,}$/i, '');
    const parts = namePart.split('-').filter(word => {
      const digitCount = (word.match(/\d/g) || []).length;
      return digitCount < word.length / 2;
    });
    return parts
      .filter(word => word.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  return '';
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/linkedin-scraper/index.ts` | Add 15s timeout with AbortController, ensure fast fallback to URL extraction |
| `src/components/partner/AddCandidateDialog.tsx` | Add client-side name extraction, improved error handling with timeout detection |

---

## Technical Details

### Timeout Strategy

```
User clicks "Import" 
       │
       ▼
┌──────────────────────────────────┐
│ Edge Function starts             │
│ - Try Apify with 15s timeout     │
│ - If timeout → try Proxycurl 10s │
│ - If timeout → URL extraction    │
│ - Return result (always <20s)    │
└──────────────────────────────────┘
       │
       ▼
Frontend receives response OR timeout
       │
       ├─► Success: Auto-fill form with data
       │
       └─► Timeout: Client-side URL extraction
           Auto-fill name, show "verify details" message
```

### API Call Hierarchy with Timeouts

1. **Apify** (15s timeout) → Primary provider, best data quality
2. **Proxycurl** (10s timeout) → Fallback, good data quality  
3. **URL Extraction** (instant) → Always available, name only

---

## Expected Result

After implementation:
- LinkedIn import works within 3-15 seconds (not 30-120 seconds)
- If external APIs timeout, user still gets extracted name from URL
- No more "Failed to import" errors for timeout scenarios
- Users can always proceed with manual entry if needed
