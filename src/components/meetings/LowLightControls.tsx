import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sun, Moon, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnhancementSettings {
  brightness: number;
  contrast: number;
  gamma: number;
  saturation: number;
  autoEnhance: boolean;
}

interface LightAnalysis {
  averageLuminance: number;
  isLowLight: boolean;
  isDark: boolean;
  histogram: number[];
}

interface LowLightControlsProps {
  isEnabled: boolean;
  isAutoMode: boolean;
  settings: EnhancementSettings;
  lightAnalysis: LightAnalysis | null;
  onToggle: (enabled: boolean) => void;
  onAutoModeToggle: (auto: boolean) => void;
  onSettingsChange: (settings: Partial<EnhancementSettings>) => void;
  onReset: () => void;
  className?: string;
}

export function LowLightControls({
  isEnabled,
  isAutoMode,
  settings,
  lightAnalysis,
  onToggle,
  onAutoModeToggle,
  onSettingsChange,
  onReset,
  className,
}: LowLightControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getLightingStatusColor = () => {
    if (!lightAnalysis) return 'bg-muted';
    if (lightAnalysis.isDark) return 'bg-amber-500';
    if (lightAnalysis.isLowLight) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getLightingStatusText = () => {
    if (!lightAnalysis) return 'Analyzing...';
    if (lightAnalysis.isDark) return 'Very Dark';
    if (lightAnalysis.isLowLight) return 'Low Light';
    return 'Good Lighting';
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4" />
            <span>Low Light Enhancement</span>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={onToggle}
          />
        </CardTitle>
      </CardHeader>

      {isEnabled && (
        <CardContent className="space-y-4">
          {/* Lighting Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn("h-2 w-2 rounded-full", getLightingStatusColor())} />
              <span className="text-xs text-muted-foreground">
                {getLightingStatusText()}
              </span>
            </div>
            {lightAnalysis && (
              <span className="text-xs text-muted-foreground">
                {Math.round(lightAnalysis.averageLuminance * 100)}% luminance
              </span>
            )}
          </div>

          {/* Auto Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <Label htmlFor="auto-mode" className="text-sm">
                Auto Enhance
              </Label>
            </div>
            <Switch
              id="auto-mode"
              checked={isAutoMode}
              onCheckedChange={onAutoModeToggle}
            />
          </div>

          {/* Expand/Collapse Manual Controls */}
          {!isAutoMode && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Hide Manual Controls' : 'Show Manual Controls'}
            </Button>
          )}

          {/* Manual Controls */}
          {!isAutoMode && isExpanded && (
            <div className="space-y-4 pt-2">
              {/* Brightness */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Brightness</Label>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(settings.brightness * 100)}%
                  </span>
                </div>
                <Slider
                  value={[settings.brightness]}
                  min={-0.5}
                  max={0.5}
                  step={0.01}
                  onValueChange={([value]) => onSettingsChange({ brightness: value })}
                />
              </div>

              {/* Contrast */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Contrast</Label>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(settings.contrast * 100)}%
                  </span>
                </div>
                <Slider
                  value={[settings.contrast]}
                  min={0.5}
                  max={1.5}
                  step={0.01}
                  onValueChange={([value]) => onSettingsChange({ contrast: value })}
                />
              </div>

              {/* Gamma */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Gamma</Label>
                  <span className="text-xs text-muted-foreground">
                    {settings.gamma.toFixed(2)}
                  </span>
                </div>
                <Slider
                  value={[settings.gamma]}
                  min={0.5}
                  max={2.5}
                  step={0.05}
                  onValueChange={([value]) => onSettingsChange({ gamma: value })}
                />
              </div>

              {/* Saturation */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Saturation</Label>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(settings.saturation * 100)}%
                  </span>
                </div>
                <Slider
                  value={[settings.saturation]}
                  min={0.5}
                  max={1.5}
                  step={0.01}
                  onValueChange={([value]) => onSettingsChange({ saturation: value })}
                />
              </div>

              {/* Reset Button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={onReset}
              >
                <RefreshCw className="mr-2 h-3 w-3" />
                Reset to Defaults
              </Button>
            </div>
          )}

          {/* Preview indicator when auto mode is on */}
          {isAutoMode && lightAnalysis?.isLowLight && (
            <div className="flex items-center gap-2 rounded-md bg-primary/10 p-2">
              <Moon className="h-4 w-4 text-primary" />
              <span className="text-xs text-primary">
                Auto-adjusting for low light conditions
              </span>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
