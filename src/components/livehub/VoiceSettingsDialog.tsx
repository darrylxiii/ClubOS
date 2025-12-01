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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Image as ImageIcon, Ban, Aperture } from 'lucide-react';
import { BackgroundImagePicker } from './BackgroundImagePicker';

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
  virtualBackground: {
    type: 'none' | 'blur' | 'image';
    imageUrl?: string;
    blurRadius?: number;
  };
}

const DEFAULT_SETTINGS: VoiceSettings = {
  inputDevice: 'default',
  outputDevice: 'default',
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  inputVolume: 100,
  outputVolume: 100,
  virtualBackground: {
    type: 'none',
    blurRadius: 10
  }
};

export function VoiceSettingsDialog({ open, onOpenChange }: VoiceSettingsDialogProps) {
  const [settings, setSettings] = useState<VoiceSettings>(DEFAULT_SETTINGS);
  const [devices, setDevices] = useState<{ input: MediaDeviceInfo[]; output: MediaDeviceInfo[] }>({
    input: [],
    output: [],
  });
  const [activeTab, setActiveTab] = useState('audio');

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
      setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
    }
  };

  const saveSettings = () => {
    localStorage.setItem('livehub_voice_settings', JSON.stringify(settings));
    onOpenChange(false);
    // Dispatch event to notify listeners
    window.dispatchEvent(new Event('voice-settings-changed'));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Voice & Video Settings</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="audio">Audio</TabsTrigger>
            <TabsTrigger value="video">Video & Background</TabsTrigger>
          </TabsList>

          <TabsContent value="audio" className="space-y-6 mt-4">
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
          </TabsContent>

          <TabsContent value="video" className="space-y-6 mt-4">
            <div className="space-y-4">
              <Label>Virtual Background</Label>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => setSettings({
                    ...settings,
                    virtualBackground: { type: 'none' }
                  })}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${settings.virtualBackground.type === 'none'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                    }`}
                >
                  <Ban className="w-8 h-8" />
                  <span className="text-sm font-medium">None</span>
                </button>

                <button
                  onClick={() => setSettings({
                    ...settings,
                    virtualBackground: { type: 'blur', blurRadius: 10 }
                  })}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${settings.virtualBackground.type === 'blur'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                    }`}
                >
                  <Aperture className="w-8 h-8" />
                  <span className="text-sm font-medium">Blur</span>
                </button>

                <button
                  onClick={() => setSettings({
                    ...settings,
                    virtualBackground: { type: 'image', imageUrl: settings.virtualBackground.imageUrl || '' }
                  })}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${settings.virtualBackground.type === 'image'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                    }`}
                >
                  <ImageIcon className="w-8 h-8" />
                  <span className="text-sm font-medium">Image</span>
                </button>
              </div>

              {/* Custom Image Backgrounds */}
              {settings.virtualBackground.type === 'image' && (
                <Separator className="my-4" />
              )}
              {settings.virtualBackground.type === 'image' && (
                <BackgroundImagePicker
                  selectedImageUrl={settings.virtualBackground.imageUrl}
                  onSelect={(imageUrl) => setSettings({
                    ...settings,
                    virtualBackground: { type: 'image', imageUrl }
                  })}
                />
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6">
          <Button onClick={saveSettings} className="w-full">
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
