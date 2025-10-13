import { SocialPlatform } from '@/lib/socialEmbedUtils';
import { SocialLinkPreview } from './SocialLinkPreview';

interface SocialEmbedProps {
  platform: SocialPlatform;
  postId: string;
  url: string;
  className?: string;
  username?: string;
}

export function SocialEmbed({ platform, postId, url, className, username }: SocialEmbedProps) {
  // Social embeds often don't work in iframes due to CORS/security restrictions
  // Show link preview instead for better UX
  return <SocialLinkPreview platform={platform} url={url} className={className} />;
}
