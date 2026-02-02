import { memo } from 'react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { FILTER_PRESETS, type FilterSettings } from './ImageEditorPresets';

interface ImageEditorFiltersProps {
  filters: FilterSettings;
  onFiltersChange: (filters: FilterSettings) => void;
}

export const ImageEditorFilters = memo(function ImageEditorFilters({
  filters,
  onFiltersChange,
}: ImageEditorFiltersProps) {
  const applyPreset = (presetName: string) => {
    const preset = FILTER_PRESETS[presetName];
    if (preset) {
      onFiltersChange({
        ...preset,
        preset: presetName,
      });
    }
  };

  const updateFilter = (key: keyof Omit<FilterSettings, 'preset'>, value: number) => {
    onFiltersChange({
      ...filters,
      [key]: value,
      preset: 'custom',
    });
  };

  return (
    <div className="space-y-4">
      {/* Preset Filters */}
      <div>
        <p className="text-sm font-medium mb-3">Preset Filters</p>
        <div className="grid grid-cols-4 gap-2">
          {Object.keys(FILTER_PRESETS).map((presetName) => {
            const preset = FILTER_PRESETS[presetName];
            return (
              <button
                key={presetName}
                type="button"
                onClick={() => applyPreset(presetName)}
                className={cn(
                  'relative aspect-square rounded-lg overflow-hidden border-2 transition-all',
                  filters.preset === presetName
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div
                  className="w-full h-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500"
                  style={{
                    filter: `brightness(${preset.brightness}%) contrast(${preset.contrast}%) saturate(${preset.saturation}%)`,
                  }}
                />
                <span className="absolute bottom-1 left-1 right-1 text-[10px] font-medium text-white bg-black/50 rounded px-1 py-0.5 text-center capitalize">
                  {presetName}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Adjustments */}
      <div className="space-y-3 pt-2">
        <p className="text-sm font-medium">Custom Adjustments</p>

        {/* Brightness */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Brightness</span>
            <span className="text-muted-foreground font-mono text-xs">
              {filters.brightness}%
            </span>
          </div>
          <Slider
            value={[filters.brightness]}
            min={50}
            max={150}
            step={1}
            onValueChange={(value) => updateFilter('brightness', value[0])}
          />
        </div>

        {/* Contrast */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Contrast</span>
            <span className="text-muted-foreground font-mono text-xs">
              {filters.contrast}%
            </span>
          </div>
          <Slider
            value={[filters.contrast]}
            min={50}
            max={150}
            step={1}
            onValueChange={(value) => updateFilter('contrast', value[0])}
          />
        </div>

        {/* Saturation */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Saturation</span>
            <span className="text-muted-foreground font-mono text-xs">
              {filters.saturation}%
            </span>
          </div>
          <Slider
            value={[filters.saturation]}
            min={0}
            max={200}
            step={1}
            onValueChange={(value) => updateFilter('saturation', value[0])}
          />
        </div>
      </div>
    </div>
  );
});
