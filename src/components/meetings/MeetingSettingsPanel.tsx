import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Mic, 
  Video, 
  Wifi, 
  Cpu, 
  Brain, 
  Settings2, 
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import type { MeetingFeatureSettings } from '@/hooks/useMeetingFeatureSettings';

interface MeetingSettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: MeetingFeatureSettings;
  onUpdateSetting: <K extends keyof MeetingFeatureSettings>(
    category: K,
    updates: Partial<MeetingFeatureSettings[K]>
  ) => void;
  onToggleFeature: (category: keyof MeetingFeatureSettings, enabled: boolean) => void;
  onReset: () => void;
  capabilities: {
    canUseFeature: (feature: string) => boolean;
    unsupported: string[];
  };
}

export function MeetingSettingsPanel({
  open,
  onOpenChange,
  settings,
  onUpdateSetting,
  onToggleFeature,
  onReset,
  capabilities,
}: MeetingSettingsPanelProps) {
  const [activeTab, setActiveTab] = useState('audio');

  const FeatureToggle = ({ 
    category, 
    label, 
    description,
    featureCheck,
  }: { 
    category: keyof MeetingFeatureSettings; 
    label: string;
    description: string;
    featureCheck?: string;
  }) => {
    const setting = settings[category] as { enabled: boolean };
    const isSupported = !featureCheck || capabilities.canUseFeature(featureCheck);
    
    return (
      <div className="flex items-center justify-between py-3">
        <div className="space-y-0.5 flex-1">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">{label}</Label>
            {!isSupported && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      Unsupported
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This feature is not supported in your browser</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Switch
          checked={setting.enabled && isSupported}
          onCheckedChange={(checked) => onToggleFeature(category, checked)}
          disabled={!isSupported}
        />
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[450px] p-0 z-[10200]">
        <SheetHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Meeting Settings
            </SheetTitle>
            <Button variant="ghost" size="sm" onClick={onReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto">
            <TabsTrigger 
              value="audio" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4"
            >
              <Mic className="h-4 w-4 mr-2" />
              Audio
            </TabsTrigger>
            <TabsTrigger 
              value="video"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4"
            >
              <Video className="h-4 w-4 mr-2" />
              Video
            </TabsTrigger>
            <TabsTrigger 
              value="network"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4"
            >
              <Wifi className="h-4 w-4 mr-2" />
              Network
            </TabsTrigger>
            <TabsTrigger 
              value="ai"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4"
            >
              <Brain className="h-4 w-4 mr-2" />
              AI
            </TabsTrigger>
            <TabsTrigger 
              value="performance"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4"
            >
              <Cpu className="h-4 w-4 mr-2" />
              Perf
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(100vh-180px)]">
            {/* Audio Settings */}
            <TabsContent value="audio" className="m-0 p-6 space-y-4">
              <FeatureToggle
                category="noiseCancellation"
                label="Noise Cancellation"
                description="AI-powered background noise removal"
                featureCheck="noiseCancellation"
              />
              
              {settings.noiseCancellation.enabled && (
                <div className="pl-4 space-y-3">
                  <Label className="text-xs text-muted-foreground">Noise Cancellation Level</Label>
                  <Select
                    value={settings.noiseCancellation.level}
                    onValueChange={(value: 'low' | 'medium' | 'high') => 
                      onUpdateSetting('noiseCancellation', { level: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - Light filtering</SelectItem>
                      <SelectItem value="medium">Medium - Balanced</SelectItem>
                      <SelectItem value="high">High - Maximum suppression</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Separator />

              <FeatureToggle
                category="spatialAudio"
                label="Spatial Audio"
                description="3D audio positioning for participants"
                featureCheck="spatialAudio"
              />

              <Separator />

              <FeatureToggle
                category="audioNormalization"
                label="Audio Normalization"
                description="Automatic volume leveling"
              />

              {settings.audioNormalization.enabled && (
                <div className="pl-4 space-y-3">
                  <Label className="text-xs text-muted-foreground">
                    Target Level: {settings.audioNormalization.targetLevel}dB
                  </Label>
                  <Slider
                    value={[settings.audioNormalization.targetLevel]}
                    onValueChange={([value]) => 
                      onUpdateSetting('audioNormalization', { targetLevel: value })
                    }
                    min={-30}
                    max={-10}
                    step={1}
                    className="w-full"
                  />
                </div>
              )}

              <Separator />

              <FeatureToggle
                category="echoCancellation"
                label="Echo Cancellation"
                description="Reduces audio feedback and echo"
              />
            </TabsContent>

            {/* Video Settings */}
            <TabsContent value="video" className="m-0 p-6 space-y-4">
              <FeatureToggle
                category="lowLightEnhancement"
                label="Low Light Enhancement"
                description="Improves video quality in dark environments"
                featureCheck="lowLightEnhancement"
              />

              {settings.lowLightEnhancement.enabled && (
                <div className="pl-4 space-y-3">
                  <Label className="text-xs text-muted-foreground">Mode</Label>
                  <Select
                    value={settings.lowLightEnhancement.mode}
                    onValueChange={(value: 'auto' | 'manual') => 
                      onUpdateSetting('lowLightEnhancement', { mode: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto - Detect lighting</SelectItem>
                      <SelectItem value="manual">Manual - Always on</SelectItem>
                    </SelectContent>
                  </Select>

                  <Label className="text-xs text-muted-foreground">
                    Intensity: {settings.lowLightEnhancement.intensity}%
                  </Label>
                  <Slider
                    value={[settings.lowLightEnhancement.intensity]}
                    onValueChange={([value]) => 
                      onUpdateSetting('lowLightEnhancement', { intensity: value })
                    }
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
              )}

              <Separator />

              <FeatureToggle
                category="svc"
                label="Scalable Video Coding"
                description="Adaptive video quality per participant"
                featureCheck="svc"
              />

              {settings.svc.enabled && (
                <div className="pl-4 space-y-3">
                  <Label className="text-xs text-muted-foreground">Preferred Codec</Label>
                  <Select
                    value={settings.svc.codec}
                    onValueChange={(value: 'vp9' | 'av1' | 'h264') => 
                      onUpdateSetting('svc', { codec: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vp9">VP9 (Recommended)</SelectItem>
                      <SelectItem value="av1">AV1 (Best quality)</SelectItem>
                      <SelectItem value="h264">H.264 (Most compatible)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Separator />

              <FeatureToggle
                category="hdScreenShare"
                label="HD Screen Sharing"
                description="High resolution screen sharing"
                featureCheck="screenShare"
              />

              {settings.hdScreenShare.enabled && (
                <div className="pl-4 space-y-3">
                  <Label className="text-xs text-muted-foreground">
                    Max FPS: {settings.hdScreenShare.maxFps}
                  </Label>
                  <Slider
                    value={[settings.hdScreenShare.maxFps]}
                    onValueChange={([value]) => 
                      onUpdateSetting('hdScreenShare', { maxFps: value })
                    }
                    min={5}
                    max={60}
                    step={5}
                    className="w-full"
                  />
                </div>
              )}
            </TabsContent>

            {/* Network Settings */}
            <TabsContent value="network" className="m-0 p-6 space-y-4">
              <FeatureToggle
                category="adaptiveQuality"
                label="Adaptive Quality"
                description="Automatically adjust quality based on connection"
              />

              {settings.adaptiveQuality.enabled && (
                <div className="pl-4 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Minimum Quality</Label>
                    <Select
                      value={settings.adaptiveQuality.minQuality}
                      onValueChange={(value: 'audio-only' | 'low' | 'medium') => 
                        onUpdateSetting('adaptiveQuality', { minQuality: value })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="audio-only">Audio Only</SelectItem>
                        <SelectItem value="low">Low (360p)</SelectItem>
                        <SelectItem value="medium">Medium (720p)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Maximum Quality</Label>
                    <Select
                      value={settings.adaptiveQuality.maxQuality}
                      onValueChange={(value: 'medium' | 'high' | 'hd') => 
                        onUpdateSetting('adaptiveQuality', { maxQuality: value })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="medium">Medium (720p)</SelectItem>
                        <SelectItem value="high">High (1080p)</SelectItem>
                        <SelectItem value="hd">HD (1440p)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <Separator />

              <FeatureToggle
                category="networkResilience"
                label="Network Resilience"
                description="Enhanced connection recovery"
              />

              {settings.networkResilience.enabled && (
                <div className="pl-4 py-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Auto Reconnect</Label>
                    <Switch
                      checked={settings.networkResilience.autoReconnect}
                      onCheckedChange={(checked) => 
                        onUpdateSetting('networkResilience', { autoReconnect: checked })
                      }
                    />
                  </div>
                </div>
              )}
            </TabsContent>

            {/* AI Settings */}
            <TabsContent value="ai" className="m-0 p-6 space-y-4">
              <FeatureToggle
                category="transcription"
                label="Live Transcription"
                description="Real-time speech to text"
                featureCheck="transcription"
              />

              {settings.transcription.enabled && (
                <div className="pl-4 space-y-3">
                  <Label className="text-xs text-muted-foreground">Language</Label>
                  <Select
                    value={settings.transcription.language}
                    onValueChange={(value) => 
                      onUpdateSetting('transcription', { language: value })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en-US">English (US)</SelectItem>
                      <SelectItem value="en-GB">English (UK)</SelectItem>
                      <SelectItem value="nl-NL">Dutch</SelectItem>
                      <SelectItem value="de-DE">German</SelectItem>
                      <SelectItem value="fr-FR">French</SelectItem>
                      <SelectItem value="es-ES">Spanish</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Show Speaker Labels</Label>
                    <Switch
                      checked={settings.transcription.showSpeakerLabels}
                      onCheckedChange={(checked) => 
                        onUpdateSetting('transcription', { showSpeakerLabels: checked })
                      }
                    />
                  </div>
                </div>
              )}

              <Separator />

              <FeatureToggle
                category="gestureRecognition"
                label="Gesture Recognition"
                description="Detect hand gestures for reactions"
                featureCheck="virtualBackground"
              />

              {settings.gestureRecognition.enabled && (
                <div className="pl-4 py-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Show Gesture Reactions</Label>
                    <Switch
                      checked={settings.gestureRecognition.showReactions}
                      onCheckedChange={(checked) => 
                        onUpdateSetting('gestureRecognition', { showReactions: checked })
                      }
                    />
                  </div>
                </div>
              )}

              <Separator />

              <FeatureToggle
                category="autoHighlight"
                label="Auto Highlights"
                description="Detect action items and decisions"
              />
            </TabsContent>

            {/* Performance Settings */}
            <TabsContent value="performance" className="m-0 p-6 space-y-4">
              <FeatureToggle
                category="performanceMonitoring"
                label="Performance Monitoring"
                description="Track meeting performance metrics"
              />

              {settings.performanceMonitoring.enabled && (
                <div className="pl-4 py-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Show Performance Dashboard</Label>
                    <Switch
                      checked={settings.performanceMonitoring.showDashboard}
                      onCheckedChange={(checked) => 
                        onUpdateSetting('performanceMonitoring', { showDashboard: checked })
                      }
                    />
                  </div>
                </div>
              )}

              <Separator />

              <FeatureToggle
                category="resourceOptimization"
                label="Resource Optimization"
                description="Automatic CPU/memory optimization"
              />

              {settings.resourceOptimization.enabled && (
                <div className="pl-4 py-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Battery Saver Mode</Label>
                    <Switch
                      checked={settings.resourceOptimization.batterySaver}
                      onCheckedChange={(checked) => 
                        onUpdateSetting('resourceOptimization', { batterySaver: checked })
                      }
                    />
                  </div>
                </div>
              )}

              <Separator />

              {/* Browser Capabilities Status */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Browser Capabilities</Label>
                <div className="space-y-2">
                  {capabilities.unsupported.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      All features supported
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-sm text-yellow-600">
                        <AlertCircle className="h-4 w-4" />
                        Some features unavailable
                      </div>
                      <div className="pl-6 space-y-1">
                        {capabilities.unsupported.map((feature) => (
                          <div key={feature} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <XCircle className="h-3 w-3 text-red-500" />
                            {feature}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
