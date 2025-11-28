import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mic, MicOff, Volume2 } from 'lucide-react';

interface Participant {
  id: string;
  user_id: string;
  is_muted: boolean;
  is_speaking: boolean;
  is_video_on: boolean;
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
}

const ParticipantGrid = ({ participants, channelType, currentUserId, currentUserSpeaking }: ParticipantGridProps) => {
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
            {/* Video would go here if enabled */}
            {!participant.is_video_on && (
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
