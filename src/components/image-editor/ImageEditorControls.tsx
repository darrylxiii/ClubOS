import { memo } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCw, FlipHorizontal, FlipVertical, RotateCcw } from 'lucide-react';
import type { FlipSettings } from './utils/cropImage';

interface ImageEditorControlsProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  rotation: number;
  onRotationChange: (rotation: number) => void;
  flip: FlipSettings;
  onFlipChange: (flip: FlipSettings) => void;
  enableZoom?: boolean;
  enableRotation?: boolean;
  enableFlip?: boolean;
  onReset: () => void;
}

export const ImageEditorControls = memo(function ImageEditorControls({
  zoom,
  onZoomChange,
  rotation,
  onRotationChange,
  flip,
  onFlipChange,
  enableZoom = true,
  enableRotation = true,
  enableFlip = true,
  onReset,
}: ImageEditorControlsProps) {
  const handleFlipHorizontal = () => {
    onFlipChange({ ...flip, horizontal: !flip.horizontal });
  };

  const handleFlipVertical = () => {
    onFlipChange({ ...flip, vertical: !flip.vertical });
  };

  const handleRotate90 = () => {
    onRotationChange((rotation + 90) % 360);
  };

  return (
    <div className="space-y-4">
      {/* Zoom Control */}
      {enableZoom && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <ZoomOut className="w-4 h-4" />
              Zoom
              <ZoomIn className="w-4 h-4" />
            </span>
            <span className="text-muted-foreground font-mono text-xs">
              {Math.round(zoom * 100)}%
            </span>
          </div>
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.05}
            onValueChange={(value) => onZoomChange(value[0])}
            className="w-full"
          />
        </div>
      )}

      {/* Rotation Control */}
      {enableRotation && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <RotateCw className="w-4 h-4" />
              Rotation
            </span>
            <span className="text-muted-foreground font-mono text-xs">
              {rotation}°
            </span>
          </div>
          <Slider
            value={[rotation]}
            min={0}
            max={360}
            step={1}
            onValueChange={(value) => onRotationChange(value[0])}
            className="w-full"
          />
        </div>
      )}

      {/* Flip & Quick Actions */}
      <div className="flex items-center gap-2 pt-2">
        {enableFlip && (
          <>
            <Button
              type="button"
              variant={flip.horizontal ? 'secondary' : 'outline'}
              size="sm"
              onClick={handleFlipHorizontal}
              className="flex-1"
            >
              <FlipHorizontal className="w-4 h-4 mr-2" />
              Flip H
            </Button>
            <Button
              type="button"
              variant={flip.vertical ? 'secondary' : 'outline'}
              size="sm"
              onClick={handleFlipVertical}
              className="flex-1"
            >
              <FlipVertical className="w-4 h-4 mr-2" />
              Flip V
            </Button>
          </>
        )}
        
        {enableRotation && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRotate90}
            className="flex-1"
          >
            <RotateCw className="w-4 h-4 mr-2" />
            90°
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="flex-1"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
      </div>
    </div>
  );
});
