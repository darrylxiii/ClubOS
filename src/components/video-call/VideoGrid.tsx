import { useMemo } from 'react';
import { ParticipantTile } from './ParticipantTile';
import { RemoteAudioRenderer } from '@/components/meetings/RemoteAudioRenderer';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
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
  const allParticipants = useMemo(() =>
    localParticipant ? [localParticipant, ...participants] : participants,
    [localParticipant, participants]
  );

  // Filter out invisible participants (silent observers)
  const visibleParticipants = useMemo(() => allParticipants.filter(p => {
    return true; // Show all for now
  }), [allParticipants]);

  const focusedParticipant = useMemo(() => visibleParticipants.find(p => p.id === focusedParticipantId), [visibleParticipants, focusedParticipantId]);
  const screenSharingParticipant = useMemo(() => visibleParticipants.find(p => p.is_screen_sharing), [visibleParticipants]);

  // Find active speaker (most recent speaking participant)
  const activeSpeaker = useMemo(() => visibleParticipants.find(p => p.is_speaking), [visibleParticipants]);

  // Intelligent Sorting: Active Speaker Priority
  // We prioritize the active speaker to the top-left (first position)
  // But we keep the local participant separate if necessary, or let them float
  const sortedParticipants = useMemo(() => [...visibleParticipants].sort((a, b) => {
    // If we have a focused participant (pinned), they take absolute priority
    if (focusedParticipantId) {
      if (a.id === focusedParticipantId) return -1;
      if (b.id === focusedParticipantId) return 1;
    }

    // Otherwise, active speaker takes priority (unless it's the local user, typically we don't swap self to main)
    if (activeSpeaker && a.id === activeSpeaker.id && a.id !== localParticipant?.id) return -1;
    if (activeSpeaker && b.id === activeSpeaker.id && b.id !== localParticipant?.id) return 1;

    return 0;
  }), [visibleParticipants, focusedParticipantId, activeSpeaker, localParticipant]);

  // If someone is screen sharing, switch to spotlight layout
  const effectiveLayout = screenSharingParticipant ? 'spotlight' : layout;

  // Intelligent grid layout based on participant count
  const gridCols = useMemo(() => {
    const count = visibleParticipants.length;
    if (count <= 1) return 1;
    if (count <= 2) return 2;
    if (count <= 4) return 2; // 2x2
    if (count <= 6) return 3; // 2x3 or 3x2
    if (count <= 9) return 3; // 3x3
    return 4; // 4x4+
  }, [visibleParticipants.length]);

  if (effectiveLayout === 'spotlight') {
    // Determine who to spotlight:
    // 1. Screen sharer (highest priority)
    // 2. Explicitly focused participant
    // 3. Active speaker
    // 4. First remote participant
    // 5. First participant (fallback)
    const mainParticipant =
      screenSharingParticipant ||
      focusedParticipant ||
      activeSpeaker ||
      visibleParticipants.find(p => p.id !== localParticipant?.id) ||
      visibleParticipants[0];

    if (mainParticipant) {
      const sidebarParticipants = visibleParticipants.filter(p => p.id !== mainParticipant.id);

      return (
        <div className="flex gap-6 h-full p-6">
          {/* Main spotlight area - cinematic presentation */}
          <motion.div
            layoutId={`participant-${mainParticipant.id}`}
            className="flex-1 min-w-0 flex items-center justify-center relative group"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={meetingAnimations.smooth}
          >
            <div className="w-full h-full max-h-full aspect-video relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
              {/* Glow effect for active speaker in spotlight */}
              {mainParticipant.is_speaking && (
                <div className="absolute inset-0 rounded-2xl ring-2 ring-primary/50 shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)] z-10 pointer-events-none transition-all duration-300" />
              )}

              <ParticipantTile
                participant={mainParticipant}
                isLocal={mainParticipant.id === localParticipant?.id}
                isFocused
                className="h-full w-full object-cover"
                hideScreenShare={mainParticipant.is_screen_sharing && mainParticipant.id === localParticipant?.id}
              />
            </div>
          </motion.div>

          {/* Sidebar with elegant participant strip */}
          {sidebarParticipants.length > 0 && (
            <motion.div
              className="w-80 flex flex-col gap-4 overflow-y-auto py-1 pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent mask-image-bottom"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={meetingAnimations.smooth}
            >
              {sidebarParticipants.map((participant, index) => (
                <motion.div
                  key={participant.id}
                  layoutId={`participant-${participant.id}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: index * 0.05,
                    ...meetingAnimations.smooth
                  }}
                  className={cn(
                    "relative rounded-xl overflow-hidden shadow-lg transition-transform hover:scale-105 duration-300",
                    participant.is_speaking && "ring-2 ring-primary/50"
                  )}
                >
                  <ParticipantTile
                    participant={participant}
                    isLocal={participant.id === localParticipant?.id}
                    className="aspect-video w-full"
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      );
    }
  }

  // Grid layout with intelligent spacing and centering
  const isSingleParticipant = visibleParticipants.length === 1;
  const isTwoParticipants = visibleParticipants.length === 2;

  return (
    <div className="h-full w-full p-4 md:p-8 flex items-center justify-center">
      <div
        className={cn(
          "grid gap-4 md:gap-6 w-full h-full transition-all duration-500 ease-in-out",
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
          maxHeight: isSingleParticipant ? '80vh' : '100%',
        }}
      >
        <AnimatePresence mode="popLayout">
          {sortedParticipants.map((participant) => {
            const activeSpeaker = visibleParticipants.find(p => p.is_speaking); // Re-find here to be safe
            const isActiveSpeaker = activeSpeaker?.id === participant.id;

            return (
              <motion.div
                layoutId={`participant-${participant.id}`}
                key={participant.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                }}
                exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                transition={{
                  type: "spring", stiffness: 350, damping: 25, mass: 1
                }}
                className={cn(
                  "relative rounded-2xl overflow-hidden",
                  isSingleParticipant && "w-full aspect-video shadow-2xl",
                  isActiveSpeaker && !isSingleParticipant && "ring-2 ring-primary/50 shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)] z-10"
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
        </AnimatePresence>
      </div>

      {/* Render audio separately for all remote participants */}
      {allParticipants
        .filter(p => p.stream && p.id !== localParticipant?.id)
        .map(p => (
          <RemoteAudioRenderer
            key={`audio-${p.id}`}
            stream={p.stream!}
            participantId={p.id}
            participantName={p.display_name}
          />
        ))
      }
    </div>
  );
}