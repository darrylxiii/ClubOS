import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Loader2, Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SpotifyType, getSpotifyEmbedUrl } from '@/lib/spotifyEmbedUtils';

interface SpotifyEmbedProps {
  type: SpotifyType;
  spotifyId: string;
  url: string;
  className?: string;
}

export function SpotifyEmbed({ type, spotifyId, url, className }: SpotifyEmbedProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [embedUrl, setEmbedUrl] = useState<string>('');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    try {
      const url = getSpotifyEmbedUrl(type, spotifyId);
      setEmbedUrl(url);
    } catch (error) {
      console.error('[SpotifyEmbed] Error creating embed URL:', error);
      setHasError(true);
      setIsLoading(false);
    }
    
    const timeout = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        setHasError(true);
      }
    }, 10000);
    
    return () => clearTimeout(timeout);
  }, [type, spotifyId]);

  const getTypeName = () => {
    switch (type) {
      case 'track':
        return 'Song';
      case 'album':
        return 'Album';
      case 'playlist':
        return 'Playlist';
      case 'episode':
        return 'Podcast Episode';
      case 'show':
        return 'Podcast';
      default:
        return type;
    }
  };

  const getHeight = () => {
    switch (type) {
      case 'track':
      case 'episode':
        return 'h-[152px]';
      case 'album':
      case 'show':
        return 'h-[352px]';
      case 'playlist':
        return 'h-[380px]';
      default:
        return 'h-[352px]';
    }
  };

  return (
    <Card className={cn('overflow-hidden border-green-500/20 bg-green-500/5', className)}>
      {isLoading && !hasError && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}
      
      {hasError && (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <Music className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground text-center">
            Unable to load Spotify embed. Click below to listen.
          </p>
        </div>
      )}
      
      {!hasError && (
        <div className={cn(isLoading && 'hidden', getHeight())}>
          <iframe
            src={embedUrl}
            className={cn('w-full border-0', getHeight())}
            onLoad={() => {
              setIsLoading(false);
              setHasError(false);
            }}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
            allow="encrypted-media"
            loading="lazy"
          />
        </div>
      )}
      
      <div className="p-3 border-t bg-background/50 flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">
          Spotify {getTypeName()}
        </span>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="h-7 text-xs gap-1"
        >
          <a href={url} target="_blank" rel="noopener noreferrer">
            Open in Spotify
            <ExternalLink className="w-3 h-3" />
          </a>
        </Button>
      </div>
    </Card>
  );
}
