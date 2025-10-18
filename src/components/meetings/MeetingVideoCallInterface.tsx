import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useMeetingWebRTC } from '@/hooks/useMeetingWebRTC';
import { ControlsPanel } from '@/components/video-call/ControlsPanel';
import { VideoGrid } from '@/components/video-call/VideoGrid';
import { PreCallDiagnostics } from '@/components/video-call/PreCallDiagnostics';
import { OnScreenReactions } from '@/components/video-call/OnScreenReactions';
import { Video } from 'lucide-react';

interface MeetingVideoCallInterfaceProps {
  meeting: any;
  participantId: string;
  participantName: string;
  isGuest: boolean;
  onEnd: () => void;
}

export function MeetingVideoCallInterface({
  meeting,
  participantId,
  participantName,
  isGuest,
  onEnd
}: MeetingVideoCallInterfaceProps) {
  const [showDiagnostics, setShowDiagnostics] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, { stream: MediaStream; name: string }>>(new Map());
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [reactions, setReactions] = useState<Array<{ id: string; emoji: string; name: string }>>([]);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const {
    localStream,
    isVideoEnabled,
    isAudioEnabled,
    connectionState,
    participants,
    screenStream,
    initializeMedia,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    sendReaction,
    cleanup
  } = useMeetingWebRTC({
    meetingId: meeting.id,
    participantId,
    participantName,
    onRemoteStream: (remoteParticipantId, stream) => {
      console.log('[Meeting] Remote stream received from:', remoteParticipantId);
      setRemoteStreams(prev => new Map(prev).set(remoteParticipantId, {
        stream,
        name: `Participant ${remoteParticipantId.slice(0, 6)}`
      }));
    },
    onParticipantLeft: (remoteParticipantId) => {
      console.log('[Meeting] Participant left:', remoteParticipantId);
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        newMap.delete(remoteParticipantId);
        return newMap;
      });
    }
  });

  const handleDiagnosticsComplete = async () => {
    setShowDiagnostics(false);
    
    try {
      console.log('[Meeting] Initializing media for meeting:', meeting.title);
      await initializeMedia();
      toast.success('Joined meeting room');
    } catch (error: any) {
      console.error('[Meeting] Failed to initialize media:', error);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
        toast.error('Camera/microphone access denied');
      } else {
        toast.warning('Joined without camera/microphone');
      }
    }
  };

  const handleRetry = () => {
    setPermissionDenied(false);
    setShowDiagnostics(true);
  };

  const handleEndCall = () => {
    cleanup();
    onEnd();
  };

  const handleToggleScreenShare = async () => {
    const sharing = await toggleScreenShare();
    setIsScreenSharing(sharing);
    toast(sharing ? 'Screen sharing started' : 'Screen sharing stopped');
  };

  // Update video ref when stream changes
  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoEnabled]);

  // Subscribe to reactions
  useEffect(() => {
    if (!meeting?.id) return;

    const channel = supabase
      .channel(`meeting-reactions-${meeting.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webrtc_signals',
          filter: `meeting_id=eq.${meeting.id}`
        },
        (payload: any) => {
          const signal = payload.new;
          if (signal.signal_type === 'reaction') {
            const reactionData = signal.signal_data;
            const newReaction = {
              id: signal.id,
              emoji: reactionData.emoji,
              name: reactionData.participantName
            };
            
            setReactions(prev => [...prev, newReaction]);
            
            // Show toast
            toast(`${reactionData.participantName} reacted with ${reactionData.emoji}`, {
              duration: 2000
            });
            
            // Remove after animation
            setTimeout(() => {
              setReactions(prev => prev.filter(r => r.id !== newReaction.id));
            }, 3000);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [meeting?.id]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  // Show diagnostics first
  if (showDiagnostics) {
    return (
      <PreCallDiagnostics
        onComplete={handleDiagnosticsComplete}
        onCancel={onEnd}
      />
    );
  }

  // Permission denied screen
  if (permissionDenied) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
        <div className="max-w-md w-full p-8 text-center space-y-6 glass-card mx-4">
          <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
            <Video className="h-10 w-10 text-destructive" />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2">Camera/Microphone Access Required</h3>
            <p className="text-muted-foreground mb-4">
              Please enable camera and microphone permissions in your browser.
            </p>
            <div className="text-sm text-muted-foreground space-y-2 text-left bg-muted/50 rounded-lg p-4">
              <p className="font-semibold">How to enable:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Click the camera icon in your browser's address bar</li>
                <li>Select "Allow" for camera and microphone</li>
                <li>Click "Try Again" below</li>
              </ol>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleEndCall} variant="outline" className="flex-1">
              Leave Meeting
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
  const allParticipants = [
    {
      id: 'local',
      display_name: participantName + (isGuest ? ' (Guest)' : ''),
      role: meeting.host_id === participantId ? 'host' : 'participant',
      is_muted: !isAudioEnabled,
      is_video_off: !isVideoEnabled,
      is_screen_sharing: isScreenSharing,
      is_hand_raised: isHandRaised,
      is_speaking: false,
      stream: (isScreenSharing ? screenStream : localStream) || undefined
    },
    ...Array.from(remoteStreams.entries()).map(([id, { stream, name }]) => ({
      id,
      display_name: name,
      role: 'participant',
      is_muted: false,
      is_video_off: false,
      is_screen_sharing: false,
      is_hand_raised: false,
      is_speaking: false,
      stream
    }))
  ];

  const content = (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-gray-900 to-black w-screen h-screen"
         style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      
      {/* Meeting Info Header */}
      <div className="absolute top-4 left-4 z-[10000] space-y-2">
        <div className="backdrop-blur-2xl bg-black/40 border border-white/10 px-4 py-2 rounded-lg shadow-xl">
          <h3 className="font-semibold text-white">{meeting.title}</h3>
          <p className="text-xs text-gray-400">{meeting.meeting_code}</p>
        </div>
        
        <Badge 
          variant={connectionState === 'connected' ? 'default' : 'secondary'}
          className="backdrop-blur-2xl bg-black/40 border border-white/10 shadow-lg"
        >
          {connectionState === 'connected' ? '🟢' : '🟡'} {connectionState}
        </Badge>
      </div>

      {/* Participant Count */}
      <div className="absolute top-4 right-4 z-[10000]">
        <div className="backdrop-blur-2xl bg-black/40 border border-white/10 px-4 py-2 rounded-lg text-sm text-white shadow-xl">
          {allParticipants.length} participant{allParticipants.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Video Grid */}
      <VideoGrid
        participants={allParticipants.slice(1)} // Remote participants
        localParticipant={allParticipants[0]} // Local participant
        focusedParticipantId={undefined}
        layout="grid"
      />
      
      {/* Waiting Room Overlay */}
      {allParticipants.length === 1 && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm">
          <div className="text-center space-y-6 animate-fade-in max-w-md mx-4">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Video className="h-12 w-12 text-primary" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white">Waiting for others to join</h3>
              <p className="text-muted-foreground">
                Share the meeting link: <span className="font-mono text-primary">{meeting.meeting_code}</span>
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span>Connected and ready</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* On-Screen Reactions */}
      <OnScreenReactions reactions={reactions.map(r => ({ 
        id: r.id, 
        reaction_type: r.emoji,
        participant_name: r.name 
      }))} />

      {/* Controls Panel */}
      <ControlsPanel
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        isScreenSharing={!!screenStream}
        isRecording={false}
        isHandRaised={isHandRaised}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleRecording={() => toast.info('Recording coming soon')}
        onToggleHandRaise={() => setIsHandRaised(!isHandRaised)}
        onEndCall={handleEndCall}
        onOpenChat={() => toast.info('Chat coming soon')}
        onOpenParticipants={() => toast.info('Participant panel coming soon')}
        onOpenSettings={() => toast.info('Settings coming soon')}
        onReaction={(emoji) => {
          sendReaction(emoji);
        }}
      />
    </div>
  );

  return createPortal(content, document.body);
}
