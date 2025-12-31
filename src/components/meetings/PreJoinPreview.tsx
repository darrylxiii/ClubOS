import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic, MicOff, Video, VideoOff, Settings2, Volume2, Wifi, WifiOff, Loader2, Check, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { AudioLevelIndicator } from '@/components/shared/AudioLevelIndicator';

interface PreJoinPreviewProps {
  meetingTitle: string;
  participantName: string;
  onJoin: (audioEnabled: boolean, videoEnabled: boolean) => void;
  onCancel: () => void;
}

interface DeviceInfo {
  deviceId: string;
  label: string;
}

type NetworkQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';

export function PreJoinPreview({
  meetingTitle,
  participantName,
  onJoin,
  onCancel
}: PreJoinPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  
  // Device lists
  const [audioInputs, setAudioInputs] = useState<DeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<DeviceInfo[]>([]);
  const [audioOutputs, setAudioOutputs] = useState<DeviceInfo[]>([]);
  
  // Selected devices
  const [selectedAudioInput, setSelectedAudioInput] = useState<string>('');
  const [selectedVideoInput, setSelectedVideoInput] = useState<string>('');
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>('');
  
  // Network quality
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>('unknown');
  const [isTestingNetwork, setIsTestingNetwork] = useState(false);
  
  // Settings panel
  const [showSettings, setShowSettings] = useState(false);

  // Enumerate available devices
  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const audio = devices
        .filter(d => d.kind === 'audioinput')
        .map(d => ({ deviceId: d.deviceId, label: d.label || `Microphone ${d.deviceId.slice(0, 5)}` }));
      
      const video = devices
        .filter(d => d.kind === 'videoinput')
        .map(d => ({ deviceId: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 5)}` }));
      
      const output = devices
        .filter(d => d.kind === 'audiooutput')
        .map(d => ({ deviceId: d.deviceId, label: d.label || `Speaker ${d.deviceId.slice(0, 5)}` }));
      
      setAudioInputs(audio);
      setVideoInputs(video);
      setAudioOutputs(output);
      
      // Set defaults
      if (audio.length && !selectedAudioInput) setSelectedAudioInput(audio[0].deviceId);
      if (video.length && !selectedVideoInput) setSelectedVideoInput(video[0].deviceId);
      if (output.length && !selectedAudioOutput) setSelectedAudioOutput(output[0].deviceId);
    } catch (error) {
      console.error('[PreJoin] Failed to enumerate devices:', error);
    }
  }, [selectedAudioInput, selectedVideoInput, selectedAudioOutput]);

  // Initialize media stream
  const initializeMedia = useCallback(async () => {
    setIsLoading(true);
    setPermissionError(null);
    
    // Stop existing stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    
    try {
      const constraints: MediaStreamConstraints = {
        audio: selectedAudioInput 
          ? { deviceId: { exact: selectedAudioInput } }
          : true,
        video: selectedVideoInput
          ? { deviceId: { exact: selectedVideoInput }, width: 1280, height: 720 }
          : { width: 1280, height: 720 }
      };
      
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      
      // Update device lists after permission granted
      await enumerateDevices();
    } catch (error: any) {
      console.error('[PreJoin] Media initialization failed:', error);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionError('Camera and microphone access was denied. Please allow access in your browser settings.');
      } else if (error.name === 'NotFoundError') {
        setPermissionError('No camera or microphone found. Please connect a device and try again.');
      } else if (error.name === 'NotReadableError') {
        setPermissionError('Camera or microphone is being used by another application.');
      } else {
        setPermissionError(`Failed to access media: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedAudioInput, selectedVideoInput, enumerateDevices, stream]);

  // Test network quality
  const testNetworkQuality = useCallback(async () => {
    setIsTestingNetwork(true);
    
    try {
      // Use Navigation Timing API to estimate network speed
      const connection = (navigator as any).connection;
      
      if (connection) {
        const effectiveType = connection.effectiveType;
        const downlink = connection.downlink;
        
        if (effectiveType === '4g' && downlink >= 5) {
          setNetworkQuality('excellent');
        } else if (effectiveType === '4g' || (effectiveType === '3g' && downlink >= 1.5)) {
          setNetworkQuality('good');
        } else if (effectiveType === '3g') {
          setNetworkQuality('fair');
        } else {
          setNetworkQuality('poor');
        }
      } else {
        // Fallback: measure time to load a small resource
        const start = performance.now();
        await fetch('/favicon.ico', { cache: 'no-store' }).catch(() => {});
        const latency = performance.now() - start;
        
        if (latency < 50) setNetworkQuality('excellent');
        else if (latency < 150) setNetworkQuality('good');
        else if (latency < 300) setNetworkQuality('fair');
        else setNetworkQuality('poor');
      }
    } catch (error) {
      setNetworkQuality('unknown');
    } finally {
      setIsTestingNetwork(false);
    }
  }, []);

  // Initial setup
  useEffect(() => {
    initializeMedia();
    testNetworkQuality();
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Re-initialize when device selection changes
  useEffect(() => {
    if (!isLoading && (selectedAudioInput || selectedVideoInput)) {
      initializeMedia();
    }
  }, [selectedAudioInput, selectedVideoInput]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !isAudioEnabled;
      });
    }
    setIsAudioEnabled(!isAudioEnabled);
  }, [stream, isAudioEnabled]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = !isVideoEnabled;
      });
    }
    setIsVideoEnabled(!isVideoEnabled);
  }, [stream, isVideoEnabled]);

  // Handle join
  const handleJoin = useCallback(() => {
    // Stop preview stream (will be recreated in meeting)
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    onJoin(isAudioEnabled, isVideoEnabled);
  }, [stream, isAudioEnabled, isVideoEnabled, onJoin]);

  const getNetworkQualityColor = (quality: NetworkQuality): string => {
    switch (quality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-green-400';
      case 'fair': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const getNetworkQualityLabel = (quality: NetworkQuality): string => {
    switch (quality) {
      case 'excellent': return 'Excellent';
      case 'good': return 'Good';
      case 'fair': return 'Fair';
      case 'poor': return 'Poor';
      default: return 'Testing...';
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{meetingTitle}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Joining as <span className="font-medium">{participantName}</span>
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Video Preview */}
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : permissionError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                <p className="text-sm text-muted-foreground">{permissionError}</p>
                <Button variant="outline" className="mt-4" onClick={initializeMedia}>
                  Try Again
                </Button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
                />
                {!isVideoEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-3xl font-bold text-primary">
                        {participantName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
            
            {/* Network quality badge */}
            <div className="absolute top-3 right-3">
              <Badge variant="secondary" className="gap-1.5">
                {isTestingNetwork ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : networkQuality === 'poor' ? (
                  <WifiOff className={`h-3 w-3 ${getNetworkQualityColor(networkQuality)}`} />
                ) : (
                  <Wifi className={`h-3 w-3 ${getNetworkQualityColor(networkQuality)}`} />
                )}
                <span className={getNetworkQualityColor(networkQuality)}>
                  {getNetworkQualityLabel(networkQuality)}
                </span>
              </Badge>
            </div>
            
            {/* Audio level indicator */}
            {stream && isAudioEnabled && (
              <div className="absolute bottom-3 left-3">
                <AudioLevelIndicator level={0.5} isSpeaking={true} variant="bars" size="sm" />
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-4">
            <Button
              variant={isAudioEnabled ? 'default' : 'outline'}
              size="lg"
              className={`gap-2 ${!isAudioEnabled ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}`}
              onClick={toggleAudio}
              disabled={isLoading || !!permissionError}
            >
              {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              {isAudioEnabled ? 'Mute' : 'Unmute'}
            </Button>
            
            <Button
              variant={isVideoEnabled ? 'default' : 'outline'}
              size="lg"
              className={`gap-2 ${!isVideoEnabled ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}`}
              onClick={toggleVideo}
              disabled={isLoading || !!permissionError}
            >
              {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              {isVideoEnabled ? 'Stop Video' : 'Start Video'}
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              className="gap-2"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings2 className="h-5 w-5" />
              Settings
            </Button>
          </div>

          {/* Settings panel */}
          {showSettings && (
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              <h4 className="font-medium">Device Settings</h4>
              
              {/* Microphone */}
              <div className="space-y-2">
                <Label>Microphone</Label>
                <Select value={selectedAudioInput} onValueChange={setSelectedAudioInput}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select microphone" />
                  </SelectTrigger>
                  <SelectContent>
                    {audioInputs.map(device => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Camera */}
              <div className="space-y-2">
                <Label>Camera</Label>
                <Select value={selectedVideoInput} onValueChange={setSelectedVideoInput}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select camera" />
                  </SelectTrigger>
                  <SelectContent>
                    {videoInputs.map(device => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Speaker */}
              {audioOutputs.length > 0 && (
                <div className="space-y-2">
                  <Label>Speaker</Label>
                  <Select value={selectedAudioOutput} onValueChange={setSelectedAudioOutput}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select speaker" />
                    </SelectTrigger>
                    <SelectContent>
                      {audioOutputs.map(device => (
                        <SelectItem key={device.deviceId} value={device.deviceId}>
                          {device.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-4">
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              className="flex-1" 
              onClick={handleJoin}
              disabled={isLoading || !!permissionError}
            >
              <Check className="h-4 w-4 mr-2" />
              Join Meeting
            </Button>
          </div>
          
          {/* Network warning */}
          {networkQuality === 'poor' && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>Your network connection is unstable. You may experience quality issues.</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
