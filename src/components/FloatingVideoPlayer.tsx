import { useState, useRef, useEffect } from 'react';
import { X, Minimize2, Maximize2, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useVideoPlayer } from '@/contexts/VideoPlayerContext';
import { getYouTubeEmbedUrl } from '@/lib/youtubeUtils';

type ResizeDirection = 'ne' | 'nw' | 'se' | 'sw' | null;

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export function FloatingVideoPlayer() {
  const { videoState, closeFloatingPlayer, isFloatingPlayerOpen } = useVideoPlayer();
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 100 });
  const [size, setSize] = useState({ width: 384, height: 216 }); // 16:9 aspect ratio
  const [transform, setTransform] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<ResizeDirection>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
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

  // Handle dragging
  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      
      if (isDragging) {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        
        requestAnimationFrame(() => {
          setTransform({ x: deltaX, y: deltaY });
        });
      } else if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        
        requestAnimationFrame(() => {
          let newWidth = resizeStart.width;
          let newHeight = resizeStart.height;
          
          // Min size constraints
          const minWidth = 280;
          const minHeight = 158;
          
          // Max size constraints
          const maxWidth = window.innerWidth * 0.8;
          const maxHeight = window.innerHeight * 0.8;
          
          switch (isResizing) {
            case 'se': // Bottom-right
              newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStart.width + deltaX));
              newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStart.height + deltaY));
              break;
            case 'sw': // Bottom-left
              newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStart.width - deltaX));
              newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStart.height + deltaY));
              if (newWidth !== resizeStart.width) {
                setPosition(prev => ({ ...prev, x: prev.x + deltaX }));
              }
              break;
            case 'ne': // Top-right
              newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStart.width + deltaX));
              newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStart.height - deltaY));
              if (newHeight !== resizeStart.height) {
                setPosition(prev => ({ ...prev, y: prev.y + deltaY }));
              }
              break;
            case 'nw': // Top-left
              newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStart.width - deltaX));
              newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStart.height - deltaY));
              if (newWidth !== resizeStart.width) {
                setPosition(prev => ({ ...prev, x: prev.x + deltaX }));
              }
              if (newHeight !== resizeStart.height) {
                setPosition(prev => ({ ...prev, y: prev.y + deltaY }));
              }
              break;
          }
          
          setSize({ width: newWidth, height: newHeight });
        });
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setPosition(prev => ({
          x: prev.x + transform.x,
          y: prev.y + transform.y,
        }));
        setTransform({ x: 0, y: 0 });
        setIsDragging(false);
      }
      if (isResizing) {
        setIsResizing(null);
      }
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, transform, resizeStart]);

  const handleDragStart = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    
    e.preventDefault();
    setDragStart({ x: e.clientX, y: e.clientY });
    setIsDragging(true);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
  };

  const handleResizeStart = (e: React.MouseEvent, direction: ResizeDirection) => {
    e.preventDefault();
    e.stopPropagation();
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    });
    setIsResizing(direction);
    document.body.style.userSelect = 'none';
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
        "fixed z-50 shadow-2xl overflow-visible transition-shadow duration-200",
        (isDragging || isResizing) && "shadow-glow"
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: isMinimized ? '320px' : `${size.width}px`,
        height: isMinimized ? 'auto' : `${size.height + 40}px`,
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        willChange: (isDragging || isResizing) ? 'transform' : 'auto',
        pointerEvents: 'auto',
      }}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between p-2 bg-background/95 backdrop-blur border-b transition-colors select-none",
          isDragging ? "cursor-grabbing bg-accent/10" : "cursor-grab hover:bg-accent/5"
        )}
        onMouseDown={handleDragStart}
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
        <div className="relative w-full bg-black" style={{ height: `${size.height}px` }}>
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
          
          {/* iOS-style Corner Resize Handles */}
          {['ne', 'nw', 'se', 'sw'].map((direction) => (
            <div
              key={direction}
              className={cn(
                "absolute w-4 h-4 rounded-full bg-background/90 border-2 border-primary/50 backdrop-blur",
                "hover:bg-primary/20 hover:border-primary hover:scale-125 transition-all duration-150",
                "opacity-0 hover:opacity-100 group-hover:opacity-70",
                direction === 'ne' && "top-0 right-0 -translate-y-1/2 translate-x-1/2 cursor-ne-resize",
                direction === 'nw' && "top-0 left-0 -translate-y-1/2 -translate-x-1/2 cursor-nw-resize",
                direction === 'se' && "bottom-0 right-0 translate-y-1/2 translate-x-1/2 cursor-se-resize",
                direction === 'sw' && "bottom-0 left-0 translate-y-1/2 -translate-x-1/2 cursor-sw-resize"
              )}
              onMouseDown={(e) => handleResizeStart(e, direction as ResizeDirection)}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
