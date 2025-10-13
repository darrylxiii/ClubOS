import { useState, useRef, useEffect } from 'react';
import { X, Minimize2, Maximize2, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useVideoPlayer } from '@/contexts/VideoPlayerContext';
import { getYouTubeEmbedUrl } from '@/lib/youtubeUtils';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export function FloatingVideoPlayer() {
  const { videoState, closeFloatingPlayer, isFloatingPlayerOpen } = useVideoPlayer();
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [currentTime, setCurrentTime] = useState(0);
  const playerRef = useRef<HTMLDivElement>(null);
  const youtubePlayerRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Load YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Initialize YouTube player when video changes
  useEffect(() => {
    if (!isFloatingPlayerOpen || !videoState.videoId || isMinimized) return;

    const initPlayer = () => {
      if (window.YT && window.YT.Player && iframeRef.current) {
        youtubePlayerRef.current = new window.YT.Player(iframeRef.current, {
          events: {
            onReady: (event: any) => {
              // Seek to saved time if we have one
              if (currentTime > 0) {
                event.target.seekTo(currentTime, true);
              }
            },
          },
        });
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (youtubePlayerRef.current) {
        youtubePlayerRef.current.destroy();
        youtubePlayerRef.current = null;
      }
    };
  }, [videoState.videoId, isFloatingPlayerOpen, isMinimized]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (playerRef.current) {
      const rect = playerRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  };

  const handleMinimize = async () => {
    // Save current playback time before minimizing
    if (youtubePlayerRef.current && !isMinimized) {
      try {
        const time = await youtubePlayerRef.current.getCurrentTime();
        setCurrentTime(time);
      } catch (error) {
        console.error('Error getting current time:', error);
      }
    }
    setIsMinimized(!isMinimized);
  };

  const handleClose = () => {
    setCurrentTime(0);
    closeFloatingPlayer();
  };

  if (!isFloatingPlayerOpen || !videoState.videoId) {
    return null;
  }

  const embedUrl = `${getYouTubeEmbedUrl(videoState.videoId)}?enablejsapi=1&start=${Math.floor(currentTime)}`;

  return (
    <Card
      ref={playerRef}
      className={cn(
        "fixed z-50 shadow-2xl overflow-hidden transition-all duration-300",
        isDragging && "cursor-grabbing",
        isMinimized ? "w-80" : "w-96"
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-2 bg-background/95 backdrop-blur border-b cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Move className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-medium truncate">
            {videoState.title || 'YouTube Video'}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleMinimize}
            title={isMinimized ? "Maximize" : "Minimize"}
          >
            {isMinimized ? (
              <Maximize2 className="w-4 h-4" />
            ) : (
              <Minimize2 className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleClose}
            title="Close"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Video Player */}
      {!isMinimized && (
        <div className="relative w-full aspect-video bg-black">
          <iframe
            ref={iframeRef}
            width="100%"
            height="100%"
            src={`${embedUrl}&autoplay=1&rel=0`}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      )}
    </Card>
  );
}
