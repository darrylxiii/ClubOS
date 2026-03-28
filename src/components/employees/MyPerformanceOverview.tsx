import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DollarSign, Trophy, TrendingUp, Flame, Target, Clock, Percent, Zap } from "lucide-react";
import { motion } from "framer-motion";
import type { MyPerformanceData } from "@/hooks/useMyPerformanceData";
import { useTranslation } from 'react-i18next';

const LEVEL_ICONS: Record<string, string> = {
  Scout: '🔍', Closer: '🎯', Strategist: '♟️', Elite: '⭐', Legend: '👑',
};

const formatCurrency = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);

const RANK_COLORS = ['text-amber-500', 'text-slate-400', 'text-orange-600'];

export function MyPerformanceOverview({ data }: { data: MyPerformanceData }) {
  const { t } = useTranslation('admin');
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Hero Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue & Commission Card */}
        <Card className="lg:col-span-2 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
          <CardContent className="pt-6 space-y-5">
            {/* Revenue */}
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1">{t('myPerformance.revenueYtd', 'Revenue Generated (YTD)')}</p>
              <p className="text-3xl font-bold tracking-tight">{formatCurrency(data.totalRevenue)}</p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  {t('myPerformance.sourced', 'Sourced')}: {formatCurrency(data.revenueSourced)}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  {t('myPerformance.closed', 'Closed')}: {formatCurrency(data.revenueClosed)}
                </div>
              </div>
              {/* Split bar */}
              {data.totalRevenue > 0 && (
                <div className="flex h-2 rounded-full overflow-hidden mt-2 bg-muted">
                  <div
                    className="bg-blue-500 transition-all"
                    style={{ width: `${(data.revenueSourced / data.totalRevenue) * 100}%` }}
                  />
                  <div
                    className="bg-emerald-500 transition-all"
                    style={{ width: `${(data.revenueClosed / data.totalRevenue) * 100}%` }}
                  />
                </div>
              )}
            </div>

            {/* Commission & Rank Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <QuickStat
                icon={DollarSign}
                label={t('myPerformance.earned', 'Earned')}
                value={formatCurrency(data.commissionEarned)}
                color="text-green-500"
              />
              <QuickStat
                icon={TrendingUp}
                label={t('myPerformance.projected', 'Projected')}
                value={formatCurrency(data.projectedCommission)}
                color="text-amber-500"
              />
              <QuickStat
                icon={Trophy}
                label={t('myPerformance.teamRank', 'Team Rank')}
                value={data.teamSize > 0 ? `#${data.rank} of ${data.teamSize}` : '--'}
                color={data.rank >= 1 && data.rank <= 3 ? RANK_COLORS[data.rank - 1] : 'text-muted-foreground'}
              />
              {data.commissionTier && (
                <QuickStat
                  icon={Percent}
                  label={data.commissionTier.tierName}
                  value={`${data.commissionTier.percentage}%`}
                  color="text-primary"
                />
              )}
            </div>

            {/* Commission Tier Progress */}
            {data.commissionTier?.nextTier && (
              <div className="p-3 bg-muted/30 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t('myPerformance.nextTier', 'Next tier')}: <span className="font-medium text-foreground">{data.commissionTier.nextTier.name}</span> ({data.commissionTier.nextTier.percentage}%)</span>
                  <span className="font-medium">{formatCurrency(data.commissionTier.nextTier.revenueNeeded)} {t('myPerformance.toGo', 'to go')}</span>
                </div>
                <Progress
                  value={Math.min(100, (data.totalRevenue / data.commissionTier.nextTier.minRevenue) * 100)}
                  className="h-2"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gamification Card */}
        <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
          <CardContent className="pt-6 space-y-4 flex flex-col items-center text-center">
            <div className="text-4xl">{LEVEL_ICONS[data.level] || '🔍'}</div>
            <div>
              <Badge variant="outline" className="text-sm font-bold px-3 py-1">
                {data.level}
              </Badge>
            </div>
            <div className="w-full space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{data.xp.toLocaleString()} XP</span>
                <span>{data.xpToNextLevel.toLocaleString()} {t('myPerformance.toNext', 'to next')}</span>
              </div>
              <Progress value={data.levelProgress} className="h-2" />
            </div>
            {data.streak > 0 && (
              <div className="flex items-center gap-1.5 text-sm">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="font-bold">{t('myPerformance.dayStreak', '{{count}} day streak', { count: data.streak })}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickStatCard icon={Trophy} label={t('myPerformance.placements', 'Placements')} value={data.placementCount} color="text-emerald-500" />
        <QuickStatCard icon={Zap} label={t('myPerformance.pipelineValue', 'Pipeline Value')} value={formatCurrency(data.weightedPipelineValue)} color="text-blue-500" />
        <QuickStatCard icon={Target} label={t('myPerformance.placementRate', 'Placement Rate')} value={`${data.placementRate}%`} color="text-violet-500" />
        <QuickStatCard icon={Clock} label={t('myPerformance.avgTimeToHire', 'Avg Time to Hire')} value={`${data.avgTimeToHire}d`} color="text-amber-500" />
      </div>
    </motion.div>
  );
}

function QuickStat({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div className="p-3 bg-muted/30 rounded-lg">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function QuickStatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-4 w-4 ${color}`} />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
