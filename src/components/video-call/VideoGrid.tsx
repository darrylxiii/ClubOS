import { useMemo, useState } from 'react';
import { ParticipantTile } from './ParticipantTile';
import { RemoteAudioRenderer } from '@/components/meetings/RemoteAudioRenderer';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from '@/lib/motion';
import { meetingAnimations } from '@/config/meeting-design-tokens';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { TileConnectionQuality } from './ParticipantTile';

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
  connectionQuality?: TileConnectionQuality;
}

interface VideoGridProps {
  participants: Participant[];
  localParticipant?: Participant;
  focusedParticipantId?: string;
  layout?: 'grid' | 'spotlight' | 'sidebar';
  presenterId?: string;
  onPinParticipant?: (participantId: string) => void;
}

const PARTICIPANTS_PER_PAGE = 9;

export function VideoGrid({ participants, localParticipant, focusedParticipantId, layout = 'grid', presenterId, onPinParticipant }: VideoGridProps) {
  const [currentPage, setCurrentPage] = useState(0);

  const allParticipants = useMemo(() =>
    localParticipant ? [localParticipant, ...participants] : participants,
    [localParticipant, participants]
  );

  const visibleParticipants = useMemo(() => allParticipants.filter(() => true), [allParticipants]);

  const focusedParticipant = useMemo(() => visibleParticipants.find(p => p.id === focusedParticipantId), [visibleParticipants, focusedParticipantId]);
  const screenSharingParticipant = useMemo(() => visibleParticipants.find(p => p.is_screen_sharing), [visibleParticipants]);
  const activeSpeaker = useMemo(() => visibleParticipants.find(p => p.is_speaking), [visibleParticipants]);

  const sortedParticipants = useMemo(() => [...visibleParticipants].sort((a, b) => {
    if (focusedParticipantId) {
      if (a.id === focusedParticipantId) return -1;
      if (b.id === focusedParticipantId) return 1;
    }
    if (activeSpeaker && a.id === activeSpeaker.id && a.id !== localParticipant?.id) return -1;
    if (activeSpeaker && b.id === activeSpeaker.id && b.id !== localParticipant?.id) return 1;
    return 0;
  }), [visibleParticipants, focusedParticipantId, activeSpeaker, localParticipant]);

  // Pagination
  const totalPages = Math.ceil(sortedParticipants.length / PARTICIPANTS_PER_PAGE);
  const needsPagination = sortedParticipants.length > PARTICIPANTS_PER_PAGE;
  const safeCurrentPage = Math.min(currentPage, Math.max(0, totalPages - 1));
  const paginatedParticipants = needsPagination
    ? sortedParticipants.slice(safeCurrentPage * PARTICIPANTS_PER_PAGE, (safeCurrentPage + 1) * PARTICIPANTS_PER_PAGE)
    : sortedParticipants;

  const effectiveLayout = screenSharingParticipant ? 'spotlight' : layout;

  const gridCols = useMemo(() => {
    const count = paginatedParticipants.length;
    if (count <= 1) return 1;
    if (count <= 2) return 2;
    if (count <= 4) return 2;
    if (count <= 6) return 3;
    if (count <= 9) return 3;
    return 4;
  }, [paginatedParticipants.length]);

  if (effectiveLayout === 'spotlight') {
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
          <motion.div
            layoutId={`participant-${mainParticipant.id}`}
            className="flex-1 min-w-0 flex items-center justify-center relative group"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={meetingAnimations.smooth}
          >
            <div className="w-full h-full max-h-full aspect-video relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
              {mainParticipant.is_speaking && (
                <div className="absolute inset-0 rounded-2xl ring-2 ring-primary/50 shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)] z-10 pointer-events-none transition-all duration-300" />
              )}
              <ParticipantTile
                participant={mainParticipant}
                isLocal={mainParticipant.id === localParticipant?.id}
                isFocused
                className="h-full w-full object-cover"
                hideScreenShare={mainParticipant.is_screen_sharing && mainParticipant.id === localParticipant?.id}
                onPin={onPinParticipant}
              />
            </div>
          </motion.div>

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
                  transition={{ delay: index * 0.05, ...meetingAnimations.smooth }}
                  className={cn(
                    "relative rounded-xl overflow-hidden shadow-lg transition-transform hover:scale-105 duration-300",
                    participant.is_speaking && "ring-2 ring-primary/50"
                  )}
                >
                  <ParticipantTile
                    participant={participant}
                    isLocal={participant.id === localParticipant?.id}
                    className="aspect-video w-full"
                    onPin={onPinParticipant}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      );
    }
  }

  // Grid layout
  const isSingleParticipant = paginatedParticipants.length === 1;
  const isTwoParticipants = paginatedParticipants.length === 2;

  return (
    <div className="h-full w-full p-2 sm:p-4 md:p-8 flex flex-col items-center justify-center relative">
      <div
        className={cn(
          "grid gap-2 sm:gap-4 md:gap-6 w-full flex-1 transition-all duration-500 ease-in-out",
          isSingleParticipant && "place-items-center",
          paginatedParticipants.length > 1 && "auto-rows-fr"
        )}
        style={{
          gridTemplateColumns: isSingleParticipant
            ? '1fr'
            : isTwoParticipants
              ? window.innerWidth < 640
                ? '1fr'
                : 'repeat(2, minmax(0, 1fr))'
              : window.innerWidth < 640
                ? gridCols > 2 ? 'repeat(2, minmax(0, 1fr))' : '1fr'
                : `repeat(${gridCols}, minmax(0, 1fr))`,
          maxWidth: isSingleParticipant ? '1200px' : '100%',
          maxHeight: isSingleParticipant ? '80vh' : '100%',
        }}
      >
        <AnimatePresence mode="popLayout">
          {paginatedParticipants.map((participant) => {
            const isActiveSpeaker = activeSpeaker?.id === participant.id;

            return (
              <motion.div
                layoutId={`participant-${participant.id}`}
                key={participant.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                transition={{ type: "spring", stiffness: 350, damping: 25, mass: 1 }}
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
                  className={cn("h-full w-full", !isSingleParticipant && "aspect-video")}
                  onPin={onPinParticipant}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Pagination Controls */}
      {needsPagination && (
        <div className="flex items-center gap-3 mt-3 z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            disabled={safeCurrentPage === 0}
            className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10 rounded-full"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-white/60 font-medium tabular-nums">
            {safeCurrentPage + 1} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={safeCurrentPage >= totalPages - 1}
            className="h-8 w-8 p-0 text-white/70 hover:text-white hover:bg-white/10 rounded-full"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

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
