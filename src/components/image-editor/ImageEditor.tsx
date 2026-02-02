import { useState, useCallback, useEffect, useMemo, lazy, Suspense } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Settings2, Loader2 } from 'lucide-react';
import { ImageEditorControls } from './ImageEditorControls';
import { ImageEditorFilters } from './ImageEditorFilters';
import { ImageEditorPreview } from './ImageEditorPreview';
import { cropAndResizeImage, type CropArea, type FlipSettings } from './utils/cropImage';
import { 
  IMAGE_EDITOR_PRESETS, 
  type ImageEditorConfig, 
  type ImageEditorPreset,
  type FilterSettings,
} from './ImageEditorPresets';

// Dynamic import for heavy cropper library to reduce bundle size
const Cropper = lazy(() => import('react-easy-crop').then(mod => ({ default: mod.default })));

interface ImageEditorProps {
  image: string;
  open: boolean;
  onClose: () => void;
  onSave: (blob: Blob, metadata?: { width: number; height: number }) => void;
  preset?: ImageEditorPreset;
  config?: Partial<ImageEditorConfig>;
}

const DEFAULT_FILTERS: FilterSettings = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  preset: 'none',
};

const DEFAULT_FLIP: FlipSettings = {
  horizontal: false,
  vertical: false,
};

// Loading fallback for the cropper
function CropperLoading() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-muted">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export function ImageEditor({
  image,
  open,
  onClose,
  onSave,
  preset = 'avatar',
  config: customConfig,
}: ImageEditorProps) {
  // Merge preset with custom config
  const config = useMemo(() => {
    const baseConfig = IMAGE_EDITOR_PRESETS[preset];
    return { ...baseConfig, ...customConfig };
  }, [preset, customConfig]);

  // State
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flip, setFlip] = useState<FlipSettings>(DEFAULT_FLIP);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [filters, setFilters] = useState<FilterSettings>(DEFAULT_FILTERS);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Reset state when dialog opens with new image
  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setFlip(DEFAULT_FLIP);
      setFilters(DEFAULT_FILTERS);
      setPreviewUrl('');
    }
  }, [open, image]);

  // Generate preview when crop changes
  useEffect(() => {
    let isMounted = true;
    let objectUrl: string | null = null;

    const generatePreview = async () => {
      if (!croppedAreaPixels) return;

      try {
        const blob = await cropAndResizeImage(
          image,
          croppedAreaPixels,
          rotation,
          flip,
          filters,
          config.outputWidth,
          config.outputHeight,
          config.outputFormat,
          0.7 // Lower quality for preview
        );
        const url = URL.createObjectURL(blob);

        if (isMounted) {
          objectUrl = url;
          setPreviewUrl(url);
        } else {
          URL.revokeObjectURL(url);
        }
      } catch (error) {
        console.error('Error generating preview:', error);
      }
    };

    // Debounce preview generation
    const timer = setTimeout(generatePreview, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [croppedAreaPixels, rotation, flip, filters, image, config]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, []);

  const onCropComplete = useCallback((_: unknown, croppedAreaPixels: CropArea) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleReset = useCallback(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setFlip(DEFAULT_FLIP);
    setFilters(DEFAULT_FILTERS);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;

    try {
      setSaving(true);
      const blob = await cropAndResizeImage(
        image,
        croppedAreaPixels,
        rotation,
        flip,
        filters,
        config.outputWidth,
        config.outputHeight,
        config.outputFormat,
        config.outputQuality
      );
      onSave(blob, { width: config.outputWidth, height: config.outputHeight });
    } catch (error) {
      console.error('Error cropping image:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    onClose();
  };

  const getFilterStyle = () => ({
    filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%)`,
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Cropper Area */}
          <div
            className="relative h-[400px] bg-muted rounded-lg overflow-hidden"
            style={getFilterStyle()}
          >
            <Suspense fallback={<CropperLoading />}>
              <Cropper
                image={image}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={config.aspectRatio}
                cropShape={config.cropShape}
                showGrid={config.cropShape === 'rect'}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={onCropComplete}
              />
            </Suspense>
          </div>

          {/* Aspect Ratio Info */}
          {config.aspectRatioLabel && (
            <div className="flex items-center justify-center">
              <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                {config.aspectRatioLabel} • {config.outputWidth}×{config.outputHeight}px
              </span>
            </div>
          )}

          {/* Controls Tabs */}
          <Tabs defaultValue="adjust" className="w-full">
            <TabsList className={`grid w-full ${config.enableFilters ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <TabsTrigger value="adjust" className="flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Adjust
              </TabsTrigger>
              {config.enableFilters && (
                <TabsTrigger value="filters" className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Filters
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="adjust" className="mt-4">
              <ImageEditorControls
                zoom={zoom}
                onZoomChange={setZoom}
                rotation={rotation}
                onRotationChange={setRotation}
                flip={flip}
                onFlipChange={setFlip}
                enableZoom={config.enableZoom}
                enableRotation={config.enableRotation}
                enableFlip={config.enableFlip}
                onReset={handleReset}
              />
            </TabsContent>

            {config.enableFilters && (
              <TabsContent value="filters" className="mt-4">
                <ImageEditorFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                />
              </TabsContent>
            )}
          </Tabs>

          {/* Live Preview */}
          {config.previewSizes && config.previewSizes.length > 0 && (
            <ImageEditorPreview
              previewUrl={previewUrl}
              previewSizes={config.previewSizes}
              previewShape={config.previewShape || 'square'}
              aspectRatio={config.aspectRatio}
            />
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !croppedAreaPixels}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                config.saveButtonText || 'Save'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
