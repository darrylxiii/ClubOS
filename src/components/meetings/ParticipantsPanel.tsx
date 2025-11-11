import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserPlus, Search, MoreVertical, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Participant {
  id: string;
  display_name: string;
  role: 'host' | 'participant';
  is_muted: boolean;
  is_video_off: boolean;
  avatar_url?: string;
}

interface ParticipantsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participants: Participant[];
  isHost: boolean;
  onMuteParticipant?: (participantId: string) => void;
  onRemoveParticipant?: (participantId: string) => void;
}

export function ParticipantsPanel({
  open,
  onOpenChange,
  participants,
  isHost,
  onMuteParticipant,
  onRemoveParticipant,
}: ParticipantsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredParticipants = participants.filter((p) =>
    p.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] p-0 z-[10200]">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Participants</SheetTitle>
        </SheetHeader>

        <div className="p-4 space-y-4">
          {/* Add People Button */}
          <Button variant="outline" className="w-full justify-start gap-2">
            <UserPlus className="h-4 w-4" />
            Add people
          </Button>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for people"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Participants List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-medium text-muted-foreground">In the meeting</h3>
              <Badge variant="secondary" className="rounded-full">
                {participants.length}
              </Badge>
            </div>

            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="space-y-1">
                {filteredParticipants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={participant.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(participant.display_name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{participant.display_name}</span>
                        {participant.role === 'host' && (
                          <Badge variant="default" className="text-xs">
                            Host
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {participant.is_muted ? (
                          <MicOff className="h-3 w-3" />
                        ) : (
                          <Mic className="h-3 w-3" />
                        )}
                        {participant.is_video_off ? (
                          <VideoOff className="h-3 w-3" />
                        ) : (
                          <Video className="h-3 w-3" />
                        )}
                      </div>
                    </div>

                    {isHost && participant.role !== 'host' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => onMuteParticipant?.(participant.id)}
                          >
                            {participant.is_muted ? 'Unmute' : 'Mute'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onRemoveParticipant?.(participant.id)}
                            className="text-destructive"
                          >
                            Remove from call
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
