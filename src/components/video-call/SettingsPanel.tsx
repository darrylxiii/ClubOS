import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const { t } = useTranslation('common');
  const [backgroundBlur, setBackgroundBlur] = useState(false);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [echoCancellation, setEchoCancellation] = useState(true);

  return (
    <div className="absolute right-0 top-0 bottom-0 w-96 glass-card border-l border-border/20 flex flex-col z-[10001]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/20">
        <h3 className="font-semibold text-lg">{t("settings", "Settings")}</h3>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label={t("close_settings", "Close settings")}>
          <X className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>

      {/* Settings Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Video Settings */}
          <div className="space-y-4">
            <h4 className="font-semibold">{t("video_settings", "Video Settings")}</h4>
            
            <div className="space-y-2">
              <Label>{t("camera", "Camera")}</Label>
              <Select defaultValue="default">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">{t("default_camera", "Default Camera")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("video_quality", "Video Quality")}</Label>
              <Select defaultValue="hd">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sd">{t("standard_480p", "Standard (480p)")}</SelectItem>
                  <SelectItem value="hd">{t("hd_720p", "HD (720p)")}</SelectItem>
                  <SelectItem value="fhd">{t("full_hd_1080p", "Full HD (1080p)")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>{t("background_blur", "Background Blur")}</Label>
              <Switch checked={backgroundBlur} onCheckedChange={setBackgroundBlur} />
            </div>
          </div>

          <Separator />

          {/* Audio Settings */}
          <div className="space-y-4">
            <h4 className="font-semibold">{t("audio_settings", "Audio Settings")}</h4>
            
            <div className="space-y-2">
              <Label>{t("microphone", "Microphone")}</Label>
              <Select defaultValue="default">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">{t("default_microphone", "Default Microphone")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("speaker", "Speaker")}</Label>
              <Select defaultValue="default">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">{t("default_speaker", "Default Speaker")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>{t("noise_suppression", "Noise Suppression")}</Label>
              <Switch checked={noiseSuppression} onCheckedChange={setNoiseSuppression} />
            </div>

            <div className="flex items-center justify-between">
              <Label>{t("echo_cancellation", "Echo Cancellation")}</Label>
              <Switch checked={echoCancellation} onCheckedChange={setEchoCancellation} />
            </div>
          </div>

          <Separator />

          {/* Advanced Settings */}
          <div className="space-y-4">
            <h4 className="font-semibold">{t("advanced", "Advanced")}</h4>
            
            <div className="space-y-2">
              <Label>{t("layout", "Layout")}</Label>
              <Select defaultValue="grid">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grid">{t("grid_view", "Grid View")}</SelectItem>
                  <SelectItem value="spotlight">{t("spotlight_view", "Spotlight View")}</SelectItem>
                  <SelectItem value="sidebar">{t("sidebar_view", "Sidebar View")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}