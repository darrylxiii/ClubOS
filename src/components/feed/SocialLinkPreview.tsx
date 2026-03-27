import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Twitter, Linkedin, Instagram } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SocialPlatform } from '@/lib/socialEmbedUtils';
import { useTranslation } from 'react-i18next';

interface SocialLinkPreviewProps {
  platform: SocialPlatform;
  url: string;
  className?: string;
}

export function SocialLinkPreview({ platform, url, className }: SocialLinkPreviewProps) {
  const { t } = useTranslation('common');
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
            <p className="font-semibold text-sm">{t('feed.socialPost', '{{name}} Post', { name })}</p>
            <p className="text-xs text-muted-foreground">{t('feed.viewOn', 'View on {{name}}', { name })}</p>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          asChild
          className="w-full"
        >
          <a href={url} target="_blank" rel="noopener noreferrer">
            {t('feed.viewOriginalPost', 'View Original Post')}
            <ExternalLink className="w-3 h-3 ml-2" />
          </a>
        </Button>
      </div>
    </Card>
  );
}
