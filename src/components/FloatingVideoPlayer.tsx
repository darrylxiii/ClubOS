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
      e.preventDefault();
      
      // Use requestAnimationFrame for smoother updates
      requestAnimationFrame(() => {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleMouseLeave = () => {
      // Stop dragging if mouse leaves the window
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);
    
    // Also stop dragging on any pointer cancel events
    document.addEventListener('pointercancel', handleMouseUp);
    document.addEventListener('pointerup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('pointercancel', handleMouseUp);
      document.removeEventListener('pointerup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only allow dragging from the header, not from buttons
    const target = e.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    if (playerRef.current) {
      const rect = playerRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
      
      // Prevent text selection during drag
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
    }
  };

  // Clean up user-select when dragging stops and ensure drag state is reset
  useEffect(() => {
    if (!isDragging) {
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      document.body.style.cursor = '';
    } else {
      document.body.style.cursor = 'grabbing';
    }
    
    // Safety cleanup on unmount
    return () => {
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging]);

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
        "fixed z-50 shadow-2xl overflow-hidden transition-all duration-200",
        isDragging && "cursor-grabbing shadow-glow",
        isMinimized ? "w-80" : "w-96"
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        willChange: isDragging ? 'transform' : 'auto',
        pointerEvents: 'auto',
      }}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between p-2 bg-background/95 backdrop-blur border-b transition-colors select-none",
          isDragging ? "cursor-grabbing bg-accent/10" : "cursor-grab hover:bg-accent/5"
        )}
        onMouseDown={handleMouseDown}
        onDragStart={(e) => e.preventDefault()}
      >
        <div 
          className="flex items-center gap-2 flex-1 min-w-0"
          style={{ 
            userSelect: 'none',
            WebkitUserSelect: 'none',
            pointerEvents: 'none'
          }}
        >
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
