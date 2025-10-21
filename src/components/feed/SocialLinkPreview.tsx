import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Twitter, Linkedin, Instagram } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SocialPlatform } from '@/lib/socialEmbedUtils';

interface SocialLinkPreviewProps {
  platform: SocialPlatform;
  url: string;
  className?: string;
}

export function SocialLinkPreview({ platform, url, className }: SocialLinkPreviewProps) {
  const getPlatformDetails = () => {
    switch (platform) {
      case 'twitter':
        return {
          name: 'X (Twitter)',
          icon: Twitter,
          color: 'text-foreground',
          bgColor: 'bg-muted/50',
          borderColor: 'border-muted-foreground/20',
        };
      case 'linkedin':
        return {
          name: 'LinkedIn',
          icon: Linkedin,
          color: 'text-foreground',
          bgColor: 'bg-muted/50',
          borderColor: 'border-muted-foreground/20',
        };
      case 'instagram':
        return {
          name: 'Instagram',
          icon: Instagram,
          color: 'text-foreground',
          bgColor: 'bg-muted/50',
          borderColor: 'border-muted-foreground/20',
        };
      default:
        return {
          name: platform,
          icon: ExternalLink,
          color: 'text-foreground',
          bgColor: 'bg-muted/50',
          borderColor: 'border-border',
        };
    }
  };

  const { name, icon: Icon, color, bgColor, borderColor } = getPlatformDetails();

  return (
    <Card className={cn('overflow-hidden border', borderColor, bgColor, className)}>
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={cn('p-2 rounded-lg', bgColor)}>
            <Icon className={cn('w-5 h-5', color)} />
          </div>
          <div>
            <p className="font-semibold text-sm">{name} Post</p>
            <p className="text-xs text-muted-foreground">View on {name}</p>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          asChild
          className="w-full"
        >
          <a href={url} target="_blank" rel="noopener noreferrer">
            View Original Post
            <ExternalLink className="w-3 h-3 ml-2" />
          </a>
        </Button>
      </div>
    </Card>
  );
}
