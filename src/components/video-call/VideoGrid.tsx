import { ParticipantTile } from './ParticipantTile';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { meetingAnimations } from '@/config/meeting-design-tokens';

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
    return true; // Show all for now
  });
  
  const focusedParticipant = visibleParticipants.find(p => p.id === focusedParticipantId);
  const screenSharingParticipant = visibleParticipants.find(p => p.is_screen_sharing);
  
  // Find active speaker (most recent speaking participant)
  const activeSpeaker = visibleParticipants.find(p => p.is_speaking);

  // If someone is screen sharing, switch to spotlight layout
  const effectiveLayout = screenSharingParticipant ? 'spotlight' : layout;

  // Intelligent grid layout based on participant count
  const getGridCols = () => {
    const count = visibleParticipants.length;
    if (count <= 1) return 1;
    if (count <= 2) return 2;
    if (count <= 4) return 2; // 2x2
    if (count <= 6) return 3; // 2x3 or 3x2
    if (count <= 9) return 3; // 3x3
    return 4; // 4x4+
  };

  if (effectiveLayout === 'spotlight' && (focusedParticipant || screenSharingParticipant)) {
    const mainParticipant = screenSharingParticipant || focusedParticipant!;
    const sidebarParticipants = visibleParticipants.filter(p => p.id !== mainParticipant.id);

    return (
      <div className="flex gap-8 h-full p-8">
        {/* Main spotlight area - cinematic presentation */}
        <motion.div 
          className="flex-1 min-w-0 flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={meetingAnimations.smooth}
        >
          <div className="w-full max-w-[1400px]">
            <ParticipantTile
              participant={mainParticipant}
              isLocal={mainParticipant.id === localParticipant?.id}
              isFocused
              className="h-full aspect-video"
              hideScreenShare={mainParticipant.is_screen_sharing && mainParticipant.id === localParticipant?.id}
            />
          </div>
        </motion.div>

        {/* Sidebar with elegant participant strip */}
        {sidebarParticipants.length > 0 && (
          <motion.div 
            className="w-80 flex flex-col gap-4 overflow-y-auto py-2 pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={meetingAnimations.smooth}
          >
            {sidebarParticipants.map((participant, index) => (
              <motion.div
                key={participant.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ 
                  delay: index * 0.1,
                  ...meetingAnimations.smooth 
                }}
              >
                <ParticipantTile
                  participant={participant}
                  isLocal={participant.id === localParticipant?.id}
                  className="aspect-video min-h-[200px]"
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    );
  }

  // Grid layout with intelligent spacing and centering
  const isSingleParticipant = visibleParticipants.length === 1;
  const isTwoParticipants = visibleParticipants.length === 2;
  const gridCols = getGridCols();

  return (
    <div className="h-full w-full p-8 flex items-center justify-center">
      <div
        className={cn(
          "grid gap-8 w-full h-full",
          isSingleParticipant && "place-items-center",
          visibleParticipants.length > 1 && "auto-rows-fr"
        )}
        style={{
          gridTemplateColumns: isSingleParticipant 
            ? '1fr' 
            : isTwoParticipants 
            ? 'repeat(2, minmax(0, 1fr))' 
            : `repeat(${gridCols}, minmax(0, 1fr))`,
          maxWidth: isSingleParticipant ? '1200px' : '100%',
        }}
      >
        {visibleParticipants.map((participant, index) => {
          const isActiveSpeaker = activeSpeaker?.id === participant.id;
          
          return (
            <motion.div
              key={participant.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ 
                opacity: 1, 
                scale: isActiveSpeaker ? 1.02 : 1,
              }}
              transition={{ 
                delay: index * 0.1,
                scale: { duration: 0.3 },
                ...meetingAnimations.smooth 
              }}
              className={cn(
                isSingleParticipant && "w-full max-w-[1200px] aspect-video"
              )}
            >
              <ParticipantTile
                participant={participant}
                isLocal={participant.id === localParticipant?.id}
                isFocused={participant.id === focusedParticipantId || isActiveSpeaker}
                className={cn(
                  "h-full w-full",
                  !isSingleParticipant && "aspect-video"
                )}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}