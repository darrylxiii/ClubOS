import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface VoiceChatParticipant {
  id: string;
  name: string;
  avatar: string;
  isSpeaking?: boolean;
}

export interface VoiceChatProps {
  participants: VoiceChatParticipant[];
  channelName?: string;
  onJoin?: () => void;
  onClose?: () => void;
  isConnected?: boolean;
  className?: string;
}

const COLLAPSED_WIDTH = 268;
const EXPANDED_WIDTH = 360;
const EXPANDED_HEIGHT = 420;
const AVATAR_SIZE_COLLAPSED = 44;
const AVATAR_SIZE_EXPANDED = 56;
const AVATAR_OVERLAP = -12;

function SpeakingIndicator({ show }: { show: boolean }) {
  return (
    <div
      className={cn(
        "absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center transition-all duration-300",
        show ? "opacity-100 scale-100" : "opacity-0 scale-0"
      )}
    >
      <div className="flex gap-0.5 items-end h-2">
        <div className="w-0.5 bg-white rounded-full animate-wave-1" style={{ height: 6 }} />
        <div className="w-0.5 bg-white rounded-full animate-wave-2" style={{ height: 6 }} />
        <div className="w-0.5 bg-white rounded-full animate-wave-3" style={{ height: 6 }} />
      </div>
    </div>
  );
}

function AudioWaveIcon({ isExpanded }: { isExpanded: boolean }) {
  return (
    <div
      className={cn(
        "absolute flex items-center justify-center rounded-full bg-accent-gold transition-all duration-500",
        isExpanded ? "opacity-0 scale-0" : "opacity-100 scale-100"
      )}
      style={{
        width: 40,
        height: 40,
        left: 10,
        top: 10,
      }}
    >
      <div className="flex gap-0.5 items-end h-4">
        <div className="w-1 bg-eclipse rounded-full animate-wave-1" style={{ height: 8 }} />
        <div className="w-1 bg-eclipse rounded-full animate-wave-2" style={{ height: 12 }} />
        <div className="w-1 bg-eclipse rounded-full animate-wave-3" style={{ height: 8 }} />
      </div>
    </div>
  );
}

function getAvatarPosition(index: number, isExpanded: boolean) {
  if (!isExpanded) {
    const startX = 60;
    return {
      x: startX + index * (AVATAR_SIZE_COLLAPSED + AVATAR_OVERLAP),
      y: 8,
      size: AVATAR_SIZE_COLLAPSED,
      opacity: index < 4 ? 1 : 0,
      scale: 1,
    };
  } else {
    const gridStartX = 28;
    const gridStartY = 70;
    const colWidth = 80;
    const rowHeight = 95;

    const col = index % 4;
    const row = Math.floor(index / 4);

    return {
      x: gridStartX + col * colWidth,
      y: gridStartY + row * rowHeight,
      size: AVATAR_SIZE_EXPANDED,
      opacity: 1,
      scale: 1,
    };
  }
}

export function VoiceChat({
  participants,
  channelName = "Voice Chat",
  onJoin,
  onClose,
  isConnected = false,
  className,
}: VoiceChatProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hiddenCount = Math.max(0, participants.length - 4);

  return (
    <>
      <style>{`
        @keyframes wave {
          0%, 100% { height: 6px; }
          50% { height: 14px; }
        }
        .animate-wave-1 { animation: wave 0.5s ease-in-out infinite; }
        .animate-wave-2 { animation: wave 0.5s ease-in-out infinite 0.1s; }
        .animate-wave-3 { animation: wave 0.5s ease-in-out infinite 0.2s; }
      `}</style>

      <div
        onClick={() => !isExpanded && setIsExpanded(true)}
        className={cn(
          "relative bg-eclipse shadow-xl shadow-black/10 border border-border/30 overflow-hidden",
          "transition-all duration-500",
          !isExpanded && "cursor-pointer hover:shadow-2xl hover:shadow-black/15",
          className
        )}
        style={{
          width: isExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH,
          height: isExpanded ? EXPANDED_HEIGHT : 60,
          borderRadius: isExpanded ? 24 : 999,
          transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Audio Wave Icon */}
        <AudioWaveIcon isExpanded={isExpanded} />

        {/* +N Counter (collapsed only) */}
        {hiddenCount > 0 && (
          <div
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-sm text-muted-foreground transition-all duration-300",
              isExpanded ? "opacity-0" : "opacity-100"
            )}
          >
            +{hiddenCount}
            <ChevronDown className="w-4 h-4" />
          </div>
        )}

        {/* Header (expanded only) */}
        <div
          className={cn(
            "absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-5 transition-all duration-300",
            isExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          <div className="w-8" />
          <h3 className="text-lg font-semibold text-foreground">{channelName}</h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(false);
              onClose?.();
            }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Divider */}
        <div
          className={cn(
            "absolute left-5 right-5 h-px bg-border/50 transition-all duration-300",
            isExpanded ? "opacity-100 top-14" : "opacity-0 top-0"
          )}
        />

        {/* Participants */}
        {participants.map((participant, index) => {
          const pos = getAvatarPosition(index, isExpanded);
          const delay = isExpanded ? index * 30 : (6 - index) * 20;

          return (
            <div
              key={participant.id}
              className="absolute transition-all duration-500"
              style={{
                transform: `translate(${pos.x}px, ${pos.y}px) scale(${pos.scale})`,
                opacity: pos.opacity,
                transitionDelay: `${delay}ms`,
                transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)',
              }}
            >
              <div className="flex flex-col items-center">
                <div
                  className="relative rounded-full overflow-hidden ring-2 ring-background"
                  style={{ width: pos.size, height: pos.size }}
                >
                  <img
                    src={participant.avatar}
                    alt={participant.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <SpeakingIndicator show={participant.isSpeaking || false} />

                {/* Name - only visible when expanded */}
                <span
                  className={cn(
                    "mt-2 text-xs text-muted-foreground text-center w-16 truncate transition-all duration-300",
                    isExpanded ? "opacity-100" : "opacity-0"
                  )}
                >
                  {participant.name}
                </span>
              </div>
            </div>
          );
        })}

        {/* Join Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onJoin?.();
          }}
          className={cn(
            "absolute left-1/2 -translate-x-1/2 px-8 py-3 rounded-full bg-accent-gold text-eclipse font-semibold transition-all duration-300",
            "hover:bg-accent-gold/90 active:scale-95",
            isExpanded ? "opacity-100 bottom-16" : "opacity-0 bottom-0 pointer-events-none"
          )}
        >
          {isConnected ? "Connected" : "Join Now"}
        </button>

        {/* Helper Text */}
        <p
          className={cn(
            "absolute left-0 right-0 bottom-5 text-center text-xs text-muted-foreground transition-all duration-300",
            isExpanded ? "opacity-100" : "opacity-0"
          )}
        >
          Mic will be muted initially.
        </p>
      </div>
    </>
  );
}
