import React, { useState, useEffect, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ThumbsUp, Lightbulb, GraduationCap, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { getAnonymousId } from '@/lib/anonymous-id';
import type { ReactionCounts, ReactionType } from '@/types/blog-api';

interface ArticleReactionsProps { postSlug: string; className?: string; }

const ArticleReactions: React.FC<ArticleReactionsProps> = ({ postSlug, className }) => {
  const { t } = useTranslation('common');

  const REACTIONS = [
    { type: 'helpful' as ReactionType, icon: ThumbsUp, label: t('blog.helpful'), color: 'text-green-500' },
    { type: 'interesting' as ReactionType, icon: Lightbulb, label: t('blog.interesting'), color: 'text-yellow-500' },
    { type: 'learned' as ReactionType, icon: GraduationCap, label: t('blog.learnedSomething'), color: 'text-blue-500' },
  ] as const;
  const [counts, setCounts] = useState<ReactionCounts>({ helpful: 0, interesting: 0, learned: 0 });
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReactions = async () => {
      setIsLoading(true);
      const anonymousId = getAnonymousId();
      try {
        const { data, error } = await supabase.from('blog_reactions').select('reaction_type, anonymous_id').eq('post_slug', postSlug);
        if (error) throw error;
        if (data) {
          const newCounts: ReactionCounts = { helpful: 0, interesting: 0, learned: 0 };
          let found: string | null = null;
          data.forEach((r: any) => {
            if (r.reaction_type in newCounts) newCounts[r.reaction_type as keyof ReactionCounts]++;
            if (r.anonymous_id === anonymousId) found = r.reaction_type;
          });
          setCounts(newCounts);
          setUserReaction(found);
        }
      } catch (e) { console.error('Error fetching reactions:', e); }
      finally { setIsLoading(false); }
    };
    fetchReactions();
  }, [postSlug]);

  const handleReaction = async (reactionType: string) => {
    const anonymousId = getAnonymousId();
    setIsAnimating(reactionType);
    try {
      if (userReaction === reactionType) {
        await supabase.from('blog_reactions').delete().eq('post_slug', postSlug).eq('anonymous_id', anonymousId);
        setCounts(prev => ({ ...prev, [reactionType]: Math.max(0, prev[reactionType as keyof ReactionCounts] - 1) }));
        setUserReaction(null);
      } else {
        if (userReaction) {
          await supabase.from('blog_reactions').delete().eq('post_slug', postSlug).eq('anonymous_id', anonymousId);
          setCounts(prev => ({ ...prev, [userReaction]: Math.max(0, prev[userReaction as keyof ReactionCounts] - 1) }));
        }
        await supabase.from('blog_reactions').insert({ post_slug: postSlug, reaction_type: reactionType, anonymous_id: anonymousId });
        setCounts(prev => ({ ...prev, [reactionType]: prev[reactionType as keyof ReactionCounts] + 1 }));
        setUserReaction(reactionType);
      }
    } catch (e) { console.error('Error updating reaction:', e); }
    setTimeout(() => setIsAnimating(null), 300);
  };

  return (
    <div className={cn('py-8 border-t border-border', className)}>
      <p className="text-sm text-muted-foreground mb-4 text-center">{t('blog.didYouFindHelpful')}</p>
      <div className="flex items-center justify-center gap-3">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm">{t('blog.loading')}</span></div>
        ) : REACTIONS.map(({ type, icon: Icon, label, color }) => (
          <motion.button key={type} onClick={() => handleReaction(type)}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-full border transition-all',
              userReaction === type ? 'bg-accent/10 border-accent text-accent' : 'border-border hover:border-accent/50 text-muted-foreground hover:text-foreground'
            )} whileTap={{ scale: 0.95 }} animate={isAnimating === type ? { scale: [1, 1.1, 1] } : {}}>
            <Icon className={cn('h-4 w-4', userReaction === type && color)} />
            <span className="text-sm font-medium hidden sm:inline">{label}</span>
            <AnimatePresence mode="wait">
              <motion.span key={counts[type]} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                className="text-xs font-medium bg-muted px-1.5 py-0.5 rounded-full">{counts[type]}</motion.span>
            </AnimatePresence>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default memo(ArticleReactions);
