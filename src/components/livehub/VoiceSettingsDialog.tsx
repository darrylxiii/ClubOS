import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

interface VoiceSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface VoiceSettings {
  inputDevice: string;
  outputDevice: string;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  inputVolume: number;
  outputVolume: number;
}

const DEFAULT_SETTINGS: VoiceSettings = {
  inputDevice: 'default',
  outputDevice: 'default',
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  inputVolume: 100,
  outputVolume: 100,
};

export function VoiceSettingsDialog({ open, onOpenChange }: VoiceSettingsDialogProps) {
  const [settings, setSettings] = useState<VoiceSettings>(DEFAULT_SETTINGS);
  const [devices, setDevices] = useState<{ input: MediaDeviceInfo[]; output: MediaDeviceInfo[] }>({
    input: [],
    output: [],
  });

  useEffect(() => {
    loadDevices();
    loadSettings();
  }, []);

  const loadDevices = async () => {
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      setDevices({
        input: deviceList.filter((d) => d.kind === 'audioinput'),
        output: deviceList.filter((d) => d.kind === 'audiooutput'),
      });
    } catch (error) {
      console.error('Error loading devices:', error);
    }
  };

  const loadSettings = () => {
    const stored = localStorage.getItem('livehub_voice_settings');
    if (stored) {
      setSettings(JSON.parse(stored));
    }
  };

  const saveSettings = () => {
    localStorage.setItem('livehub_voice_settings', JSON.stringify(settings));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Voice & Video Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Input Device */}
          <div className="space-y-2">
            <Label>Microphone</Label>
            <Select
              value={settings.inputDevice}
              onValueChange={(value) =>
                setSettings({ ...settings, inputDevice: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {devices.input.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label || 'Microphone'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Output Device */}
          <div className="space-y-2">
            <Label>Speakers</Label>
            <Select
              value={settings.outputDevice}
              onValueChange={(value) =>
                setSettings({ ...settings, outputDevice: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {devices.output.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label || 'Speakers'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Input Volume */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Input Volume</Label>
              <span className="text-sm text-muted-foreground">
                {settings.inputVolume}%
              </span>
            </div>
            <Slider
              value={[settings.inputVolume]}
              onValueChange={([value]) =>
                setSettings({ ...settings, inputVolume: value })
              }
              max={100}
              step={1}
            />
          </div>

          {/* Output Volume */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Output Volume</Label>
              <span className="text-sm text-muted-foreground">
                {settings.outputVolume}%
              </span>
            </div>
            <Slider
              value={[settings.outputVolume]}
              onValueChange={([value]) =>
                setSettings({ ...settings, outputVolume: value })
              }
              max={100}
              step={1}
            />
          </div>

          <Separator />

          {/* Audio Processing */}
          <div className="space-y-4">
            <Label>Audio Processing</Label>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Echo Cancellation</p>
                <p className="text-xs text-muted-foreground">
                  Reduces echo and feedback
                </p>
              </div>
              <Switch
                checked={settings.echoCancellation}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, echoCancellation: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Noise Suppression</p>
                <p className="text-xs text-muted-foreground">
                  Reduces background noise
                </p>
              </div>
              <Switch
                checked={settings.noiseSuppression}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, noiseSuppression: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Automatic Gain Control</p>
                <p className="text-xs text-muted-foreground">
                  Normalizes volume levels
                </p>
              </div>
              <Switch
                checked={settings.autoGainControl}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, autoGainControl: checked })
                }
              />
            </div>
          </div>

          {/* Save Button */}
          <Button onClick={saveSettings} className="w-full">
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
