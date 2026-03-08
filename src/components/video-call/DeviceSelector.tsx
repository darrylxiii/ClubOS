import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Video, Mic, Volume2, RefreshCw, Gauge } from 'lucide-react';

export type BandwidthPreset = 'hd' | 'standard' | 'low';

interface DeviceSelectorProps {
  onDeviceChange?: (type: 'video' | 'audio' | 'speaker', deviceId: string) => void;
  bandwidthPreset?: BandwidthPreset;
  onBandwidthPresetChange?: (preset: BandwidthPreset) => void;
  noiseSuppression?: boolean;
  onNoiseSuppressionChange?: (enabled: boolean) => void;
}

export function DeviceSelector({
  onDeviceChange,
  bandwidthPreset = 'standard',
  onBandwidthPresetChange,
  noiseSuppression = true,
  onNoiseSuppressionChange,
}: DeviceSelectorProps) {
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [speakerDevices, setSpeakerDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<string>('');
  const [selectedAudio, setSelectedAudio] = useState<string>('');
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('');

  const loadDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const videos = devices.filter(d => d.kind === 'videoinput');
      const audios = devices.filter(d => d.kind === 'audioinput');
      const speakers = devices.filter(d => d.kind === 'audiooutput');
      
      setVideoDevices(videos);
      setAudioDevices(audios);
      setSpeakerDevices(speakers);
      
      if (videos.length > 0 && !selectedVideo) setSelectedVideo(videos[0].deviceId);
      if (audios.length > 0 && !selectedAudio) setSelectedAudio(audios[0].deviceId);
      if (speakers.length > 0 && !selectedSpeaker) setSelectedSpeaker(speakers[0].deviceId);
    } catch (error) {
      console.error('[DeviceSelector] Failed to enumerate devices:', error);
    }
  };

  useEffect(() => {
    loadDevices();
    navigator.mediaDevices.addEventListener('devicechange', loadDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', loadDevices);
  }, []);

  const BANDWIDTH_OPTIONS: { value: BandwidthPreset; label: string; description: string }[] = [
    { value: 'hd', label: 'HD (720p)', description: '1280×720, best quality' },
    { value: 'standard', label: 'Standard (480p)', description: '640×480, balanced' },
    { value: 'low', label: 'Low (240p)', description: '320×240, saves bandwidth' },
  ];

  return (
    <Card className="p-6 space-y-6 backdrop-blur-xl bg-black/60 border-white/10">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Video className="h-5 w-5" /> Camera
          </h3>
          <Button size="sm" variant="ghost" onClick={loadDevices}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-2">
          <Label>Select Camera</Label>
          <Select value={selectedVideo} onValueChange={(value) => {
            setSelectedVideo(value);
            onDeviceChange?.('video', value);
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Choose camera" />
            </SelectTrigger>
            <SelectContent>
              {videoDevices.map(device => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${videoDevices.indexOf(device) + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Mic className="h-5 w-5" /> Microphone
        </h3>
        
        <div className="space-y-2">
          <Label>Select Microphone</Label>
          <Select value={selectedAudio} onValueChange={(value) => {
            setSelectedAudio(value);
            onDeviceChange?.('audio', value);
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Choose microphone" />
            </SelectTrigger>
            <SelectContent>
              {audioDevices.map(device => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label || `Microphone ${audioDevices.indexOf(device) + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Noise Suppression Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm">Noise Suppression</Label>
            <p className="text-xs text-muted-foreground">Reduce background noise</p>
          </div>
          <Switch
            checked={noiseSuppression}
            onCheckedChange={(checked) => onNoiseSuppressionChange?.(checked)}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Volume2 className="h-5 w-5" /> Speaker
        </h3>
        
        <div className="space-y-2">
          <Label>Select Speaker</Label>
          <Select value={selectedSpeaker} onValueChange={(value) => {
            setSelectedSpeaker(value);
            onDeviceChange?.('speaker', value);
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Choose speaker" />
            </SelectTrigger>
            <SelectContent>
              {speakerDevices.map(device => (
                <SelectItem key={device.deviceId} value={device.deviceId}>
                  {device.label || `Speaker ${speakerDevices.indexOf(device) + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bandwidth Quality Preset */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Gauge className="h-5 w-5" /> Video Quality
        </h3>
        <div className="space-y-2">
          <Label>Bandwidth Preset</Label>
          <Select value={bandwidthPreset} onValueChange={(value) => onBandwidthPresetChange?.(value as BandwidthPreset)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BANDWIDTH_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex flex-col">
                    <span>{opt.label}</span>
                    <span className="text-xs text-muted-foreground">{opt.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
}
