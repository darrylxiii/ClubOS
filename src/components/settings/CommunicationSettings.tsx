import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Video, Mic, Settings2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface CommunicationSettingsData {
  default_camera: string;
  default_microphone: string;
  default_speaker: string;
  background_blur_enabled: boolean;
  noise_suppression_enabled: boolean;
  echo_cancellation_enabled: boolean;
  auto_gain_control: boolean;
  recording_consent_default: boolean;
  virtual_background: string | null;
  video_quality: 'auto' | '720p' | '1080p';
  mirror_video: boolean;
}

export function CommunicationSettings() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [devices, setDevices] = useState<{
    cameras: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
    speakers: MediaDeviceInfo[];
  }>({ cameras: [], microphones: [], speakers: [] });
  
  const [settings, setSettings] = useState<CommunicationSettingsData>({
    default_camera: 'default',
    default_microphone: 'default',
    default_speaker: 'default',
    background_blur_enabled: true,
    noise_suppression_enabled: true,
    echo_cancellation_enabled: true,
    auto_gain_control: true,
    recording_consent_default: true,
    virtual_background: null,
    video_quality: 'auto',
    mirror_video: true,
  });

  useEffect(() => {
    loadDevices();
    loadSettings();
  }, [user]);

  const loadDevices = async () => {
    try {
      // Request permission first to get device labels
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => stream.getTracks().forEach(track => track.stop()));
      
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      
      setDevices({
        cameras: deviceList.filter(d => d.kind === 'videoinput'),
        microphones: deviceList.filter(d => d.kind === 'audioinput'),
        speakers: deviceList.filter(d => d.kind === 'audiooutput'),
      });
    } catch (_error) {
      console.error('Error loading devices:', error);
    }
  };

  const loadSettings = async () => {
    if (!user) return;
    
    try {
      // Use localStorage as fallback since this column may not exist
      const stored = localStorage.getItem(`communication_settings_${user.id}`);
      if (stored) {
        setSettings({ ...settings, ...JSON.parse(stored) });
      }
    } catch (_error) {
      console.error('Error loading communication settings:', error);
    }
  };

  const saveSettings = async () => {
    if (!user) return;
    setSaving(true);
    
    try {
      // Store in localStorage as this column may not exist in DB
      localStorage.setItem(`communication_settings_${user.id}`, JSON.stringify(settings));
      toast.success('Communication settings saved');
    } catch (_error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const testMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: settings.default_microphone }
      });
      
      toast.success('Microphone is working! Speak to test.');
      
      // Stop after 3 seconds
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop());
      }, 3000);
    } catch (_error) {
      toast.error('Could not access microphone');
    }
  };

  const testCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: settings.default_camera }
      });
      
      toast.success('Camera is working!');
      
      // Stop after 3 seconds
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop());
      }, 3000);
    } catch (_error) {
      toast.error('Could not access camera');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Video Settings
          </CardTitle>
          <CardDescription>Configure your camera and video preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Default Camera</Label>
            <div className="flex gap-2">
              <Select
                value={settings.default_camera}
                onValueChange={(value) => setSettings({ ...settings, default_camera: value })}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select camera" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">System Default</SelectItem>
                  {devices.cameras.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${devices.cameras.indexOf(device) + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={testCamera}>Test</Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Video Quality</Label>
            <Select
              value={settings.video_quality}
              onValueChange={(value: 'auto' | '720p' | '1080p') => setSettings({ ...settings, video_quality: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (Recommended)</SelectItem>
                <SelectItem value="720p">720p HD</SelectItem>
                <SelectItem value="1080p">1080p Full HD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Mirror Video</Label>
              <p className="text-xs text-muted-foreground">Mirror your camera preview (doesn't affect what others see)</p>
            </div>
            <Switch
              checked={settings.mirror_video}
              onCheckedChange={(checked) => setSettings({ ...settings, mirror_video: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Background Blur</Label>
              <p className="text-xs text-muted-foreground">Blur your background during video calls</p>
            </div>
            <Switch
              checked={settings.background_blur_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, background_blur_enabled: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Audio Settings
          </CardTitle>
          <CardDescription>Configure your microphone and audio preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Default Microphone</Label>
            <div className="flex gap-2">
              <Select
                value={settings.default_microphone}
                onValueChange={(value) => setSettings({ ...settings, default_microphone: value })}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select microphone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">System Default</SelectItem>
                  {devices.microphones.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label || `Microphone ${devices.microphones.indexOf(device) + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={testMicrophone}>Test</Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Default Speaker</Label>
            <Select
              value={settings.default_speaker}
              onValueChange={(value) => setSettings({ ...settings, default_speaker: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select speaker" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">System Default</SelectItem>
                {devices.speakers.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label || `Speaker ${devices.speakers.indexOf(device) + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Noise Suppression</Label>
              <p className="text-xs text-muted-foreground">Reduce background noise in your audio</p>
            </div>
            <Switch
              checked={settings.noise_suppression_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, noise_suppression_enabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Echo Cancellation</Label>
              <p className="text-xs text-muted-foreground">Prevent audio feedback loops</p>
            </div>
            <Switch
              checked={settings.echo_cancellation_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, echo_cancellation_enabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto Gain Control</Label>
              <p className="text-xs text-muted-foreground">Automatically adjust microphone volume</p>
            </div>
            <Switch
              checked={settings.auto_gain_control}
              onCheckedChange={(checked) => setSettings({ ...settings, auto_gain_control: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Recording & Privacy
          </CardTitle>
          <CardDescription>Control recording permissions and privacy</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-consent to Recording</Label>
              <p className="text-xs text-muted-foreground">Automatically consent when host starts recording</p>
            </div>
            <Switch
              checked={settings.recording_consent_default}
              onCheckedChange={(checked) => setSettings({ ...settings, recording_consent_default: checked })}
            />
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> You will always be notified when a recording starts, 
              regardless of this setting. You can always opt out of being recorded.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
