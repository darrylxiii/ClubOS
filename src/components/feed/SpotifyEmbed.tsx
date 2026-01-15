import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Music } from 'lucide-react';
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
      console.log('[SpotifyEmbed] Embed URL:', url);
    } catch (error) {
      console.error('[SpotifyEmbed] Error creating embed URL:', error);
      setHasError(true);
      setIsLoading(false);
    }
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
      {hasError ? (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <Music className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground text-center">
            Unable to load Spotify embed. Click below to listen.
          </p>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="mt-4"
          >
            <a href={url} target="_blank" rel="noopener noreferrer">
              Open in Spotify
              <ExternalLink className="w-3 h-3 ml-2" />
            </a>
          </Button>
        </div>
      ) : (
        <div className={getHeight()}>
          <iframe
            src={embedUrl}
            className={cn('w-full border-0', getHeight())}
            onLoad={() => {
              console.log('[SpotifyEmbed] Loaded successfully');
              setIsLoading(false);
              setHasError(false);
            }}
            onError={(e) => {
              console.error('[SpotifyEmbed] Failed to load:', e);
              setHasError(true);
            }}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="eager"
            frameBorder="0"
          />
        </div>
      )}
    </Card>
  );
}
