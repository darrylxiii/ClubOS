/**
 * Enterprise Image Editor Presets
 * Configurable presets for different image upload use cases
 */

export interface ImageEditorConfig {
  // Aspect ratio
  aspectRatio: number;
  aspectRatioLabel?: string;
  
  // Crop shape
  cropShape: 'rect' | 'round';
  
  // Output
  outputWidth: number;
  outputHeight: number;
  outputQuality: number;
  outputFormat: 'jpeg' | 'png' | 'webp';
  
  // Features
  enableFilters: boolean;
  enableRotation: boolean;
  enableFlip: boolean;
  enableZoom: boolean;
  
  // Preview
  previewSizes?: { label: string; size: number }[];
  previewShape?: 'circle' | 'square' | 'rectangle';
  
  // UI
  title: string;
  saveButtonText?: string;
}

export interface FilterSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  preset: string;
}

export const FILTER_PRESETS: Record<string, Omit<FilterSettings, 'preset'>> = {
  none: { brightness: 100, contrast: 100, saturation: 100 },
  vivid: { brightness: 105, contrast: 110, saturation: 130 },
  warm: { brightness: 105, contrast: 100, saturation: 110 },
  cool: { brightness: 100, contrast: 105, saturation: 90 },
  bw: { brightness: 100, contrast: 110, saturation: 0 },
  vintage: { brightness: 110, contrast: 90, saturation: 80 },
  dramatic: { brightness: 95, contrast: 140, saturation: 120 },
};

export const IMAGE_EDITOR_PRESETS = {
  avatar: {
    aspectRatio: 1,
    aspectRatioLabel: 'Square',
    cropShape: 'round' as const,
    outputWidth: 400,
    outputHeight: 400,
    outputQuality: 0.92,
    outputFormat: 'jpeg' as const,
    enableFilters: true,
    enableRotation: true,
    enableFlip: true,
    enableZoom: true,
    previewSizes: [
      { label: 'Small', size: 32 },
      { label: 'Medium', size: 64 },
      { label: 'Large', size: 96 },
    ],
    previewShape: 'circle' as const,
    title: 'Edit Profile Picture',
  },
  
  companyLogo: {
    aspectRatio: 1,
    aspectRatioLabel: 'Square',
    cropShape: 'rect' as const,
    outputWidth: 400,
    outputHeight: 400,
    outputQuality: 0.95,
    outputFormat: 'png' as const,
    enableFilters: false,
    enableRotation: true,
    enableFlip: true,
    enableZoom: true,
    previewSizes: [
      { label: 'Favicon', size: 32 },
      { label: 'Card', size: 64 },
      { label: 'Header', size: 128 },
    ],
    previewShape: 'square' as const,
    title: 'Edit Company Logo',
  },
  
  coverImage: {
    aspectRatio: 16 / 9,
    aspectRatioLabel: '16:9 Widescreen',
    cropShape: 'rect' as const,
    outputWidth: 1920,
    outputHeight: 1080,
    outputQuality: 0.88,
    outputFormat: 'jpeg' as const,
    enableFilters: true,
    enableRotation: true,
    enableFlip: true,
    enableZoom: true,
    previewSizes: [
      { label: 'Thumbnail', size: 160 },
      { label: 'Card', size: 320 },
    ],
    previewShape: 'rectangle' as const,
    title: 'Edit Cover Image',
  },
  
  profileHeader: {
    aspectRatio: 3 / 1,
    aspectRatioLabel: '3:1 Banner',
    cropShape: 'rect' as const,
    outputWidth: 1500,
    outputHeight: 500,
    outputQuality: 0.88,
    outputFormat: 'jpeg' as const,
    enableFilters: true,
    enableRotation: true,
    enableFlip: true,
    enableZoom: true,
    previewSizes: [
      { label: 'Mobile', size: 200 },
      { label: 'Desktop', size: 400 },
    ],
    previewShape: 'rectangle' as const,
    title: 'Edit Profile Header',
  },
  
  virtualBackground: {
    aspectRatio: 16 / 9,
    aspectRatioLabel: '16:9 Video',
    cropShape: 'rect' as const,
    outputWidth: 1920,
    outputHeight: 1080,
    outputQuality: 0.85,
    outputFormat: 'jpeg' as const,
    enableFilters: false,
    enableRotation: false,
    enableFlip: true,
    enableZoom: true,
    previewSizes: [
      { label: 'Preview', size: 240 },
    ],
    previewShape: 'rectangle' as const,
    title: 'Edit Virtual Background',
  },

  jobBanner: {
    aspectRatio: 4 / 1,
    aspectRatioLabel: '4:1 Banner',
    cropShape: 'rect' as const,
    outputWidth: 1200,
    outputHeight: 300,
    outputQuality: 0.88,
    outputFormat: 'jpeg' as const,
    enableFilters: true,
    enableRotation: true,
    enableFlip: true,
    enableZoom: true,
    previewSizes: [
      { label: 'Card', size: 200 },
    ],
    previewShape: 'rectangle' as const,
    title: 'Edit Job Banner',
  },

  courseThumbnail: {
    aspectRatio: 16 / 9,
    aspectRatioLabel: '16:9 Thumbnail',
    cropShape: 'rect' as const,
    outputWidth: 1280,
    outputHeight: 720,
    outputQuality: 0.90,
    outputFormat: 'jpeg' as const,
    enableFilters: true,
    enableRotation: true,
    enableFlip: true,
    enableZoom: true,
    previewSizes: [
      { label: 'Card', size: 160 },
      { label: 'Large', size: 280 },
    ],
    previewShape: 'rectangle' as const,
    title: 'Edit Course Thumbnail',
  },
} satisfies Record<string, ImageEditorConfig>;

export type ImageEditorPreset = keyof typeof IMAGE_EDITOR_PRESETS;
