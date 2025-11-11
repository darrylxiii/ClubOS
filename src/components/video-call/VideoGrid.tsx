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
  const focusedParticipant = allParticipants.find(p => p.id === focusedParticipantId);
  const screenSharingParticipant = allParticipants.find(p => p.is_screen_sharing);

  // If someone is screen sharing, switch to spotlight layout
  const effectiveLayout = screenSharingParticipant ? 'spotlight' : layout;

  // Calculate grid layout
  const getGridCols = () => {
    const count = allParticipants.length;
    if (count <= 1) return 1;
    if (count <= 4) return 2;
    if (count <= 9) return 3;
    if (count <= 16) return 4;
    return 5;
  };

  if (effectiveLayout === 'spotlight' && (focusedParticipant || screenSharingParticipant)) {
    const mainParticipant = screenSharingParticipant || focusedParticipant!;
    const sidebarParticipants = allParticipants.filter(p => p.id !== mainParticipant.id);

    return (
      <div className="flex gap-4 h-full">
        {/* Main spotlight area - screen share takes full width */}
        <div className="flex-1 min-w-0">
          <ParticipantTile
            participant={mainParticipant}
            isLocal={mainParticipant.id === localParticipant?.id}
            isFocused
            className="h-full"
            hideScreenShare={mainParticipant.is_screen_sharing && mainParticipant.id === localParticipant?.id}
          />
        </div>

        {/* Sidebar with ALL other participants including original presenter */}
        {sidebarParticipants.length > 0 && (
          <div className="w-72 flex flex-col gap-3 overflow-y-auto py-2">
            {sidebarParticipants.map(participant => (
              <ParticipantTile
                key={participant.id}
                participant={participant}
                isLocal={participant.id === localParticipant?.id}
                className="aspect-video min-h-[180px]"
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Grid layout
  return (
    <div
      className={cn(
        "grid gap-4 h-full w-full p-4",
        allParticipants.length === 1 && "grid-cols-1",
        allParticipants.length > 1 && `grid-cols-${getGridCols()}`,
        "auto-rows-fr"
      )}
      style={{
        gridTemplateColumns: `repeat(${getGridCols()}, 1fr)`
      }}
    >
      {allParticipants.map(participant => (
        <ParticipantTile
          key={participant.id}
          participant={participant}
          isLocal={participant.id === localParticipant?.id}
          isFocused={participant.id === focusedParticipantId}
        />
      ))}
    </div>
  );
}