import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";
import { EmployeeTarget } from "@/hooks/useEmployeeProfile";
import { formatCurrency } from "@/lib/revenueCalculations";
import { format, differenceInDays } from "date-fns";

interface TargetsProgressCardProps {
  targets: EmployeeTarget[];
  isLoading?: boolean;
}

export function TargetsProgressCard({ targets, isLoading }: TargetsProgressCardProps) {
  const currentTargets = targets.filter(t => {
    const now = new Date();
    return new Date(t.period_start) <= now && new Date(t.period_end) >= now;
  });

  const monthlyTarget = currentTargets.find(t => t.period_type === 'monthly');
  const quarterlyTarget = currentTargets.find(t => t.period_type === 'quarterly');
  const annualTarget = currentTargets.find(t => t.period_type === 'annual');

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Targets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 bg-muted/50 animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Targets & Goals
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="quarterly" className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
            <TabsTrigger value="annual">Annual</TabsTrigger>
          </TabsList>

          <TabsContent value="monthly" className="mt-4">
            {monthlyTarget ? (
              <TargetDetails target={monthlyTarget} />
            ) : (
              <EmptyTarget period="monthly" />
            )}
          </TabsContent>

          <TabsContent value="quarterly" className="mt-4">
            {quarterlyTarget ? (
              <TargetDetails target={quarterlyTarget} />
            ) : (
              <EmptyTarget period="quarterly" />
            )}
          </TabsContent>

          <TabsContent value="annual" className="mt-4">
            {annualTarget ? (
              <TargetDetails target={annualTarget} />
            ) : (
              <EmptyTarget period="annual" />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function TargetDetails({ target }: { target: EmployeeTarget }) {
  const now = new Date();
  const periodStart = new Date(target.period_start);
  const periodEnd = new Date(target.period_end);
  const totalDays = differenceInDays(periodEnd, periodStart);
  const elapsedDays = differenceInDays(now, periodStart);
  const timeProgress = Math.min((elapsedDays / totalDays) * 100, 100);

  const metrics = [
    {
      label: 'Revenue',
      current: target.revenue_achieved,
      target: target.revenue_target,
      format: 'currency' as const,
    },
    {
      label: 'Placements',
      current: target.placements_achieved,
      target: target.placements_target,
      format: 'number' as const,
    },
    {
      label: 'Hours',
      current: target.hours_achieved,
      target: target.hours_target,
      format: 'hours' as const,
    },
    {
      label: 'Interviews',
      current: target.interviews_achieved,
      target: target.interviews_target,
      format: 'number' as const,
    },
  ].filter(m => m.target && m.target > 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {format(periodStart, 'MMM d')} - {format(periodEnd, 'MMM d, yyyy')}
        </span>
        <Badge variant="outline">
          {Math.round(timeProgress)}% time elapsed
        </Badge>
      </div>

      <div className="space-y-4">
        {metrics.map((metric, index) => (
          <TargetMetric key={metric.label} metric={metric} timeProgress={timeProgress} index={index} />
        ))}
      </div>

      {target.notes && (
        <p className="text-sm text-muted-foreground mt-4 p-3 bg-muted/30 rounded-lg">
          {target.notes}
        </p>
      )}
    </motion.div>
  );
}

function TargetMetric({ 
  metric, 
  timeProgress,
  index 
}: { 
  metric: { label: string; current: number; target: number | null; format: 'currency' | 'number' | 'hours' };
  timeProgress: number;
  index: number;
}) {
  const target = metric.target || 0;
  const progress = target > 0 ? (metric.current / target) * 100 : 0;
  const expectedProgress = timeProgress;
  const isAhead = progress > expectedProgress;
  const isBehind = progress < expectedProgress - 10;

  const formatValue = (value: number) => {
    switch (metric.format) {
      case 'currency':
        return formatCurrency(value);
      case 'hours':
        return `${value}h`;
      default:
        return value.toString();
    }
  };

  const TrendIcon = isAhead ? TrendingUp : isBehind ? TrendingDown : Minus;
  const trendColor = isAhead ? 'text-green-500' : isBehind ? 'text-red-500' : 'text-muted-foreground';

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="space-y-2"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{metric.label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm">
            {formatValue(metric.current)} / {formatValue(target)}
          </span>
          <TrendIcon className={`h-4 w-4 ${trendColor}`} />
        </div>
      </div>
      <div className="relative">
        <Progress value={Math.min(progress, 100)} className="h-3" />
        {/* Expected progress marker */}
        <div 
          className="absolute top-0 h-3 w-0.5 bg-primary/50"
          style={{ left: `${expectedProgress}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {Math.round(progress)}% achieved
        {isAhead && ' — Ahead of schedule!'}
        {isBehind && ' — Behind schedule'}
      </p>
    </motion.div>
  );
}

function EmptyTarget({ period }: { period: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
      <Target className="h-8 w-8 mb-2 opacity-50" />
      <p>No {period} targets set</p>
    </div>
  );
}
