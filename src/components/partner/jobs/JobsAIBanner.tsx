import { memo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Brain, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAggregatedHiringIntelligence } from '@/hooks/useAggregatedHiringIntelligence';
import { motion, AnimatePresence } from 'framer-motion';

interface JobsAIBannerProps {
  companyId?: string;
  onViewDetails?: () => void;
  className?: string;
}

const DISMISS_KEY = 'jobs_ai_banner_dismissed';
const DISMISS_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export const JobsAIBanner = memo(({ companyId, onViewDetails, className }: JobsAIBannerProps) => {
  const [isDismissed, setIsDismissed] = useState(true);
  const { data: insights, isLoading } = useAggregatedHiringIntelligence(companyId);

  // Check if dismissed within last 24 hours
  useEffect(() => {
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < DISMISS_DURATION) {
        setIsDismissed(true);
        return;
      }
    }
    setIsDismissed(false);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setIsDismissed(true);
  };

  // Only show if we have critical/high priority recommendations
  const hasUrgentInsight = insights?.strategicRecommendations?.some(
    rec => rec.priority === 'critical' || rec.priority === 'high'
  );

  const urgentInsight = insights?.strategicRecommendations?.find(
    rec => rec.priority === 'critical' || rec.priority === 'high'
  );

  if (isLoading || isDismissed || !hasUrgentInsight || !urgentInsight) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-lg',
          'bg-primary/5 border border-primary/20',
          className
        )}
      >
        <div className="flex items-center gap-2 shrink-0">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Brain className="h-4 w-4 text-primary" />
          </div>
          <span className="text-xs font-semibold text-primary uppercase tracking-wide">QUIN</span>
        </div>

        <p className="flex-1 text-sm text-foreground line-clamp-1">
          {urgentInsight.insight}
        </p>

        <div className="flex items-center gap-2 shrink-0">
          {onViewDetails && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-primary hover:text-primary"
              onClick={onViewDetails}
            >
              Details
              <ChevronRight className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

JobsAIBanner.displayName = 'JobsAIBanner';
