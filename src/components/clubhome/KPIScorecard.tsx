import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAdminKPIScorecard, type KPIPillarMetric, type KPIRange } from "@/hooks/useAdminKPIScorecard";
import { Zap, DollarSign, Settings2, MessageSquare, AlertTriangle, Clock, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const rangeOptions: { value: KPIRange; label: string }[] = [
  { value: '30d', label: '30d' },
  { value: '3m', label: '3m' },
  { value: '6m', label: '6m' },
  { value: '1y', label: '1y' },
  { value: 'all', label: 'All' },
];

const pillarConfig = [
  { key: 'efficiency' as const, label: 'Efficiency', icon: Zap, metrics: ['timeToShortlist', 'slaCompliance', 'timeToHire'] as const },
  { key: 'profitability' as const, label: 'Profitability', icon: DollarSign, metrics: ['revenuePerPlacement', 'pipelineConversion', 'totalRevenue'] as const },
  { key: 'operations' as const, label: 'Operations', icon: Settings2, metrics: ['fillRate', 'offerAcceptance', 'interviewToHire', 'repeatRate'] as const },
  { key: 'nps' as const, label: 'NPS', icon: MessageSquare, metrics: ['candidateNPS', 'partnerNPS'] as const },
];

const STAGE_COLORS: Record<string, string> = {
  applied: 'bg-blue-500',
  screening: 'bg-indigo-500',
  interview: 'bg-violet-500',
  offer: 'bg-purple-500',
  hired: 'bg-emerald-500',
};

const STAGE_LABELS: Record<string, string> = {
  applied: 'Applied',
  screening: 'Screen',
  interview: 'Interview',
  offer: 'Offer',
  hired: 'Hired',
};

function formatValue(metric: KPIPillarMetric): string {
  if (metric.value === null) return '--';
  switch (metric.format) {
    case 'days': return `${metric.value}d`;
    case 'percent': return `${metric.value}%`;
    case 'currency': return `€${(metric.value / 1000).toFixed(1)}k`;
    case 'score': return `${metric.value > 0 ? '+' : ''}${metric.value}`;
    case 'ratio': return `${metric.value}:1`;
    default: return String(metric.value);
  }
}

function getValueColor(metric: KPIPillarMetric): string {
  if (metric.value === null) return 'text-muted-foreground';
  if (metric.format === 'score') {
    if (metric.value >= 50) return 'text-emerald-500';
    if (metric.value >= 0) return 'text-amber-500';
    return 'text-rose-500';
  }
  if (metric.format === 'ratio') {
    if (metric.value <= 5) return 'text-emerald-500';
    if (metric.value <= 10) return 'text-amber-500';
    return 'text-rose-500';
  }
  if (metric.format === 'percent') {
    if (metric.lowerIsBetter) {
      return metric.value <= 50 ? 'text-emerald-500' : metric.value <= 75 ? 'text-amber-500' : 'text-rose-500';
    }
    if (metric.value >= 80) return 'text-emerald-500';
    if (metric.value >= 50) return 'text-amber-500';
    return 'text-rose-500';
  }
  if (metric.format === 'days') {
    if (metric.value <= 3) return 'text-emerald-500';
    if (metric.value <= 7) return 'text-amber-500';
    return 'text-rose-500';
  }
  return 'text-foreground';
}

function MetricCell({ metric }: { metric: KPIPillarMetric }) {
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-0">
      <span className={`text-lg sm:text-2xl font-bold leading-none tracking-tight ${getValueColor(metric)}`}>
        {formatValue(metric)}
      </span>
      <span className="text-[10px] text-muted-foreground truncate max-w-full leading-tight">
        {metric.label}
      </span>
    </div>
  );
}

export const KPIScorecard = () => {
  const [range, setRange] = useState<KPIRange>('30d');
  const { data, isLoading } = useAdminKPIScorecard(range);

  if (isLoading) {
    return (
      <Card className="glass-subtle rounded-2xl p-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col gap-2 items-center">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!data) return null;

  const { pipeline } = data;
  const maxStageCount = Math.max(...Object.values(pipeline.stageCounts), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
    >
      <Card className="glass-subtle rounded-2xl px-3 py-3">
        {/* Header with range toggle */}
        <div className="flex items-center justify-end mb-2">
          <div className="flex items-center gap-0.5 rounded-full bg-muted/50 p-0.5">
            {rangeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={`h-6 px-2 text-[10px] font-medium rounded-full transition-colors ${
                  range === opt.value
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pillar grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border/30">
          {pillarConfig.map((pillar) => {
            const Icon = pillar.icon;
            const pillarData = data[pillar.key];
            const metrics = pillar.metrics.map((k) => (pillarData as any)[k] as KPIPillarMetric);

            return (
              <div key={pillar.key} className="flex flex-col items-center gap-2 px-3">
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {pillar.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-wrap justify-center">
                  {metrics.map((m, i) => (
                    <MetricCell key={i} metric={m} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pipeline snapshot strip + alerts */}
        <div className="mt-3 pt-3 border-t border-border/20 space-y-2">
          {/* Mini funnel */}
          <div className="flex items-center gap-1.5">
            {(['applied', 'screening', 'interview', 'offer', 'hired'] as const).map((stage) => {
              const count = pipeline.stageCounts[stage] || 0;
              const widthPct = Math.max((count / maxStageCount) * 100, 12);
              return (
                <div key={stage} className="flex-1 min-w-0">
                  <div
                    className={`${STAGE_COLORS[stage]} h-4 rounded-sm flex items-center justify-center transition-all`}
                    style={{ width: `${widthPct}%`, minWidth: '1.5rem' }}
                  >
                    <span className="text-[9px] font-bold text-white leading-none">{count}</span>
                  </div>
                  <span className="text-[8px] text-muted-foreground mt-0.5 block truncate">
                    {STAGE_LABELS[stage]}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Alert badges */}
          {(pipeline.bottleneck || pipeline.overdue > 0) && (
            <div className="flex items-center gap-2 flex-wrap">
              {pipeline.bottleneck && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-[10px]">
                  <AlertTriangle className="h-2.5 w-2.5 text-amber-500" />
                  <span className="text-muted-foreground">Bottleneck:</span>
                  <span className="font-medium capitalize">{pipeline.bottleneck}</span>
                </div>
              )}
              {pipeline.overdue > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-[10px]">
                  <Clock className="h-2.5 w-2.5 text-red-500" />
                  <span className="font-medium text-red-500">{pipeline.overdue}</span>
                  <span className="text-muted-foreground">overdue</span>
                </div>
              )}
              <Button variant="ghost" size="sm" asChild className="ml-auto text-[10px] h-6 px-2">
                <Link to="/applications">
                  View Pipeline <ArrowRight className="h-2.5 w-2.5 ml-1" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};
