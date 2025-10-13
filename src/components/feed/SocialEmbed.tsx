import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SocialPlatform, getTwitterEmbedUrl, getLinkedInEmbedUrl, getInstagramEmbedUrl } from '@/lib/socialEmbedUtils';

interface SocialEmbedProps {
  platform: SocialPlatform;
  postId: string;
  url: string;
  className?: string;
  username?: string;
}

export function SocialEmbed({ platform, postId, url, className, username }: SocialEmbedProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [embedUrl, setEmbedUrl] = useState<string>('');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let url = '';
    switch (platform) {
      case 'twitter':
        url = getTwitterEmbedUrl(postId);
        break;
      case 'linkedin':
        url = getLinkedInEmbedUrl(postId);
        break;
      case 'instagram':
        url = getInstagramEmbedUrl(postId);
        break;
    }
    setEmbedUrl(url);
    
    // Set a timeout to hide loader if embed takes too long
    const timeout = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        setHasError(true);
      }
    }, 10000);
    
    return () => clearTimeout(timeout);
  }, [platform, postId, isLoading]);

  const getPlatformColor = () => {
    switch (platform) {
      case 'twitter':
        return 'border-blue-500/20 bg-blue-500/5';
      case 'linkedin':
        return 'border-blue-600/20 bg-blue-600/5';
      case 'instagram':
        return 'border-pink-500/20 bg-pink-500/5';
      default:
        return '';
    }
  };

  const getPlatformName = () => {
    switch (platform) {
      case 'twitter':
        return 'X (Twitter)';
      case 'linkedin':
        return 'LinkedIn';
      case 'instagram':
        return 'Instagram';
      default:
        return platform;
    }
  };

  return (
    <Card className={cn('overflow-hidden', getPlatformColor(), className)}>
      {isLoading && !hasError && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}
      
      {hasError && (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <p className="text-sm text-muted-foreground text-center">
            Unable to load embed. Click below to view the original post.
          </p>
        </div>
      )}
      
      {!hasError && (
        <div className={cn(isLoading && 'hidden', 'min-h-[400px]')}>
          <iframe
            src={embedUrl}
            className="w-full min-h-[400px] border-0"
            onLoad={() => {
              setIsLoading(false);
              setHasError(false);
            }}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
              console.error(`Failed to load ${platform} embed:`, embedUrl);
            }}
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            loading="lazy"
            allow="autoplay; encrypted-media"
          />
        </div>
      )}
      
      <div className="p-3 border-t bg-background/50 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground font-medium">
            {getPlatformName()} Post
          </span>
          {username && platform === 'linkedin' && (
            <span className="text-xs text-muted-foreground">
              @{username}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="h-7 text-xs gap-1"
        >
          <a href={url} target="_blank" rel="noopener noreferrer">
            View Original
            <ExternalLink className="w-3 h-3" />
          </a>
        </Button>
      </div>
    </Card>
  );
}
