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
  const [backgroundBlur, setBackgroundBlur] = useState(false);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [echoCancellation, setEchoCancellation] = useState(true);

  return (
    <div className="absolute right-0 top-0 bottom-0 w-96 glass-card border-l border-border/20 flex flex-col z-[10001]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/20">
        <h3 className="font-semibold text-lg">Settings</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Settings Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Video Settings */}
          <div className="space-y-4">
            <h4 className="font-semibold">Video Settings</h4>
            
            <div className="space-y-2">
              <Label>Camera</Label>
              <Select defaultValue="default">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default Camera</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Video Quality</Label>
              <Select defaultValue="hd">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sd">Standard (480p)</SelectItem>
                  <SelectItem value="hd">HD (720p)</SelectItem>
                  <SelectItem value="fhd">Full HD (1080p)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>Background Blur</Label>
              <Switch checked={backgroundBlur} onCheckedChange={setBackgroundBlur} />
            </div>
          </div>

          <Separator />

          {/* Audio Settings */}
          <div className="space-y-4">
            <h4 className="font-semibold">Audio Settings</h4>
            
            <div className="space-y-2">
              <Label>Microphone</Label>
              <Select defaultValue="default">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default Microphone</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Speaker</Label>
              <Select defaultValue="default">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default Speaker</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>Noise Suppression</Label>
              <Switch checked={noiseSuppression} onCheckedChange={setNoiseSuppression} />
            </div>

            <div className="flex items-center justify-between">
              <Label>Echo Cancellation</Label>
              <Switch checked={echoCancellation} onCheckedChange={setEchoCancellation} />
            </div>
          </div>

          <Separator />

          {/* Advanced Settings */}
          <div className="space-y-4">
            <h4 className="font-semibold">Advanced</h4>
            
            <div className="space-y-2">
              <Label>Layout</Label>
              <Select defaultValue="grid">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grid">Grid View</SelectItem>
                  <SelectItem value="spotlight">Spotlight View</SelectItem>
                  <SelectItem value="sidebar">Sidebar View</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}