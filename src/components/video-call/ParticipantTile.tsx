import { useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Video, VideoOff, Hand, Monitor, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScreenShareOverlay } from './ScreenShareOverlay';

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
  };
  isLocal?: boolean;
  isFocused?: boolean;
  className?: string;
  hideScreenShare?: boolean;
}

export function ParticipantTile({ participant, isLocal, isFocused, className, hideScreenShare }: ParticipantTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        "relative rounded-xl overflow-hidden bg-muted shadow-glass-md transition-all duration-300",
        isFocused && "ring-4 ring-primary shadow-glass-lg scale-[1.02]",
        participant.is_speaking && "ring-2 ring-green-500 animate-pulse-subtle",
        className
      )}
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
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
          <Avatar className="w-24 h-24 border-4 border-background/50">
            <AvatarFallback className="text-3xl font-bold">
              {participant.display_name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && participant.stream && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
        </div>
      )}

      {/* Name & Status Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold text-sm drop-shadow-lg">
              {participant.display_name} {isLocal && '(You)'}
            </span>
            {participant.role === 'host' && (
              <Crown className="h-4 w-4 text-yellow-400" />
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {participant.is_screen_sharing && (
              <Monitor className="h-4 w-4 text-blue-400" />
            )}
            {participant.is_muted ? (
              <MicOff className="h-4 w-4 text-red-400" />
            ) : (
              <Mic className="h-4 w-4 text-green-400" />
            )}
            {participant.is_video_off && (
              <VideoOff className="h-4 w-4 text-red-400" />
            )}
          </div>
        </div>
      </div>

      {/* Hand Raised Indicator */}
      {participant.is_hand_raised && (
        <div className="absolute top-3 right-3 animate-bounce">
          <div className="bg-yellow-500 rounded-full p-2 shadow-glow">
            <Hand className="h-5 w-5 text-white" />
          </div>
        </div>
      )}

      {/* Connection Quality Indicator */}
      <div className="absolute top-3 left-3">
        <div className="flex gap-0.5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                "w-1 rounded-full bg-white/30",
                i === 1 && "h-2",
                i === 2 && "h-3",
                i === 3 && "h-4"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}