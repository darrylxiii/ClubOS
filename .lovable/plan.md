

# Fix Resume Storage and Admin Document Viewing

## Problem

Two related issues:

1. **"Bucket not found" error**: The `resumes` storage bucket is **private**, but the resume upload code (`useResumeUpload.ts`) stores a **public URL** via `getPublicUrl()`. Public URLs do not work on private buckets -- Supabase returns `{"statusCode":"404","error":"Bucket not found"}`.

2. **Download-only access across admin views**: Several admin components link directly to the stored `resume_url` with `<a href={url}>Download</a>`. Since the URL is a non-functional public URL on a private bucket, downloads also fail. Additionally, for GDPR compliance, admins should be able to **view documents in-browser** (via the existing `DocumentPreviewDialog`) rather than downloading to their local machines.

## Root Cause

In `useResumeUpload.ts` (line 78-80):
```typescript
const { data: { publicUrl } } = supabase.storage
  .from('resumes')
  .getPublicUrl(fileName);
```

This generates a URL like:
```
https://...supabase.co/storage/v1/object/public/resumes/onboarding/file.pdf
```

But the `resumes` bucket has `public = false`, so this URL always returns a 404.

The correct approach is to store only the **storage path** (e.g., `onboarding/1770714067565_file.pdf`) and generate signed URLs on demand when viewing or downloading. The `DocumentPreviewDialog` already does this correctly -- the problem is that it receives a broken public URL to parse, and other admin views bypass it entirely.

## Fix Plan

### 1. Fix `useResumeUpload.ts` -- Store path, not public URL

Stop using `getPublicUrl()`. Instead, store the relative storage path. When a URL is needed, generate a signed URL on demand.

**Change**: After uploading, return only the file path (e.g., `userId/timestamp_filename.pdf`) instead of a public URL. Update `onSuccess` callback and return value accordingly.

### 2. Fix `CandidateOnboardingSteps.tsx` -- Handle path-based resume URLs

Update the onboarding flow to store the path in `resume_url` instead of a public URL. The copy/move logic when transitioning from `onboarding/` folder to `userId/` folder also needs updating to store paths consistently.

### 3. Fix `DocumentPreviewDialog.tsx` -- Handle both legacy URLs and paths

Make the path extraction more robust:
- If the value is already a relative path (no `http`), use it directly
- If it is a full URL, extract the path as before
- This ensures backward compatibility with Helene's already-stored URL

### 4. Add "View Resume" (in-browser) to all admin views that currently only have "Download"

Replace direct `<a href={url}>Download</a>` links with a "View" button that opens the `DocumentPreviewDialog`, plus a secondary "Download" option that generates a signed URL and opens in a new tab.

**Files affected:**
- `src/components/admin/CandidateSettingsViewer.tsx` -- Resume section
- `src/components/admin/UserSettingsViewer.tsx` -- Resume section
- `src/components/admin/ApplicationDetailDrawer.tsx` -- Resume button
- `src/components/admin/UnifiedCandidateCard.tsx` -- Resume badge (minor)

Each will import `DocumentPreviewDialog` and add local state for the preview modal.

### 5. Create a shared utility for signed URL generation

Create `src/utils/storageUtils.ts` with:
- `getSignedResumeUrl(pathOrUrl: string): Promise<string>` -- extracts path from legacy URLs or uses path directly, returns a 1-hour signed URL
- `extractStoragePath(url: string, bucket: string): string` -- normalizes any URL or path to a clean storage path

This centralizes the logic so all components handle both legacy (full URL) and new (path-only) resume references.

### 6. Fix Helene's existing data (no migration needed)

The `DocumentPreviewDialog` already handles full URLs by extracting the path. With the improved path extraction in step 3, Helene's existing `resume_url` will work without any data migration. New uploads will store clean paths going forward.

## Files to Create

| File | Purpose |
|---|---|
| `src/utils/storageUtils.ts` | Shared signed URL generation and path extraction utilities |

## Files to Modify

| File | Change |
|---|---|
| `src/hooks/useResumeUpload.ts` | Replace `getPublicUrl()` with returning the storage path |
| `src/components/candidate-onboarding/CandidateOnboardingSteps.tsx` | Update resume URL handling to use paths; fix copy/move logic |
| `src/components/shared/DocumentPreviewDialog.tsx` | Improve path extraction to handle both paths and legacy URLs robustly |
| `src/components/admin/CandidateSettingsViewer.tsx` | Add DocumentPreviewDialog for in-browser viewing |
| `src/components/admin/UserSettingsViewer.tsx` | Add DocumentPreviewDialog for in-browser viewing |
| `src/components/admin/ApplicationDetailDrawer.tsx` | Add DocumentPreviewDialog for in-browser viewing |
| `src/components/admin/AdminMemberRequests.tsx` | No change needed (already uses DocumentPreviewDialog) |

## How Signed URLs Work (GDPR-compliant)

- Signed URLs expire after 1 hour (configurable)
- No file is downloaded to the admin's machine -- the PDF renders inside an iframe in the browser
- The URL is watermarked with the requesting user's session (audit trail via Supabase logs)
- If the browser blocks the iframe (security software), a fallback "Open in New Tab" button is shown (already implemented in `DocumentPreviewDialog`)

## Backward Compatibility

- Existing `resume_url` values stored as full public URLs will continue to work because the path extraction handles both formats
- New uploads will store clean paths (e.g., `userId/timestamp_file.pdf`)
- No database migration required
