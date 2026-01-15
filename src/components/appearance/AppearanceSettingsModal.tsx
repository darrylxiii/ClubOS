import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useAppearance } from '@/contexts/AppearanceContext';
import { useTheme } from 'next-themes';
import { PresetGallery } from './PresetGallery';
import { Moon, Sun, Monitor, Sparkles } from 'lucide-react';

interface AppearanceSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppearanceSettingsModal({ open, onOpenChange }: AppearanceSettingsModalProps) {
  const { settings, updateSettings } = useAppearance();
  const { theme, setTheme } = useTheme();
  const [generating, setGenerating] = useState(false);

  const themes = [
    { value: 'system', label: 'System', icon: Monitor },
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
  ];

  const overlayColors = [
    { label: 'Background', value: 'hsl(var(--background))' },
    { label: 'Eclipse', value: '#0E0E10' },
    { label: 'Gold', value: '#C9A24E' },
    { label: 'Purple', value: '#8B5CF6' },
    { label: 'Blue', value: '#3B82F6' },
  ];

  const handleGenerateBackground = async () => {
    setGenerating(true);
    // AI generation will be implemented in next phase
    setTimeout(() => {
      setGenerating(false);
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Appearance Settings</DialogTitle>
        </DialogHeader>

        {/* Theme Selection */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Theme</h3>
          <div className="grid grid-cols-3 gap-3">
            {themes.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    theme === t.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Icon className="w-6 h-6 mx-auto mb-2" />
                  <p className="text-sm font-medium">{t.label}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Background Settings */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">Custom Background</h3>
              <p className="text-xs text-muted-foreground">Enable custom background</p>
            </div>
            <Switch
              checked={settings.backgroundEnabled}
              onCheckedChange={(checked) => updateSettings({ backgroundEnabled: checked })}
            />
          </div>

          {settings.backgroundEnabled && (
            <>
              {/* Current Background Preview */}
              <div className="relative h-32 rounded-lg overflow-hidden border">
                {settings.backgroundType === 'video' ? (
                  <video
                    src={settings.backgroundValue || '/videos/surreal-background.mp4'}
                    className="w-full h-full object-cover"
                    muted
                    loop
                    autoPlay
                  />
                ) : (
                  <div
                    className="w-full h-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${settings.backgroundValue})` }}
                  />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                  <p className="text-sm font-medium">Current Background</p>
                </div>
              </div>

              {/* AI Generate */}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleGenerateBackground}
                disabled={generating}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {generating ? 'Generating...' : 'Auto generate background'}
              </Button>

              {/* Overlay Color */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Overlay Color</label>
                <div className="flex gap-2">
                  {overlayColors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => updateSettings({ overlayColor: color.value })}
                      className={`w-12 h-12 rounded-lg border-2 transition-all ${
                        settings.overlayColor === color.value
                          ? 'border-primary scale-110'
                          : 'border-border hover:border-primary/50'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>

              {/* Overlay Opacity */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Overlay Opacity</label>
                  <span className="text-sm text-muted-foreground">{settings.overlayOpacity}%</span>
                </div>
                <Slider
                  value={[settings.overlayOpacity]}
                  onValueChange={([value]) => updateSettings({ overlayOpacity: value })}
                  min={0}
                  max={100}
                  step={5}
                />
              </div>

              {/* Blur Toggle */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Background Blur</label>
                <Switch
                  checked={settings.blurEnabled}
                  onCheckedChange={(checked) => updateSettings({ blurEnabled: checked })}
                />
              </div>

              {/* Blur Intensity */}
              {settings.blurEnabled && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Blur Intensity</label>
                    <span className="text-sm text-muted-foreground">{settings.blurIntensity}px</span>
                  </div>
                  <Slider
                    value={[settings.blurIntensity]}
                    onValueChange={([value]) => updateSettings({ blurIntensity: value })}
                    min={0}
                    max={40}
                    step={2}
                  />
                </div>
              )}

              {/* Apply to all pages */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Apply to all pages</label>
                <Switch
                  checked={settings.applyToAllPages}
                  onCheckedChange={(checked) => updateSettings({ applyToAllPages: checked })}
                />
              </div>

              {/* Preset Gallery */}
              <PresetGallery />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
