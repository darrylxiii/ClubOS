# Virtual Backgrounds Storage Bucket Setup

## Purpose
This document provides instructions for creating the Supabase storage bucket needed for custom virtual background images.

## Setup Steps

### 1. Create Storage Bucket

Run this SQL in your Supabase SQL Editor:

```sql
-- Create storage bucket for virtual backgrounds
INSERT INTO storage.buckets (id, name, public)
VALUES ('virtual-backgrounds', 'virtual-backgrounds', true);
```

### 2. Set Storage Policies

```sql
-- Allow users to upload their own backgrounds
CREATE POLICY "Users can upload own backgrounds"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'virtual-backgrounds' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view all backgrounds (for public galleries if needed)
CREATE POLICY "Anyone can view backgrounds"
ON storage.objects FOR SELECT
USING ( bucket_id = 'virtual-backgrounds' );

-- Allow users to delete their own backgrounds
CREATE POLICY "Users can delete own backgrounds"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'virtual-backgrounds' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### 3. Configure File Restrictions (Optional)

In Supabase Dashboard → Storage → virtual-backgrounds:
- **File size limit**: 5 MB
- **Allowed MIME types**: `image/jpeg, image/png, image/jpg, image/webp`

## File Structure

Files will be organized as:
```
virtual-backgrounds/
  ├── {user_id}/
  │   ├── {timestamp}.jpg
  │   ├── thumb_{timestamp}.jpg
  │   └── ...
```

## Usage

The `BackgroundImagePicker` component automatically handles:
- File validation (type, size)
- Upload to correct user folder
- Database entry creation
- Cleanup on delete

## Migration Notes

The database table `virtual_backgrounds` is created by the migration file:
`supabase/migrations/$(date +%Y%m%d%H%M%S)_create_virtual_backgrounds_table.sql`

Run migrations with:
```bash
npx supabase db push
```

Or if using Supabase Cloud, the SQL will auto-run when the migration file is pushed.
