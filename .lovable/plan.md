

# LinkedIn Profile Picture Scraping -- Full Audit and Fix

## Current State Audit

| Area | Status | Issue |
|------|--------|-------|
| Scraper extracts image URL | Working | `linkedin-scraper` maps `profilePicture` / `profile_pic_url` to `imageUrl`, which becomes `avatar_url` |
| Batch enrichment saves avatar | Working | `batch-linkedin-enrich` sets `avatar_url` if currently empty |
| Hero section displays avatar | Working | `CandidateHeroSection` renders `candidate.avatar_url` in a 128x128 Avatar |
| Actual candidate data | Broken | Most candidates have `avatar_url = NULL` despite having LinkedIn URLs |
| LinkedIn CDN URLs | Fundamental flaw | LinkedIn image URLs expire within hours/days -- even if saved, they break |
| Storage bucket | Exists | `avatars` bucket (public) is already set up |

**Root cause**: LinkedIn profile picture URLs are temporary CDN links that expire. Storing them directly in `avatar_url` means they work briefly, then 404. The fix is to **download and re-upload** to the `avatars` storage bucket during scraping.

---

## Solution: Download and Persist LinkedIn Photos

### Change 1: Add image download helper to `linkedin-scraper`

**File:** `supabase/functions/linkedin-scraper/index.ts`

Add a helper function `downloadAndStoreAvatar` that:

1. Takes the LinkedIn image URL and candidate ID
2. Fetches the image bytes from the LinkedIn CDN
3. Detects the content type (JPEG/PNG/WebP)
4. Uploads to `avatars/{candidateId}/linkedin.jpg` in the `avatars` storage bucket
5. Returns the permanent public URL from storage
6. If download fails (expired URL, 403, etc.), returns `null` silently -- never blocks the scrape

After the candidate profile data is assembled (around line 348), call this helper to replace the raw LinkedIn URL with a permanent storage URL:

```text
// After candidateData is built:
if (candidateData.avatar_url) {
  const permanentUrl = await downloadAndStoreAvatar(
    candidateData.avatar_url,
    candidateData.linkedin_url,
    supabase
  );
  if (permanentUrl) {
    candidateData.avatar_url = permanentUrl;
  }
  // If download failed, keep the LinkedIn URL as a fallback
}
```

The helper function:

```text
async function downloadAndStoreAvatar(
  imageUrl: string,
  linkedinUrl: string,
  supabaseClient: any
): Promise<string | null> {
  try {
    const response = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png'
              : contentType.includes('webp') ? 'webp' : 'jpg';

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength < 1000) return null; // Skip placeholder images

    // Generate a stable path using a hash of the LinkedIn URL
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(linkedinUrl));
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b =>
      b.toString(16).padStart(2, '0')).join('').substring(0, 12);
    const filePath = `linkedin/${hashHex}.${ext}`;

    const { error } = await supabaseClient.storage
      .from('avatars')
      .upload(filePath, arrayBuffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.warn('[linkedin-scraper] Avatar upload failed:', error.message);
      return null;
    }

    const { data: urlData } = supabaseClient.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return urlData?.publicUrl || null;
  } catch (err) {
    console.warn('[linkedin-scraper] Avatar download failed:', err);
    return null;
  }
}
```

Key design decisions:
- Uses a SHA-256 hash of the LinkedIn URL as the filename, so re-scraping the same profile overwrites the old image (no duplicates)
- Stores in `avatars/linkedin/` subfolder to separate from user-uploaded avatars
- Skips images under 1KB (likely placeholder/default LinkedIn avatars)
- Uses `upsert: true` so re-syncs update the photo
- Never blocks the scrape if image download fails

### Change 2: Same logic in `batch-linkedin-enrich`

**File:** `supabase/functions/batch-linkedin-enrich/index.ts`

The batch enrichment function also receives `avatar_url` from the scraper response. Apply the same download-and-store pattern:

Around line 165-168 where avatar is set, add:

```text
if (!candidate.avatar_url && data.avatar_url) {
  // Download and persist to storage
  const permanentUrl = await downloadAndStoreAvatar(
    data.avatar_url, candidate.linkedin_url, supabase
  );
  updateObj.avatar_url = permanentUrl || data.avatar_url;
  fieldsUpdated.push('avatar_url');
}
```

Extract the `downloadAndStoreAvatar` helper into a shared import or duplicate it in this function (edge functions can't share code easily, so duplication is the pragmatic approach).

### Change 3: Same logic in `CandidateHeroSection` sync button

**File:** `src/components/candidate-profile/CandidateHeroSection.tsx`

The "Sync LinkedIn" button (line 48-121) currently saves the raw LinkedIn image URL. Since the scraper will now return a storage URL, this is automatically fixed. No additional changes needed here -- the scraper response already contains the permanent URL.

### Change 4: Handle existing candidates with expired/null avatars

**File:** `supabase/functions/batch-linkedin-enrich/index.ts`

Currently, the enrichment only sets `avatar_url` if the candidate has none. Change the condition to also re-download if the current `avatar_url` is a LinkedIn CDN URL (starts with `https://media.licdn.com`):

```text
const needsAvatarUpdate = !candidate.avatar_url
  || candidate.avatar_url.includes('media.licdn.com')
  || candidate.avatar_url.includes('licdn.com');

if (needsAvatarUpdate && data.avatar_url) {
  const permanentUrl = await downloadAndStoreAvatar(...);
  if (permanentUrl) {
    updateObj.avatar_url = permanentUrl;
    fieldsUpdated.push('avatar_url');
  }
}
```

This means running a batch enrichment on existing candidates will fix their expired photos.

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/linkedin-scraper/index.ts` | Add `downloadAndStoreAvatar` helper; call it before returning candidateData |
| `supabase/functions/batch-linkedin-enrich/index.ts` | Add same helper; update avatar logic to re-download expired LinkedIn CDN URLs |

No database migrations needed. The `avatars` storage bucket already exists and is public.

---

## Security Considerations

- Images are stored in the existing public `avatars` bucket -- same security model as user avatars
- The LinkedIn CDN URL is fetched server-side (edge function), so no CORS issues
- SHA-256 hash prevents path injection from malicious LinkedIn URLs
- File size is implicitly bounded by LinkedIn (profile photos are typically under 500KB)
- No PII is exposed beyond what's already in the candidate profile

## What This Fixes

1. New scrapes will persist the profile photo permanently in storage
2. Re-syncing via "Sync LinkedIn" button will update the photo
3. Batch enrichment will fix existing candidates with expired/null photos
4. The `CandidateHeroSection` avatar display requires zero changes -- it already renders `avatar_url`
