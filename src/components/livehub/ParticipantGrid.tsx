import { useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mic, MicOff, Volume2, Monitor } from 'lucide-react';

interface Participant {
  id: string;
  user_id: string;
  is_muted: boolean;
  is_speaking: boolean;
  is_video_on: boolean;
  is_screen_sharing: boolean;
  stream?: MediaStream;
  user?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface RemoteStreamBundle {
  camera: MediaStream | null;
  screen: MediaStream | null;
}

interface ParticipantGridProps {
  participants: Participant[];
  channelType: 'voice' | 'video' | 'stage';
  currentUserId?: string;
  currentUserSpeaking?: boolean;
  localStream?: MediaStream | null;
  remoteStreams?: Map<string, RemoteStreamBundle>;
}

const ParticipantGrid = ({
  participants,
  channelType,
  currentUserId,
  currentUserSpeaking,
  localStream,
  remoteStreams
}: ParticipantGridProps) => {
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const attachedStreamsRef = useRef<Set<string>>(new Set());

  // Stable effect - only runs when streams change
  useEffect(() => {
    // Check all video refs and attach stream if needed
    videoRefs.current.forEach((videoEl, participantId) => {
      const participant = participants.find(p => p.id === participantId);
      if (!participant || !participant.is_video_on) return;

      let streamToAttach: MediaStream | null = null;

      if (participant.user_id === currentUserId) {
        streamToAttach = localStream || null;
      } else if (remoteStreams) {
        const streams = remoteStreams.get(participant.user_id);
        streamToAttach = streams?.camera || null;
      }

      if (streamToAttach) {
        // Only attach if not already attached with same stream
        if (videoEl.srcObject !== streamToAttach) {
          console.log('[Video] Attaching stream', { participantId, userId: participant.user_id });
          videoEl.srcObject = streamToAttach;
          videoEl.play().catch(err => console.error('Error playing video:', err));
        }
      }
    });
  }, [localStream, remoteStreams, participants, currentUserId]);

  const setVideoRef = (participantId: string, el: HTMLVideoElement | null) => {
    if (el) {
      videoRefs.current.set(participantId, el);

      // Attach stream immediately on mount
      const participant = participants.find(p => p.id === participantId);
      if (participant && participant.is_video_on) {
        let streamToAttach: MediaStream | null = null;

        if (participant.user_id === currentUserId) {
          streamToAttach = localStream || null;
        } else if (remoteStreams) {
          const streams = remoteStreams.get(participant.user_id);
          streamToAttach = streams?.camera || null;
        }

        if (streamToAttach && el.srcObject !== streamToAttach) {
          console.log('[Video] Attaching stream on mount', { participantId });
          el.srcObject = streamToAttach;
          el.play().catch(err => console.error('Error playing video:', err));
        }
      }
    } else {
      videoRefs.current.delete(participantId);
    }
  };

  const getGridCols = () => {
    const count = participants.length;
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count <= 4) return 'grid-cols-2';
    if (count <= 9) return 'grid-cols-3';
    return 'grid-cols-4';
  };

  return (
    <div className={`grid ${getGridCols()} gap-4 p-4`}>
      {participants.map((participant) => {
        const isCurrentUser = participant.user_id === currentUserId;
        const isSpeaking = isCurrentUser ? currentUserSpeaking : participant.is_speaking;

        return (
          <div
            key={participant.id}
            className={`relative aspect-video rounded-lg bg-card flex items-center justify-center transition-all duration-300 ease-in-out ${isSpeaking
                ? 'ring-4 ring-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)]'
                : 'border-2 border-border ring-0 shadow-none'
              }`}
          >
            {/* Video element for video channels */}
            {participant.is_video_on && channelType === 'video' ? (
              <div className="relative w-full h-full">
                <video
                  ref={(el) => setVideoRef(participant.id, el)}
                  className="w-full h-full object-cover rounded-lg"
                  autoPlay
                  playsInline
                  muted={isCurrentUser} // Mute own video to prevent echo
                />
                {/* Speaking pulse overlay for video */}
                {isSpeaking && (
                  <div className="absolute inset-0 rounded-lg ring-4 ring-green-500 ring-inset animate-pulse pointer-events-none" />
                )}
              </div>
            ) : (
              <Avatar className="h-20 w-20">
                <AvatarImage src={participant.user?.avatar_url || undefined} />
                <AvatarFallback className="text-2xl">
                  {participant.user?.full_name?.substring(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            )}

            {/* Speaking indicator - enhanced */}
            {isSpeaking && (
              <div className="absolute top-2 left-2 z-10">
                <div className="relative">
                  <Volume2 className="w-6 h-6 text-green-500" />
                  <div className="absolute -inset-1 bg-green-500/20 rounded-full animate-ping" />
                  <div className="absolute top-0 right-0">
                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-green-500 text-white rounded-full">
                      SPEAKING
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Name and status */}
            <div className="absolute bottom-2 left-2 right-2 bg-background/90 backdrop-blur-sm rounded px-2 py-1 flex items-center justify-between">
              <span className="text-sm font-medium truncate">
                {participant.user?.full_name || 'Unknown User'}
              </span>
              <div className="flex items-center gap-1">
                {participant.is_screen_sharing && (
                  <Monitor className="w-4 h-4 text-primary" />
                )}
                {participant.is_muted ? (
                  <MicOff className="w-4 h-4 text-destructive" />
                ) : (
                  <Mic className="w-4 h-4 text-primary" />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ParticipantGrid;
