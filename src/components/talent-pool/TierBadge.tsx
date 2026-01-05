import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Flame, ThermometerSun, Target, Users, Moon, Ban } from 'lucide-react';
import type { TalentTier } from '@/hooks/useTalentPool';

export type { TalentTier } from '@/hooks/useTalentPool';

interface TierBadgeProps {
  tier: TalentTier;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const tierConfig: Record<TalentTier, { label: string; icon: React.ElementType; className: string }> = {
  hot: {
    label: 'Hot',
    icon: Flame,
    className: 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30',
  },
  warm: {
    label: 'Warm',
    icon: ThermometerSun,
    className: 'bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30',
  },
  strategic: {
    label: 'Strategic',
    icon: Target,
    className: 'bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30',
  },
  pool: {
    label: 'Pool',
    icon: Users,
    className: 'bg-muted text-muted-foreground border-border hover:bg-muted/80',
  },
  dormant: {
    label: 'Dormant',
    icon: Moon,
    className: 'bg-slate-500/20 text-slate-400 border-slate-500/30 hover:bg-slate-500/30',
  },
  excluded: {
    label: 'Excluded',
    icon: Ban,
    className: 'bg-destructive/20 text-destructive border-destructive/30 hover:bg-destructive/30',
  },
};

const sizeClasses = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-0.5',
  lg: 'text-sm px-2.5 py-1',
};

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
  lg: 'h-4 w-4',
};

export function TierBadge({ tier, size = 'md', showIcon = true, className }: TierBadgeProps) {
  const config = tierConfig[tier];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium border transition-colors',
        config.className,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={cn(iconSizes[size], 'mr-1')} />}
      {config.label}
    </Badge>
  );
}

export function MoveProbabilityBadge({ 
  probability, 
  size = 'md',
  className 
}: { 
  probability: number; 
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const getColorClass = (prob: number) => {
    if (prob >= 70) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (prob >= 40) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-muted text-muted-foreground border-border';
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium border',
        getColorClass(probability),
        sizeClasses[size],
        className
      )}
    >
      {probability}%
    </Badge>
  );
}
