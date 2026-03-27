import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Twitter, Facebook, Linkedin, Mail, Link2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SocialShareButtonsProps { url: string; title: string; description?: string; className?: string; variant?: 'default' | 'compact'; onShare?: (platform: string) => void; }

const SocialShareButtons: React.FC<SocialShareButtonsProps> = ({ url, title, description = '', className, variant = 'default', onShare }) => {
  const { t } = useTranslation('common');
  const [copied, setCopied] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description);

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${encodedUrl}`,
  };

  const handleShare = async (platform: string) => {
    onShare?.(platform);
    if (platform === 'copy') {
      try { await navigator.clipboard.writeText(url); setCopied(true); toast.success(t('blog.linkCopied')); setTimeout(() => setCopied(false), 2000); }
      catch { toast.error(t('blog.failedToCopy')); }
      return;
    }
    const shareUrl = shareLinks[platform as keyof typeof shareLinks];
    if (shareUrl) window.open(shareUrl, '_blank', 'width=600,height=400,noopener,noreferrer');
  };

  const isCompact = variant === 'compact';
  const buttonSize = isCompact ? 'h-8 w-8' : 'h-10 w-10';
  const iconSize = isCompact ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {!isCompact && <span className="text-sm font-medium text-muted-foreground mr-2">{t('blog.share')}:</span>}
      <Button variant="outline" size="icon" className={cn(buttonSize, 'rounded-full hover:bg-[#1DA1F2]/10 hover:text-[#1DA1F2]')} onClick={() => handleShare('twitter')} aria-label={t('blog.shareOnTwitter')}><Twitter className={iconSize} /></Button>
      <Button variant="outline" size="icon" className={cn(buttonSize, 'rounded-full hover:bg-[#1877F2]/10 hover:text-[#1877F2]')} onClick={() => handleShare('facebook')} aria-label={t('blog.shareOnFacebook')}><Facebook className={iconSize} /></Button>
      <Button variant="outline" size="icon" className={cn(buttonSize, 'rounded-full hover:bg-[#0A66C2]/10 hover:text-[#0A66C2]')} onClick={() => handleShare('linkedin')} aria-label={t('blog.shareOnLinkedIn')}><Linkedin className={iconSize} /></Button>
      <Button variant="outline" size="icon" className={cn(buttonSize, 'rounded-full hover:bg-primary/10 hover:text-primary')} onClick={() => handleShare('email')} aria-label={t('blog.shareViaEmail')}><Mail className={iconSize} /></Button>
      <Button variant="outline" size="icon" className={cn(buttonSize, 'rounded-full hover:bg-accent/10 hover:text-accent')} onClick={() => handleShare('copy')} aria-label={t('blog.copyLink')}>
        {copied ? <Check className={cn(iconSize, 'text-accent')} /> : <Link2 className={iconSize} />}
      </Button>
    </div>
  );
};

export default SocialShareButtons;
