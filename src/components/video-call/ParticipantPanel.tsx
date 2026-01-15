import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { X, Mic, MicOff, VideoOff, Crown, Hand } from 'lucide-react';

interface Participant {
  id: string;
  display_name: string;
  role: string;
  is_muted: boolean;
  is_video_off: boolean;
  is_hand_raised: boolean;
}

interface ParticipantPanelProps {
  participants: Participant[];
  onClose: () => void;
}

export function ParticipantPanel({ participants, onClose }: ParticipantPanelProps) {
  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 glass-card border-l border-border/20 flex flex-col z-[10001]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/20">
        <div>
          <h3 className="font-semibold text-lg">Participants</h3>
          <p className="text-sm text-muted-foreground">{participants.length} in call</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close participants panel">
          <X className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>

      {/* Participant List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {participants.map((participant) => (
            <div
              key={participant.id}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Avatar>
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {participant.display_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{participant.display_name}</span>
                  {participant.role === 'host' && <Crown className="h-4 w-4 text-yellow-500" />}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-xs">
                    {participant.role}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {participant.is_hand_raised && (
                  <Hand className="h-4 w-4 text-yellow-500" />
                )}
                {participant.is_muted ? (
                  <MicOff className="h-4 w-4 text-red-500" />
                ) : (
                  <Mic className="h-4 w-4 text-green-500" />
                )}
                {participant.is_video_off && (
                  <VideoOff className="h-4 w-4 text-red-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}