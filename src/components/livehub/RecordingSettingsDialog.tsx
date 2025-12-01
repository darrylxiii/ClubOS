import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Video, Settings } from 'lucide-react';
import { RecordingQuality, RecordingFormat } from '@/hooks/useRecordingWithEffects';

interface RecordingSettingsProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onStartRecording: (settings: RecordingSettings) => void;
}

export interface RecordingSettings {
    quality: RecordingQuality;
    format: RecordingFormat;
    audioBitrate: number;
    videoBitrate?: number;
    includeSystemAudio: boolean;
}

const QUALITY_OPTIONS: { value: RecordingQuality; label: string; description: string }[] = [
    { value: '1080p', label: '1080p (Full HD)', description: '1920×1080 • ~5 Mbps' },
    { value: '720p', label: '720p (HD)', description: '1280×720 • ~2.5 Mbps' },
    { value: '480p', label: '480p (SD)', description: '854×480 • ~1 Mbps' },
    { value: '360p', label: '360p (Low)', description: '640×360 • ~600 Kbps' },
];

const AUDIO_BITRATE_OPTIONS = [
    { value: 64, label: '64 Kbps (Low)' },
    { value: 128, label: '128 Kbps (Standard)' },
    { value: 192, label: '192 Kbps (High)' },
    { value: 320, label: '320 Kbps (Very High)' },
];

export const RecordingSettingsDialog = ({ open, onOpenChange, onStartRecording }: RecordingSettingsProps) => {
    const [settings, setSettings] = useState<RecordingSettings>({
        quality: '720p',
        format: 'webm',
        audioBitrate: 128,
        includeSystemAudio: false
    });

    const handleStartRecording = () => {
        onStartRecording(settings);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Recording Settings
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Video Quality */}
                    <div className="space-y-2">
                        <Label>Video Quality</Label>
                        <Select
                            value={settings.quality}
                            onValueChange={(value: RecordingQuality) =>
                                setSettings({ ...settings, quality: value })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {QUALITY_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        <div className="flex flex-col items-start">
                                            <span className="font-medium">{option.label}</span>
                                            <span className="text-xs text-muted-foreground">{option.description}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Higher quality requires more storage space
                        </p>
                    </div>

                    {/* Format */}
                    <div className="space-y-2">
                        <Label>Format</Label>
                        <Select
                            value={settings.format}
                            onValueChange={(value: RecordingFormat) =>
                                setSettings({ ...settings, format: value })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="webm">
                                    <div className="flex flex-col items-start">
                                        <span className="font-medium">WebM</span>
                                        <span className="text-xs text-muted-foreground">Best compatibility</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="mp4">
                                    <div className="flex flex-col items-start">
                                        <span className="font-medium">MP4</span>
                                        <span className="text-xs text-muted-foreground">Universal format</span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Audio Bitrate */}
                    <div className="space-y-2">
                        <Label>Audio Quality</Label>
                        <Select
                            value={settings.audioBitrate.toString()}
                            onValueChange={(value) =>
                                setSettings({ ...settings, audioBitrate: parseInt(value) })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {AUDIO_BITRATE_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value.toString()}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* System Audio Toggle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <Label>Include System Audio</Label>
                            <p className="text-xs text-muted-foreground">
                                Record audio from other participants
                            </p>
                        </div>
                        <Switch
                            checked={settings.includeSystemAudio}
                            onCheckedChange={(checked) =>
                                setSettings({ ...settings, includeSystemAudio: checked })
                            }
                        />
                    </div>

                    {/* Info Box */}
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                        <div className="flex items-start gap-2">
                            <Video className="w-4 h-4 mt-0.5 text-muted-foreground" />
                            <div className="space-y-1">
                                <p className="text-sm font-medium">Recording Info</p>
                                <ul className="text-xs text-muted-foreground space-y-1">
                                    <li>• Virtual backgrounds will be included</li>
                                    <li>• Recording saves locally to your device</li>
                                    <li>• Estimated file size: ~{estimateFileSize(settings.quality)} MB/min</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                        Cancel
                    </Button>
                    <Button onClick={handleStartRecording} className="flex-1">
                        Start Recording
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

function estimateFileSize(quality: RecordingQuality): number {
    const sizes = {
        '1080p': 37.5,
        '720p': 18.75,
        '480p': 7.5,
        '360p': 4.5
    };
    return sizes[quality];
}
