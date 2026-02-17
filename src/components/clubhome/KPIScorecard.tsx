import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminKPIScorecard, type KPIPillarMetric, type KPIRange } from "@/hooks/useAdminKPIScorecard";
import { Zap, DollarSign, Settings2, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";

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
  { key: 'operations' as const, label: 'Operations', icon: Settings2, metrics: ['fillRate', 'offerAcceptance', 'interviewToHire'] as const },
  { key: 'nps' as const, label: 'NPS', icon: MessageSquare, metrics: ['candidateNPS', 'partnerNPS'] as const },
];

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
      </Card>
    </motion.div>
  );
};
