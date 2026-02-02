import { memo } from 'react';
import { cn } from '@/lib/utils';

interface PreviewSize {
  label: string;
  size: number;
}

interface ImageEditorPreviewProps {
  previewUrl: string | null;
  previewSizes: PreviewSize[];
  previewShape: 'circle' | 'square' | 'rectangle';
  aspectRatio?: number;
}

export const ImageEditorPreview = memo(function ImageEditorPreview({
  previewUrl,
  previewSizes,
  previewShape,
  aspectRatio = 1,
}: ImageEditorPreviewProps) {
  const getPreviewClasses = (size: number) => {
    const baseClasses = 'bg-background overflow-hidden border-2 border-border transition-all';
    
    switch (previewShape) {
      case 'circle':
        return cn(baseClasses, 'rounded-full');
      case 'square':
        return cn(baseClasses, 'rounded-lg');
      case 'rectangle':
        return cn(baseClasses, 'rounded-lg');
      default:
        return cn(baseClasses, 'rounded-lg');
    }
  };

  const getPreviewDimensions = (baseSize: number) => {
    if (previewShape === 'rectangle') {
      return {
        width: baseSize,
        height: baseSize / aspectRatio,
      };
    }
    return {
      width: baseSize,
      height: baseSize,
    };
  };

  return (
    <div className="bg-muted/50 rounded-lg p-4">
      <p className="text-sm font-medium mb-3">Live Preview</p>
      <div className="flex items-end justify-center gap-4 flex-wrap">
        {previewSizes.map((preview) => {
          const { width, height } = getPreviewDimensions(preview.size);
          return (
            <div key={preview.label} className="text-center space-y-2">
              <div
                className={cn(getPreviewClasses(preview.size), 'mx-auto')}
                style={{ 
                  width: `${width}px`, 
                  height: `${height}px`,
                  minWidth: `${width}px`,
                }}
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={`${preview.label} preview`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted animate-pulse" />
                )}
              </div>
              <span className="text-xs text-muted-foreground">{preview.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
});
