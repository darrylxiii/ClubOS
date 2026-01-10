import { motion } from 'framer-motion';
import { 
  Trophy, TrendingUp, Target, Coins, Award, 
  ArrowUp, ChevronRight, Sparkles, Medal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyContributions } from '@/hooks/useMyContributions';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/currency';

interface MyContributionViewProps {
  year?: number;
}

export function MyContributionView({ year }: MyContributionViewProps) {
  const { user } = useAuth();
  const { data: stats, isLoading, error } = useMyContributions(year);

  if (isLoading) {
    return <MyContributionSkeleton />;
  }

  if (error || !stats) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
          <Trophy className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-heading-sm font-medium">Unable to load your contributions</p>
        <p className="text-body-sm text-muted-foreground">Please try again later</p>
      </div>
    );
  }

  const formatEur = (amount: number) => formatCurrency(amount, 'EUR');

  return (
    <div className="space-y-6">
      {/* Personal Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <Avatar className="h-16 w-16 border-2 border-primary/20">
          <AvatarImage src={user?.user_metadata?.avatar_url} />
          <AvatarFallback className="text-xl bg-primary/10 text-primary">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <h2 className="text-heading-md font-bold">My Revenue Contribution</h2>
          <div className="flex items-center gap-2">
            {stats.rank > 0 && stats.rank <= 3 && (
              <Badge variant="secondary" className="gap-1">
                <Medal className="h-3 w-3" />
                #{stats.rank} on Team
              </Badge>
            )}
            {stats.rank > 3 && (
              <Badge variant="outline">#{stats.rank} of {stats.teamSize}</Badge>
            )}
            {stats.commissionTier && (
              <Badge className="bg-premium/20 text-premium border-premium/30">
                {stats.commissionTier.tierName}
              </Badge>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label="Total Revenue"
          value={formatEur(stats.totalRevenue)}
          subValue={`${stats.placementCount} placements`}
          color="primary"
          delay={0}
        />
        <StatCard
          icon={Target}
          label="Target Progress"
          value={`${Math.round(stats.targetProgress)}%`}
          subValue={stats.annualTarget > 0 ? `of ${formatEur(stats.annualTarget)}` : 'No target set'}
          color="success"
          delay={0.1}
        />
        <StatCard
          icon={Coins}
          label="Commission Earned"
          value={formatEur(stats.commissionEarned)}
          subValue={stats.projectedCommission > 0 ? `+${formatEur(stats.projectedCommission)} pending` : 'YTD paid'}
          color="premium"
          delay={0.2}
        />
        <StatCard
          icon={Award}
          label="Milestones"
          value={stats.milestonesContributed.toString()}
          subValue="contributed to"
          color="accent"
          delay={0.3}
        />
      </div>

      {/* Revenue Breakdown */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Sourced vs Closed */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-body-md font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Revenue Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-body-sm">
                  <span className="text-muted-foreground">Sourced</span>
                  <span className="font-medium">{formatEur(stats.totalRevenueSourced)}</span>
                </div>
                <Progress 
                  value={stats.totalRevenue > 0 ? (stats.totalRevenueSourced / stats.totalRevenue) * 100 : 0} 
                  className="h-2"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-body-sm">
                  <span className="text-muted-foreground">Closed</span>
                  <span className="font-medium">{formatEur(stats.totalRevenueClosed)}</span>
                </div>
                <Progress 
                  value={stats.totalRevenue > 0 ? (stats.totalRevenueClosed / stats.totalRevenue) * 100 : 0} 
                  className="h-2 [&>div]:bg-success"
                />
              </div>
              <div className="pt-2 border-t border-border/50">
                <div className="flex justify-between text-body-md font-semibold">
                  <span>Total</span>
                  <span className="text-primary">{formatEur(stats.totalRevenue)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Commission Tier Progress */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-body-md font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-premium" />
                Commission Tier
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats.commissionTier ? (
                <>
                  <div className="p-3 rounded-lg bg-premium/10 border border-premium/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-premium">{stats.commissionTier.tierName}</p>
                        <p className="text-body-xs text-muted-foreground">
                          {stats.commissionTier.percentage}% commission rate
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-body-xs text-muted-foreground">Min revenue</p>
                        <p className="font-medium">{formatEur(stats.commissionTier.minRevenue)}</p>
                      </div>
                    </div>
                  </div>

                  {stats.commissionTier.nextTier && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-body-sm text-muted-foreground">
                        <ArrowUp className="h-4 w-4" />
                        <span>Next: {stats.commissionTier.nextTier.name}</span>
                        <span className="text-premium">({stats.commissionTier.nextTier.percentage}%)</span>
                      </div>
                      <Progress 
                        value={Math.max(0, 100 - (stats.commissionTier.nextTier.revenueNeeded / stats.commissionTier.nextTier.minRevenue) * 100)}
                        className="h-2 [&>div]:bg-premium"
                      />
                      <p className="text-body-xs text-muted-foreground">
                        {formatEur(stats.commissionTier.nextTier.revenueNeeded)} to next tier
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-body-sm">No commission tier configured</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Milestone Contributions */}
      {stats.contributions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-body-md font-semibold flex items-center gap-2">
                <Award className="h-4 w-4 text-accent-foreground" />
                Milestone Contributions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.contributions.slice(0, 5).map((contribution, index) => (
                  <div 
                    key={contribution.milestoneId + index}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        contribution.milestoneStatus === 'unlocked' ? "bg-success" :
                        contribution.milestoneStatus === 'rewarded' ? "bg-premium" :
                        "bg-muted-foreground"
                      )} />
                      <div>
                        <p className="font-medium text-body-sm">{contribution.milestoneName}</p>
                        <p className="text-body-xs text-muted-foreground">
                          {contribution.contributionRole === 'sourcer' ? 'Sourced' :
                           contribution.contributionRole === 'closer' ? 'Closed' :
                           contribution.contributionRole === 'referrer' ? 'Referred' : 'Contributed'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-body-sm">{formatEur(contribution.revenueAttributed)}</p>
                      <Badge variant="outline" className="text-xs">
                        {contribution.milestoneStatus}
                      </Badge>
                    </div>
                  </div>
                ))}
                {stats.contributions.length > 5 && (
                  <button className="w-full p-2 text-body-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 transition-colors">
                    View all {stats.contributions.length} contributions
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subValue: string;
  color: 'primary' | 'success' | 'premium' | 'accent';
  delay: number;
}

function StatCard({ icon: Icon, label, value, subValue, color, delay }: StatCardProps) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-success/10 text-success border-success/20',
    premium: 'bg-premium/10 text-premium border-premium/20',
    accent: 'bg-accent/10 text-accent-foreground border-accent/20',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className={cn("border", colorClasses[color])}>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <span className="text-label-sm text-muted-foreground">{label}</span>
          </div>
          <p className="text-heading-md font-bold">{value}</p>
          <p className="text-body-xs text-muted-foreground">{subValue}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function MyContributionSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-5 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  );
}
