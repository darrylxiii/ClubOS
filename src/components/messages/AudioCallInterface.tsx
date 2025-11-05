import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, PhoneOff } from 'lucide-react';
import { toast } from 'sonner';

interface AudioCallInterfaceProps {
  conversationId: string;
  participantName: string;
  onEnd: (duration: number) => void;
  invitationId?: string;
  onCancel?: () => void;
}

export function AudioCallInterface({
  conversationId,
  participantName,
  onEnd,
  invitationId,
  onCancel
}: AudioCallInterfaceProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  useEffect(() => {
    initializeCall();
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => {
      cleanup();
      clearInterval(timer);
    };
  }, []);

  const initializeCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      setLocalStream(stream);
      toast.success('Microphone access granted');
    } catch (error: any) {
      console.error('Error accessing microphone:', error);
      setPermissionDenied(true);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        toast.error('Microphone access denied. Please allow permissions in your browser.');
      } else if (error.name === 'NotFoundError') {
        toast.error('No microphone found on your device.');
      } else {
        toast.error('Failed to access microphone. Please check your device.');
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
  };

  const handleEndCall = () => {
    // Cancel invitation if this is the caller
    if (invitationId && onCancel) {
      onCancel();
    }
    
    cleanup();
    onEnd(callDuration);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const content = permissionDenied ? (
    <div className="fixed inset-0 z-[10001] bg-black/90 backdrop-blur-xl flex items-center justify-center w-full h-[100dvh]"
         style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="max-w-md w-full p-8 text-center space-y-6 glass-card mx-4">
        <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
          <MicOff className="h-10 w-10 text-destructive" />
        </div>
        <div>
          <h3 className="text-xl font-bold mb-2">Microphone Access Required</h3>
          <p className="text-muted-foreground mb-4">
            Please enable microphone permissions in your browser to start a voice call.
          </p>
          <p className="text-sm text-muted-foreground">
            Click the microphone icon in your browser's address bar to allow access.
          </p>
        </div>
        <Button onClick={handleEndCall} variant="outline" className="w-full">
          Close
        </Button>
      </div>
    </div>
  ) : (
    <div className="fixed inset-0 z-[10001] bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center w-full h-[100dvh]"
         style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="text-center space-y-8 animate-fade-in">
        {/* Avatar */}
        <div className="relative">
          <div className="w-48 h-48 rounded-full bg-gradient-accent flex items-center justify-center mx-auto shadow-glow">
            <span className="text-6xl font-bold text-white">
              {participantName.slice(0, 2).toUpperCase()}
            </span>
          </div>
          {/* Audio waves animation */}
          {audioEnabled && (
            <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-ping" />
          )}
        </div>

        {/* Participant Info */}
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-white">{participantName}</h2>
          <p className="text-xl text-gray-400">{formatDuration(callDuration)}</p>
        </div>

        {/* Controls */}
        <div className="flex gap-6 justify-center pt-8">
          <Button
            size="icon"
            variant={audioEnabled ? "default" : "secondary"}
            onClick={toggleAudio}
            className="h-16 w-16 rounded-full shadow-2xl"
          >
            {audioEnabled ? <Mic className="h-7 w-7" /> : <MicOff className="h-7 w-7" />}
          </Button>
          
          <Button
            size="icon"
            variant="ghost"
            onClick={handleEndCall}
            className="h-16 w-16 rounded-full shadow-2xl"
          >
            <PhoneOff className="h-7 w-7" />
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
