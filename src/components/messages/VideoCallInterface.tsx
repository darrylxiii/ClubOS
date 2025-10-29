import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useVideoCall } from '@/hooks/useVideoCall';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useBandwidthMonitor } from '@/hooks/useBandwidthMonitor';
import { ControlsPanel } from '@/components/video-call/ControlsPanel';
import { ChatSidebar } from '@/components/video-call/ChatSidebar';
import { ParticipantPanel } from '@/components/video-call/ParticipantPanel';
import { SettingsPanel } from '@/components/video-call/SettingsPanel';
import { ScreenAnnotation } from '@/components/video-call/ScreenAnnotation';
import { OnScreenReactions } from '@/components/video-call/OnScreenReactions';
import { VideoGrid } from '@/components/video-call/VideoGrid';
import { PreCallDiagnostics } from '@/components/video-call/PreCallDiagnostics';

interface VideoCallInterfaceProps {
  conversationId: string;
  participantName: string;
  participantAvatar?: string;
  onEnd: (duration: number, participantCount: number) => void;
  invitationId?: string;
}

export function VideoCallInterface({ conversationId, participantName, participantAvatar, onEnd, invitationId }: VideoCallInterfaceProps) {
  const [showDiagnostics, setShowDiagnostics] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isCalling, setIsCalling] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const callingAudioRef = useRef<HTMLAudioElement>(null);

  // Hooks
  const { session, participants, reactions, isRecording, startSession, updateParticipantState, sendReaction, toggleRecording, endSession } = useVideoCall(conversationId);
  
  const { localStream, isVideoEnabled, isAudioEnabled, initializeMedia, sendOffer, toggleVideo, toggleAudio, startScreenShare, cleanup } = useWebRTC({
    sessionId: session?.id || '',
    userId: 'current-user-id', // Replace with actual user ID
    onRemoteStream: (userId, stream) => {
      setRemoteStreams(prev => new Map(prev).set(userId, stream));
    },
    onParticipantLeft: (userId) => {
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        newMap.delete(userId);
        return newMap;
      });
    }
  });

  const { stats } = useBandwidthMonitor();

  // Diagnostics complete handler
  const handleDiagnosticsComplete = async () => {
    setShowDiagnostics(false);
    setIsCalling(false); // Stop calling animation immediately
    
    try {
      // Start session first - this should always work
      console.log('Starting session...');
      const newSession = await startSession();
      
      if (!newSession) {
        throw new Error('Failed to create session');
      }
      
      console.log('Session started successfully:', newSession.id);
      toast.success('Joined meeting room');
      setCallStartTime(Date.now());

      // Try to initialize media, but don't fail if it doesn't work
      try {
        console.log('Initializing media...');
        await initializeMedia();
        
        if (localVideoRef.current && localStream) {
          localVideoRef.current.srcObject = localStream;
        }
        console.log('Media initialized successfully');
        toast.success('Camera and microphone connected');
      } catch (mediaError: any) {
        console.error('Media initialization failed (non-fatal):', mediaError);
        toast.warning('Joined without camera/microphone. You can try reconnecting from settings.');
      }

    } catch (error: any) {
      console.error('Error initializing call:', error);
      
      if (error.code === '42P17') {
        toast.error('Database error. Retrying...');
        // Auto-retry once for database errors
        setTimeout(() => {
          handleDiagnosticsComplete();
        }, 1000);
        return;
      }
      
      setPermissionDenied(true);
      
      if (error.message?.includes('Failed to create session')) {
        toast.error('Could not connect to meeting room. Please try again.');
      } else {
        toast.error('Failed to join call. Please try again.');
      }
    }
  };

  const handleRetry = () => {
    setPermissionDenied(false);
    setShowDiagnostics(true);
  };
  
  const handleRetryMedia = async () => {
    try {
      await initializeMedia();
      if (localVideoRef.current && localStream) {
        localVideoRef.current.srcObject = localStream;
      }
      toast.success('Camera and microphone reconnected');
    } catch (error: any) {
      console.error('Media retry failed:', error);
      toast.error('Failed to connect media. Please check your permissions.');
    }
  };

  const handleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        // Stop screen sharing
        setIsScreenSharing(false);
        setIsAnnotating(false);
      } else {
        await startScreenShare();
        setIsScreenSharing(true);
        toast.success('Screen sharing started');
      }
    } catch (error) {
      toast.error('Failed to start screen sharing');
    }
  };

  const handleEndCall = async () => {
    await endSession();
    cleanup();
    
    const duration = callStartTime ? Math.floor((Date.now() - callStartTime) / 1000) : 0;
    const participantCount = participants.length + 1; // +1 for local user
    onEnd(duration, participantCount);
  };

  useEffect(() => {
    return () => {
      cleanup();
      callingAudioRef.current?.pause();
    };
  }, []);

  // Show diagnostics first
  if (showDiagnostics) {
    return (
      <PreCallDiagnostics
        onComplete={handleDiagnosticsComplete}
        onCancel={() => onEnd(0, 0)}
      />
    );
  }

  // Permission denied screen
  if (permissionDenied) {
    return createPortal(
    <div className="fixed inset-0 z-[10001] bg-black/90 backdrop-blur-xl flex items-center justify-center"
         style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="max-w-md w-full p-8 text-center space-y-6 glass-card mx-4">
        <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
          <VideoOff className="h-10 w-10 text-destructive" />
        </div>
        <div>
          <h3 className="text-xl font-bold mb-2">Camera/Microphone Access Required</h3>
          <p className="text-muted-foreground mb-4">
            Please enable camera and microphone permissions in your browser to start a video call.
          </p>
          <div className="text-sm text-muted-foreground space-y-2 text-left bg-muted/50 rounded-lg p-4">
            <p className="font-semibold">How to enable permissions:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Click the camera icon in your browser's address bar</li>
              <li>Select "Allow" for both camera and microphone</li>
              <li>Click the "Try Again" button below</li>
            </ol>
          </div>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => onEnd(0, 0)} variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleRetry} className="flex-1">
            Try Again
          </Button>
        </div>
      </div>
    </div>,
    document.body
    );
  }

  // Main call interface
  const content = (
    <div className="fixed inset-0 z-[10001] bg-gradient-to-br from-gray-900 to-black w-screen h-screen"
         style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      
      {/* Connection Quality Badge */}
      <div className="absolute top-4 left-4 z-[10000]">
        <Badge 
          variant={stats.quality === 'excellent' || stats.quality === 'good' ? 'default' : 'destructive'}
          className="glass-card"
        >
          {stats.quality === 'excellent' && '🟢'} 
          {stats.quality === 'good' && '🟡'}
          {stats.quality === 'fair' && '🟠'}
          {stats.quality === 'poor' && '🔴'}
          {' '}{stats.latency}ms
        </Badge>
      </div>

      {/* Video Grid */}
      <VideoGrid
        participants={participants.map(p => ({
          id: p.id,
          display_name: p.display_name,
          role: p.role,
          is_muted: p.is_muted,
          is_video_off: p.is_video_off,
          is_screen_sharing: p.is_screen_sharing,
          is_hand_raised: p.is_hand_raised,
          is_speaking: p.is_speaking,
          stream: remoteStreams.get(p.user_id)
        }))}
        localParticipant={{
          id: 'local',
          display_name: 'You',
          role: 'host',
          is_muted: !isAudioEnabled,
          is_video_off: !isVideoEnabled,
          is_screen_sharing: isScreenSharing,
          is_hand_raised: isHandRaised,
          is_speaking: false,
          stream: localStream || undefined
        }}
        focusedParticipantId={undefined}
        layout="grid"
      />
      
      {/* Waiting Room - when no other participants */}
      {!isCalling && participants.length <= 1 && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm">
          <div className="text-center space-y-6 animate-fade-in max-w-md mx-4">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Video className="h-12 w-12 text-primary" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white">Waiting for others to join</h3>
              <p className="text-muted-foreground">
                Share the meeting link or wait for other participants
              </p>
            </div>

            {/* Show reconnect option if no local stream */}
            {!localStream && (
              <div className="space-y-3 p-4 bg-muted/20 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Your camera and microphone are not connected
                </p>
                <Button onClick={handleRetryMedia} variant="outline" size="sm">
                  <Video className="h-4 w-4 mr-2" />
                  Connect Camera & Mic
                </Button>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span>Connected</span>
              </div>
              <span>•</span>
              <span>{participants.length} participant{participants.length !== 1 ? 's' : ''}</span>
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

      {/* Screen Annotation Toolbar */}
      {isScreenSharing && !isAnnotating && (
        <div className="absolute top-4 right-4 z-[10000]">
          <Button
            onClick={() => setIsAnnotating(true)}
            className="glass-card rounded-full"
          >
            <Pencil className="h-5 w-5 mr-2" />
            Annotate
          </Button>
        </div>
      )}

      {/* Annotation Layer */}
      <ScreenAnnotation
        isAnnotating={isAnnotating}
        onClose={() => setIsAnnotating(false)}
      />

      {/* On-Screen Reactions */}
      <OnScreenReactions reactions={reactions} />

      {/* Side Panels */}
      {showChat && (
        <ChatSidebar
          conversationId={conversationId}
          onClose={() => setShowChat(false)}
        />
      )}

      {showParticipants && (
        <ParticipantPanel
          participants={participants}
          onClose={() => setShowParticipants(false)}
        />
      )}

      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Controls Panel */}
      <ControlsPanel
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        isScreenSharing={isScreenSharing}
        isRecording={isRecording}
        isHandRaised={isHandRaised}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={handleScreenShare}
        onToggleRecording={toggleRecording}
        onToggleHandRaise={() => setIsHandRaised(!isHandRaised)}
        onEndCall={handleEndCall}
        onOpenChat={() => setShowChat(!showChat)}
        onOpenParticipants={() => setShowParticipants(!showParticipants)}
        onOpenSettings={() => setShowSettings(!showSettings)}
        onReaction={(emoji) => sendReaction(emoji)}
      />
    </div>
  );

  return createPortal(content, document.body);
}
