import { useRef, useEffect } from 'react';
import { Monitor, X, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ScreenShareSpotlightProps {
  userId: string;
  userName: string;
  userAvatar?: string | null;
  stream: MediaStream;
  isLocal?: boolean;
  onStop?: () => void;
}

const ScreenShareSpotlight = ({ 
  userId, 
  userName, 
  userAvatar, 
  stream, 
  isLocal = false,
  onStop 
}: ScreenShareSpotlightProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      // Find the screen share video track
      const screenTrack = stream.getVideoTracks().find(track => 
        track.label.includes('screen') || track.label.includes('window')
      );
      
      if (screenTrack) {
        const screenStream = new MediaStream([screenTrack]);
        videoRef.current.srcObject = screenStream;
        videoRef.current.play().catch(err => {
          console.error('Error playing screen share:', err);
        });
        
        console.log('[ScreenShare] Attached screen share stream', {
          userId,
          trackLabel: screenTrack.label,
          trackId: screenTrack.id
        });
      }
    }
  }, [stream, userId]);

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden group">
      {/* Screen Share Video */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        autoPlay
        playsInline
      />

      {/* Overlay Controls */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2">
            <Monitor className="w-4 h-4 text-primary" />
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={userAvatar || undefined} />
                <AvatarFallback className="text-xs">
                  {userName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">is sharing their screen</p>
              </div>
            </div>
          </div>

          {isLocal && onStop && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onStop}
              className="bg-red-500/90 hover:bg-red-500 text-white gap-2"
            >
              <X className="w-4 h-4" />
              Stop Sharing
            </Button>
          )}
        </div>

        {/* Bottom Bar - Quality Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center justify-between">
            <div className="bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2">
              <p className="text-xs text-muted-foreground">
                Screen Share • HD Quality
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Screen Share Indicator (always visible) */}
      <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2 shadow-lg">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
        LIVE
      </div>
    </div>
  );
};

export default ScreenShareSpotlight;
