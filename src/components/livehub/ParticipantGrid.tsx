import { useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mic, MicOff, Volume2 } from 'lucide-react';

interface Participant {
  id: string;
  user_id: string;
  is_muted: boolean;
  is_speaking: boolean;
  is_video_on: boolean;
  stream?: MediaStream;
  user?: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface ParticipantGridProps {
  participants: Participant[];
  channelType: 'voice' | 'video' | 'stage';
  currentUserId?: string;
  currentUserSpeaking?: boolean;
  localStream?: MediaStream | null;
}

const ParticipantGrid = ({ participants, channelType, currentUserId, currentUserSpeaking, localStream }: ParticipantGridProps) => {
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  useEffect(() => {
    // Attach local stream to current user's video element if video is on
    if (localStream && currentUserId) {
      const currentUserParticipant = participants.find(p => p.user_id === currentUserId);
      if (!currentUserParticipant) return;
      
      const videoEl = videoRefs.current.get(currentUserParticipant.id);
      if (videoEl && localStream.getVideoTracks().length > 0) {
        console.log('[Video] Attaching local stream to video element', {
          participantId: currentUserParticipant.id,
          hasVideoTracks: localStream.getVideoTracks().length > 0,
          videoTrackEnabled: localStream.getVideoTracks()[0]?.enabled
        });
        videoEl.srcObject = localStream;
        videoEl.play().catch(err => console.error('Error playing local video:', err));
      }
    }
  }, [localStream, currentUserId, participants]);

  const setVideoRef = (participantId: string, el: HTMLVideoElement | null) => {
    if (el) {
      videoRefs.current.set(participantId, el);
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
            className={`relative aspect-video rounded-lg bg-card flex items-center justify-center transition-all duration-300 ${
              isSpeaking 
                ? 'ring-4 ring-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)]' 
                : 'border-2 border-border'
            }`}
          >
            {/* Video element for video channels */}
            {participant.is_video_on && channelType === 'video' ? (
              <video
                ref={(el) => setVideoRef(participant.id, el)}
                className="w-full h-full object-cover rounded-lg"
                autoPlay
                playsInline
                muted={isCurrentUser} // Mute own video to prevent echo
              />
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
