import { useState } from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getYouTubeThumbnail, getYouTubeEmbedUrl } from '@/lib/youtubeUtils';

interface YouTubeEmbedProps {
  videoId: string;
  isOwnMessage?: boolean;
}

export function YouTubeEmbed({ videoId, isOwnMessage }: YouTubeEmbedProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const thumbnailUrl = getYouTubeThumbnail(videoId, 'hq');
  const embedUrl = getYouTubeEmbedUrl(videoId);

  if (isPlaying) {
    return (
      <div className="relative w-full max-w-md rounded-xl overflow-hidden shadow-glass-md">
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