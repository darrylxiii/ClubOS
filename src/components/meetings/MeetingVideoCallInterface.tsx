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
import { MeetingChatSidebar } from '@/components/video-call/MeetingChatSidebar';
import { DeviceSelector } from '@/components/video-call/DeviceSelector';
import { LiveCaptions } from '@/components/video-call/LiveCaptions';
import { MeetingNotes } from '@/components/video-call/MeetingNotes';
import { TranscriptionPanel } from '@/components/video-call/TranscriptionPanel';
import { HostApprovalPanel } from '@/components/meetings/HostApprovalPanel';
import { HostSettingsPanel } from '@/components/meetings/HostSettingsPanel';
import { ParticipantsPanel } from '@/components/meetings/ParticipantsPanel';
import { MeetingDetailsPanel } from '@/components/meetings/MeetingDetailsPanel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
  const [showChat, setShowChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showTranscription, setShowTranscription] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [showHostSettings, setShowHostSettings] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showMeetingDetails, setShowMeetingDetails] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [hostSettings, setHostSettings] = useState({
    allowScreenShare: true,
    allowReactions: true,
    allowMicControl: true,
    allowVideoControl: true,
    allowChat: true,
    accessType: 'open' as 'open' | 'trusted' | 'restricted',
    requireHostApproval: false,
    allowAddActivities: true,
    allowThirdPartyAudio: true,
  });

  const {
    localStream,
    isVideoEnabled,
    isAudioEnabled,
    connectionState,
    participants,
    screenStream,
    networkQuality,
    bandwidth,
    latency,
    error,
    initializeMedia,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    sendReaction,
    enablePictureInPicture,
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
    if (!hostSettings.allowScreenShare && meeting.host_id !== participantId) {
      toast.error('Screen sharing is disabled by the host');
      return;
    }
    const sharing = await toggleScreenShare();
    setIsScreenSharing(sharing);
    toast(sharing ? 'Screen sharing started' : 'Screen sharing stopped');
  };

  const handleEnablePiP = async () => {
    const success = await enablePictureInPicture();
    if (success) {
      toast.success('Picture-in-Picture enabled');
    } else {
      toast.error('Picture-in-Picture not supported');
    }
  };

  const meetingUrl = `${window.location.origin}/meetings/${meeting.meeting_code}`;

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
      role: (meeting.host_id === participantId ? 'host' : 'participant') as 'host' | 'participant',
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
      role: 'participant' as 'host' | 'participant',
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
        
        <div className="flex gap-2">
          <Badge 
            variant={connectionState === 'connected' ? 'default' : 'secondary'}
            className="backdrop-blur-2xl bg-black/40 border border-white/10 shadow-lg"
          >
            {connectionState === 'connected' ? '🟢' : '🟡'} {connectionState}
          </Badge>
          
          <Badge 
            variant={
              networkQuality === 'excellent' ? 'default' : 
              networkQuality === 'good' ? 'default' : 
              networkQuality === 'fair' ? 'secondary' : 'destructive'
            }
            className="backdrop-blur-2xl bg-black/40 border border-white/10 shadow-lg"
          >
            {networkQuality === 'excellent' ? '📶' : 
             networkQuality === 'good' ? '📶' : 
             networkQuality === 'fair' ? '📉' : '⚠️'} {networkQuality}
          </Badge>
        </div>
        
        {latency > 0 && (
          <div className="text-xs text-gray-400 backdrop-blur-2xl bg-black/40 border border-white/10 px-2 py-1 rounded">
            {latency}ms • {bandwidth.toFixed(1)} Mbps
          </div>
        )}
      </div>

      {/* Error Recovery Banner */}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[10000] max-w-md">
          <div className="backdrop-blur-2xl bg-yellow-500/20 border border-yellow-500/30 px-4 py-3 rounded-lg shadow-xl">
            <div className="flex items-center gap-3">
              <span className="text-yellow-500">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{error.message}</p>
                {error.recoverable && (
                  <p className="text-xs text-gray-300">Attempting to reconnect...</p>
                )}
              </div>
              {error.recoverable && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    cleanup();
                    initializeMedia();
                  }}
                  className="backdrop-blur-sm bg-white/10"
                >
                  Retry
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

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
        onOpenChat={() => setShowChat(true)}
        onOpenParticipants={() => setShowParticipants(true)}
        onOpenSettings={() => setShowSettings(true)}
        onReaction={(emoji) => {
          if (!hostSettings.allowReactions && meeting.host_id !== participantId) {
            toast.error('Reactions are disabled by the host');
            return;
          }
          sendReaction(emoji);
        }}
        onOpenNotes={() => setShowNotes(true)}
        onToggleCaptions={() => setCaptionsEnabled(!captionsEnabled)}
        captionsEnabled={captionsEnabled}
        onOpenHostSettings={meeting.host_id === participantId ? () => setShowHostSettings(true) : undefined}
        onOpenMeetingInfo={() => setShowMeetingDetails(true)}
        onEnablePiP={handleEnablePiP}
      />

      {/* Live Captions */}
      <LiveCaptions enabled={captionsEnabled} localStream={localStream} />

      {/* Host Approval Panel */}
      <HostApprovalPanel 
        meetingId={meeting.id} 
        isHost={meeting.host_id === participantId}
      />

      {/* Chat Sidebar */}
      <Sheet open={showChat} onOpenChange={setShowChat}>
        <SheetContent side="right" className="w-96 p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Meeting Chat</SheetTitle>
          </SheetHeader>
          <MeetingChatSidebar 
            meetingId={meeting.id} 
            participantId={participantId}
            participantName={participantName}
          />
        </SheetContent>
      </Sheet>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Meeting Settings</DialogTitle>
          </DialogHeader>
          <DeviceSelector />
        </DialogContent>
      </Dialog>

      {/* Notes Panel */}
      <Sheet open={showNotes} onOpenChange={setShowNotes}>
        <SheetContent side="right" className="w-[600px] p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Meeting Notes</SheetTitle>
          </SheetHeader>
          <MeetingNotes meetingId={meeting.id} meetingTitle={meeting.title} />
        </SheetContent>
      </Sheet>

      {/* Transcription Panel */}
      <Sheet open={showTranscription} onOpenChange={setShowTranscription}>
        <SheetContent side="right" className="w-96 p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Transcription</SheetTitle>
          </SheetHeader>
          <TranscriptionPanel meetingId={meeting.id} />
        </SheetContent>
      </Sheet>

      {/* Host Settings Panel */}
      {meeting.host_id === participantId && (
        <HostSettingsPanel
          open={showHostSettings}
          onOpenChange={setShowHostSettings}
          meetingId={meeting.id}
          settings={hostSettings}
        />
      )}

      {/* Participants Panel */}
      <ParticipantsPanel
        open={showParticipants}
        onOpenChange={setShowParticipants}
        participants={allParticipants}
        isHost={meeting.host_id === participantId}
      />

      {/* Meeting Details Panel */}
      <MeetingDetailsPanel
        open={showMeetingDetails}
        onOpenChange={setShowMeetingDetails}
        meetingCode={meeting.meeting_code}
        meetingUrl={meetingUrl}
      />
    </div>
  );

  return createPortal(content, document.body);
}
