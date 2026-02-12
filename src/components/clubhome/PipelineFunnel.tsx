import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardWidget } from "./DashboardWidget";
import { GitBranch, ArrowRight, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FunnelStage {
  name: string;
  count: number;
  color: string;
}

export const PipelineFunnel = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['pipeline-funnel'],
    queryFn: async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Get counts per pipeline stage
      const stages = ['applied', 'screening', 'interview', 'offer', 'hired'];
      const counts: Record<string, number> = {};

      const promises = stages.map(async (stage) => {
        const { count } = await supabase
          .from('applications')
          .select('*', { count: 'exact', head: true })
          .eq('status', stage);
        counts[stage] = count || 0;
      });

      // Get overdue count
      const overduePromise = supabase
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .in('status', ['applied', 'screening', 'interview'])
        .lt('updated_at', sevenDaysAgo.toISOString());

      // Get bottleneck (stage with most candidates)
      await Promise.all([...promises, overduePromise.then(r => {
        counts['_overdue'] = r.count || 0;
      })]);

      const activeStages = stages.filter(s => s !== 'hired');
      const bottleneck = activeStages.reduce((max, s) =>
        (counts[s] || 0) > (counts[max] || 0) ? s : max, activeStages[0]);

      return { counts, bottleneck, overdue: counts['_overdue'] || 0 };
    },
    staleTime: 60000,
  });

  const stages: FunnelStage[] = [
    { name: 'Applied', count: data?.counts?.applied || 0, color: 'bg-blue-500' },
    { name: 'Screening', count: data?.counts?.screening || 0, color: 'bg-indigo-500' },
    { name: 'Interview', count: data?.counts?.interview || 0, color: 'bg-violet-500' },
    { name: 'Offer', count: data?.counts?.offer || 0, color: 'bg-purple-500' },
    { name: 'Hired', count: data?.counts?.hired || 0, color: 'bg-emerald-500' },
  ];

  const maxCount = Math.max(...stages.map(s => s.count), 1);

  return (
    <DashboardWidget
      title="Pipeline Velocity"
      icon={GitBranch}
      iconClassName="text-premium"
      isLoading={isLoading}
      headerAction={
        <Button variant="ghost" size="sm" asChild className="text-xs">
          <Link to="/applications">
            View All <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Funnel visualization */}
        <div className="space-y-2">
          {stages.map((stage, i) => {
            const widthPct = Math.max((stage.count / maxCount) * 100, 8);
            const isBottleneck = data?.bottleneck &&
              stage.name.toLowerCase() === data.bottleneck;

            return (
              <div key={stage.name} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-16 text-right shrink-0">
                  {stage.name}
                </span>
                <div className="flex-1 relative">
                  <div
                    className={cn(
                      "h-6 rounded-md flex items-center px-2 transition-all",
                      stage.color,
                      isBottleneck && "ring-1 ring-amber-500/50",
                    )}
                    style={{ width: `${widthPct}%`, minWidth: '2rem' }}
                  >
                    <span className="text-xs font-semibold text-white">
                      {stage.count}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Alerts row */}
        <div className="flex gap-2 flex-wrap">
          {data?.bottleneck && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              <span className="text-muted-foreground">Bottleneck:</span>
              <span className="font-medium capitalize">{data.bottleneck}</span>
            </div>
          )}
          {data && data.overdue > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs">
              <Clock className="h-3 w-3 text-red-500" />
              <span className="font-medium text-red-500">{data.overdue}</span>
              <span className="text-muted-foreground">overdue</span>
            </div>
          )}
        </div>
      </div>
    </DashboardWidget>
  );
};
