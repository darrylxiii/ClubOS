import { useState } from 'react';
import { Play, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getYouTubeThumbnail, getYouTubeEmbedUrl } from '@/lib/youtubeUtils';
import { useVideoPlayer } from '@/contexts/VideoPlayerContext';
import { Button } from '@/components/ui/button';

interface YouTubeEmbedProps {
  videoId: string;
  isOwnMessage?: boolean;
  title?: string;
}

export function YouTubeEmbed({ videoId, isOwnMessage, title }: YouTubeEmbedProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const { openFloatingPlayer } = useVideoPlayer();
  const thumbnailUrl = getYouTubeThumbnail(videoId, 'hq');
  const embedUrl = getYouTubeEmbedUrl(videoId);

  const handlePopOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    openFloatingPlayer(videoId, title || 'YouTube Video');
    setIsPlaying(false);
  };

  if (isPlaying) {
    return (
      <div className="relative w-full max-w-md rounded-xl overflow-hidden shadow-glass-md group">
        <iframe
          width="100%"
          height="250"
          src={`${embedUrl}?autoplay=1`}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full aspect-video"
        />
        <Button
          variant="secondary"
          size="sm"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity gap-2"
          onClick={handlePopOut}
        >
          <Maximize2 className="w-4 h-4" />
          Pop Out
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative w-full max-w-md rounded-xl overflow-hidden shadow-glass-md cursor-pointer group",
        "hover:shadow-glass-lg transition-all duration-300"
      )}
      onClick={() => setIsPlaying(true)}
    >
      <img
        src={thumbnailUrl}
        alt="YouTube video thumbnail"
        className="w-full aspect-video object-cover"
      />
      <div className={cn(
        "absolute inset-0 flex items-center justify-center transition-all duration-300",
        "bg-black/30 group-hover:bg-black/50"
      )}>
        <div className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300",
          "bg-red-600 group-hover:bg-red-500 group-hover:scale-110 shadow-glow"
        )}>
          <Play className="h-8 w-8 text-white fill-white ml-1" />
        </div>
      </div>
      <div className={cn(
        "absolute bottom-0 left-0 right-0 p-2 text-xs font-medium",
        isOwnMessage ? "bg-white/20 text-white" : "bg-black/60 text-white"
      )}>
        YouTube Video
      </div>
    </div>
  );
}