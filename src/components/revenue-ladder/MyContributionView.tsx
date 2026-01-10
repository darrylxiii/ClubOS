import { motion } from 'framer-motion';
import { 
  User, TrendingUp, Trophy, Star, Target, 
  Briefcase, Users, ArrowUpRight, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useMilestoneStats, useRevenueMilestones } from '@/hooks/useRevenueLadder';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MyContributionViewProps {
  userId: string;
}

const contributionTypeConfig = {
  placement: {
    icon: Briefcase,
    label: 'Placements',
    color: 'text-success',
    bg: 'bg-success/10',
  },
  referral: {
    icon: Users,
    label: 'Referrals',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  retention: {
    icon: Star,
    label: 'Retention',
    color: 'text-warning',
    bg: 'bg-warning/10',
  },
  expansion: {
    icon: ArrowUpRight,
    label: 'Expansion',
    color: 'text-premium',
    bg: 'bg-premium/10',
  },
};

export function MyContributionView({ userId }: MyContributionViewProps) {
  const { data: contributions, isLoading } = useQuery({
    queryKey: ['milestone-contributions', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('milestone_contributions')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
  const stats = useMilestoneStats();

  const totalRevenue = contributions?.reduce((sum, c) => sum + (c.revenue_attributed || 0), 0) || 0;
  const contributionsByType = contributions?.reduce((acc, c) => {
    const type = c.contribution_type || 'other';
    acc[type] = (acc[type] || 0) + (c.revenue_attributed || 0);
    return acc;
  }, {} as Record<string, number>) || {};

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `€${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `€${(amount / 1000).toFixed(0)}K`;
    }
    return `€${amount.toFixed(0)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-primary/10">
          <User className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-heading-md font-semibold">My Contribution</h2>
          <p className="text-body-sm text-muted-foreground">
            Your role in reaching milestones
          </p>
        </div>
      </div>

      {/* Total Contribution Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card variant="elevated" className="relative overflow-hidden p-6">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-premium/10" />
          
          <div className="relative z-10 space-y-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-label-sm text-muted-foreground">Total Revenue Contributed</p>
                <motion.p 
                  className="text-display-md font-bold tracking-tight"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {formatCurrency(totalRevenue)}
                </motion.p>
              </div>
              <div className="p-3 rounded-xl bg-primary/20">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
            </div>

            {/* Impact on Next Milestone */}
            {stats.nextMilestone && (
              <div className="p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-warning" />
                    <span className="text-label-sm font-medium">
                      Next: {stats.nextMilestone.display_name}
                    </span>
                  </div>
                  <span className="text-label-sm text-muted-foreground">
                    {formatCurrency(stats.nextMilestone.threshold_amount)}
                  </span>
                </div>
                <Progress 
                  value={stats.nextMilestone.progress_percentage || 0} 
                  className="h-2"
                />
                <div className="flex items-center justify-between text-label-sm">
                  <span className="text-muted-foreground">
                    Your share: {totalRevenue > 0 
                      ? `${((totalRevenue / (stats.nextMilestone.achieved_revenue || 1)) * 100).toFixed(1)}%`
                      : '0%'}
                  </span>
                  <span className="text-success font-medium">
                    {Math.round(stats.nextMilestone.progress_percentage || 0)}% complete
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>
      </motion.div>

      {/* Contribution Breakdown */}
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(contributionTypeConfig).map(([type, config], index) => {
          const Icon = config.icon;
          const amount = contributionsByType[type] || 0;

          return (
            <motion.div
              key={type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.1 }}
            >
              <Card variant="default" className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", config.bg)}>
                    <Icon className={cn("h-5 w-5", config.color)} />
                  </div>
                  <span className="text-label-sm font-medium">{config.label}</span>
                </div>
                <p className="text-heading-md font-bold">{formatCurrency(amount)}</p>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Milestones You Helped Unlock */}
      <Card variant="static" className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-warning" />
          <h3 className="text-heading-xs font-semibold">Milestones You Helped Unlock</h3>
        </div>

        {contributions && contributions.length > 0 ? (
          <div className="space-y-3">
            {/* Group by milestone and show unique milestones */}
            {Array.from(new Set(contributions.map(c => c.milestone_id))).slice(0, 5).map((milestoneId: string, index: number) => {
              const milestoneContributions = contributions.filter(c => c.milestone_id === milestoneId);
              const total = milestoneContributions.reduce((sum, c) => sum + (c.revenue_attributed || 0), 0);

              return (
                <motion.div
                  key={milestoneId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-success/10">
                      <Sparkles className="h-4 w-4 text-success" />
                    </div>
                    <div>
                      <p className="text-body-sm font-medium">Milestone Contribution</p>
                      <p className="text-label-sm text-muted-foreground">
                        {milestoneContributions.length} contribution(s)
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                    +{formatCurrency(total)}
                  </Badge>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
              <Star className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-body-sm text-muted-foreground">
              Your contributions will appear here as you help the team reach milestones
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
