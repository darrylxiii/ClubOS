
# Enterprise Image Cropping & Resizing System

## Executive Summary

This plan creates a unified, reusable image editing system for The Quantum Club that provides cropping, resizing, and enhancement capabilities across all image upload touchpoints: profile pictures, company logos, cover images, backgrounds, and more. The system will be built on the existing `AvatarEditor` foundation and extended to support multiple aspect ratios, image types, and use cases.

---

## Current State Analysis

### What Exists (Strengths)

| Component | Features | Location |
|-----------|----------|----------|
| `AvatarEditor.tsx` | Full-featured cropper with zoom, rotation, filters, live preview | `src/components/AvatarEditor.tsx` |
| `AvatarUpload.tsx` | File selection, validation, storage upload | `src/components/AvatarUpload.tsx` |
| `react-easy-crop` | Already installed as dependency | `package.json` |
| `ProfileHeaderUpload.tsx` | Header/wallpaper upload (no cropping) | `src/components/profile/ProfileHeaderUpload.tsx` |
| `BackgroundImagePicker.tsx` | Virtual background upload (no cropping) | `src/components/livehub/BackgroundImagePicker.tsx` |
| `AddCompanyDialog.tsx` | Logo + cover upload (no cropping) | `src/components/companies/AddCompanyDialog.tsx` |

### What is Missing (Gaps)

| Gap | Impact | Current Behavior |
|-----|--------|------------------|
| No cropping for company logos | Distorted logos, inconsistent sizing | Direct upload, no editing |
| No cropping for cover images | Poor composition, clipped content | Direct upload |
| No cropping for profile headers | Users upload full-size images | Direct upload, no editing |
| No cropping for virtual backgrounds | Poor framing for video calls | Direct upload |
| No aspect ratio presets | Square avatars only | Fixed 1:1 ratio |
| No image resizing/optimization | Large file sizes, slow loading | Original file stored |
| No reusable image editor | Duplicated code if added to each upload | Only avatars have editor |

---

## Solution Architecture

### Core Concept: Universal ImageEditor Component

Create a single, configurable `ImageEditor` component that can be used for ANY image upload in the platform. The existing `AvatarEditor` will be refactored into this universal component.

### Supported Image Types & Aspect Ratios

| Use Case | Aspect Ratio | Crop Shape | Output Size | Storage Bucket |
|----------|--------------|------------|-------------|----------------|
| Profile Avatar | 1:1 | Circle | 400x400px | `avatars` |
| Company Logo | 1:1 | Square | 400x400px | `company-logos` |
| Company Cover | 16:9 | Rectangle | 1920x1080px | `company-covers` |
| Profile Header | 3:1 | Rectangle | 1500x500px | `profile-headers` |
| Virtual Background | 16:9 | Rectangle | 1920x1080px | `virtual-backgrounds` |
| Job Banner | 4:1 | Rectangle | 1200x300px | `job-banners` |
| Course Thumbnail | 16:9 | Rectangle | 1280x720px | `course-thumbnails` |

---

## Visual Flow

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         UNIVERSAL IMAGE EDITOR                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                                                                           │  │
│  │                        [CROP AREA - VISUAL]                               │  │
│  │                                                                           │  │
│  │       ┌─────────────────────────────────────────┐                         │  │
│  │       │                                         │                         │  │
│  │       │       Cropper with draggable area       │                         │  │
│  │       │       (aspect ratio enforced)           │                         │  │
│  │       │                                         │                         │  │
│  │       └─────────────────────────────────────────┘                         │  │
│  │                                                                           │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │   Adjust    │ │   Filters   │ │   Resize    │ │   Preview   │               │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘               │
│                                                                                  │
│  ADJUST TAB                                                                      │
│  ─────────                                                                       │
│  Zoom:     [─────────●───────] 120%                                              │
│  Rotation: [────●────────────] 15°                                               │
│  Flip:     [↔ Horizontal] [↕ Vertical]                                           │
│                                                                                  │
│  PREVIEW                                                                         │
│  ───────                                                                         │
│  ┌───────┐  ┌─────────┐  ┌───────────────┐                                      │
│  │  □ □  │  │   □ □   │  │     □ □ □     │   Context-aware preview              │
│  │  □ □  │  │   □ □   │  │     □ □ □     │   (shows how it looks in use)        │
│  └───────┘  └─────────┘  └───────────────┘                                      │
│   Small       Medium         Large                                               │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │  [Cancel]                                              [Save Changes]   │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### 1. Core ImageEditor Component

```typescript
interface ImageEditorProps {
  image: string;                    // Source image (URL or data URL)
  open: boolean;
  onClose: () => void;
  onSave: (blob: Blob, metadata: ImageMetadata) => void;
  
  // Configuration
  config: ImageEditorConfig;
}

interface ImageEditorConfig {
  // Aspect ratio
  aspectRatio: number;              // e.g., 1, 16/9, 3/1, 4/1
  aspectRatioLabel?: string;        // e.g., "Square", "Banner", "Cover"
  
  // Crop shape
  cropShape: 'rect' | 'round';
  
  // Output
  outputWidth: number;              // Target width in pixels
  outputHeight: number;             // Target height in pixels
  outputQuality: number;            // JPEG quality 0-1 (default 0.9)
  outputFormat: 'jpeg' | 'png' | 'webp';
  
  // Features
  enableFilters: boolean;           // Show filter presets
  enableRotation: boolean;          // Allow rotation slider
  enableFlip: boolean;              // Allow horizontal/vertical flip
  enableZoom: boolean;              // Allow zoom (usually true)
  
  // Preview
  previewSizes?: { label: string; size: number }[];
  previewShape?: 'circle' | 'square' | 'rectangle';
  
  // UI
  title: string;                    // Dialog title
  saveButtonText?: string;          // Default: "Save"
}
```

### 2. Preset Configurations

```typescript
const IMAGE_EDITOR_PRESETS = {
  avatar: {
    aspectRatio: 1,
    aspectRatioLabel: 'Square',
    cropShape: 'round',
    outputWidth: 400,
    outputHeight: 400,
    outputQuality: 0.92,
    outputFormat: 'jpeg',
    enableFilters: true,
    enableRotation: true,
    enableFlip: true,
    enableZoom: true,
    previewSizes: [
      { label: 'Small', size: 32 },
      { label: 'Medium', size: 64 },
      { label: 'Large', size: 96 },
    ],
    previewShape: 'circle',
    title: 'Edit Profile Picture',
  },
  
  companyLogo: {
    aspectRatio: 1,
    aspectRatioLabel: 'Square',
    cropShape: 'rect',
    outputWidth: 400,
    outputHeight: 400,
    outputQuality: 0.95,
    outputFormat: 'png',  // PNG for logos (transparency)
    enableFilters: false, // Logos shouldn't be filtered
    enableRotation: true,
    enableFlip: true,
    enableZoom: true,
    previewSizes: [
      { label: 'Favicon', size: 32 },
      { label: 'Card', size: 64 },
      { label: 'Header', size: 128 },
    ],
    previewShape: 'square',
    title: 'Edit Company Logo',
  },
  
  coverImage: {
    aspectRatio: 16 / 9,
    aspectRatioLabel: '16:9 Widescreen',
    cropShape: 'rect',
    outputWidth: 1920,
    outputHeight: 1080,
    outputQuality: 0.88,
    outputFormat: 'jpeg',
    enableFilters: true,
    enableRotation: true,
    enableFlip: true,
    enableZoom: true,
    previewSizes: [
      { label: 'Thumbnail', size: 160 },
      { label: 'Card', size: 320 },
    ],
    previewShape: 'rectangle',
    title: 'Edit Cover Image',
  },
  
  profileHeader: {
    aspectRatio: 3 / 1,
    aspectRatioLabel: '3:1 Banner',
    cropShape: 'rect',
    outputWidth: 1500,
    outputHeight: 500,
    outputQuality: 0.88,
    outputFormat: 'jpeg',
    enableFilters: true,
    enableRotation: true,
    enableFlip: true,
    enableZoom: true,
    previewSizes: [
      { label: 'Mobile', size: 200 },
      { label: 'Desktop', size: 400 },
    ],
    previewShape: 'rectangle',
    title: 'Edit Profile Header',
  },
  
  virtualBackground: {
    aspectRatio: 16 / 9,
    aspectRatioLabel: '16:9 Video',
    cropShape: 'rect',
    outputWidth: 1920,
    outputHeight: 1080,
    outputQuality: 0.85,
    outputFormat: 'jpeg',
    enableFilters: false,
    enableRotation: false,
    enableFlip: true,
    enableZoom: true,
    title: 'Edit Virtual Background',
  },
};
```

### 3. Universal ImageUpload Component

A wrapper component that combines file selection with the ImageEditor:

```typescript
interface ImageUploadProps {
  value: string | null;             // Current image URL
  onChange: (url: string) => void;  // Callback when image changes
  onRemove?: () => void;            // Optional remove callback
  
  // Editor configuration
  preset: keyof typeof IMAGE_EDITOR_PRESETS;
  // OR
  config?: ImageEditorConfig;       // Custom config
  
  // Upload configuration
  bucket: string;                   // Supabase storage bucket
  path: string;                     // File path pattern (e.g., "{userId}/{timestamp}")
  maxFileSize?: number;             // Max file size in bytes
  acceptedTypes?: string[];         // MIME types
  
  // UI
  label?: string;
  placeholder?: React.ReactNode;
  showRemoveButton?: boolean;
  className?: string;
}
```

---

## Implementation Phases

### Phase 1: Core ImageEditor Component

Refactor `AvatarEditor.tsx` into a universal `ImageEditor.tsx`:

**Files to Create:**
- `src/components/image-editor/ImageEditor.tsx` - Main editor component
- `src/components/image-editor/ImageEditorPresets.ts` - Preset configurations
- `src/components/image-editor/ImageEditorControls.tsx` - Zoom/rotation controls
- `src/components/image-editor/ImageEditorFilters.tsx` - Filter presets
- `src/components/image-editor/ImageEditorPreview.tsx` - Multi-size preview
- `src/components/image-editor/utils/cropImage.ts` - Cropping utility
- `src/components/image-editor/utils/resizeImage.ts` - Resizing utility
- `src/components/image-editor/index.ts` - Barrel export

### Phase 2: Universal ImageUpload Component

**Files to Create:**
- `src/components/image-upload/ImageUpload.tsx` - Main upload component
- `src/components/image-upload/ImageUploadTrigger.tsx` - Click-to-upload trigger
- `src/components/image-upload/ImageUploadPreview.tsx` - Current image preview
- `src/components/image-upload/index.ts` - Barrel export

### Phase 3: Integration with Existing Components

**Files to Modify:**

| File | Changes |
|------|---------|
| `src/components/AvatarUpload.tsx` | Use new ImageEditor with `avatar` preset |
| `src/components/companies/AddCompanyDialog.tsx` | Add ImageEditor for logo + cover |
| `src/components/profile/ProfileHeaderUpload.tsx` | Add ImageEditor with `profileHeader` preset |
| `src/components/livehub/BackgroundImagePicker.tsx` | Add ImageEditor with `virtualBackground` preset |
| `src/components/profile/ChangeAvatarDialog.tsx` | Use ImageUpload component |

### Phase 4: Additional Upload Points

Survey all image upload locations and integrate:

**Files to Audit & Modify:**
- Job posting banners
- Course thumbnails
- Playlist covers
- Track cover images
- Academy covers
- News article images
- Document thumbnails

---

## Technical Implementation Details

### Image Processing Pipeline

```text
1. User selects file
   ↓
2. Client-side validation (type, size)
   ↓
3. Create object URL for preview
   ↓
4. Open ImageEditor dialog
   ↓
5. User adjusts crop, zoom, rotation, filters
   ↓
6. Generate cropped canvas at target dimensions
   ↓
7. Convert to Blob (JPEG/PNG/WebP)
   ↓
8. Upload to Supabase Storage
   ↓
9. Update database with public URL
   ↓
10. Clear object URLs (memory cleanup)
```

### Cropping Algorithm (Enhanced)

```typescript
async function cropAndResizeImage(
  imageSrc: string,
  pixelCrop: CropArea,
  rotation: number,
  flip: { horizontal: boolean; vertical: boolean },
  filters: FilterSettings,
  outputWidth: number,
  outputHeight: number,
  format: 'jpeg' | 'png' | 'webp',
  quality: number
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Set output dimensions
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  
  // Apply transforms
  ctx.save();
  
  // Flip
  if (flip.horizontal || flip.vertical) {
    ctx.translate(
      flip.horizontal ? outputWidth : 0,
      flip.vertical ? outputHeight : 0
    );
    ctx.scale(
      flip.horizontal ? -1 : 1,
      flip.vertical ? -1 : 1
    );
  }
  
  // Rotation
  if (rotation !== 0) {
    ctx.translate(outputWidth / 2, outputHeight / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-outputWidth / 2, -outputHeight / 2);
  }
  
  // Filters
  ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%)`;
  
  // Draw cropped and scaled image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputWidth,
    outputHeight
  );
  
  ctx.restore();
  
  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Canvas empty')),
      `image/${format}`,
      quality
    );
  });
}
```

### Memory Management

```typescript
// Proper cleanup of object URLs
useEffect(() => {
  return () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  };
}, [previewUrl]);

// Cleanup on dialog close
const handleClose = () => {
  if (sourceImage) {
    URL.revokeObjectURL(sourceImage);
  }
  onClose();
};
```

---

## UI/UX Enhancements

### 1. Aspect Ratio Selector (Optional)

For components that support multiple aspect ratios:

```text
┌────────────────────────────────────────┐
│  Aspect Ratio:                         │
│  [1:1 Square] [16:9 Wide] [3:1 Banner] │
└────────────────────────────────────────┘
```

### 2. Flip Controls

```text
┌────────────────────────────────────────┐
│  Flip:                                 │
│  [↔ Horizontal]  [↕ Vertical]          │
└────────────────────────────────────────┘
```

### 3. Reset Button

```text
┌────────────────────────────────────────┐
│                              [↺ Reset] │
└────────────────────────────────────────┘
```

### 4. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `+` / `-` | Zoom in/out |
| `←` / `→` | Rotate left/right |
| `H` | Flip horizontal |
| `V` | Flip vertical |
| `R` | Reset to original |
| `Enter` | Save |
| `Escape` | Cancel |

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/image-editor/ImageEditor.tsx` | Universal image editor dialog |
| `src/components/image-editor/ImageEditorPresets.ts` | Preset configurations |
| `src/components/image-editor/ImageEditorControls.tsx` | Zoom/rotation/flip controls |
| `src/components/image-editor/ImageEditorFilters.tsx` | Filter presets panel |
| `src/components/image-editor/ImageEditorPreview.tsx` | Multi-size preview component |
| `src/components/image-editor/utils/cropImage.ts` | Image cropping utility |
| `src/components/image-editor/utils/resizeImage.ts` | Image resizing utility |
| `src/components/image-editor/utils/imageValidation.ts` | File validation helpers |
| `src/components/image-editor/index.ts` | Barrel exports |
| `src/components/image-upload/ImageUpload.tsx` | Universal upload component |
| `src/components/image-upload/ImageUploadTrigger.tsx` | Upload trigger button |
| `src/components/image-upload/ImageUploadPreview.tsx` | Current image preview |
| `src/components/image-upload/index.ts` | Barrel exports |
| `src/hooks/useImageUpload.ts` | Upload logic hook |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/AvatarUpload.tsx` | Migrate to use ImageEditor |
| `src/components/AvatarEditor.tsx` | Deprecate (replaced by ImageEditor) |
| `src/components/companies/AddCompanyDialog.tsx` | Add ImageEditor for logo/cover |
| `src/components/profile/ProfileHeaderUpload.tsx` | Add ImageEditor integration |
| `src/components/profile/ChangeAvatarDialog.tsx` | Use ImageUpload component |
| `src/components/livehub/BackgroundImagePicker.tsx` | Add ImageEditor for backgrounds |
| `src/components/appearance/PresetGallery.tsx` | Add ImageEditor for custom uploads |

---

## Storage Bucket Organization

Current buckets to utilize:
- `avatars` - Profile pictures (already exists)
- `profile-headers` - Profile headers/banners (already exists)
- `company-logos` - Company logos (new bucket)
- `company-covers` - Company cover images (new bucket or use existing)
- `virtual-backgrounds` - Video call backgrounds (already exists)
- `course-thumbnails` - Course images (if needed)
- `job-banners` - Job posting banners (if needed)

**Migration Note**: New buckets may need to be created with appropriate RLS policies.

---

## Expected Outcome

After implementation:

1. **Consistent image editing** - Same editor experience across all upload points
2. **Proper aspect ratios** - Images always fit their intended containers
3. **Optimized file sizes** - Images resized to target dimensions before upload
4. **Professional results** - Filters and adjustments for polished images
5. **Memory efficient** - Proper cleanup of object URLs
6. **Accessible** - Keyboard shortcuts, focus management
7. **Reusable** - Single component for all image upload needs
8. **Maintainable** - Centralized logic, easy to extend

This creates an enterprise-grade image editing system that elevates the platform's visual quality while maintaining consistent UX across all image upload touchpoints.
