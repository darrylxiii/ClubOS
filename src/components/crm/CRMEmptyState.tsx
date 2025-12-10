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
}

const emptyStateConfig: Record<EmptyStateType, {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  iconColor: string;
  bgGradient: string;
}> = {
  'no-campaigns': {
    icon: Mail,
    title: 'No campaigns yet',
    description: 'Create your first outreach campaign or import from Instantly.ai',
    primaryLabel: 'Create Campaign',
    secondaryLabel: 'Import from Instantly',
    iconColor: 'text-blue-500',
    bgGradient: 'from-blue-500/10 to-blue-600/5',
  },
  'no-prospects': {
    icon: Users,
    title: 'No prospects in pipeline',
    description: 'Add prospects manually or import from a CSV file',
    primaryLabel: 'Add Prospect',
    secondaryLabel: 'Import CSV',
    iconColor: 'text-purple-500',
    bgGradient: 'from-purple-500/10 to-purple-600/5',
  },
  'no-replies': {
    icon: Inbox,
    title: 'Inbox zero achieved!',
    description: 'All caught up. New replies will appear here.',
    iconColor: 'text-green-500',
    bgGradient: 'from-green-500/10 to-green-600/5',
  },
  'no-hot-leads': {
    icon: Flame,
    title: 'No hot leads yet',
    description: 'Hot leads will appear here when prospects show strong interest',
    iconColor: 'text-red-500',
    bgGradient: 'from-red-500/10 to-red-600/5',
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
          "w-20 h-20 rounded-2xl flex items-center justify-center mb-6",
          "bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-xl",
          "border border-border/30 shadow-lg"
        )}
      >
        <Icon className={cn("w-10 h-10", config.iconColor)} />
      </motion.div>

      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-xl font-semibold mb-2"
      >
        {config.title}
      </motion.h3>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-muted-foreground text-center max-w-sm mb-6"
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
          className="flex items-center gap-3"
        >
          {config.primaryLabel && onPrimaryAction && (
            <Button onClick={onPrimaryAction}>
              <Plus className="w-4 h-4 mr-2" />
              {config.primaryLabel}
            </Button>
          )}
          {config.secondaryLabel && onSecondaryAction && (
            <Button variant="outline" onClick={onSecondaryAction}>
              <Upload className="w-4 h-4 mr-2" />
              {config.secondaryLabel}
            </Button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
