import { ParticipantTile } from './ParticipantTile';
import { cn } from '@/lib/utils';

interface Participant {
  id: string;
  display_name: string;
  role: string;
  is_muted: boolean;
  is_video_off: boolean;
  is_screen_sharing: boolean;
  is_hand_raised: boolean;
  is_speaking: boolean;
  stream?: MediaStream;
}

interface VideoGridProps {
  participants: Participant[];
  localParticipant?: Participant;
  focusedParticipantId?: string;
  layout?: 'grid' | 'spotlight' | 'sidebar';
  presenterId?: string;
}

export function VideoGrid({ participants, localParticipant, focusedParticipantId, layout = 'grid', presenterId }: VideoGridProps) {
  const allParticipants = localParticipant ? [localParticipant, ...participants] : participants;
  
  // Filter out invisible participants (silent observers)
  const visibleParticipants = allParticipants.filter(p => {
    // Show all participants to local user, but filter based on visibility for others
    // In a real implementation, you'd check participant metadata for is_visible flag
    return true; // For now, show all
  });
  
  const focusedParticipant = visibleParticipants.find(p => p.id === focusedParticipantId);
  const screenSharingParticipant = visibleParticipants.find(p => p.is_screen_sharing);

  // If someone is screen sharing, switch to spotlight layout
  const effectiveLayout = screenSharingParticipant ? 'spotlight' : layout;

  // Calculate grid layout based on visible participants
  const getGridCols = () => {
    const count = visibleParticipants.length;
    if (count <= 1) return 1;
    if (count <= 4) return 2;
    if (count <= 9) return 3;
    if (count <= 16) return 4;
    return 5;
  };

  if (effectiveLayout === 'spotlight' && (focusedParticipant || screenSharingParticipant)) {
    const mainParticipant = screenSharingParticipant || focusedParticipant!;
    const sidebarParticipants = visibleParticipants.filter(p => p.id !== mainParticipant.id);

    return (
      <div className="flex gap-6 h-full p-6">
        {/* Main spotlight area - cinematic presentation */}
        <div className="flex-1 min-w-0 flex items-center justify-center">
          <div className="w-full max-w-[1400px]">
            <ParticipantTile
              participant={mainParticipant}
              isLocal={mainParticipant.id === localParticipant?.id}
              isFocused
              className="h-full aspect-video animate-in fade-in zoom-in-95 duration-500"
              hideScreenShare={mainParticipant.is_screen_sharing && mainParticipant.id === localParticipant?.id}
            />
          </div>
        </div>

        {/* Sidebar with elegant participant strip */}
        {sidebarParticipants.length > 0 && (
          <div className="w-80 flex flex-col gap-4 overflow-y-auto py-2 pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {sidebarParticipants.map((participant, index) => (
              <div
                key={participant.id}
                className="animate-in slide-in-from-right fade-in duration-500"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <ParticipantTile
                  participant={participant}
                  isLocal={participant.id === localParticipant?.id}
                  className="aspect-video min-h-[200px]"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Grid layout with intelligent spacing and centering
  const isSingleParticipant = visibleParticipants.length === 1;
  const isTwoParticipants = visibleParticipants.length === 2;

  return (
    <div className="h-full w-full p-8 flex items-center justify-center">
      <div
        className={cn(
          "grid gap-6 w-full h-full",
          isSingleParticipant && "place-items-center",
          visibleParticipants.length > 1 && "auto-rows-fr"
        )}
        style={{
          gridTemplateColumns: isSingleParticipant 
            ? '1fr' 
            : isTwoParticipants 
            ? 'repeat(2, minmax(0, 1fr))' 
            : `repeat(${getGridCols()}, minmax(0, 1fr))`,
          maxWidth: isSingleParticipant ? '1200px' : '100%',
        }}
      >
        {visibleParticipants.map((participant, index) => (
          <div
            key={participant.id}
            className={cn(
              "animate-in fade-in zoom-in-95 duration-500",
              isSingleParticipant && "w-full max-w-[1200px] aspect-video"
            )}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <ParticipantTile
              participant={participant}
              isLocal={participant.id === localParticipant?.id}
              isFocused={participant.id === focusedParticipantId}
              className={cn(
                "h-full w-full",
                !isSingleParticipant && "aspect-video"
              )}
            />
          </div>
        ))}
      </div>
    </div>
  );
}