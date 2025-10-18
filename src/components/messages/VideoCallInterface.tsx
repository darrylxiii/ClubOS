import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Video, VideoOff, Mic, MicOff, PhoneOff } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface VideoCallInterfaceProps {
  conversationId: string;
  participantName: string;
  participantAvatar?: string;
  onEnd: () => void;
}

export function VideoCallInterface({ conversationId, participantName, participantAvatar, onEnd }: VideoCallInterfaceProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isCalling, setIsCalling] = useState(true);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const callingAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    initializeCall();
    
    // Play calling sound
    if (callingAudioRef.current) {
      callingAudioRef.current.loop = true;
      callingAudioRef.current.play().catch(console.error);
    }

    // Simulate call connection after 3 seconds (replace with actual WebRTC logic)
    const timer = setTimeout(() => {
      setIsCalling(false);
      if (callingAudioRef.current) {
        callingAudioRef.current.pause();
      }
    }, 3000);

    return () => {
      cleanup();
      clearTimeout(timer);
      if (callingAudioRef.current) {
        callingAudioRef.current.pause();
      }
    };
  }, []);

  const initializeCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      toast.success('Camera and microphone access granted');
    } catch (error: any) {
      console.error('Error accessing media devices:', error);
      setPermissionDenied(true);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        toast.error('Camera/microphone access denied. Please allow permissions in your browser.');
      } else if (error.name === 'NotFoundError') {
        toast.error('No camera or microphone found on your device.');
      } else {
        toast.error('Failed to access camera/microphone. Please check your device.');
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
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
    cleanup();
    onEnd();
  };

  const content = permissionDenied ? (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
      <div className="max-w-md w-full p-8 text-center space-y-6 glass-card mx-4">
        <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
          <VideoOff className="h-10 w-10 text-destructive" />
        </div>
        <div>
          <h3 className="text-xl font-bold mb-2">Camera/Microphone Access Required</h3>
          <p className="text-muted-foreground mb-4">
            Please enable camera and microphone permissions in your browser to start a video call.
          </p>
          <p className="text-sm text-muted-foreground">
            Click the camera icon in your browser's address bar to allow access.
          </p>
        </div>
        <Button onClick={handleEndCall} variant="outline" className="w-full">
          Close
        </Button>
      </div>
    </div>
  ) : (
    <div className="fixed inset-0 z-[9999] bg-black w-screen h-screen"
         style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      {/* Remote Video (Full Screen) */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      
      {/* Placeholder when calling/no remote stream */}
      {isCalling && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
          <div className="text-center space-y-6 animate-fade-in">
            {/* Animated calling avatar with pulsing border */}
            <div className="relative inline-block">
              {/* Animated pulsing rings */}
              <div className="absolute inset-0 -m-4 rounded-full bg-primary/20 animate-ping" />
              <div className="absolute inset-0 -m-2 rounded-full bg-primary/30 animate-pulse" />
              
              {/* Avatar with border animation */}
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary via-purple-500 to-primary animate-spin-slow" 
                     style={{ padding: '4px' }}>
                  <div className="w-full h-full rounded-full bg-gray-900" />
                </div>
                <Avatar className="relative w-32 h-32 border-4 border-gray-900">
                  {participantAvatar ? (
                    <AvatarImage src={participantAvatar} alt={participantName} />
                  ) : null}
                  <AvatarFallback className="text-4xl font-bold bg-primary/20 text-primary">
                    {participantName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>

            {/* Calling text */}
            <div className="space-y-2">
              <h3 className="text-3xl font-bold text-white">{participantName}</h3>
              <div className="flex items-center justify-center gap-1">
                <p className="text-xl text-gray-400">Calling</p>
                <span className="animate-[bounce_1s_ease-in-out_infinite]">.</span>
                <span className="animate-[bounce_1s_ease-in-out_0.2s_infinite]">.</span>
                <span className="animate-[bounce_1s_ease-in-out_0.4s_infinite]">.</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Hidden audio element for calling sound */}
      <audio
        ref={callingAudioRef}
        src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
        preload="auto"
      />

      {/* Local Video (Picture-in-Picture) */}
      <div className="absolute top-4 right-4 w-48 h-36 rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            "w-full h-full object-cover",
            !videoEnabled && "hidden"
          )}
        />
        {!videoEnabled && (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <VideoOff className="h-8 w-8 text-white" />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
        <Button
          size="icon"
          variant={videoEnabled ? "default" : "secondary"}
          onClick={toggleVideo}
          className="h-14 w-14 rounded-full shadow-2xl"
        >
          {videoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
        </Button>
        
        <Button
          size="icon"
          variant={audioEnabled ? "default" : "secondary"}
          onClick={toggleAudio}
          className="h-14 w-14 rounded-full shadow-2xl"
        >
          {audioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
        </Button>
        
        <Button
          size="icon"
          variant="ghost"
          onClick={handleEndCall}
          className="h-14 w-14 rounded-full shadow-2xl"
        >
          <PhoneOff className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
