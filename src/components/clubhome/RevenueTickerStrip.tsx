import { Link } from "react-router-dom";
import { useRevenueTickerData } from "@/hooks/useRevenueTickerData";
import { usePipelineMetrics } from "@/hooks/useDealPipeline";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";

interface TickerPill {
  label: string;
  value: string;
  delta: number | null;
  href: string;
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `€${(n / 1_000).toFixed(0)}K`;
  return `€${n.toFixed(0)}`;
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null || delta === undefined) return null;
  const isUp = delta > 0;
  const isFlat = delta === 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[10px] font-medium rounded-full px-1.5 py-0.5",
        isFlat && "text-muted-foreground bg-muted/50",
        isUp && "text-emerald-500 bg-emerald-500/10",
        !isUp && !isFlat && "text-destructive bg-destructive/10"
      )}
    >
      {isFlat ? <Minus className="h-2.5 w-2.5" /> : isUp ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
      {Math.abs(delta)}%
    </span>
  );
}

export function RevenueTickerStrip() {
  const { t } = useTranslation('common');
  const { data: ticker, isLoading: tickerLoading } = useRevenueTickerData();
  const { data: pipeline, isLoading: pipelineLoading } = usePipelineMetrics();

  const isLoading = tickerLoading || pipelineLoading;

  if (isLoading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[72px] min-w-[140px] flex-1 rounded-xl" />
        ))}
      </div>
    );
  }

  const pills: TickerPill[] = [
    {
      label: t('ticker.mrr', 'MRR'),
      value: formatCompact(ticker?.mrr ?? 0),
      delta: ticker?.mrrDelta ?? null,
      href: "/admin/finance",
    },
    {
      label: t('ticker.pipeline', 'Pipeline'),
      value: formatCompact(pipeline?.weighted_pipeline ?? 0),
      delta: null,
      href: "/admin/global-analytics",
    },
    {
      label: t('ticker.placements', 'Placements'),
      value: `${ticker?.placements ?? 0}`,
      delta: ticker?.placementsDelta ?? null,
      href: "/admin/global-analytics",
    },
    {
      label: t('ticker.activeJobs', 'Active Jobs'),
      value: `${ticker?.activeJobs ?? 0}`,
      delta: null,
      href: "/jobs",
    },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {pills.map((pill) => (
        <Link
          key={pill.label}
          to={pill.href}
          className={cn(
            "flex flex-col justify-center min-w-[130px] flex-1 px-4 py-3 rounded-xl",
            "border border-border/20 bg-card/80",
            "hover:bg-card hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
          )}
        >
          <span className="text-[11px] text-muted-foreground font-medium">{pill.label}</span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl font-bold text-foreground leading-none">{pill.value}</span>
            <DeltaBadge delta={pill.delta} />
          </div>
        </Link>
      ))}
    </div>
  );
}
