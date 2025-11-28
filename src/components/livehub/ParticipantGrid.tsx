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
}

const ParticipantGrid = ({ participants, channelType }: ParticipantGridProps) => {
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
      {participants.map((participant) => (
        <div
          key={participant.id}
          className={`relative aspect-video rounded-lg bg-card border-2 flex items-center justify-center ${
            participant.is_speaking ? 'border-primary shadow-lg' : 'border-border'
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

          {/* Speaking indicator */}
          {participant.is_speaking && (
            <div className="absolute top-2 left-2">
              <Volume2 className="w-5 h-5 text-primary animate-pulse" />
            </div>
          )}

          {/* Name and status */}
          <div className="absolute bottom-2 left-2 right-2 bg-background/80 backdrop-blur-sm rounded px-2 py-1 flex items-center justify-between">
            <span className="text-sm font-medium truncate">
              {participant.user?.full_name || 'Unknown User'}
            </span>
            {participant.is_muted ? (
              <MicOff className="w-4 h-4 text-destructive" />
            ) : (
              <Mic className="w-4 h-4 text-primary" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ParticipantGrid;
