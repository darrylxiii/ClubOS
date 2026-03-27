import React, { useState, useEffect, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { getAnonymousId } from '@/lib/anonymous-id';
import { toast } from 'sonner';

interface SaveForLaterProps { postSlug: string; postTitle: string; className?: string; variant?: 'button' | 'icon'; }

const SaveForLater: React.FC<SaveForLaterProps> = ({ postSlug, postTitle, className, variant = 'button' }) => {
  const { t } = useTranslation('common');
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const check = async () => {
      setIsChecking(true);
      const anonId = getAnonymousId();
      try {
        const q = supabase.from('blog_bookmarks').select('id').eq('post_slug', postSlug);
        if (user) q.eq('user_id', user.id); else q.eq('anonymous_id', anonId);
        const { data } = await q.maybeSingle();
        setIsSaved(!!data);
      } catch (e) { console.error(e); }
      finally { setIsChecking(false); }
    };
    check();
  }, [postSlug, user]);

  const toggle = async () => {
    setIsLoading(true);
    const anonId = getAnonymousId();
    try {
      if (isSaved) {
        const q = supabase.from('blog_bookmarks').delete().eq('post_slug', postSlug);
        if (user) await q.eq('user_id', user.id); else await q.eq('anonymous_id', anonId);
        setIsSaved(false); toast.success(t('blog.removedFromReadingList'));
      } else {
        await supabase.from('blog_bookmarks').insert({ post_slug: postSlug, user_id: user?.id || null, anonymous_id: user ? null : anonId });
        setIsSaved(true); toast.success(t('blog.addedToReadingList'));
      }
    } catch (e) { console.error(e); toast.error(t('blog.failedToUpdateReadingList')); }
    setIsLoading(false);
  };

  const disabled = isLoading || isChecking;
  const icon = isChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />;

  if (variant === 'icon') {
    return (
      <motion.button onClick={toggle} disabled={disabled} whileTap={disabled ? {} : { scale: 0.9 }}
        className={cn('p-2 rounded-full transition-colors', isSaved ? 'text-accent bg-accent/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted', disabled && 'opacity-50', className)}
        aria-label={isSaved ? t('blog.removeFromReadingList') : t('blog.saveToReadingList')}>{icon}</motion.button>
    );
  }

  return (
    <motion.button onClick={toggle} disabled={disabled} whileTap={disabled ? {} : { scale: 0.95 }}
      className={cn('flex items-center gap-2 px-4 py-2 rounded-full border transition-all',
        isSaved ? 'bg-accent/10 border-accent text-accent' : 'border-border hover:border-accent/50 text-muted-foreground hover:text-foreground',
        disabled && 'opacity-50', className)}>
      {icon}<span className="text-sm font-medium">{isSaved ? t('blog.savedLabel') : t('blog.saveForLater')}</span>
    </motion.button>
  );
};

export default memo(SaveForLater);
