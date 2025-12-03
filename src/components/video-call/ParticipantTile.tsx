import { useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Video, VideoOff, Hand, Monitor, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScreenShareOverlay } from './ScreenShareOverlay';
import { SpeakingBadge } from '@/components/shared/AudioLevelIndicator';

interface ParticipantTileProps {
  participant: {
    id: string;
    display_name: string;
    role: string;
    is_muted: boolean;
    is_video_off: boolean;
    is_screen_sharing: boolean;
    is_hand_raised: boolean;
    is_speaking: boolean;
    stream?: MediaStream;
    audioLevel?: number; // 0-1 normalized audio level
  };
  isLocal?: boolean;
  isFocused?: boolean;
  className?: string;
  hideScreenShare?: boolean;
}

export function ParticipantTile({ participant, isLocal, isFocused, className, hideScreenShare }: ParticipantTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      console.log(`[ParticipantTile] 🎬 Setting stream for ${participant.display_name}`, {
        streamId: participant.stream.id,
        videoOff: participant.is_video_off,
        videoTracks: participant.stream.getVideoTracks().length,
        audioTracks: participant.stream.getAudioTracks().length,
        hasVideoRef: !!videoRef.current
      });
      
      videoRef.current.srcObject = participant.stream;
      
      videoRef.current.onloadedmetadata = () => {
        console.log(`[ParticipantTile] ✅ Video metadata loaded for ${participant.display_name}`);
        setIsLoading(false);
      };
      
      videoRef.current.onloadeddata = () => {
        console.log(`[ParticipantTile] ✅ Video data loaded for ${participant.display_name}`);
      };
      
      videoRef.current.onerror = (e) => {
        console.error(`[ParticipantTile] ❌ Video error for ${participant.display_name}:`, e);
        setIsLoading(false);
      };
    } else {
      console.log(`[ParticipantTile] ⏸️ Not setting stream for ${participant.display_name}`, {
        hasVideoRef: !!videoRef.current,
        hasStream: !!participant.stream
      });
      setIsLoading(false);
    }
  }, [participant.stream, participant.is_video_off, participant.display_name]);

  return (
    <div
      className={cn(
        "relative rounded-2xl overflow-hidden bg-gradient-to-br from-gray-950/90 via-gray-900/80 to-black/90 backdrop-blur-xl",
        "border border-white/10 transition-all duration-500 ease-out group",
        "shadow-[0_8px_32px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.2)]",
        participant.is_speaking && "ring-2 ring-emerald-400/60 shadow-[0_0_32px_rgba(34,197,94,0.3)]",
        isFocused && "ring-2 ring-primary/80 shadow-[0_0_40px_rgba(var(--primary)/0.4)]",
        isHovered && "scale-[1.02] shadow-[0_12px_48px_rgba(0,0,0,0.5)]",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Video/Avatar Display */}
      {participant.stream && !participant.is_video_off ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal}
            className={cn(
              "w-full h-full object-cover",
              participant.is_screen_sharing && "object-contain bg-black"
            )}
          />
          {/* Screen share overlay for presenter to prevent infinite loop */}
          {hideScreenShare && participant.is_screen_sharing && (
            <ScreenShareOverlay participantName={participant.display_name} />
          )}
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900/50 to-black/50">
          <div className="relative">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-2xl">
              <span className="text-5xl font-bold bg-gradient-to-br from-white to-white/70 bg-clip-text text-transparent">
                {participant.display_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="absolute -inset-2 bg-primary/20 rounded-full blur-xl opacity-50" />
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && participant.stream && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary/80" />
            <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border border-primary/40" />
          </div>
        </div>
      )}

      {/* Name & Status Bar - Glassmorphic overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/40 backdrop-blur-2xl border-t border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold text-white tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              {participant.display_name} {isLocal && '(You)'}
            </span>
            {participant.role === 'host' && (
              <Badge 
                variant="secondary" 
                className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium backdrop-blur-sm"
              >
                👑 Host
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {participant.is_screen_sharing && (
              <div className="p-2 bg-primary/90 backdrop-blur-sm rounded-full animate-pulse shadow-lg shadow-primary/50 border border-primary/30">
                <Monitor className="h-4 w-4 text-white" />
              </div>
            )}
            {participant.is_muted ? (
              <div className="p-2 bg-rose-500/90 backdrop-blur-sm rounded-full shadow-lg shadow-rose-500/30 border border-rose-400/20 transition-all duration-200 hover:scale-110">
                <MicOff className="h-4 w-4 text-white" />
              </div>
            ) : (
              <div className="p-2 bg-emerald-500/20 backdrop-blur-sm rounded-full border border-emerald-500/30">
                <Mic className="h-4 w-4 text-emerald-400" />
              </div>
            )}
            {participant.is_video_off && (
              <div className="p-2 bg-rose-500/90 backdrop-blur-sm rounded-full shadow-lg shadow-rose-500/30 border border-rose-400/20 transition-all duration-200 hover:scale-110">
                <VideoOff className="h-4 w-4 text-white" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hand Raised Indicator */}
      {participant.is_hand_raised && (
        <div className="absolute top-4 right-20 animate-bounce">
          <div className="p-2.5 bg-yellow-500/90 backdrop-blur-sm rounded-full shadow-xl shadow-yellow-500/50 border border-yellow-400/30">
            <Hand className="h-5 w-5 text-white" />
          </div>
        </div>
      )}

      {/* Speaking Badge - Enhanced with audio level */}
      {participant.is_speaking && (
        <div className="absolute top-4 left-4">
          <SpeakingBadge 
            isSpeaking={participant.is_speaking} 
            level={participant.audioLevel || 0.5} 
          />
        </div>
      )}

      {/* Connection Quality Indicator - Refined */}
      <div className="absolute top-4 right-4">
        <div className="flex items-center gap-1.5 px-3 py-2 bg-black/50 backdrop-blur-xl rounded-full border border-white/10 shadow-lg">
          <div className="flex items-end gap-0.5">
            {[2.5, 3.5, 5].map((height, i) => (
              <div
                key={i}
                className={cn(
                  "w-1 rounded-full transition-all duration-300",
                  "bg-gradient-to-t from-emerald-500 to-emerald-400 shadow-sm shadow-emerald-500/50"
                )}
                style={{ height: `${height * 4}px` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}