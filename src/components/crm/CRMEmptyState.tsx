import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Users,
  Mail,
  Inbox,
  MessageSquare,
  Flame,
  Upload,
  Plus,
  Search,
  Lightbulb,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

type EmptyStateType = 
  | 'no-campaigns' 
  | 'no-prospects' 
  | 'no-replies' 
  | 'no-hot-leads'
  | 'empty-stage'
  | 'no-search-results';

interface CRMEmptyStateProps {
  type: EmptyStateType;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  searchQuery?: string;
  showTips?: boolean;
}

const emptyStateConfig: Record<EmptyStateType, {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  iconColor: string;
  bgGradient: string;
  tips?: string[];
}> = {
  'no-campaigns': {
    icon: Mail,
    title: 'No campaigns yet',
    description: 'Create your first outreach campaign or import from Instantly.ai',
    primaryLabel: 'Create Campaign',
    secondaryLabel: 'Import from Instantly',
    iconColor: 'text-blue-500',
    bgGradient: 'from-blue-500/10 to-blue-600/5',
    tips: [
      'Connect your Instantly.ai account to auto-sync campaigns',
      'Segment prospects by industry for better response rates',
      'Use personalized subject lines to boost open rates',
    ],
  },
  'no-prospects': {
    icon: Users,
    title: 'Start Building Your Pipeline',
    description: 'Add prospects manually or import from a CSV file to begin outreach',
    primaryLabel: 'Add First Prospect',
    secondaryLabel: 'Import from CSV',
    iconColor: 'text-purple-500',
    bgGradient: 'from-purple-500/10 to-purple-600/5',
    tips: [
      'Import prospects from LinkedIn Sales Navigator via CSV',
      'Add company information for better targeting',
      'Set deal values to track pipeline revenue',
    ],
  },
  'no-replies': {
    icon: Inbox,
    title: 'Inbox zero achieved!',
    description: 'All caught up. New replies will appear here automatically.',
    iconColor: 'text-green-500',
    bgGradient: 'from-green-500/10 to-green-600/5',
    tips: [
      'AI automatically categorizes replies as hot, warm, or cold',
      'Use keyboard shortcuts (j/k) to navigate quickly',
      'Set up notifications to respond faster to hot leads',
    ],
  },
  'no-hot-leads': {
    icon: Flame,
    title: 'No hot leads yet',
    description: 'Hot leads will appear here when prospects show strong interest',
    iconColor: 'text-red-500',
    bgGradient: 'from-red-500/10 to-red-600/5',
    tips: [
      'Personalize your outreach to increase engagement',
      'Follow up within 24 hours of initial contact',
      'Use social proof and case studies in emails',
    ],
  },
  'empty-stage': {
    icon: MessageSquare,
    title: 'This stage is empty',
    description: 'Drag prospects here or add new ones',
    primaryLabel: 'Add Prospect',
    iconColor: 'text-muted-foreground',
    bgGradient: 'from-muted/10 to-muted/5',
  },
  'no-search-results': {
    icon: Search,
    title: 'No results found',
    description: 'Try adjusting your search or filters',
    iconColor: 'text-muted-foreground',
    bgGradient: 'from-muted/10 to-muted/5',
  },
};

export function CRMEmptyState({ 
  type, 
  onPrimaryAction, 
  onSecondaryAction,
  searchQuery,
  showTips = true,
}: CRMEmptyStateProps) {
  const config = emptyStateConfig[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 rounded-2xl",
        "bg-gradient-to-br border border-border/20",
        config.bgGradient
      )}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.1 }}
        className={cn(
          "w-24 h-24 rounded-2xl flex items-center justify-center mb-6",
          "bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-xl",
          "border border-border/30 shadow-lg"
        )}
      >
        <Icon className={cn("w-12 h-12", config.iconColor)} />
      </motion.div>

      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-bold mb-2"
      >
        {config.title}
      </motion.h3>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-muted-foreground text-center max-w-md mb-6"
      >
        {searchQuery 
          ? `No results for "${searchQuery}". Try a different search term.`
          : config.description
        }
      </motion.p>

      {(config.primaryLabel || config.secondaryLabel) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-3 mb-8"
        >
          {config.primaryLabel && onPrimaryAction && (
            <Button size="lg" onClick={onPrimaryAction} className="gap-2">
              <Plus className="w-5 h-5" />
              {config.primaryLabel}
            </Button>
          )}
          {config.secondaryLabel && onSecondaryAction && (
            <Button size="lg" variant="outline" onClick={onSecondaryAction} className="gap-2">
              <Upload className="w-5 h-5" />
              {config.secondaryLabel}
            </Button>
          )}
        </motion.div>
      )}

      {/* Getting Started Tips */}
      {showTips && config.tips && config.tips.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="w-full max-w-lg"
        >
          <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            Quick Tips to Get Started
          </div>
          <div className="space-y-2">
            {config.tips.map((tip, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="flex items-start gap-2 text-sm text-muted-foreground bg-background/50 backdrop-blur-sm rounded-lg p-3 border border-border/20"
              >
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                <span>{tip}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
