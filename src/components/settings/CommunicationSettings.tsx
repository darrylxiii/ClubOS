import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Video, Mic, Volume2, MonitorSpeaker, ImageIcon, Settings2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  const { t } = useTranslation('common');
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
    } catch (error) {
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
    } catch (error) {
      console.error('Error loading communication settings:', error);
    }
  };

  const saveSettings = async () => {
    if (!user) return;
    setSaving(true);
    
    try {
      // Store in localStorage as this column may not exist in DB
      localStorage.setItem(`communication_settings_${user.id}`, JSON.stringify(settings));
      toast.success(t("communication_settings_saved", "Communication settings saved"));
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(t("failed_to_save_settings", "Failed to save settings"));
    } finally {
      setSaving(false);
    }
  };

  const testMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: settings.default_microphone }
      });
      
      toast.success(t("microphone_is_working_speak", "Microphone is working! Speak to test."));
      
      // Stop after 3 seconds
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop());
      }, 3000);
    } catch (error) {
      toast.error(t("could_not_access_microphone", "Could not access microphone"));
    }
  };

  const testCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: settings.default_camera }
      });
      
      toast.success(t("camera_is_working", "Camera is working!"));
      
      // Stop after 3 seconds
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop());
      }, 3000);
    } catch (error) {
      toast.error(t("could_not_access_camera", "Could not access camera"));
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
          <CardDescription>{t("configure_your_camera_and", "Configure your camera and video preferences")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>{t("default_camera", "Default Camera")}</Label>
            <div className="flex gap-2">
              <Select
                value={settings.default_camera}
                onValueChange={(value) => setSettings({ ...settings, default_camera: value })}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={t("select_camera", "Select camera")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">{t("system_default", "System Default")}</SelectItem>
                  {devices.cameras.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${devices.cameras.indexOf(device) + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={testCamera}>{t("test", "Test")}</Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("video_quality", "Video Quality")}</Label>
            <Select
              value={settings.video_quality}
              onValueChange={(value: 'auto' | '720p' | '1080p') => setSettings({ ...settings, video_quality: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">{t("auto_recommended", "Auto (Recommended)")}</SelectItem>
                <SelectItem value="720p">{t("720p_hd", "720p HD")}</SelectItem>
                <SelectItem value="1080p">{t("1080p_full_hd", "1080p Full HD")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("mirror_video", "Mirror Video")}</Label>
              <p className="text-xs text-muted-foreground">{t("mirror_your_camera_preview", "Mirror your camera preview (doesn't affect what others see)")}</p>
            </div>
            <Switch
              checked={settings.mirror_video}
              onCheckedChange={(checked) => setSettings({ ...settings, mirror_video: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("background_blur", "Background Blur")}</Label>
              <p className="text-xs text-muted-foreground">{t("blur_your_background_during", "Blur your background during video calls")}</p>
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
          <CardDescription>{t("configure_your_microphone_and", "Configure your microphone and audio preferences")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>{t("default_microphone", "Default Microphone")}</Label>
            <div className="flex gap-2">
              <Select
                value={settings.default_microphone}
                onValueChange={(value) => setSettings({ ...settings, default_microphone: value })}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={t("select_microphone", "Select microphone")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">{t("system_default", "System Default")}</SelectItem>
                  {devices.microphones.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label || `Microphone ${devices.microphones.indexOf(device) + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={testMicrophone}>{t("test", "Test")}</Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("default_speaker", "Default Speaker")}</Label>
            <Select
              value={settings.default_speaker}
              onValueChange={(value) => setSettings({ ...settings, default_speaker: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("select_speaker", "Select speaker")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">{t("system_default", "System Default")}</SelectItem>
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
              <Label>{t("noise_suppression", "Noise Suppression")}</Label>
              <p className="text-xs text-muted-foreground">{t("reduce_background_noise_in", "Reduce background noise in your audio")}</p>
            </div>
            <Switch
              checked={settings.noise_suppression_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, noise_suppression_enabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("echo_cancellation", "Echo Cancellation")}</Label>
              <p className="text-xs text-muted-foreground">{t("prevent_audio_feedback_loops", "Prevent audio feedback loops")}</p>
            </div>
            <Switch
              checked={settings.echo_cancellation_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, echo_cancellation_enabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("auto_gain_control", "Auto Gain Control")}</Label>
              <p className="text-xs text-muted-foreground">{t("automatically_adjust_microphone_volume", "Automatically adjust microphone volume")}</p>
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
          <CardDescription>{t("control_recording_permissions_and", "Control recording permissions and privacy")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("autoconsent_to_recording", "Auto-consent to Recording")}</Label>
              <p className="text-xs text-muted-foreground">{t("automatically_consent_when_host", "Automatically consent when host starts recording")}</p>
            </div>
            <Switch
              checked={settings.recording_consent_default}
              onCheckedChange={(checked) => setSettings({ ...settings, recording_consent_default: checked })}
            />
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>{t("note", "Note:")}</strong> You will always be notified when a recording starts, 
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
