import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Monitor, 
  Play, 
  FileText, 
  Layers, 
  Zap,
  Settings2,
  Info
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type ContentType = 'presentation' | 'video' | 'mixed' | 'unknown';

interface ScreenShareAnalysis {
  contentType: ContentType;
  motionLevel: 'static' | 'low' | 'medium' | 'high';
  hasText: boolean;
  colorComplexity: 'simple' | 'complex';
  recommendedSettings: {
    frameRate?: number;
    bitrate?: number;
    optimizeForText?: boolean;
  };
}

interface ScreenShareConfig {
  contentType: ContentType;
  width: number;
  height: number;
  frameRate: number;
  bitrate: number;
  optimizeForText: boolean;
}

interface ScreenShareControlsProps {
  isSharing: boolean;
  config: ScreenShareConfig;
  analysis: ScreenShareAnalysis | null;
  onStartShare: () => void;
  onStopShare: () => void;
  onContentTypeChange: (type: ContentType) => void;
  onOptimize: () => void;
  className?: string;
}

const CONTENT_TYPE_ICONS: Record<ContentType, typeof Monitor> = {
  presentation: FileText,
  video: Play,
  mixed: Layers,
  unknown: Monitor,
};

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  presentation: 'Presentation',
  video: 'Video Content',
  mixed: 'Mixed Content',
  unknown: 'Auto Detect',
};

const CONTENT_TYPE_DESCRIPTIONS: Record<ContentType, string> = {
  presentation: 'Optimized for slides, documents, and text. Lower frame rate, higher clarity.',
  video: 'Optimized for video playback and animations. Higher frame rate, smooth motion.',
  mixed: 'Balanced settings for content with both text and motion.',
  unknown: 'Automatically detects and optimizes based on content.',
};

export function ScreenShareControls({
  isSharing,
  config,
  analysis,
  onStartShare,
  onStopShare,
  onContentTypeChange,
  onOptimize,
  className,
}: ScreenShareControlsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const getMotionBadgeVariant = () => {
    if (!analysis) return 'secondary';
    switch (analysis.motionLevel) {
      case 'static': return 'outline';
      case 'low': return 'secondary';
      case 'medium': return 'default';
      case 'high': return 'destructive';
      default: return 'secondary';
    }
  };

  const formatBitrate = (bitrate: number) => {
    if (bitrate >= 1000000) {
      return `${(bitrate / 1000000).toFixed(1)} Mbps`;
    }
    return `${Math.round(bitrate / 1000)} Kbps`;
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            <span>Screen Share</span>
          </div>
          {isSharing && (
            <Badge variant="default" className="bg-red-500">
              Live
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Start/Stop Button */}
        <Button
          onClick={isSharing ? onStopShare : onStartShare}
          variant={isSharing ? "destructive" : "default"}
          className="w-full"
        >
          <Monitor className="mr-2 h-4 w-4" />
          {isSharing ? 'Stop Sharing' : 'Share Screen'}
        </Button>

        {isSharing && (
          <>
            {/* Content Analysis */}
            {analysis && (
              <div className="space-y-2 rounded-md bg-muted/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Detected Content</span>
                  <Badge variant={getMotionBadgeVariant() as "default" | "secondary" | "outline"}>
                    {analysis.motionLevel} motion
                  </Badge>
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {analysis.hasText && (
                    <Badge variant="outline" className="text-xs">
                      <FileText className="mr-1 h-3 w-3" />
                      Text
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {analysis.colorComplexity === 'complex' ? 'Rich Colors' : 'Simple Colors'}
                  </Badge>
                </div>

                {analysis.contentType !== config.contentType && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={onOptimize}
                  >
                    <Zap className="mr-2 h-3 w-3" />
                    Apply Recommended Settings
                  </Button>
                )}
              </div>
            )}

            {/* Content Type Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Content Type</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">
                        Select the type of content you're sharing for optimal quality
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <RadioGroup
                value={config.contentType}
                onValueChange={(value) => onContentTypeChange(value as ContentType)}
                className="grid grid-cols-2 gap-2"
              >
                {(Object.keys(CONTENT_TYPE_LABELS) as ContentType[]).map((type) => {
                  const Icon = CONTENT_TYPE_ICONS[type];
                  return (
                    <TooltipProvider key={type}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Label
                            htmlFor={type}
                            className={cn(
                              "flex cursor-pointer items-center gap-2 rounded-md border p-2 transition-colors",
                              config.contentType === type
                                ? "border-primary bg-primary/10"
                                : "border-border hover:bg-muted"
                            )}
                          >
                            <RadioGroupItem value={type} id={type} className="sr-only" />
                            <Icon className="h-4 w-4" />
                            <span className="text-xs">{CONTENT_TYPE_LABELS[type]}</span>
                          </Label>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs text-xs">
                            {CONTENT_TYPE_DESCRIPTIONS[type]}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </RadioGroup>
            </div>

            {/* Current Settings Display */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-muted/50 p-2">
                <div className="text-lg font-semibold">{config.frameRate}</div>
                <div className="text-[10px] text-muted-foreground">FPS</div>
              </div>
              <div className="rounded-md bg-muted/50 p-2">
                <div className="text-lg font-semibold">{config.height}p</div>
                <div className="text-[10px] text-muted-foreground">Resolution</div>
              </div>
              <div className="rounded-md bg-muted/50 p-2">
                <div className="text-sm font-semibold">{formatBitrate(config.bitrate)}</div>
                <div className="text-[10px] text-muted-foreground">Bitrate</div>
              </div>
            </div>

            {/* Advanced Settings Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <Settings2 className="mr-2 h-3 w-3" />
              {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
            </Button>

            {showAdvanced && (
              <div className="space-y-3 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="optimize-text" className="text-xs">
                    Optimize for Text
                  </Label>
                  <Switch
                    id="optimize-text"
                    checked={config.optimizeForText}
                    disabled
                  />
                </div>
                
                <div className="text-xs text-muted-foreground">
                  <p>Current encoding:</p>
                  <ul className="mt-1 list-inside list-disc">
                    <li>Resolution: {config.width}x{config.height}</li>
                    <li>Target bitrate: {formatBitrate(config.bitrate)}</li>
                    <li>Frame rate: {config.frameRate} fps</li>
                  </ul>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
