import { motion } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  Search,
  Inbox,
  Plus,
  Filter,
  AlertCircle,
  Package,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface EmptyStateProps {
  /** Icon to display (can be a Lucide icon component or custom) */
  icon?: LucideIcon;
  /** Main title */
  title: string;
  /** Description text */
  description?: string;
  /** Primary action button */
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  /** Secondary action button */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Tips/suggestions to show */
  tips?: string[];
  /** Show tips by default */
  showTips?: boolean;
  /** Custom icon color class */
  iconColor?: string;
  /** Custom background gradient */
  bgGradient?: string;
  /** Variant size */
  variant?: 'default' | 'compact';
  /** Additional className */
  className?: string;
}

/**
 * Universal empty state component for consistent UX across the app
 *
 * @example
 * // Simple
 * <EmptyState
 *   icon={Users}
 *   title={'No team members yet'}
 *   description={'Invite your first team member to get started'}
 * />
 *
 * // With actions
 * <EmptyState
 *   icon={FileText}
 *   title={'No documents found'}
 *   primaryAction={{
 *     label: "Upload Document",
 *     onClick: () => openUploadDialog(),
 *     icon: Plus
 *   }}
 * />
 *
 * // With tips
 * <EmptyState
 *   icon={Search}
 *   title={'No results found'}
 *   tips={[
 *     "Try using different keywords",
 *     "Check your spelling",
 *     "Use fewer filters"
 *   ]}
 *   showTips
 * />
 */
export function EmptyState({
  icon: Icon = FileText,
  title,
  description,
  primaryAction,
  secondaryAction,
  tips,
  showTips = false,
  iconColor = 'text-muted-foreground',
  bgGradient = 'from-muted/50 to-muted/20',
  variant = 'default',
  className,
}: EmptyStateProps) {
  const { t } = useTranslation('common');
  const isCompact = variant === 'compact';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        isCompact ? 'py-8 px-4' : 'py-16 px-4',
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'rounded-full bg-gradient-to-br flex items-center justify-center mb-4',
          bgGradient,
          isCompact ? 'w-12 h-12' : 'w-16 h-16'
        )}
      >
        <Icon className={cn(isCompact ? 'h-6 w-6' : 'h-8 w-8', iconColor)} aria-hidden="true" />
      </div>

      {/* Title */}
      <h3 className={cn('font-semibold text-foreground', isCompact ? 'text-base' : 'text-lg')}>
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className={cn('text-muted-foreground max-w-md mt-2', isCompact ? 'text-xs' : 'text-sm')}>
          {description}
        </p>
      )}

      {/* Actions */}
      {(primaryAction || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-2 mt-6">
          {primaryAction && (
            <Button onClick={primaryAction.onClick} size={isCompact ? 'sm' : 'default'}>
              {primaryAction.icon && <primaryAction.icon className="h-4 w-4 mr-2" aria-hidden="true" />}
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button onClick={secondaryAction.onClick} variant="outline" size={isCompact ? 'sm' : 'default'}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}

      {/* Tips */}
      {showTips && tips && tips.length > 0 && (
        <div className="mt-8 p-4 rounded-lg bg-muted/30 border border-border/50 max-w-md">
          <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
            {t('empty.tips', 'Tips')}
          </p>
          <ul className="text-xs text-muted-foreground space-y-1.5 text-left">
            {tips.map((tip, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}

/**
 * Pre-configured empty states for common scenarios
 */
function NoResultsEmptyState(props: Partial<EmptyStateProps>) {
  const { t } = useTranslation('common');
  return (
    <EmptyState
      icon={Search}
      title={t('empty.noResults', 'No results found')}
      description={t('empty.tryAdjusting', 'Try adjusting your search or filters')}
      iconColor="text-orange-500"
      bgGradient="from-orange-500/10 to-orange-600/5"
      tips={[
        t('empty.tipDifferentKeywords', 'Try using different keywords'),
        t('empty.tipCheckSpelling', 'Check your spelling'),
        t('empty.tipRemoveFilters', 'Remove some filters to see more results'),
      ]}
      {...props}
    />
  );
}

function NoDataEmptyState(props: Partial<EmptyStateProps>) {
  const { t } = useTranslation('common');
  return (
    <EmptyState
      icon={Inbox}
      title={t('empty.nothingHereYet', 'Nothing here yet')}
      description={t('empty.dataWillAppear', 'Data will appear here once available')}
      iconColor="text-blue-500"
      bgGradient="from-blue-500/10 to-blue-600/5"
      {...props}
    />
  );
}

function NoItemsEmptyState(props: Partial<EmptyStateProps>) {
  const { t } = useTranslation('common');
  return (
    <EmptyState
      icon={Package}
      title={t('empty.noItemsFound', 'No items found')}
      description={t('empty.getStartedAdding', 'Get started by adding your first item')}
      iconColor="text-purple-500"
      bgGradient="from-purple-500/10 to-purple-600/5"
      {...props}
    />
  );
}

function FilteredOutEmptyState(props: Partial<EmptyStateProps>) {
  const { t } = useTranslation('common');
  return (
    <EmptyState
      icon={Filter}
      title={t('empty.noMatchingItems', 'No matching items')}
      description={t('empty.tryChangingFilters', 'Try changing your filters to see more results')}
      iconColor="text-amber-500"
      bgGradient="from-amber-500/10 to-amber-600/5"
      {...props}
    />
  );
}

export const EmptyStates = {
  NoResults: NoResultsEmptyState,
  NoData: NoDataEmptyState,
  NoItems: NoItemsEmptyState,
  FilteredOut: FilteredOutEmptyState,
};
