

# Fix: Resume Viewer - In-Browser Preview with Signed URLs

## Problem Identified

You're getting a **404 "Bucket not found"** error when clicking the Resume button because:

1. The `resumes` storage bucket is **private** (not public)
2. Resume URLs are stored as public-style URLs (using `/object/public/` path)
3. Public URLs **do not work for private buckets** - Supabase returns 404

Additionally, the current Resume button simply opens `window.open(resume_url)` which redirects to the broken URL instead of showing an in-browser viewer like you had before.

---

## Solution

Create an in-browser document preview dialog for the Admin Member Requests page that:

1. **Generates signed URLs** for private bucket files (valid for 1 hour)
2. **Displays PDF/documents in an iframe** within a modal dialog
3. **Handles both new private URLs and legacy public URLs**

---

## Technical Details

### 1. Create a Reusable DocumentPreviewDialog Component

**File:** `src/components/shared/DocumentPreviewDialog.tsx`

A reusable component that:
- Takes a storage path or full URL
- Generates a signed URL if needed (for `resumes` bucket)
- Displays the document in an iframe inside a dialog
- Shows loading state while fetching signed URL
- Provides download button

```typescript
interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentUrl: string | null;
  documentName?: string;
  bucketName?: string; // defaults to 'resumes'
}
```

### 2. Update AdminMemberRequests to Use Preview Dialog

**File:** `src/components/admin/AdminMemberRequests.tsx`

Changes:
- Add state for preview dialog: `previewDocument`, `showPreviewDialog`
- Replace `window.open(request.resume_url)` with opening the preview dialog
- The dialog will handle generating signed URLs

**Current (line 720-728):**
```typescript
{request.resume_url && (
  <Button 
    variant="outline" 
    onClick={() => window.open(request.resume_url!, '_blank')}
    className="gap-2"
  >
    <ExternalLink className="w-4 h-4" />
    Resume
  </Button>
)}
```

**Updated:**
```typescript
{(request.resume_url || request.profiles?.resume_url) && (
  <Button 
    variant="outline" 
    onClick={() => {
      setPreviewDocumentUrl(request.profiles?.resume_url || request.resume_url);
      setPreviewDocumentName(request.profiles?.resume_filename || 'Resume');
      setShowPreviewDialog(true);
    }}
    className="gap-2"
  >
    <Eye className="w-4 h-4" />
    Resume
  </Button>
)}
```

### 3. Signed URL Generation Logic

The component will:
1. Check if URL is already a signed URL (contains `token=`) - use as-is
2. Check if URL is a full public URL - extract path and generate signed URL
3. Generate signed URL from `resumes` bucket with 1-hour expiry

```typescript
const extractPathFromUrl = (url: string): string => {
  // Handle full URLs like:
  // https://xxx.supabase.co/storage/v1/object/public/resumes/onboarding/file.pdf
  const match = url.match(/\/storage\/v1\/object\/(?:public|sign)\/resumes\/(.+)/);
  if (match) return match[1];
  return url; // Already a path
};

const { data } = await supabase.storage
  .from('resumes')
  .createSignedUrl(extractedPath, 3600);
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/shared/DocumentPreviewDialog.tsx` | Create | Reusable preview dialog component |
| `src/components/admin/AdminMemberRequests.tsx` | Modify | Add preview state, use dialog instead of window.open |

---

## UI Preview

The Resume button will open a dialog with:
- Document name in the header
- Full-size iframe showing the PDF/document
- Download button
- Close button

This matches the existing pattern used in:
- `CandidateDocumentsViewer.tsx` (lines 613-629)
- `UserSettings.tsx` (lines 2798-2829)

---

## Expected Outcome

After this fix:
1. Clicking "Resume" opens an in-browser preview dialog
2. PDFs display correctly via signed URLs (no 404 errors)
3. Works for both current and future uploads
4. Provides download option for candidates who prefer that

